# PDF patch — round 4: real corner/edge resize like an image

4 files, replacing what round 3 shipped for the same 4 files. Apply on
top of the previous three patches (or your already-merged copy of them).

## What this fixes

Round 3's resize used the browser's native `resize: vertical` on a
`<textarea>`-style handle — height only, and unreliable over an iframe's
own content (the iframe swallows some of the drag). This replaces it
with the exact same corner/edge pointer-drag mechanism `BrsImage`
already uses for photographs:

- **Corner handles** (4 square grips) — drag to scale the whole box
  bigger or smaller, width and height moving together, keeping the
  ratio the box already had.
- **Left/right edge handles** — resize width only.
- **Top/bottom edge handles** — resize height only.

Width is a percentage of the column (so it stays fluid across screen
sizes, same as a picture); height is a fixed pixel count (a PDF page
has a real printed size, unlike a photo whose height a percent width
plus its own ratio already determines).

The size you leave it at — width and height both — is saved on the
node and carried through to the published page.

## Apply it

```sh
cd ~/Projects/brs-final-main
unzip -o brs-pdf-patch-round4.zip -d .
pnpm gate
pnpm dev
```

No migration, no Directus restart — editor-side code and CSS only.
