# Canvas editor — backgrounds, borders, opacity, shapes, layers, duplicate

3 files, all replacing round 2's copies. Apply on top of
`brs-canvas-fonts-autofit.zip`. Continues straight down §2 of the
vision doc's list of things the client should be able to do.

## What this adds

- **Background color** for any element (text, image, or shape), with a
  "No fill" button to go back to transparent.
- **Border color + width**, shared across all element types.
- **Corner radius** — hidden for an ellipse shape, since that field
  doesn't mean anything once a shape is already fully round.
- **Opacity** slider (0–100%).
- **A third element type: Shape** (rectangle or ellipse) — per §2's
  own list. A shape is really just the background/border/radius
  controls above with nothing inside the box, so this cost very little
  once those existed.
- **Bold / Italic** toggles for text.
- **Duplicate** — copies the selected element a little offset from the
  original so it's visibly a copy, not sitting invisibly on top of it.
- **Send to back**, alongside the existing "Bring to front" — full
  z-order control, not just one direction.

All four appearance properties (background/border/radius/opacity) live
on the shared base type in `types.ts` now, not duplicated per element
type — a background means the same thing whether it's behind text, an
image, or a shape.

## Apply it

```sh
cd ~/Projects/brs-final-main
unzip -o brs-canvas-appearance-shapes.zip -d .
pnpm gate
pnpm dev
```

Visit `/admin/canvas-prototype`. Select anything and scroll the
Properties panel — appearance controls are below the type-specific
ones now, with Duplicate/Delete and layer-order buttons at the bottom.

## Still not here

Save/publish, the real asset picker for images, animation/interaction
config, multi-select, undo, snapping/alignment guides, rotation. Say
the word and I'll keep going down that list next.
