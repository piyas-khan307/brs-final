/**
 * Custom next/image loader — implementation_plan.md §10.2.
 *
 * Static export removes Next's built-in optimizer, which is convenient: the
 * API façade already performs transforms, and routing every image through it
 * means the frontend never sees a storage-provider URL. Storage therefore
 * stays a config change (§7.1 rule 5).
 *
 * `src` is the façade-issued asset id from ImageDTO, never a bucket key.
 */

type LoaderArgs = {
  src: string;
  width: number;
  quality?: number;
};

export default function brsImageLoader({ src, width, quality }: LoaderArgs): string {
  const api = process.env.NEXT_PUBLIC_BRS_API ?? "";

  // Already a façade URL (ImageDTO.url) — just add sizing parameters.
  if (src.startsWith("http") || src.startsWith("/v1/")) {
    const sep = src.includes("?") ? "&" : "?";
    return `${src}${sep}w=${width}&q=${quality ?? 78}&fmt=avif`;
  }

  return `${api}/v1/assets/${src}?w=${width}&q=${quality ?? 78}&fmt=avif`;
}
