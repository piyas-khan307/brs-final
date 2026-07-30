/**
 * RULE 5 — client-component-allowlist
 *
 * Added as a direct consequence of choosing Next.js 15 (§10.3).
 *
 * The App Router's React runtime floor is ~110 KB gzip before a line of our
 * code ships, so the only budget we control is first-party JS: <= 15 KB
 * (§4.7). That budget erodes one convenient 'use client' at a time.
 *
 * Requiring an allowlist entry makes adding an island a deliberate,
 * reviewable act. During Phase L there are exactly two: ZoneRail and
 * ZoneD_RecordStrip.
 */

import { readFileSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";

const CACHE = new Map();

/** Walk up for apps/web/config/client-allowlist.json. */
function loadAllowlist(fromFile) {
  let dir = dirname(fromFile);
  for (let i = 0; i < 12; i++) {
    const candidate = join(dir, "config", "client-allowlist.json");
    if (CACHE.has(candidate)) {
      const cached = CACHE.get(candidate);
      if (cached) return { entries: cached, root: dir };
    } else {
      try {
        const parsed = JSON.parse(readFileSync(candidate, "utf8"));
        const entries = parsed.allow ?? [];
        CACHE.set(candidate, entries);
        return { entries, root: dir };
      } catch {
        CACHE.set(candidate, null);
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function hasUseClient(node) {
  // Directive prologue only — a 'use client' further down has no effect.
  for (const stmt of node.body) {
    if (
      stmt.type === "ExpressionStatement" &&
      stmt.expression.type === "Literal" &&
      typeof stmt.expression.value === "string"
    ) {
      if (stmt.expression.value === "use client") return stmt;
      continue; // another directive, e.g. 'use strict'
    }
    break;
  }
  return null;
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require every 'use client' file to be declared in apps/web/config/client-allowlist.json",
    },
    schema: [],
    messages: {
      notAllowlisted:
        "'{{file}}' declares 'use client' but is not in apps/web/config/client-allowlist.json. First-party JS is budgeted at <=15 KB gzip (implementation_plan.md §4.7) and every island must be a deliberate decision (§10.3). Add an entry with a written reason, or make this a Server Component.",
      missingAllowlist:
        "'use client' used but apps/web/config/client-allowlist.json was not found. The allowlist is required infrastructure (§10.3).",
    },
  },

  create(context) {
    return {
      Program(node) {
        const directive = hasUseClient(node);
        if (!directive) return;

        const filename = context.filename ?? context.getFilename();
        const loaded = loadAllowlist(filename);

        if (!loaded) {
          context.report({ node: directive, messageId: "missingAllowlist" });
          return;
        }

        const rel = relative(loaded.root, filename).split(sep).join("/");
        const ok = loaded.entries.some((e) => (typeof e === "string" ? e : e.file) === rel);

        if (!ok) {
          context.report({
            node: directive,
            messageId: "notAllowlisted",
            data: { file: rel },
          });
        }
      },
    };
  },
};
