/**
 * ══════════════════════════════════════════════════════════════════════
 * THE STORAGE SEAM.
 *
 * Every byte the site serves — photographs, derivatives, animation
 * frames — passes through this interface and nothing else. No caller
 * imports an SDK, constructs a bucket URL, or knows which provider is
 * behind it. That is the whole point: swapping providers must be a
 * configuration change, not a code change (implementation_plan.md §7.1
 * rule 5).
 *
 * ── WHY AN INTERFACE AND NOT "JUST THE S3 SDK" ──
 * The brief asked for "the S3 adapter format so we can plug in Cloudflare
 * R2, Azure, or AWS later without code changes". Two of those three are
 * genuinely free: R2, AWS, Backblaze B2, DigitalOcean Spaces, MinIO,
 * Wasabi and Ceph all speak the S3 API, so ONE adapter covers them all
 * and the switch really is environment variables.
 *
 * Azure Blob Storage is the exception and it is worth being precise about
 * it: Azure has no S3-compatible endpoint. Microsoft never shipped one.
 * A pure S3 adapter cannot reach Azure no matter how it is configured.
 * So the seam is drawn here, one level above S3, and Azure — if it is
 * ever chosen — becomes a new file implementing this interface, roughly
 * 120 lines against @azure/storage-blob. Nothing upstream changes.
 *
 * Drawing the seam at S3 would have made "add Azure" a rewrite. Drawing
 * it here makes it an afternoon.
 *
 * ── WHY THE SURFACE IS THIS SMALL ──
 * Six methods. Every one of them is needed by something that already
 * exists or is already planned:
 *
 *   put        upload script, Directus publish hook, derivative generator
 *   head       de-duplication — "is this checksum already stored?"
 *   get        derivative generation reads the master back
 *   list       reconciliation: bucket contents vs. `assets` rows
 *   remove     unpublishing, and cleaning up a failed upload
 *   publicUrl  the delivery path
 *
 * Anything larger is speculative. Multipart upload, lifecycle rules,
 * bucket creation and ACL management are deliberately absent: they are
 * provider-shaped operations that would leak S3's model into the
 * interface and make the Azure implementation dishonest.
 * ══════════════════════════════════════════════════════════════════════
 */

/** What `put` needs to store an object correctly. */
export type PutInput = {
  /** Content-addressed. Build it with `contentKey()`, never by hand. */
  key: string;
  body: Uint8Array;
  /** Required, not optional. A missing Content-Type makes browsers sniff,
   *  and a sniffed AVIF is a download prompt rather than an image. */
  contentType: string;
  /**
   * Cache-Control for the stored object. Defaults to one immutable year,
   * which is only safe BECAUSE keys are content-addressed: the bytes at a
   * key can never change, so there is nothing to revalidate. If you ever
   * introduce a mutable key, you must pass a shorter policy here.
   */
  cacheControl?: string;
  /** Small, non-authoritative annotations. Postgres is the source of
   *  truth for anything that matters; this is for humans reading the
   *  bucket in a console. Values must be ASCII — S3 metadata is not
   *  UTF-8 safe across providers. */
  metadata?: Record<string, string>;
};

/** What every adapter can say about a stored object without fetching it. */
export type ObjectInfo = {
  key: string;
  size: number;
  /** Provider-assigned. Do NOT treat as a checksum: S3 ETags are only MD5
   *  for single-part uploads, and R2 and MinIO differ on multipart. Our
   *  checksum lives in the key and in `assets.checksum`. */
  etag?: string;
  lastModified?: Date;
};

export type PutResult = {
  key: string;
  size: number;
  etag?: string;
  /** True when `head` found the object already present and the upload was
   *  skipped. Content addressing makes this safe and common: the archive
   *  contains byte-identical duplicates under different filenames. */
  deduplicated: boolean;
};

export interface StorageAdapter {
  /** For logs and error messages: "s3", "azure-blob", "memory". */
  readonly name: string;

  /** Bucket / container the adapter is bound to. */
  readonly bucket: string;

  put(input: PutInput): Promise<PutResult>;

  /** `null` when absent. Absence is not an error — it is the answer to a
   *  question the de-duplication path asks constantly. */
  head(key: string): Promise<ObjectInfo | null>;

  get(key: string): Promise<Uint8Array>;

  /** Paginated internally; yields every object under the prefix. An
   *  AsyncIterable rather than an array because a reconciliation pass
   *  over ~1,100 assets × 10 derivatives should not be held in memory at
   *  once, and because S3 pagination is the adapter's problem, not the
   *  caller's. */
  list(prefix: string): AsyncIterable<ObjectInfo>;

  /** Idempotent. Deleting an absent key is not an error. */
  remove(key: string): Promise<void>;

  /**
   * The URL a browser fetches. Derived from STORAGE_PUBLIC_BASE_URL, so
   * it points at whatever is actually in front of the bucket — a CDN, a
   * custom domain, or the origin in development. The frontend never sees
   * a provider hostname unless someone configures one.
   */
  publicUrl(key: string): string;
}

/** Thrown for every storage failure, so callers catch one type rather
 *  than an SDK-specific error union that changes with the provider. */
export class StorageError extends Error {
  override readonly name = "StorageError";
  /** The key the failing operation was aimed at, when there was one.
   *  Errors from `list` carry the prefix here. */
  readonly key: string | undefined;

  constructor(message: string, key: string | undefined, cause?: unknown) {
    // The provider's own error goes through `cause` rather than a field of
    // our own: Error.cause is standard since ES2022, so node's inspector
    // and every logger already print the underlying SDK error beneath
    // ours. A private duplicate field would be invisible to all of them.
    super(message, { cause });
    this.key = key;
  }
}
