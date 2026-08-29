# Fix: the earlier "width doesn't scale" patch had a bug of its own

1 file: `globals.css`. Cumulative — includes every earlier fix (drag
grip, PDF alignment, caption overflow, toolbar contrast, etc.), so
it's safe to apply on its own on top of anything already merged.

## What was actually wrong

Your screenshot showed it clearly: a gray strip to the right of the
visible PDF content, inside the block's own selection outline, not
shrinking in proportion with the resize.

The round-6 patch ("drag + scale fix") added a rule making `.rt-node`
(the outer wrapper both a PDF and a video render inside) read the same
`--rt-w` percentage its child (`.rt-pdf` / `.rt-embed`) already used.
That was the bug: `.rt-pdf` and `.rt-embed` **already read that same
variable themselves**, inherited straight down from where it's set. So
resizing to, say, 40% applied the percentage TWICE — `.rt-node` shrank
to 40% of the true column, and then `.rt-pdf` inside it computed *its
own* 40% against that already-shrunk box: 40% of 40%, 16% of the real
column, not 40%. The correctly-sized `.rt-node` was the outer edge you
saw; the doubly-shrunk `.rt-pdf` inside it was visibly smaller — and
the gap between the two was the "extended blank box."

## The fix

Removed that rule entirely. `.rt-node` goes back to its natural
`width: auto` (100% of the true column, since a plain block box
doesn't shrink to fit a floated child) — and now `.rt-pdf`/`.rt-embed`
are the *only* place the percentage is ever applied. A floated child
sitting inside a wider, invisible, unstyled parent is completely
normal CSS and paints nothing extra, so there's no visible artifact
left behind.

This affected video too, not just PDF — `.rt-embed` reads the same
`--rt-w` pattern — so resizing a video should also look correct now.

## Apply it

```sh
cd ~/Projects/brs-final-main
unzip -o brs-compounding-width-fix.zip -d .
pnpm gate
pnpm dev
```

No migration, no Directus restart.
