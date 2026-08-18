#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════
 * THE ARCHIVE'S PHOTOGRAPHS, THROUGH THE REAL PIPELINE.
 *
 *   node --env-file=.env packages/db/scripts/load-event-photos.mjs           (dry run)
 *   node --env-file=.env packages/db/scripts/load-event-photos.mjs --apply
 *   … --apply --only robo-carnivals-2024        one event
 *
 * Reads the folder each event came from, uploads every photograph through
 * @brs/ingest, and links them with event_assets. The first photograph of
 * each event becomes its cover.
 *
 * Re-runnable. Ingest de-duplicates on checksum and the link table has a
 * UNIQUE (event_id, asset_id, role), so a second run over the same folder
 * writes nothing new.
 *
 * ── THIS IS SLOW AND IS MEANT TO BE ──
 * Around 500 photographs, each producing ten renditions. It is the same
 * path an editor's drag-and-drop takes: EXIF orientation applied and then
 * stripped, GPS coordinates discarded, five widths in two formats, a blur
 * placeholder, content-addressed keys. Run it in the background.
 *
 * ── ON THE ALT TEXT ──
 * Honest but not good. Nothing here has looked at these photographs, so
 * the description says which event they are from and nothing about what
 * they show. That is the most a script can truthfully assert, and it is
 * better than an invented description of an image nobody has seen — but
 * it is NOT accessible alt text, and every one of these should be
 * rewritten by someone who can see the picture. They are editable in the
 * admin panel under Photographs.
 * ══════════════════════════════════════════════════════════════════════
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const APPLY = process.argv.includes("--apply");
// `indexOf` returns -1 when the flag is absent, and argv[0] is the node
// binary — a truthy string that matches no slug, so every event would be
// silently filtered out. Guard the lookup rather than the result.
const onlyAt = process.argv.indexOf("--only");
const ONLY = onlyAt === -1 ? null : process.argv[onlyAt + 1];

const INGEST_URL = process.env.INGEST_URL ?? "http://localhost:8790";
const INGEST_TOKEN = process.env.INGEST_TOKEN;
if (!INGEST_TOKEN) {
  console.error("INGEST_TOKEN is not set. Run with: node --env-file=.env ...");
  process.exit(1);
}

const IMAGE = /\.(jpe?g|png|heic|webp|avif)$/i;
const MIME = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  heic: "image/heic", webp: "image/webp", avif: "image/avif",
};

const seed = JSON.parse(readFileSync(join(ROOT, "content", "events.seed.json"), "utf8"));
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://brs:brs@localhost:5433/brs",
});

const health = await fetch(`${INGEST_URL}/health`).then((r) => r.json()).catch(() => null);
if (!health?.ok) {
  console.error(`Ingest is not reachable at ${INGEST_URL}. Start it with: pnpm dev`);
  process.exit(1);
}

function photosIn(dir) {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (IMAGE.test(p)) out.push(p);
    }
  };
  walk(dir);
  // Filenames in this archive are timestamps and camera counters, so
  // sorting by name is sorting by when the picture was taken.
  return out.sort();
}

const targets = seed.filter((e) => (ONLY ? e.slug === ONLY : true) && e._photos > 0);
console.log(
  `${targets.length} events with photographs · ` +
    `${targets.reduce((n, e) => n + e._photos, 0)} files total`,
);
console.log(APPLY ? "MODE: apply\n" : "MODE: dry run (pass --apply to write)\n");

let uploaded = 0;
let linked = 0;
const failures = [];

for (const e of targets) {
  const dir = join(ROOT, e._dir);
  if (!existsSync(dir)) {
    failures.push(`${e.slug} — folder missing: ${e._dir}`);
    continue;
  }

  const { rows: found } = await pool.query(`SELECT id FROM events WHERE slug = $1`, [e.slug]);
  const eventId = found[0]?.id;
  if (!eventId) {
    failures.push(`${e.slug} — not in the database; run load-events.mjs first`);
    continue;
  }

  const files = photosIn(dir);
  if (!APPLY) {
    console.log(`  · ${e.slug.padEnd(46)} ${String(files.length).padStart(3)} photographs`);
    continue;
  }

  let n = 0;
  for (const [i, file] of files.entries()) {
    const ext = file.split(".").pop().toLowerCase();
    const form = new FormData();
    form.set("file", new Blob([readFileSync(file)], { type: MIME[ext] ?? "image/jpeg" }),
      file.split("/").pop());
    // See the note at the top: provenance, not description.
    form.set("alt", `${e.title} — BUET Robotics Society archive`);
    form.set("category", "archive");
    form.set("published", "true");
    form.set("sourceRef", file.replace(`${ROOT}/`, ""));

    const res = await fetch(`${INGEST_URL}/ingest`, {
      method: "POST",
      headers: { "x-ingest-token": INGEST_TOKEN },
      body: form,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.assetId) {
      failures.push(`${e.slug} · ${file.split("/").pop()} — ${body.error ?? res.status}`);
      continue;
    }
    uploaded++;

    /* The first photograph of a folder becomes the cover, and the cover is
       `events.cover_asset_id` — not an `event_assets` row with a special
       role. Migration 0013 retired that role precisely because this script
       used to write the same fact in both places, and was the only thing
       keeping them in agreement. `COALESCE` so a cover chosen by hand in
       the admin panel survives a re-run of the ingest. */
    if (i === 0) {
      await pool.query(
        `UPDATE events SET cover_asset_id = COALESCE(cover_asset_id, $2) WHERE id = $1`,
        [eventId, body.assetId],
      );
    } else {
      await pool.query(
        `INSERT INTO event_assets (event_id, asset_id, role, sort_order)
         VALUES ($1,$2,'gallery',$3)
         ON CONFLICT (event_id, asset_id, role) DO UPDATE SET sort_order = EXCLUDED.sort_order`,
        [eventId, body.assetId, i],
      );
    }
    linked++;
    n++;
  }
  console.log(`  ✓ ${e.slug.padEnd(46)} ${String(n).padStart(3)} photographs`);
}

console.log(`\n${"─".repeat(70)}`);
if (APPLY) console.log(`${uploaded} uploaded, ${linked} linked, ${failures.length} failed.`);
else console.log(`Nothing was written.`);
for (const f of failures.slice(0, 40)) console.log(`  ⚠ ${f}`);
if (failures.length > 40) console.log(`  … and ${failures.length - 40} more`);

await pool.end();
process.exit(0);
