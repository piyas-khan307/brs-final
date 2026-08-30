# Deploying the BRS site

Everything here has been run end to end on a clean stack. Where something
has *not* been exercised in production, it says so.

---

## What you are deploying

Four planes, three containers, one bucket.

```
  Postgres          source of truth. No public port.
     │
     ├── Directus    authoring UI. NOT in the read path. Runs only when
     │               somebody is editing (profile: authoring).
     │
     └── API         reads Postgres, serves /v1. Stateless, disposable.
            │        Holds no storage credentials.
            │
            │  ── build time only ──
            ▼
          web        static files behind nginx. No runtime backend.
```

The site is a **static export**. Once built, it serves from disk with no
application behind it — which is why the API being down is invisible to
visitors. That is verified, not assumed:

```
$ docker compose -f docker-compose.prod.yml stop api
$ curl -o /dev/null -w '%{http_code}\n' http://localhost:8090/
200
```

---

## First deploy

### 1. Prepare the environment

```bash
cp .env.production.example .env.production
```

Fill in every blank. The compose file uses `${VAR:?…}` on each secret, so a
missing value **stops the stack with a named error** rather than starting
with a development password.

```bash
openssl rand -base64 24   # POSTGRES_PASSWORD
openssl rand -base64 32   # DIRECTUS_SECRET
```

Two variables are **compiled into the JavaScript** and cannot be changed by
restarting:

| Variable | Must be reachable from |
| --- | --- |
| `NEXT_PUBLIC_BRS_API` | **a browser** — not `http://api:8787` |
| `NEXT_PUBLIC_STORAGE_BASE_URL` | **a browser** — the bucket or its CDN |

Changing either needs a rebuild. See the header of `apps/web/Dockerfile`
for why no runtime substitution layer was added.

### 2. Bring up the database

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d postgres
```

On an **empty volume** every file in `packages/db/migrations/` runs
automatically, in order. Confirm:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production \
  exec postgres psql -U brs -d brs -c "select version from schema_migrations order by version"
```

Expect all five: `0001_init` → `0005_collection_item_keys`.

> **This only happens on first boot.** On an existing database
> `docker-entrypoint-initdb.d` does nothing at all. See
> *[Applying a migration to a live database](#applying-a-migration-to-a-live-database)*.

### 3. Load the content

Storage first, then the editorial layer:

```bash
pnpm --filter @brs/storage upload            # bytes → bucket, rows → assets
pnpm --filter @brs/db      seed:collections  # curation → collections
```

Both are **idempotent**. Re-running `upload` transfers nothing, because
keys are content-addressed. Verify:

```bash
pnpm --filter @brs/storage reconcile   # every row's key exists in the bucket
pnpm --filter @brs/db      verify:live # 41 structural + behavioural checks
```

> These run from a machine with `S3_*` credentials — an operator's laptop
> or a CI job. **The API never gets them**, which is what makes "the façade
> cannot write to storage" true by construction.

### 4. Build and start

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
# postgres  Up (healthy)
# api       Up (healthy)
# web       Up (healthy)
```

`api` waits for `postgres` to be **healthy**, not merely started. `web`
deliberately waits for nothing — see above.

### 5. Put TLS in front

Nothing in this stack terminates TLS, and all published ports bind to
`127.0.0.1`. Point a reverse proxy or CDN at:

| Public host | → |
| --- | --- |
| `buetrobotics.org` | `127.0.0.1:8080` (web) |
| `api.buetrobotics.org` | `127.0.0.1:8787` (api) |
| `assets.buetrobotics.org` | the bucket / its CDN |

**Set the Content-Security-Policy there.** It is deliberately not in
`nginx.conf`: a useful CSP has to name the storage and API origins, which
are environment-specific, so one baked into the image would be wrong for
every deployment but one.

---

## Publishing a content change

Content is baked in at build time, so **publishing is a rebuild.**

```bash
pnpm --filter @brs/web content        # /v1 → src/lib/*.generated.ts
pnpm --filter @brs/web content:check  # fails if stale — run this in CI
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build web
```

About two minutes. `content` is **not** a step inside the Dockerfile: that
would make `docker build` require a live API and turn a reproducible,
offline build into one that fails whenever the backend is down.

---

## Applying a migration to a live database

The init-scripts mount **does not** run on an existing volume. Apply by
hand, and take a dump first:

```bash
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"

$COMPOSE exec -T postgres pg_dump -U brs brs | gzip > backup-$(date +%F-%H%M).sql.gz

$COMPOSE exec -T postgres psql -U brs -d brs -v ON_ERROR_STOP=1 \
  < packages/db/migrations/0006_whatever.sql

pnpm --filter @brs/db verify:live
```

Every migration ends by inserting its own version into `schema_migrations`,
so `select version from schema_migrations` is always the truth about what
has been applied.

---

## Rollback

Images are tagged with `IMAGE_TAG`. Set it to a git SHA in CI and rolling
back is:

```bash
IMAGE_TAG=<previous-sha> docker compose -f docker-compose.prod.yml \
  --env-file .env.production up -d
```

**Database migrations do not roll back.** They are written to be additive —
`0003` widened a CHECK, `0004` dropped a NOT NULL — so an older image runs
against a newer schema. Anything genuinely destructive needs a restore from
the dump taken above.

---

## Backups

| What | How | Why |
| --- | --- | --- |
| Postgres | `pg_dump` on a schedule, off-host | Everything except the bytes |
| Bucket | provider versioning / lifecycle rules | The photographs |
| `.env.production` | your password manager | Not in the repo, not in an image |

The archive photographs are **irreplaceable** — many exist nowhere else.
Content addressing means a re-upload is safe and cheap, but only if the
originals still exist somewhere. The gitignored `BRS/` folders are not a
backup; they are on one laptop.

---

## Profiles

```bash
# Directus, only while somebody is editing
docker compose -f docker-compose.prod.yml --env-file .env.production \
  --profile authoring up -d directus

# self-hosted object storage instead of R2/S3
docker compose -f docker-compose.prod.yml --env-file .env.production \
  --profile self-hosted-storage up -d minio
```

Directus is behind a profile because it is **not in the read path** — the
façade reads Postgres directly. Leaving it down except when editing removes
an entire attack surface at zero cost to visitors.

---

## Image facts

| Image | Size | Runs as | Contains |
| --- | --- | --- | --- |
| `brs-api` | **55 MB** | `node` (uid 1000) | one 830 KB bundle. No `node_modules`, no TypeScript, no transpiler, **no AWS SDK** |
| `brs-web` | **39 MB** | `nginx` (uid 101) | 472 static files + nginx |

Neither contains a secret. Both are built from the repo root because they
import workspace packages.

The API bundle is checked at build time for AWS SDK references and **the
build fails if any appear** — it imports `@brs/storage/url`, which has no
dependencies. If someone changes an import to the storage root, the build
says so rather than shipping a 3 MB S3 client into a service that never
makes an S3 call.

---

## Not yet done

Stated plainly rather than left to be discovered:

- **No CI pipeline.** The commands above are run by hand. `content:check`,
  `pnpm gate` and `verify:live` are all designed to be CI steps.
- **No automated backups.** `pg_dump` is documented, not scheduled.
- **Never deployed to a real host.** Everything here has been verified on a
  local Docker stack. DNS, TLS issuance and CDN configuration are untested.
- **No log aggregation or uptime monitoring.** Healthchecks exist and the
  orchestrator can act on them; nothing pages a human.
