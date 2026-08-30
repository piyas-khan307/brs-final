# PDF patch — fix round 2

4 files, all replacing what the first patch shipped. Apply this ON TOP of
the first `brs-pdf-patch.zip` (which you should already have merged in).

## What this fixes

1. `packages/db/migrations/0016_pdf_documents.sql` — was missing the
   required `INSERT INTO schema_migrations` line. You likely already
   patched this by hand from an earlier message; this file is identical
   to that, included here so the zip is self-contained.
2. `apps/cms/model.mjs` + `apps/cms/configure.mjs` — the `documents` and
   `event_documents` tables were never registered as tracked Directus
   collections, so `/items/documents/*` had no permission policy behind
   it. This is the actual reason an uploaded PDF showed "no longer in
   the library" — Directus didn't know the collection existed.
3. `apps/web/src/app/globals.css` — the "no longer in the library" text
   (and the PDF caption) was using a color token documented as "large
   text and labels ONLY, 3.7:1 contrast" for small body text, which read
   as barely visible on a light background. Swapped to the stronger
   secondary text color.

## Apply it

```sh
unzip -o brs-pdf-patch-fix2.zip -d /path/to/brs-final-main
```

Then, since Directus caches its schema at boot and won't see the new
collection config just from a file change, restart it and re-run configure:

```sh
docker compose restart directus
pnpm --filter @brs/cms configure
pnpm gate
pnpm dev
```

Then try uploading a PDF again in the event editor — it should now
resolve correctly instead of showing "no longer in the library".
