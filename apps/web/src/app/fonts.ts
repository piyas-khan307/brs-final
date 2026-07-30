import localFont from "next/font/local";

/**
 * Self-hosted. No third-party font CDN (PROJECT_SPEC.md §17.6).
 * Fetched reproducibly by scripts/fetch-fonts.mjs.
 *
 * ARCHIVO CARRIES THE wdth AXIS (font-stretch 62%-125%). That axis is
 * load-bearing: display type sets wdth 112 (§4.4) and rubric check 12 fails
 * without it. Never substitute a static-width build — the file would be
 * 55 KB smaller and the page would lose its single clearest craft marker.
 */

export const archivo = localFont({
  src: "./fonts/Archivo-variable-latin.woff2",
  variable: "--font-archivo",
  display: "swap",
  preload: true,
  weight: "100 900",
  style: "normal",
  // Required by CSS Fonts 4: an @font-face must declare the supported
  // font-stretch range or browsers may clamp the wdth axis.
  //
  // Verified working — "BUET" at 100px measures:
  //   wdth 62 → 182.8px · wdth 112 → 310.5px · wdth 125 → 351.9px
  //   (default, no variation settings → 272.1px)
  // So the hero's wdth 112 is genuinely wider than default. If these ever
  // converge to a single value, the axis has stopped applying and rubric
  // check 12 fails.
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
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
