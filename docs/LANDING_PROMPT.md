# MASTER PROMPT — BRS Landing Sheet (Archive-Driven Rebuild)

Build a landing page for **BUET Robotics Society** — a twenty-one-year-old
engineering society with a 2 GB archive running from ABU Robocon 2005 to Robo
Carnival 2024. The page is an exhibition of real material, not a template
filled with placeholder claims.

This prompt is written in the style of a pixel-perfect rebuild spec: where
code is given verbatim, **use it verbatim** — do not adjust timings, easings,
token names, or magic numbers. Where a section is specified in prose, the
numbers in that prose are the spec.

---

## 0. READ THIS BEFORE THE REST — the anti-pattern register

This project has a design system that **actively rejects** the default
"premium dark SaaS landing page" look. Five ESLint rules fail the build on it.
If you have built a page like this before, most of your instincts are wrong
here. Specifically:

| Banned | Why |
| --- | --- |
| `linear-gradient` / `radial-gradient` backgrounds | §3.3. Only exception: a ≤12% legibility scrim over a photograph |
| `box-shadow` on static surfaces, any glow | §5.1 rule 4. Depth is surface value + a 1px hairline |
| Accent-hue glow of any kind | The single clearest marker of the aesthetic being avoided |
| `backdrop-filter` / `backdrop-blur` / "glassmorphism" | §3.3, §17.1 |
| `rounded-lg`, `rounded-xl`, `rounded-full`, pills | §17.5. See the radius tokens below |
| Arbitrary values — `bg-[#22d3ee]`, `text-[13px]`, `p-[27px]` | Every value comes from a token in `globals.css` |
| A dark `#1b1b1b`-style ground | The ground is **light**. See §2 |
| Invented statistics, "+" suffixes, rounded-up figures | §17.4. Precision is the brand |
| Superlatives and startup register | A lint rule fails the build. See §6 |

**Do not import a second animation library.** GSAP and Lenis are already in
the repo and already carry this page. Adding `framer-motion` puts three
animation runtimes in one bundle. **Do not add `three` / `@react-three/fiber`
for a decorative 3D mesh** — the landing route is already 39 KB over its JS
budget, and a WebGL canvas for background decoration is exactly the trade this
project does not make.

---

## 1. Tech Stack & Global Setup

- **Framework:** Next.js 15 App Router, `output: "export"` — static, no
  runtime backend dependency. Already configured; do not change it.
- **Language:** TypeScript strict.
- **Styling:** Tailwind CSS v4, theme defined in
  `apps/web/src/app/globals.css` via `@theme` — **no `tailwind.config.js`**.
- **Animation:** `gsap` + `ScrollTrigger`, and `lenis` for smooth scroll.
  Both already installed and wired (`components/motion/SmoothScroll.tsx`).
- **Route:** `apps/web/src/app/page.tsx`. The current motion sheet lives
  there; the earlier static design is preserved at `/sheet-01` and must stay.
- **Server Components by default.** `'use client'` requires a written reason
  in `apps/web/config/client-allowlist.json` or the build fails
  (`client-component-allowlist` rule). Only the sections that genuinely need
  browser APIs become client components — sections 2, 4 and 5 below.

### Fonts — three families, self-hosted, no font CDN (§17.6)

Already fetched by `scripts/fetch-fonts.mjs`. Do not add a `<link>` to Google
Fonts; do not add a fourth family.

| Token | Family | Axis | Carries |
| --- | --- | --- | --- |
| `--font-display` | IBM Plex Sans | `wght` **100–700** | Body, UI, everything not below |
| `--font-mono` | IBM Plex Mono | 400 only | Placards, labels, figures, indices |
| `--font-editorial` | Source Serif 4 | `wght` **200–900** | Display only — page titles, section headings, roster names |

Rules: nothing may ask Plex Sans for a weight above **700** (the axis clamps
silently — an 800 renders as a 700 and the bug is invisible). Neither family
has a width or optical-size axis, so no rule may set `wdth` or `opsz`. Never
set the serif below ~1rem. Total font payload is 108.6 KB against a 110 KB
budget — **1.4 KB of headroom, so no new weights or subsets.**

