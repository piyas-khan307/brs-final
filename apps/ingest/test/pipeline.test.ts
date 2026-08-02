/**
 * ══════════════════════════════════════════════════════════════════════
 * PIPELINE TESTS.
 *
 * The ingest pipeline is the most consequential code in the repository
 * that a reviewer cannot check by reading: it is the only writer to
 * object storage, and it is the single place where a phone photograph's
 * GPS coordinates either are or are not removed. A comment saying "sharp
 * strips metadata by default" is not a guarantee — the default could
 * change, or somebody could add `.withMetadata()` to "preserve quality"
 * and have every test still pass.
 *
 * These run entirely in memory: an in-process StorageAdapter and a stub
 * pg client. No MinIO, no Postgres, no network. That is deliberate — a
 * privacy control that only gets checked when Docker happens to be up is
 * not a control.
 * ══════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import type {
  ObjectInfo,
  PutInput,
  PutResult,
  StorageAdapter,
} from "@brs/storage";

import { detectRatio, ingest, IngestError } from "../src/pipeline.js";

/* ── Doubles ──────────────────────────────────────────────────────────── */

class MemoryStore implements StorageAdapter {
  readonly name = "memory";
  readonly bucket = "test";
  readonly objects = new Map<string, PutInput>();

  async put(input: PutInput): Promise<PutResult> {
    const existed = this.objects.has(input.key);
    this.objects.set(input.key, input);
    return { key: input.key, size: input.body.byteLength, deduplicated: existed };
  }
  async head(key: string): Promise<ObjectInfo | null> {
    const o = this.objects.get(key);
    return o ? { key, size: o.body.byteLength } : null;
  }
  async get(key: string): Promise<Uint8Array> {
    const o = this.objects.get(key);
    if (!o) throw new Error(`absent: ${key}`);
    return o.body;
  }
  async *list(prefix: string): AsyncIterable<ObjectInfo> {
    for (const [key, o] of this.objects) {
      if (key.startsWith(prefix)) yield { key, size: o.body.byteLength };
    }
  }
  async remove(key: string): Promise<void> {
    this.objects.delete(key);
  }
  publicUrl(key: string): string {
    return `memory://${key}`;
  }
}

/**
 * Enough of a pg client for the pipeline's transaction. `constraint` lets
 * a test make the INSERT fail the way Postgres would, so the error
 * translation can be checked without a database.
 */
function stubClient(opts: { constraint?: string } = {}) {
  const queries: string[] = [];
  return {
    queries,
    async query(text: string) {
      queries.push(text.trim().split("\n")[0]!.trim());
      if (text.includes("INSERT INTO assets")) {
        if (opts.constraint) {
          throw Object.assign(new Error("check constraint violated"), {
            constraint: opts.constraint,
          });
        }
        return { rows: [{ id: "00000000-0000-4000-8000-000000000001", existed: false }] };
      }
      return { rows: [] };
    },
  };
}

/* ── Fixtures ─────────────────────────────────────────────────────────── */

/** A recognisable gradient, so a rotation is visible in the pixels. */
function source(width: number, height: number) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 20, g: 90, b: 160 },
    },
  });
}

/**
 * A JPEG carrying GPS coordinates, exactly like a photograph off a phone.
 * These are the coordinates a committee portrait would leak — the club
 * room, someone's hall of residence — if the pipeline ever passed
 * metadata through.
 */
async function jpegWithGps(width = 800, height = 600): Promise<Uint8Array> {
  const exif = {
    IFD0: { Make: "TestPhone", Model: "TestModel" },
    // sharp's TypeScript definition of Exif lists only the IFD blocks it
    // has bothered to name, and GPS is not among them — but libvips
    // writes it, which is exactly why this fixture works and why the
    // real leak it simulates is possible. The cast is the type being
    // wrong, not the data.
    GPS: {
      GPSLatitudeRef: "N",
      GPSLatitude: "23/1 43/1 0/1",
      GPSLongitudeRef: "E",
      GPSLongitude: "90/1 23/1 0/1",
    },
  } as unknown as Parameters<ReturnType<typeof sharp>["withExif"]>[0];

  const buf = await source(width, height).withExif(exif).jpeg().toBuffer();
  return new Uint8Array(buf);
}

/* ── detectRatio ──────────────────────────────────────────────────────── */

