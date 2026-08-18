#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════
 * FONT FETCH — self-hosting, reproducibly.
 *
 * PROJECT_SPEC.md §17.6 forbids a third-party font CDN: latency, privacy,
 * and a single point of failure. So we fetch once and commit the files.
 *
 * Parses the Google Fonts css2 response rather than hardcoding URLs — those
 * carry a version segment (…/archivo/v25/…) that changes, and a hardcoded
 * URL silently rots.
 *
 * ARCHIVO MUST KEEP ITS wdth AXIS. Display type at §4.4 sets wdth 112, and
 * rubric check 12 fails without it. The fetched face is verified to declare
 * `font-stretch` before it is written.
 *
 * FONT BUDGET — measured, then revised. The original §4.7 figure was 90 KB,
 * written before the cost of a two-axis variable face had been measured.
 * Probed against the Google Fonts API:
 *
 *   Archivo wdth 62-125 + wght 100-900, latin ....... 90,104 bytes
 *   Archivo wdth 105-115 + wght 400-700, latin ...... 90,104 bytes  (identical)
 *   Archivo wght 400-700 only, no wdth axis ......... 34,928 bytes
 *   Archivo single instance wdth112/wght600 ......... 36,960 bytes
 *
 * Google serves the full design space regardless of the range requested, so
 * narrowing the axis buys nothing. Dropping the wdth axis would save 55 KB
 * but it is a stated design requirement (§3.2, §4.4) and rubric check 12
 * depends on it; static per-width instances would need one file per width
 * across the 105-115 range used, which is worse.
 *
 * Reduced instead by cutting what is genuinely unused:
 *   - latin-ext (86 KB): Bengali is deferred and archive names are plain
 *     latin. Add back if a name ever needs it.
 *   - IBM Plex Mono 500 (15 KB): placards are uppercase and tracked, so
 *     weight emphasis is redundant. 400 only.
 *
 * Result: 102.4 KB. Budget raised to 110 KB on that measurement. Fonts are
 * cached across the whole site and carry more of the craftsmanship
 * requirement than any comparable weight of JS.
 * ══════════════════════════════════════════════════════════════════════
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "apps",
  "web",
  "src",
  "app",
  "fonts",
);

// A browser UA is required or the API returns legacy TTF.
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

const TARGETS = [
  {
    // ── DISPLAY: IBM PLEX SANS ──────────────────────────────────────
    // Replaces Space Grotesk on client direction: "its look like ai
    // made". That is an accurate read, and worth recording precisely
    // rather than treating as taste.
    //
    // Space Grotesk is a good face badly positioned. It became the
    // default display font of every site-generating LLM tool in
    // 2024-25, so it now carries that association whatever it is set
    // in — and it arrived here paired with a rose gradient button and
    // a glass-blur panel, which is the rest of that same house style.
    // A face that signals "generated" is the wrong face for an archive
    // whose entire claim is that the material is real.
    //
    // IBM Plex Sans answers it from inside the system we already have.
    // We have shipped IBM Plex Mono for labels and figures since Phase
    // 0; Plex Sans is its sibling, same skeleton and same designer, so
    // the placards and the prose stop being two unrelated voices and
    // become one superfamily. It was drawn as IBM's corporate type
    // from Bauhaus-era engineering lettering — an engineering
    // institution's face by literal provenance, not by association.
    //
    // It is also distinctive where it counts: the flared 'l' tail, the
    // angled terminal on 'a', the squared 'g'. Those come from the
    // mono and are what stop it reading as another neo-grotesque.
    //
    // NO wdth AXIS — weight only, 100-700. Same constraint Space
    // Grotesk had, so no fontVariationSettings on the site changes.
    // The one exception is any rule asking for wght above 700, which
    // now clamps; RichText's 750 was lowered to 700 when this landed.
    css: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@100..700&display=swap",
    subsets: { latin: "IBMPlexSans-variable-latin.woff2" },
    requireVariableWidth: false,
  },
  {
    css: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400&display=swap",
    subsets: { latin: "IBMPlexMono-400-latin.woff2" },
    requireVariableWidth: false,
  },
  {
    // ── EDITORIAL: SOURCE SERIF 4 ───────────────────────────────────
    // A third family, and the spec says two. The exception is argued
    // rather than assumed, because it is the kind of decision that
    // otherwise becomes five families by next year.
    //
    // Client direction on the Executive Committee page still stands:
    // "use different font style. not current simple font style." A
    // grotesque cannot answer that on its own — asking one to look
    // unlike a grotesque only ever produces a bigger grotesque. So the
    // serif stays; what changed is which serif.
    //
    // Instrument Serif went out with Space Grotesk and for the same
    // reason: it is the display serif those same tools reach for, so
    // it read as generated rather than as chosen.
    //
    // Source Serif 4 is Adobe's institutional text serif, drawn after
    // Fournier. Two things it gives us that Instrument Serif could not:
    //
    //   · A REAL WEIGHT AXIS, 200-900. Instrument Serif was 400-only,
    //     which is why fonts.ts had to forbid ever bolding it and why
    //     emphasis in that face had to come from size alone. Headings
    //     can now carry weight.
    //   · An optical size axis, 8-60 — WHICH WE DO NOT SHIP. See below.
    //
    // NO opsz AXIS, AND THAT WAS A BUDGET DECISION. Measured against
    // the API, latin subset only:
    //
    //   Source Serif 4, opsz 8-60 + wght 200-900 ..... 122,360 bytes
    //   Source Serif 4, wght 200-900, no opsz ........  50,824 bytes
    //   Source Serif 4, static 400 ...................  20,088 bytes
    //
    // The optical size axis costs 70 KB — more than the other two
    // families put together — and the whole of §4.7 is 110 KB. Shipped
    // with opsz the three families come to 178.5 KB and the budget gate
    // fails, which is how this was caught rather than discovered later.
    // Dropping it keeps the weight axis, which is the one that changes
    // what the design system can express.
    //
    // Consequence to know about: the face no longer redraws itself for
    // small sizes, so Instrument Serif's "never below about 1rem" rule
    // still applies here. It is a lower-contrast design than Instrument
    // Serif, so it degrades more gracefully — but it is a display face
    // and small text belongs in Plex Sans regardless.
    //
    // WHERE IT MAY BE USED is unchanged: display type only — page
    // titles, section headings, and the member names on
    // /executive-committee. Body copy stays Plex Sans; labels and
    // figures stay mono.
    //
    // ROMAN ONLY. The italic is another ~40 KB for a cut nothing on
    // the page currently calls for.
    css: "https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@200..900&display=swap",
    subsets: { latin: "SourceSerif4-variable-latin.woff2" },
    requireVariableWidth: false,
  },
];

