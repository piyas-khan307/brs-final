/**
 * ══════════════════════════════════════════════════════════════════════
 * URL RESOLUTION — the read-only half of the storage seam.
 *
 * Deliberately its own module with ZERO dependencies, and exported as
 * `@brs/storage/url`.
 *
 * ── WHY IT IS SPLIT OUT ──
 * The API façade issues asset URLs and never touches a bucket: it does
 * not put, get, list or delete. But importing `@brs/storage` pulls in
 * s3.ts, which pulls in @aws-sdk/client-s3 — roughly 3 MB of transitive
 * dependencies, in a service that will never make an S3 call.
 *
 * That is not only image bloat. A process that imports an S3 client is a
 * process that *could* make S3 calls, and dependency footprint is a
 * security surface: the façade holding no bucket SDK is what makes
 * "the façade cannot write to storage" true by construction rather than
 * by review.
 *
 * So the split is architectural, not cosmetic. Anything that only needs
 * to name an object imports this; only the upload path imports the root.
 * ══════════════════════════════════════════════════════════════════════
 */

/**
 * Resolve a storage key to the URL a browser fetches.
 *
 * Reads STORAGE_PUBLIC_BASE_URL, which points at whatever is actually in
 * front of the bucket — a CDN, a custom domain, or the origin in
 * development. Callers never learn the provider.
 *
 * An unset base yields a root-relative path rather than throwing: that is
 * the correct behaviour for a same-origin deployment where a reverse
 * proxy serves `/sha256/…` itself, and it keeps a misconfigured
 * environment producing broken images rather than a crashed process.
 */
export function publicUrlFor(
  key: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const base = (env.STORAGE_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
  return base ? `${base}/${key}` : `/${key}`;
}
