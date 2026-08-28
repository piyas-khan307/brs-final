# Canvas editor — fonts, auto-fit, blog-post look

3 files, all replacing round 1's copies. Apply on top of
`brs-canvas-prototype.zip`.

## What this adds

1. **Font family picker** — Sans (body), Editorial (titles), Mono. Not
   free-text: these are literally the site's own three real font
   tokens (`--font-display`, `--font-editorial`, `--font-mono` from
   globals.css's `@theme` block), so nothing built in this editor can
   end up using type the rest of the site doesn't already use.

2. **Auto-fit text ("shrink to fit")** — the PowerPoint idea. A text
   box is a fixed size; turn on "Auto-fit text to box" (default on for
   new text, off for the template's body copy) and text that no longer
   fits shrinks its own font size — live, while you're typing, not just
   after you click away — down to a 10px floor. It re-measures against
   the box's real rendered height using the DOM directly, stepping down
   one pixel at a time rather than computing a single ratio, because
   shrinking changes how the text wraps, which changes whether the new
   size fits — a one-shot ratio doesn't account for that.

   Turned off for long body copy on purpose: shrinking four paragraphs
   down to 10px so they "fit" a fixed box is worse than the box
   scrolling. It's a per-element toggle for exactly that reason.

3. **"Load blog post layout"** button — seeds the canvas with a
   Title / Cover image / Body text arrangement sized and positioned
   like an actual article, shaped after the real event editor's own
   fields (title, cover, write-up). Not wired to any real event yet —
   see the file comment on `blogPostTemplate` in `types.ts`.

4. **The page itself looks like an article now**, not a blank white
   rectangle — the site's own body font as the base, a soft paper
   shadow. Individual text boxes can still pick a different family
   (e.g. the template's title uses Editorial).

## Apply it

```sh
cd ~/Projects/brs-final-main
unzip -o brs-canvas-fonts-autofit.zip -d .
pnpm gate
pnpm dev
```

Visit `/admin/canvas-prototype`, click "Load blog post layout" to see
it, or add your own text box and type past its bottom edge to watch
auto-fit kick in.

## Still not here (unchanged from round 1)

No save/publish, no real asset picker for the image element, no
interaction/animation config yet — this round was specifically about
typography and the box-doesn't-grow-with-content behavior you asked
for, not the next milestones.
