import type { CommitteeMember } from "@/lib/committee.generated";

/**
 * ══════════════════════════════════════════════════════════════════════
 * A COMMITTEE PORTRAIT.
 *
 * Server component, no hooks, no client JS — this page renders 84 of
 * these and none of them needs to react to anything.
 *
 * ── ON THE MISSING TWO ──
 * Two of the 84 announcement posters for the 11th Executive Committee
 * have an EMPTY FRAME: the name and role were set, and no photograph was
 * ever placed. Those people are on the committee and belong on the page.
 *
 * The tempting fixes are all worse than the problem. A stock silhouette
 * is a picture of nobody presented where a picture of somebody belongs. A
 * blank grey box reads as a failed image load and invites someone to
 * "fix" it. Dropping them from the page loses two real members to a
 * missing JPEG.
 *
 * So the frame is drawn as a frame, with their initials in it, and it
 * says what is true: no photograph on file. Someone reading the page
 * learns something accurate, and someone maintaining it knows exactly
 * what to go and find.
 * ══════════════════════════════════════════════════════════════════════
 */

/**
 * Initials from a Bengali or English name as printed.
 *
 * Deliberately drops the honorific — "Md. Abu Ashari" reads as AA, not
 * MA, because "Md." is a title and not a given name. Two letters at most:
 * three-letter monograms start looking like an acronym.
 */
function initials(name: string): string {
  const parts = name
    .split(/\s+/)
    .filter((p) => !/^(md\.?|mohammad|muhammad|mst\.?|a)$/i.test(p))
    .filter(Boolean);
  const letters = (parts.length ? parts : name.split(/\s+/)).map((p) => p[0] ?? "");
  return (letters[0] ?? "") + (letters.length > 1 ? letters[letters.length - 1] : "");
}

const srcSet = (sources: { w: number; url: string }[]) =>
  sources.map((s) => `${s.url} ${s.w}w`).join(", ");

export function Portrait({
  member,
  sizes,
  eager = false,
}: {
  member: CommitteeMember;
  sizes: string;
  /** True for the handful above the fold. Everything else loads lazily —
   *  84 portraits is far too many to fetch eagerly, and unlike the motion
   *  sheet nothing here sits inside a pinned, translated container, so
   *  the browser's own viewport check is exactly right. */
  eager?: boolean;
}) {
  if (!member.portrait) {
    return (
      <div
        // aspect-square, not a fixed height: it has to match the framed
        // photographs beside it at every breakpoint or the row breaks.
        className="flex aspect-square w-full items-center justify-center border border-line-hairline bg-bg-inset"
        // Not aria-hidden. A screen-reader user is told the same thing a
        // sighted one is: there is no photograph of this person.
        role="img"
        aria-label={`${member.name} — no photograph on file`}
      >
        <span
          aria-hidden="true"
          className="font-mono text-heading-m uppercase tabular text-text-tertiary"
        >
          {initials(member.name)}
        </span>
      </div>
    );
  }

  const { portrait } = member;
  const fallback = portrait.webp[portrait.webp.length - 1];

  return (
    // `block` matters: <picture> is inline and has no intrinsic size, so
    // an <img> sizing itself against it resolves against a zero-height box
    // and object-cover silently never engages.
    <picture className="block aspect-square w-full overflow-hidden border border-line-hairline">
      <source type="image/avif" srcSet={srcSet(portrait.avif)} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(portrait.webp)} sizes={sizes} />
      <img
        src={fallback?.url}
        alt={portrait.alt}
        width={portrait.width}
        height={portrait.height}
        sizes={sizes}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        // The portraits are 930×895 — very nearly square. object-cover
        // into a square frame trims about 17px from each side and nothing
        // at all from the top, so no head is ever cropped.
        className="h-full w-full object-cover"
        style={{
          backgroundImage: `url("${portrait.lqip}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
    </picture>
  );
}
