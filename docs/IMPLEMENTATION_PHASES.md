# BRS — Implementation Phases

**Status:** Landing page approved. Moving to real implementation.
**Date:** 2026-07-31
**Supersedes:** nothing. Sits under `implementation_plan.md` as the execution schedule.

---

## 0. Where we actually are

| Plane | Component | State |
| --- | --- | --- |
| 1 · Data | `packages/db` | 17-table schema written. **Never applied to a live database.** |
| 2 · Authoring | Directus 11 | Container defined in `docker-compose.yml`. Never started. |
| 3 · Contract | `packages/contract` | Zod DTOs + client, tested 6/6. **Imported by nothing.** |
| 3 · Façade | `apps/api` | Hono app with `/v1/health` only. All other routes return 501. |
| 4 · Delivery | `apps/web` | **Live.** Landing page approved and running. |

### What exists on the frontend today

| Route | File | Status |
| --- | --- | --- |
| `/` | `app/page.tsx` | Approved. Rover sequence → The record → Gallery → Archive. |
| `/sheet-01` | `app/sheet-01/page.tsx` | The earlier static design, preserved as reference. |

All content is currently **baked in at author time**: hardcoded constants plus four
generated manifests (`plates`, `showcase`, `sequence`, `brand`) produced by
`scripts/prepare-*.mjs`. Nothing is fetched at runtime.

**Phase B4 is the moment that changes.**

---

## 1. Two decisions that shape everything below

### 1.1 Media storage — S3 adapter, env-configured

Requested: pluggable storage across Cloudflare R2, Azure and AWS with no code changes.

**Correction, stated up front:** R2, AWS S3, MinIO, Backblaze B2 and DigitalOcean
Spaces all speak the S3 API and *are* swappable by environment variable alone.
**Azure Blob Storage has no S3 API.** It requires `@azure/storage-blob`. Any claim
that a pure S3 adapter covers Azure without code is false.

What gets built instead:

```
StorageAdapter                 ← narrow interface
  put() get() delete() exists() signedUrl() publicUrl()
        │
        ├── S3Adapter          ← ships in B2. R2 · AWS · MinIO · B2 · Spaces
        └── AzureAdapter       ← ~120 lines, added only if Azure is ever chosen
```

Everything above the interface — the façade, the ingest scripts, the image loader —
is written against `StorageAdapter` and never against a vendor SDK. Adding Azure
later is **one new file plus one env value**, not a refactor. That is the honest
version of the requirement, and it is materially better than pretending otherwise.

Configuration is entirely environmental:

```bash
STORAGE_DRIVER=s3                    # s3 | azure (later)
STORAGE_ENDPOINT=                    # blank for AWS; <acct>.r2.cloudflarestorage.com for R2
STORAGE_REGION=auto
STORAGE_BUCKET=brs-assets
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=
STORAGE_FORCE_PATH_STYLE=true        # true for MinIO/R2, false for AWS
STORAGE_PUBLIC_BASE_URL=             # CDN origin, if fronted
```

Switching R2 → AWS is editing four values. No rebuild of application code.

### 1.2 Hosting — fully containerized

Every service ships as an image. Nothing is bound to a specific host.

```
web       multi-stage → static export → nginx:alpine     (~25 MB)
api       multi-stage → node:22-alpine → distroless      (~80 MB)
directus  directus/directus:11                            (upstream)
postgres  managed in production; postgres:16-alpine local
minio     local development only — removes the cloud dependency for dev
```

`docker compose up` reproduces the whole stack anywhere: a VPS, Fly, Cloud Run,
Render, a university server. No provider-specific configuration.

---

## 2. The phases

### Phase B1 · Data plane live

**Goal:** the schema exists in a real database for the first time, and its
invariants are demonstrated rather than assumed.

| # | Task | Output |
| --- | --- | --- |
| 1 | `docker compose up -d postgres` | Running Postgres 16 |
| 2 | Confirm `0001_init.sql` auto-applied via `docker-entrypoint-initdb.d` | 17 tables |
| 3 | Enumerate tables, columns, constraints, indexes against the migration | Diff report |
| 4 | **Adversarial constraint tests** — see below | Pass/fail per invariant |
| 5 | `0002_*.sql` for anything the live database rejects | Migration |
| 6 | Extend `verify-schema.mjs` to run against a live connection | CI-usable check |