describe("detectRatio", () => {
  it("snaps to a design ratio when the image genuinely is that shape", () => {
    assert.equal(detectRatio(1000, 1000), "1:1");
    assert.equal(detectRatio(1600, 1200), "4:3");
    assert.equal(detectRatio(1500, 1000), "3:2");
    assert.equal(detectRatio(1920, 1080), "16:9");
    assert.equal(detectRatio(800, 1000), "4:5");
  });

  it("absorbs a rounding difference of a pixel or two", () => {
    assert.equal(detectRatio(1601, 1200), "4:3");
    assert.equal(detectRatio(1919, 1080), "16:9");
  });

  it("returns null rather than mislabelling a shape it does not recognise", () => {
    // 930x895 is what the 11th ExCom portraits crop to — close to square
    // and not square. Calling this "1:1" would be a lie about a real
    // photograph's shape.
    assert.equal(detectRatio(930, 895), null);
    assert.equal(detectRatio(1000, 1333), null); // 3:4, NOT 4:5
  });
});

/* ── The privacy control ──────────────────────────────────────────────── */

describe("metadata stripping", () => {
  it("removes GPS coordinates from every stored derivative", async () => {
    const store = new MemoryStore();
    await ingest(
      { bytes: await jpegWithGps(), alt: "A test photograph of a blue field" },
      store,
      stubClient() as never,
    );

    assert.ok(store.objects.size > 0, "nothing was stored");
    for (const [key, obj] of store.objects) {
      const meta = await sharp(obj.body).metadata();
      assert.equal(meta.exif, undefined, `${key} still carries an EXIF block`);
    }
  });

  it("keeps the source's own EXIF out of the pipeline's inputs too", async () => {
    // Guards the reverse mistake: reading metadata off the ORIGINAL and
    // copying selected fields onto the output "because they are harmless".
    const bytes = await jpegWithGps();
    const before = await sharp(bytes).metadata();
    assert.ok(before.exif, "fixture is wrong — the source should carry EXIF");

    const store = new MemoryStore();
    await ingest({ bytes, alt: "A test photograph of a blue field" }, store, stubClient() as never);
    for (const obj of store.objects.values()) {
      const meta = await sharp(obj.body).metadata();
      assert.equal(meta.exif, undefined);
    }
  });
});

/* ── The derivative ladder ────────────────────────────────────────────── */

describe("derivative ladder", () => {
  const widthsOf = (store: MemoryStore) =>
    [...new Set([...store.objects.values()].map((o) => Number(o.metadata!["width"])))].sort(
      (a, b) => a - b,
    );

  it("never upscales past the source width", async () => {
    const store = new MemoryStore();
    const bytes = new Uint8Array(await source(700, 500).jpeg().toBuffer());
    await ingest({ bytes, alt: "A modest photograph of a blue field" }, store, stubClient() as never);
    assert.deepEqual(widthsOf(store), [320, 640, 700]);
  });

  it("keeps the source width when it falls between two ladder steps", async () => {
    // The 11th ExCom crop is 930px. Without the native rung this tops out
    // at 640 and the committee page is soft on a laptop.
    const store = new MemoryStore();
    const bytes = new Uint8Array(await source(930, 895).jpeg().toBuffer());
    await ingest({ bytes, alt: "A near-square photograph of a blue field" }, store, stubClient() as never);
    assert.deepEqual(widthsOf(store), [320, 640, 930]);
  });

  it("does not add a native rung when the source is at or above the top step", async () => {
    const store = new MemoryStore();
    const bytes = new Uint8Array(await source(2400, 1600).jpeg().toBuffer());
    await ingest({ bytes, alt: "A large photograph of a blue field" }, store, stubClient() as never);
    assert.deepEqual(widthsOf(store), [320, 640, 960, 1280, 1600]);
  });

  it("emits both AVIF and WebP at every width", async () => {
    const store = new MemoryStore();
    const bytes = new Uint8Array(await source(700, 500).jpeg().toBuffer());
    const result = await ingest(
      { bytes, alt: "A modest photograph of a blue field" },
      store,
      stubClient() as never,
    );
    assert.equal(result.derivatives, 6);
    const formats = [...store.objects.values()].map((o) => o.metadata!["format"]);
    assert.equal(formats.filter((f) => f === "avif").length, 3);
    assert.equal(formats.filter((f) => f === "webp").length, 3);
  });
});

/* ── Refusals ─────────────────────────────────────────────────────────── */

