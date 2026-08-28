import {
  Bebas_Neue,
  Courier_Prime,
  Dancing_Script,
  Great_Vibes,
  Inconsolata,
  Lato,
  Lobster,
  Lora,
  Merriweather,
  Montserrat,
  Open_Sans,
  Oswald,
  Pacifico,
  Playfair_Display,
  Poppins,
  Roboto,
  Space_Mono,
} from "next/font/google";

/**
 * ══════════════════════════════════════════════════════════════════════
 * WRITE-UP FONTS, NOT SITE FONTS.
 *
 * fonts.ts (the other file in this folder) is the two-family system the
 * whole SITE is built from — self-hosted, no third-party CDN, byte cost
 * tracked (PROJECT_SPEC.md §17.6). This file is different on purpose:
 * seventeen further choices for the write-up editor's font picker, at
 * the person's explicit direction, via `next/font/google` rather than
 * the vendor-into-./fonts/ pattern the other two follow. (Two more of
 * the requested names, Georgia and Times New Roman, needed nothing
 * here at all — see palette.ts's "classic" entry, already exactly
 * those two names as a free system stack.)
 *
 * WHAT "SELF-HOSTED" STILL MEANS HERE: `next/font/google` downloads
 * each family at BUILD time and serves the files from this site's own
 * origin — a reader's browser never makes a request to Google, which is
 * the runtime/privacy property §17.6 actually protects. What's
 * different from the other two fonts is reproducibility: `plexSans`
 * and `sourceSerif` are fetched once by scripts/fetch-fonts.mjs and
 * committed as .woff2, so a build never needs the network at all. These
 * eighteen are fetched by Next.js itself on first build (then cached),
 * so `pnpm build`/`pnpm dev` needs real internet access at least once.
 *
 * WEIGHTS ARE DELIBERATELY MINIMAL — 400 alone for anything that isn't
 * routinely bolded (every script/handwriting face, the two monospace
 * faces, the display faces), 400+700 for the sans/serif faces that
 * plausibly need a bold run inside a write-up. Not the 6–9 weights each
 * family ships by default: this write-up editor's own bold button
 * already exists as a MARK the renderer can fake with font-weight if a
 * requested weight is absent, so there is no reason to ship a 600 and
 * an 800 nobody's bold button will ever ask for.
 * ══════════════════════════════════════════════════════════════════════
 */

// ── Sans-serif ──────────────────────────────────────────────────────
export const gfRoboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-gf-roboto",
  display: "swap",
});
export const gfOpenSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-gf-open-sans",
  display: "swap",
});
export const gfMontserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-gf-montserrat",
  display: "swap",
});
export const gfLato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-gf-lato",
  display: "swap",
});
export const gfPoppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-gf-poppins",
  display: "swap",
});

// ── Serif ────────────────────────────────────────────────────────────
export const gfMerriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-gf-merriweather",
  display: "swap",
});
export const gfPlayfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-gf-playfair",
  display: "swap",
});
export const gfLora = Lora({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-gf-lora",
  display: "swap",
});
// Georgia and Times New Roman are not added here at all: the existing
// "classic" font entry (see globals.css's .rt-font-classic) is already
// exactly `Georgia, "Times New Roman", Times, serif` — a system stack,
// no download. Adding a second entry for the same two names would be a
// duplicate choice in the picker for a font already offered for free.

// ── Display ──────────────────────────────────────────────────────────
export const gfOswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-gf-oswald",
  display: "swap",
});
export const gfBebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-gf-bebas",
  display: "swap",
});
export const gfLobster = Lobster({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-gf-lobster",
  display: "swap",
});

// ── Monospace ────────────────────────────────────────────────────────
export const gfSpaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-gf-space-mono",
  display: "swap",
});
export const gfInconsolata = Inconsolata({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-gf-inconsolata",
  display: "swap",
});
export const gfCourierPrime = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-gf-courier-prime",
  display: "swap",
});

// ── Script / handwriting ────────────────────────────────────────────
export const gfPacifico = Pacifico({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-gf-pacifico",
  display: "swap",
});
export const gfGreatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-gf-great-vibes",
  display: "swap",
});
export const gfDancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-gf-dancing-script",
  display: "swap",
});

/** Every variable class in one string, spread onto <html> in layout.tsx
 *  alongside the two core fonts — so any of these CSS custom properties
 *  is available anywhere on the page, the same way --font-display and
 *  --font-editorial already are. */
export const richtextFontVariables = [
  gfRoboto.variable,
  gfOpenSans.variable,
  gfMontserrat.variable,
  gfLato.variable,
  gfPoppins.variable,
  gfMerriweather.variable,
  gfPlayfairDisplay.variable,
  gfLora.variable,
  gfOswald.variable,
  gfBebasNeue.variable,
  gfLobster.variable,
  gfSpaceMono.variable,
  gfInconsolata.variable,
  gfCourierPrime.variable,
  gfPacifico.variable,
  gfGreatVibes.variable,
  gfDancingScript.variable,
].join(" ");
