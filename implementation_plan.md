# BUET Robotics Society — Implementation Plan

**Version** 1.0 · **Date** 30 July 2026 · **Status** Awaiting Phase L kick-off
**Companion document** [`PROJECT_SPEC.md`](PROJECT_SPEC.md) — vision, design system, IA, anti-pattern register
**Authority** This plan governs execution. Where it conflicts with `PROJECT_SPEC.md`, this plan wins; conflicts are enumerated in §1.3.

---

## Table of contents

| § | Section | For |
| --- | --- | --- |
| 1 | Executive summary & reconciliation | All |
| 2 | Forensic teardown of the current prototype | Design, all |
| 3 | The anti-slop doctrine & sign-off rubric | Design, reviewers |
| 4 | **Landing page — full design specification** | Design, frontend |
| 5 | Phased workflow & the Landing Gate | Project lead |
| 6 | Decoupled architecture | Architecture, backend |
| 7 | The API contract | Backend, frontend |
| 8 | Data model | Backend |
| 9 | Asset & media subsystem (incl. SharePoint) | Backend |
| 10 | Frontend delivery architecture | Frontend |
| 11 | Repository & environments | All engineering |
| 12 | Security, privacy & governance | All |
| 13 | Quality gates | All |
| 14 | Post-landing phases | Project lead |
| 15 | Risk register | Project lead |
| 16 | Open decisions | Client |

---

## 1. Executive summary

### 1.1 What this plan delivers

A ten-route archive website for a twenty-year-old engineering institution, built on a **strictly decoupled backend** whose data structures survive any number of future frontend rewrites, and fronted by a **bespoke landing page** that must clear an explicit anti-AI-slop rubric before any other page is built.

Three directives govern everything below:

| # | Directive | Mechanism in this plan |
| --- | --- | --- |
| 1 | Landing page must be bespoke, hand-crafted, zero AI-slop | §2 teardown · §3 rubric with 34 binary checks · §4 full specification |
| 2 | Strict landing-page-first sequencing with explicit sign-off | §5 the Landing Gate — a hard stop with named approvers and a signature block |
| 3 | Backend must survive a total frontend replacement | §6 four-plane architecture · §7 versioned API contract published as a package · Postgres as source of truth |

### 1.2 The single most important architectural decision

**The decoupling boundary is the database schema plus a versioned API contract — not the CMS product.**

This distinction is the whole game. Most "headless" setups move coupling rather than remove it: pick a CMS with a proprietary datastore and opaque response shapes, and you have simply exchanged a frontend dependency for a vendor dependency. Replacing the frontend is then easy; replacing the CMS means re-modelling everything.

This plan therefore mandates:

1. **PostgreSQL owns the data.** Schema is versioned in git as SQL migrations. The CMS is a UI over *our* schema, not a black box holding our content hostage.
2. **A stable DTO contract at `/v1/*`**, published as a generated, semver'd TypeScript package. Frontends import the package; they never learn CMS-specific query syntax.
3. **Static delivery.** The public site builds against the API and ships as static files. The backend is required for *authoring*, never for *serving* — so the website stays up even if the CMS is down, migrating, or being replaced.

The result satisfies the directive in both directions: swap the frontend, backend untouched; swap the CMS, frontend untouched.

### 1.3 Deliberate departures from `PROJECT_SPEC.md`

Stated plainly rather than left as silent contradictions.

| Topic | `PROJECT_SPEC.md` said | This plan says | Why |
| --- | --- | --- | --- |
| **Phase order** | Design system fully built (Phase 3) before any page work | Landing page first; design system is *extracted* from it after sign-off | Directive 2 is explicit. Reconciled in §5.2 — tokens are still authored first; only component *generalisation* is deferred. |
| **Content backend** | Keystatic, git-based flat files | Directus over PostgreSQL, with an API façade | Directive 3. Flat files in the frontend repo are the definition of coupling — replacing the frontend would mean migrating all content. |
| **Delivery target** | Static, Cloudflare Pages | Unchanged, but now built from the API | Preserves the "backend can be down" property. |
| **Frontend framework** | Astro 5 recommended | **Next.js 15 + Tailwind CSS** — client decision, §16.14 resolved 30 Jul 2026 | Team React familiarity is the binding constraint. Cost accepted and quantified in §4.7 and §10.7. |

Everything else in `PROJECT_SPEC.md` — the palette derived from the logo, the type system, the motion rules, the privacy controls, §17's anti-pattern register — remains binding.

---

## 2. Forensic teardown of the current prototype

The screenshots at `localhost:3000` are the reference for what must not ship. This section names each failure precisely, because "make it less AI" is not an actionable instruction.

### 2.1 Structural failure — the canonical AI layout

The prototype uses the single most reproduced landing-page skeleton in existence:

```
        [ ✦ pill badge with icon ]
        MASSIVE HEADLINE WITH
        GRADIENT ON THE MIDDLE WORDS.
        One paragraph of aspirational copy.
        [ filled gradient CTA ]  [ ghost CTA ]
        ┌──────────────────────────────────┐
        │  480+     35+     10     40+     │
        └──────────────────────────────────┘
```

Badge → headline → paragraph → two buttons → stat bar. Every element centred or left-flushed in one column, evenly spaced, symmetrical. This structure is not *bad*; it is *anonymous*. It is the shape a language model produces because it is the shape of its training data. **No amount of colour or font substitution rescues it — the skeleton itself is the tell,** which is why §4 discards it entirely rather than restyling it.

### 2.2 Itemised defects

| # | Defect in screenshot | Why it fails | `PROJECT_SPEC.md` |
| --- | --- | --- | --- |
| 1 | Pill badge with sparkle icon: `✦ BANGLADESH UNIVERSITY…` | The sparkle glyph is the *literal* AI-product icon of 2023–26. A twenty-year-old engineering society announcing itself with a magic-wand sparkle is a category error. | §17.1 |
| 2 | Neon cyan accent (~`#22D3EE`) | The exact cliché named and forbidden. Reads as gaming peripheral. Ignores a measured brand palette. | §17.2 |
| 3 | Cyan glow on stat card border and headline | Glow is the opposite of precision. Precision is a hairline. | §5.1, §17.2 |
| 4 | Gradient text — cyan→lime on "Autonomous Robotics" | Top-three AI signature. Also fails contrast auditing at the pale end. | §17.1, §17.5 |
| 5 | "Shaping the Future of Autonomous Robotics" | Fails the transferability test — works verbatim for any robotics org on earth. | §5.8 |
| 6 | "Bangladesh's premier engineering collective… high-performance… global stage" | Four unverifiable superlatives in two sentences. "Collective" is startup register, not university-society register. | §17.4 |
| 7 | Photograph faded to ~8% behind text | Uses evidence as mood wallpaper. Inverts the site's entire thesis: the archive is the product. | §5.6 |
| 8 | Rounded stat card, ~16px radius, glowing | Consumer-app friendliness fighting an archive concept. | §17.5 |
| 9 | `+` suffix on three of four stats | The rounded-up "+" is an AI tell *and* an admission the real number was never counted. | §17.4 |
| 10 | Two filled/ghost gradient buttons with a shield icon | Shield iconography implies security software. | §17.1 |
| 11 | Perfectly symmetrical, evenly-spaced vertical rhythm | Absence of art direction. Human designers break rhythm deliberately. | §5.3 |
| 12 | Default tracking on display type, no width axis | No optical correction at 100px+. The clearest craft tell at a glance. | §5.2 |

### 2.3 Two of the four statistics are factually wrong

More serious than any aesthetic issue. Verified against the archive:

| Claim | Reality | Verdict |
| --- | --- | --- |
| **480+ ACTIVE MEMBERS** | ~470 is the count of *all roster rows across seven historical committees, 3rd–10th, spanning ~2013–2025*. The current (10th) committee is ~52 people. | **False.** Overstates active membership by roughly 9×. |
| **10 EXECUTIVE COMMITTEES** | Seven are documented (3rd, 4th, 5th, 7th, 8th, 9th, 10th). The 1st, 2nd, and 6th are absent from the archive entirely. | **Unsupported.** Ordinal ≠ count. |
| 35+ COMPETITIONS ENTERED | Six international programmes plus six national contests are evidenced. "35" has no basis in the archive. | **Unsupported.** |
| 40+ WORKSHOPS & SEMINARS | 19 workshops + 11 seminars = 30. | **Inflated.** |

This is the real lesson of the teardown. Generated copy invents plausible numbers, and a sponsor or competition organiser who checks one of them stops trusting all of them. The site's entire credibility strategy is *evidence over adjectives* — and the prototype's headline numbers are the least evidenced content on the page.

