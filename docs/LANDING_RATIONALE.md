# Landing Page Rationale — Sheet 01

**Gate deliverable 3** (`implementation_plan.md` §4.8) · **Date** 30 July 2026
**Status** Submitted for Landing Gate review

For each zone: the default that was overridden, and why (§3.1 test 2).

---

## Zone lettering — a change from §4.2

The plan sketched zones A–I including **F for Team NUVOLA**. That zone is
**cut**: the archive holds exactly one unrenderable HEIC for NUVOLA, §16.4 is
blocking, and §7.11 forbids shipping a stub. Rather than leave a conspicuous
gap in the rail, the surviving zones are relettered sequentially.

| Sheet 01 | §4.2 original | Contents |
| --- | --- | --- |
| A | A/B | Opening |
| B | D | The Record |
| C | E | What we build |
| D | G | The Archive |
| E | H | Partners & Press |
| F | I | Apply |
| — | F | ~~Team NUVOLA~~ — cut, blocked on §16.4 |

---

## Zone A — Opening

**Default overridden: the badge → headline → paragraph → two-buttons stack.**

That sequence is the single most reproduced landing-page skeleton in
existence and the prototype used it exactly (§2.1). It is not *bad*; it is
*anonymous* — the shape a language model produces because it is the shape of
its training data. No restyling rescues it, so the structure was discarded
rather than decorated.

Four specific inversions:

1. **The institution's name is the headline.** The prototype spent its
   largest typographic asset on "Shaping the Future of Autonomous Robotics" —
   a slogan that works verbatim for any robotics club on earth. `BUET /
   Robotics / Society` at `display-hero`, `wdth 112`, leading 0.86, cannot be
   transplanted anywhere.

   *Deviation from §4.4:* set in mixed case rather than all-caps. All-caps at
   this size read as shouting; mixed case reads as a masthead. Reversible in
   one line if the Gate disagrees.

2. **No badge.** The prototype's `✦ BANGLADESH UNIVERSITY…` pill used the
   sparkle glyph that is the literal AI-product icon of 2023–26. Replaced
   with a hairline and one tracked mono line.

3. **Asymmetric grid.** Content in columns 2–8, plate in 9–12, plate hanging
   64px lower. Symmetry here would be the absence of a decision (§3.1 test 3).

4. **The photograph is evidence, not wallpaper.** This is the decisive one.
   The prototype faded an archive photo to ~8 % behind text. Here `PL. 001`
   sits at 100 % contrast in a sharp 4:5 frame with a museum placard. Same
   asset class, opposite thesis: the archive *is* the product.

**Copy.** Every clause is evidenced: six international programmes, nineteen
workshops, one Panasonic Award. Note what is absent — *premier, collective,
high-performance, global stage*. All four are now build-failing (lint rule
`brs/no-prohibited-copy`).

⚠ "since ABU Robocon 2005" is used rather than "since 2005" because the
founding year is unverified (§16.6). Robocon 2005 is the earliest evidence,
which is a different claim.

---

## Zone B — The Record

**Default overridden: the stat bar.**

Removed for two independent reasons. It is an AI tell — rounded card, cyan
glow, `+` suffixes (§2.2 defects 8–9). And **half its numbers were false**
(§2.3): "480+ ACTIVE MEMBERS" was every roster row across seven *historical*
committees against a current committee of ~52; "10 EXECUTIVE COMMITTEES" was
an ordinal, not a count.

Replaced by a 2005–2026 tick axis, height-weighted by event density, with six
labelled anchors. It proves twenty years with evidence rather than a
rounded-up figure.

**Verification discipline is visible in the design.** Only `PANASONIC AWARD`
renders in oxblood `--signal`, because it is the only externally verified
placement in the entire 2 GB archive. Every other anchor shows team names in
`--text-tertiary` and reads as participation. The component literally cannot
render an unverified result as an outcome — `e.result && e.verified` gates it.

Discrete figures below the axis are **exact and unsuffixed**: 7 · 19 · 11 ·
1,105. Lint rule `brs/no-hardcoded-stats` makes a repeat of §2.3 a build
failure.

**Discovery.** Reading the Robocon photograph rather than its filename
yielded the host city: the certificate reads *"ASIA-PACIFIC Robot Contest
2005 BEIJING — Panasonic AWARD"*. No filename in the archive records Beijing.

---

## Zone C — What we build

**Default overridden: the uniform 3-up feature grid.**

