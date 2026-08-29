# PDF resize handles — only show edges that can actually move

1 file: `extensions.tsx`. Cumulative — includes everything already
merged, safe to apply on its own.

## Is it feasible? Yes — with a change of approach

You asked for: drag the left handle → only the left edge moves, right
stays put. Drag the right handle → only the right edge moves, left
stays put. That's exactly how it should work, but it isn't achievable
by making both handles smarter — it's a real constraint of how the box
is positioned, and the fix is to only offer the handles that correspond
to something CSS can actually do.

The PDF box has no `top` or `left` coordinate. Its position comes
entirely from where it sits in the document and which way it floats:

- **Height can only grow downward.** There's no `top` value to move,
  so dragging "north" can't keep the bottom fixed while the top moves
  — the extra height has nowhere to go but below, which is exactly why
  it was moving the bottom edge instead of the top. Fixed by removing
  the north handle (and the nw/ne corners) entirely — height now only
  ever resizes from the bottom, which is the one direction that
  actually works, and matches what you confirmed the south handle
  already did correctly.

- **Width can only grow from whichever side the float doesn't pin.**
  A left-aligned PDF has `float: left`, which pins the left edge to
  the margin — only the right edge can ever really move, so now only
  the "e" (east) and "se" handles are shown. A right-aligned PDF is
  the mirror image — only "w" and "sw". A centered PDF is the one case
  where both sides genuinely move together (centering recalculates
  both margins equally whenever width changes), so both stay available
  there.

So per alignment, the visible handles are now:

| Align | Handles shown |
|---|---|
| Left | east, south, south-east |
| Right | west, south, south-west |
| Center | west, east, south, south-west, south-east |

A handle that isn't shown wasn't hidden because it was broken — there
was never a correct behavior it could have had.

## Apply it

```sh
cd ~/Projects/brs-final-main
unzip -o brs-pdf-handle-fix.zip -d .
pnpm gate
pnpm dev
```

No migration, no Directus restart.
