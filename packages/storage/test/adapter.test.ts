/**
 * ══════════════════════════════════════════════════════════════════════
 * ADAPTER CONFORMANCE SUITE.
 *
 * One set of assertions, run against every adapter. That is deliberate:
 * an interface is only worth having if two implementations can be held
 * to the same behaviour, and the only way to know they are is to run the
 * same test file over both.
 *
 * MemoryAdapter always runs. S3Adapter runs against MinIO when it is
 * reachable and SKIPS — loudly, with the reason printed — when it is
 * not, so `pnpm test` works on a laptop with Docker stopped without
 * quietly pretending the S3 path was verified.
 *
 *   docker compose up -d minio minio-init
 *   pnpm --filter @brs/storage test
 * ══════════════════════════════════════════════════════════════════════
 */

import { strict as assert } from "node:assert";
import { after, describe, it } from "node:test";

import {
  MemoryAdapter,
  S3Adapter,
  StorageError,
  contentKey,
  type StorageAdapter,
} from "../src/index.js";

const MINIO = {
  endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
  bucket: process.env.S3_BUCKET ?? "brs-assets",
  accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "brs",
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "brs-dev-secret",
  region: "auto",
  forcePathStyle: true,
  publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL ?? "http://localhost:9000/brs-assets",
};

async function minioReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${MINIO.endpoint}/minio/health/live`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Unique per run, so repeated runs against a persistent MinIO volume do
 *  not test against objects a previous run left behind — which would
 *  make the de-duplication assertion pass for the wrong reason. */
const nonce = `brs-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const payload = (s: string) => new TextEncoder().encode(`${nonce}:${s}`);

function conformance(name: string, make: () => StorageAdapter) {
  describe(`StorageAdapter conformance — ${name}`, () => {
    const store = make();
    const written: string[] = [];

    const put = async (body: Uint8Array, mime = "image/webp") => {
      const key = contentKey(body, mime);
      written.push(key);
      return store.put({ key, body, contentType: mime });
    };

    after(async () => {
      for (const k of written) await store.remove(k).catch(() => {});
      (store as { destroy?: () => void }).destroy?.();
    });

    it("stores and reads back the exact bytes", async () => {
      const body = payload("round-trip");
      const res = await put(body);

      assert.equal(res.deduplicated, false);
      assert.equal(res.size, body.byteLength);
      assert.deepEqual(await store.get(res.key), body);
    });

    it("reports a second put of identical bytes as deduplicated", async () => {
      // The behaviour the whole key scheme exists for. Re-running the
      // upload script over the archive must transfer nothing new.
      const body = payload("dedupe");
      const first = await put(body);
      const second = await put(body);

      assert.equal(first.deduplicated, false);
      assert.equal(second.deduplicated, true);
      assert.equal(first.key, second.key);
      assert.equal(second.size, body.byteLength);
    });

    it("head returns null for an absent key rather than throwing", async () => {
      // Absence is the answer to a question, not a failure. Every
      // de-duplication check depends on this being cheap and quiet.
      const absent = contentKey(payload("never-stored"), "image/avif");
      assert.equal(await store.head(absent), null);
    });

    it("head returns the size of a present key", async () => {
      const body = payload("head-size");
      const { key } = await put(body);
      const info = await store.head(key);
      assert.ok(info, "expected head to find the object just written");
      assert.equal(info.size, body.byteLength);
      assert.equal(info.key, key);
    });

    it("get throws StorageError, not an SDK error, for an absent key", async () => {
      // Callers catch one type. If a provider's own error class escaped
      // here, swapping providers would change what callers must catch.
      const absent = contentKey(payload("also-never-stored"), "image/png");
      await assert.rejects(() => store.get(absent), (e: unknown) => {
        assert.ok(e instanceof StorageError, `expected StorageError, got ${e}`);
        assert.equal((e as StorageError).key, absent);
        return true;
      });
    });

    it("list yields what was written under a prefix", async () => {
      const body = payload("listed");
      const { key } = await put(body);
      const prefix = key.slice(0, key.lastIndexOf("/") + 1);

      const found: string[] = [];
      for await (const o of store.list(prefix)) found.push(o.key);

      assert.ok(found.includes(key), `expected ${key} under ${prefix}, got ${found}`);
    });

    it("remove is idempotent", async () => {
      const body = payload("removed");
      const { key } = await put(body);

      await store.remove(key);
      assert.equal(await store.head(key), null);
      // Second delete must not throw. Cleanup paths and failed-upload
      // rollbacks both call this without knowing the current state.
      await assert.doesNotReject(() => store.remove(key));
    });

    it("refuses a hand-written key", async () => {
      await assert.rejects(
        () =>
          store.put({
            key: "plates/hero-1440.webp",
            body: payload("bad key"),
            contentType: "image/webp",
          }),
        /non-content-addressed/,
      );
    });

    it("publicUrl joins the base and the key with exactly one slash", async () => {
      const key = contentKey(payload("url"), "image/webp");
      const url = store.publicUrl(key);
      assert.ok(url.endsWith(`/${key}`), url);
      assert.ok(!url.includes("//" + key), `double slash in ${url}`);
    });
  });
}

/** Probed once, at module scope. Doing it inside each `describe` would
 *  need top-level await in a non-async callback, and would also hit the
 *  health endpoint several times for one answer. */
const MINIO_UP = await minioReachable();
const NO_MINIO = `MinIO not reachable at ${MINIO.endpoint} — run: docker compose up -d minio minio-init`;

conformance("MemoryAdapter", () => new MemoryAdapter({ publicBaseUrl: "memory://brs" }));

if (MINIO_UP) {
  conformance("S3Adapter → MinIO", () => new S3Adapter(MINIO));
} else {
  describe("StorageAdapter conformance — S3Adapter → MinIO", () => {
    it("SKIPPED", { skip: NO_MINIO }, () => {});
  });
}

describe("S3Adapter → MinIO, provider-specific", () => {
  it(
    "serves an uploaded object over plain HTTP at publicUrl",
    { skip: MINIO_UP ? false : NO_MINIO },
    async () => {
      // The end-to-end claim: a browser can fetch what the adapter wrote,
      // at the URL the adapter advertises, with the Content-Type it was
      // given. Everything above this test is internal to the SDK.
      const store = new S3Adapter(MINIO);
      const body = payload("http-served");
      const key = contentKey(body, "image/webp");
      try {
        await store.put({ key, body, contentType: "image/webp" });

        const res = await fetch(store.publicUrl(key));
        assert.equal(res.status, 200);
        assert.equal(res.headers.get("content-type"), "image/webp");
        assert.match(res.headers.get("cache-control") ?? "", /immutable/);
        assert.deepEqual(new Uint8Array(await res.arrayBuffer()), body);
      } finally {
        await store.remove(key).catch(() => {});
        store.destroy();
      }
    },
  );
});
