import type { PlateAsset } from "@/lib/plates.generated";
import { Placard } from "./Placard";

/**
 * PLATE — the atomic unit of the site. §2.1.
 *
 * Not a "card": an artifact plus its measured caption. The distinction is
 * the whole design concept. A card is a container for anything; a plate is
 * a framed piece of evidence with provenance.
 *
 * Deliberately NOT next/image: with output:'export' the built-in optimizer
 * is disabled and our custom loader points at the Phase B1 façade, which
 * does not exist yet. A hand-written <picture> gives full control of the
 * AVIF/WebP fallback and costs zero client JS. Props are ImageDTO-shaped so
 * Phase B1 is a source swap, not a rewrite.
 *
 * width/height are ALWAYS emitted — that is how CLS stays under 0.02 (§4.7).
 * The photograph renders at full contrast inside a sharp frame; it is never
 * faded behind text, which is the single biggest departure from the
 * discarded prototype (§4.4).
 */

type PlateProps = {
  asset: PlateAsset;
  sizes: string;
  priority?: boolean;
  showPlacard?: boolean;
  className?: string;
  frameClassName?: string;
};

export function Plate({
  asset,
  sizes,
  priority = false,
  showPlacard = true,
  className = "",
  frameClassName = "",
}: PlateProps) {
  const srcset = (list: readonly { w: number; url: string }[]) =>
    list.map((s) => `${s.url} ${s.w}w`).join(", ");

  // Widest WebP is the <img> fallback for browsers without AVIF or <picture>
  // srcset support. The manifest always emits at least one width, but
  // noUncheckedIndexedAccess is on, so the empty case is handled explicitly
  // rather than asserted away.
  const fallback = asset.webp.at(-1)?.url ?? asset.avif.at(-1)?.url ?? "";

  return (
    <figure className={className}>
      {/* Fixed-overflow frame: the hover scale happens inside it, so the
          hairline border never moves. Radius is zero by system rule. */}
      <div className={`group relative overflow-hidden border border-line-hairline ${frameClassName}`}>
        <picture>
          <source type="image/avif" srcSet={srcset(asset.avif)} sizes={sizes} />
          <source type="image/webp" srcSet={srcset(asset.webp)} sizes={sizes} />
          <img
            src={fallback}
            alt={asset.alt}
            width={asset.width}
            height={asset.height}
            sizes={sizes}
            loading={priority ? "eager" : "lazy"}
            decoding={priority ? "sync" : "async"}
            fetchPriority={priority ? "high" : "auto"}
            style={{
              backgroundImage: `url(${asset.lqip})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            className="plate-zoom block h-full w-full object-cover"
          />
        </picture>
      </div>
      {showPlacard ? <Placard plate={asset.plate} lines={asset.caption} /> : null}
    </figure>
  );
}
