/**
 * Rule tests. Every "invalid" case below is a real defect from the
 * discarded prototype (implementation_plan.md §2) or a named prohibition
 * from §3.3. An unverified lint rule is decoration.
 */

import { RuleTester } from "eslint";
import test from "node:test";

import noDirectBackendImport from "../rules/no-direct-backend-import.js";
import noHardcodedStats from "../rules/no-hardcoded-stats.js";
import noArbitraryDesignValues from "../rules/no-arbitrary-design-values.js";
import noProhibitedCopy from "../rules/no-prohibited-copy.js";

RuleTester.describe = test.describe;
RuleTester.it = test.it;

const jsx = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

/* ── RULE 1 — the decoupling boundary ─────────────────────────────────── */
jsx.run("no-direct-backend-import", noDirectBackendImport, {
  valid: [
    {
      code: `import { createClient } from '@brs/content-client';`,
      filename: "/repo/apps/web/src/lib/content.ts",
    },
    {
      // The façade adapter is the ONE place CMS access is legal.
      code: `import { createDirectus } from '@directus/sdk';`,
      filename: "/repo/apps/api/src/adapters/directus.ts",
    },
    {
      code: `const url = process.env.NEXT_PUBLIC_BRS_API;`,
      filename: "/repo/apps/web/src/lib/content.ts",
    },
  ],
  invalid: [
    {
      code: `import { createDirectus } from '@directus/sdk';`,
      filename: "/repo/apps/web/src/app/page.tsx",
      errors: [{ messageId: "forbiddenModule" }],
    },
    {
      code: `import { Pool } from 'pg';`,
      filename: "/repo/apps/web/src/lib/db.ts",
      errors: [{ messageId: "forbiddenModule" }],
    },
    {
      code: `const t = process.env.DIRECTUS_TOKEN;`,
      filename: "/repo/apps/web/src/lib/content.ts",
      errors: [{ messageId: "forbiddenEnv" }],
    },
    {
      code: `await fetch('http://localhost:8055/items/events');`,
      filename: "/repo/apps/web/src/lib/content.ts",
      errors: [{ messageId: "forbiddenFetch" }],
    },
  ],
});

/* ── RULE 2 — the "480+" defect ───────────────────────────────────────── */
jsx.run("no-hardcoded-stats", noHardcodedStats, {
  valid: [
    {
      code: `export function Row({ stats }) { return <span>{stats.workshops}</span>; }`,
      filename: "/repo/apps/web/src/components/StatReadout.tsx",
    },
    {
      // Exact, unsuffixed figures are the whole point.
      code: `const label = '19 WORKSHOPS';`,
      filename: "/repo/apps/web/src/components/StatReadout.tsx",
    },
    {
      // Years are not statistics.
      code: `const YEARS = [2005, 2012, 2024];`,
      filename: "/repo/apps/web/src/components/ZoneA_Opening.tsx",
    },
  ],
  invalid: [
    {
      // The literal prototype string.
      code: `const s = '480+ ACTIVE MEMBERS';`,
      filename: "/repo/apps/web/src/components/StatReadout.tsx",
      errors: [{ messageId: "plusSuffix" }],
    },
    {
      code: `const s = '35+';`,
      filename: "/repo/apps/web/src/components/landing/ZoneD_RecordStrip.tsx",
      errors: [{ messageId: "plusSuffix" }],
    },
    {
      code: `const s = '~40 workshops';`,
      filename: "/repo/apps/web/src/components/StatReadout.tsx",
      errors: [{ messageId: "approxSuffix" }],
    },
    {
      code: `const members = 480;`,
      filename: "/repo/apps/web/src/components/StatReadout.tsx",
      errors: [{ messageId: "hardcodedNumber" }],
    },
  ],
});

/* ── RULE 3 — tokens and banned utilities ─────────────────────────────── */
jsx.run("no-arbitrary-design-values", noArbitraryDesignValues, {
  valid: [
    { code: `const a = <div className="bg-bg-base text-text-primary" />;` },
    { code: `const a = <div className="border-line-hairline rounded-none" />;` },
    // var() references point back at tokens, so they are legitimate.
    { code: `const a = <div className="grid-cols-[var(--brs-grid)]" />;` },
    { code: `const a = <div className="aspect-[4/5]" />;` },
    { code: `const a = <div className="shadow-none" />;` },
  ],
  invalid: [
    {
      // The prototype's cyan.
      code: `const a = <div className="bg-[#22d3ee]" />;`,
      errors: [{ messageId: "arbitrary" }],
    },
    {
      code: `const a = <div className="text-[13px]" />;`,
      errors: [{ messageId: "arbitrary" }],
    },
    {
      // The glowing stat card.
      code: `const a = <div className="shadow-lg" />;`,
      errors: [{ messageId: "bannedShadow" }],
    },
    {
      code: `const a = <div className="backdrop-blur-md" />;`,
      errors: [{ messageId: "bannedEffect" }],
    },
    {
      // The gradient headline. One report per banned category per attribute
      // — deliberately not one per class, which would be noise.
      code: `const a = <div className="bg-gradient-to-r from-cyan-400 to-lime-300" />;`,
      errors: [{ messageId: "bannedGradient" }],
    },
    {
      code: `const a = <div className="rounded-2xl" />;`,
      errors: [{ messageId: "bannedRadius" }],
    },
  ],
});

/* ── RULE 4 — the prototype's copy ────────────────────────────────────── */
jsx.run("no-prohibited-copy", noProhibitedCopy, {
  valid: [
    {
      code: `const s = 'Robots designed, built and campaigned at BUET since 2005.';`,
      filename: "/repo/apps/web/src/components/ZoneA.tsx",
    },
    {
      code: `const s = 'Panasonic Award, ABU Robocon 2005.';`,
      filename: "/repo/apps/web/src/components/ZoneD.tsx",
    },
  ],
  invalid: [
    {
      // Verbatim from the screenshot.
      code: `const s = "Bangladesh's premier engineering collective.";`,
      filename: "/repo/apps/web/src/components/ZoneA.tsx",
      errors: [{ messageId: "prohibited" }, { messageId: "prohibited" }],
    },
    {
      code: `const s = 'Shaping the Future of Autonomous Robotics';`,
      filename: "/repo/apps/web/src/components/ZoneA.tsx",
      errors: [{ messageId: "prohibited" }],
    },
    {
      code: `const s = 'high-performance robotic systems';`,
      filename: "/repo/apps/web/src/components/ZoneA.tsx",
      errors: [{ messageId: "prohibited" }],
    },
    {
      code: `const s = 'compete on the global stage';`,
      filename: "/repo/apps/web/src/components/ZoneA.tsx",
      errors: [{ messageId: "prohibited" }],
    },
    {
      code: `const a = <button>Get Started</button>;`,
      filename: "/repo/apps/web/src/components/Cta.tsx",
      errors: [{ messageId: "prohibited" }],
    },
    {
      code: `const s = 'Lorem ipsum dolor sit amet';`,
      filename: "/repo/apps/web/src/components/ZoneA.tsx",
      errors: [{ messageId: "prohibited" }],
    },
  ],
});
