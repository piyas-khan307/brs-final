/**
 * Node entry. The only file that knows what runtime this is — see the
 * matching note in apps/api/src/server.ts.
 */

import { serve } from "@hono/node-server";

import app, { pool } from "./index.js";

const port = Number(process.env.INGEST_PORT ?? 8790);

// Node's http server imposes NO body-size limit of its own, so there is
// nothing to raise here — the limit is enforced explicitly in the route
// instead, where it can return a message an editor understands rather
// than a dropped connection.
const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[ingest] listening on http://localhost:${info.port} (internal only)`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log(`[ingest] ${signal} — draining`);
    server.close(() => {
      pool.end().then(() => process.exit(0), () => process.exit(1));
    });
  });
}
