/**
 * ══════════════════════════════════════════════════════════════════════
 * ARCHIVE → BUCKET → `assets`.
 *
 * Pushes the derivatives currently sitting in apps/web/public into object
 * storage under content-addressed keys, and records each one in Postgres
 * as an `assets` row with its `asset_derivatives` beneath it.
 *
 *   pnpm --filter @brs/storage reconcile   # read-only: plan + drift
 *   pnpm --filter @brs/storage upload      # do it
 *
 * Both are idempotent. Content addressing means a second `upload` uploads
 * nothing and rewrites nothing; it is the normal way to check state.
 *
 * ── WHAT IS UPLOADED, AND WHAT IS NOT ──
 * Uploaded: the photographs in public/plates and public/showcase. These
 * are editorial content — an editor will add to them, caption them, and
 * unpublish them, and they must not live in git forever.
 *
 * NOT uploaded: public/sequence (240 rover animation frames) and
 * public/brand (the BRS mark). Those are build artefacts, not content.
 * They never change without a code change, they have no meaningful alt
 * text — `assets.alt` would have to describe 240 near-identical frames of
 * one render — and putting them in the bucket would drop 240 animation
 * frames into the editor's media library, where they are noise. They ship
 * with the static export, which is where a build artefact belongs.
 *
 * ── ONE ROW PER MANIFEST ENTRY, NOT ONE PER PHOTOGRAPH ──
 * 38 manifest entries resolve to 23 distinct photographs; thirteen appear
 * in more than one collection at different crops. They are stored as 38
 * rows anyway, because public/ holds DERIVATIVES and not masters — the
 * masters are in the gitignored BRS/ archive folders and have not been
 * ingested. A 320×320 square crop and a 640×480 crop of one photograph
 * are different bytes; pretending one is a resize of the other would be
 * false.
 *
 * The practical reason matters more: one row per manifest entry maps 1:1
 * onto what the components already consume, which is what lets Phase B4
 * swap the data source with zero component changes. When the real masters
 * are ingested these collapse to 23 rows with crops beneath them.
 *
 * ── PROVENANCE ──
 * `source_ref` carries `plates.CONTACT_SHEET#cs-01`, so every row can be
 * traced back to the manifest entry and the prepare script that made it.
 * ══════════════════════════════════════════════════════════════════════
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import { checksum, contentKey, fromEnv, type StorageAdapter } from "../src/index.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../../..");
const PUBLIC = path.join(REPO, "apps/web/public");
const LIB = path.join(REPO, "apps/web/src/lib");

const CHECK_ONLY = process.argv.includes("--check");

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://brs:brs@localhost:5433/brs";

/**
 * Ratios `assets_ratio_check` will accept, plus NULL.
 *
 * NULL is not a gap: since migration 0004 it means "intrinsic size, no
 * design frame" — a scan of a physical artefact reproduced as it exists.
 * The three press clippings are exactly that, and they are why the column
 * became nullable. Kept in sync with the CHECK so a mismatch is a named
 * skip here rather than a mid-transaction 23514.
 */
const ALLOWED_RATIOS = new Set(["1:1", "4:3", "3:2", "16:9", "4:5"]);