**The adversarial tests are the point of this phase.** Static SQL parsing was all
that was possible without Docker; it cannot prove a constraint fires. Each of these
must be rejected by the database:

- `INSERT INTO assets (alt, …) VALUES ('', …)` → violates `length(btrim(alt)) >= 12`
- `INSERT INTO assets (alt, …) VALUES ('photo.jpg', …)` → filename-shaped alt text
- `INSERT INTO achievements (result, verified) VALUES ('1st Place', false)` → violates `result_needs_verification`
- `INSERT INTO achievements (verified) VALUES (true)` with no source → violates `verified_needs_attribution`
- `ALTER TABLE members ADD COLUMN contact_no text` → must be caught by the schema guard

**Exit criteria:** every invariant above demonstrably enforced by Postgres, not by
convention.

---

### Phase B2 · Storage — ✅ done

**Goal:** assets live in object storage, addressed immutably, pluggable by env.

| # | Task | Output | |
| --- | --- | --- | --- |
| 1 | `packages/storage` — `StorageAdapter` interface | 6 methods, provider-free | ✅ |
| 2 | `S3Adapter` on AWS SDK v3 | R2 · AWS · MinIO · B2 · Spaces · Wasabi · Ceph | ✅ |
| 3 | MinIO + `minio-init` in `docker-compose.yml` | Local dev, no cloud account | ✅ |
| 4 | Content-addressed key scheme | `sha256/ab/cd/<64 hex>.<ext>` | ✅ |
| 5 | `packages/storage/scripts/upload-assets.ts` | 150 objects · 35 `assets` · 150 derivatives | ✅ |
| 6 | Wire `image-loader.ts` to the storage base URL | The storage seam | ✅ |
| 7 | Adapter tests | 31 passing, incl. live MinIO | ✅ |

**Why content-addressed:** a hash-named object can be cached forever and can never
go stale. Re-uploading identical bytes is a no-op — proved: the second `upload` run
transferred **0 bytes**. It also makes the derivative pipeline idempotent, and it
stops original filenames (which carry committee and personal names) from appearing
in a public bucket listing (§12.1).

**What got uploaded — and what deliberately did not.** 150 renditions of 35
photographs from `public/plates` and `public/showcase`, 5.44 MB. The 240 rover
sequence frames and the brand marks stayed in `public/`: they are *build artefacts*,
not content. They never change without a code change, `assets.alt` would have to
describe 240 near-identical frames of one render, and uploading them would drop
animation frames into the editor's media library where they are noise.

**One row per manifest entry, not per photograph.** 38 entries resolve to 23 distinct
photographs — thirteen appear in several collections at different crops. They are
stored as separate rows because `public/` holds derivatives, not masters; the masters
are in the gitignored `BRS/` folders and have not been ingested. This also maps 1:1
onto what the components consume today, which is what makes the B4 swap possible
without touching them.

**Two schema/reality conflicts found by loading real data:**

- **Fixed —** `assets_ratio_check` permitted only `1:1 · 3:2 · 16:9 · 4:5`, so nine
  640×480 archive photographs were refused. 640×480 is exactly 4:3, and
  `prepare-showcase.mjs` has been emitting `ratio: "4:3"` since the motion sheet was
  built — the design already rendered it, the enum had never been told. Migration
  `0003` and `AspectRatio` in the contract now agree.
- **Open —** three press-clipping scans carry `ratio: null` (360×593, 360×303,
  360×410). A newspaper cutting has no design frame. `assets.ratio` is NOT NULL and
  `ImageDTO.ratio` is required, so they cannot load without a modelling decision:
  make ratio nullable, crop the scans (destroys evidence), or add a fifth ratio.
  **Their bytes are in the bucket; their rows are not.** See §5.

**Exit criteria met:** an asset is written and read through the interface against
MinIO with no provider-specific code, served over HTTP at the advertised
`publicUrl` with `Cache-Control: immutable`, and the same conformance suite passes
against both `MemoryAdapter` and `S3Adapter`.

