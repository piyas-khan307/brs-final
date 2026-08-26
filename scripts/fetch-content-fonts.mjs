/**
 * ══════════════════════════════════════════════════════════════════════
 * THE FACES A WRITER MAY CHOOSE — fetched the same way, budgeted apart.
 *
 * scripts/fetch-fonts.mjs owns the three families the SITE is built from.
 * Those are preloaded on every page, they are on the critical path, and
 * §4.7 caps them at 110 KB with 1.4 KB to spare. Nothing here may touch
 * that number.
 *
 * These are different in the one way that matters: they are offered in
 * the write-up editor's font menu, and a page pays for one only if a
 * writer actually used it. They are NOT preloaded and carry no <link>.
 * A @font-face declaration is inert until a rule matches it, so an event
 * page that uses none of them downloads none of them, and one that sets
 * a heading in Lobster downloads Lobster and nothing else.
 *
 * That is why they get their own budget rather than a share of §4.7's:
 * the core figure measures what every reader pays on first paint, and
 * folding an opt-in face into it would make that number stop meaning
 * what it is for.
 *
 * ── STILL SELF-HOSTED ──
 * PROJECT_SPEC §17.6 forbids a third-party font CDN — latency, privacy,
 * a single point of failure — and that applies to an optional face
 * exactly as much as to a core one. This script downloads at build time
 * and the files are served from our own origin. Nothing at runtime ever
 * talks to Google.
 *
 * ── ONE CUT PER FAMILY ──
 * A weight axis where the family has one (400..700 in a single variable
 * file, which is usually SMALLER than two static cuts), otherwise the
 * 400. Bold and italic on a face that ships neither are synthesised by
 * the browser — the same bargain the editor already makes for italic in
 * IBM Plex Sans, which loads roman only.
 *
 *   node scripts/fetch-content-fonts.mjs
 * ══════════════════════════════════════════════════════════════════════
 */

import { mkdirSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "apps",
  "web",
  "public",
  "fonts",
);

/* A modern UA, so the API serves woff2 rather than the ttf it hands to
   anything it does not recognise. Same reason fetch-fonts.mjs sets one. */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/** family: the Google family name. file: what we save it as. */
const FAMILIES = [
  // ── Sans ──
  { family: "Roboto", file: "Roboto" },
  { family: "Open Sans", file: "OpenSans" },
  { family: "Montserrat", file: "Montserrat" },
  { family: "Lato", file: "Lato" },
  { family: "Poppins", file: "Poppins" },
  // ── Serif ──
  { family: "Merriweather", file: "Merriweather" },
  { family: "Playfair Display", file: "PlayfairDisplay" },
  { family: "Lora", file: "Lora" },
  // Georgia and Times New Roman are absent on purpose: they are SYSTEM
  // faces. Shipping a download for a font already on every machine is
  // paying twice for the same glyphs. They are plain stacks in the CSS.
  // ── Display ──
  { family: "Oswald", file: "Oswald" },
  { family: "Bebas Neue", file: "BebasNeue" },
  { family: "Lobster", file: "Lobster" },
  // ── Mono ──
  { family: "Space Mono", file: "SpaceMono" },
  { family: "Inconsolata", file: "Inconsolata" },
  { family: "Courier Prime", file: "CourierPrime" },
  // ── Script ──
  { family: "Pacifico", file: "Pacifico" },
  { family: "Great Vibes", file: "GreatVibes" },
  { family: "Dancing Script", file: "DancingScript" },
];

/* Generous next to §4.7's 110 KB, and it is not comparable to it: none
   of this is on the critical path. It exists to catch the day somebody
   adds a family with a CJK subset by accident, not to ration the menu. */
const CONTENT_BUDGET_BYTES = 700 * 1024;

const enc = (s) => s.replace(/ /g, "+");

/** Ask for the weight axis first; fall back to the single 400 for a
 *  family that has no axis, because the API answers a range it cannot
 *  serve with a 400 rather than with the static cut. */
function urlsFor(family) {
  return [
    `https://fonts.googleapis.com/css2?family=${enc(family)}:wght@400..700&display=swap`,
    `https://fonts.googleapis.com/css2?family=${enc(family)}:wght@400&display=swap`,
    `https://fonts.googleapis.com/css2?family=${enc(family)}&display=swap`,
  ];
}

/** Google precedes each @font-face with a comment naming the subset. */
function latinFace(css) {
  const re = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([\s\S]*?)\}/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    const [, subset, body] = m;
    if (subset !== "latin") continue;
    const url = body.match(/url\((https:\/\/[^)]+\.woff2)\)/)?.[1];
    const range = body.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim();
    if (url) return { url, range };
  }
  return null;
}

mkdirSync(OUT, { recursive: true });

let total = 0;
let failed = false;
const written = [];

for (const { family, file } of FAMILIES) {
  let face = null;
  for (const url of urlsFor(family)) {
    const res = await fetch(url, { headers: { "user-agent": UA } });
    if (!res.ok) continue;
    face = latinFace(await res.text());
    if (face) break;
  }
  if (!face) {
    console.error(`FAILED: no latin face for ${family}`);
    failed = true;
    continue;
  }

  const bin = await fetch(face.url, { headers: { "user-agent": UA } });
  if (!bin.ok) {
    console.error(`FAILED to download ${family}: ${bin.status}`);
    failed = true;
    continue;
  }
  const buf = Buffer.from(await bin.arrayBuffer());
  const name = `${file}-latin.woff2`;
  writeFileSync(join(OUT, name), buf);
  total += buf.length;
  written.push({ family, file, name, bytes: buf.length, range: face.range });
  console.log(`  ${name.padEnd(30)} ${String(buf.length).padStart(7)} bytes`);
}

console.log("─".repeat(64));
console.log(
  `  total ${total} bytes (${(total / 1024).toFixed(1)} KB) — budget ${CONTENT_BUDGET_BYTES / 1024} KB`,
);
console.log(
  "  NOT PRELOADED: a page downloads only the faces it actually uses.\n",
);

if (failed) process.exit(1);
if (total > CONTENT_BUDGET_BYTES) {
  console.error("\n  OVER THE CONTENT-FACE BUDGET. Drop a family before committing.\n");
  process.exit(1);
}
