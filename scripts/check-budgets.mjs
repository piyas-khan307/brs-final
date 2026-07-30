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

  const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
  const verdict = (n, b) => {
    if (n > b) {
      failed = true;
      return `OVER (budget ${kb(b)})`;
    }
    return `ok (budget ${kb(b)})`;
  };

  console.log(`\n${rel}`);
  console.log(`  JS modern      ${kb(modern).padStart(9)}   ${verdict(modern, BUDGETS.jsModern)}`);
  console.log(`  JS legacy      ${kb(legacy).padStart(9)}   ${verdict(legacy, BUDGETS.jsLegacy)}`);
  console.log(`  JS first-party ${kb(firstParty).padStart(9)}   ${verdict(firstParty, BUDGETS.jsFirstParty)}`);
  console.log(`  CSS            ${kb(css).padStart(9)}   ${verdict(css, BUDGETS.css)}`);
}

console.log(`\n${"=".repeat(72)}`);
if (failed) {
  console.error("\nBUDGET EXCEEDED. See implementation_plan.md §4.7.\n");
  console.error("Before raising a budget, check whether an island can be a Server");
  console.error("Component instead — the allowlist exists to make that the default.\n");
  process.exit(1);
}
console.log("All budgets within limits.\n");