---

## 2. Ground and palette — measured, not chosen

Every colour traces to pixel-frequency analysis of `logo/BRS Logo
transparent.png` (1,878,553 opaque pixels sampled). Do not "modernise" any of
it toward cyan.

```
#0E516E  petrol    33.2%      #7B1223  oxblood   17.9%
#FFFFFF  bone      30.9%      #3A3A3C  graphite  14.3%
```

Use **token names only** — never the hex values inline:

| Token | Value | Use |
| --- | --- | --- |
| `bg-bg-base` | `#e2e8ea` | The page ground. A tint of petrol taken most of the way to white |
| `bg-bg-raised` | `#eef2f3` | Panels lifted off the ground |
| `bg-bg-inset` | `#d1dade` | Recesses, hover fills |
| `bg-mount` | `#1c2124` | **The mount.** Dark board behind every photograph |
| `text-text-primary` | `#24282b` | 12.0:1 |
| `text-text-secondary` | `#4e585d` | 5.9:1 |
| `text-text-tertiary` | `#6c777e` | 3.7:1 — large text and labels ONLY |
| `text-accent` | `#7b1223` | Oxblood. 8.7:1. **Never as a glow** |
| `border-line-hairline` / `border-line-strong` | — | The primary structural device |
| `--radius-none` / `--radius-control` | `0px` / `4px` | Plates are square; things you touch get 4px |

**Two inverted fields exist** and re-point the same token names, so components
inside them invert without knowing:

- `[data-field="deep"]` — the ground becomes petrol `#0E516E`. Use **exactly
  once** on the page, so the badge blue appears at full strength as a section
  rather than being smeared everywhere.
- `[data-field="paper"]` — the ground goes *up*, to `#f5f8f9`.

### The mount — non-negotiable for photographs

A photograph is shown as a print on a dark board, never floated on the page
ground. Club uploads are phone photographs with corridors and poster walls
behind them, arriving in every aspect ratio a phone produces. Shown whole
(which is the requirement) each one letterboxes differently — on a pale mount
every gap reads as a layout fault; on a dark one the same gap reads as a
mount, and eighty-four inconsistent snapshots become one contact sheet.

---

## 3. Content — every fact on this page is real

**No number is typed by hand.** Every figure comes from the computed
`StatsDTO` or is counted from the archive. No `+` suffixes.

Verified figures currently available (`components/showcase/KeyFacts.tsx`):

```ts
const FIGURES = {
  programmes: { value: "6",  label: "International programmes", note: "2005 — 2015" },
  workshops:  { value: "19", label: "Workshops delivered",      note: "Basic Workshop now at v8.0" },
  years:      { value: "21", label: "Years on record",          note: "Founded for ABU Robocon 2005" },
};
```

**No fabricated results.** `achievements.verified` defaults false, and a
stated result requires attribution at the database level. **The Panasonic
Award (ABU Robocon 2005) is currently the only placement evidenced in the
entire archive.** Do not write "multiple international wins", do not imply
placements that are not recorded. Competition results for Robocon, IRC, iARC,
Lunabotics, URC and ERC are blocked on alumni outreach — the honest page says
so rather than filling the gap.

**Photographs** come from the real archive via
`apps/web/src/lib/*.generated.ts` (regenerate with
`pnpm --filter @brs/web content`). Every image needs real alt text. There are
574 assets; the events index and committee roster are already generated.

**No personal phone numbers.** ~470 students' mobile numbers sit in the source
rosters. A CI gate (`pnpm audit:pii`) fails the build if one reaches a
shippable surface. Never render a contact field; `MemberDTO` has none.

---

## 4. Component structure

