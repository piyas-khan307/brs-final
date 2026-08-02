/**
 * @brs/storage — public surface.
 *
 * Callers import `fromEnv()` and the types. They do not import S3Adapter
 * directly unless they are a test that needs to point at a specific
 * bucket; production code should never name a provider.
 */

export type {
  ObjectInfo,
  PutInput,
  PutResult,
  StorageAdapter,
} from "./adapter.js";
export { StorageError } from "./adapter.js";

export {
  KEY_PATTERN,
  KEY_PREFIX,
  assertValidKey,
  checksum,
  checksumFromKey,
  contentKey,
  extensionFor,
} from "./keys.js";

/** Re-exported for convenience. Importing it FROM HERE pulls in the AWS
 *  SDK; anything that only issues URLs should import "@brs/storage/url"
 *  instead, which has no dependencies at all. */
export { publicUrlFor } from "./url.js";

export { S3Adapter, type S3AdapterConfig } from "./s3.js";
export { MemoryAdapter } from "./memory.js";

import type { StorageAdapter } from "./adapter.js";
import { MemoryAdapter } from "./memory.js";
import { S3Adapter } from "./s3.js";

/**
 * ══════════════════════════════════════════════════════════════════════
 * THE CONFIGURATION SEAM.
 *
 * Every provider decision the project will ever make is made here, from
 * environment variables, once. Nothing else in the codebase branches on
 * a provider name.
 *
 * ── VARIABLE NAMES ARE S3_*, NOT R2_* ──
 * The earlier .env.example used R2_ACCOUNT_ID, R2_BUCKET and friends,
 * which encodes a decision that §16.13 has not actually made yet. If the
 * club ends up on AWS, every one of those names becomes a small lie that
 * survives for years. S3_* is accurate for all of R2, AWS, MinIO, B2 and
 * Spaces, so the names stay true whichever way the decision goes.
 *
 * ── WHY THIS THROWS INSTEAD OF DEFAULTING ──
 * A missing bucket name is not a condition to paper over. Defaulting it
 * produces an adapter that fails on the first write, deep inside an
 * upload loop, with an error about a bucket nobody configured. Failing
 * at construction names the missing variable while the operator is still
 * looking at the terminal.
 * ══════════════════════════════════════════════════════════════════════
 */
export function fromEnv(env: NodeJS.ProcessEnv = process.env): StorageAdapter {
  const provider = (env.STORAGE_PROVIDER ?? "s3").toLowerCase();

  if (provider === "memory") {
    // Only ever by explicit request — see the header of memory.ts.
    return new MemoryAdapter({
      ...(env.STORAGE_PUBLIC_BASE_URL
        ? { publicBaseUrl: env.STORAGE_PUBLIC_BASE_URL }
        : {}),
    });
  }

  if (provider !== "s3") {
    throw new Error(
      `Unknown STORAGE_PROVIDER ${JSON.stringify(provider)}. ` +
        `Supported: "s3" (covers R2, AWS, MinIO, B2, Spaces, Wasabi), "memory". ` +
        `Azure Blob would need a new adapter — it has no S3-compatible API.`,
    );
  }

  const endpoint = env.S3_ENDPOINT?.trim();

  return new S3Adapter({
    bucket: required(env, "S3_BUCKET"),
    accessKeyId: required(env, "S3_ACCESS_KEY_ID"),
    secretAccessKey: required(env, "S3_SECRET_ACCESS_KEY"),

    // R2 has exactly one region and it is the literal string "auto".
    // AWS needs a real one. MinIO ignores it but the SDK demands a value.
    region: env.S3_REGION?.trim() || "auto",

    ...(endpoint ? { endpoint } : {}),

    // Default true when an endpoint is set, because every self-hosted
    // S3 implementation (MinIO, Ceph, Garage) needs path style and none
    // of them tell you so legibly. R2 wants it off, which is why it stays
    // overridable rather than being inferred and forgotten.
    forcePathStyle: boolish(env.S3_FORCE_PATH_STYLE) ?? Boolean(endpoint),

    // The one URL the browser ever sees. Behind it may be a CDN, a custom
    // domain, or the bucket origin — storage does not know and must not.
    publicBaseUrl: required(env, "STORAGE_PUBLIC_BASE_URL"),
  });
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const v = env[name]?.trim();
  if (!v) {
    throw new Error(
      `${name} is not set. @brs/storage cannot be constructed without it — ` +
        `see .env.example.`,
    );
  }
  return v;
}

/** `undefined` when unset, so the caller can distinguish "not configured"
 *  from "configured false" and apply its own default. */
function boolish(v: string | undefined): boolean | undefined {
  if (v === undefined || v.trim() === "") return undefined;
  return /^(1|true|yes|on)$/i.test(v.trim());
}
