/**
 * The Node entry point — the ONLY file that knows what runtime this is.
 *
 * Everything else (index.ts, routes.ts, adapters/) is plain Hono and would
 * run unchanged on Workers, Deno or Bun. Keeping the runtime knowledge in
 * one twenty-line file is what makes that claim checkable rather than
 * aspirational.
 */

import { serve } from "@hono/node-server";

import app from "./index.js";
import { pool } from "./db.js";

const port = Number(process.env.PORT ?? 8787);

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[api] listening on http://localhost:${info.port}`);
  console.log(`[api] health: http://localhost:${info.port}/v1/health`);
});

/**
 * Close the pool on shutdown.
 *
 * Without this, `docker stop` waits out its full 10-second grace period
 * on every deploy because node keeps the process alive for open
 * connections — turning a rolling restart into a minute of downtime.
 */
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log(`[api] ${signal} — draining`);
    server.close(() => {
      pool.end().then(
        () => process.exit(0),
        () => process.exit(1),
      );
    });
  });
}
