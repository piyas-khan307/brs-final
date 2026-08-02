/**
 * ══════════════════════════════════════════════════════════════════════
 * ROUTE TESTS — against the real database.
 *
 * No mocks. A mocked Postgres would prove the adapter agrees with my
 * assumptions about Postgres, which is exactly the thing that has been
 * wrong twice already this project: the alt-text CHECK that accepted
 * 'IMG_6738.JPG' (B1) and the ratio CHECK that refused every 640×480
 * photograph (B2). Both were invisible until real SQL ran.
 *
 * Requests go through `app.request()` rather than a socket, so there is
 * no port to allocate and no server lifecycle to manage — but the SQL,
 * the coercion, and the contract validation are all the real ones.
 *
 *   docker compose up -d postgres minio minio-init
 *   pnpm --filter @brs/api test
 * ══════════════════════════════════════════════════════════════════════
 */

import { strict as assert } from "node:assert";
import { after, describe, it } from "node:test";

import {
  AchievementDTO,
  CollectionDTO,
  CommitteeDTO,
  EventDTO,
  ImageDTO,
  MemberDTO,
  Paginated,
  PartnerDTO,
  PostDTO,
  PressDTO,
} from "@brs/contract";
import { z } from "zod";

import app from "../src/index.js";
import { pool } from "../src/db.js";

const get = (path: string) => app.request(`http://test${path}`);
const json = async (path: string) => {
  const res = await get(path);
  return { status: res.status, body: (await res.json()) as unknown, res };
};

/**
 * Probed at MODULE scope, not in a `before` hook.
 *
 * node:test evaluates an `it(…, { skip })` option when the test is
 * DEFINED — that is, while the describe callback runs — which is strictly
 * before any `before` hook. A hook-assigned flag is therefore still false
 * at the moment it is read, and every test silently skips while the suite
 * reports green. It did exactly that on the first run here.
 */
const dbUp = await pool
  .query("select 1")
  .then(() => true)
  .catch(() => false);

after(async () => {
  await pool.end();
});

const NO_DB = "Postgres not reachable — run: docker compose up -d postgres";
const skipUnlessDb = () => (dbUp ? false : NO_DB);

describe("/v1/health", () => {
  it("reports the database and the counts of what it excludes", async () => {
    const { status, body } = await json("/v1/health");
    assert.equal(status, 200);
    const h = body as { ok: boolean; database: string; diagnostics?: Record<string, number> };
    assert.equal(h.ok, true);
    assert.equal(h.database, "up");
    // These exist so that silently-dropped records stay visible. An event
    // with no cover cannot be represented in EventDTO and is filtered out;
    // if that count is ever non-zero, somebody needs to know.
    assert.ok(h.diagnostics, "health must carry diagnostics");
    assert.equal(typeof h.diagnostics.eventsWithoutCover, "number");
  });
});

describe("every list route satisfies its contract", () => {
  // The point is not that the data is interesting — most of these are
  // empty until content lands. It is that the SHAPE is validated by the
  // façade itself, so an empty response and a malformed one are
  // distinguishable.
  const cases: [string, z.ZodTypeAny][] = [
    ["/v1/events", Paginated(EventDTO)],
    ["/v1/members", Paginated(MemberDTO)],
    ["/v1/posts", Paginated(PostDTO)],
    ["/v1/gallery", Paginated(ImageDTO)],
    ["/v1/committees", z.array(CommitteeDTO)],
    ["/v1/achievements", z.array(AchievementDTO)],
    ["/v1/partners", z.array(PartnerDTO)],
    ["/v1/press", z.array(PressDTO)],
  ];

  for (const [path, schema] of cases) {
    it(path, { skip: skipUnlessDb() }, async () => {
      const { status, body } = await json(path);
      assert.equal(status, 200, `${path} returned ${status}`);
      const parsed = schema.safeParse(body);
      assert.ok(
        parsed.success,
        `${path} violated the contract: ${JSON.stringify(parsed.error?.issues.slice(0, 2))}`,
      );
    });
  }
});

