/**
 * ══════════════════════════════════════════════════════════════════════
 * THE /v1 SURFACE.
 *
 * Thin by design: parse the query, call the adapter, validate, respond.
 * Any logic that grows here belongs in adapters/postgres.ts, and anything
 * that needs a Postgres column name definitely does.
 *
 * ── EVERY RESPONSE IS VALIDATED BEFORE IT IS SENT ──
 * The client in @brs/contract already validates what it receives, and it
 * would be easy to call this belt-and-braces. It is not the same check:
 *
 *   · The client protects ONE consumer. The façade protects every
 *     consumer, including curl, a future mobile app, and the OpenAPI
 *     document that claims this shape is true.
 *   · A client-side failure blames the network. A server-side failure
 *     blames the query that produced it, which is where the bug is.
 *   · Validating at the source means a contract violation is a 500 in
 *     CI, not a broken page in production.
 *
 * The cost is one Zod parse per request against a dataset measured in
 * hundreds of rows. That is not a real cost.
 * ══════════════════════════════════════════════════════════════════════
 */

import { Hono, type Context } from "hono";
import type { z } from "zod";
import {
  AchievementDTO,
  CollectionDTO,
  CommitteeDTO,
  CONTRACT_VERSION,
  EventDTO,
  ImageDTO,
  MemberDTO,
  Paginated,
  PartnerDTO,
  PostDTO,
  PressDTO,
  ProjectDTO,
  StatsDTO,
} from "@brs/contract";
import { z as zod } from "zod";

import * as db from "./adapters/postgres.js";

export const v1 = new Hono();

/* ── Response validation ──────────────────────────────────────────────── */

/**
 * Validate, then send. A failure is a 500 with the first three issues
 * named — never a 200 carrying data that violates the published shape.
 *
 * Returning the issues is deliberate. This surface is read-only and
 * public; the "leak" is a description of our own schema, which is already
 * published as openapi.json. Debuggability wins.
 */
function send<S extends z.ZodTypeAny>(c: Context, schema: S, payload: unknown) {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    console.error(
      `[contract] ${c.req.path} produced an invalid response:`,
      JSON.stringify(parsed.error.issues.slice(0, 3), null, 2),
    );
    return c.json(
      {
        error: "Contract violation",
        detail: `${c.req.path} produced data that does not satisfy the ${CONTRACT_VERSION} contract`,
        issues: parsed.error.issues.slice(0, 3),
      },
      500,
    );
  }
  return c.json(parsed.data);
}

/* ── Query coercion ───────────────────────────────────────────────────── */

/** `?limit=abc` must not become NaN and silently page nothing. */
const int = (v: string | undefined): number | undefined => {
  if (v === undefined) return undefined;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
};

/** Only the literal strings "true"/"false" mean anything. `?featured=`
 *  (empty) is "no opinion", not false. */
const bool = (v: string | undefined): boolean | undefined =>
  v === "true" ? true : v === "false" ? false : undefined;

/** Drops undefined keys so `exactOptionalPropertyTypes`-style call sites
 *  never receive an explicit `undefined` where a value is expected. */
function clean<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

/* ── Health ───────────────────────────────────────────────────────────── */

const HealthDTO = zod.object({
  ok: zod.boolean(),
  version: zod.string(),
  database: zod.enum(["up", "down"]),
  diagnostics: zod
    .object({
      eventsWithoutCover: zod.number().int(),
      unpublishedAssets: zod.number().int(),
      assets: zod.number().int(),
    })
    .optional(),
});

v1.get("/health", async (c) => {
  try {
    const diagnostics = await db.diagnostics();
    return send(c, HealthDTO, {
      ok: true,
      version: CONTRACT_VERSION,
      database: "up",
      // Counts of things this façade deliberately excludes from its
      // responses. Silent omissions are how an archive quietly loses
      // records; naming them here keeps the loss visible.
      diagnostics,
    });
  } catch {
    // 503, not 200-with-ok-false. A load balancer must be able to act on
    // this without parsing the body.
    return c.json({ ok: false, version: CONTRACT_VERSION, database: "down" }, 503);
  }
});

/* ── Events ───────────────────────────────────────────────────────────── */

v1.get("/events", async (c) => {
  const q = c.req.query();
  const page = await db.listEvents(
    clean({
      category: q["category"],
      series: q["series"],
      year: int(q["year"]),
      featured: bool(q["featured"]),
      limit: int(q["limit"]),
      cursor: q["cursor"],
    }),
  );
  return send(c, Paginated(EventDTO), page);
});

v1.get("/events/:slug", async (c) => {
  const event = await db.eventBySlug(c.req.param("slug"));
  if (!event) return c.json({ error: "Not found" }, 404);
  return send(c, EventDTO, event);
});

/* ── Committees ───────────────────────────────────────────────────────── */

v1.get("/committees", async (c) => {
  const current = c.req.query("current") === "true";
  return send(c, zod.array(CommitteeDTO), await db.listCommittees(clean({ current })));
});

