/**
 * ══════════════════════════════════════════════════════════════════════
 * CONTENT-ADDRESSED KEYS.
 *
 *   sha256/<aa>/<bb>/<64-hex-digest>.<ext>
 *
 * The key IS the checksum. Three consequences follow, and all three are
 * the reason this scheme was chosen over `uploads/2026/02/photo.jpg`:
 *
 * 1. DE-DUPLICATION IS AUTOMATIC, NOT ASPIRATIONAL.
 *    The archive already contains byte-identical duplicates under
 *    different filenames — `IMG_6738.JPG` and `brs/lfr.JPG` are both
 *    exactly 8,679,826 bytes. Under a name-based scheme those are two
 *    objects and two rows forever. Here they are one key, `put` reports
 *    `deduplicated: true`, and `assets_checksum_unique` in Postgres
 *    agrees without any extra work.
 *
 * 2. CACHING IS SAFE AT `immutable, max-age=31536000`.
 *    The bytes at a key can never change, because changing them changes
 *    the key. There is nothing to revalidate and no cache to bust. A
 *    mutable key scheme would force either short TTLs or a versioning
 *    query-string convention that every caller has to remember.
 *
 * 3. NOTHING IS LEAKED BY THE PATH.
 *    Original filenames in this archive carry committee names, personal
 *    names, and event dates. A public bucket listing under a name-based
 *    scheme is an information disclosure; under this one it is 64 hex
 *    characters (§12.1).
 *
 * ── WHY TWO SHARD LEVELS ──
 * S3 does not need them; it is a flat namespace with no directory cost.
 * They exist for the adapters that are not S3: a local-filesystem
 * adapter, a rsync-ed backup, or an operator running `ls` on a mount
 * would otherwise face a single directory of ~11,000 entries. Two levels
 * of two hex characters give 65,536 shards for free and cost one line of
 * string slicing.
 *
 * ── WHY THE EXTENSION IS KEPT ──
 * It is redundant — Content-Type is stored on the object — but CDNs,
 * `curl -O`, and browser "save as" all behave better with one, and it
 * makes a bucket listing legible to a human diagnosing a problem.
 * ══════════════════════════════════════════════════════════════════════
 */

import { createHash } from "node:crypto";
import { StorageError } from "./adapter.js";

/**
 * MIME → extension. Deliberately a closed list rather than a lookup
 * against `mime-types`: the set of formats this project stores is fixed
 * by the design system (AVIF and WebP for delivery, PNG only for the
 * mark, PDF for archival scans). Anything outside it is a mistake worth
 * failing on rather than guessing at.
 */
const EXTENSION_BY_MIME: Readonly<Record<string, string>> = {
  "image/avif": "avif",
  "image/webp": "webp",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
};

export const KEY_PREFIX = "sha256";

/** Matches exactly what `contentKey` produces and nothing else. Used to
 *  reject hand-written keys before they reach a bucket. */
export const KEY_PATTERN = /^sha256\/[0-9a-f]{2}\/[0-9a-f]{2}\/[0-9a-f]{64}\.[a-z0-9]{2,4}$/;

/** Lower-case hex SHA-256 of the bytes. The same value that goes into
 *  `assets.checksum`, so the DB and the bucket cannot disagree. */
export function checksum(body: Uint8Array): string {
  return createHash("sha256").update(body).digest("hex");
}

export function extensionFor(mime: string): string {
  const ext = EXTENSION_BY_MIME[mime.toLowerCase().split(";")[0]!.trim()];
  if (!ext) {
    throw new StorageError(
      `Unsupported MIME type ${JSON.stringify(mime)}. ` +
        `Storable types: ${Object.keys(EXTENSION_BY_MIME).join(", ")}.`,
      undefined,
    );
  }
  return ext;
}

/**
 * Build the key for a blob. Pure, deterministic, and the ONLY sanctioned
 * way to name an object — `put` refuses keys that do not match
 * KEY_PATTERN, so there is no path around it.
 */
export function contentKey(body: Uint8Array, mime: string): string {
  const hex = checksum(body);
  return `${KEY_PREFIX}/${hex.slice(0, 2)}/${hex.slice(2, 4)}/${hex}.${extensionFor(mime)}`;
}

/** Recover the digest from a key, for reconciling bucket contents against
 *  `assets.checksum`. Returns null for anything not shaped like our keys. */
export function checksumFromKey(key: string): string | null {
  if (!KEY_PATTERN.test(key)) return null;
  return key.slice(key.lastIndexOf("/") + 1, key.lastIndexOf("."));
}

/** Guard used by adapters. Kept here rather than in the S3 file so every
 *  future adapter enforces the same rule without re-deriving it. */
export function assertValidKey(key: string): void {
  if (!KEY_PATTERN.test(key)) {
    throw new StorageError(
      `Refusing to store under a non-content-addressed key: ${JSON.stringify(key)}. ` +
        `Keys must come from contentKey().`,
      key,
    );
  }
}