```bash
docker compose up -d postgres minio minio-init
cp .env.example .env
pnpm --filter @brs/storage upload      # idempotent
pnpm --filter @brs/storage reconcile   # rows vs. bucket, read-only
```

---

### Phase B3 · API façade — ✅ done

**Goal:** `/v1/*` returns real, contract-valid data.

| # | Task | Output | |
| --- | --- | --- | --- |
| 1 | `apps/api/src/adapters/postgres.ts` | The only SQL-aware file | ✅ |
| 2 | Implement every route | 15 endpoints | ✅ |
| 3 | Validate **every response** against its Zod schema before it leaves | Contract enforcement | ✅ |
| 4 | Pagination, filtering, sorting per `§7.2` | Opaque-cursor query layer | ✅ |
| 5 | Tests against the live database | 23 passing, 0 skipped | ✅ |
| 6 | Regenerate `openapi.json` | 15 paths, 11 schemas | ✅ |

**Architectural note — Postgres directly, and Directus removed from the read path.**
`implementation_plan.md` had the façade reading *through* Directus, and
`adapters/directus.ts` called itself "the only CMS-aware file in the repository".
The intent was right; the implementation put a **UI in the runtime path of content
delivery**, so a Directus outage, upgrade, or licence change (risk 10) would have
stopped builds. Plane 1 is the source of truth and Directus "reads this schema; it
does not define it" — so the façade now reads Plane 1 and the CMS is not involved.
`adapters/directus.ts` was deleted, not kept as an option: two adapters where only
one is ever correct is a decision left lying around. *"If Directus is replaced,
rewrite one file"* became *"delete one container"*.

**Runtime change — Node, not Cloudflare Workers.** The package was scaffolded
against `@cloudflare/workers-types` with a `wrangler dev` script and **no
`wrangler.toml`**, so it had never actually run. It could not: Workers cannot open a
raw TCP socket to Postgres without Hyperdrive, which requires the database to be
publicly reachable — which a container on a private Docker network deliberately is
not. Now `@hono/node-server`, which is what §B6 always planned to containerize. The
routes stay runtime-agnostic; only `src/server.ts` knows it is on Node.

**Two contract corrections, both forced by real data:**

- **`ImageDTO.sources` added** (additive and optional, legal under rule 3). The
  original design sized images with `?w=720&fmt=avif` against a transform endpoint.
  That cannot work here: a content-addressed key is a hash of the file's *bytes*, so
  no pure function derives it from an id and a width — and a transform service would
  reintroduce the always-on runtime dependency `output: "export"` exists to remove.
  Derivative URLs now travel with the image, which is what a `<picture>` needs anyway.
- **`openapi.json` documented 11 paths against a façade serving 15.** The four
  missing were `/health`, `/committees/{ordinal}`, `/posts/{slug}` and
  `/assets/{id}` — the last being the storage seam, the one a consumer could least
  afford to guess. The document is the artefact of record (§7.1 rule 4); one that
  under-describes the surface is a lie by omission. Generator fixed; **15/15**.

**`/v1/stats` returns 503, deliberately.** With no events and no achievements
loaded, `earliestEvidenceYear` has no truthful value — and `0`, `1970`, or a
founding year copied off a poster are all exactly the §2.3 fabrication this endpoint
exists to prevent. It answers 503 with a machine-readable reason and flips to 200
the moment content lands. Documented in the OpenAPI response set so a consumer does
not treat it as an outage and retry forever.

**`/v1/assets/{id}` redirects (302), it does not proxy.** Proxying would put a Node
process in the path of every image on every page load, turning a stateless façade
into a bandwidth-bound service and re-coupling page loads to backend uptime. The
redirect target is built by `@brs/storage` from `STORAGE_PUBLIC_BASE_URL`, so the
provider stays swappable. 302 not 301: a re-crop produces new bytes and therefore a
new key, and a permanent redirect would pin the old one in every browser cache.

