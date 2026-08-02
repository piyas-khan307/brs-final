/**
 * The connection pool. One per process.
 *
 * ── WHY THE FAÇADE RUNS ON NODE AND NOT CLOUDFLARE WORKERS ──
 * This app was scaffolded against `@cloudflare/workers-types` with a
 * `wrangler dev` script. That could not survive contact with Phase B3, for
 * a reason worth recording so nobody re-introduces it:
 *
 *   Workers cannot open a raw TCP socket to Postgres. Reaching a database
 *   from the Workers runtime needs Cloudflare Hyperdrive or an HTTP-proxy
 *   driver, and both require the database to be publicly reachable — which
 *   a self-hosted Postgres in a private Docker network deliberately is not.
 *
 * There was never a `wrangler.toml`, so `pnpm dev` in this package had
 * never actually run. The Workers assumption was aspirational, not load-
 * bearing, and the deployment plan (§B6) already called for a Node
 * container.
 *
 * Hono is kept precisely because it makes this reversible: the routes are
 * runtime-agnostic and only src/server.ts knows it is running on Node.
 */

import pg from "pg";

const { Pool } = pg;

/**
 * Small on purpose. The façade is read-only, every query is indexed, and
 * in the static-export model it is hit hard for a few seconds during a
 * build and then almost never. A large pool would just hold idle
 * connections against a database that has other clients (Directus).
 */
export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgres://brs:brs@localhost:5433/brs",
  max: 8,
  idleTimeoutMillis: 30_000,
  // Fail fast rather than hanging a build for the default two minutes.
  connectionTimeoutMillis: 5_000,
});

/** `pg` emits errors on idle clients out of band; without a handler node
 *  treats them as unhandled and kills the process. A dropped idle
 *  connection is normal and must not take the façade down. */
pool.on("error", (err) => {
  console.error("[db] idle client error:", err.message);
});

export type Sql = typeof pool;
