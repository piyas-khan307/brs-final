/**
 * ══════════════════════════════════════════════════════════════════════
 * PLANE 3 — the contract façade.
 * implementation_plan.md §6.1, §7.
 *
 * Stateless. Holds no data. Disposable by design: it can be redeployed or
 * rewritten without touching Postgres (Plane 1) or the frontend (Plane 4).
 *
 * Its one job is to publish a stable, frontend-agnostic /v1 surface so
 * that neither side needs to know about the other.
 *
 * This module exports the app but does not listen. src/server.ts does
 * that, which is what keeps the routes runtime-agnostic and lets tests
 * call `app.request()` without opening a socket.
 * ══════════════════════════════════════════════════════════════════════
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { CONTRACT_VERSION } from "@brs/contract";

import { v1 } from "./routes.js";

export const app = new Hono();

/* Read-only public surface. Rate limiting is applied at the edge (§12.2). */
app.use("/v1/*", cors({ origin: "*", allowMethods: ["GET", "OPTIONS"] }));

/* Edge cache: s-maxage 300, SWR 1 day (§7.5). Build-time reads send
   cache-control: no-cache and bypass this. */
app.use("/v1/*", async (c, next) => {
  await next();
  if (c.req.method === "GET" && c.res.ok) {
    c.res.headers.set(
      "cache-control",
      "public, s-maxage=300, stale-while-revalidate=86400",
    );
  }
});

app.route("/v1", v1);

/**
 * One handler for every unexpected throw.
 *
 * Without it, a dropped database connection returns Hono's default 500
 * with an empty body, and the build that consumed it reports "Contract
 * violation" — blaming the schema for what is actually an outage. Naming
 * the failure costs four lines and saves an afternoon.
 */
app.onError((err, c) => {
  console.error(`[api] ${c.req.method} ${c.req.path}`, err);
  return c.json(
    { error: "Internal error", detail: err.message, contract: CONTRACT_VERSION },
    500,
  );
});

app.notFound((c) => c.json({ error: "Not found", contract: CONTRACT_VERSION }, 404));

export default app;
