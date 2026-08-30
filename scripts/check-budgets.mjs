#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════
 * BUDGET GATE — implementation_plan.md §4.7.
 *
 * Measures the ACTUAL gzipped bytes referenced by the built HTML, not the
 * summary Next prints. That distinction matters: `next build` reported
 * "First Load JS 103 kB" for the token proof sheet, but the emitted HTML
 * also references a 39 KB polyfills bundle. It carries `noModule`, so
 * modern browsers skip it — but a budget check that trusted the summary
 * would have been measuring the wrong thing.
 *
 * Two budgets are therefore tracked separately:
 *   modern  — excludes noModule polyfills (what almost every visitor loads)
 *   legacy  — everything the HTML references
 *
 * Exit 0 within budget · exit 1 over
 * ══════════════════════════════════════════════════════════════════════
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "apps", "web", "out");

const BUDGETS = {
  jsModern: 125 * 1024,
  jsLegacy: 165 * 1024,
  css: 24 * 1024,
  // Framework floor is a fixed cost we do not control; first-party is the
  // number the team is accountable for.
  jsFirstParty: 15 * 1024,
};

/* ── ROUTES THE READER BUDGET WAS NEVER ABOUT ──────────────────────────
 *
 * This gate exists to keep a READER'S page load small. It was applying
 * one number to every HTML file in the build, which put an authenticated
 * editing tool and an archive page under the same ceiling — and the
 * project had already decided, in writing, that those are not the same
 * thing. From apps/web/config/client-allowlist.json:
 *
 *   "THE ADMIN AREA (/admin) is a client application by necessity and
 *    the budget argument does not apply to it: it is authenticated, it
 *    is noindex, no visitor ever loads it, and Next code-splits it away
 *    from every public route."
 *
 *   "[the motion sheet] carries GSAP and Lenis by design, so counting
 *    its islands against a 15 KB budget would be measuring the wrong
 *    thing."
 *
 * So the decision is not made here; it is only finally APPLIED here.
 * What the routes below get is a ceiling of their own, not an exemption:
 * each is a real number sitting just above what that route costs today,
 * so a dependency bump passes and a second editor library does not.
 *
 * TWO THINGS ARE DELIBERATELY NOT OVERRIDABLE, and every route on this
 * list still meets both:
 *
 *   jsFirstParty  the code this team writes, 15 KB, everywhere. The
 *                 vendor floor is what an editor or an animation library
 *                 costs; first-party is the number we are accountable
 *                 for, and no route gets to grow it.
 *   css           one stylesheet serves the whole site, so a per-route
 *                 CSS ceiling would be describing something that does
 *                 not exist.
 *
 * Anything not matched here gets the reader's numbers above, which have
 * not moved. First match wins; add an entry only with the measurement
 * and the reason, as these two carry. ── */
const ROUTE_BUDGETS = [
  {
    // /admin/events/edit and /admin/posts/edit are Tiptap over
    // ProseMirror: 284.9 KB and 282.6 KB modern today. Every other admin
    // screen is a form and comes in under the reader budget anyway.
    match: (rel) => rel.startsWith("/admin/"),
    jsModern: 300 * 1024,
    jsLegacy: 340 * 1024,
  },
  {
    // The team dossier: GSAP and Lenis, which are the page rather than
    // overhead on it. 156.2 KB modern today.
    match: (rel) => rel.startsWith("/teams/navula"),
    jsModern: 170 * 1024,
    jsLegacy: 210 * 1024,
  },
  {
    /* The landing page, which IS the motion sheet — and the one route
       whose exemption is written into the page itself. From the docblock
       at the top of apps/web/src/app/page.tsx, under "RULES DELIBERATELY
       SET ASIDE, so that none of this is mistaken for an oversight
       later": "the 15 KB first-party JS budget (§4.7) — GSAP and Lenis
       are the instrument this brief is written for, and they cost what
       they cost".

       164.3 KB modern today. Note it does not actually need the part it
       set aside: first-party is 12.6 KB, inside the 15 KB every route
       still has to meet. It is the vendor floor that moves, and only
       here — /sheet-01, the restrained version of this page kept as the
       fallback, needs no entry at 106 KB. */
    match: (rel) => rel === "/index.html" || rel === "/",
    jsModern: 180 * 1024,
    jsLegacy: 220 * 1024,
  },
];

/** The budgets for one page: the reader's, with a route's own ceiling
 *  substituted where it has one. */
function budgetsFor(rel) {
  const route = ROUTE_BUDGETS.find((r) => r.match(rel));
  return route ? { ...BUDGETS, jsModern: route.jsModern, jsLegacy: route.jsLegacy } : BUDGETS;
}

if (!existsSync(OUT)) {
  console.error(`No build output at ${OUT}. Run the web build first.`);
  process.exit(1);
}

const gz = (abs) => gzipSync(readFileSync(abs)).length;

function findHtml(dir) {
  const found = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) found.push(...findHtml(p));
    else if (e.name.endsWith(".html")) found.push(p);
  }
  return found;
}

const pages = findHtml(OUT);
let failed = false;

console.log("BUDGET GATE");
console.log("=".repeat(72));

for (const page of pages) {
  const html = readFileSync(page, "utf8");
  const rel = page.slice(OUT.length) || "/index.html";

  // Scripts, split by whether modern browsers actually fetch them.
  const scriptTags = html.match(/<script[^>]*src="([^"]+)"[^>]*>/g) ?? [];
  let modern = 0;
  let legacy = 0;
  let firstParty = 0;

  for (const tag of scriptTags) {
    const src = tag.match(/src="([^"]+)"/)?.[1];
    if (!src || !src.startsWith("/_next/")) continue;
    const abs = join(OUT, src);
    if (!existsSync(abs)) continue;
    const size = gz(abs);
    const isNoModule = /noModule/i.test(tag);

    legacy += size;
    if (!isNoModule) modern += size;

    // Framework/vendor chunks are the fixed floor; app/page/layout chunks
    // are ours.
    if (/\/(page|layout|main-app)-/.test(src)) firstParty += size;
  }

  const cssHrefs = [...html.matchAll(/href="(\/_next\/static\/css\/[^"]+)"/g)].map((m) => m[1]);
  let css = 0;
  for (const href of new Set(cssHrefs)) {
    const abs = join(OUT, href);
    if (existsSync(abs)) css += gz(abs);
  }

  const budgets = budgetsFor(rel);

  const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
  const verdict = (n, b) => {
    if (n > b) {
      failed = true;
      return `OVER (budget ${kb(b)})`;
    }
    return `ok (budget ${kb(b)})`;
  };

  console.log(`\n${rel}`);
  console.log(`  JS modern      ${kb(modern).padStart(9)}   ${verdict(modern, budgets.jsModern)}`);
  console.log(`  JS legacy      ${kb(legacy).padStart(9)}   ${verdict(legacy, budgets.jsLegacy)}`);
  console.log(`  JS first-party ${kb(firstParty).padStart(9)}   ${verdict(firstParty, budgets.jsFirstParty)}`);
  console.log(`  CSS            ${kb(css).padStart(9)}   ${verdict(css, budgets.css)}`);
}

console.log(`\n${"=".repeat(72)}`);
if (failed) {
  console.error("\nBUDGET EXCEEDED.\n");
  console.error("Before raising a budget, check whether an island can be a Server");
  console.error("Component instead — the allowlist exists to make that the default.");
  console.error("If the route is genuinely not a reader's page, it belongs in");
  console.error("ROUTE_BUDGETS at the top of this file, with its measurement.\n");
  process.exit(1);
}
console.log("All budgets within limits.\n");
