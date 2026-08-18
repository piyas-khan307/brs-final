import type { CommitteeMember } from "@/lib/committee.generated";

/**
 * ══════════════════════════════════════════════════════════════════════
 * A COMMITTEE PORTRAIT.
 *
 * No hooks and no client JS of its own — this page renders 84 of these
 * and none of them needs to react to anything. The whole reveal
 * behaviour is CSS, in `@layer components` under "THE ROSTER".
 *
 * The photograph is shown WHOLE, on a dark mount, never cropped to fit.
 * Both halves of that are explained where they are implemented:
 * `.roster-frame` and `--brs-mount` in globals.css.
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
      // The same mount as a photograph, at the same square, so a row with
      // a missing print in it still reads as a row.
      <div
        className="roster-frame roster-frame--empty"
        // Not aria-hidden. A screen-reader user is told the same thing a
        // sighted one is: there is no photograph of this person.
        role="img"
        aria-label={`${member.name} — no photograph on file`}
      >
        <span aria-hidden="true" className="roster-initials">
          {initials(member.name)}
        </span>
      </div>
    );
  }

  const { portrait } = member;
  const fallback = portrait.webp[portrait.webp.length - 1];

  return (
    // `.roster-frame` sets display:block, and that matters: <picture> is
    // inline and has no intrinsic size, so an <img> sizing itself against
    // it resolves against a zero-height box and object-fit never engages.
    <picture
      className="roster-frame"
      // THE SHAPE COMES FROM THE PHOTOGRAPH, not from the layout. Set
      // here rather than in globals.css because it is per-asset data,
      // and it is what makes "nothing is cropped" true for any ratio an
      // administrator uploads — the box is already the right shape, so
      // there is nothing for object-fit to trim or to letterbox.
      style={{ aspectRatio: `${portrait.width} / ${portrait.height}` }}
    >
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
        // WHOLE IMAGE, NEVER CROPPED — object-fit: contain, set in
        // globals.css on `.roster-frame > img`. This used to be `cover`,
        // which was harmless on the poster crops (930×895, so it trimmed
        // 17px of background) and is not harmless at all on the first
        // 9:16 phone photograph an administrator uploads: cover takes the
        // top of the head off. Club instruction, and the right one.
        //
        // The cost is letterboxing, and the mount is what pays it.
        style={{
          // `contain`, matching the image's own fit, so the placeholder
          // lands exactly where the photograph will and the mount is not
          // filled with a stretched blur that never goes away.
          backgroundImage: `url("${portrait.lqip}")`,
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
    </picture>
  );
}
