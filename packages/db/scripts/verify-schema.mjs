#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════
 * SCHEMA VERIFIER — static checks, no database required.
 *
 * Runs in CI where Docker may not be available. This is NOT a substitute
 * for applying the migration to a real Postgres (that runs in Phase B1
 * against the compose stack) — it checks the invariants that matter most
 * and that a running database would not tell us anyway:
 *
 *   1. NO CONTACT COLUMN, EVER. §12.1 control 1. The strongest of the five
 *      privacy controls, because it removes the possibility rather than
 *      policing it. A future maintainer bulk-importing a roster would
 *      naturally add `contact_no` here; this fails the build if they do.
 *   2. Transaction balance — a migration that half-applies is worse than
 *      one that fails.
 *   3. Referential integrity of the DDL itself: every REFERENCES target
 *      must be a table this migration declares.
 *   4. Alt-text constraint present on assets.
 *
 * Exit 0 clean · exit 1 violations
 * ══════════════════════════════════════════════════════════════════════
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(HERE, "..", "migrations");

/* Column names that must never exist. Personal phone numbers for ~470
   students sit in the source rosters; `members` is where a careless
   import would put them. */
const FORBIDDEN_COLUMNS = [
  "phone", "phone_no", "phone_number",
  "mobile", "mobile_no", "mobile_number",
  "contact", "contact_no", "contact_number",
  "cell", "cellphone", "whatsapp", "telephone",
  "bkash", "nagad",
];

const problems = [];
const info = [];

const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
if (files.length === 0) problems.push("No migration files found.");

let allSql = "";
for (const f of files) {
  allSql += `\n-- FILE ${f}\n${readFileSync(join(MIGRATIONS, f), "utf8")}`;
}

/* Strip comments so prose about forbidden columns (there is deliberately
   a lot of it) does not trip the scanner. */
const sql = allSql
  .split("\n")
  .filter((l) => !l.trim().startsWith("--"))
  .join("\n")
  .replace(/\/\*[\s\S]*?\*\//g, "");

/* ── 1. Forbidden columns ─────────────────────────────────────────────── */
for (const col of FORBIDDEN_COLUMNS) {
  // A column definition looks like: <name> <type> ... at line start.
  const re = new RegExp(`^\\s*"?${col}"?\\s+(text|varchar|char|integer|bigint|numeric|jsonb)`, "gim");
  if (re.test(sql)) {
    problems.push(
      `FORBIDDEN COLUMN '${col}' declared. Personal contact data must not exist in the ` +
        `schema (implementation_plan.md §12.1 control 1). If a contact route is needed, ` +
        `use an official club address — never a personal number.`,
    );
  }
}

/* ── 2. Transaction balance ───────────────────────────────────────────── */
const begins = (sql.match(/^\s*BEGIN\s*;/gim) ?? []).length;
const commits = (sql.match(/^\s*COMMIT\s*;/gim) ?? []).length;
if (begins !== commits) {
  problems.push(`Unbalanced transactions: ${begins} BEGIN vs ${commits} COMMIT.`);
}
info.push(`transactions: ${begins} BEGIN / ${commits} COMMIT`);

/* ── 3. DDL referential integrity ─────────────────────────────────────── */
const declared = new Set(
  [...sql.matchAll(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+"?(\w+)"?/gi)].map((m) => m[1].toLowerCase()),
);
const duplicates = [];
const seen = new Set();
for (const m of sql.matchAll(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+"?(\w+)"?/gi)) {
  const t = m[1].toLowerCase();
  if (seen.has(t)) duplicates.push(t);
  seen.add(t);
}
for (const d of duplicates) problems.push(`Table '${d}' declared more than once.`);

const referenced = new Set(
  [...sql.matchAll(/REFERENCES\s+"?(\w+)"?/gi)].map((m) => m[1].toLowerCase()),
);
for (const r of referenced) {
  if (!declared.has(r)) {
    problems.push(`REFERENCES '${r}' but no CREATE TABLE for it in this migration set.`);
  }
}
info.push(`tables: ${declared.size} declared, ${referenced.size} distinct FK targets`);

/* ── 4. Alt-text constraint ───────────────────────────────────────────── */
if (!/alt\s+text\s+NOT NULL\s+CHECK\s*\(\s*length/i.test(sql)) {
  problems.push(
    "assets.alt is missing its NOT NULL + length CHECK. Alt text is enforced at the " +
      "database level so ~1,105 images of debt stays visible rather than silently skipped (§9.2).",
  );
}

/* ── 5. Achievement verification guard ────────────────────────────────── */
if (!/result_needs_verification/i.test(sql)) {
  problems.push(
    "achievements is missing the result_needs_verification constraint. Fabricated " +
      "placements must be structurally impossible (§17.4) — the Panasonic Award 2005 is " +
      "the only result evidenced in the archive.",
  );
}

/* ── Report ───────────────────────────────────────────────────────────── */
console.log("SCHEMA VERIFIER (static — no database)");
console.log("─".repeat(64));
console.log(`  files: ${files.join(", ")}`);
for (const i of info) console.log(`  ${i}`);
const indexes = (sql.match(/CREATE (UNIQUE )?INDEX/gi) ?? []).length;
const checks = (sql.match(/CHECK\s*\(/gi) ?? []).length;
console.log(`  indexes: ${indexes}   check constraints: ${checks}`);
console.log("─".repeat(64));

if (problems.length === 0) {
  console.log("  CLEAN — no contact columns, transactions balanced, FK targets resolve.\n");
  console.log("  NOTE: this is a static check. Applying the migration to a real Postgres");
  console.log("  is a Phase B1 task (`docker compose up postgres`).\n");
  process.exit(0);
}

console.error(`\n  ${problems.length} SCHEMA VIOLATION(S)\n`);
for (const p of problems) console.error(`  - ${p}\n`);
process.exit(1);
