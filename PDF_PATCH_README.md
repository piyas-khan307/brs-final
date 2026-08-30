# PDF-in-events patch

14 files: 4 new, 10 edited. No new npm dependencies — this only adds files
and edits existing ones, so `pnpm install` isn't strictly required, but it's
safe to run anyway.

## Apply it

From the folder that contains this zip, with `brs-final-main` as your
project root:

```sh
unzip -o brs-pdf-patch.zip -d /path/to/brs-final-main
```

`-o` overwrites in place. Since every file in the zip mirrors the project's
real folder structure (e.g. `apps/web/src/...`), this drops each one exactly
where it belongs — no manual moving.

Then, inside `brs-final-main`:

```sh
docker compose up -d                     # if not already running
pnpm --filter @brs/db migrate            # applies migration 0016
pnpm gate                                # confirms typecheck/lint/PII all pass
pnpm dev
```

## What this patch does

- New `documents` + `event_documents` tables (migration `0016`)
- Ingest service accepts PDFs at `POST /ingest/document` — stored as-is,
  no image processing, deduplicated by checksum like photos are
- Event editor: new toolbar button → upload or pick a PDF from the library
  → inserts a `brsPdf` node that renders as a **live, full-width iframe**
  of the PDF (the reader's own browser PDF viewer — Firefox's PDF.js, etc.
  — renders it; nothing here reimplements that viewer)
- Same live embed appears in the admin Preview tab

## What this patch does NOT do yet

The published static site will currently **drop** any PDF you insert —
same "silently vanishes" behavior as an unattached photo, not a crash, but
still not published. To finish that:

1. `packages/contract` — add a `DocumentDTO` and `EventDTO.documents`
2. `apps/api` (`adapters/postgres.ts`, `routes.ts`) — join `event_documents`
   and return it on the `EventDTO`
3. `apps/web/scripts/fetch-content.mts` — add a documents "pool" per event,
   the same way the image gallery is pooled, and pass a `document` resolver
   into `renderRichDoc`
4. `apps/web/src/app/admin/events/edit/page.tsx` — track and persist which
   PDFs are attached to an event (mirrors `attachInlinePhotos`), so
   `event_documents` rows actually get written on save

Ask Claude to continue with this list when you're ready — it's the same
shape of work as this patch, just on the API/build side instead of the
editor side.
