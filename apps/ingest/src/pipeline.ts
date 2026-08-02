/**
 * ══════════════════════════════════════════════════════════════════════
 * THE UPLOAD PIPELINE.
 *
 * One photograph in, a complete `assets` row plus its derivatives out.
 * This is the whole of "Option A" — an editor drags in an 8 MB phone
 * photo and never thinks about sizes, formats, or filenames again.
 *
 *   original bytes
 *     → auto-rotate from EXIF, then STRIP all metadata
 *     → 5 widths × 2 formats, never upscaled
 *     → blur placeholder
 *     → content-addressed keys, uploaded
 *     → assets + asset_derivatives rows, in one transaction
 *
 * ── WHY THIS SERVICE EXISTS SEPARATELY FROM THE API ──
 * It holds the storage write credentials. The public façade does not, and
 * must not: it imports @brs/storage/url, which has no S3 client in it at
 * all, so "the public API cannot write to the bucket" is true by
 * construction rather than by review. This service is reachable only from
 * inside the network.
 * ══════════════════════════════════════════════════════════════════════
 */

import sharp from "sharp";
import pg from "pg";
import { contentKey, checksum, type StorageAdapter } from "@brs/storage";

/**
 * Derivative ladder. Capped at the source width — a 900px original never
 * produces a fake 1600px file, which would be bytes spent to make an
 * image blurrier.
 */
const WIDTHS = [320, 640, 960, 1280, 1600] as const;

/** Ratios `assets_ratio_check` accepts, as numbers. */
const RATIOS: [string, number][] = [
  ["1:1", 1], ["4:3", 4 / 3], ["3:2", 1.5], ["16:9", 16 / 9], ["4:5", 0.8],
];

/**
 * Snap to a design ratio only when the image genuinely IS that shape.
 *
 * 1.5% tolerance: enough to absorb a one-pixel rounding difference,
 * nowhere near enough to call a 3:4 portrait "4:5". Anything outside it
 * gets NULL, which since migration 0004 is a real statement — "intrinsic
 * size, no design frame" — and not a gap. Guessing here would silently
 * mislabel the shape of a photograph nobody has looked at.
 */
export function detectRatio(width: number, height: number): string | null {
  const actual = width / height;
  for (const [name, value] of RATIOS) {
    if (Math.abs(actual - value) / value <= 0.015) return name;
  }
  return null;
}

export type IngestInput = {
  bytes: Uint8Array;
  alt: string;
  credit?: string;
  /** Provenance, e.g. "11th-excom-poster#1.jpg". */
  sourceRef?: string;
  source?: "upload" | "sharepoint" | "drive" | "archive";
  published?: boolean;
};

export type IngestResult = {
  assetId: string;
  width: number;
  height: number;
  ratio: string | null;
  derivatives: number;
  bytesStored: number;
  deduplicated: boolean;
};

export class IngestError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "IngestError";
  }
}

