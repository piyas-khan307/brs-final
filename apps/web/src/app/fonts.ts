import localFont from "next/font/local";

/**
 * Self-hosted. No third-party font CDN (PROJECT_SPEC.md §17.6).
 * Fetched reproducibly by scripts/fetch-fonts.mjs.
 *
 * SPACE GROTESK replaced Archivo on client direction ("its look too
 * ordinary"). Archivo is a competent neo-grotesque, and at display size
 * that is exactly the problem — it sits close enough to Helvetica to read
 * as no decision at all.
 *
 * Space Grotesk descends from Space Mono, so it carries a monospace's
 * squared terminals and flat-sided bowls into a proportional face. The
 * single-storey 'g', the squared 'S' and the sheared 't' are what make it
 * legible as a choice. It also matches the logo: the badge's "BRS" is
 * condensed, squared and angle-cut, and this is the closest free text face
 * to that construction.
 *
 * IT HAS NO wdth AXIS — weight only, 300-700. Archivo's variable width was
 * load-bearing in the previous system, so every fontVariationSettings on
 * the site dropped its 'wdth' term when this landed. Setting 'wdth' here
 * would be a silent no-op, which is worse than not setting it.
 *
 * Side effect worth recording: 36.1 KB total for both families, down from
 * 102.4 KB. Archivo's two-axis design space was almost the entire budget.
 */

export const spaceGrotesk = localFont({
  src: "./fonts/SpaceGrotesk-variable-latin.woff2",
  // NOT "--font-display": that name is already the Tailwind theme token in
  // globals.css, and having next/font emit the same custom property would
  // make the token reference itself.
  variable: "--font-space-grotesk",
  display: "swap",
  preload: true,
  weight: "300 700",
  style: "normal",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
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