**Known exclusion, needs a decision.** `EventDTO.cover` is required, so a published
event with no cover photograph cannot be represented and is filtered out. Early
committees genuinely have events with no surviving photograph, so making `cover`
optional is the honest fix — but it changes a published field's type. The count is
exposed on `/v1/health` as `eventsWithoutCover` so the omission is never silent.
Currently **0**, because there are no events yet; this is the free moment to decide.

**Endpoints — all 15 live:**

```
/v1/health            /v1/events            /v1/events/{slug}
/v1/committees        /v1/committees/{ordinal}
/v1/members           /v1/achievements      /v1/projects/{slug}
/v1/posts             /v1/posts/{slug}      /v1/partners
/v1/press             /v1/gallery           /v1/stats
/v1/assets/{id}
```

**Exit criteria met.** Every endpoint returns schema-valid data, validated by the
façade itself before sending. `/v1/gallery` serves the 35 real assets from B2 with
full AVIF+WebP srcsets, and following `/v1/assets/{id}` reaches the actual bytes:

```
GET /v1/assets/1b5abec2…  →  302  →  MinIO  →  200 image/avif  183,963 bytes
```

```bash
docker compose up -d postgres minio minio-init
pnpm --filter @brs/api dev     # http://localhost:8787/v1/health
pnpm --filter @brs/api test    # 23 tests against the live database
```

---

### Phase B4 · The frontend swap — *the Directive 3 test* — ✅ **PASSED**

**Goal:** components read from the API. **Zero component files change.**

| # | Task | Output | |
| --- | --- | --- | --- |
| 1 | Activate `apps/web/src/lib/content.ts` | Used by the build-time fetch | ✅ |
| 2 | Replace `*.generated.ts` sources with API fetches | Data source swapped | ✅ |
| 3 | Build-time reads send `cache-control: no-cache` | Fresh builds | ✅ |
| 4 | Verify the rendered output | 90 storage refs, 0 local | ✅ |

**Result: zero component or page files touched.**

```
files modified under apps/web/src during B4:
  src/lib/plates.generated.ts      ← regenerated from /v1
  src/lib/showcase.generated.ts    ← regenerated from /v1

files modified under src/components or src/app:   0
export surface of the generated modules:          IDENTICAL
```

The data path changed completely underneath:

```
BEFORE   "/plates/hero-rc19-480.avif"                    (a file on disk)
AFTER    "…/brs-assets/sha256/b05b3378…461d5dd4.avif"    (Postgres → /v1 → object storage)
```

Three layers — database, contract, storage — were inserted beneath the UI, and the
UI did not notice. That is the test, and it passed.

#### Why codegen rather than `await` in a component

`KeyFacts`, `HorizontalGallery` and `GridAssembly` are `"use client"` — they drive
GSAP timelines against real DOM nodes, so they cannot await, and passing the data as
props would change every component signature, which is the exact thing this phase
forbids. And `output: "export"` means there is no server at request time anyway. In
a static export, "fetch at build time" and "generate a module at build time" produce
the *same artefact*; the only difference is where the fetch happens.

```bash
pnpm --filter @brs/web content         # regenerate from the API
pnpm --filter @brs/web content:check   # CI: fail if stale
```

`content` is a deliberate step, not a `prebuild` hook: making every `next build`
require a live API would break offline builds. The deploy sequence is
**start API → `content` → `next build`**, which is also what the §B5 publish webhook
will trigger.

#### What the phase found: the curation was never moved

B2 put the photographs in Postgres. It did not move the part that actually changes —
which photograph appears in which section, in what order, with what placard text and
which plate number. **26 captions, 26 plate numbers, 5 titles/years/notes** were
hand-written inside files headed *"GENERATED — do not edit by hand"*. So the landing
page could only be rearranged by a developer editing a generated file and
redeploying: precisely what the CMS exists to prevent.

`collections` / `collection_items` (migration 0004) fix that. **A collection is
deliberately not an event** — an event happened on a date, a collection is an order
somebody chose for a page. Modelling the contact sheet as an event would have meant
inventing an event that never occurred, purely to hang captions off (§8).

**42 items across 6 collections:** `features` 4 · `key-facts` 2 · `gallery` 5 ·
`assembly` 9 · `contact-sheet` 19 · `press` 3.

