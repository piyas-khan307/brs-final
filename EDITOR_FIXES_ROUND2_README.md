# Three fixes: Backspace after media, toolbar contrast, PDF caption overflow

3 files. Cumulative — already includes the drag/resize fix and the PDF
alignment feature from before, so this is safe to apply on its own on
top of an unpatched checkout, or on top of everything you've already
merged. Doesn't include the fonts/letter-spacing work — that's still
only in `brs-event-editor-patch.zip`.

## 1. Backspace now removes the empty line after a picture/video/PDF

This was a real gap, not intended behavior. Inserting media mid-
document splits the paragraph and leaves an empty one on the far side
for your cursor. Pressing Backspace there used to hit ProseMirror's
default behavior for "just before an atom node" — which, on the FIRST
press, doesn't delete anything at all; it selects the media block
instead. A second Backspace would then have deleted the block itself,
not the empty line — the opposite of what you wanted.

Added a keyboard shortcut that catches specifically this situation
(empty paragraph, cursor at its very start, a picture/video/PDF
immediately before it) and deletes just the empty paragraph, leaving
the media untouched. Every other Backspace press — mid-text, in a
paragraph with content, anywhere not next to a media block — is
completely unaffected.

## 2. Toolbar buttons — solid white, black text

The per-block toolbar (align buttons, Remove, etc.) now forces a solid
white background and black text, strongly enough (`!important`) to
beat whatever Tailwind text-color utility was on a given button. This
applies to every button in that toolbar going forward, not just the
ones that were hard to read today.

## 3. PDF caption no longer overflows past a resized frame

This was the real bug behind "there remains an extended blank part of
the box" — and your own diagnosis was right, it was the caption row.
Flex items default to a minimum width based on their own content
unless told otherwise; neither the title text nor the "Open in a new
tab" link was told otherwise, so once you shrank the PDF frame down,
that row refused to shrink with it and stuck out past the frame's
right edge. That stuck-out sliver was the "extra part," and align
switching was measuring against it.

Fixed by letting the title truncate with an ellipsis when there isn't
room, while the "Open in a new tab" link keeps its fixed width and
never wraps. The caption's total width now always exactly matches the
frame above it, on both the editor and the published page.

## Apply it

```sh
cd ~/Projects/brs-final-main
unzip -o brs-editor-fixes-round2.zip -d .
pnpm gate
pnpm dev
```

No migration, no Directus restart.