**Rule adopted:** every number on the site is computed from content collections at build time or cited to a verifiable source. No number is typed by hand into a component. No `+` suffixes. See §3.3 and §13.4.

---

## 3. The anti-slop doctrine

### 3.1 What "hand-crafted" actually means

Slop is not a style; it is the *absence of decisions*. Generated layouts default to symmetry, even spacing, centred composition, uniform card sizes, and library-default typography — because those are the statistical mean. Craft is visible where a human overrode a default for a reason.

Four operational tests. Any element failing all four is slop regardless of how it looks:

1. **The specificity test.** Could this element appear unchanged on another robotics club's site? If yes, it carries no information.
2. **The override test.** What library or framework default was deliberately overridden here, and why? If nothing, no decision was made.
3. **The asymmetry test.** Is this composition symmetrical because symmetry was chosen, or because symmetry is what happens when nobody chooses?
4. **The evidence test.** Does this element show something real from the archive, or gesture at a concept?

### 3.2 Craft markers — mandatory on the landing page

Details a generated page does not produce. Each is individually verifiable in review.

**Typographic**
- Variable-font **width axis** engaged on display type (Archivo `wdth` 105–115). Nothing in the prototype uses a width axis.
- Optical tracking curve: `−0.03em` at ≥96px, `−0.015em` at 32–95px, `0` at body sizes. Not one global value.
- Hanging punctuation and optical left-margin correction on large type.
- Typographic apostrophes throughout — `EEE ’20` with U+2019, never `'`.
- En-dashes for all ranges — `01–02 Feb 2024`, never a hyphen.
- Tabular figures in every numeric context (`font-variant-numeric: tabular-nums`).
- True small-caps or properly tracked uppercase — never `text-transform: uppercase` at default tracking.

**Compositional**
- Asymmetric grid placement. The hero block starts at column 2 of 12 and spans 7 — never centred, never full-bleed.
- Deliberately irregular vertical rhythm: section spacing alternates `160 / 96 / 224 / 128px`, not a constant.
- Plates at three different sizes in one row (7 / 5 / 5 with offset), not a uniform 3-up grid.
- One intentional overflow — a plate that breaks the content margin into the outer gutter. Precisely once per page.

**Material**
- Hairlines at genuinely sub-pixel weight on high-DPI (`0.5px` via `scaleY` transform), not a 1px approximation.
- Zero border-radius on plates and structural surfaces; `2px` on inputs only.
- No `box-shadow` anywhere on the landing page. Elevation is expressed by surface value and hairline alone.
- Custom-drawn arrow glyph as inline SVG on a 24px grid — not a Lucide/Heroicons default.
- Photographs at full contrast inside sharp frames. Never faded, never tinted, never used as background texture.

### 3.3 Prohibited on the landing page — absolute

Beyond `PROJECT_SPEC.md` §17, which remains fully in force:

- Pill/badge eyebrows of any kind. Sparkle, star, or wand glyphs — categorically.
- Gradient text fills. Gradient button fills. Gradient borders.
- Any `box-shadow` or `drop-shadow` in an accent hue.
- Neon cyan, electric blue, lime, or magenta at any opacity.
- Rounded "glass" cards; `backdrop-filter` anywhere.
- Rounded-up statistics; `+` or `~` suffixes on numbers.
- The badge→headline→paragraph→two-buttons sequence, in any styling.
- Symmetrical centred single-column hero.
- Photographs below 100% opacity used behind text.
- Aspirational abstractions: "shaping the future", "premier", "cutting-edge", "world-class", "collective", "empowering", "high-performance", "global stage", "next generation".
- Icon + noun + one-line feature grids.
- Count-up number animations.
- Any component recognisable as a shadcn/ui, MUI, or Bootstrap default.

### 3.4 Landing Gate rubric — 34 binary checks

The landing page cannot pass the Gate (§5.3) with a single **FAIL**. Reviewed by the design lead and one person who has not seen the work in progress.

**A · Structure (6)**
1. Hero does not use the badge→headline→paragraph→buttons sequence.
2. Hero composition is asymmetric on the 12-column grid.
3. Vertical section rhythm is deliberately irregular, not constant.
4. At least one row uses non-uniform element widths.
5. Exactly one deliberate margin overflow exists.
6. Page reads as an archive document, not a product landing page.

**B · Colour (5)**
7. Every accent value traces to the measured logo palette (§`PROJECT_SPEC.md` 5.1).
8. Zero gradients, except a ≤12% legibility scrim.
9. Zero glow — no accent-hue shadow of any kind.
10. Oxblood `--signal` appears ≤2 times per viewport.
11. All text/background pairings pass WCAG AA, verified with a tool.

**C · Typography (7)**
12. Width axis engaged on display type.
13. Optical tracking curve applied by size band, not globally.
14. Tabular figures in every numeric context.
15. Typographic apostrophes throughout; zero straight quotes.
16. En-dashes on every range.
17. Uppercase always paired with added tracking.
18. ≤3 type sizes per viewport, labels excepted.

**D · Imagery (5)**
19. Every photograph is from the BRS archive. Zero stock.
20. Every photograph is at 100% opacity in a defined frame.
21. Every photograph has a plate number and factual placard.
22. Every image has substantive alt text ≥12 characters.
23. Crops use only the ratio set `1:1 / 3:2 / 16:9 / 4:5`.

**E · Copy (5)**
24. No sentence survives the transferability test.
25. Zero words from the §3.3 prohibited list.
26. Every number is computed or cited — no hand-typed figures, no `+`.
27. All event references are past tense.
28. Every factual claim traces to `PROJECT_SPEC.md` Appendix B or a cited source.

**F · Motion & a11y (6)**
29. All durations ≤400ms; all easing from the §5.5 token set; zero spring/bounce.
30. Scroll reveals ≤8px translation, fire once.
31. `prefers-reduced-motion` fully honoured; verified by toggling the OS setting.
32. Full keyboard traversal including the zone rail and Record axis.
33. Zero hover-only information.
34. Axe-core: zero violations. Lighthouse a11y = 100.

---

## 4. Landing page specification

### 4.1 Concept — "SHEET 01"

The landing page is composed as **the first sheet of a technical drawing set.**

This extends the "Engineering Record" concept from `PROJECT_SPEC.md` §2.1 into a specific, buildable page grammar — and it is chosen for three reasons that no styling exercise could deliver:

1. **It is structurally alien to AI landing pages.** A drawing sheet has edge zoning, a title block, and a revision table. There is no training-data analogue, so the layout cannot drift toward the mean.
2. **It is authentic to the institution.** BUET students draft engineering drawings. This is their native visual language, not a metaphor imported from consumer technology.
3. **It solves a real content problem.** Twenty years of mixed-quality photography looks like neglect in a glossy layout and like *provenance* in an archive layout.

**Critical constraint — abstraction, not skeuomorphism.** We take the *grammar* of a drawing sheet: edge zoning, a title block, revision history, hairline rules, mono annotation, orthographic restraint. We do **not** draw a CAD border, a paper texture, or a blueprint background. Literal skeuomorphism would be its own cliché. The reference should be legible to an engineer and invisible to everyone else — they should simply register precision.