#### Three further findings

- **A silent data loss in the B2 upload.** `FEATURES` is a `Record`, not an array,
  and the upload script tested `Array.isArray`. Four assets — including the site's
  **hero** — never reached the bucket, and nothing failed: the run reported "38
  assets" and looked complete. Now shape-detects the *values*, not the container.
  42/42 assets.
- **Position is not identity (migration 0005).** Pages reach into a collection by
  name — `FEATURES["hero-rc19"]`. With order as the only identity, an editor
  dragging an item in the CMS would silently change which photograph is the hero:
  the page still builds, still validates, and is wrong. `collection_items.key` names
  a **role**, not a picture, and is unique within its collection.
- **Bundle grew 58.2 kB → 61.7 kB.** Content-addressed URLs are 64 hex characters
  where `/plates/hero-rc19-480.avif` was 26. That ~3.5 kB is the price of immutable
  caching and of not leaking committee and personal names through bucket listings —
  worth it, but it is a real cost and not free.

#### Press clippings — decision applied

`assets.ratio` is now **nullable** (0004), meaning *"intrinsic size, no design
frame"*. All three clippings load, keep their true shape, and carry their year.
Decision #5 is closed.

#### Decision required — rendering mode

| | **Static export** (current) | **Node server + ISR** |
| --- | --- | --- |
| Content change | rebuild, ~1–2 min | live in seconds |
| Backend offline | **site unaffected** | site degrades |
| Container | nginx, ~25 MB | node, ~180 MB |
| Hosting | anywhere, including a CDN | must run Node |

**Recommendation: keep static export.** "Backend downtime is invisible" was a stated
requirement, and for a club site that publishes a few times a month, a two-minute
rebuild on a publish webhook is the right trade. Revisit only if editors demand
instant preview.

---

### Phase B5 · Directus authoring

**Goal:** non-technical editors can publish without touching code.

| # | Task | Output |
| --- | --- | --- |
| 1 | Start Directus against the existing database | Running CMS |
| 2 | Map collections onto the **existing** tables | No schema drift |
| 3 | Mirror DB constraints as field validation | Errors at input, not insert |
| 4 | Roles: Editor (content only), Admin (no schema rights) | Least privilege |
| 5 | Publish webhook → rebuild trigger | Content goes live |

**Directus does not own the schema.** The migrations do. Directus is pointed at
tables it did not create and is not permitted to alter them. This is what keeps the
CMS replaceable.

---

### Phase B6 · Containerization and deploy

**Goal:** `docker compose up` reproduces production anywhere.

| # | Task | Output |
| --- | --- | --- |
| 1 | `apps/web/Dockerfile` — build → export → nginx:alpine | ~25 MB image |
| 2 | `apps/api/Dockerfile` — multi-stage node, non-root | ~80 MB image |
| 3 | `docker-compose.prod.yml` | Full stack |
| 4 | Healthchecks on every service | Orchestrator-ready |
| 5 | `.env.production.example` documenting every variable | Handover doc |
| 6 | No secrets in images; all runtime-injected | Security baseline |
| 7 | Deploy runbook | `docs/DEPLOY.md` |

**Exit criteria:** a clean machine with Docker can bring up the entire stack from
the repo plus an env file.

---

## 3. Phase C · Pages and features

The site is **fourteen routes plus utilities**. One is built.

Legend — **⬤ built** · **◐ data exists, page not built** · **○ blocked on content**

### C1 · Home ⬤ `/`

Built and approved. Rover sequence → The record → Selected events → Archive.
Phase B4 swaps its data source; the design does not change.

**Later addition:** partner logo row and press strip, once §16.5 vectors arrive.

---

### C2 · Events ◐

