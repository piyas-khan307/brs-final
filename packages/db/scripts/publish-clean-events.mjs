#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════
 * PUBLISH THE ONES THAT READ AS AN ACCOUNT, HOLD THE ONES THAT READ AS
 * AN ADVERT.
 *
 *   node --env-file=.env packages/db/scripts/publish-clean-events.mjs           (dry run)
 *   node --env-file=.env packages/db/scripts/publish-clean-events.mjs --apply
 *   … --unpublish-all      put every event back into draft
 *
 * ── THE RULE ──
 * An event is published only if all three hold:
 *
 *   1. it has a body — a title and photographs alone is a gallery entry,
 *      not a post, and the feed is a feed of writing
 *   2. `_stillAnAdvert` is false — no "register now", no "will be held",
 *      nothing addressing the reader as a prospective attendee of an
 *      event that finished years ago
 *   3. it is not substantially Bangla — the site is English for now, and
 *      a half-translated page is worse than an unpublished one
 *
 * Everything else stays a draft with its copy intact, waiting for someone
 * to rewrite it. Nothing is deleted and nothing is rewritten here.
 *
 * ── WHY A SCRIPT AND NOT A HAND-PICKED LIST ──
 * The flags come from extract-events.mjs, so re-running the extraction
 * after someone rewrites an entry moves it into this set automatically.
 * A list of slugs typed out once would be stale by the first correction.
 *
 * `published_at` is set to now: it is when the write-up went public, not
 * when the event happened. An account of a 2016 workshop published today
 * is dated 2016 in the archive and appears at the top of the feed today.
 * ══════════════════════════════════════════════════════════════════════
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const APPLY = process.argv.includes("--apply");
const UNPUBLISH_ALL = process.argv.includes("--unpublish-all");

const seed = JSON.parse(readFileSync(join(ROOT, "content", "events.seed.json"), "utf8"));
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://brs:brs@localhost:5433/brs",
});

if (UNPUBLISH_ALL) {
  if (!APPLY) {
    console.log("Would unpublish every event. Pass --apply.");
    process.exit(0);
  }
  const { rowCount } = await pool.query(
    `UPDATE events SET published = false, published_at = NULL WHERE published`,
  );
  console.log(`${rowCount} events returned to draft.`);
  await pool.end();
  process.exit(0);
}

const clean = seed.filter((e) => e.body && !e._stillAnAdvert && e._banglaRatio <= 0.05);
const held = seed.filter((e) => !(e.body && !e._stillAnAdvert && e._banglaRatio <= 0.05));

console.log(APPLY ? "MODE: apply\n" : "MODE: dry run (pass --apply to write)\n");
console.log(`${clean.length} to publish · ${held.length} held back\n`);

console.log("HELD BACK");
for (const e of held) {
  const why = !e.body
    ? "no copy — photographs only"
    : e._stillAnAdvert
      ? "still written as an advertisement"
      : "substantially Bangla";
  console.log(`  · ${e.slug.padEnd(46)} ${why}`);
}

if (!APPLY) {
  await pool.end();
  process.exit(0);
}

const { rowCount } = await pool.query(
  `UPDATE events
      SET published = true, published_at = now(), updated_at = now()
    WHERE slug = ANY($1::text[]) AND NOT published`,
  [clean.map((e) => e.slug)],
);

/* And the other direction. The flags come from the extraction, so
   sharpening the advert detector — which is how "Mark the dates on your
   calendar" was caught on an already-published page — has to be able to
   pull an entry back off the site. A rule-driven script that can only
   ever publish is a rule that silently stops applying. */
const { rowCount: pulled } = await pool.query(
  `UPDATE events
      SET published = false, published_at = NULL, updated_at = now()
    WHERE slug = ANY($1::text[]) AND published`,
  [held.map((e) => e.slug)],
);

console.log(`\n${"─".repeat(70)}`);
console.log(`${rowCount} published, ${pulled} pulled back to draft. ${held.length} drafts in total.`);
console.log(`Undo everything with: --unpublish-all --apply`);

await pool.end();