```
apps/web/src/app/page.tsx                       route — composes the eight zones
apps/web/src/components/landing/Masthead.tsx    exists — fixed, opaque
apps/web/src/components/landing/ZoneA_Opening.tsx   exists
apps/web/src/components/landing/ZoneD_RecordStrip.tsx exists
apps/web/src/components/landing/ZoneRail.tsx    exists — the index rail
apps/web/src/components/motion/Intro.tsx        exists — the load sequence
apps/web/src/components/motion/SmoothScroll.tsx exists — Lenis
apps/web/src/components/showcase/KeyFacts.tsx   exists — the three figures
apps/web/src/components/showcase/GridAssembly.tsx    exists
apps/web/src/components/showcase/HorizontalGallery.tsx exists
apps/web/src/components/showcase/RoverSequence.tsx   exists

NEW:
apps/web/src/components/landing/Wordmark.tsx    §5.2 — verbatim below
apps/web/src/components/showcase/ContactSheet.tsx §5.5 — verbatim config below
apps/web/src/components/landing/TheRecord.tsx   §5.6
apps/web/src/components/landing/OpenQuestions.tsx §5.7
```

**Reuse what exists.** Do not rewrite `Masthead`, `Intro`, `SmoothScroll`,
`KeyFacts`, `GridAssembly` or `HorizontalGallery` — they are built, they pass
lint, and their motion is tuned. Compose them.

---

## 5. The eight zones, in order

### 5.1 — Opening

Full-height. A single archive photograph on the mount, held at
`object-fit: contain` so it is never cropped, with the society's name set in
**Source Serif 4** at `--text-editorial-hero`. Beneath it, one sentence of
plain prose in Plex Sans and a mono placard giving the date range.

No video. No gradient scrim beyond the ≤12% legibility scrim permitted by
§3.3, and only where text actually overlaps the image.

The masthead is **opaque, not translucent** — a blurred bar over plates
travelling underneath turns into visual mud.

**Motion:** `Intro.tsx` already owns the load sequence. Hairlines draw with
`scaleX` from `transform-origin: center`, `duration-large`, `ease-out`. Text
rises `y: 30 → 0` with opacity, stagger 0.1s. Nothing bounces, nothing
overshoots (§5.5: no spring on static UI).

### 5.2 — The wordmark (VERBATIM)

The one genuinely playful element, and it earns its place because it is made
of the type system rather than applied on top of it: IBM Plex Sans has a live
weight axis, so the letters respond to the *direction* of the pointer.

```tsx
"use client";

import { useState } from "react";

const LETTERS = ["B", "U", "E", "T", " ", "R", "O", "B", "O", "T", "I", "C", "S"];

/**
 * Weight follows pointer DIRECTION, not position: moving right thins the
 * letter, moving left thickens it. There is no load-in animation and no
 * reset on leave — the wordmark keeps whatever shape you left it in, which
 * is what makes it feel like a physical object rather than a hover effect.
 *
 * 300 and 700 are the working ends of Plex Sans's 100-700 axis. Do NOT
 * raise the upper value: above 700 the axis clamps in silence.
 */
function HoverLetter({ char }: { char: string }) {
  const [weight, setWeight] = useState(700);

  if (char === " ") return <span className="inline-block w-[0.3em]" />;

  return (
    <span
      className="inline-block cursor-default transition-[font-variation-settings] duration-300 ease-out"
      style={{ fontVariationSettings: `'wght' ${weight}` }}
      onMouseMove={(e) => {
        if (e.movementX > 0) setWeight(300);
        else if (e.movementX < 0) setWeight(700);
      }}
    >
      {char}
    </span>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={className} aria-label="BUET Robotics">
      {LETTERS.map((char, i) => (
        <HoverLetter key={i} char={char} />
      ))}
    </span>
  );
}
```

Set it at `--text-display-xl`, tracking `-0.03em`, on `bg-bg-base`. Under
`prefers-reduced-motion` the transition is already neutralised globally.

`'use client'` reason for the allowlist: *"pointer-direction weight response
needs `movementX`, which has no server equivalent."*

### 5.3 — The three figures

Use the existing `KeyFacts.tsx` unchanged. Three plates, the middle one a pale
figure card, each figure counted or verified and each carrying its provenance
note. Mono index placards (`1.00`, `1.01`, `1.02`) in the corner of each plate.

If you add a count-up, it counts to the **real** value and the element must
render the final value server-side so a JS-disabled reader sees `19`, not `0`.

### 5.4 — Programmes