| Route | Content | Volume | Data |
| --- | --- | --- | --- |
| `/events` | Hub — six category plates with **computed** counts, chronological index, year filter | — | `events` |
| `/events/workshops` | **Strongest content in the archive.** Basic Workshop v1.0→v8.0 as a versioned series, plus specialised (PCB, Computer Vision, MATLAB, ML, Simulation) | 19 events, **18 with copy already written** | `events`, `event_segments` |
| `/events/competitions` | Competitions BRS **enters** — Robocon, IRC, iARC, NASA Lunabotics, URC/ERC, national | 6 programmes | `events`, `achievements` |
| `/events/intra-buet-robo-challenge` | Competitions BRS **hosts**, internal | 2 editions | `events` |
| `/events/robo-carnival` | Flagship hosted event | 5 editions, **183 photographs** | `events`, `event_assets` |
| `/events/seminars` | Sessions incl. the 2017 Mars Rover Challenge session | 11 events | `events` |
| `/events/freshers-reception` | Orientation, RoboGenesis, Robotic Inception | 5 events | `events` |

**Features:** year filter · category filter · day-by-day curriculum tables
(`SpecTable`) · photo plates per event · cross-links to Achievements.

**Content rules that must survive into the CMS:**
- Robo Carnival source copy is **future-tense with live Google Form links, deadlines
  and a bKash number**. All stripped; copy converted to past tense.
- Competition results are **never invented**. Until alumni confirm, publish
  photographs with verified filename metadata only. The DB enforces this.

---

### C3 · Executive Committee ◐

| Route | Content |
| --- | --- |
| `/executive-committee` | Hub + Governance section (5 AGMs — **copy already written**) |
| `/executive-committee/current` | 10th committee — 52 portraits at 1024×1024, full roster |
| `/executive-committee/previous` | 3rd–9th, via `CommitteeSwitcher` |
| `/executive-committee/[nth]` | Individual committee |

**Features:** `ContactSheet` grid grouped by Core Committee then seven teams ·
moderator presented first · committees lacking portraits fall back to a hairline
`SpecTable` roster (a legitimate archival presentation, not a failure state).

**Absolute requirement:** the `Contact no.` column is stripped from all seven
rosters. `members` has no contact column and a comment forbidding one; the PII gate
scans for phone numbers on every run.

**○ Gap:** 1st, 2nd and 6th committees are entirely absent. Either sourced, or the
gap is stated explicitly on the page. A silent jump 3rd→4th→5th→7th undermines the
archival claim.

---

### C4 · Achievements ◐ `/achievements`

The `RecordAxis`, 2005–2026. Three filterable tracks: International · National ·
Hosted. Each entry: year · competition · team · result · photograph · cross-link.

**This page carries the institutional argument** and is the most dependent on
missing data. Currently **exactly one** externally documented placement exists — the
Panasonic Award, ABU Robocon 2005, Beijing.

`achievements.result` is nullable and means *"competed, outcome unverified"* —
never *"no award"*. A CHECK constraint prevents recording a result without
verification.

**○ Blocked on:** alumni outreach. **Longest lead time on the project — start now.**

---

### C5 · Team NUVOLA ○ `/team-nuvola`

**Near-total content gap.** Exactly one asset exists: `brs/nuvola.heic`, 2.3 MB, in
a format no browser renders. No description, no roster, no specification.

Blueprint when content arrives: hero · mission · `SpecTable` of subsystems
(drivetrain, manipulator, power, comms, autonomy) · team structure · competition
record · build gallery · recruitment route.

**This page must not ship with placeholders.** It launches complete or it is held
back and removed from the nav. A prominent nav item leading to a stub is worse than
its absence.

---

### C6 · Explore ◐

| Route | Content | Features |
| --- | --- | --- |
| `/explore/members` | ~470 members, 3rd–10th committees | Client-side search (MiniSearch, prebuilt index) · filter by committee, team, department, batch · `ContactSheet` and table views |
| `/explore/join` | The primary conversion | What membership involves · the six teams · nine documented recruitment drives 2016–2024 · what a first-year builds · Basic Workshop as entry path · FAQ · application route |
| `/explore/blog` | Long-form | Light theme for readability · RSS |
| `/explore/blog/[slug]` | Post | — |

**Privacy governs the Member Directory.** Publishable: name, designation,
department, batch, committee, portrait. **Never: phone numbers.**

**○ ExCom decision required:** whether current students should be listed at all
without consent. A searchable directory of identifiable students is a materially
different privacy proposition from a committee page. This is not a decision for the
build team.