export async function ingest(
  input: IngestInput,
  store: StorageAdapter,
  client: pg.PoolClient | pg.Client,
): Promise<IngestResult> {
  /* ── 1. Read and normalise ─────────────────────────────────────────
   *
   * `.rotate()` with no argument applies the EXIF orientation flag and
   * then discards it. Without it, a photo taken in portrait on a phone
   * arrives sideways in every browser that honours the flag and upright
   * in every one that does not.
   *
   * sharp drops all other metadata by default, and that default is doing
   * real work here: phone photos carry GPS coordinates. Publishing a
   * committee portrait tagged with the exact building it was taken in is
   * a privacy leak nobody would think to look for (§12.1). Do NOT add
   * .withMetadata() to "preserve quality" — it preserves location too.
   */
  const base = sharp(input.bytes, { failOn: "error" }).rotate();

  let meta;
  try {
    meta = await base.metadata();
  } catch (e) {
    throw new IngestError(`Not a readable image: ${(e as Error).message}`);
  }

  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) throw new IngestError("Image has no readable dimensions");
  if (width < 320) {
    throw new IngestError(
      `Image is only ${width}px wide. The smallest derivative is 320px, so this ` +
        `would be upscaled on every screen. Upload a larger original.`,
    );
  }

  const ratio = detectRatio(width, height);

  /* ── 2. Derivatives ────────────────────────────────────────────────
   *
   * Every width is produced from the ORIGINAL, never from a smaller
   * derivative. Resizing a resize compounds softening, and it is the kind
   * of quality loss that is invisible in review and obvious on a big
   * screen a year later.
   */
  const ladder: number[] = WIDTHS.filter((w) => w <= width);

  /**
   * Keep the source's own width as the top rung when it falls between two
   * ladder steps.
   *
   * Without this, a 926px original — which is exactly what the 11th ExCom
   * portraits crop to — produces 320 and 640 and nothing else, quietly
   * throwing away a third of the resolution the club actually has. The
   * cost of keeping it is one more encode; the cost of losing it is
   * re-cropping 84 posters when someone notices the committee page is
   * soft on a laptop screen.
   *
   * Capped at the largest ladder step, so a 6000px DSLR original does not
   * become a 6000px AVIF nobody will ever display.
   */
  const largest = WIDTHS[WIDTHS.length - 1]!;
  if (width < largest && !ladder.includes(width)) ladder.push(width);
  if (ladder.length === 0) ladder.push(width);

  type Rendition = { format: "avif" | "webp"; width: number; body: Uint8Array; mime: string };

  /**
   * Every width and format encoded CONCURRENTLY.
   *
   * The first version did one width at a time and took 11.8 s on a real
   * 1500x1800 poster — AVIF encoding dominates, and it was leaving most
   * of the machine idle. libvips releases the event loop during encode,
   * so these genuinely run in parallel across cores.
   *
   * That is the difference between an editor waiting and an editor
   * wondering whether the thing has crashed.
   */
  const renditions: Rendition[] = await Promise.all(
    ladder.flatMap((w) => [
      sharp(input.bytes, { failOn: "error" })
        .rotate()
        .resize({ width: w, withoutEnlargement: true })
        .avif({ quality: 55, effort: 4 })
        .toBuffer()
        .then((body): Rendition => ({
          format: "avif", width: w, body: new Uint8Array(body), mime: "image/avif",
        })),
      sharp(input.bytes, { failOn: "error" })
        .rotate()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer()
        .then((body): Rendition => ({
          format: "webp", width: w, body: new Uint8Array(body), mime: "image/webp",
        })),
    ]),
  );

  /* ── 3. Blur placeholder ───────────────────────────────────────────
   *
   * 20px wide, inlined as a data URI. It ships inside the HTML, so it has
   * to stay tiny — this lands around 300–600 bytes and is what stops the
   * page reflowing while photographs load.
   */
  const lqipBuf = await sharp(input.bytes, { failOn: "error" })
    .rotate()
    .resize({ width: 20 })
    .webp({ quality: 20 })
    .toBuffer();
  const lqip = `data:image/webp;base64,${lqipBuf.toString("base64")}`;

  /* ── 4. Canonical rendition ────────────────────────────────────────
   *
   * The largest AVIF. Its checksum becomes the asset's checksum, which is
   * what `assets_checksum_unique` de-duplicates on — so re-uploading the
   * same photograph is caught here rather than producing a second row.
   */
  const canonical = renditions
    .filter((r) => r.format === "avif")
    .reduce((a, b) => (b.width > a.width ? b : a));
  const digest = checksum(canonical.body);

  /* ── 5. Store ──────────────────────────────────────────────────────
   *
   * Bytes go to the bucket BEFORE the row is written. If this fails the
   * transaction never opens and nothing is recorded; the reverse order
   * would leave a row pointing at an object that does not exist, which is
   * a broken image nobody discovers until someone loads that page.
   */
  let bytesStored = 0;
  const stored = new Map<Rendition, string>();
  for (const r of renditions) {
    const key = contentKey(r.body, r.mime);
    const res = await store.put({
      key,
      body: r.body,
      contentType: r.mime,
      metadata: { width: String(r.width), format: r.format },
    });
    if (!res.deduplicated) bytesStored += r.body.byteLength;
    stored.set(r, key);
  }

  /* ── 6. Record ─────────────────────────────────────────────────────── */
  await client.query("BEGIN");
  try {
    const { rows } = await client.query<{ id: string; existed: boolean }>(
      `INSERT INTO assets
         (storage_key, provider, mime, width, height, alt, lqip, ratio,
          source, source_ref, checksum, published, credit)
       VALUES ($1,$2,'image/avif',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (checksum) DO UPDATE SET
         alt = EXCLUDED.alt,
         credit = EXCLUDED.credit,
         published = EXCLUDED.published
       RETURNING id, (xmax <> 0) AS existed`,
      [
        stored.get(canonical),
        store.name,
        width,
        height,
        input.alt,
        lqip,
        ratio,
        input.source ?? "upload",
        input.sourceRef ?? null,
        digest,
        input.published ?? false,
        input.credit ?? null,
      ],
    );

    const assetId = rows[0]!.id;
    const deduplicated = rows[0]!.existed;

    for (const [r, key] of stored) {
      await client.query(
        `INSERT INTO asset_derivatives (asset_id, width, format, storage_key, bytes)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (asset_id, width, format) DO UPDATE SET
           storage_key = EXCLUDED.storage_key, bytes = EXCLUDED.bytes`,
        [assetId, r.width, r.format, key, r.body.byteLength],
      );
    }

    await client.query("COMMIT");
    return {
      assetId,
      width,
      height,
      ratio,
      derivatives: renditions.length,
      bytesStored,
      deduplicated,
    };
  } catch (e) {
    await client.query("ROLLBACK");

    // Turn the database's own accuracy rules into something an editor can
    // act on. `assets_alt_check` firing means they typed "photo" or a
    // filename — telling them "constraint violation 23514" would send them
    // to a developer for something they can fix themselves in ten seconds.
    const err = e as { constraint?: string; message: string };
    if (err.constraint === "assets_alt_check") {
      throw new IngestError(
        `Description rejected: "${input.alt}". It must be at least 12 characters and ` +
          `three words, must not be a filename, and must not start with "photo", ` +
          `"image" or "IMG". Describe what the photograph shows.`,
      );
    }
    if (err.constraint === "assets_ratio_check") {
      throw new IngestError(`Unsupported aspect ratio for a ${width}×${height} image.`);
    }
    throw e;
  }
}
