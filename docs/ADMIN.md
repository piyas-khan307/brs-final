# The admin panel

**`/admin` on the website itself.** In development that is
`http://localhost:3000/admin/login`. One address, one login, everything in
one place.

Behind it sits Directus, which does the authentication and enforces every
permission — but nobody at the club ever needs to open it.

## Setting it up

```bash
docker compose up -d           # postgres, minio, directus
pnpm --filter @brs/db migrate  # apply any pending schema changes
pnpm --filter @brs/cms configure
pnpm --filter @brs/ingest start   # the uploader (needed for photographs)
pnpm --filter @brs/web dev        # the site, including /admin
```

## Why there are two things called "the admin panel"

**`/admin` on the website** is what the club uses. Custom screens built
around jobs: *Write a post*, *Add a member to the committee*, *Upload a
photograph*.

**Directus's own UI** at `http://localhost:8055` still exists and still
works. It is the developer's fallback — every table, no guard rails. Reach
for it when something needs fixing that the club's screens do not cover.

The reason both exist is that Directus presents **tables**, and adding one
person to a committee is three rows in three tables in an order nobody
guesses. `/admin` turns that into one form. Everything else — authentication,
permissions, validation — is still Directus, so there is no second security
model to keep in step.

`apps/cms/configure` is still required: it sets up the two roles and the
permissions that `/admin` relies on. It is idempotent; run it after any
migration. Use `configure:dry` to see what it would do first.

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
Committee               11th Executive Committee
└── Section             Standing Committee · Design Team · Workshop Team
    └── Position        President · Treasurer · Head · Member
        └── Person      with a photograph
```

**To add someone**, open **Committee**, find the position, and press *Add a
person*. Name, title, photograph, done — the three underlying rows are written
for you.

If the name matches somebody already on record, the form offers them. Choose
the existing person when it is the same person: that is what keeps their
history intact across committees. Two students genuinely can share a name, so
it never merges automatically.

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
