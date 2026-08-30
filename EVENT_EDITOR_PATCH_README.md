# Event editor patch — PDF drag fix (unmerged from before) + 17 fonts + letter-spacing

7 files. This is a catch-up patch: it includes the drag/resize fix from
the earlier `brs-drag-scale-fix.zip` (which you hadn't merged yet) PLUS
today's font and spacing additions, all in one drop so you don't have
to track two separate patches.

## 1. The PDF drag + "leftover box" fix (previously unmerged)

You confirmed you'd skipped `brs-drag-scale-fix.zip` earlier. Both
symptoms you're seeing — can't drag the PDF freely, and a leftover
unscaled box after shrinking it — are exactly what that patch already
fixes:

- **The leftover box**: the PDF's outer wrapper element was never told
  to shrink alongside the visible frame inside it — it defaulted to
  full column width regardless of how far you'd resized the visible box
  down. Fixed by making the wrapper read the same `--rt-w` variable its
  child already used.
- **Can't drag freely**: the drag handle used to be the entire PDF box,
  but almost that entire box is a live `<iframe>` — a drag gesture
  starting inside an iframe's own document never reaches the parent
  page. Fixed with a small, always-partly-visible grip (dot pattern,
  top-left corner) that sits outside the iframe's rectangle.

## 2. Font picker — 17 new fonts

Sans-serif, serif, display, monospace, script/handwriting — grouped
exactly as you listed them. Two names from your list (Georgia, Times
New Roman) needed nothing new — they're already the existing "Classic
serif" entry, a free system font stack.

**Worth knowing:** these 17 are loaded via `next/font/google`, not
vendored as `.woff2` files the way the site's original two fonts are
(see PROJECT_SPEC.md §17.6, "no third-party font CDN"). The files
themselves are still served from your own site — a reader's browser
never talks to Google — but your build now needs real internet access
at least once to fetch them (then they're cached). First `pnpm dev` or
`pnpm build` after merging this will take a bit longer while that
happens.

## 3. Letter-spacing

A new "Spacing" dropdown next to the font-size control — Tight, Wide,
Wider. The other half of "spacing" alongside the line-spacing control
that already existed.

## Apply it

```sh
cd ~/Projects/brs-final-main
unzip -o brs-event-editor-patch.zip -d .
pnpm gate
pnpm dev
```

First build will fetch the 17 fonts from Google — give it a moment.

## Not addressed here: images jumping to a new line

This one's structural, not a bug — explained in chat rather than
patched. Short version: an image is a block element that floats, and
floating only affects content placed *after* it, never before. Text
typed before your cursor can't wrap around an image inserted there; it
can only push the image to the next line down. Fixing this for real
means making images genuinely inline elements instead — a separate,
bigger change with its own tradeoffs. Say if you want that pursued.
