/**
 * THE BRS MARK.
 *
 * The diamond badge from logo/BRS Logo transparent.png, resized by
 * scripts/prepare-brand.mjs. One component so the mark can never drift
 * between the masthead, the intro and the footer.
 *
 * SIZES ARE DISCRETE, NOT FLUID. The mark contains a fine blueprint grid
 * and a 40-tooth gear; at arbitrary sizes those details alias into moiré.
 * Each size below maps onto a generated derivative at 2x, so the raster is
 * always downsampled and never stretched.
 *
 * NO HOVER EFFECT, NO SPIN. A club badge that reacts to the pointer reads
 * as a UI control rather than an identity. It is a mark; it holds still.
 */

const SIZES = {
  /** Masthead. */
  sm: { px: 36, src: 72 },
  /** Footer, section marks. */
  md: { px: 64, src: 128 },
  /** Intro. */
  lg: { px: 128, src: 256 },
  /** Intro, desktop. */
  xl: { px: 200, src: 600 },
} as const;

export function Mark({
  size = "sm",
  className = "",
  /**
   * The mark is decorative wherever adjacent text already names the
   * society — which is everywhere it currently appears. Passing a label
   * makes it meaningful instead.
   */
  label,
}: {
  size?: keyof typeof SIZES;
  className?: string;
  label?: string;
}) {
  const { px, src } = SIZES[size];

  return (
    <picture className={`block shrink-0 ${className}`}>
      <source type="image/avif" srcSet={`/brand/brs-mark-${src}.avif`} />
      <source type="image/webp" srcSet={`/brand/brs-mark-${src}.webp`} />
      <img
        src={`/brand/brs-mark-${src}.png`}
        alt={label ?? ""}
        aria-hidden={label ? undefined : "true"}
        width={px}
        height={px}
        loading="eager"
        decoding="async"
        draggable={false}
        style={{ width: px, height: px }}
      />
    </picture>
  );
}
