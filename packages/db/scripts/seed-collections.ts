/**
 * ══════════════════════════════════════════════════════════════════════
 * SEED THE EDITORIAL LAYER.
 *
 * Moves the curation out of the generated frontend modules and into
 * `collections` / `collection_items`, where an editor can reach it.
 *
 *   pnpm --filter @brs/db seed:collections
 *   pnpm --filter @brs/db seed:collections --check    # read-only
 *
 * ── WHAT "CURATION" MEANS HERE ──
 * Phase B2 put the photographs in Postgres. It did not move the part that
 * actually changes: which photograph appears in which section, in what
 * order, with what placard text and which plate number. All of that was
 * hand-written inside plates.generated.ts and showcase.generated.ts —
 * files headed "GENERATED — do not edit by hand". So the landing page
 * could only be rearranged by a developer editing a generated file and
 * redeploying, which is the exact thing a CMS exists to prevent.
 *
 * This is a ONE-TIME migration of that data. After it runs, the generated
 * modules are rebuilt FROM the database, and this script's input becomes
 * historical.
 *
 * ── WHY PRESS CLIPPINGS ARE A COLLECTION AND NOT `press` ROWS ──
 * There is a `press` table, and it is the right long-term home. It is not
 * used yet because `press.published_on` is a DATE and the archive records
 * only a YEAR — 2014, 2015, 2015. Writing 2014-01-01 would invent a day
 * and a month that nobody knows, and a fabricated date in a press archive
 * is the §8 failure this project keeps refusing. `collection_items.year`
 * is an integer, which is exactly the precision the evidence supports.
 *
 * When somebody reads the actual publication dates off the clippings,
 * these three move to `press` and gain a headline.
 * ══════════════════════════════════════════════════════════════════════
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIB = path.resolve(HERE, "../../../apps/web/src/lib");

const CHECK_ONLY = process.argv.includes("--check");
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://brs:brs@localhost:5433/brs";

type Entry = {
  id: string;
  alt: string;
  plate?: number | null;
  caption?: string | string[];
  title?: string;
  outlet?: string;
  year?: number;
  note?: string;
};

/**
 * The six sections of the approved landing page.
 *
 * `source` is the export these came from, and it is also the prefix of
 * `assets.source_ref` written by the B2 upload — which is how each item
 * finds its asset row without matching on alt text or filename.
 */
const COLLECTIONS: {
  slug: string;
  label: string;
  note?: string;
  source: string;
  sortOrder: number;
}[] = [
  { slug: "features", label: "Featured plates", source: "plates.FEATURES", sortOrder: 1,
    note: "The four plates carrying the opening argument." },
  { slug: "key-facts", label: "The record", source: "showcase.KEYFACTS", sortOrder: 2 },
  { slug: "gallery", label: "Gallery", source: "showcase.GALLERY", sortOrder: 3 },
  { slug: "assembly", label: "Assembly", source: "showcase.ASSEMBLY", sortOrder: 4 },
  { slug: "contact-sheet", label: "Contact sheet", source: "plates.CONTACT_SHEET", sortOrder: 5 },
  { slug: "press", label: "Press coverage", source: "plates.PRESS", sortOrder: 6,
    note: "Year only — the clippings' exact publication dates are not recorded." },
];

/** Load the manifests and index every entry by its `source_ref`. */
async function loadEntries(): Promise<Map<string, Entry[]>> {
  const bySource = new Map<string, Entry[]>();

  const isEntry = (v: unknown): v is Entry =>
    Boolean(v) && typeof v === "object" && "alt" in (v as object);

  for (const mod of ["plates.generated.ts", "showcase.generated.ts"]) {
    const ns: Record<string, unknown> = await import(path.join(LIB, mod));
    const prefix = mod.replace(".generated.ts", "");
    for (const [name, value] of Object.entries(ns)) {
      if (!value || typeof value !== "object") continue;
      // Records preserve insertion order for string keys, so FEATURES
      // keeps the order it was authored in.
      const entries = Array.isArray(value) ? value : Object.values(value);
      if (entries.length > 0 && entries.every(isEntry)) {
        bySource.set(`${prefix}.${name}`, entries as Entry[]);
      }
    }
  }
  return bySource;
}