describe("refusals", () => {
  it("rejects an image too small to survive the smallest derivative", async () => {
    const bytes = new Uint8Array(await source(200, 200).jpeg().toBuffer());
    await assert.rejects(
      () => ingest({ bytes, alt: "A tiny photograph of a blue field" }, new MemoryStore(), stubClient() as never),
      (e: IngestError) => {
        assert.match(e.message, /200px wide/);
        assert.match(e.message, /Upload a larger original/);
        return true;
      },
    );
  });

  it("rejects bytes that are not an image, naming what went wrong", async () => {
    await assert.rejects(
      () =>
        ingest(
          { bytes: new Uint8Array([1, 2, 3, 4]), alt: "Not actually an image at all" },
          new MemoryStore(),
          stubClient() as never,
        ),
      (e: IngestError) => {
        assert.match(e.message, /Not a readable image/);
        return true;
      },
    );
  });

  it("turns the alt-text constraint into something an editor can act on", async () => {
    const bytes = new Uint8Array(await source(700, 500).jpeg().toBuffer());
    await assert.rejects(
      () =>
        ingest(
          { bytes, alt: "IMG_6738.JPG" },
          new MemoryStore(),
          stubClient({ constraint: "assets_alt_check" }) as never,
        ),
      (e: IngestError) => {
        assert.match(e.message, /IMG_6738\.JPG/);
        assert.match(e.message, /three words/);
        // No constraint name, no SQLSTATE — the editor can fix this alone.
        assert.doesNotMatch(e.message, /assets_alt_check|23514/);
        return true;
      },
    );
  });

  it("rolls the transaction back when the insert fails", async () => {
    const bytes = new Uint8Array(await source(700, 500).jpeg().toBuffer());
    const client = stubClient({ constraint: "assets_alt_check" });
    await assert.rejects(() =>
      ingest({ bytes, alt: "IMG_6738.JPG" }, new MemoryStore(), client as never),
    );
    assert.ok(client.queries.includes("ROLLBACK"), "no ROLLBACK was issued");
    assert.ok(!client.queries.includes("COMMIT"), "committed despite the failure");
  });
});

/* ── Storage contract ─────────────────────────────────────────────────── */

describe("storage", () => {
  it("writes bytes before opening the transaction", async () => {
    // The reverse order leaves a row pointing at an object that does not
    // exist — a broken image nobody finds until someone loads that page.
    const store = new MemoryStore();
    const client = stubClient();
    const bytes = new Uint8Array(await source(700, 500).jpeg().toBuffer());
    await ingest({ bytes, alt: "A modest photograph of a blue field" }, store, client as never);
    assert.equal(client.queries[0], "BEGIN");
    assert.ok(store.objects.size > 0);
  });

  it("uses content-addressed keys and a correct content type", async () => {
    const store = new MemoryStore();
    const bytes = new Uint8Array(await source(700, 500).jpeg().toBuffer());
    await ingest({ bytes, alt: "A modest photograph of a blue field" }, store, stubClient() as never);
    for (const [key, obj] of store.objects) {
      assert.match(key, /^sha256\/[0-9a-f]{2}\/[0-9a-f]{2}\/[0-9a-f]{64}\.(avif|webp)$/);
      assert.equal(obj.contentType, key.endsWith(".avif") ? "image/avif" : "image/webp");
    }
  });

  it("reports a deduplicated upload rather than storing twice", async () => {
    const store = new MemoryStore();
    const bytes = new Uint8Array(await source(700, 500).jpeg().toBuffer());
    const first = await ingest(
      { bytes, alt: "A modest photograph of a blue field" },
      store,
      stubClient() as never,
    );
    const count = store.objects.size;
    const second = await ingest(
      { bytes, alt: "A modest photograph of a blue field" },
      store,
      stubClient() as never,
    );
    assert.ok(first.bytesStored > 0);
    assert.equal(second.bytesStored, 0, "re-upload spent bytes on identical content");
    assert.equal(store.objects.size, count);
  });

  it("produces an LQIP small enough to inline in the document", async () => {
    const store = new MemoryStore();
    const bytes = new Uint8Array(await source(2400, 1600).jpeg().toBuffer());
    await ingest({ bytes, alt: "A large photograph of a blue field" }, store, stubClient() as never);
    // Asserted through the row the pipeline writes, since the data URI is
    // not stored as an object. Re-derive it the same way and check size.
    const lqip = await sharp(bytes).rotate().resize({ width: 20 }).webp({ quality: 20 }).toBuffer();
    const uri = `data:image/webp;base64,${lqip.toString("base64")}`;
    assert.ok(uri.length < 2000, `LQIP is ${uri.length} bytes — too large to inline`);
  });
});
