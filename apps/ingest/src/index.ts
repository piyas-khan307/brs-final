/**
 * ══════════════════════════════════════════════════════════════════════
 * THE UPLOADER — internal only.
 *
 * Two callers, and no others:
 *   · Directus, via a Flow that fires when an editor uploads a file
 *   · operator scripts doing a bulk import
 *
 * It is NOT on the public internet. docker-compose.prod publishes no port
 * for it; only the compose network can reach it. That matters because
 * this is the one service holding storage write credentials.
 * ══════════════════════════════════════════════════════════════════════
 */

import { Hono } from "hono";
import pg from "pg";
import { fromEnv } from "@brs/storage";

import { ingest, ingestDocument, IngestError } from "./pipeline.js";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://brs:brs@localhost:5433/brs",
  max: 4,
  connectionTimeoutMillis: 5_000,
});
pool.on("error", (e) => console.error("[ingest] idle client error:", e.message));

const store = fromEnv();

export const app = new Hono<{ Variables: { uploaderId?: string } }>();

/**
 * CORS, for the admin panel only.
 *
 * An explicit origin rather than "*", and the list is the site's own
 * addresses. This service writes to object storage; it does not accept
 * uploads from arbitrary pages on the internet, whatever credentials
 * they happen to be holding.
 */
const ALLOWED_ORIGINS = (process.env.INGEST_CORS_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use("*", async (c, next) => {
  const origin = c.req.header("origin");
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Vary", "Origin");
    c.header("Access-Control-Allow-Headers", "Authorization, Content-Type, x-ingest-token");
    c.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  }
  if (c.req.method === "OPTIONS") return c.body(null, 204);
  await next();
});

/**
 * Shared-secret auth on every route except /health.
 *
 * Not OAuth, not JWT: the only callers are two processes inside the same
 * network, and a token they both hold is the right size of mechanism. The
 * real control is that the service is unroutable from outside.
 *
 * It REFUSES TO START without a token rather than defaulting to open —
 * an unauthenticated endpoint that writes to object storage is not
 * something to leave one missing environment variable away.
 */
const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;

const TOKEN = process.env.INGEST_TOKEN;
if (!TOKEN) {
  throw new Error(
    "INGEST_TOKEN is not set. This service writes to object storage and will not " +
      "start unauthenticated. Generate one with: openssl rand -base64 32",
  );
}

/**
 * The admin panel runs in a BROWSER, and a shared secret shipped to a
 * browser is not a secret. So there are two ways in, and only two:
 *
 *   · x-ingest-token — machine callers on the internal network: the bulk
 *     importer, a Directus Flow. The token never leaves a server.
 *   · Authorization: Bearer <Directus access token> — a signed-in human
 *     using /admin. Verified by asking Directus who it belongs to, which
 *     is the only party entitled to answer.
 *
 * The second is not a weakening of the first. An attacker needs a valid
 * Directus session either way, and holding one already means an account
 * on the CMS. What it buys is that "upload a photograph" works from the
 * admin panel without a credential being handed to every visitor who
 * views source.
 */
const DIRECTUS_URL = process.env.DIRECTUS_URL ?? "http://localhost:8055";

