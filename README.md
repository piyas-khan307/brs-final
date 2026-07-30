# BUET Robotics Society

Website and content platform for BUET Robotics Society — a twenty-year-old
engineering institution with a 2 GB archive spanning ABU Robocon 2005 to
Robo Carnival 2024.

**Governing documents**

| Document | Contains |
| --- | --- |
| [`PROJECT_SPEC.md`](PROJECT_SPEC.md) | Vision, design system, IA, the anti-pattern register |
| [`implementation_plan.md`](implementation_plan.md) | Execution plan, architecture, the Landing Gate |
| [`docs/adr/`](docs/adr/) | Architecture decision records |

Where the two specs conflict, `implementation_plan.md` wins.

---

## Current phase

**Phase 0 — foundation.** Complete. See "Phase 0 status" below.

**Phase L — landing page — has NOT started.** Per `implementation_plan.md`
§5.3, nothing else on the frontend track may be built until the landing page
passes the Landing Gate. `apps/web/src/app/page.tsx` is currently a **token
proof sheet**, not the landing page; delete it when Phase L begins.

---

## Architecture in one screen

```
Plane 4  DELIVERY    Next.js 15, output:'export'  →  static, no runtime backend dep
              ▲ build-time fetch · webhook rebuild
Plane 3  CONTRACT    Hono façade · /v1/* · OpenAPI 3.1 · @brs/contract
              ▲ one adapter file — the ONLY CMS-aware code in the repo
Plane 2  AUTHORING   Directus 11 — a UI over our schema, not the owner of data
              ▲ SQL
Plane 1  DATA        PostgreSQL (source of truth) · object storage · SharePoint sync
```

Swap the frontend → Planes 1–3 untouched. Swap the CMS → the contract and
frontend untouched. See [ADR 0001](docs/adr/0001-decoupling-boundary.md).

---

## Getting started

```sh
pnpm install
docker compose up -d postgres directus   # Plane 1 + 2 (requires a running Docker daemon)
pnpm --filter @brs/web dev               # http://localhost:3000
```

Copy `.env.example` to `.env` first. The frontend reads exactly one backend
coordinate: `NEXT_PUBLIC_BRS_API`.

---

## The gates

Run everything CI runs:

```sh
pnpm gate
```

| Gate | Command | Guards |
| --- | --- | --- |
| PII self-test | `pnpm audit:pii:selftest` | That the PII scanner itself works |
| PII scan | `pnpm audit:pii` | No phone number reaches a shippable surface |
| Schema | `node packages/db/scripts/verify-schema.mjs` | No contact column can ever exist |
| Lint rules | `node --test tools/eslint-plugin-brs/test/rules.test.mjs` | That the five custom rules fire |
| Contract | `pnpm --filter @brs/contract test` | DTO guarantees, incl. privacy |
| Budgets | `node scripts/check-budgets.mjs` | Measured gzip weight vs §4.7 |

### The five custom lint rules

Each guards a failure this project has already demonstrated it is prone to
(`implementation_plan.md` §13.4):

1. `no-direct-backend-import` — protects the decoupling boundary
2. `no-hardcoded-stats` — the prototype shipped "480+ active members"; two of
   its four figures were false
3. `no-arbitrary-design-values` — tokens are the single source; also bans
   `shadow-*`, gradients, `backdrop-blur`, large radii
4. `no-prohibited-copy` — fails the build on *premier, world-class,
   empowering, shaping the future, collective*…
5. `client-component-allowlist` — every `'use client'` needs a written reason

---

## Non-negotiables

**Personal phone numbers.** ~470 students' mobile numbers sit in the source
rosters (`pnpm audit:pii --scan-archive` reports 386 across 22 files). Five
layered controls keep them out: no DB column, parser drops them, no DTO field,
Directus field allowlist, and a CI gate that fails the build. The gate cannot
read numbers rendered *inside* poster images — those need manual review before
launch.

**No number is typed by hand.** Every figure comes from the computed
`StatsDTO`. No `+` suffixes: precision is the brand.

**No fabricated results.** `achievements.verified` defaults false and a stated
result requires attribution at the database level. The Panasonic Award (ABU
Robocon 2005) is currently the only placement evidenced in the entire archive.

**Colour comes from the logo, measured.** Petrol `#0E516E` (33.2 %), bone
(30.9 %), oxblood `#7B1223` (17.9 %), graphite (14.3 %) — by pixel-frequency
analysis of 1,878,553 opaque pixels. Never "modernised" toward cyan. Accent is
never a glow.

---

## Phase 0 status

| Item | State |
| --- | --- |
| Monorepo, workspaces, Turborepo | done |
| Design tokens (`apps/web/src/app/globals.css`) | done — verified in compiled CSS |
| PII gate | done — 9/9 self-test, catches seeded numbers |
| 5 custom lint rules | done — 33/33 rule tests |
| Contract + typed client + OpenAPI | done — 6/6 tests, `MemberDTO` has no contact field |
| Postgres schema | written; **not yet applied to a live database** (Docker daemon unavailable) |
| API façade skeleton | done — `/v1/health` only; routes are Phase B1 |
| Next.js app + token proof sheet | done — builds, budgets pass |
| CI workflow | written; **not yet executed on a runner** |
| Fonts | **outstanding** — see `apps/web/src/app/fonts/README.md` |

---

## Blocked, and needing people outside the build team

| # | Item | Blocks |
| --- | --- | --- |
| §16.2 | Competition results for Robocon, IRC, iARC, Lunabotics, URC, ERC — needs alumni outreach. **Longest lead item in the project.** | Achievements, Zone D |
| §16.4 | Team NUVOLA: what it is, roster, spec, photographs. One unrenderable HEIC is all that exists. | Team NUVOLA, Zone F |
| §16.9–11 | Directory scope, photograph consent, minors in Robotics Olympiad imagery — **ExCom decisions, not engineering calls** | Member Directory, Gallery |
| §16.12 | SharePoint tenant/site/library IDs + app registration from BUET IT | Asset sync |
| §16.13 | Cloudflare R2 vs Azure Blob | Storage |