### 4.2 Composition

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ▪ BRS          RECORD   EVENTS   COMMITTEE   NUVOLA   EXPLORE   APPLY   │ masthead
├──┬──────────────────────────────────────────────────────────────────────┤
│  │                                                                      │
│A │  BANGLADESH UNIVERSITY OF ENGINEERING & TECHNOLOGY · DHAKA           │
│  │  ──────────────────────────────────────────────────                  │
│· │                                                                      │
│  │   BUET                              ┌──────────────────┐             │
│· │   ROBOTICS                          │                  │             │
│  │   SOCIETY                           │   [ PL. 001 ]    │             │
│· │   ────────────────────              │   photograph     │             │
│  │                                     │   4:5, sharp,    │             │
│B │   Robots designed, built and        │   100% opacity   │             │
│  │   campaigned at BUET since 2005.    │                  │             │
│· │   Six international programmes.      └──────────────────┘             │
│  │   Nineteen workshops.                PL. 001                         │
│· │   One Panasonic Award.                ROBO CARNIVAL 2024             │
│  │                                       BUET PREMISES · 01–02 FEB 2024 │
│· │   01 ── THE RECORD              →                                    │
│  │   02 ── APPLY FOR MEMBERSHIP    →                                    │
│C │                                                                      │
├──┼──────────────────────────────────────────────────────────────────────┤
│  │  THE RECORD                                          2005 —— 2026    │
│· │  ╷    ╷ ╷╷  ╷ ╷╷╷ ╷  ╷╷ ╷ ╷╷╷╷  ╷ ╷ ╷╷╷╷ ╷╷  ╷ ╷╷╷╷╷╷ ╷ ╷ ╷╷╷╷      │
│D │  2005      2012   2013      2015     2016        2024                │
│  │  ROBOCON   IRC    NASA      iARC     URC ROVER   ROBO CARNIVAL       │
│· │  PANASONIC DEBUT  LUNABOTICS TECHKRITI CHALLENGE 6 SEGMENTS          │
├──┼──────────────────────────────────────────────────────────────────────┤
│  │  WHAT WE BUILD                                                       │
│E │  ┌────────────────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │  │  COMPETE   (7 cols)    │ │ BUILD (5)    │ │ TEACH (5)    │        │
│· │  └────────────────────────┘ └──────────────┘ └──────────────┘        │
│  │                              ↑ offset down 48px — deliberate         │
├──┼──────────────────────────────────────────────────────────────────────┤
│F │  TEAM NUVOLA · SPEC. NVL-01     [ full-bleed plate, one sentence ]   │
├──┼──────────────────────────────────────────────────────────────────────┤
│G │  THE ARCHIVE — contact sheet, 24 × 1:1 frames, hairline grid         │
├──┼──────────────────────────────────────────────────────────────────────┤
│H │  PARTNERS — hairline row, greyscale        PRESS — 3 clippings       │
├──┼──────────────────────────────────────────────────────────────────────┤
│I │  APPLY — one sentence left, entry right. No gradient CTA.            │
├──┴──────────────────────────────────────────────────────────────────────┤
│  SHEET INDEX 01–10 · MODERATOR · CONTACT · REV 2026.07    [title block] │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Persistent chrome

**Masthead.** 72px, collapsing to 56px past 120px scroll. Logo as inline SVG at 28px, left. Navigation right: mono uppercase `micro`, `0.14em` tracking, `--text-secondary`, hairline underline draw on hover. `APPLY` is the rightmost item, distinguished by a 1px hairline box — **not** a filled pill. Hairline base at all times.

**Zone rail** (≥1280px). A 40px vertical rail at the left edge carrying zone letters `A–I` mapped to sections, with fine tick marks between. Current zone in `--text-primary`; others `--text-tertiary`. Doubles as scroll progress and section navigation.

This is the page's most distinctive device and it must be built as a **real `<nav>` landmark containing real anchor links** — not a decorative scroll indicator. Keyboard traversable, `aria-current="true"` on the active zone. Below 1280px it is removed entirely rather than degraded.

**Title block.** Fixed bottom-right, 280×72px, `--bg-raised`, hairline border, mono `micro`. Updates on scroll:

```
BUET ROBOTICS SOCIETY
SHEET 01/10 · ZONE B · REV 2026.07
```

Hidden below 1024px. Purely informational — never the sole route to anything.

### 4.4 Zone A/B — the opening

The replacement for the prototype's hero, and the section where sign-off will be won or lost.

**Grid.** Content in columns 2–8 of 12. Plate in columns 9–12. Nothing centred. Nothing full-bleed. Left content top-aligned at `224px` from the masthead; the plate hangs `64px` lower — the asymmetry is the point.

**Eyebrow.** No badge. A hairline rule, then one mono line:

```
BANGLADESH UNIVERSITY OF ENGINEERING & TECHNOLOGY · DHAKA
```
`label` size, `0.12em` tracking, `--text-tertiary`.

**Wordmark hero.** The institution's name *is* the headline. Three stacked lines, no gradient, no colour break:

```
BUET
ROBOTICS
SOCIETY
```

```css
font-family: Archivo Variable;
font-variation-settings: 'wght' 600, 'wdth' 112;
font-size: clamp(3.5rem, 9vw, 8.5rem);
line-height: 0.86;
letter-spacing: -0.03em;
color: var(--text-primary);
text-wrap: balance;
margin-left: -0.06em;            /* optical left correction */
```

Then a full-width hairline rule beneath, drawn on load (`scaleX 0→1`, 400ms, `--ease-out`). This is the page's one flourish, and it is a 1px line.

Rationale: the prototype spent its largest typographic asset on an interchangeable slogan. A twenty-year-old institution's name, set with authority, communicates more than any sentence about the future — and it cannot be transplanted to another organisation.

**Statement.** `body-l`, `--text-secondary`, max 46ch:

> Robots designed, built and campaigned at Bangladesh University of Engineering & Technology since 2005. Six international programmes. Nineteen workshops. One Panasonic Award.

Every clause is evidenced in `PROJECT_SPEC.md` Appendix B. Four short declaratives, no adjectives, and a closing specific enough that a sponsor can verify it. Note what is absent: *premier*, *collective*, *high-performance*, *global stage*.

⚠️ "since 2005" is currently an inference from Robocon 2005, not a confirmed founding date — see §16.6. If unconfirmed at build time, use "since ABU Robocon 2005", which is strictly true.

**Actions.** Indexed hairline rows, not buttons:

```
01 ── THE RECORD                    →
02 ── APPLY FOR MEMBERSHIP          →
```

Mono `label` for the index, `heading-s` for the label, custom 24px-grid arrow SVG right-aligned. Hover: hairline draws left→right, arrow translates `4px`, colour → `--accent`. No fill, no radius, no gradient, no icon library.

**The plate.** One photograph from `best 20/Best of the bests/`, 4:5, hairline border, **100% opacity, full contrast.** Placard beneath in mono:

```
PL. 001
ROBO CARNIVAL 2024 · BUET PREMISES
01–02 FEB 2024 · 6 SEGMENTS
```

This is the decisive inversion. The prototype faded a photograph to ~8% as mood texture behind text; here the photograph is *presented as evidence*, framed and captioned like a museum object. Same asset, opposite thesis.

### 4.5 Zone D — the Record strip

**Replaces the stat bar entirely.** Two independent reasons: the bar is an AI tell (§2.2), and half its numbers are false (§2.3).

Full-bleed, 200px tall. A hairline baseline with one tick per year, 2005→2026; tick height scales with event density that year; six labelled anchors. Horizontally scrubbable via drag and wheel *within its own bounds* — it never hijacks page scroll.

**Implementation:** semantic `<ol>` of real anchor links, arrow-key navigable, `aria-current` on focus. Under `prefers-reduced-motion` it renders as a static chronological list. This is an Astro island — the only meaningful JS above the fold.

Where discrete numbers are genuinely useful they appear in a hairline row beneath, **exact and unsuffixed**:

```
7 EXECUTIVE COMMITTEES DOCUMENTED    19 WORKSHOPS    11 SEMINARS    1,105 ARCHIVE PHOTOGRAPHS
```

All four computed from content collections at build time (§13.4). Precision *is* the brand; `480+` is its opposite.

### 4.6 Zones E–I

**E · What we build.** Three plates at 7/5/5 columns — the BUILD plate offset `48px` lower. Each is a real photograph with a real placard: COMPETE (international programmes) · BUILD (Team NUVOLA, workshops) · TEACH (workshop series). No icons, no blurbs.

**F · Team NUVOLA.** One full-bleed plate, `SPEC. NVL-01`, one factual sentence. **Blocked** — the archive holds exactly one unrenderable HEIC (§16.4). If unresolved at Gate time, this zone is cut and the nav item removed. A stub does not ship.

**G · The archive.** Contact-sheet teaser: 24 × 1:1 frames, hairline grid, plate numbers, → `/gallery`. This zone contains the deliberate margin overflow (§3.2) — the grid breaks the right content margin into the outer gutter by 64px.

**H · Partners & press.** Hairline row, greyscale, optically sized (not uniformly scaled). Three Prothom Alo clippings as `PressClip`. Partner vectors pending §16.5.

**I · Apply.** One sentence left, entry right. Hairline-boxed action. No gradient, no full-width colour band.

**Footer / title block expanded.** Full sheet index 01–10 as a numbered list, moderator, `buet.robotics.society@gmail.com`, Facebook, revision stamp, credits.

### 4.7 Landing page budgets

Tighter than the site-wide budgets in `PROJECT_SPEC.md` §13, because this page is the credibility test.