/** Placard lines. PlateAsset carries an array; ShowcaseAsset a single
 *  string. Normalised to an array here so the database holds one shape. */
function captionLines(c: Entry["caption"]): string[] {
  if (!c) return [];
  return Array.isArray(c) ? c : [c];
}

const client = new pg.Client({ connectionString: DATABASE_URL });

try {
  await client.connect();
} catch (e) {
  console.error(`\n  Cannot reach Postgres at ${DATABASE_URL}`);
  console.error(`  ${(e as Error).message}\n`);
  process.exit(1);
}

const entriesBySource = await loadEntries();

/* Map every source_ref in the database to its asset id, in one query. */
const { rows: assetRows } = await client.query<{ id: string; source_ref: string }>(
  `SELECT id, source_ref FROM assets WHERE source_ref IS NOT NULL`,
);
const assetByRef = new Map(assetRows.map((r) => [r.source_ref, r.id]));

console.log(`\n  database  ${DATABASE_URL.replace(/:[^:@/]*@/, ":****@")}`);
console.log(`  mode      ${CHECK_ONLY ? "check (no writes)" : "seed"}`);
console.log(`  assets    ${assetByRef.size} with a source_ref\n`);

const missing: string[] = [];
let items = 0;

if (!CHECK_ONLY) await client.query("BEGIN");

try {
  for (const col of COLLECTIONS) {
    const entries = entriesBySource.get(col.source) ?? [];
    if (entries.length === 0) {
      console.log(`  ${col.slug.padEnd(14)} SKIPPED — no entries found for ${col.source}`);
      continue;
    }

    let collectionId = "";
    if (!CHECK_ONLY) {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO collections (slug, label, note, sort_order)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (slug) DO UPDATE SET
           label = EXCLUDED.label,
           note  = EXCLUDED.note,
           sort_order = EXCLUDED.sort_order,
           updated_at = now()
         RETURNING id`,
        [col.slug, col.label, col.note ?? null, col.sortOrder],
      );
      collectionId = rows[0]!.id;
    }

    let placed = 0;
    for (const [i, entry] of entries.entries()) {
      const ref = `${col.source}#${entry.id}`;
      const assetId = assetByRef.get(ref);
      if (!assetId) {
        missing.push(ref);
        continue;
      }

      if (!CHECK_ONLY) {
        await client.query(
          `INSERT INTO collection_items
             (collection_id, asset_id, key, sort_order, plate_no, caption, title, year, note)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (collection_id, asset_id) DO UPDATE SET
             key        = EXCLUDED.key,
             sort_order = EXCLUDED.sort_order,
             plate_no   = EXCLUDED.plate_no,
             caption    = EXCLUDED.caption,
             title      = EXCLUDED.title,
             year       = EXCLUDED.year,
             note       = EXCLUDED.note`,
          [
            collectionId,
            assetId,
            // The authored handle — 'hero-rc19', 'cs-01'. Pages reference
            // items by this, so it must survive reordering (0005).
            entry.id,
            i,
            entry.plate ?? null,
            captionLines(entry.caption),
            // `outlet` is the press clippings' equivalent of a title —
            // PROTHOM ALO is who published it, which is the only naming
            // the archive has for these.
            entry.title ?? entry.outlet ?? null,
            entry.year ?? null,
            entry.note ?? null,
          ],
        );
      }
      placed++;
      items++;
    }

    console.log(`  ${col.slug.padEnd(14)} ${String(placed).padStart(2)} items  (${col.source})`);
  }

  if (!CHECK_ONLY) await client.query("COMMIT");
} catch (e) {
  if (!CHECK_ONLY) await client.query("ROLLBACK");
  throw e;
}

if (missing.length) {
  console.error(`\n  ${missing.length} ENTRIES HAVE NO ASSET ROW:`);
  for (const m of missing) console.error(`    ${m}`);
  console.error(`\n  Run the upload first:  pnpm --filter @brs/storage upload\n`);
  await client.end();
  process.exit(1);
}

console.log(`\n  ${items} items across ${COLLECTIONS.length} collections.\n`);
await client.end();