async function directusUser(bearer: string): Promise<string | null> {
  try {
    const res = await fetch(`${DIRECTUS_URL}/users/me?fields=id`, {
      headers: { Authorization: bearer },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: { id?: string } };
    return body.data?.id ?? null;
  } catch {
    // Directus being unreachable must not become "everyone is allowed".
    return null;
  }
}

app.use("/ingest/*", async (c, next) => {
  const supplied = c.req.header("x-ingest-token");
  // Length check first so the comparison below cannot throw on a short
  // input, and a plain !== after: timing-safe comparison is theatre when
  // the attacker cannot reach the port at all.
  if (supplied && supplied.length === TOKEN.length && supplied === TOKEN) {
    return next();
  }

  const bearer = c.req.header("authorization");
  if (bearer?.startsWith("Bearer ")) {
    const userId = await directusUser(bearer);
    if (userId) {
      // Recorded on the asset row, so every upload has a person behind it.
      c.set("uploaderId", userId);
      return next();
    }
  }

  return c.json({ error: "Unauthorized" }, 401);
});

app.get("/health", async (c) => {
  try {
    await pool.query("select 1");
    return c.json({ ok: true, database: "up", storage: store.name, bucket: store.bucket });
  } catch {
    return c.json({ ok: false, database: "down" }, 503);
  }
});

/**
 * Accepts multipart/form-data:
 *
 *   file     the original image (JPEG, PNG, WebP, HEIC — iPhone included)
 *   alt      required, and enforced by the database, not by politeness
 *   credit, sourceRef, published   optional
 */
app.post("/ingest", async (c) => {
  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    return c.json({ error: "Expected multipart/form-data" }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return c.json({ error: "No file supplied" }, 400);

  // Node imposes no body limit, so this is the only one there is. Phone
  // photos run 3–12 MB; 40 MB leaves room for a large DSLR JPEG without
  // letting one request hold half a gigabyte of heap while sharp works.
  if (file.size > MAX_UPLOAD_BYTES) {
    return c.json(
      {
        error: `That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is ` +
          `${MAX_UPLOAD_BYTES / 1048576} MB — export it smaller and try again.`,
      },
      413,
    );
  }

  const alt = String(form.get("alt") ?? "").trim();
  if (!alt) {
    return c.json(
      { error: "A description (alt) is required. Describe what the photograph shows." },
      400,
    );
  }

  const client = await pool.connect();
  try {
    const result = await ingest(
      {
        bytes: new Uint8Array(await file.arrayBuffer()),
        alt,
        ...(form.get("credit") ? { credit: String(form.get("credit")) } : {}),
        // A browser upload has no meaningful filename provenance, so the
        // uploader's account id is recorded instead — every asset can be
        // traced to whoever put it there.
        ...(form.get("sourceRef")
          ? { sourceRef: String(form.get("sourceRef")) }
          : c.get("uploaderId")
            ? { sourceRef: `admin-upload:${c.get("uploaderId")}` }
            : {}),
        published: String(form.get("published") ?? "") === "true",
        ...(form.get("category") ? { category: String(form.get("category")) } : {}),
      },
      store,
      client,
    );
    return c.json(result, result.deduplicated ? 200 : 201);
  } catch (e) {
    if (e instanceof IngestError) return c.json({ error: e.message }, 400);
    console.error("[ingest] failed:", e);
    return c.json({ error: "Ingest failed", detail: (e as Error).message }, 500);
  } finally {
    client.release();
  }
});

/**
 * Same shape as /ingest, for a PDF instead of a photograph:
 *
 *   file     the PDF itself
 *   title    required, enforced by the database (documents_title_check)
 *   credit, sourceRef, published   optional
 *
 * Covered by the same `/ingest/*` auth middleware above — no separate
 * token check needed.
 */
const MAX_DOCUMENT_BYTES = 40 * 1024 * 1024;

app.post("/ingest/document", async (c) => {
  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    return c.json({ error: "Expected multipart/form-data" }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return c.json({ error: "No file supplied" }, 400);

  if (file.size > MAX_DOCUMENT_BYTES) {
    return c.json(
      {
        error: `That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is ` +
          `${MAX_DOCUMENT_BYTES / 1048576} MB.`,
      },
      413,
    );
  }

  const title = String(form.get("title") ?? "").trim();
  if (!title) {
    return c.json(
      { error: "A title is required. Describe what the document is." },
      400,
    );
  }

  const client = await pool.connect();
  try {
    const result = await ingestDocument(
      {
        bytes: new Uint8Array(await file.arrayBuffer()),
        title,
        ...(form.get("credit") ? { credit: String(form.get("credit")) } : {}),
        ...(form.get("sourceRef")
          ? { sourceRef: String(form.get("sourceRef")) }
          : c.get("uploaderId")
            ? { sourceRef: `admin-upload:${c.get("uploaderId")}` }
            : {}),
        published: String(form.get("published") ?? "") === "true",
      },
      store,
      client,
    );
    return c.json(result, result.deduplicated ? 200 : 201);
  } catch (e) {
    if (e instanceof IngestError) return c.json({ error: e.message }, 400);
    console.error("[ingest] document failed:", e);
    return c.json({ error: "Ingest failed", detail: (e as Error).message }, 500);
  } finally {
    client.release();
  }
});

app.onError((err, c) => {
  console.error(`[ingest] ${c.req.method} ${c.req.path}`, err);
  return c.json({ error: "Internal error", detail: err.message }, 500);
});

export { pool, store };
export default app;