**○ Blog gap:** no posts exist. Ships with 3–4 seed posts — Robo Carnival 2024
retrospective · "Building an LFR: what Basic Workshop actually teaches" · the
Interplanetar rover history · an alumni interview.

---

### C7 · Contact ◐ `/contact`

`buet.robotics.society@gmail.com` (verified) · facebook.com/BUETRoboticsSociety ·
BUET campus address **[confirm exact building/room]** · routed enquiry form
(membership / sponsorship / collaboration / press).

A club contact number **only** if the ExCom designates an official line.
**Never a personal number.**

---

### C8 · Utility routes

`/gallery` — 1,105 photographs, filterable by year and event type, built on `Plate`
and a lightbox. For an "interactive museum" this is close to the core proposition;
without it the archive never gets presented as a whole.

Also: `/partners` · `/press` · `/search` · `/404` · `/rss.xml` · `/sitemap.xml`.

---

## 4. Blocked on people, not code

Ordered by lead time. **The top item should be started today.**

| # | Item | Blocks | Who |
| --- | --- | --- | --- |
| 1 | Competition results, team rosters, placements | `/achievements`, `/events/competitions` | Alumni outreach |
| 2 | SharePoint app registration (`Sites.Selected`) | Asset sync | BUET IT / admin consent |
| 3 | Team NUVOLA content | `/team-nuvola` | Current team |
| 4 | Member directory privacy ruling | `/explore/members` | ExCom |
| 5 | 1st, 2nd, 6th committee rosters | `/executive-committee` | Archive search |
| 6 | Partner logo vectors + permission | Home, `/partners` | Partners |
| 7 | *Interplanetar* vs *Interplaneters* | Achievements, Seminars | ExCom |
| 8 | Campus address, official contact line | `/contact` | ExCom |

---

## 5. Decisions needed from you

| # | Decision | Default if unanswered |
| --- | --- | --- |
| 1 | Hosting target — VPS · Fly · Cloud Run · Render · university server | Build provider-agnostic; decide at B6 |
| 2 | Storage provider — R2 · AWS · other | MinIO for dev; R2 assumed for prod |
| 3 | Rendering mode — static export vs ISR | **Static export** — decided |
| 4 | Domain name | — |
| 5 | ~~Aspect ratio for press-clipping scans~~ | ✅ **Closed** — `ratio` is nullable (0004) |
| 6 | **Should `EventDTO.cover` be optional?** (found in B3) | Events without a cover are excluded |

**On #6.** Early committees have events with no surviving photograph. `cover` is
required, so those events cannot be represented and are filtered out of
`/v1/events`; the count is reported on `/v1/health` as `eventsWithoutCover` so the
loss is visible rather than silent. **Making it optional is the honest fix** — the
alternative is either fabricating a placeholder image (§8 forbids it) or quietly
losing records. It changes a published field's type, so it is your call. It is free
today: there are 0 events loaded.

**On #5.** Three newspaper-clipping scans have no design frame; their shape is
whatever the cutting is. `assets.ratio` is NOT NULL and `ImageDTO.ratio` is
required, so one of these has to be chosen:

| Option | Cost |
| --- | --- |
| **(a)** Make `ratio` nullable — "intrinsic, no design frame" | Contract change; every consumer must handle `null` |
| **(b)** Crop each scan to a listed ratio | Destroys evidence in a press archive |
| **(c)** Add a ratio that fits them | They are 0.61, 1.19 and 0.88 — no single one fits |

**(a) is the honest answer** and the one I would take: a scan of a physical
artefact genuinely has no crop, and forcing one on it makes the archive less
accurate. It is not done, because it changes a published contract and that is
your call, not a migration's.

---

## 6. Sequence and dependencies

```
B1 Data ──► B2 Storage ──► B3 API ──► B4 Frontend swap ──► B6 Deploy
                                 └──► B5 Directus ──────────┘

C (pages) can begin in parallel once B3 lands.
Content gathering (§4) can begin immediately and should.
```

**B1 → B3 need nothing from you.** Docker is running, the schema and contract exist,
and MinIO removes the cloud-account dependency for B2.