describe("/v1/gallery", () => {
  it("returns real assets carrying a usable srcset", { skip: skipUnlessDb() }, async () => {
    const { body } = await json("/v1/gallery?limit=3");
    const page = Paginated(ImageDTO).parse(body);

    assert.ok(page.total > 0, "expected the B2 upload to have loaded assets");
    const img = page.data[0]!;

    // The reason ImageSource was added to the contract: without these a
    // <picture> cannot be built, because a content-addressed key is not
    // derivable from an id and a width.
    assert.ok(img.sources.length > 0, "asset carries no derivative sources");
    assert.ok(
      img.sources.some((s) => s.format === "avif") &&
        img.sources.some((s) => s.format === "webp"),
      "expected both AVIF and WebP derivatives",
    );
    for (const s of img.sources) {
      assert.match(s.url, /sha256\/[0-9a-f]{2}\/[0-9a-f]{2}\/[0-9a-f]{64}\./, s.url);
    }
  });

  it("paginates with an opaque cursor", { skip: skipUnlessDb() }, async () => {
    const first = Paginated(ImageDTO).parse((await json("/v1/gallery?limit=2")).body);
    assert.equal(first.data.length, 2);
    assert.ok(first.nextCursor, "expected a cursor while more rows remain");

    const second = Paginated(ImageDTO).parse(
      (await json(`/v1/gallery?limit=2&cursor=${first.nextCursor}`)).body,
    );
    // Different page, same total. If the cursor were ignored, these would
    // be identical — which is the failure mode that looks like success.
    assert.equal(second.total, first.total);
    assert.notEqual(second.data[0]?.id, first.data[0]?.id);
  });

  it("clamps an absurd limit instead of trying to serve it", { skip: skipUnlessDb() }, async () => {
    const page = Paginated(ImageDTO).parse((await json("/v1/gallery?limit=99999")).body);
    assert.ok(page.data.length <= 100, `returned ${page.data.length}`);
  });

  it("treats a non-numeric limit as absent, not as NaN", { skip: skipUnlessDb() }, async () => {
    const page = Paginated(ImageDTO).parse((await json("/v1/gallery?limit=abc")).body);
    assert.ok(page.data.length > 0, "NaN limit paged nothing");
  });
});

