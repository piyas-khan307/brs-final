/**
 * ══════════════════════════════════════════════════════════════════════
 * THE STORAGE SEAM, FRONTEND SIDE.
 *
 * One environment variable is the only thing this app knows about where
 * images live. Move the archive from MinIO to R2 to S3 to Azure and this
 * file does not change; NEXT_PUBLIC_STORAGE_BASE_URL does.
 *
 * ── WHY THIS NO LONGER POINTS AT THE API FAÇADE ──
 * It used to build `${API}/v1/assets/${id}?w=720&fmt=avif`, on the
 * assumption that the façade would transform images on request. Two facts
 * established in Phase B2 killed that design, and both are worth stating
 * because the old shape looks more sophisticated than what replaced it:
 *
 * 1. `output: "export"` means there is no server at request time. A
 *    transform endpoint would have to be a separate always-on service —
 *    precisely the runtime dependency the static export exists to avoid
 *    (§6.2). Backend downtime must stay invisible to visitors, and an
 *    image proxy in the hot path makes it extremely visible.
 *
 * 2. Storage keys are content-addressed: the 720px AVIF of an asset lives
 *    at `sha256/ab/cd/<64 hex>.avif`, and that key is a hash of the file's
 *    BYTES. It cannot be derived from an id and a width by any pure
 *    function — which is exactly what a next/image loader is. Derivative
 *    URLs must therefore travel WITH the data, in ImageDTO. That is
 *    already how ShowcaseImage and Plate work: they emit a real <picture>
 *    with an AVIF and a WebP srcset built from the manifest.
 *
 * Resolution is all this layer can honestly do, and all it needs to do.
 * ══════════════════════════════════════════════════════════════════════
 */

/**
 * Trailing slash stripped once, at module scope, so no call site has to
 * think about `//`. An empty value is legitimate and means "same origin":
 * that is what serves the site today from public/, and it keeps a build
 * working before storage is configured.
 */
const BASE = (process.env.NEXT_PUBLIC_STORAGE_BASE_URL ?? "").replace(/\/+$/, "");

/**
 * Resolve one asset reference to a fetchable URL.
 *
 * Forgiving about its input on purpose — it has to accept what the data
 * actually contains at each stage of the migration:
 *
 *   `sha256/ab/cd/….avif`    a storage key                    (after B4)
 *   `/showcase/gal-rc24-…`   a public/ path                   (today)
 *   `https://…`              already absolute — returned untouched, so a
 *                            CDN URL baked into an API response wins
 */
export function assetUrl(ref: string): string {
  if (/^(https?:)?\/\//.test(ref) || ref.startsWith("data:")) return ref;

  // A public/ path is served by the site itself, not from the bucket.
  // Prefixing it with BASE would point it at storage, where it does not
  // exist — a silent 404 on every image during the B4 transition.
  if (ref.startsWith("/")) return ref;

  return BASE ? `${BASE}/${ref}` : `/${ref}`;
}

/**
 * next/image's custom loader.
 *
 * Registered in next.config.ts because `loader: "custom"` demands a file.
 * Deliberately width-agnostic: derivatives exist at the fixed widths they
 * were generated at, and the browser chooses between them through the
 * `srcset` that ImageDTO carries. Appending `?w=` here would yield a URL
 * resolving to identical bytes behind a cache-busting query string —
 * strictly worse than doing nothing.
 *
 * No component currently uses next/image; Plate and ShowcaseImage both
 * emit <picture> directly, for the reasons in their own headers.
 */
export default function brsImageLoader({ src }: { src: string; width: number }): string {
  return assetUrl(src);
}
