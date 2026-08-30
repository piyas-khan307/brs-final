# Canvas editor — milestone 1 prototype

New feature, not a fix. 6 files: 3 new, 3 edited (nav entry, global CSS
append, allowlist registration). Safe to apply on top of everything
already merged — this doesn't touch the write-up editor, the PDF work,
or anything else already shipped.

## What this is

Per the project vision doc, and the three decisions made together:
- The canvas **replaces** the write-up editor long-term (not decided
  yet how/when that migration happens — this prototype doesn't touch
  the real event editor at all).
- **Fully custom canvas**, not GrapesJS — full control over the JSON
  page model from day one.
- **Milestone 1 only**: a bare-bones draggable, resizable canvas with
  two element types (text, image). No save, no publish, no animation
  config, no interaction config, no real asset-library wiring, no
  z-order beyond "bring to front," no undo, no multi-select. All of
  those are deliberate, later additions — see the file comment at the
  top of `CanvasEditor.tsx` for the full list of what's intentionally
  not here yet, so nothing reads as an oversight.

## What it does

- **`/admin/canvas-prototype`** — new admin route, linked in the nav
  as "Canvas prototype." Refreshing the page loses everything; this is
  for trying the interaction model, not building a real page.
- **Add Text / Add Image** from the left panel.
- **Click to select**, drag the body to move (bounded to the page —
  can't drag an element fully off the edge).
- **Drag any of 8 handles to resize**, from any corner or edge. Unlike
  the write-up editor's PDF/video resize (which only ever grows from a
  fixed anchor), a canvas element resizing from its top or left edge
  correctly moves x/y at the same time, so the opposite corner doesn't
  appear to drift — the way a slide-editor handle is expected to work.
- **Double-click text to edit it** in place.
- **Right panel**: numeric X/Y/width/height, text content/size/color/
  align, or an image URL field (a real asset picker comes later).

## The actual product: `types.ts`

The JSON page model (`CanvasElement`, `CanvasPage`) is the part meant
to last — the editor UI, and eventually the animation/interaction
runtime and the public renderer, all get built *against* this shape.
Worth reading this file even more than the editor component itself.

## Apply it

```sh
cd ~/Projects/brs-final-main
unzip -o brs-canvas-prototype.zip -d .
pnpm gate
pnpm dev
```

Then visit `/admin/canvas-prototype`. No migration, no Directus
restart — nothing here touches the database yet.

## Suggested next milestones, in order

1. Wire the image element to the real asset library (PhotoPicker /
   upload flow) instead of a raw URL field.
2. Decide the save/load story: what a "page" record looks like in the
   DB, draft vs. published.
3. Animation config UI (§3 of the vision doc) — starting with just
   "on page load" triggers before hover/click/scroll.
4. The public renderer: takes a `CanvasPage` and emits real HTML/CSS,
   completely separate code from the editor.
5. Interaction system (§4) — this is the one that needs its own small
   JS runtime shipped to the published page.
