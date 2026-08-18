#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════
 * PUT THE WHOLE POSTER BACK.
 *
 *   node --env-file=.env packages/db/scripts/reingest-full-posters.mjs
 *   node --env-file=.env packages/db/scripts/reingest-full-posters.mjs --apply
 *
 * It lives beside seed-committee.ts because that is the workspace with
 * `pg` installed — Node resolves imports from the file, not the cwd.
 *
 * ── WHAT WAS WRONG ──
 * Nothing on the website crops anything. The committee page has used
 * `object-fit: contain` since it was built, and the upload pipeline only
 * ever resizes — it has no crop step at all. The photographs were
 * arriving cropped because they were STORED cropped.
 *
 * packages/db/scripts/seed-committee.ts cut a 930×895 rectangle out of
 * each 1500×1800 announcement poster and ingested only that. The
 * reasoning at the time is in that file and it was not unreasonable: a
 * page of 84 identical poster frames, each with the person occupying
 * about 30% of it, is a page about a poster template rather than about
 * people.
 *
 * The club has since asked for the opposite, twice, and explicitly:
 * "I need to show full image", "nothing should be cropped". The poster
 * is what the club actually published, and it is theirs to publish.
 *
 * ── WHAT THIS DOES ──
 * For every member of the 11th Executive Committee whose portrait came
 * from a poster, it ingests the FULL poster through the real ingest
 * service — same alt text, same category — and re-points the member at
 * the new asset.
 *
 * ── WHAT IT DOES NOT DO ──
 * It does not delete the cropped assets. They stay in the database and
 * in the bucket, unreferenced, which makes this reversible: the mapping
 * printed below is enough to point every member back. Cleaning them up
 * is a separate, deliberate act.
 *
 * It does not touch members with no portrait on file. Two posters were
 * published with an empty frame; loading those posters would replace
 * "no photograph" with a picture of an empty frame, which is a worse
 * answer, not a better one.
 * ══════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

/** `source_ref` is recorded relative to the repository root. */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const onDisk = (ref) => join(ROOT, ref);

const APPLY = process.argv.includes("--apply");
const ORDINAL = 11;

const INGEST_URL = process.env.INGEST_URL ?? "http://localhost:8790";
const INGEST_TOKEN = process.env.INGEST_TOKEN;
if (!INGEST_TOKEN) {
  console.error("INGEST_TOKEN is not set. Run with: node --env-file=.env ...");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://brs:brs@localhost:5433/brs",
});

const health = await fetch(`${INGEST_URL}/health`).then((r) => r.json());
if (!health.ok) {
  console.error(`Ingest service is not healthy: ${JSON.stringify(health)}`);
  process.exit(1);
}
console.log(`ingest: ${health.storage} → ${health.bucket}`);
console.log(APPLY ? "MODE: apply\n" : "MODE: dry run (pass --apply to write)\n");

const { rows } = await pool.query(
  `SELECT m.id AS member_id, m.name, a.id AS old_asset_id,
          a.source_ref, a.alt, a.width, a.height, a.credit
     FROM members m
     JOIN memberships ms ON ms.member_id = m.id
     JOIN committees c   ON c.id = ms.committee_id AND c.ordinal = $1
     JOIN assets a       ON a.id = m.portrait_asset_id
    WHERE a.source_ref LIKE 'BRS 11th ExCom Post/%'
    ORDER BY ms.sort_order, m.name`,
  [ORDINAL],
);

console.log(`${rows.length} members currently show a crop of their poster.\n`);

let done = 0;
let skipped = 0;
const failures = [];

for (const r of rows) {
  const file = r.source_ref;
  const path = onDisk(file);
  if (!existsSync(path)) {
    console.log(`  ✗ ${r.name.padEnd(32)} poster missing on disk: ${file}`);
    failures.push(`${r.name} — ${file} not found`);
    continue;
  }

  if (!APPLY) {
    console.log(
      `  · ${r.name.padEnd(32)} ${String(r.width).padStart(4)}×${r.height} → full poster`,
    );
    skipped++;
    continue;
  }

  const bytes = readFileSync(path);
  const form = new FormData();
  form.set("file", new Blob([bytes], { type: "image/jpeg" }), file.split("/").pop());
  // Same description as the crop carried. It describes the person and
  // their office, both of which are still true of the whole poster.
  form.set("alt", r.alt);
  form.set("category", "portrait");
  form.set("published", "true");
  form.set("sourceRef", file);
  if (r.credit) form.set("credit", r.credit);

  const res = await fetch(`${INGEST_URL}/ingest`, {
    method: "POST",
    headers: { "x-ingest-token": INGEST_TOKEN },
    body: form,
  });
  const body = await res.json();
  if (!res.ok || !body.assetId) {
    console.log(`  ✗ ${r.name.padEnd(32)} ${body.error ?? res.status}`);
    failures.push(`${r.name} — ${body.error ?? res.status}`);
    continue;
  }

  await pool.query(`UPDATE members SET portrait_asset_id = $2 WHERE id = $1`, [
    r.member_id,
    body.assetId,
  ]);

  console.log(
    `  ✓ ${r.name.padEnd(32)} ${String(body.width).padStart(4)}×${body.height}` +
      `  ${body.derivatives} derivatives   (was ${r.old_asset_id})`,
  );
  done++;
}

console.log(`\n${"─".repeat(70)}`);
if (APPLY) {
  console.log(`${done} re-pointed, ${failures.length} failed.`);
  console.log(
    `The cropped assets are still in the database, unreferenced. Nothing\n` +
      `was deleted, so this is reversible.`,
  );
} else {
  console.log(`${skipped} would be re-ingested. Nothing was written.`);
}
for (const f of failures) console.log(`  ⚠ ${f}`);

await pool.end();
process.exit(failures.length ? 1 : 0);