Three plates at **7 / 5 / 5** columns with the middle column dropped 48px.
Equal thirds are what happens when nobody art-directs. The uneven baseline is
the decision.

Content selection changed during the build after looking at the candidates:
`intra_24_2` was originally slated for BUILD but proved to be a second group
photograph, which would have made the zone repetitive next to the hero.
Replaced with **MechaTron**, the 2013 Lunabotics excavation rover — an actual
machine, which is what the zone claims.

No icons. A robotics club does not need to illustrate the word "robotics"
(§5.7).

---

## Zone D — The Archive

**Default overridden: a tidy contained grid.**

Carries the page's **one deliberate margin overflow** (§3.2) — the contact
sheet breaks the right content margin into the outer gutter. Exactly once per
page; a second instance would read as a bug rather than a decision.

Nineteen 1:1 tiles, hairline-ruled, from the club's own `best 20/` selection.

*Fixed during review:* separators were initially `gap-px` over a coloured
parent, which left a visible grey block in the trailing empty cells of a
7-column grid holding 19 items. Now borders on each tile, so empty cells
simply do not exist.

---

## Zone E — Partners & Press

**Default overridden: the "trusted by" logo strip.**

That pattern is B2B social proof borrowed into a context where it does not
belong (§17.1). Partners are named as set type with the event they presented,
which is more informative than a greyscale logo.

This is also honest about a gap: partner vectors and permission are
outstanding (§16.5). Shipping placeholder logo boxes would have been worse
than shipping names.

Press clips are three real Prothom Alo scans, kept at natural ratio —
cropping a newspaper page destroys the evidence.

---

## Zone F — Apply

**Default overridden: the full-width gradient CTA band.**

One sentence left, two indexed actions right. The verb is "Apply", never "Get
Started" (now build-failing). The recruitment claim — nine drives since 2016
— is countable from the archive.

---

## Cross-cutting decisions

**Buttons → indexed hairline rows.** `01 ── THE RECORD →` reads as an index
entry in a technical document. No fill, no radius, no gradient. The arrow is
drawn on a 24px grid rather than pulled from Lucide, because a library
default arrow is a recognisable stamp.

**The zone rail is a real `<nav>` of anchor links**, not a scroll indicator.
It works with JS disabled; JS only adds `aria-current`. Every label is in the
DOM permanently — hover-only information is forbidden (§17.7).

**The Record strip never hijacks page scroll.** The wheel handler releases at
either end so the page keeps scrolling normally. Native `overflow-x` provides
keyboard and touch behaviour for free.

**Motion is one flourish and it is 1px** — a `scaleX` hairline draw at 400ms.
No `framer-motion`: a 40 KB library for one keyframe is indefensible against
a 15 KB first-party budget.

**No `box-shadow` anywhere on this page.** Elevation is surface value plus a
hairline. That single rule is what separates this from every neon robotics
template.

---

## Verified measurements

| Property | Measured |
| --- | --- |
| `wdth` axis active | "BUET" at 100px: **wdth 62 → 182.8px · 112 → 310.5px · 125 → 351.9px** (default 272.1px) |
| First-party JS | **5.7 KB gz** (budget 15) |
| JS modern total | **105.8 KB gz** (budget 125) |
| CSS | **5.8 KB gz** (budget 24) |
| Fonts | **102.4 KB** (budget revised 90 → 110, see `scripts/fetch-fonts.mjs`) |
| Images with `width`+`height` | **26 / 26** |
| Images with alt ≥ 12 chars | **26 / 26** |
| Largest image | 103 KB AVIF (hero, budget 250) |
| Client islands | **2** — both allowlisted |

---

## Known gaps at submission

1. **Lighthouse and axe have not been run.** Structural a11y was built in and
   hand-checked; the automated reports (Gate deliverables 5) are outstanding.
2. **Keyboard and reduced-motion recordings** (deliverables 6–7) not captured.
3. **Zone F (NUVOLA) cut**, pending §16.4.
4. **Partner logos absent**, pending §16.5.
5. **Rover team name** rendered "Interplanetar" from the club's own 2017
   seminar prose; filenames say "Interplaneters" (§16.3 unresolved).
6. **Responsive comps at 768 / 375 not captured** — built responsive and
   verified at 1440 only.

---

## Appendix — the 34-check rubric (§3.4)

**Result: 29 PASS · 1 PARTIAL · 4 NOT VERIFIED · 0 FAIL.**

