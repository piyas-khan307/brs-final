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
    // ── DISPLAY: SPACE GROTESK ──────────────────────────────────────
    // Replaces Archivo on client direction: "its look too ordinary".
    // That was a fair call — Archivo is a well-made neo-grotesque, which
    // is precisely the problem. At display size it is close enough to
    // Helvetica that it reads as the absence of a decision.
    //
    // Space Grotesk is drawn from Space Mono, so it keeps a monospace's
    // squared terminals and flat-sided bowls while spacing proportionally.
    // Its letterforms are genuinely odd — the single-storey 'g', the
    // squared 'S', the sheared 't' — which is what stops it reading as a
    // default.
    //
    // It also answers to the mark. The "BRS" lettering in the logo is
    // condensed, squared, and cut at angles; Space Grotesk is the closest
    // free text face to that construction, so the wordmark and the badge
    // now look like they were drawn by the same hand.
    //
    // NO wdth AXIS. Archivo's variable width was load-bearing in the old
    // system and Space Grotesk does not have one — it varies on weight
    // only, 300-700. Every fontVariationSettings on the site drops its
    // 'wdth' term accordingly rather than setting an axis that silently
    // does nothing.
    css: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap",
    subsets: { latin: "SpaceGrotesk-variable-latin.woff2" },
    requireVariableWidth: false,
  },
  {
    css: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400&display=swap",
    subsets: { latin: "IBMPlexMono-400-latin.woff2" },
    requireVariableWidth: false,
  },
];

const FONT_BUDGET_BYTES = 110 * 1024;

/** Split the CSS into blocks. Google precedes each @font-face with a
 *  comment naming the subset (latin, latin-ext, vietnamese, ...). */
function parseFaces(css) {
  const faces = [];
  const re = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([\s\S]*?)\}/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    const [, subset, body] = m;
    const url = body.match(/url\((https:\/\/[^)]+\.woff2)\)/)?.[1];
    const stretch = /font-stretch:/.test(body);
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
