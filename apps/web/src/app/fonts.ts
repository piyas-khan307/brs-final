import localFont from "next/font/local";

/**
 * Self-hosted. No third-party font CDN (PROJECT_SPEC.md §17.6).
 * Fetched reproducibly by scripts/fetch-fonts.mjs, which is also where the
 * measured byte cost of each choice is recorded.
 *
 * IBM PLEX SANS replaced Space Grotesk on client direction ("its look like
 * ai made"). That read is accurate and worth stating plainly: Space
 * Grotesk became the default display face of every site-generating LLM
 * tool, and it arrived in this repo alongside a rose gradient button and a
 * glass-blur panel — the rest of that same house style. A face that
 * signals "generated" is the wrong face for an archive whose whole claim
 * is that the material is real.
 *
 * Plex Sans answers it from inside the system we already had. IBM Plex
 * Mono has carried every label and figure since Phase 0; Plex Sans is its
 * sibling — same skeleton, same designer — so the placards and the prose
 * are now one superfamily rather than two unrelated voices. It was drawn
 * as IBM's corporate type from Bauhaus-era engineering lettering, which
 * makes it an engineering institution's face by provenance rather than by
 * association. The flared 'l' tail, the angled 'a' terminal and the
 * squared 'g' come straight from the mono and are what keep it from
 * reading as one more neo-grotesque.
 *
 * IT HAS NO wdth AXIS — weight only, 100-700. Same constraint Space
 * Grotesk had, so no existing fontVariationSettings needed rewriting.
 * NOTHING MAY ASK IT FOR A WEIGHT ABOVE 700: the axis clamps silently, so
 * an 800 looks like a 700 and the bug is invisible. RichText's bold button
 * was 750 and was lowered to 700 when this landed.
 *
 * Note it declares `font-stretch: 100%` — a fixed width, not a range.
 * That is not a width axis and must not be read as one.
 */

export const plexSans = localFont({
  src: "./fonts/IBMPlexSans-variable-latin.woff2",
  // NOT "--font-display": that name is already the Tailwind theme token in
  // globals.css, and having next/font emit the same custom property would
  // make the token reference itself.
  variable: "--font-plex-sans",
  display: "swap",
  preload: true,
  weight: "100 700",
  style: "normal",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

/**
 * THE THIRD FAMILY, AND THE ONLY ONE.
 *
 * The exception to the two-family rule is argued rather than assumed,
 * because this is the kind of decision that otherwise becomes five
 * families by next year.
 *
 * Client direction on /executive-committee still stands: "use different
 * font style. not current simple font style." A grotesque cannot answer
 * that alone — asking one to look unlike a grotesque only ever produces a
 * bigger grotesque. So the serif stays; what changed is which serif.
 *
 * SOURCE SERIF 4 replaced Instrument Serif, which went out with Space
 * Grotesk and for the same reason: it is the display serif those same
 * tools reach for, so it read as generated rather than chosen. Source
 * Serif 4 is Adobe's institutional text serif, drawn after Fournier.
 *
 * IT HAS A REAL WEIGHT AXIS, 200-900, and that is the point of the swap.
 * Instrument Serif was 400-only, so this file used to forbid bolding it
 * and emphasis in that face had to come from size alone. Headings can now
 * carry weight, and fontVariationSettings on this family is legal.
 *
 * NO opsz AXIS — deliberately. It exists in the design but costs 70 KB,
 * more than the other two families combined, against a 110 KB budget
 * (§4.7). Dropped so the three families come to 108.6 KB. The consequence
 * is that the face does not redraw itself for small sizes, so:
 *
 * DO NOT set it below about 1rem. It is lower-contrast than Instrument
 * Serif and degrades more gracefully, but it is still a display face —
 * body copy is Plex Sans and labels and figures are mono.
 */
export const sourceSerif = localFont({
  src: "./fonts/SourceSerif4-variable-latin.woff2",
  variable: "--font-source-serif",
  display: "swap",
  preload: true,
  weight: "200 900",
  style: "normal",
  fallback: ["ui-serif", "Georgia", "Times New Roman", "serif"],
});

export const plexMono = localFont({
  src: "./fonts/IBMPlexMono-400-latin.woff2",
  variable: "--font-plex-mono",
  display: "swap",
  preload: true,
  weight: "400",
  style: "normal",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});
