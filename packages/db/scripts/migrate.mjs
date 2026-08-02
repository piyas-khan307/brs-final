/**
 * ══════════════════════════════════════════════════════════════════════
 * THE MIGRATION RUNNER.
 *
 * Applies every .sql file in ../migrations, in filename order, that is
 * not already recorded in `schema_migrations`.
 *
 * ── WHY THIS EXISTS ──
 * package.json has advertised `pnpm migrate` since Phase 0 and the file
 * was never written; the first seven migrations were applied by pasting
 * them into psql. That works exactly until the day someone applies six of
 * seven to a production database and does not notice which one they
 * skipped. Ordering and completeness are not things to hold in a head.
 *
 * ── DESIGN ──
 * · Each file runs in ITS OWN transaction. The migrations already open
 *   BEGIN/COMMIT themselves, so this runner does not wrap them again —
 *   it would nest, and a nested COMMIT is a no-op that hides a failure.
 * · A file that fails stops the run. Later migrations assume earlier ones
 *   landed; continuing past a failure is how a schema ends up in a state
 *   no migration file describes.
 * · Recording is the migration's own job (each ends with an INSERT into
 *   schema_migrations). This runner only READS that table to decide what
 *   to skip, so a migration that half-applies is never marked done.
 * · --dry-run prints the plan and touches nothing.
 * ══════════════════════════════════════════════════════════════════════
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");
const DRY = process.argv.includes("--dry-run");

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL ?? "postgres://brs:brs@localhost:5433/brs",
});
await client.connect();

/**
 * schema_migrations is itself created by 0002, so on a virgin database it
 * does not exist yet. Absent table means "nothing applied", which is the
 * truth — not an error to report.
 */
let applied = new Set();
try {
  const { rows } = await client.query("SELECT version FROM schema_migrations");
  applied = new Set(rows.map((r) => r.version));
} catch {
  console.log("schema_migrations does not exist yet — treating as a fresh database.");
}

const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const pending = files.filter((f) => !applied.has(f.replace(/\.sql$/, "")));

console.log(`${files.length} migration(s) on disk, ${applied.size} applied, ${pending.length} pending.`);
if (pending.length === 0) {
  await client.end();
  process.exit(0);
}

for (const f of pending) console.log(`  pending: ${f}`);
if (DRY) {
  console.log("\n--dry-run: nothing was applied.");
  await client.end();
  process.exit(0);
}

for (const f of pending) {
  process.stdout.write(`\napplying ${f} ... `);
  try {
    await client.query(readFileSync(join(DIR, f), "utf8"));
    console.log("ok");
  } catch (e) {
    console.log("FAILED");
    // Postgres puts the useful part in `detail`/`hint`/`where`, and the
    // RAISE EXCEPTION guards in 0006 speak in full sentences. Print them.
    console.error(`\n  ${e.message}`);
    for (const k of ["detail", "hint", "where", "constraint"]) {
      if (e[k]) console.error(`  ${k}: ${e[k]}`);
    }
    console.error(
      `\nStopped at ${f}. ${pending.length - pending.indexOf(f) - 1} later migration(s) ` +
        `were NOT attempted — they assume this one landed.`,
    );
    await client.end();
    process.exit(1);
  }
}

// Trust the table, not this loop: a migration that forgot its own INSERT
// would otherwise be silently re-run on every deploy.
const { rows } = await client.query("SELECT version FROM schema_migrations");
const recorded = new Set(rows.map((r) => r.version));
const missing = pending.filter((f) => !recorded.has(f.replace(/\.sql$/, "")));
if (missing.length) {
  console.error(
    `\n⚠ Applied but not recorded in schema_migrations: ${missing.join(", ")}.\n` +
      `  Each migration must end with an INSERT INTO schema_migrations. ` +
      `Until that is fixed these will re-run on the next deploy.`,
  );
  await client.end();
  process.exit(1);
}

console.log(`\n${pending.length} migration(s) applied.`);
await client.end();
