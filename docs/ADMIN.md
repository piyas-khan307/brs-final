# The admin panel

Directus, at `http://localhost:8055` in development. It is a window onto the
club's database — it presents the schema, it does not define it. Structure
comes from the migrations in `packages/db/migrations`, always.

## Setting it up

```bash
docker compose up -d          # postgres, minio, directus
pnpm --filter @brs/db migrate # apply any pending schema changes
pnpm --filter @brs/cms configure
```

`configure` is idempotent — run it whenever `apps/cms/model.mjs` changes, or
after a migration adds a table. Use `configure:dry` to see what it would do
first.

Everything the admin panel looks like lives in **`apps/cms/model.mjs`**: the
plain-English names, the notes under each field, which tables are hidden.
Change it there and re-run, never by clicking in the UI — settings made in the
UI live only in a database nobody backs up alongside the code, and vanish with
`docker compose down -v`.

## The two roles

**Administrator** — everything. Creating and removing accounts, publishing,
approving posts, building committees.

**Member** — writes blog posts and nothing else. Specifically:

| Can | Cannot |
| --- | --- |
| Write a blog post | Publish it |
| Edit their own drafts | Approve it — even their own |
| Submit a post for review | See or edit another Member's post |
| Upload a picture for their post | Edit a post after it is approved |
| Read the list of people, for a byline | Change events, committees, people, anything else |
| | Create or see other accounts |

Each of those is verified by a test that actually tries it:
`pnpm --filter @brs/cms test`.

### The approval step

```
draft  →  submitted  →  approved  →  published
 ▲            │            │
 └── changes_requested ────┘
```

A Member moves a post to **Submitted for review**. An Administrator moves it to
**Approved** (or back, with a note explaining why), and only then can it be
published.

This is enforced in **two independent places**, on purpose:

- Directus permissions, so a Member gets a clear refusal rather than a database
  error;
- a `CHECK` constraint in the database (`posts_publish_needs_approval`), so the
  rule still holds for a script, a bulk import, a `psql` session, or whatever
  replaces Directus in three years.

A second constraint requires an approval to name **who** approved it and
**when** — an approval nobody is accountable for is not an approval.

## Committees

Three levels, and both middle levels are things an Administrator creates. No
migration is needed to add a team or invent a position.

```
Committees            11th Executive Committee
└── Committee Sections    Standing Committee · Design Team · Workshop Team
    └── Positions             President · Treasurer · Head · Member
        └── Committee Placements  puts a person in a position
```

**People** is one row per person, reused across every committee they serve on —
that is what keeps the alumni record intact when someone serves twice.

To add someone: create them under **People**, then add a **Committee
Placement** naming the committee and position.

> ⚠ **Never put a phone number or personal address in the People table.**
> The source rosters contain ~470 students' mobile numbers. The table has no
> column for them and must never gain one.

## Images

Upload the original. Sizes and formats are produced automatically — five
widths, AVIF and WebP, plus a blur placeholder. You never need to resize
anything first, and iPhone HEIC photos work.

Location data is stripped on the way in. Phone photographs record where they
were taken, and a committee portrait tagged with a building is a leak nobody
thinks to look for.

**Descriptions are required and enforced.** At least three words, and not a
filename. `IMG_4821.jpg` and `photo` are refused. Write what is in the picture
— it is what a blind visitor hears in place of the image.

## Recording what you don't know

Several fields are deliberately allowed to be empty, and empty is a real
answer, not a gap to fill in later with a guess:

- **Department and batch** on a person — the 11th ExCom posters carry neither.
- **Term years** on a committee — they appear nowhere on the posters.
- **Result** on an achievement — empty means *took part, outcome unverified*.
  It does **not** mean the team lost, and nothing displays as a placement until
  **Result verified** is ticked with a source.

Leaving these blank keeps the gap visible and queryable. Filling them with a
plausible guess makes an invented fact indistinguishable from a real one.

## Publishing changes the site only if something rebuilds it

The website is a static export: there is no server assembling pages when a
visitor arrives. That is why the site stays up when the backend is down — and
why pressing **publish** changes the database and nothing a visitor sees.

Set `REBUILD_WEBHOOK_URL` to a build hook (GitHub Actions
`repository_dispatch`, a Netlify/Vercel hook, a webhook on the club's server)
and re-run `pnpm --filter @brs/cms configure`. It creates a Directus Flow that
calls the hook whenever published content changes.

Until that is set, `configure` says so on every run rather than pretending.

## Loading a committee from announcement posters

```bash
pnpm --filter @brs/ingest start                  # the uploader
pnpm --filter @brs/db seed:committee             # dry run — shows what it found
pnpm --filter @brs/db seed:committee -- --write
```

Reads `packages/db/seed/11th-excom.json`, crops each portrait out of its poster
at a measured position, uploads it through the real ingest service, and builds
the committee. Idempotent.

It reports posters whose picture area is empty and loads those people **without
a portrait**, rather than storing a blank rectangle that looks like a broken
image.

Names on the posters are pixels, not text, so they are transcribed by eye.
**Get them checked by a committee member before publishing.** Misspelling a
real person's name on their own club's website is not an acceptable defect.
