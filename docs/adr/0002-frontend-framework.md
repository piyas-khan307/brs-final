# ADR 0002 — Next.js 15 with static export

**Status** Accepted (client decision) · **Date** 30 July 2026
**Closes** `implementation_plan.md` §16.14

## Context

`PROJECT_SPEC.md` §11 recommended Astro 5 for the delivery frontend: the site
is a 1,105-image static archive with near-zero interactivity, and Astro ships
zero JS by default. The discarded prototype was Next.js.

The client selected **Next.js 15 with Tailwind CSS**. React familiarity is the
binding constraint, and ADR 0001 makes the frontend the most replaceable layer
in the system — so this is a reversible decision, which is the point.

## Decision

Next.js 15, App Router, `output: 'export'`, Tailwind CSS 4.

Static export is **mandatory, not preferred**: it is what preserves the
property established in ADR 0001 — the public site does not depend on the
backend at runtime.

## Consequences

### The JS budget had to be revised, and it was revised down-front rather than missed

The original `< 35 KB JS` and `Perf ≥ 98` targets were predicated on Astro's
zero-JS output. They are not achievable here. Measured on the Phase 0 build:

| Metric | Measured | Budget |
| --- | --- | --- |
| JS modern (excl. `noModule` polyfills) | **100.3 KB gz** | ≤ 125 KB |
| JS legacy (all referenced) | **139.0 KB gz** | ≤ 165 KB |
| JS first-party | **0.2 KB gz** | ≤ 15 KB |
| CSS | **4.2 KB gz** | ≤ 24 KB |

That 100.3 KB is the React 19 + App Router floor with essentially *no*
application code. The budget is therefore split into a fixed framework cost
and a first-party cost, so regressions are attributable to whoever caused
them.

`LCP < 1.6s` and `CLS < 0.02` survive unchanged — the page is statically
rendered with a preloaded hero and explicit image dimensions, so the JS is
hydration-only and does not block the largest paint. What genuinely degrades
is TBT/INP on mid-tier Android, hence `INP < 200ms` rather than 150ms.

### Accepted losses from `output: 'export'`

No Route Handlers, Server Actions, middleware, ISR, or built-in image
optimization. Do not work around these:

- Forms POST to the façade Worker — better for decoupling anyway; form logic
  does not belong in the swappable layer.
- Directus webhook triggers a rebuild; publish-to-live under three minutes.
- A custom `next/image` loader points at our own façade, which additionally
  keeps object storage swappable.

### New enforcement

`brs/client-component-allowlist` requires every `'use client'` file to be
declared in `apps/web/config/client-allowlist.json` with a written reason.
The framework floor is fixed, so first-party JS is the only budget the team
controls, and it erodes one convenient `'use client'` at a time. Phase L
permits exactly two islands: `ZoneRail` and `ZoneD_RecordStrip`.

Also banned: `framer-motion`. The motion spec is CSS transitions plus one
`scaleX` keyframe; a 40 KB animation library for a 400 ms hairline draw is
indefensible.

## Note on measurement

`next build` reported "First Load JS 103 kB", but the emitted HTML also
references a 39 KB polyfills bundle. It carries `noModule`, so modern browsers
skip it — but a budget check trusting the build summary would have been
measuring the wrong thing. `scripts/check-budgets.mjs` therefore parses the
built HTML and gzips the actual referenced files.
