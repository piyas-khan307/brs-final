# Editor motion patch — buttons and blocks react and pop in

4 files. Apply on top of everything already merged.

## What this adds

Scoped specifically to the RichText editor (the writing surface), not
the rest of the admin panel — `ui.tsx` has a deliberate "nothing moves"
design note for the surrounding admin furniture (forms, save buttons,
list rows), which this leaves alone. All of this reuses the project's
existing motion tokens (`--duration-micro/base/enter/large`,
`--ease-out`) rather than inventing new timing values, and everything
respects `prefers-reduced-motion` via the site's existing global guard.

- **Blocks pop in when inserted** — a newly inserted image, video, or
  PDF fades and settles into place rather than snapping into existence.
- **Selection handles and the per-block toolbar animate in** — every
  time you select a block (not just on first insert), the resize grips
  and the floating toolbar pop in, and the block gets a subtle lift
  (box-shadow) so a click visibly "picks it up."
- **A grip scales up slightly under the pointer** on hover, before you
  even start dragging — an affordance that the handle noticed you.
- **Toolbar buttons depress on press** (1px, same physical language as
  the site's existing `.adm-btn`) and **pop when they turn on** — click
  Bold with something selected and the button does a small
  overshoot-and-settle instead of silently changing color. This applies
  to the main formatting toolbar AND every per-block toolbar (align/
  size/Remove buttons on images, video, PDFs) via one shared rule.
- **Dialogs (Add a picture / Add a video / Add a PDF / Add a link) pop
  in** rather than appearing instantly — opt-in via a new optional
  `className` prop on the shared `Modal` component, used only by these
  four dialogs, so every other modal in the admin panel is untouched.

## Apply it

```sh
cd ~/Projects/brs-final-main
unzip -o brs-editor-motion-patch.zip -d .
pnpm gate
pnpm dev
```

No migration, no Directus restart — CSS and editor-side code only.