v1.get("/committees/:ordinal", async (c) => {
  const ordinal = int(c.req.param("ordinal"));
  if (ordinal === undefined) return c.json({ error: "Ordinal must be an integer" }, 400);

  const [committee] = await db.listCommittees({ ordinal });
  if (!committee) return c.json({ error: "Not found" }, 404);
  return send(c, CommitteeDTO, committee);
});

/* ── Members ──────────────────────────────────────────────────────────── */

v1.get("/members", async (c) => {
  const q = c.req.query();
  const page = await db.listMembers(
    clean({
      committee: int(q["committee"]),
      section: q["section"],
      department: q["department"],
      batch: q["batch"],
      q: q["q"],
      limit: int(q["limit"]),
      cursor: q["cursor"],
    }),
  );
  return send(c, Paginated(MemberDTO), page);
});

/* ── Achievements ─────────────────────────────────────────────────────── */

v1.get("/achievements", async (c) => {
  const q = c.req.query();
  const list = await db.listAchievements(
    clean({ track: q["track"], from: int(q["from"]), to: int(q["to"]) }),
  );
  return send(c, zod.array(AchievementDTO), list);
});

/* ── Projects ─────────────────────────────────────────────────────────── */

v1.get("/projects/:slug", async (c) => {
  const project = await db.projectBySlug(c.req.param("slug"));
  if (!project) return c.json({ error: "Not found" }, 404);
  return send(c, ProjectDTO, project);
});

/* ── Editorial ────────────────────────────────────────────────────────── */

v1.get("/posts", async (c) => {
  const q = c.req.query();
  const page = await db.listPosts(
    clean({ tag: q["tag"], limit: int(q["limit"]), cursor: q["cursor"] }),
  );
  return send(c, Paginated(PostDTO), page);
});

v1.get("/posts/:slug", async (c) => {
  const post = await db.postBySlug(c.req.param("slug"));
  if (!post) return c.json({ error: "Not found" }, 404);
  return send(c, PostDTO, post);
});

v1.get("/partners", async (c) => send(c, zod.array(PartnerDTO), await db.listPartners()));

v1.get("/press", async (c) => send(c, zod.array(PressDTO), await db.listPress()));

/* ── Gallery ──────────────────────────────────────────────────────────── */

v1.get("/gallery", async (c) => {
  const q = c.req.query();
  const page = await db.listGallery(
    clean({
      event: q["event"],
      year: int(q["year"]),
      limit: int(q["limit"]),
      cursor: q["cursor"],
    }),
  );
  return send(c, Paginated(ImageDTO), page);
});

/* ── Collections — the editorial layer ────────────────────────────────── */

v1.get("/collections", async (c) =>
  send(c, zod.array(CollectionDTO), await db.listCollections()),
);

v1.get("/collections/:slug", async (c) => {
  const collection = await db.collectionBySlug(c.req.param("slug"));
  if (!collection) return c.json({ error: "Not found" }, 404);
  return send(c, CollectionDTO, collection);
});

/* ── Stats ────────────────────────────────────────────────────────────── */

v1.get("/stats", async (c) => {
  try {
    return send(c, StatsDTO, await db.computeStats());
  } catch (e) {
    if (e instanceof db.InsufficientEvidence) {
      // 503, not 200-with-zeroes. A zero is a claim; "I cannot compute
      // this yet" is the truth, and the frontend must be forced to
      // distinguish them. See §2.3.
      return c.json({ error: "Statistics unavailable", detail: e.message }, 503);
    }
    throw e;
  }
});

/* ── Assets — the storage seam ────────────────────────────────────────── */

/**
 * `/v1/assets/:id` redirects to wherever the bytes actually live.
 *
 * WHY A REDIRECT AND NOT A PROXY. Proxying would let the façade issue a
 * URL on its own domain forever, which is the original §7.1 rule 5 idea.
 * But it would also put a Node process in the path of every image on
 * every page load — turning a stateless, disposable façade into a
 * bandwidth-bound service, and re-coupling page loads to backend uptime
 * that `output: "export"` exists to decouple.
 *
 * A 302 keeps the stable, provider-agnostic entry point (the id) while
 * letting the CDN serve the bytes. Provider swaps stay a config change
 * because the redirect target is built by @brs/storage from
 * STORAGE_PUBLIC_BASE_URL, not hardcoded here.
 *
 * `?describe` returns the ImageDTO instead — useful for debugging and for
 * anything that needs dimensions without fetching pixels.
 */
v1.get("/assets/:id", async (c) => {
  const id = c.req.param("id");

  // Postgres throws 22P02 on a malformed uuid; answering 400 here keeps
  // that from surfacing as a 500.
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return c.json({ error: "Asset id must be a uuid" }, 400);
  }

  const found = await db.assetById(id);
  if (!found) return c.json({ error: "Not found" }, 404);

  if (c.req.query("describe") !== undefined) {
    return send(c, ImageDTO, found.image);
  }

  // 302, not 301: the mapping from id to storage key genuinely can change
  // (a re-crop produces new bytes and therefore a new content-addressed
  // key). A 301 would be cached by browsers forever and pin the old one.
  return c.redirect(found.image.url, 302);
});