The six international programmes, 2005–2015, as a horizontal band. Reuse
`HorizontalGallery.tsx`.

Tabs or filters, if used: the active tab takes `bg-accent` with white text
(10.8:1) and **square corners**; inactive tabs are `bg-bg-inset` with
`text-text-secondary`. No pill shapes, no `#DE7D4D`-style stock accent — the
accent is oxblood and it is measured from the mark.

### 5.5 — The contact sheet (VERBATIM CONFIG)

The archive as a wall of prints. A column grid of real photographs that
crossfades on an interval, on the mount, with the two centre columns held as
paper so the eye has somewhere to rest.

```tsx
/** Column geometry. Widths taper toward the edges so the sheet reads as a
 *  wall rather than a table. `paper: true` columns hold no photograph — they
 *  are the pale gaps that keep 40 images from becoming noise. */
const COLS = [
  { width: 78,  itemH: 118, offset: "mt-[120px]" },
  { width: 105, itemH: 158, offset: "mt-[40px]"  },
  { width: 120, itemH: 182, offset: "-mt-[40px]" },
  { width: 120, itemH: 182, offset: "-mt-[40px]" },
  { width: 120, itemH: 182, offset: "-mt-[40px]", paper: true },
  { width: 120, itemH: 182, offset: "-mt-[40px]", paper: true },
  { width: 120, itemH: 182, offset: "-mt-[40px]" },
  { width: 120, itemH: 182, offset: "-mt-[40px]" },
  { width: 105, itemH: 158, offset: "mt-[40px]"  },
  { width: 78,  itemH: 118, offset: "mt-[120px]" },
];

const ITEMS_PER_COL = 5;
const SWAP_INTERVAL_MS = 2000;   // how often a batch changes
const SWAP_COUNT = 5;            // cells replaced per tick
const CROSSFADE_MS = 800;
```

The offsets above are the one place arbitrary-looking values are permitted,
because they are a **composition**, not design tokens — keep them in this
config object, not scattered through JSX.

Rules: images come from the generated archive index, each with real alt text.
The section sits on `bg-mount`. **No `mix-blend-multiply` colour wash, no
noise overlay** — the Geptral reference uses both; here they would tint real
photographs, and the whole point is that the material is shown as it is.

Under `prefers-reduced-motion`, the interval does not start: the sheet renders
one static set.

`'use client'` reason: *"interval-driven crossfade over the archive index."*

### 5.6 — The record

The honest achievements strip. Reuse `ZoneD_RecordStrip.tsx`.

**One verified placement exists**: the Panasonic Award, ABU Robocon 2005. It
is stated with its attribution. Everything else in the competition history is
listed as participation, not placement. An `achievements.verified === false`
row renders as an entry with a stated gap — never as a claim.

### 5.7 — Open questions

The section that makes the whole page credible, and the one a generated
landing page would never include: what the archive does **not** say.

Set on `[data-field="paper"]`. A short list, in Plex Sans, of the genuinely
open items — competition results pending alumni outreach; the 11th committee's
term years; two members' portraits; every committee before the 11th. Each with
a plain sentence about what would close it.

Copy register: flat, specific, first-person-plural where natural. This is a
record of an institution, not a pitch.

### 5.8 — Footer

The mark, the three navigation groups, and a mono placard giving the archive's
date range. One hairline above it, `border-line-strong`.

No newsletter capture, no social proof row, no logo wall of "trusted by".

---

## 6. Copy rules — a lint rule fails the build

`no-prohibited-copy` rejects, among others: **premier, cutting-edge,
world-class, state-of-the-art, empowering, next-generation, high-performance,
global stage, shaping the future, collective, pushing boundaries, "where X
meets Y", unlock your potential, revolutionise, seamless, leverage,
game-changing, get started, book a demo, join the waitlist, world-renowned,
leading robotics**.

The prototype shipped *"Bangladesh's premier engineering collective… "* and
two of its four figures were false. That is the failure this rule exists to
prevent.

**CTA verbs are Apply, Read, or View.** Not "Get started", not "Learn more".

Write in the past tense for anything that happened. State what is known and
name what is not.