| Metric | Budget |
| --- | --- |
| LCP (Slow 4G, mid-tier Android) | **< 1.6s** |
| CLS | **< 0.02** |
| INP | < 200ms |
| JS — framework baseline | ≤ 110 KB gzip (Next 15 + React 19 App Router floor — fixed cost) |
| JS — **first-party** | **≤ 15 KB gzip** (ZoneRail + RecordAxis only) ← the number the team controls |
| JS — total First Load | **≤ 125 KB gzip** |
| CSS | < 24 KB gzip |
| Fonts | < 90 KB — 2 files, subset, preloaded |
| LCP image | < 180 KB AVIF |
| Total (excl. lazy contact sheet) | < 720 KB |
| Lighthouse Perf / A11y / SEO | ≥ 95 / 100 / 100 |

**Budget revision — stated plainly.** The original `< 35 KB JS` and `Perf ≥ 98` targets were predicated on Astro's zero-JS-by-default output. They are **not achievable on Next.js 15**: the App Router's React 19 runtime floor is ~105–110 KB gzip before a single line of our code ships. Rather than carry a budget we would silently miss, it is revised above and split into a fixed framework cost and a first-party cost, so regressions are attributable.

What survives intact: **LCP < 1.6s and CLS < 0.02.** The page is statically rendered with a preloaded AVIF hero, so the JS is hydration-only and does not block the largest paint. What genuinely degrades is TBT/INP on mid-tier Android — hence the relaxation to 200ms and the RSC discipline in §10.3.

### 4.8 Deliverables for the Gate

1. Static comps at 1440 / 768 / 375, both themes.
2. Working prototype at production quality — real archive assets, real content, zero placeholder text.
3. `docs/LANDING_RATIONALE.md` — for each zone, the default overridden and why (§3.1 test 2).
4. Completed §3.4 rubric, all 34 checks, signed.
5. Lighthouse and axe reports meeting §4.7.
6. Recorded keyboard-only traversal.
7. Recorded `prefers-reduced-motion` pass.

---

## 5. Phased workflow & the Landing Gate

### 5.1 Sequence

```
Phase 0   Alignment & foundation          ─┐
Phase B1  Backend core                     │ may run in parallel with L
Phase B2  Asset subsystem                 ─┘
Phase L   LANDING PAGE                    ← exclusive on the frontend track
══════════  ▓▓▓  THE LANDING GATE  ▓▓▓  ══════════  hard stop
Phase 1   Design-system extraction
Phase 2   Content production
Phase 3   Page build-out
Phase 4   Handover & launch
```

**Backend work (B1, B2) proceeds in parallel with Phase L.** This is not a violation of Directive 2, which governs *page UI*. Backend and frontend are decoupled by construction (§6) — that is the entire point of the architecture, and serialising them would waste weeks for no benefit. The Gate blocks **UI**, not infrastructure.

### 5.2 Reconciling "landing first" with "design system first"

`PROJECT_SPEC.md` §18 sequenced the design system before any page. Directive 2 inverts this. The reconciliation:

- **Design *tokens* are still authored first**, in Phase 0. Colour, type, spacing, motion — these are decisions, not components, and building the landing page without them guarantees drift.
- **Components are authored *in service of the landing page*, in place**, without premature generalisation. A `Plate` built for one page is a concrete thing; a `Plate` designed for ten hypothetical pages before any exists is speculation.
- **Generalisation happens in Phase 1**, after sign-off, by extracting proven components into the system.

This is the correct order regardless of the directive. Abstracting before you have two use cases is how design systems acquire options nobody needs.

### 5.3 The Landing Gate

**Nothing on the frontend track proceeds until the landing page is signed off.** Explicitly forbidden during Phase L: building any other route, generalising components for reuse, scaffolding other page layouts, writing content for other pages (that is Phase 2), or "quickly sketching" another page.

**Pass conditions — all six required.**

| # | Condition | Verified by |
| --- | --- | --- |
| 1 | All 34 rubric checks PASS (§3.4) | Design lead + one fresh reviewer |
| 2 | Budgets met (§4.7) | Lighthouse CI artefact |
| 3 | Axe zero violations; keyboard and reduced-motion recordings supplied | Recording |
| 4 | All seven Gate deliverables supplied (§4.8) | Project lead |
| 5 | Zero placeholder content; every asset from the archive | Manual review |
| 6 | Written client sign-off | Signature block below |

```
────────────────────────────────────────────────────────────
LANDING PAGE SIGN-OFF

I approve the landing page as specified and implemented.
Phase 1 is authorised to begin.

Name  ________________________  Role  ______________________

Date  ________________________  Rev   ______________________
────────────────────────────────────────────────────────────
```

**On rejection:** written feedback mapped to specific zones (§4.4–4.6) or rubric IDs (§3.4). Revision, then full re-review — not a partial re-check. Budget three revision cycles; a fourth signals a concept-level disagreement that must be resolved at §4.1, not in CSS.

---

## 6. Decoupled architecture

### 6.1 Four planes