const MIME_BY_EXT: Record<string, string> = {
  ".avif": "image/avif",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

type Source = { w: number; url: string };
type Entry = {
  id: string;
  alt: string;
  width: number;
  height: number;
  ratio: string | null;
  lqip: string;
  avif: Source[];
  webp: Source[];
};

type Rendition = {
  /** Relative to apps/web/public, as it appears in the manifest. */
  url: string;
  absolutePath: string;
  width: number;
  format: "avif" | "webp";
  mime: string;
  bytes: Uint8Array;
  key: string;
  digest: string;
};

type Planned = {
  ref: string;
  entry: Entry;
  renditions: Rendition[];
  /** Largest AVIF. The row's storage_key, mime and checksum come from it. */
  canonical: Rendition;
};

/* ── Load the manifests ────────────────────────────────────────────── */

/**
 * The manifests are TypeScript. This script runs under tsx, so importing
 * them directly is possible and is far better than re-parsing the source:
 * if a prepare-*.mjs script changes shape, this breaks at import rather
 * than silently reading zero entries.
 */
async function loadCollections(): Promise<[string, Entry[]][]> {
  const out: [string, Entry[]][] = [];

  /** An export is a collection of assets if its values carry `alt`. */
  const isEntry = (v: unknown): v is Entry =>
    Boolean(v) && typeof v === "object" && "alt" in (v as object);

  for (const mod of ["plates.generated.ts", "showcase.generated.ts"]) {
    const ns: Record<string, unknown> = await import(path.join(LIB, mod));
    const prefix = mod.replace(".generated.ts", "");

    for (const [name, value] of Object.entries(ns)) {
      if (!value || typeof value !== "object") continue;

      // Arrays AND records. The first revision of this script checked only
      // Array.isArray, and FEATURES — a Record<FeatureId, PlateAsset> —
      // was silently skipped. Four of the landing page's most prominent
      // photographs, including the hero, never reached the bucket, and
      // nothing failed: the run reported "38 assets" and looked complete.
      // Shape-detecting the VALUES rather than the container is what makes
      // that impossible to repeat.
      const entries = Array.isArray(value) ? value : Object.values(value);
      if (entries.length > 0 && entries.every(isEntry)) {
        out.push([`${prefix}.${name}`, entries as Entry[]]);
      }
    }
  }

  // Deterministic order, so two runs produce identical logs and a diff of
  // the output is meaningful.
  return out.sort(([a], [b]) => (a < b ? -1 : 1));
}

/* ── Plan ──────────────────────────────────────────────────────────── */

const skipped: { ref: string; reason: string }[] = [];

async function plan(): Promise<Planned[]> {
  const planned: Planned[] = [];

  for (const [collection, entries] of await loadCollections()) {
    for (const entry of entries) {
      const ref = `${collection}#${entry.id}`;

      // Checked before any I/O: a row that Postgres will refuse should be
      // reported by name, not discovered as a constraint violation twelve
      // uploads later. A null ratio is now legal and meaningful (0004);
      // only an unlisted non-null value is a problem.
      if (entry.ratio !== null && !ALLOWED_RATIOS.has(entry.ratio)) {
        skipped.push({ ref, reason: `ratio ${entry.ratio} is not in assets_ratio_check` });
        continue;
      }

      const renditions: Rendition[] = [];
      for (const [format, list] of [
        ["avif", entry.avif],
        ["webp", entry.webp],
      ] as const) {
        for (const src of list) {
          const absolutePath = path.join(PUBLIC, src.url.replace(/^\//, ""));
          const ext = path.extname(absolutePath).toLowerCase();
          const mime = MIME_BY_EXT[ext];
          if (!mime) throw new Error(`No MIME mapping for ${ext} (${src.url})`);

          const bytes = new Uint8Array(await readFile(absolutePath));
          renditions.push({
            url: src.url,
            absolutePath,
            width: src.w,
            format,
            mime,
            bytes,
            key: contentKey(bytes, mime),
            digest: checksum(bytes),
          });
        }
      }

      const avifs = renditions.filter((r) => r.format === "avif");
      const canonical = avifs.reduce((a, b) => (b.width > a.width ? b : a));

      planned.push({ ref, entry, renditions, canonical });
    }
  }

  return planned;
}

/* ── Upload ────────────────────────────────────────────────────────── */

async function upload(store: StorageAdapter, planned: Planned[]) {
  let uploaded = 0;
  let deduped = 0;
  let bytesSent = 0;

  // Every distinct key across every entry. Two entries CAN share a key if
  // two manifest rows point at the same file; the Map collapses that so
  // the same object is not put twice in one run.
  const byKey = new Map<string, Rendition>();
  for (const p of planned) for (const r of p.renditions) byKey.set(r.key, r);

  for (const r of byKey.values()) {
    const res = await store.put({
      key: r.key,
      body: r.bytes,
      contentType: r.mime,
      // Provenance a human can read in a bucket console. Postgres remains
      // the source of truth; this is a breadcrumb, not a record.
      metadata: { origin: path.basename(r.url), width: String(r.width) },
    });
    if (res.deduplicated) {
      deduped++;
    } else {
      uploaded++;
      bytesSent += r.bytes.byteLength;
    }
  }

  return { uploaded, deduped, bytesSent, objects: byKey.size };
}

/* ── Record ────────────────────────────────────────────────────────── */

async function record(client: pg.Client, store: StorageAdapter, planned: Planned[]) {
  let assets = 0;
  let derivatives = 0;

  // One transaction for the whole run. A partial load — some assets with
  // derivatives, some without — is worse than no load, because it looks
  // complete to anything that only counts `assets`.
  await client.query("BEGIN");
  try {
    for (const p of planned) {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO assets
           (storage_key, provider, mime, width, height, alt, lqip, ratio,
            source, source_ref, checksum, published)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'upload',$9,$10,true)
         ON CONFLICT (checksum) DO UPDATE SET
           storage_key = EXCLUDED.storage_key,
           provider    = EXCLUDED.provider,
           mime        = EXCLUDED.mime,
           width       = EXCLUDED.width,
           height      = EXCLUDED.height,
           alt         = EXCLUDED.alt,
           lqip        = EXCLUDED.lqip,
           ratio       = EXCLUDED.ratio,
           source_ref  = EXCLUDED.source_ref
         RETURNING id`,
        [
          p.canonical.key,
          // Explicit, not the column default. The default is 'r2', which
          // encodes a provider decision §16.13 has not made; every row
          // written with it would be a small lie if the club picks AWS.
          store.name,
          p.canonical.mime,
          p.entry.width,
          p.entry.height,
          p.entry.alt,
          p.entry.lqip,
          p.entry.ratio,
          p.ref,
          p.canonical.digest,
        ],
      );
      const assetId = rows[0]!.id;
      assets++;

      for (const r of p.renditions) {
        await client.query(
          `INSERT INTO asset_derivatives (asset_id, width, format, storage_key, bytes)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (asset_id, width, format) DO UPDATE SET
             storage_key = EXCLUDED.storage_key,
             bytes       = EXCLUDED.bytes`,
          [assetId, r.width, r.format, r.key, r.bytes.byteLength],
        );
        derivatives++;
      }
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }

  return { assets, derivatives };
}

/* ── Reconcile ─────────────────────────────────────────────────────── */

/** Does every storage_key Postgres knows about actually exist in the
 *  bucket? A row pointing at a missing object is a broken image on the
 *  live site, and it is invisible until someone loads that page. */
async function reconcile(client: pg.Client, store: StorageAdapter) {
  const { rows } = await client.query<{ storage_key: string; src: string }>(
    `SELECT storage_key, 'assets' AS src FROM assets
     UNION ALL
     SELECT storage_key, 'asset_derivatives' FROM asset_derivatives`,
  );

  const inBucket = new Set<string>();
  for await (const o of store.list("sha256/")) inBucket.add(o.key);

  const missing = rows.filter((r) => !inBucket.has(r.storage_key));
  const referenced = new Set(rows.map((r) => r.storage_key));
  const orphans = [...inBucket].filter((k) => !referenced.has(k));

  return { rows: rows.length, inBucket: inBucket.size, missing, orphans };
}

/* ── Main ──────────────────────────────────────────────────────────── */

const store = fromEnv();
const client = new pg.Client({ connectionString: DATABASE_URL });

try {
  await client.connect();
} catch (e) {
  console.error(`\n  Cannot reach Postgres at ${DATABASE_URL}`);
  console.error(`  ${(e as Error).message}`);
  console.error(`\n  Start it with:  docker compose up -d postgres\n`);
  process.exit(1);
}

console.log(`\n  storage   ${store.name} → ${store.bucket}`);
console.log(`  public    ${store.publicUrl("sha256/…")}`);
console.log(`  database  ${DATABASE_URL.replace(/:[^:@/]*@/, ":****@")}`);
console.log(`  mode      ${CHECK_ONLY ? "check (no writes)" : "upload"}\n`);

const planned = await plan();
const fileCount = planned.reduce((n, p) => n + p.renditions.length, 0);
const totalBytes = planned.reduce(
  (n, p) => n + p.renditions.reduce((m, r) => m + r.bytes.byteLength, 0),
  0,
);

console.log(
  `  planned   ${planned.length} assets · ${fileCount} renditions · ${mb(totalBytes)}`,
);

if (skipped.length) {
  console.log(`\n  SKIPPED ${skipped.length} — not loadable as written:`);
  for (const s of skipped) console.log(`    ${s.ref.padEnd(30)} ${s.reason}`);
}

if (CHECK_ONLY) {
  const r = await reconcile(client, store);
  console.log(`\n  reconcile  ${r.rows} keys referenced · ${r.inBucket} objects in bucket`);
  if (r.missing.length) {
    console.log(`\n  ${r.missing.length} REFERENCED BUT MISSING FROM BUCKET:`);
    for (const m of r.missing.slice(0, 20)) console.log(`    ${m.src.padEnd(18)} ${m.storage_key}`);
  }
  if (r.orphans.length) {
    console.log(`\n  ${r.orphans.length} in bucket with no row (safe, but unreferenced):`);
    for (const o of r.orphans.slice(0, 10)) console.log(`    ${o}`);
  }
  console.log("");
  await client.end();
  (store as { destroy?: () => void }).destroy?.();
  process.exit(r.missing.length ? 1 : 0);
}

const up = await upload(store, planned);
console.log(
  `\n  uploaded  ${up.uploaded} new · ${up.deduped} already present · ${mb(up.bytesSent)} transferred`,
);

const rec = await record(client, store, planned);
console.log(`  recorded  ${rec.assets} assets · ${rec.derivatives} derivatives`);

const r = await reconcile(client, store);
console.log(`  verified  ${r.rows} keys referenced · ${r.missing.length} missing\n`);

await client.end();
(store as { destroy?: () => void }).destroy?.();

if (r.missing.length) {
  console.error(`  ${r.missing.length} rows point at objects that are not in the bucket.\n`);
  process.exit(1);
}

console.log(
  skipped.length
    ? `  Done, with ${skipped.length} entries skipped — see above.\n`
    : `  Done.\n`,
);

function mb(n: number): string {
  return n < 1024 * 1024
    ? `${(n / 1024).toFixed(1)} KB`
    : `${(n / 1024 / 1024).toFixed(2)} MB`;
}