describe("/v1/assets/:id — the storage seam", () => {
  it("redirects to storage rather than proxying the bytes", { skip: skipUnlessDb() }, async () => {
    const page = Paginated(ImageDTO).parse((await json("/v1/gallery?limit=1")).body);
    const id = page.data[0]!.id;

    const res = await get(`/v1/assets/${id}`);
    // 302, not 301: a re-crop changes the bytes and therefore the
    // content-addressed key, and a permanent redirect would pin the old.
    assert.equal(res.status, 302);
    assert.match(res.headers.get("location") ?? "", /sha256\//);
  });

  it("describes the asset when asked", { skip: skipUnlessDb() }, async () => {
    const page = Paginated(ImageDTO).parse((await json("/v1/gallery?limit=1")).body);
    const { status, body } = await json(`/v1/assets/${page.data[0]!.id}?describe`);
    assert.equal(status, 200);
    assert.ok(ImageDTO.safeParse(body).success);
  });

  it("answers 400 for a malformed id, not 500", { skip: skipUnlessDb() }, async () => {
    // Postgres raises 22P02 on a bad uuid cast. Without the guard in the
    // route that surfaces as an internal error, which is both wrong and
    // alarming in logs.
    const res = await get("/v1/assets/not-a-uuid");
    assert.equal(res.status, 400);
  });

  it("answers 404 for a well-formed id that does not exist", { skip: skipUnlessDb() }, async () => {
    const res = await get("/v1/assets/00000000-0000-0000-0000-000000000000");
    assert.equal(res.status, 404);
  });
});

describe("/v1/collections — the editorial layer", () => {
  it("serves all six landing-page collections", { skip: skipUnlessDb() }, async () => {
    const { status, body } = await json("/v1/collections");
    assert.equal(status, 200);
    const cols = z.array(CollectionDTO).parse(body);

    const slugs = cols.map((c) => c.slug);
    for (const expected of [
      "features",
      "key-facts",
      "gallery",
      "assembly",
      "contact-sheet",
      "press",
    ]) {
      assert.ok(slugs.includes(expected), `missing collection ${expected}, got ${slugs}`);
    }
  });

  it("keys are stable and unique within a collection", { skip: skipUnlessDb() }, async () => {
    // The property migration 0005 exists for. If keys collided or drifted,
    // FEATURES["hero-rc19"] would resolve to the wrong photograph and the
    // page would still build — the failure nothing reports.
    const cols = z.array(CollectionDTO).parse((await json("/v1/collections")).body);
    for (const c of cols) {
      const keys = c.items.map((i) => i.key);
      assert.equal(new Set(keys).size, keys.length, `duplicate keys in ${c.slug}: ${keys}`);
      for (const k of keys) assert.match(k, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${c.slug}: ${k}`);
    }

    const features = cols.find((c) => c.slug === "features")!;
    assert.deepEqual(features.items.map((i) => i.key), [
      "hero-rc19",
      "compete-robocon05",
      "build-mechatron13",
      "teach-bwv8",
    ]);
  });

  it("carries the placard text and plate numbers", { skip: skipUnlessDb() }, async () => {
    const c = CollectionDTO.parse((await json("/v1/collections/features")).body);
    const hero = c.items.find((i) => i.key === "hero-rc19");
    assert.ok(hero);
    assert.equal(hero.image.plate, 1);
    assert.ok(hero.caption.length >= 2, "hero placard should have its two lines");
    assert.match(hero.caption[0]!, /ROBO CARNIVAL 2019/);
  });

  it("press clippings keep a null ratio", { skip: skipUnlessDb() }, async () => {
    // The reason `ratio` became nullable in 0004. A newspaper cutting has
    // no design frame; cropping it to fit one destroys evidence.
    const c = CollectionDTO.parse((await json("/v1/collections/press")).body);
    assert.equal(c.items.length, 3);
    for (const item of c.items) {
      assert.equal(item.image.ratio, null, `${item.key} should have no design frame`);
      assert.ok(item.year, `${item.key} should carry its year`);
      assert.equal(item.title, "PROTHOM ALO");
    }
  });

  it("every item resolves to storage with a full srcset", { skip: skipUnlessDb() }, async () => {
    const cols = z.array(CollectionDTO).parse((await json("/v1/collections")).body);
    let checked = 0;
    for (const c of cols) {
      for (const item of c.items) {
        assert.ok(item.image.sources.length > 0, `${c.slug}#${item.key} has no sources`);
        assert.match(item.image.url, /sha256\/[0-9a-f]{2}\//, item.image.url);
        checked++;
      }
    }
    assert.equal(checked, 42, `expected 42 curated items, saw ${checked}`);
  });

  it("404s an unknown collection", { skip: skipUnlessDb() }, async () => {
    assert.equal((await get("/v1/collections/nope")).status, 404);
  });
});

describe("/v1/stats", () => {
  it(
    "refuses to invent earliestEvidenceYear when there is no evidence",
    { skip: skipUnlessDb() },
    async () => {
      const { status, body } = await json("/v1/stats");

      if (status === 503) {
        // The current state: no events, no achievements. A zero or a
        // founding year copied off a poster would be exactly the §2.3
        // fabrication this endpoint exists to prevent.
        assert.match((body as { detail: string }).detail, /earliestEvidenceYear/);
        return;
      }

      // Once content lands this becomes the live branch, and the figures
      // must be internally consistent rather than merely present.
      assert.equal(status, 200);
      const s = body as {
        earliestEvidenceYear: number;
        yearsActive: number;
        archivePhotographs: number;
      };
      assert.equal(s.yearsActive, new Date().getFullYear() - s.earliestEvidenceYear + 1);
      assert.ok(s.archivePhotographs >= 0);
    },
  );
});

describe("privacy — §12.1", () => {
  it("no response carries a contact-shaped field", { skip: skipUnlessDb() }, async () => {
    // Control 5. The column does not exist, MemberDTO has no such field,
    // and the adapter selects columns explicitly — but this asserts the
    // OUTPUT, which is the only layer a visitor can actually observe.
    const forbidden = /contact|phone|mobile|cell|whatsapp|telephone|bkash|nagad/i;

    for (const path of ["/v1/members", "/v1/committees", "/v1/gallery", "/v1/events"]) {
      const { body } = await json(path);
      const keys = new Set<string>();
      (function walk(v: unknown) {
        if (Array.isArray(v)) return v.forEach(walk);
        if (v && typeof v === "object") {
          for (const [k, val] of Object.entries(v)) {
            keys.add(k);
            walk(val);
          }
        }
      })(body);

      const offenders = [...keys].filter((k) => forbidden.test(k));
      assert.deepEqual(offenders, [], `${path} exposed ${offenders.join(", ")}`);
    }
  });
});

describe("errors", () => {
  it("404s an unknown route with the contract version attached", async () => {
    const { status, body } = await json("/v1/nonexistent");
    assert.equal(status, 404);
    assert.equal((body as { contract: string }).contract, "v1");
  });

  it("404s a missing slug rather than returning null", { skip: skipUnlessDb() }, async () => {
    for (const p of ["/v1/events/nope", "/v1/posts/nope", "/v1/projects/nope"]) {
      assert.equal((await get(p)).status, 404, p);
    }
  });

  it("400s a non-integer committee ordinal", { skip: skipUnlessDb() }, async () => {
    assert.equal((await get("/v1/committees/abc")).status, 400);
  });
});

describe("caching", () => {
  it("sets a shared-cache policy that build-time reads can bypass", async () => {
    const res = await get("/v1/health");
    assert.match(res.headers.get("cache-control") ?? "", /s-maxage=300/);
    assert.match(res.headers.get("cache-control") ?? "", /stale-while-revalidate/);
  });
});
