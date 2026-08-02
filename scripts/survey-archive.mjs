/**
 * ══════════════════════════════════════════════════════════════════════
 * WHAT IS ACTUALLY IN THE ARCHIVE.
 *
 *   node scripts/survey-archive.mjs
 *
 * Phase C cannot be planned from the folder names. `BRS/Workshops` has
 * nineteen directories; how many carry usable English copy, how many are
 * photographs only, and how many carry a phone number that must never
 * reach the website are three different questions, and the answers
 * decide what can be built this week.
 *
 * This reads and reports. It writes nothing, imports nothing, and
 * touches no database — the archive is the one artefact on this project
 * that cannot be regenerated.
 *
 * ── WHAT IT FLAGS ──
 * `desc.txt` is the ORIGINAL Bangla announcement copy, and the ones
 * checked so far carry mobile numbers and a bKash number. Those files
 * are provenance, not publishable text. Anything this reports as
 * CONTAINS-CONTACT must be hand-read before a single line of it is
 * imported (§12.1).
 * ══════════════════════════════════════════════════════════════════════
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "BRS";

/** Bangladeshi mobile numbers, in the shapes the archive actually uses:
 *  01726-106981, 01622871993, +8801..., and bKash references. */
const CONTACT = [
  /\b(?:\+?88)?0?1[3-9]\d{2}[-\s]?\d{6}\b/,
  /\bbkash\b/i,
  /\bবিকাশ\b/,
];

const IMAGE = /\.(jpe?g|png|heic|webp|avif)$/i;

const has = (s, res) => res.some((r) => r.test(s));

function walk(dir) {
  const out = { files: [], dirs: [] };
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.dirs.push(p);
    else out.files.push(p);
  }
  return out;
}

function describe(dir) {
  const { files, dirs } = walk(dir);
  const all = [...files];
  for (const d of dirs) all.push(...walk(d).files);

  const texts = all.filter((f) => f.endsWith(".txt"));
  const images = all.filter((f) => IMAGE.test(f));

  let english = null;
  let contact = [];
  let links = 0;

  for (const t of texts) {
    let body = "";
    try {
      body = readFileSync(t, "utf8");
    } catch {
      continue;
    }
    const base = t.split("/").pop().toLowerCase();
    // "description for website" is the club's own web-ready English copy.
    if (base.includes("website") || base.includes("english")) english = t;
    if (has(body, CONTACT)) contact.push(base);
    if (/https?:\/\//.test(body)) links++;
  }

  // Fall back to any non-Bangla-looking .txt if there is no explicit one.
  if (!english) {
    for (const t of texts) {
      const body = readFileSync(t, "utf8");
      const bangla = (body.match(/[ঀ-৿]/g) ?? []).length;
      if (body.trim().length > 120 && bangla / body.length < 0.05) {
        english = t;
        break;
      }
    }
  }

  return { images: images.length, texts: texts.length, english, contact, links };
}

const sections = readdirSync(ROOT).filter((n) => {
  try {
    return statSync(join(ROOT, n)).isDirectory();
  } catch {
    return false;
  }
});

let totalEvents = 0;
let totalCopy = 0;
let totalImages = 0;
const flagged = [];

for (const section of sections) {
  const path = join(ROOT, section);
  const { dirs } = walk(path);

  // A section with no subdirectories IS the event (e.g. "iARC 2014").
  const entries = dirs.length ? dirs : [path];
  const rows = entries.map((d) => ({ name: d.replace(`${ROOT}/`, ""), ...describe(d) }));

  const withCopy = rows.filter((r) => r.english).length;
  const images = rows.reduce((a, r) => a + r.images, 0);
  totalEvents += rows.length;
  totalCopy += withCopy;
  totalImages += images;

  console.log(
    `\n${section}  —  ${rows.length} ${rows.length === 1 ? "entry" : "entries"}, ` +
      `${withCopy} with English copy, ${images} photographs`,
  );
  for (const r of rows) {
    const mark = r.english ? "✓" : "·";
    const warn = r.contact.length ? `  ⚠ contact in ${r.contact.join(", ")}` : "";
    console.log(
      `  ${mark} ${r.name.replace(`${section}/`, "").padEnd(44)} ` +
        `${String(r.images).padStart(3)} img${warn}`,
    );
    if (r.contact.length) flagged.push(`${r.name} → ${r.contact.join(", ")}`);
  }
}

console.log(`\n${"─".repeat(70)}`);
console.log(`${totalEvents} entries · ${totalCopy} with English copy · ${totalImages} photographs`);
console.log(
  `\n⚠ ${flagged.length} entr${flagged.length === 1 ? "y" : "ies"} contain a phone or payment number.`,
);
console.log(
  `  These are the ORIGINAL announcements. Their text is provenance, not\n` +
    `  publishable copy — §12.1. Nothing here may be imported unread.`,
);
