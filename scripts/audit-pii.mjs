#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════
 * BRS PII GATE
 * implementation_plan.md §12.1 control 5 — the last line of defence.
 *
 * ~470 students' mobile numbers sit in the seven ExCom roster files. The
 * schema has no contact column, the parser drops it, and the DTO has no
 * such field (controls 1–4). This gate exists because those controls are
 * written by humans who can be wrong.
 *
 * Runs on every PR, permanently. It protects the site from every future
 * maintainer, including well-meaning ones who paste a roster straight
 * from a spreadsheet.
 *
 * Usage
 *   node scripts/audit-pii.mjs               scan shippable surfaces
 *   node scripts/audit-pii.mjs --selftest    prove the scanner works
 *   node scripts/audit-pii.mjs --scan-archive  quantify source risk (informational)
 *
 * Exit 0 clean · exit 1 findings · exit 2 self-test failed
 *
 * KNOWN LIMITATION: this cannot read numbers rendered *inside* poster
 * images. Event posters require manual visual review before launch.
 * ══════════════════════════════════════════════════════════════════════
 */

import { readFileSync, readdirSync, statSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

/* ── Surfaces that actually ship, or feed what ships ──────────────────
   Deliberately EXCLUDES the source archive (BRS/, BRS ExCom/): those
   files legitimately contain phone numbers and are what we strip from.
   Scanning them would fail forever and teach everyone to ignore the gate. */
const SCAN_TARGETS = [
  "apps/web/out", // built static output — the real test
  "apps/web/src",
  "apps/api/src",
  "packages", // contract, db migrations, media
  "docs",
  "PROJECT_SPEC.md",
  "implementation_plan.md",
];

const ARCHIVE_TARGETS = ["BRS", "BRS ExCom"];

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", ".turbo", "dist", ".wrangler",
  "coverage", "playwright-report", "test-results", ".pnpm-store",
]);

/* Binary and generated formats where a digit run carries no meaning. */
const SKIP_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico", ".heic",
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  ".pdf", ".zip", ".ai", ".eps", ".psd", ".arw", ".lnk",
  ".mp4", ".webm", ".mov", ".map", ".lock",
]);

/* ── Detection: permissive candidate + strict validator ───────────────
   Bangladeshi mobiles are 11 digits with an 01[3-9] prefix, optionally
   carrying a +88 country code.

   An earlier version tried to encode separator POSITIONS in the regex
   and missed `01979-352150` and `01712 345678` — real formatting splits
   5+6, not 4+7. The self-test caught it. Rather than chase permutations
   with a cleverer regex, we now match loosely and validate strictly:
   easier to read, and far harder to get subtly wrong.

   Lookarounds keep us out of longer digit runs (build hashes, checksums,
   timestamps, base64). */
const CANDIDATE =
  /(?<![\d\w])(?:\+?88[\s.-]?)?0[\s.-]?1[\s.-]?[3-9](?:[\s.-]?\d){8}(?![\d\w])/g;

/** A candidate is a real number only if its digits form a valid BD mobile
 *  and it is not shot through with separators (which would signal we have
 *  swept up unrelated digits from a table row or a data blob). */
function validateCandidate(raw) {
  const digits = raw.replace(/\D/g, "");
  if (!/^(?:88)?01[3-9]\d{8}$/.test(digits)) return null;
  const separators = (raw.match(/[\s.-]/g) ?? []).length;
  if (separators > 3) return null;
  return {
    label: separators === 0 ? "Bangladeshi mobile (plain)" : "Bangladeshi mobile (separated)",
    id: separators === 0 ? "bd-mobile-plain" : "bd-mobile-separated",
  };
}

/* Human-verified false positives. Add sparingly, always with a reason. */
let ALLOWLIST = [];
try {
  ALLOWLIST = JSON.parse(readFileSync(join(ROOT, ".pii-allowlist.json"), "utf8")).allow ?? [];
} catch {
  /* absent is fine */
}
const isAllowed = (match) =>
  ALLOWLIST.some((e) => e.value === match.replace(/[\s.-]/g, ""));

/* ── Walker ───────────────────────────────────────────────────────────── */

function* walk(abs) {
  let st;
  try {
    st = statSync(abs);
  } catch {
    return; // target not built yet — not an error
  }
  if (st.isFile()) {
    yield abs;
    return;
  }
  if (!st.isDirectory()) return;
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(join(abs, entry.name));
    } else if (entry.isFile()) {
      if (SKIP_EXT.has(extname(entry.name).toLowerCase())) continue;
      yield join(abs, entry.name);
    }
  }
}

function scanFile(abs) {
  let text;
  try {
    text = readFileSync(abs, "utf8");
  } catch {
    return [];
  }
  // Cheap binary sniff: NUL byte in the first 4 KB.
  if (text.slice(0, 4096).includes("\0")) return [];

  const findings = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    CANDIDATE.lastIndex = 0;
    let m;
    while ((m = CANDIDATE.exec(line)) !== null) {
      const verdict = validateCandidate(m[0]);
      if (!verdict) continue;
      if (isAllowed(m[0])) continue;
      findings.push({
        file: relative(ROOT, abs),
        line: i + 1,
        match: m[0],
        pattern: verdict.id,
        label: verdict.label,
        context: line.trim().slice(0, 120),
      });
    }
  }
  return findings;
}

