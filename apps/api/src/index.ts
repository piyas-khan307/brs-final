/**
 * ══════════════════════════════════════════════════════════════════════
 * PLANE 3 — the contract façade.
 * implementation_plan.md §6.1, §7.
 *
 * Stateless. Holds no data. Disposable by design: it can be redeployed or
 * rewritten without touching Postgres (Plane 1) or the frontend (Plane 4).
 *
 * Its one job is to publish a stable, frontend-agnostic /v1 surface so that
 * neither side needs to know about the other.
 * ══════════════════════════════════════════════════════════════════════
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { CONTRACT_VERSION } from "@brs/contract";

type Env = {
  Bindings: {
    DIRECTUS_URL: string;
    DIRECTUS_TOKEN: string;
    PUBLIC_API_BASE: string;
  };
};

const app = new Hono<Env>();

/* Read-only public surface. Rate limiting is applied at the edge (§12.2). */
app.use("/v1/*", cors({ origin: "*", allowMethods: ["GET", "OPTIONS"] }));

/* Edge cache: s-maxage 300, SWR 1 day (§7.5). Build-time reads send
   cache-control: no-cache and bypass this. */
app.use("/v1/*", async (c, next) => {
  await next();
  if (c.req.method === "GET" && c.res.ok) {
    c.res.headers.set("cache-control", "public, s-maxage=300, stale-while-revalidate=86400");
  }
});

app.get("/v1/health", (c) => c.json({ ok: true, version: CONTRACT_VERSION }));

/**
 * Remaining /v1 routes are implemented in Phase B1, once the schema is
 * applied and Directus is seeded. The contract (packages/contract) is
 * already authoritative, so the frontend can be built against it — and
 * Phase L can proceed — before these exist.
 *
 * Routes to implement, per §7.2:
 *   /v1/events            /v1/events/{slug}
 *   /v1/committees        /v1/committees/{ordinal}
 *   /v1/members           /v1/achievements
 *   /v1/projects/{slug}   /v1/posts   /v1/posts/{slug}
 *   /v1/partners          /v1/press   /v1/gallery
 *   /v1/stats             /v1/assets/{id}
 */
app.all("/v1/*", (c) =>
  c.json({ error: "Not implemented until Phase B1", contract: CONTRACT_VERSION }, 501),
);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
