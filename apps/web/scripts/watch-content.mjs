/**
 * ══════════════════════════════════════════════════════════════════════
 * KEEP THE LOCAL SITE IN STEP WITH THE DATABASE, WITHOUT BEING ASKED.
 *
 * The public site is a static export: every page is generated from a
 * snapshot of the content, and `/events/[slug]` sets `dynamicParams =
 * false`, so a slug that was not in the snapshot has no page at all.
 * Publishing something in the admin panel therefore changes the database
 * and NOT the website — which shows up as a 404 on a page you just
 * created, and is indistinguishable from a bug.
 *
 * This closes that loop in development by re-running the content codegen
 * on a timer. When something has changed the generated modules are
 * rewritten, Next's dev server sees the file change, and the page appears
 * on the next refresh.
 *
 * ── WHY POLLING, AND WHY IT IS NOT WASTEFUL ──
 * The codegen is idempotent: it hashes what it would write and touches
 * only the files that actually differ. A run over unchanged content
 * rewrites nothing, so this never causes a spurious hot-reload. The cost
 * is one ~0.9s pass every INTERVAL seconds, and nothing else.
 *
 * A push signal would be better and is not available: Directus writes
 * straight to Postgres, and the /v1 façade is deliberately read-only with
 * no events to subscribe to. Adding one for a development convenience
 * would mean putting a write path into the thing whose whole job is not
 * having one.
 *
 * ── THIS IS DEVELOPMENT ONLY ──
 * In production the answer is REBUILD_WEBHOOK_URL: apps/cms/configure.mjs
 * already builds a Directus Flow that fires on every change to every
 * collection a visitor can see, and refuses to invent a URL to POST to.
 * Set it to a CI build hook and Publish becomes a button that publishes.
 * A polling loop on a server would be a worse version of that.
 *
 *   node scripts/watch-content.mjs
 *   BRS_CONTENT_POLL=30 node scripts/watch-content.mjs   # seconds
 * ══════════════════════════════════════════════════════════════════════
 */

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = join(HERE, "..");

/* Ten seconds. Long enough that the loop is not a background CPU tax,
   short enough that "publish, switch tab, refresh" finds the page there.
   The refresh is the slow part of that sequence anyway. */
const INTERVAL = Math.max(2, Number(process.env.BRS_CONTENT_POLL ?? 10)) * 1000;

const say = (msg) => console.log(`[content] ${msg}`);

let stopping = false;
let child = null;

/** One pass of the codegen. Resolves with the names it rewrote. */
function regenerate() {
  return new Promise((resolve) => {
    child = spawn(
      process.execPath,
      [
        "--env-file-if-exists=../../.env",
        "--import",
        "tsx",
        "scripts/fetch-content.mts",
      ],
      { cwd: WEB, stdio: ["ignore", "pipe", "pipe"] },
    );

    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));

    child.on("close", (code) => {
      child = null;
      if (code !== 0) return resolve({ failed: err.trim() || out.trim() });
      const written = [...out.matchAll(/^\s*written\s+(\S+)/gm)].map((m) => m[1]);
      resolve({ written });
    });

    child.on("error", (e) => {
      child = null;
      resolve({ failed: e.message });
    });
  });
}

/* A failing pass is usually the API not being up yet — turbo starts every
   dev task at once, and this one wins the race about half the time. So the
   first failures are quiet, and only a persistent one is worth a line;
   otherwise starting the dev server prints an alarming stack trace that
   resolves itself two seconds later. */
let consecutiveFailures = 0;

async function tick() {
  const { written, failed } = await regenerate();

  if (failed) {
    consecutiveFailures++;
    if (consecutiveFailures === 3) {
      say(`cannot reach the content API — is it running? Retrying quietly.`);
      say(failed.split("\n").slice(-2).join(" ").slice(0, 200));
    }
    return;
  }

  if (consecutiveFailures >= 3) say("content API is back.");
  consecutiveFailures = 0;

  if (written?.length) {
    say(
      `updated ${written.length} file(s) — ${written.slice(0, 4).join(", ")}` +
        (written.length > 4 ? `, +${written.length - 4} more` : ""),
    );
  }
}

async function loop() {
  say(`watching for published changes every ${INTERVAL / 1000}s`);
  while (!stopping) {
    await tick();
    if (stopping) break;
    await new Promise((r) => setTimeout(r, INTERVAL));
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopping = true;
    child?.kill();
    process.exit(0);
  });
}

await loop();
