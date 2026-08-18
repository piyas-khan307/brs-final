#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════
 * LOAD THE EXTRACTED EVENTS.
 *
 *   node --env-file=.env packages/db/scripts/load-events.mjs           (dry run)
 *   node --env-file=.env packages/db/scripts/load-events.mjs --apply
 *
 * Input is content/events.seed.json, written by extract-events.mjs.
 * Re-runnable: it upserts on slug, so a corrected extraction can be
 * loaded over the top without duplicating anything.
 *
 * ── EVERYTHING ARRIVES UNPUBLISHED ──
 * Not one row is written with published = true, and this script has no
 * flag to change that. Publishing is a decision about the club's own
 * words — eleven of these are still written as advertisements for events
 * that already happened — and it is made in the admin panel, by a person,
 * one at a time.
 *
 * ── THE EXCERPT IS TAKEN, NOT WRITTEN ──
 * The first real sentence of the body, trimmed to fit. Writing a summary
 * would mean inventing a description of an event this script knows
 * nothing about; quoting the opening is the only honest automatic answer,
 * and it is what an editor would replace first anyway.
 * ══════════════════════════════════════════════════════════════════════
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const APPLY = process.argv.includes("--apply");

const seed = JSON.parse(readFileSync(join(ROOT, "content", "events.seed.json"), "utf8"));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://brs:brs@localhost:5433/brs",
});

/** First sentence or two of the body, within the 20–320 the CHECK allows. */
function excerptFrom(body) {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length < 20) return null;
  if (flat.length <= 320) return flat;

  const cut = flat.slice(0, 320);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  // Prefer a sentence boundary; fall back to a word boundary; never
  // mid-word, and never a bare "…" with nothing before it.
  const text = end > 80 ? cut.slice(0, end + 1) : cut.slice(0, cut.lastIndexOf(" "));
  return text.trim();
}

console.log(APPLY ? "MODE: apply\n" : "MODE: dry run (pass --apply to write)\n");

let inserted = 0;
let updated = 0;
const problems = [];

for (const e of seed) {
  const excerpt = e.body ? excerptFrom(e.body) : null;

  if (!APPLY) {
    console.log(
      `  · ${e.slug.padEnd(46)} ${e.category.padEnd(13)} ` +
        `${(e.edition ?? "—").padEnd(10)} ${e.body ? `${e.body.length}c` : "no copy"}`,
    );
    continue;
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO events
         (slug, title, category, series, edition, start_date, body, body_format,
          copy_source, excerpt, published)
       VALUES ($1,$2,$3::event_category,$4,$5,$6,$7,$8,$9::copy_source,$10,false)
       ON CONFLICT (slug) DO UPDATE SET
         title       = EXCLUDED.title,
         category    = EXCLUDED.category,
         series      = EXCLUDED.series,
         edition     = EXCLUDED.edition,
         body        = EXCLUDED.body,
         copy_source = EXCLUDED.copy_source,
         excerpt     = EXCLUDED.excerpt,
         updated_at  = now()
       RETURNING (xmax <> 0) AS existed`,
      [
        e.slug,
        e.title,
        e.category,
        e.series,
        e.edition,
        e.startDate,
        e.body,
        e.bodyFormat,
        e.copySource,
        excerpt,
      ],
    );
    if (rows[0].existed) updated++;
    else inserted++;
  } catch (err) {
    problems.push(`${e.slug} — ${err.message.split("\n")[0]}`);
  }
}

console.log(`\n${"─".repeat(70)}`);
if (APPLY) {
  console.log(`${inserted} inserted, ${updated} updated, ${problems.length} failed.`);
  console.log(`Every one is unpublished. Publish them in the admin panel, under Events.`);
} else {
  console.log(`${seed.length} events would be loaded. Nothing was written.`);
}
for (const p of problems) console.log(`  ⚠ ${p}`);

await pool.end();
process.exit(problems.length ? 1 : 0);