```
┌──────────────────────────────────────────────────────────────────┐
│  PLANE 4 — DELIVERY                                              │
│  Static site (Next.js 15, output:'export') · Pages · edge CDN    │
│  Knows ONLY: @brs/content-client (§7.4)                          │
└──────────────────────────────────────────────────────────────────┘
                    ▲ build-time fetch · webhook rebuild
                    │ ── replaceable without touching anything below
┌──────────────────────────────────────────────────────────────────┐
│  PLANE 3 — CONTRACT                                              │
│  Content API façade (Hono on Workers) · /v1/* · OpenAPI 3.1       │
│  Stable DTOs · edge cache · SWR · generated typed client          │
└──────────────────────────────────────────────────────────────────┘
                    ▲ internal adapter — the ONLY CMS-aware code
┌──────────────────────────────────────────────────────────────────┐
│  PLANE 2 — AUTHORING                                             │
│  Directus · RBAC · media library · workflow · webhooks            │
│  Replaceable: it is a UI over our schema, not the owner of data   │
└──────────────────────────────────────────────────────────────────┘
                    ▲ SQL
┌──────────────────────────────────────────────────────────────────┐
│  PLANE 1 — DATA (SOURCE OF TRUTH)                                │
│  PostgreSQL · migrations in git · nightly logical backup          │
│  Object storage (R2/Azure Blob) · SharePoint sync worker          │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 How each swap works

The directive is that a frontend replacement leaves the backend untouched. The architecture delivers that, and the reverse.

| Scenario | Blast radius |
| --- | --- |
| **Frontend rewritten** (Astro → Next/SvelteKit/native) | Plane 4 only. New frontend installs `@brs/content-client`, consumes identical `/v1/*` DTOs. Planes 1–3 unchanged, not redeployed. |
| **CMS replaced** (Directus → Payload/Strapi/custom) | Plane 2 + the façade's internal adapter. Postgres schema and `/v1/*` contract unchanged. Frontend unaware. |
| **Storage moved** (R2 ↔ Azure Blob ↔ S3) | Storage adapter config. Asset URLs are always façade-issued, never provider URLs. |
| **Breaking content change** | `/v2/*` published alongside `/v1/*`. Both served during migration. Frontends migrate independently. |
| **Backend entirely down** | Public site unaffected — it is static. Authoring pauses; delivery does not. |

That last row is worth stating plainly: for a student club with annual turnover and no on-call rotation, **a website that cannot be taken down by backend failure is worth more than any feature.**

### 6.3 Technology decisions

| Plane | Choice | Rationale |
| --- | --- | --- |
| Data | **PostgreSQL 16** | Relational content (committees→teams→members) is genuinely relational. Managed on Neon or Supabase free tier; portable either way. |
| Authoring | **Directus 11** | Thin layer over *our* Postgres schema — the key property. Genuinely usable admin UI for non-technical ExCom handover, strong RBAC, storage adapters, webhooks. Open-source, free at this scale. |
| Contract | **Hono on Cloudflare Workers** | Tiny, edge-deployed, standards-based. Stateless — it holds no data, so it is disposable by design. |
| Delivery | **Next.js 15 + Tailwind 4** | Client decision. See §10. |
| Storage | **Cloudflare R2** | Zero egress fees, decisive for a 1.78 GB image archive. S3-compatible, so portable. Azure Blob if the tenant mandates it (§16.2). |

**Explicitly rejected:** Sanity, Contentful, Hygraph (proprietary datastores — content hostage, exactly the coupling we are removing) · WordPress + REST (maintenance and security burden across annual handover) · Payload 3 embedded in Next (couples CMS to frontend framework — the specific thing Directive 3 forbids) · Firebase/Firestore (document store fighting relational content; vendor lock).

**Is the façade over-engineering?** A fair challenge for a club site. Directus already exposes REST and GraphQL, so the frontend *could* call it directly. But Directus responses carry Directus-isms — `?fields=`, `?deep=`, junction-table shapes, `meta` envelopes — and once a frontend depends on those, replacing the CMS means rewriting every query. The façade is ~600 lines and converts an eventual migration from *months* to *days*. Given the explicit directive, it is justified. If it is ever descoped, `@brs/content-client` must still be the frontend's only import surface, so the seam survives.

---

## 7. The API contract

### 7.1 Principles

1. **DTOs are frontend-agnostic.** No CMS field names, no junction tables, no `meta` envelopes.
2. **Versioned in the path.** `/v1/*`. Breaking changes create `/v2/*`; the old version is served for ≥6 months.
3. **Additive-only within a version.** New optional fields are permitted; renames, removals, and type changes are not.
4. **OpenAPI 3.1 is the artefact of record**, generated from Zod schemas — schema and documentation cannot diverge.
5. **Assets are façade-issued URLs**, never storage-provider URLs. Storage stays swappable.
6. **Read-only public surface.** Writes go through Directus with authentication.

### 7.2 Endpoints

```
GET  /v1/events                    ?category&year&series&featured&limit&cursor
GET  /v1/events/{slug}
GET  /v1/committees                 ?ordinal
GET  /v1/committees/{ordinal}
GET  /v1/members                    ?committee&team&department&batch&q
GET  /v1/achievements               ?track&from&to
GET  /v1/projects/{slug}            # Team NUVOLA
GET  /v1/posts                      ?tag&limit&cursor
GET  /v1/posts/{slug}
GET  /v1/partners
GET  /v1/press
GET  /v1/gallery                    ?event&year&limit&cursor
GET  /v1/stats                      # computed — never hand-typed (§2.3)
GET  /v1/assets/{id}                ?w&h&fit&fmt&q
GET  /v1/sitemap
GET  /v1/health
```

### 7.3 DTO shapes

Illustrative; authoritative definitions live in `packages/contract`.

```ts
type ImageDTO = {
  id: string;
  url: string;                    // façade-issued, provider-agnostic
  alt: string;                    // ≥12 chars — enforced at write time
  width: number; height: number;  // always present → zero CLS
  lqip: string;                   // inline base64 placeholder
  plate?: number;
  ratio: '1:1' | '3:2' | '16:9' | '4:5';
  credit?: string;
};

type EventDTO = {
  slug: string;
  title: string;
  category: 'workshop' | 'competition' | 'robo-carnival'
          | 'intra-buet' | 'seminar' | 'reception' | 'agm' | 'co-organised';
  series?: string;                // "Basic Workshop"
  edition?: string;               // "v8.0"
  dates: { start: string; end?: string };   // ISO-8601
  venue?: string; platform?: string;
  theme?: string; presentedBy?: string; eligibility?: string;
  segments?: { name: string; description: string; eligibility?: string }[];
  cover: ImageDTO;
  gallery: ImageDTO[];
  externalAlbum?: string;
  body: { format: 'html' | 'md'; content: string };
  copySource: 'web-ready' | 'derived' | 'authored';
  status: 'past' | 'upcoming';
  featured: boolean;
  updatedAt: string;
};

type MemberDTO = {
  id: string;
  name: string;
  designation: string;
  department: string;
  batch: string;                  // "EEE ’20" — U+2019
  committeeOrdinal: number;
  team?: string;
  portrait?: ImageDTO;
  // NO contact field. Absent from the DTO, the DB view, and the schema. §12.1
};

type StatsDTO = {          // every value computed; no `+` suffix anywhere
  committeesDocumented: number;   // 7  — not 10
  workshops: number;              // 19
  seminars: number;               // 11
  archivePhotographs: number;     // 1105
  internationalProgrammes: number;// 6
  currentCommitteeSize: number;   // ~52 — NOT 480
  yearsActive: number;
  computedAt: string;
};
```

`StatsDTO` exists specifically to make §2.3 structurally impossible to repeat. No component may render a hand-typed number; the linter forbids numeric literals in stat components (§13.4).

### 7.4 The contract package

`@brs/content-client` — generated from OpenAPI, semver'd, published to a private registry or consumed via workspace.

```ts
import { createClient } from '@brs/content-client';
const brs = createClient({ baseUrl: process.env.BRS_API_URL, version: 'v1' });
const events = await brs.events.list({ category: 'workshop' });
```

**This package is the contract made executable.** A replacement frontend installs it and is immediately correct. A frontend that bypasses it and calls Directus directly has broken the architecture — enforced by an ESLint rule banning direct backend imports outside `packages/contract` (§13.4).

### 7.5 Caching & invalidation

Edge cache at the façade: `s-maxage=300, stale-while-revalidate=86400`. Directus webhook on publish → purge affected tags → trigger Cloudflare Pages rebuild. Build-time reads bypass cache. Target: publish → live in under three minutes.

---

## 8. Data model

Postgres schema, migrations in `packages/db/migrations`, versioned in git. Directus reads this schema; it does not define it.

```
organisations          # BRS; future-proofs multi-society use
committees             # ordinal, term_start, term_end, moderator_id
committee_teams        # committee_id, name, sort_order
members                # name, department, batch, portrait_asset_id
                       #   ⚠ NO contact column — see §12.1
memberships            # member_id, committee_id, team_id, designation, sort_order
events                 # slug, category, series, edition, dates, venue, theme,
                       #   presented_by, eligibility, body, copy_source, status
event_segments         # event_id, name, description, eligibility
event_assets           # event_id, asset_id, plate_no, role(cover|gallery)
achievements           # year, programme, host, team_name, result, track,
                       #   related_event_id, verified boolean
projects               # slug, specimen_code, mission, subsystems jsonb
posts                  # slug, title, body, author_member_id, published_at
partners               # name, tier, logo_asset_id, years jsonb
press                  # outlet, published_on, scan_asset_id, event_id
assets                 # storage_key, provider, mime, width, height, alt,
                       #   lqip, credit, source(upload|sharepoint|drive|archive),
                       #   source_ref, checksum
asset_derivatives      # asset_id, width, format, storage_key, bytes
redirects              # from_path, to_path — for future IA changes
```

**Modelling notes.**

- `memberships` is a join table, not a column on `members`. A person serves on several committees over the years — the archive shows exactly this (Aasfee Mosharraf Bhuiya appears in both the 9th and 10th). Denormalising here would corrupt the alumni record.
- `achievements.verified` defaults **false**. Nothing renders as a placement until a human sets it true. This makes fabricated results (`PROJECT_SPEC.md` §17.4) structurally impossible — the Panasonic Award 2005 is currently the only row eligible for `true`.
- `assets.source` + `source_ref` preserve provenance: which SharePoint file, which Drive folder, which archive path. Essential for a 1,105-file import.
- `assets.checksum` deduplicates. The archive already contains verified duplicates (`IMG_6738.JPG` and `brs/lfr.JPG` are byte-identical at 8,679,826 bytes).
- `assets.alt` is `NOT NULL` with a `length >= 12` check. Alt text is enforced at the database level, not by reviewer diligence.

---

## 9. Asset & media subsystem

### 9.1 Ingestion paths

```
┌─ Directus upload (routine editorial)
├─ SharePoint sync worker (§9.3)  ← ExCom's existing workflow
├─ Google Drive importer (legacy — the photos.txt links)
└─ Archive backfill CLI (one-time — the 1,105 local files)
        │
        ▼
   normalise → checksum/dedupe → HEIC transcode → EXIF strip
        │      → face-aware square crop (portraits) → grade → derivatives
        ▼
   R2/Blob + assets + asset_derivatives rows
        │
        ▼
   /v1/assets/{id}?w&fmt   ← the only URL any frontend ever sees
```

### 9.2 Processing rules

Carried forward from `PROJECT_SPEC.md` §9, now server-side and repeatable rather than a one-off script.

- Derivatives: AVIF (primary) + WebP at `320/640/960/1280/1920`. AVIF q78, WebP q82.
- **HEIC transcode** — 34 files, including the sole Team NUVOLA asset. Each verified visually; HEIC colour profiles shift.
- **Portrait normalisation** — `smartcrop-sharp` face-aware 1:1 at 1024/512/256. Three filename conventions across seven committees, so **three parsers, not one regex**. Unmatched files produce a report for manual resolution; nobody is silently dropped.
- Unified grade on gallery imagery: saturation −8%, contrast +4%, extreme white-balance neutralised. No filters, no tinting.
- **EXIF stripped on ingest** — GPS coordinates in student photographs are a privacy leak (§12.4).
- Excluded from ingest: `.ai`, `.eps`, `.docx`, `.zip`, `.lnk`, `.ARW` — ~250 MB. `logo/BRS Logo FINAL.ai` is exported once by hand to optimised inline SVG.
- Budgets enforced at write time: hero ≤250 KB, plate ≤90 KB, portrait ≤40 KB. Over-budget derivatives fail the job.

### 9.3 SharePoint integration

Directive 3 names SharePoint asset management explicitly. The archive corroborates a Microsoft tenant — the 2024 PCB workshop ran on **Microsoft Teams**, so BUET has M365 and the ExCom already works in SharePoint/OneDrive.

**Design.** A worker using **Microsoft Graph** with app-only auth (client credentials, `Sites.Selected` scope — narrowest viable permission, granted on one document library, not tenant-wide).

```
Graph change notification (or 15-min delta poll)
  → /sites/{id}/drives/{id}/root/delta
  → for each new/changed file:
      · filter to image MIME types
      · stream to R2/Blob (never through the API façade)
      · checksum → skip if duplicate
      · create assets row: source='sharepoint', source_ref=driveItem.id
      · enqueue derivative job
      · flag in Directus as "needs alt text + plate assignment"
  → persist deltaLink for incremental sync
```

**Design constraints.**
- **One-way: SharePoint → BRS.** No writes back. Avoids conflict resolution entirely and means a mistake on our side cannot damage the club's document library.
- SharePoint is an *ingestion source*, never a serving origin. Nothing public ever links to a SharePoint URL — permissions, latency, and link rot make it unusable as a CDN.
- Files land **unpublished**. An editor must add alt text before anything appears on the site — the alt-text constraint (§8) applies to synced assets too.
- Sync failures alert but never block: the static site is unaffected.

Same worker pattern handles the legacy Google Drive folders in the `photos.txt` files, stripping `fbclid` tracking parameters and normalising `/drive/mobile/` URLs.

⚠️ Blocked on §16.2: tenant, site, and library identifiers, plus app-registration consent from BUET IT.

---

## 10. Frontend delivery architecture — Next.js 15

**Decision recorded 30 July 2026.** §16.14 resolved in favour of Next.js 15 + Tailwind CSS. React familiarity is the binding constraint, and the decoupled contract (§7.4) makes the choice reversible if that changes. The cost is quantified in §4.7 and §10.7 rather than left implicit.

The one thing this decision does *not* license: a frontend that queries Directus directly. `@brs/content-client` remains the sole data surface, enforced by lint (§13.4).

### 10.1 Configuration — static export

Static export is mandatory, not preferred. It is what preserves the architecture's most valuable property: **backend downtime is invisible to the public** (§6.2).

```ts
// apps/web/next.config.ts
import type { NextConfig } from 'next';

export default {
  output: 'export',              // no Node server in production
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
  },
  experimental: { typedRoutes: true },
} satisfies NextConfig;
```

**Consequences of `output: 'export'` — accept these, do not work around them:**

| Unavailable | Our approach |
| --- | --- |
| Route Handlers, Server Actions, middleware | Forms POST to the façade Worker. Better for decoupling anyway — form logic does not belong in the swappable layer. |
| ISR / on-demand revalidation | Directus webhook → GitHub Actions rebuild → deploy. Publish-to-live under three minutes (§7.5). |
| Built-in Image Optimization API | Custom loader pointing at our own façade (§10.2). |
| Dynamic routes without params | `generateStaticParams()` on every dynamic segment, fed from `/v1/*`. |

### 10.2 Image loader — the storage seam

With static export the built-in optimizer is gone, which is convenient: our façade already does transforms, and routing images through it is what keeps storage swappable (§7.1 rule 5).

```ts
// apps/web/src/lib/image-loader.ts
export default function brsImageLoader(
  { src, width, quality }: { src: string; width: number; quality?: number }
) {
  // `src` is the façade-issued asset id — never a storage-provider key.
  return `${process.env.NEXT_PUBLIC_BRS_API}/v1/assets/${src}` +
         `?w=${width}&q=${quality ?? 78}&fmt=avif`;
}
```

`ImageDTO` always carries `width`, `height`, and `lqip` (§7.3), so every `next/image` gets explicit dimensions and a blur placeholder. That is how CLS < 0.02 survives the framework change.

### 10.3 Server Components by default — client islands by allowlist

This is the discipline that keeps first-party JS inside the ≤ 15 KB budget. **Exactly two client components on the landing page:**

| Component | Why it must be client |
| --- | --- |
| `ZoneRail` | Scroll-position observation, `aria-current` updates |
| `ZoneD_RecordStrip` | Drag/wheel scrubbing, keyboard navigation |

Everything else — masthead, title block, all nine zones, every `Plate` — is a React Server Component shipping **zero** client JS.

**Enforcement:** `'use client'` requires a corresponding entry in `apps/web/config/client-allowlist.json`, checked by lint rule 5 (§13.4). Adding an island becomes a deliberate, reviewable act rather than a reflex.

Additional rules: no client-side state library · no `framer-motion` (the §5.5 motion spec is CSS transitions and one `scaleX` keyframe — a 40 KB animation library for a 400ms hairline draw is indefensible) · `next/dynamic` for the Gallery `Lightbox` in Phase 3 · no barrel-file imports.

### 10.4 Tailwind CSS 4 — tokens only

Tailwind v4, CSS-first configuration. The `@theme` block is the *only* place design values are defined, and it is authored in Phase 0 from `PROJECT_SPEC.md` §5.1–5.5 before any component exists (§5.2).

```css
/* apps/web/src/app/globals.css */
@import "tailwindcss";