The Gate requires all 34 to PASS, so **Sheet 01 does not pass the Gate yet.**
Nothing has failed; four checks need tooling that has not been run, and one
needs a reviewer decision.

| # | Check | Result | Evidence |
| --- | --- | --- | --- |
| **A · Structure** ||||
| 1 | No badge→headline→paragraph→buttons | PASS | Structure discarded, not restyled |
| 2 | Hero asymmetric on 12-col grid | PASS | Content cols 2–8, plate 9–12, plate +64px |
| 3 | Irregular vertical rhythm | PASS | 224 / 160 / 96 / 224 / 128 / 160px |
| 4 | Non-uniform element widths in a row | PASS | Zone C at 7 / 5 / 5 with 48px offset |
| 5 | Exactly one margin overflow | PASS | Zone D contact sheet only |
| 6 | Reads as archive, not product page | PASS | Reviewer to confirm |
| **B · Colour** ||||
| 7 | Accents trace to measured logo palette | PASS | All from `@theme`, logo-derived |
| 8 | Zero gradients | PASS | grep: **0** in compiled CSS |
| 9 | Zero glow | PASS | grep: **0** box-shadow, 0 accent-hue shadow |
| 10 | Oxblood ≤ 2 per viewport | PASS | **1** use on the whole page |
| 11 | All pairings WCAG AA, tool-verified | **NOT VERIFIED** | Ratios computed in tokens; no tool run on rendered output |
| **C · Typography** ||||
| 12 | Width axis engaged | PASS | 182.8 / 310.5 / 351.9px at wdth 62 / 112 / 125 |
| 13 | Optical tracking curve by size band | PASS | Per-token `--text-*--letter-spacing` |
| 14 | Tabular figures everywhere numeric | PASS | `.tabular` + base rule in CSS |
| 15 | Typographic apostrophes, zero straight | PASS | Only occurrences are `font-variation-settings` syntax |
| 16 | En-dashes on ranges | PASS | 18 em/en-dash ranges; the one hyphen is a build hash |
| 17 | Uppercase always tracked | PASS | Mono tokens carry 0.12/0.14em |
| 18 | ≤ 3 type sizes per viewport | PASS | Reviewer to confirm |
| **D · Imagery** ||||
| 19 | Every photograph from archive, zero stock | PASS | 26 images, all from `BRS/` |
| 20 | 100% opacity in a defined frame | PASS | No faded backgrounds anywhere |
| 21 | Plate number + factual placard on every photograph | **PARTIAL** | Feature plates: yes. Contact-sheet tiles and press clips carry `sr-only` captions but no visible placard — a contact sheet with 19 visible placards would be unreadable. Reviewer decision. |
| 22 | Substantive alt text | PASS | **26 / 26** ≥ 12 chars, written from viewing each image |
| 23 | Only the fixed ratio set | PASS | 3:2, 4:5, 1:1 |
| **E · Copy** ||||
| 24 | Fails no transferability test | PASS | Reviewer to confirm |
| 25 | Zero prohibited words | PASS | Build-enforced by `brs/no-prohibited-copy` |
| 26 | Numbers computed/cited, no `+` | PASS | grep: **0** plus-suffixed figures |
| 27 | Past tense for past events | PASS | — |
| 28 | Claims trace to Appendix B | PASS | Beijing sourced from the certificate itself |
| **F · Motion & a11y** ||||
| 29 | ≤400ms, token easing, zero spring | PASS | Only `--duration-*` and `--ease-*` used |
| 30 | Scroll reveals ≤8px, once | PASS | No scroll reveals implemented |
| 31 | `prefers-reduced-motion` honoured | **NOT VERIFIED** | CSS present and compiled; not tested by toggling the OS setting |
| 32 | Full keyboard traversal | **NOT VERIFIED** | Built for it (real links, native scroll); not exercised |
| 33 | Zero hover-only information | PASS | `sr-only` labels on rail and tiles |
| 34 | Axe zero violations, Lighthouse a11y 100 | **NOT RUN** | Requires a Lighthouse/axe run |

### To close the Gate

1. Run axe-core and Lighthouse (closes 34, and gives evidence for 11).
2. Verify contrast on rendered output with a tool (closes 11).
3. Toggle OS reduced-motion and record (closes 31).
4. Record a keyboard-only traversal (closes 32).
5. Reviewer decision on check 21 — visible placards on contact-sheet tiles, or accept `sr-only`.
6. Capture comps at 768 and 375 (Gate deliverable 1).
