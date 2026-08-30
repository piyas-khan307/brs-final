# PDF alignment — left / center / right, text wraps beside it

4 files. Builds on top of the drag/resize fix from
`brs-event-editor-patch.zip` — the copies here are already cumulative
(they include that fix), so it's safe to apply this zip whether or not
you've merged that one yet. If you haven't applied
`brs-event-editor-patch.zip` yet, you'll still want it separately for
the 17 fonts and letter-spacing — this zip doesn't include those files.

## What this adds

A PDF block now has the same three-way alignment a picture already
has, with the three buttons appearing in its toolbar when selected:

- **Left** — floats left. Resize the box narrower and a paragraph of
  text will wrap into the empty space that opens up on the right —
  this is the one you want for "PDF on the left, text flowing beside
  it on the right."
- **Right** — same idea, mirrored — text wraps in the space on the
  left instead.
- **Center** — always starts its own row on its own, full width up to
  its set size. Nothing can wrap around something positioned in the
  middle of the column, so this one intentionally does not try to.

New PDFs default to **Left** now (previously there was no alignment at
all — every PDF was effectively centered, full-width). Existing PDFs
already in a write-up will pick up Left the first time that document is
re-saved, since the attribute didn't exist before.

On mobile (under 640px), a left/right-floated PDF drops the float and
goes full-width — same rule the picture float already follows, since
there isn't enough room on a phone screen for a paragraph to
meaningfully wrap beside a narrowed PDF.

## Apply it

```sh
cd ~/Projects/brs-final-main
unzip -o brs-pdf-align-patch.zip -d .
pnpm gate
pnpm dev
```

No migration, no Directus restart — editor-side code and CSS only.
