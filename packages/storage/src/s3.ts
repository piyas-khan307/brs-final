/**
 * ══════════════════════════════════════════════════════════════════════
 * S3Adapter — one implementation, six providers.
 *
 * Speaks the S3 REST API, which means it drives, unchanged:
 *
 *   Cloudflare R2 · AWS S3 · MinIO · Backblaze B2 · DigitalOcean Spaces
 *   · Wasabi · Ceph RGW · Garage
 *
 * Switching between them is `S3_ENDPOINT` and credentials. That is the
 * "no code changes" the brief asked for, and for these providers it is
 * literally true. (Azure Blob is not on the list and cannot be — see the
 * header of adapter.ts. It would be a sibling file, not a config flag.)
 * ══════════════════════════════════════════════════════════════════════
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import {
  StorageError,
  type ObjectInfo,
  type PutInput,
  type PutResult,
  type StorageAdapter,
} from "./adapter.js";
import { assertValidKey } from "./keys.js";

export type S3AdapterConfig = {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Omit for real AWS. Required for R2, MinIO, B2, Spaces. */
  endpoint?: string;
  /**
   * MinIO and Ceph address buckets as `http://host/bucket/key`; AWS and R2
   * use `https://bucket.host/key`. Getting this wrong produces a 301 with
   * no useful body, which is a genuinely miserable half-hour.
   */
  forcePathStyle?: boolean;
  /** Prepended to `publicUrl`. A CDN hostname in production, the MinIO
   *  origin in development. */
  publicBaseUrl: string;
};

/** One immutable year. Sound only because keys are content-addressed —
 *  see the header of keys.ts. */
const IMMUTABLE = "public, max-age=31536000, immutable";

export class S3Adapter implements StorageAdapter {
  readonly name = "s3";
  readonly bucket: string;

  readonly #client: S3Client;
  readonly #publicBaseUrl: string;

  constructor(config: S3AdapterConfig) {
    this.bucket = config.bucket;
    // Trailing slash normalised once here so publicUrl never produces `//`.
    this.#publicBaseUrl = config.publicBaseUrl.replace(/\/+$/, "");

    this.#client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle ?? false,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // ── Do not remove these two lines. ──
      // Since v3.729 the SDK attaches CRC32 integrity headers to every
      // request by default. AWS understands them. R2 and Backblaze B2
      // reject the request outright, and the error surfaces as an opaque
      // 400 with no mention of checksums — it looks like bad credentials.
      // WHEN_REQUIRED keeps them for the operations that genuinely need
      // them and omits them elsewhere, which is what every non-AWS
      // provider expects.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }

  /**
   * Uploads, unless the object is already there.
   *
   * The `head` first is not an optimisation detour — it is the point of
   * content addressing. Re-running the upload script over the archive
   * transfers only what is genuinely new, which turns a 28 MB push into a
   * few hundred bytes of HEAD traffic on the second run.
   */
  async put(input: PutInput): Promise<PutResult> {
    assertValidKey(input.key);

    const existing = await this.head(input.key);
    if (existing) {
      return {
        key: input.key,
        size: existing.size,
        ...(existing.etag === undefined ? {} : { etag: existing.etag }),
        deduplicated: true,
      };
    }

    try {
      const res = await this.#client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
          ContentLength: input.body.byteLength,
          CacheControl: input.cacheControl ?? IMMUTABLE,
          ...(input.metadata ? { Metadata: input.metadata } : {}),
        }),
      );
      return {
        key: input.key,
        size: input.body.byteLength,
        ...(res.ETag === undefined ? {} : { etag: stripQuotes(res.ETag) }),
        deduplicated: false,
      };
    } catch (cause) {
      throw new StorageError(`put failed for ${input.key}`, input.key, cause);
    }
  }

  async head(key: string): Promise<ObjectInfo | null> {
    try {
      const res = await this.#client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return {
        key,
        size: res.ContentLength ?? 0,
        ...(res.ETag === undefined ? {} : { etag: stripQuotes(res.ETag) }),
        ...(res.LastModified === undefined ? {} : { lastModified: res.LastModified }),
      };
    } catch (cause) {
      if (isNotFound(cause)) return null;
      throw new StorageError(`head failed for ${key}`, key, cause);
    }
  }

  async get(key: string): Promise<Uint8Array> {
    try {
      const res = await this.#client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!res.Body) throw new Error("empty body");
      // transformToByteArray is the SDK's own stream collector; it handles
      // the Node/browser stream difference so this file does not have to.
      return await res.Body.transformToByteArray();
    } catch (cause) {
      if (isNotFound(cause)) {
        throw new StorageError(`no object at ${key}`, key, cause);
      }
      throw new StorageError(`get failed for ${key}`, key, cause);
    }
  }

  async *list(prefix: string): AsyncIterable<ObjectInfo> {
    let token: string | undefined;
    do {
      let res;
      try {
        res = await this.#client.send(
          new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: prefix,
            ContinuationToken: token,
          }),
        );
      } catch (cause) {
        throw new StorageError(`list failed for prefix ${prefix}`, prefix, cause);
      }

      for (const o of res.Contents ?? []) {
        if (!o.Key) continue;
        yield {
          key: o.Key,
          size: o.Size ?? 0,
          ...(o.ETag === undefined ? {} : { etag: stripQuotes(o.ETag) }),
          ...(o.LastModified === undefined ? {} : { lastModified: o.LastModified }),
        };
      }

      // IsTruncated rather than "did we get 1000 back": providers disagree
      // on page size and R2 in particular returns fewer than the maximum.
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
  }

  async remove(key: string): Promise<void> {
    try {
      await this.#client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (cause) {
      // S3 DELETE is already idempotent, but MinIO and Ceph have both been
      // observed returning 404 here rather than 204. Absence is success.
      if (isNotFound(cause)) return;
      throw new StorageError(`remove failed for ${key}`, key, cause);
    }
  }

  publicUrl(key: string): string {
    return `${this.#publicBaseUrl}/${key}`;
  }

  /** Releases sockets. Long-running processes never need this; scripts do,
   *  or node hangs on an open keep-alive agent after the work is done. */
  destroy(): void {
    this.#client.destroy();
  }
}

/** S3 reports absence four different ways depending on provider and
 *  operation: NoSuchKey (GET), NotFound (HEAD), a bare 404, or an
 *  SDK-normalised name. Checking one of them is how "the object is
 *  missing" turns into an unhandled exception in production. */
function isNotFound(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    err.name === "NotFound" ||
    err.name === "NoSuchKey" ||
    err.$metadata?.httpStatusCode === 404
  );
}

/** S3 returns ETags wrapped in literal double quotes. */
function stripQuotes(s: string): string {
  return s.replace(/^"|"$/g, "");
}
