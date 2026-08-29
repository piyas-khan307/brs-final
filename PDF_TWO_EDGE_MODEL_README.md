# PDF resize — two independent edges, exactly what you described

4 files. Cumulative — includes everything already merged, safe to
apply on its own.

## What changed, in your terms

Your example: left edge at 10, right edge at 50. Drag left, it becomes
9, 8, 11, 12 — right stays at exactly 50. Drag right instead, and left
stays exactly where it was. That's now literally how it's stored and
how it works, for every alignment — left, center, and right.

## Why this needed a real rewrite, not a tweak

The old system stored one number, `width`, and let CSS `float` pin
whichever side the alignment implied. That's a hard limit of floats:
a floated box only ever has ONE side that's free to move; the other is
wherever the float puts it, full stop. There was no way to represent
"left edge here, right edge there" as two independently-movable numbers
because there was only ever one number.

Now there are two: `leftEdge` and `rightEdge`, both a percentage of the
column (0–100), replacing the old single `width` attribute entirely.
Dragging the left handle changes `leftEdge` only. Dragging the right
handle changes `rightEdge` only. Whichever one you're not dragging is
literally a different stored number, untouched — that's what makes the
other edge actually stay put now, for every alignment, not just left.

**Centering changed too, on purpose.** It used to be CSS auto-margins,
which continuously re-balance — that's exactly what made independent
dragging impossible while centered. Now clicking "Center" is a
one-time action: it computes where centered would put the box at its
*current* width, stores that as a plain position, and from then on it's
freely draggable like any other position (the same way clicking
"center" in PowerPoint doesn't lock something to the middle forever —
it just puts it there once).

**Old PDFs still work.** If a write-up already has a PDF inserted
before this change, it only ever stored `width` — the new code reads
that as a fallback (`leftEdge = 0`, `rightEdge = width`) so nothing
in an existing document collapses or jumps.

## Apply it

```sh
cd ~/Projects/brs-final-main
unzip -o brs-pdf-two-edge-model.zip -d .
pnpm gate
pnpm dev
```

No migration, no Directus restart — this is all editor-side attribute
shape, not a database change.
