import type { NavulaPhoto } from "@/lib/navula";

/**
 * THE MOUNT — a photograph shown as a print on a board.
 *
 * NO HOOKS. Every section below renders one of these, and three of those
 * sections are client components holding scroll timelines; a mount that
 * cannot be rendered inside them would need a second implementation.
 *
 * ── WHY object-contain AND NOT object-cover ──────────────────────────
 * Club photographs arrive in whatever ratio a phone produced. Cover
 * crops, and cropping a machine photograph cuts off the machine — the
 * one thing this page exists to show. Contain letterboxes instead, and
 * the dark mount is precisely what makes a letterbox read as a mount
 * rather than as a layout fault. That trade is already stated in
 * globals.css where --brs-mount is defined; this component is where it
 * is actually spent.
 *
 * ── THE EMPTY STATE IS A DESIGNED STATE ──────────────────────────────
 * src: null does not render a broken image, a grey box, or a skeleton
 * shimmer. It renders the mount with nothing hung in it and the plate
 * number still on the wall label — which is what an exhibition looks
 * like the week before it opens, and which tells the club exactly which
 * photograph the page is waiting for.
 */
export function Mount({
  photo,
  plate,
  lines = [],
  ratio = "4 / 3",
  sizes,
  className = "",
}: {
  photo: NavulaPhoto;
  plate?: number;
  lines?: readonly string[];
  /** CSS aspect-ratio for the board. The print letterboxes inside it. */
  ratio?: string;
  sizes?: string;
  className?: string;
}) {
  return (
    <figure className={className}>
      <div
        className="relative overflow-hidden border border-line-hairline bg-mount"
        style={{ aspectRatio: ratio }}
      >
        {photo.src ? (
          <img
            src={photo.src}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            sizes={sizes}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="h-full w-full object-contain"
          />
        ) : (
          /* The empty mount. A centred hairline rectangle and one mono
             legend — the same register as every other label on the site,
             so it reads as part of the design rather than as a failure.
             aria-hidden because the surrounding placard already carries
             the plate number to a screen reader, and "photograph pending"
             announced eight times is noise. */
          <div
            aria-hidden="true"
            className="absolute inset-6 flex items-center justify-center border border-dashed border-mount-line"
          >
            <span className="font-mono text-micro uppercase text-mount-text">
              Photograph pending
            </span>
          </div>
        )}
      </div>

      {plate != null || lines.length > 0 ? (
        <figcaption className="mt-3">
          {plate != null ? (
            <span className="block font-mono text-micro uppercase text-text-secondary tabular">
              PL. {String(plate).padStart(3, "0")}
            </span>
          ) : null}
          {lines.map((line) => (
            <span
              key={line}
              className="mt-1 block font-mono text-micro uppercase text-text-tertiary tabular"
            >
              {line}
            </span>
          ))}
        </figcaption>
      ) : null}
    </figure>
  );
}
