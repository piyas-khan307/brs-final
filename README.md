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

**Phase 0 — foundation.** Complete.

**Phase L — landing page.** Complete. `apps/web/src/app/page.tsx` is the
motion sheet; the earlier static design is kept at `/sheet-01`.

**Phase B — backend, uploader, admin panel.** Complete. Postgres, object
storage, the `/v1` façade, the ingest pipeline, Docker images, and a custom
admin panel at `/admin`.

**Phase C — the remaining pages.** In progress. `/executive-committee` ships
with the 11th Executive Committee, 84 people loaded through the real
pipeline. Twelve pages remain.

**Known gaps, all of them because the source does not say:** the 11th
committee's term years, two members' portraits, and every committee before
the 11th. See [`docs/ADMIN.md`](docs/ADMIN.md).

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

## Running it

**First time only:**

```sh
cp .env.example .env              # the defaults work as-is for local dev
pnpm install
docker compose up -d              # postgres, minio, directus (needs Docker running)
pnpm --filter @brs/db migrate     # create/update the schema
pnpm --filter @brs/cms configure  # roles, permissions, admin-panel labels
```

**Every time after that:**

```sh
docker compose up -d              # the three containers
pnpm dev                          # api, uploader and website together
```

That's it — two commands. `pnpm dev` runs all three Node services at once
(`turbo run dev`); stop them with Ctrl-C.

| What | Where |
| --- | --- |
| **The website** | http://localhost:3000 |
| **The admin panel** | http://localhost:3000/admin/login |
| The committee page | http://localhost:3000/executive-committee |
| API (read-only, public) | http://localhost:8787/v1/health |
| Uploader (internal only) | http://localhost:8790/health |
| Directus — developer fallback | http://localhost:8055 |
| MinIO console — object storage | http://localhost:9001 |

Local accounts are created by the setup above and by
`docs/ADMIN.md`; the dev Administrator is `admin@example.com` /
`dev-only-change-me`. **Change both before this is on the internet.**

### If the website shows stale content

The site is a static export, so it reads content at BUILD time. After
editing in the admin panel, regenerate and restart:

```sh
pnpm --filter @brs/web content    # re-fetch from the API into src/lib/*.generated.ts
```

Needs the API running. In production a Directus Flow calls a build hook
instead — see `REBUILD_WEBHOOK_URL` in `.env.example`.

### Do not run `pnpm build` while `pnpm dev` is running

They share `apps/web/.next`, so a build overwrites files the dev server is
still holding open. Every page then 500s with `Cannot find module './330.js'`
— which reads like a code error and is not one.

```sh
rm -rf apps/web/.next    # then start pnpm dev again
```

Setting a separate `distDir` for the build was tried and is not the fix: with
`output: "export"` Next puts the exported site there instead of the build
cache, leaving three output directories and the same collision.

### If nothing loads

```sh
docker compose ps                 # are the three containers up and healthy?
curl localhost:8787/v1/health     # is the API talking to Postgres?
```

A blank admin panel with console errors about CORS means Directus is not
running, or `CORS_ORIGIN` in `docker-compose.yml` does not match the address
you are browsing from.

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