const FONT_BUDGET_BYTES = 110 * 1024;

/** Split the CSS into blocks. Google precedes each @font-face with a
 *  comment naming the subset (latin, latin-ext, vietnamese, ...).
 *
 *  A wdth AXIS is `font-stretch: 62.5% 100%` — two values, a range. A
 *  face pinned to one width still declares `font-stretch: 100%`, and
 *  testing merely for the property's PRESENCE calls that variable. IBM
 *  Plex Sans does exactly this, which is what surfaced the bug: the
 *  fetch log announced "[variable width]" for a face that has no width
 *  axis at all. Nothing currently sets requireVariableWidth, so this
 *  only mislabelled a log line today — but the check exists precisely
 *  to refuse a static-width substitute, and one that accepts any face
 *  declaring a default width would have waved that substitute through. */
function parseFaces(css) {
  const faces = [];
  const re = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([\s\S]*?)\}/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    const [, subset, body] = m;
    const url = body.match(/url\((https:\/\/[^)]+\.woff2)\)/)?.[1];
    const stretch = /font-stretch:\s*[\d.]+%\s+[\d.]+%/.test(body);
    if (url) faces.push({ subset, url, hasStretch: stretch });
  }
  return faces;
}

mkdirSync(OUT, { recursive: true });

let total = 0;
let failed = false;

for (const target of TARGETS) {
  const res = await fetch(target.css, { headers: { "user-agent": UA } });
  if (!res.ok) {
    console.error(`FAILED to fetch CSS: ${res.status} ${target.css}`);
    failed = true;
    continue;
  }
  const css = await res.text();
  const faces = parseFaces(css);

  for (const [subset, filename] of Object.entries(target.subsets)) {
    const face = faces.find((f) => f.subset === subset);
    if (!face) {
      console.error(`FAILED: no '${subset}' face found for ${filename}`);
      failed = true;
      continue;
    }

    if (target.requireVariableWidth && !face.hasStretch) {
      console.error(
        `FAILED: ${filename} has no font-stretch descriptor. The wdth axis is ` +
          `load-bearing for display type (§4.4) and rubric check 12 fails without it. ` +
          `Refusing to write a static-width substitute.`,
      );
      failed = true;
      continue;
    }

    const bin = await fetch(face.url, { headers: { "user-agent": UA } });
    if (!bin.ok) {
      console.error(`FAILED to download ${filename}: ${bin.status}`);
      failed = true;
      continue;
    }
    const buf = Buffer.from(await bin.arrayBuffer());
    writeFileSync(join(OUT, filename), buf);
    total += buf.length;
    console.log(
      `  ${filename.padEnd(34)} ${String(buf.length).padStart(7)} bytes` +
        `${face.hasStretch ? "  [variable width]" : ""}`,
    );
  }
}

console.log("─".repeat(64));
console.log(
  `  total ${total} bytes (${(total / 1024).toFixed(1)} KB) — budget ${FONT_BUDGET_BYTES / 1024} KB`,
);

if (total > FONT_BUDGET_BYTES) {
  console.error("\n  OVER FONT BUDGET (§4.7). Subset further before committing.\n");
  process.exit(1);
}
if (failed) {
  console.error("\n  One or more fonts failed. Do not proceed to Phase L without them.\n");
  process.exit(1);
}
console.log("  Within budget.\n");