---

## 7. Behaviour rules that span zones

- **Reduced motion is a launch blocker, not a nice-to-have** (§5.5, §14). All
  translation and scale removed; opacity only. GSAP timelines are gated on
  `gsap.matchMedia()` and must never be *built* under the query, not merely
  paused.
- **The page must be legible and complete with JavaScript disabled.** Every
  zone renders its content server-side. Motion is enhancement.
- **No scroll hijacking without a computed, finite end** (§17.3). A pin that
  never releases is the banned pattern; a pin with a measured end is allowed.
- **Skip link first in the DOM**, pointing at `<main id="main">`, at the same
  z-index as the intro overlay so the first Tab both dismisses the intro and
  lands on the link.
- **No custom decorative cursor at any breakpoint.** The Geptral reference
  uses a `backdrop-blur` glass cursor; `backdrop-filter` is banned here and a
  cursor that replaces the system cursor is an accessibility regression.
- **Touch targets ≥ 44px.** Controls depress 1px on `:active` rather than
  lifting on hover — no lift-on-hover anywhere (§5.5).
- **Focus is always a visible ring**, `--color-focus-ring`, 2px, offset 2px.
  Never `outline: none` with a colour change substituted.

---

## 8. Budgets — measured, and currently failing

`node scripts/check-budgets.mjs` measures actual gzipped bytes referenced by
the built HTML.

| Budget | Limit | Current on `/` |
| --- | --- | --- |
| JS modern | 125 KB | **164.3 KB — OVER** |
| JS legacy | 165 KB | **203.0 KB — OVER** |
| JS first-party | 15 KB | 12.6 KB ok |
| CSS | 24 KB | 10.9 KB ok |
| Fonts | 110 KB | 108.6 KB ok |

The overage is GSAP + Lenis at **49.4 KB gzipped**, carried deliberately for
the motion sheet. `/sheet-01`, the same design system without them, passes at
106.1 KB.

**This means: no new runtime dependency may be added to this route.** Not
`framer-motion`, not `three`, not a carousel library. If a zone needs
behaviour GSAP cannot give it, write it by hand.

---

## 9. Acceptance checklist

- [ ] Ground is `bg-bg-base` (light). `[data-field="deep"]` appears exactly once.
- [ ] Every photograph sits on `bg-mount`, shown whole, with real alt text.
- [ ] Three families only: Plex Sans, Plex Mono, Source Serif 4. No `<link>` to a font CDN.
- [ ] No `wght` above 700 requested from Plex Sans anywhere.
- [ ] Zero gradients (except a ≤12% legibility scrim over a photograph), zero `box-shadow` on static surfaces, zero `backdrop-filter`, zero accent glow.
- [ ] Zero arbitrary Tailwind values outside the documented `COLS` composition object.
- [ ] Every figure traces to `StatsDTO` or a counted archive value. No `+` suffixes.
- [ ] The Panasonic Award is the only placement stated. Zone 5.7 names the open questions.
- [ ] `pnpm audit:pii` clean — no contact field rendered anywhere.
- [ ] `prefers-reduced-motion` removes the intro and every scroll timeline; page still complete.
- [ ] Page renders fully with JS disabled.
- [ ] Every `'use client'` has a written reason in `config/client-allowlist.json`.
- [ ] `pnpm gate` passes: typecheck, lint, 33/33 rule tests, PII self-test, PII scan.
- [ ] `node scripts/check-budgets.mjs` shows CSS ≤ 24 KB and **no new JS dependency** on `/`.
- [ ] `/sheet-01` still builds and is untouched.

---

## 10. Working notes

- **Do not run `pnpm build` while `pnpm dev` is running.** They share
  `apps/web/.next` and every page then 500s with `Cannot find module
  './330.js'`, which reads like a code error and is not one. Fix:
  `rm -rf apps/web/.next`.
- Content is baked in at build time. After editing in the admin panel, run
  `pnpm --filter @brs/web content` to regenerate `src/lib/*.generated.ts`.
- Where `PROJECT_SPEC.md` and `implementation_plan.md` conflict, the
  implementation plan wins.