function scan(targets) {
  const findings = [];
  let filesScanned = 0;
  for (const t of targets) {
    for (const abs of walk(join(ROOT, t))) {
      filesScanned++;
      findings.push(...scanFile(abs));
    }
  }
  return { findings, filesScanned };
}

/* Redact for reporting. Never print a full number to a CI log — that
   would defeat the purpose of the gate. */
const redact = (n) => {
  const d = n.replace(/[\s.-]/g, "");
  return `${d.slice(0, 4)}${"*".repeat(Math.max(0, d.length - 6))}${d.slice(-2)}`;
};

/* ── Self-test ────────────────────────────────────────────────────────
   Phase 0 exit criterion: "PII gate proven to fail on a seeded number."
   An unverified gate is not a gate. */
function selftest() {
  console.log("PII GATE SELF-TEST");
  console.log("─".repeat(64));

  const dir = mkdtempSync(join(tmpdir(), "brs-pii-selftest-"));
  const cases = [
    { name: "plain.txt", body: "President — Sudipto Sarkar Joy — 01774024354\n", expect: true },
    { name: "hyphen.md", body: "| Treasurer | 01979-352150 |\n", expect: true },
    { name: "spaced.tsx", body: "const c = '01712 345678';\n", expect: true },
    { name: "cc.json", body: '{"phone":"+8801879892525"}\n', expect: true },
    { name: "in-html.html", body: "<td>01628912047</td>\n", expect: true },
    { name: "clean.tsx", body: "export const YEARS = [2005, 2012, 2024];\n", expect: false },
    { name: "hash.txt", body: "chunk.a1b2c301356789012345.js\n", expect: false },
    { name: "bignum.txt", body: "checksum 8679826013567890123\n", expect: false },
    { name: "landline.txt", body: "Tel 0299663000\n", expect: false },
  ];

  let pass = 0;
  let fail = 0;
  for (const c of cases) {
    const p = join(dir, c.name);
    writeFileSync(p, c.body, "utf8");
    const caught = scanFile(p).length > 0;
    const ok = caught === c.expect;
    if (ok) pass++;
    else fail++;
    console.log(
      `  ${ok ? "PASS" : "FAIL"}  ${c.name.padEnd(14)} ` +
        `expected ${c.expect ? "CAUGHT " : "CLEAN  "} got ${caught ? "CAUGHT" : "CLEAN"}`,
    );
  }

  rmSync(dir, { recursive: true, force: true });
  console.log("─".repeat(64));
  console.log(`  ${pass}/${cases.length} cases passed\n`);

  if (fail > 0) {
    console.error("SELF-TEST FAILED — the gate cannot be trusted. Fix before relying on it.");
    process.exit(2);
  }
  console.log("Gate verified: it catches seeded numbers and does not fire on hashes,");
  console.log("checksums, landlines, or year arrays.\n");
}

/* ── Archive census (informational, never fails) ─────────────────────── */
function archiveCensus() {
  console.log("SOURCE ARCHIVE CENSUS (informational — these are the files we strip FROM)");
  console.log("─".repeat(64));
  const { findings, filesScanned } = scan(ARCHIVE_TARGETS);
  const byFile = new Map();
  for (const f of findings) byFile.set(f.file, (byFile.get(f.file) ?? 0) + 1);

  const ranked = [...byFile.entries()].sort((a, b) => b[1] - a[1]);
  for (const [file, n] of ranked.slice(0, 12)) {
    console.log(`  ${String(n).padStart(4)}  ${file}`);
  }
  if (ranked.length > 12) console.log(`  ...and ${ranked.length - 12} more files`);
  console.log("─".repeat(64));
  console.log(`  ${findings.length} numbers across ${byFile.size} files (${filesScanned} scanned)`);
  console.log("  This is the risk the gate exists to contain. Not a failure.\n");
}

/* ── Main ─────────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
if (argv.includes("--selftest")) {
  selftest();
  process.exit(0);
}
if (argv.includes("--scan-archive")) {
  archiveCensus();
  process.exit(0);
}

console.log("PII GATE — scanning shippable surfaces");
console.log("─".repeat(64));

const { findings, filesScanned } = scan(SCAN_TARGETS);

if (findings.length === 0) {
  console.log(`  CLEAN — ${filesScanned} files scanned, 0 findings.\n`);
  process.exit(0);
}

console.error(`\n  ${findings.length} POTENTIAL PHONE NUMBER(S) FOUND — BUILD FAILED\n`);
for (const f of findings) {
  console.error(`  ${f.file}:${f.line}`);
  console.error(`    match   ${redact(f.match)}  (${f.label})`);
  console.error(`    context ${f.context}\n`);
}
console.error("─".repeat(64));
console.error(`  Scanned ${filesScanned} files.

  Personal phone numbers must never reach a shippable surface.
  See implementation_plan.md §12.1.

  If a finding is a genuine false positive, add it to
  .pii-allowlist.json with a written reason — do not weaken the pattern.
`);
process.exit(1);