@theme {
  /* Surfaces */
  --color-bg-base:      #0B0D0E;
  --color-bg-raised:    #131618;
  --color-bg-inset:     #090B0C;

  /* Hairlines — the primary structural device */
  --color-line-faint:    rgba(244,243,241,0.07);
  --color-line-hairline: rgba(244,243,241,0.12);
  --color-line-strong:   rgba(244,243,241,0.24);

  /* Text */
  --color-text-primary:   #F4F3F1;
  --color-text-secondary: #A8ADB0;
  --color-text-tertiary:  #6E7579;

  /* Accent — petrol, luminance-lifted. NEVER a glow. */
  --color-accent:       #4FA8CE;
  --color-accent-deep:  #0E516E;

  /* Signal — oxblood. ≤2 instances per viewport. */
  --color-signal:       #C2394B;

  /* Motion */
  --ease-out:   cubic-bezier(0.20, 0, 0.00, 1.00);
  --ease-inout: cubic-bezier(0.40, 0, 0.20, 1.00);
}
```

**Hard constraints.** Arbitrary values (`text-[13px]`, `bg-[#22d3ee]`) fail lint rule 3. No Tailwind plugins that inject opinions. **No shadcn/ui, no Radix presets, no Headless UI defaults** — recognisable library defaults are a §3.4 rubric failure (check 6), and `shadow-*` utilities are effectively banned by §3.2 on the landing page.

Note the one thing Tailwind cannot express and must be hand-written CSS: the sub-pixel hairline (`0.5px` via `scaleY` transform, §3.2). Do not approximate it with `border-[0.5px]`.

### 10.5 Fonts

`next/font/local` with the variable font files committed to the repo. Self-hosted — no third-party font CDN (`PROJECT_SPEC.md` §17.6).

```ts
// apps/web/src/app/fonts.ts
import localFont from 'next/font/local';

export const archivo = localFont({
  src: './fonts/Archivo[wdth,wght].woff2',
  variable: '--font-display',
  display: 'swap',
  preload: true,
});

export const plexMono = localFont({
  src: './fonts/IBMPlexMono-Regular.woff2',
  variable: '--font-mono',
  display: 'swap',
  preload: true,
});
```

Subset to Latin + Latin-Ext. The `wdth` axis on Archivo is load-bearing — it is what §3.2 and §4.4 depend on for display type. Do not substitute a static-width build.

### 10.6 Landing page structure

```
apps/web/
├── next.config.ts
├── config/client-allowlist.json        # exactly 2 entries during Phase L
└── src/
    ├── app/
    │   ├── layout.tsx                  # RSC — masthead, title block, fonts
    │   ├── page.tsx                     # RSC — Sheet 01, zone composition only
    │   ├── globals.css                  # @theme tokens (§10.4)
    │   └── fonts.ts
    ├── components/landing/
    │   ├── Masthead.tsx                 RSC
    │   ├── TitleBlock.tsx               RSC
    │   ├── ZoneRail.tsx                 'use client' — real <nav>, real links
    │   ├── ZoneA_Opening.tsx            RSC
    │   ├── ZoneD_RecordStrip.tsx        'use client'
    │   ├── ZoneE_WhatWeBuild.tsx        RSC
    │   ├── ZoneF_Nuvola.tsx             RSC — conditional on §16.4
    │   ├── ZoneG_Archive.tsx            RSC
    │   ├── ZoneH_PartnersPress.tsx      RSC
    │   └── ZoneI_Apply.tsx              RSC
    ├── components/primitives/           # Plate, Placard, HairlineRule, IndexedAction
    └── lib/
        ├── content.ts                   # wraps @brs/content-client ONLY
        └── image-loader.ts
```

Per §5.3, `components/landing/` is **not** generalised during Phase L. Extraction into `components/system/` happens in Phase 1, after sign-off. Two use cases before an abstraction, not one.

### 10.7 What the framework change costs, and the compensation

Honest accounting, so nobody is surprised at the Gate.

| Lost with Astro | Cost | Compensation |
| --- | --- | --- |
| Zero-JS baseline | ~110 KB gzip fixed | RSC everywhere; 2 islands; ≤15 KB first-party (§10.3) |
| `Perf ≥ 98` on mid-tier mobile | Revised to ≥ 95 | LCP and CLS targets unchanged and still met |
| `astro:assets` native pipeline | Custom loader needed | ~10 lines (§10.2); also cleaner for storage swapping |
| Per-page JS granularity | Route-level chunks | `next/dynamic` for below-fold interactive work |
| Simpler mental model for handover | Marginal | Editors use Directus, never the codebase (§14) |

**Unchanged by this decision:** the API contract, the data model, the asset subsystem, every privacy control, the anti-slop rubric, and the entire §4 landing specification. That is the decoupling working as designed — a framework decision touched Plane 4 and nothing else.

---

## 11. Repository & environments

### 11.1 Monorepo

```
brs/
├── apps/
│   ├── web/                 # Next.js 15 delivery frontend (Plane 4)
│   ├── api/                 # Hono façade (Plane 3)
│   └── cms/                 # Directus config, extensions, schema snapshots (Plane 2)
├── packages/
│   ├── contract/            # Zod schemas → OpenAPI → @brs/content-client
│   ├── db/                  # SQL migrations, seeds (Plane 1)
│   ├── media/               # ingest, transcode, derivative pipeline
│   └── sync-sharepoint/     # Graph worker
├── docs/
│   ├── LANDING_RATIONALE.md · DESIGN_SYSTEM.md · CONTENT_GUIDE.md
│   ├── HANDOVER.md · API.md · adr/
├── assets-source/           # 2 GB originals — git-lfs or external bucket
├── PROJECT_SPEC.md
└── implementation_plan.md
```

pnpm workspaces + Turborepo. The physical separation of `apps/web` from `packages/contract` is what makes "delete the frontend" a literal, safe operation.

### 11.2 Environments

| Env | Frontend | API | Data |
| --- | --- | --- | --- |
| local | `localhost:3000` | `localhost:8787` | Docker Postgres + Directus |
| preview | per-PR Pages deploy | preview Worker | shared staging DB |
| production | `[domain]` (§16.8) | `api.[domain]` | managed Postgres, PITR |

Nightly `pg_dump` to R2, 30-day retention, **restore verified monthly** — an unverified backup is not a backup. Directus schema snapshots committed on every change.

### 11.3 CI/CD

On every PR: typecheck · lint (incl. the §13.4 custom rules) · contract build + **OpenAPI breaking-change diff** · unit tests · build · Lighthouse CI vs budgets · axe · link check · **PII gate**. On merge to `main`: migrate → deploy API → deploy CMS → rebuild frontend → purge cache → smoke test.

---

## 12. Security, privacy & governance

### 12.1 The phone-number problem — defence in depth

~470 students' mobile numbers sit in the seven roster files. `PROJECT_SPEC.md` §12 established this as the project's highest-severity risk. In a headless architecture the controls move into the data layer, where they are stronger:

1. **No column.** `members` has no contact field. The data does not exist to leak.
2. **Import strips it.** The roster parser drops the `Contact no.` column at parse time; it never reaches Postgres.
3. **No DTO field.** `MemberDTO` has no contact property. Even a compromised query cannot surface one.
4. **Directus RBAC** — the public role has read access only to an explicit field allow-list.
5. **PII gate in CI** — greps built output *and* API responses for `01[3-9]\d{8}`; **fails the build** on any match. Runs on every PR, permanently.
6. **Manual review** before launch, including **numbers rendered inside poster images**, which grep cannot catch. The bKash number in `Workshops/pcb_24/description.txt` and its accompanying personal contact are known instances.

### 12.2 API security

Public surface read-only, rate-limited (100 req/min/IP at the edge). Directus admin behind SSO or strong-password + 2FA, credentials rotated at each ExCom handover (§14, `HANDOVER.md`). Graph credentials in Workers secrets, never in the repo; `Sites.Selected` scope only. Strict CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`. Turnstile on public forms.

### 12.3 Content governance

`achievements.verified` defaults false (§8). Editorial workflow in Directus: draft → review → published, with the review step requiring a named reviewer. `copy_source` tracked so derived-versus-authored copy is always visible.

### 12.4 Personal data beyond phone numbers

- **EXIF/GPS stripped on ingest** (§9.2) — student photographs frequently carry home coordinates.
- **Member Directory scope** (§16.9) is an ExCom decision, not an engineering one. A committee page and a name-searchable directory of ~470 identifiable students are materially different privacy propositions.
- **Photograph consent** (§16.10) and **minors in Robotics Olympiad imagery** (§16.11) likewise.

The architecture supports whichever answer: `members` can be filtered to alumni-only, current-committee-only, or consented-only at the API layer without touching the frontend.

---

## 13. Quality gates

### 13.1 Definition of Done — any UI work

Matches the design spec at three breakpoints, both themes · all component states implemented · zero hardcoded design values · WCAG 2.2 AA verified · keyboard-complete · `prefers-reduced-motion` honoured · budgets met · no console errors or warnings · real content, zero placeholders · alt text on every image.

### 13.2 Definition of Done — any backend work

Migration written and reversible · contract updated and OpenAPI regenerated · no breaking change within a version · tests for the happy path and two failure modes · PII gate passing · secrets in the secret store · rate-limited · documented in `API.md`.

### 13.3 Testing

Unit (Vitest) for contract schemas, parsers, media pipeline · integration for façade↔Directus↔Postgres · contract tests asserting DTO stability across versions · E2E (Playwright) on the landing page: keyboard traversal, reduced-motion, zone-rail navigation, Record-axis scrubbing · visual regression on the landing page once approved, so it cannot silently drift.

### 13.4 Enforced lint rules

Custom rules, because these four failures are the ones this project is actually prone to:

1. **`no-direct-backend-import`** — nothing outside `packages/contract` may import a Directus SDK or fetch the CMS. Protects the decoupling boundary (§7.4).
2. **`no-hardcoded-stats`** — numeric literals forbidden in stat/metric components. All numbers come from `StatsDTO`. Prevents a repeat of §2.3.
3. **`no-arbitrary-design-values`** — Tailwind arbitrary values (`text-[13px]`, `bg-[#22d3ee]`) fail. All values from tokens.
4. **`no-prohibited-copy`** — the §3.3 word list fails the build in content and components: *premier, cutting-edge, world-class, empowering, next generation, high-performance, global stage, shaping the future, collective*.

5. **`client-component-allowlist`** — a file containing `'use client'` must have a matching entry in `apps/web/config/client-allowlist.json`. Protects the ≤ 15 KB first-party JS budget (§4.7) by making every new island a deliberate, reviewable decision. Added as a direct consequence of the Next.js 15 decision (§10.3).

Rules 4 and 5 are unusual and deliberate. Slop re-enters through copy more easily than through CSS, and JS budgets erode one convenient `'use client'` at a time — in both cases a linter is more reliable than a reviewer's memory.

---

## 14. Post-landing phases

Detail intentionally lighter than Phase L — these are re-planned after the Gate with the design system as it actually emerged.

**Phase 1 · Design-system extraction.** Generalise proven landing components into `components/system/`. All states, both themes, documented in `DESIGN_SYSTEM.md`. Axe-clean in isolation. *Exit:* every primitive extracted, documented, keyboard-operable.

**Phase 2 · Content production.** ~40 event descriptions from the `desc.txt` sources (`PROJECT_SPEC.md` §10.4: strip unicode-styled text, remove emoji, convert to past tense, remove registration mechanics and phone numbers, preserve factual specifics). ~1,105 alt texts. Competition research (§16.2). Verify filename-parser output. 3–4 blog seeds. *Exit:* all non-blocked content authored and reviewed; `verified` set only where evidenced.

**Phase 3 · Page build-out.** The remaining nine routes per `PROJECT_SPEC.md` §7, plus the four orphaned content sets (AGM, Partners, Press, Gallery — `PROJECT_SPEC.md` §6.2–6.3). Record axis at full scale, contact sheet, member directory, forms, SEO, OG images, JSON-LD. *Exit:* every route complete, budgets met, a11y passed.

**Phase 4 · Handover & launch.** Directus editor training. `CONTENT_GUIDE.md` written for a second-year student, not a developer. `HANDOVER.md` annual checklist: publish new committee, archive previous, update AGM, rotate credentials, verify PII gate, verify backup restore. ADRs. Cross-browser and real-device testing. Manual PII review including poster images. *Exit:* a non-technical ExCom member adds an event unaided.

**Annual handover is a first-class requirement, not a closing task.** The 11th committee takes over within roughly a year. A system they cannot operate has failed regardless of how it looked at launch.

---

## 15. Risk register

| # | Risk | Impact | Mitigation |
| --- | --- | --- | --- |
| 1 | **Landing page fails repeated review** | Blocks all UI work | Rubric (§3.4) makes review objective rather than taste-based. Budget three cycles; a fourth escalates to the §4.1 concept, not to CSS. |
| 2 | **Competition results never verified** | Achievements page is materially weaker; §2.3 recurs | Start alumni outreach in Phase 0 — the longest-lead item. `verified=false` default prevents fabrication meanwhile. |
| 3 | **Team NUVOLA content never supplied** | A top-level nav item with nothing behind it | Zone F is conditional; nav item removed if unresolved at Gate. Explicitly better than a stub. |
| 4 | **SharePoint app registration refused by BUET IT** | §9.3 unavailable | Directus upload and the Drive importer cover all functional needs. Sync is an efficiency, not a dependency. |
| 5 | **Backend ops burden exceeds club capacity** | Abandonment within two years | Static delivery means backend downtime is invisible publicly. Managed Postgres, no self-hosted servers. Documented restore drill. |
| 6 | **Alt text for 1,105 images stalls Phase 2** | Launch slip or an a11y compromise | DB-level `NOT NULL` + length check makes the debt visible, never silently skipped. Prioritise the ~200 published images; backfill the rest. |
| 7 | **Photograph consent unresolved** | Legal and ethical exposure | §16.10–11 raised as ExCom decisions in Phase 0. API-layer filtering supports any answer without a frontend change. |
| 8 | **Frontend framework churn mid-build** | Rework | Exactly what §6 exists to absorb. Decide in Phase 0 (§10.1) while cost is near zero. |
| 9 | **Design-system drift after approval** | The approved page degrades | Visual regression tests on the landing page (§13.3) plus token-only lint (§13.4). |
| 10 | **Directus BSL licence changes** | Forced migration | Postgres is the source of truth (§1.2). Migration means replacing a UI, not re-modelling content. This risk is precisely what the architecture buys down. |

---

## 16. Open decisions

Carried forward from `PROJECT_SPEC.md` §19 with the new architectural items added. **Items 1–4 block specific pages; 9–11 are governance decisions for the ExCom, not engineering calls.**

| # | Decision | Blocks | Severity |
| --- | --- | --- | --- |
| 1 | Rosters/portraits for the **1st, 2nd, 6th** committees — or permission to state the gap explicitly | Previous ExCom | High |
| 2 | **Competition results** — full event names, hosts, and **placements** for Robocon 2005/2008, IRC 2012–15, iARC 2014/15, NASA Lunabotics 2013, URC 2016, ERC 2015, six national contests. Needs alumni outreach. Panasonic Award 2005 is the only currently evidenced result | Achievements, Competition, Zone D | **Blocking** |
| 3 | Rover team name — **Interplanetar** (2017 seminar copy) or **Interplaneters** (filenames) | Achievements, Zone D | Medium |
| 4 | **Team NUVOLA** — what it is, roster, specification, results, photographs. One unrenderable HEIC is all that exists | Team NUVOLA, Zone F | **Blocking** |
| 5 | Partner logo **vectors** + permission to display (Meghna Group, Transcom confirmed as prior sponsors) | Zone H, Partners | Medium |
| 6 | **Founding year** — is it 2005, or does Robocon 2005 predate formal establishment? Affects the Zone A statement | Zone A | Medium |
| 7 | **Forms** — Google Forms (familiar, zero-maintenance, breaks visual continuity) or native + Turnstile? Recommendation: native for Contact/Apply; Google Forms retained for event registration | Zone I, Contact | Medium |
| 8 | **Domain.** Existing domain or BUET subdomain? The 3rd ExCom had a Webmaster — does a prior site or archive exist? | Deploy, SEO | Medium |
| 9 | **Member Directory scope** — should ~470 identifiable students and alumni be publicly name-searchable? | Member Directory | **ExCom decision** |
| 10 | **Photograph consent** for publishing identifiable members and alumni, especially pre-2018 sets | Gallery, all events | **ExCom decision** |
| 11 | **Minors** — Robotics Olympiad is explicitly for school and college students. Consent provisions? | Robo Carnival, Gallery | **ExCom decision** |
| 12 | **SharePoint** — tenant ID, site, document library, and app-registration consent from BUET IT | §9.3 sync | Medium |
| 13 | **Cloud posture** — Cloudflare R2 (recommended: zero egress) or Azure Blob if the BUET tenant mandates it | §6.3 storage | Medium |
| ~~14~~ | ~~**Frontend framework**~~ — **RESOLVED 30 Jul 2026: Next.js 15 + Tailwind CSS.** Budgets revised (§4.7), architecture amended (§10), lint rule 5 added (§13.4) | — | ✅ Closed |

---

## Appendix A — Immediate next actions

| # | Action | Owner | Blocks |
| --- | --- | --- | --- |
| 1 | Sign off §3 doctrine and §4 landing specification | Client + design lead | Phase L |
| 2 | ~~Decide §16.14 (framework)~~ ✅ **Next.js 15 + Tailwind.** Decide §16.13 (storage) | Architecture | Phase 0 |
| 3 | Author `tokens.css` from `PROJECT_SPEC.md` §5.1–5.5 | Design lead | Phase L |
| 4 | Begin alumni outreach for §16.2 — longest lead time in the project | Project lead | Achievements |
| 5 | Raise §16.9–11 with the ExCom formally | Project lead | Directory, Gallery |
| 6 | Request SharePoint app registration (§16.12) | Project lead | §9.3 |
| 7 | Scaffold monorepo, Postgres, Directus, façade, PII gate in CI | Backend | Phase B1 |
| 8 | Export `BRS Logo FINAL.ai` → optimised inline SVG; verify at 24px and 320px | Design lead | Phase L |

## Appendix B — Numbers permitted on the landing page

Every figure below is verified against the archive. Nothing else may appear as a statistic, and none of these carries a `+`.

| Figure | Value | Source |
| --- | --- | --- |
| Executive committees documented | **7** | 3rd, 4th, 5th, 7th, 8th, 9th, 10th |
| Current committee size | **~52** | 10th ExCom roster + 52 portraits |
| Workshops | **19** | `BRS/Workshops/` |
| Seminars | **11** | `BRS/Seminars/` |
| Robo Carnival editions | **5** | 2016, 2017, 2019, 2023, 2024 |
| Intra-BUET editions | **2** | 2022, 2024 |
| AGMs documented | **5** | 2017, 2018, 2019, 2022, 2024 |
| International programmes | **6** | Robocon, IRC, iARC, Lunabotics, URC, ERC |
| National contests | **6** | `BRS/National Contests/` |
| Archive photographs | **1,105** | Verified file count |
| Verified awards | **1** | Panasonic Award, ABU Robocon 2005 |
| Earliest evidence | **2005** | `Team BUET, Robocon Panasonic Award 2005.jpg` |

**Forbidden:** `480+ active members` (false — ~470 is all historical roster rows across seven committees; the current committee is ~52) · `10 executive committees` (unsupported — seven documented) · `35+ competitions` (unsupported) · `40+ workshops & seminars` (inflated — 30).

---

*§3 and §4 require sign-off before Phase L. §16.14 and §16.13 require decisions before Phase 0 closes. §16.2 and §16.4 are blocking and should be actioned this week — both depend on people outside the build team.*
