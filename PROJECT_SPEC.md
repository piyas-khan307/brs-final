# BUET Robotics Society — Website Project Specification

**Version** 1.0 · **Date** 30 July 2026 · **Status** Awaiting sign-off
**Repository root** `/home/sani/Documents/brs-final`

---

## 0. How to read this document

This is the alignment document. No production code gets written until Sections 2 (Vision), 5 (Design System), 6 (IA), and 17 (What To Avoid) are signed off.

| Section | Read if you are | Priority |
| --- | --- | --- |
| 1–4 | Anyone. Vision, audience, concept. | Required |
| 5 | Designer, frontend | Required |
| 6–8 | Content owners, ExCom | Required |
| 9–12 | Whoever prepares assets | Required |
| 13–16 | Engineering | Reference |
| 17 | **Everyone.** The anti-pattern register. | Required |
| 18–19 | Project lead | Required |

Section 19 lists eleven open questions that block specific pages. Everything else can proceed without them.

---

## 1. Premise

BRS is a **twenty-year-old engineering institution** — Robocon 2005 through Robo Carnival 2024 — with a 2 GB archive that has never been published. This is not a club that needs a website to look legitimate. It is a club whose actual record is more impressive than any design treatment could imply.

That single fact determines the entire design strategy: **the archive is the product.** The site's job is to present evidence with enough precision and restraint that the evidence speaks. Every design decision that follows is downstream of this.

What the archive actually contains, verified:

| Asset class | Volume | State |
| --- | --- | --- |
| Photographs | 1,105 files / 1,780 MB | Unoptimised, mixed quality, 34 unrenderable HEIC |
| Executive rosters | 7 committees (3rd–10th), ~470 people | Markdown tables, **contain private phone numbers** |
| Member portraits | ~430 across 7 committees | Three naming conventions, six dimension standards |
| Web-ready event copy | 26 files (`description for website.txt`) | Genuinely publishable as-is |
| Raw promo copy | 76 files (`desc.txt`) | Facebook-format, needs rewriting |
| International competitions | 6 programmes, 2005–2016 | **Zero descriptions — metadata only in filenames** |
| Curated photo selects | 116 + 7 "best of the bests" | Pre-picked, hero-grade |
| Brand mark | `.png` + `.ai` vector source | Usable, palette-defining |

---

## 2. Vision

### 2.1 The concept — "The Engineering Record"

The site is structured and styled as **a precisely maintained laboratory record**: part museum archive, part engineering drawing sheet, part industrial design portfolio.

This concept was chosen because it resolves the central tension in the brief. You asked for *laboratory + exhibition + industrial portfolio + interactive museum*. Those four references share one underlying discipline: **the labelled artifact.** A lab notebook, a museum wall, a spec sheet, and a design portfolio all do the same thing — they place an object in a frame and annotate it with rigorous, unemotional metadata.

So the atomic unit of this site is not a "card." It is a **Plate**: an artifact plus its measured caption.

```
┌──────────────────────────────────────────┐
│                                          │
│              [ photograph ]              │
│                                          │
└──────────────────────────────────────────┘
  PL. 037 — ROBO CARNIVAL 2024
  BUET PREMISES · 01–02 FEB 2024 · 6 SEGMENTS
```

The concept also converts the archive's biggest liability into an asset. Twenty years of inconsistent, mixed-quality photography looks like neglect in a glossy magazine layout. In an *archive* layout — uniform crops, hairline frames, mono placards, plate numbers — inconsistency reads as **provenance**. A grainy 2005 Robocon photo next to a sharp 2024 frame becomes a demonstration of longevity rather than a quality failure.

### 2.2 Target emotional response

Mapped to concrete mechanisms, because an emotion you cannot build is not a specification:

| Feeling requested | Built by |
| --- | --- |
| **Curiosity** | Progressive disclosure. Plates show minimum viable metadata; depth is one deliberate interaction away. Never dump everything at once. |
| **Engineering excellence** | Evidence density. Real years, real team names, real venues, real segment counts. Zero adjectives. |
| **Precision** | Optical alignment, hairline rules, a visible grid, mono numerals, tight tracking on display type. |
| **Innovation** | Restraint in an unexpected place. The surprise is how *little* the site does, executed exactly. |
| **Craftsmanship** | Details at the 1px scale: hairline weights, registration marks, tabular figures, correct hanging punctuation. |
| **Realistic** | Real photographs of real students, ungraded to fashion-shoot artificiality. No stock. No 3D renders of robots that don't exist. |
| **Premium** | Negative space, one accent colour used sparingly, self-hosted variable fonts, sub-2s loads. |
| **Unique** | The Record axis, plate numbering, contact-sheet grid, datum line — Section 5.9. |

### 2.3 Reference set

**Aligned with:** Boston Dynamics (photographic restraint, technical captions) · MIT Media Lab (archival density, information hierarchy) · Teenage Engineering (industrial precision, mono labels) · Dieter Rams / Braun archive (functional minimalism) · Leica technical manuals (measured typography) · museum wall labels at the Science Museum, London (annotation discipline) · Kinfolk/Cereal grid discipline, minus warmth.

**Explicitly not:** Any AI-startup landing page · Framer/Webflow template of 2024–26 · Awwwards Site of the Day with a WebGL hero · "cyberpunk robotics" aesthetic · hackathon microsites.

### 2.4 Design principles

1. **Evidence over adjectives.** Never write "we strive for excellence." Write "Panasonic Award, ABU Robocon 2005." If a claim has no artifact behind it, cut the claim.
2. **The grid is visible.** Structure is the ornament. There is no decorative layer on this site — the hairlines, ticks, and coordinates *are* the decoration.
3. **Every artifact is labelled.** No unlabelled image ships. If we don't know what a photo shows, we find out or we don't publish it.
4. **Motion is mechanical, not playful.** Short, decisive, linear-ish. Machines settle; they do not bounce.
5. **Restraint is the premium signal.** One accent. Generous space. Effects are never stacked.
6. **Built for handover.** The 11th ExCom takes over within a year. A design system a non-specialist cannot maintain has failed regardless of how it looks on launch day.

---

## 3. Audience

| # | Audience | Arrives via | Needs in 10 seconds | Primary surface |
| --- | --- | --- | --- | --- |
| 1 | **Prospective BUET member** (batch '24/'25) | Facebook, campus word of mouth | Is this serious? What would I actually build? How do I join? | Home → Join Us |
| 2 | **Current member** | Direct | Event dates, rulebooks, my committee | Events, Member Directory |
| 3 | **Corporate sponsor** (e.g. Meghna Group, Transcom — both prior sponsors) | Introduction, proposal deck | Scale, reach, professionalism, past sponsor treatment | Home → Achievements → Contact |
| 4 | **Competition organiser / peer club** | Search, cross-referral | Legitimacy, track record, contact route | Achievements, Competition |
| 5 | **BUET faculty / administration** | Internal | Governance, moderator, committee continuity | Executive Committee |
| 6 | **Alumnus** | Nostalgia, LinkedIn | My committee, my year, my photographs | Previous ExCom, Gallery |
| 7 | **School/college student** (Robotics Olympiad audience) | Outreach events | Is robotics for me? | Home, Events |

**Primary conversion:** Audience 1 → membership application.
**Highest-value conversion:** Audience 3 → sponsorship enquiry.
The design must serve both without the site reading as a sales pitch to either. Both respond to the same signal: **demonstrated competence.**

---

## 4. Scope

### In scope
Full public marketing/archive site, 10 top-level routes and 6 sub-routes (Section 6); complete asset pipeline; content model; git-based CMS for handover; blog; searchable member directory; membership and contact forms; deployment and CI.

### Out of scope for v1
Member login / authentication · payment or registration handling (registration stays on Google Forms — Section 19.7) · e-commerce · rulebook hosting (stays on Drive) · Bengali localisation (deferred, but the type stack must not preclude it — Section 5.3) · live event streaming · project-collaboration tooling.

---

## 5. Design system

All values are normative. Where a value is provisional it is marked **[TBC]**.

### 5.1 Colour

Derived from the brand mark by pixel-frequency analysis of `logo/BRS Logo transparent.png` (1,878,553 opaque pixels sampled), not invented. Verified distribution:

| Hex | Share | Role in mark |
| --- | --- | --- |
| `#0E516E` | 33.2% | Deep petrol blue — dominant |
| `#FFFFFF` | 30.9% | Bone / negative |
| `#7B1223` | 17.9% | Oxblood — secondary |
| `#3A3A3C` | 14.3% | Graphite |

This palette is the single most valuable brand asset in the archive. Petrol blue and oxblood together are unusual, sober, and expensive-looking — closer to aviation instrumentation or a university crest than to consumer technology. **It must not be "modernised" into cyan and magenta.**

#### Token set — dark theme (default)

```
/* Surfaces */
--bg-base        #0B0D0E   /* near-black, cool-shifted. NOT #000 */
--bg-raised      #131618
--bg-inset       #090B0C
--bg-overlay     rgba(11,13,14,0.88)

/* Hairlines — the primary structural device */
--line-faint     rgba(244,243,241,0.07)
--line-hairline  rgba(244,243,241,0.12)
--line-strong    rgba(244,243,241,0.24)
--line-accent    rgba(79,168,206,0.40)

/* Text */
--text-primary   #F4F3F1   /* 15.8:1 on base */
--text-secondary #A8ADB0   /*  7.2:1 */
--text-tertiary  #6E7579   /*  3.6:1 — large text and labels only */

/* Accent — petrol, luminance-lifted for dark surfaces */
--accent         #4FA8CE   /*  7.4:1 on base. Links, active states */
--accent-muted   #2E6E8C
--accent-deep    #0E516E   /* large fills only, never text */

/* Signal — oxblood, lifted. RARE USE ONLY */
--signal         #C2394B   /*  4.9:1 on base */
--signal-deep    #7B1223

/* Utility */
--focus-ring     #4FA8CE
--success        #3F9A7A
--warning        #C08A2E
```

#### Token set — light theme

```
--bg-base        #F4F3F1   /* bone, not white — paper */
--bg-raised      #FFFFFF
--bg-inset       #EBE9E6
--line-hairline  rgba(22,25,26,0.14)
--line-strong    rgba(22,25,26,0.28)
--text-primary   #16191A
--text-secondary #4A5052
--text-tertiary  #767C7F
--accent         #0E516E   /* brand value used directly */
--signal         #7B1223
```

#### Usage rules — enforced in review

1. **Petrol is the workhorse; oxblood is the exception.** `--signal` appears only for: awards and podium placements, live/upcoming event status, destructive actions, and form errors. Target ≤ 2 instances per viewport. If oxblood appears three times on one screen, the page is wrong.
2. **Accent is never a glow.** No `box-shadow` or `filter: drop-shadow` in an accent hue. Ever. This is the single rule that separates this site from every neon robotics template.
3. **No gradients** except a single permitted case: a ≤ 12% opacity vertical scrim behind text over photography, for legibility only.
4. **Hairlines carry the structure.** Prefer a 1px `--line-hairline` over a filled panel. Prefer a filled panel over a shadow. Elevation shadows are near-absent from this system; `--bg-raised` plus a hairline is the standard "card."
5. **Dark is default** (lab, exhibition). Light theme is fully supported and is the *preferred* reading mode for Blog long-form. Both themes ship at launch and must pass Section 15.
6. All pairings verified against WCAG 2.2 AA before merge. Contrast ratios above are computed, not estimated.

### 5.2 Typography

Two families. Both variable, both open-licence, both self-hosted — no third-party font CDN (Section 14, Section 17.6).

| Role | Family | Axes / weights | Rationale |
| --- | --- | --- | --- |
| Display + UI | **Archivo** (variable) | wght 400–700, wdth 62–125 | A grotesque with a genuine width axis. Condensed widths give engineering-poster headlines without a second family. Deliberately not Inter (ubiquitous) or Space Grotesk (now reads as "crypto/AI"). |
| Labels, metadata, data | **IBM Plex Mono** | 400, 500 | Commissioned as an industrial/technical family; carries the lab-notebook register honestly. Tabular figures are essential for the Record axis and roster tables. |

Safe substitution if Archivo is rejected: **Inter Tight**. Do not substitute a "techno" display face — see Section 17.2.

#### Scale

Fluid via `clamp()`. Line-heights tighten as size increases.

| Token | Size | LH | Tracking | Use |
| --- | --- | --- | --- | --- |
| `display-xl` | `clamp(2.75rem, 7.5vw, 7rem)` | 0.92 | −0.03em | Home hero only |
| `display-l` | `clamp(2.25rem, 5vw, 4.5rem)` | 0.95 | −0.025em | Page titles |
| `display-m` | `clamp(1.875rem, 3.5vw, 3rem)` | 1.02 | −0.02em | Major sections |
| `heading-l` | `1.75rem` | 1.15 | −0.015em | H2 |
| `heading-m` | `1.375rem` | 1.25 | −0.01em | H3 |
| `heading-s` | `1.125rem` | 1.35 | 0 | H4, plate titles |
| `body-l` | `1.125rem` | 1.60 | 0 | Lead paragraphs |
| `body-m` | `1rem` | 1.65 | 0 | Default |
| `body-s` | `0.875rem` | 1.55 | 0 | Secondary |
| `label` | `0.75rem` | 1.0 | **0.12em** | Mono, uppercase. Plate captions, eyebrows |
| `micro` | `0.6875rem` | 1.0 | **0.14em** | Mono, uppercase. Plate numbers, ticks |

#### Rules

- Prose measure: **62–72ch**, hard cap 72ch. Enforced by a `.prose` container, not per-element.
- **Tabular figures mandatory** (`font-variant-numeric: tabular-nums`) in all tables, the Record axis, statistics, and dates. Non-negotiable — proportional numerals in a roster table destroy the precision claim instantly.
- Mono labels are always uppercase with the specified tracking. Uppercase without added tracking is a defect.
- Maximum three type sizes per viewport, excluding labels.
- No text is ever set in an image (Section 17.7).
- `font-display: swap`, subset to Latin + Latin-Ext, preload the two primary weights only. Bengali is deferred but Plex and Archivo both have compatible companions — do not switch to a family that closes that door.

### 5.3 Grid, spacing, layout

```
Shell max-width      1440px
Content max-width    1200px
Prose max-width        72ch
Columns                  12 (desktop) / 6 (tablet) / 4 (mobile)
Gutter               40 / 32 / 24 px
Outer margin         64 / 40 / 20 px
```

Spacing scale (4px base — use tokens, never arbitrary values):
`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 · 160 · 224`

Breakpoints: `480 · 768 · 1024 · 1280 · 1536`

**Vertical rhythm.** Section padding is `96px` mobile / `160px` desktop. Generosity here is where "premium" actually comes from — more than any colour or font choice. Resist the instinct to compress.

**The visible grid.** At `≥1024px`, a persistent hairline column guide renders at `--line-faint` behind content on Home, Achievements, and Team NUVOLA. It is decoration *derived from structure* — the honest version of a decorative background. It must never reduce text contrast.

### 5.4 Component inventory

Build in this order. Each is a design-system primitive with defined states.

**Structural** — `AppShell` · `Header` (sticky, hairline base, collapses to 56px on scroll) · `DatumLine` (Section 5.9.5) · `Footer` · `SectionHeader` (mono eyebrow + display title + hairline) · `GridGuide`

**Content** — **`Plate`** (the atomic unit: media + plate number + mono metadata + optional title/body; variants `still` / `linked` / `feature` / `compact`) · `PlateGrid` (2/3/4-up, hairline-divided) · `ProseBlock` · `PullQuote` · `SpecTable` (hairline data table, tabular figures) · `StatReadout` (large numeral + mono label; **no count-up animation**) · `Figure` (image + placard caption) · `PressClip`

**Navigational** — `PrimaryNav` (with two dropdown groups) · `MobileDrawer` (full-height, hairline-divided, no hamburger animation gimmick) · `Breadcrumb` (mono) · `YearFilter` (segmented, mono) · `Pagination`

**Specialised** — **`RecordAxis`** (Section 5.9.2) · **`ContactSheet`** (Section 5.9.3) · `CommitteeSwitcher` · `MemberCard` · `DirectorySearch` · `Lightbox` (keyboard-first, no zoom-pan gimmick) · `FormField` set · `StatusBadge` (the main licensed use of `--signal`)

Every interactive component defines: default · hover · focus-visible · active · disabled · loading · error · empty.

### 5.5 Motion

Precision reads as *fast, short, and decisive*. The entire motion budget is smaller than instinct suggests.

```
--dur-micro    120ms   /* hover, focus */
--dur-base     180ms   /* default transition */
--dur-enter    240ms   /* scroll reveal */
--dur-large    400ms   /* route transition, hairline draw */

--ease-out     cubic-bezier(0.20, 0, 0.00, 1.00)   /* decisive decelerate */
--ease-inout   cubic-bezier(0.40, 0, 0.20, 1.00)
```

**Rules**

- **No spring, no bounce, no overshoot.** No `elastic`, no `back`, no physics libraries. Mechanisms settle.
- Scroll reveal is `opacity 0→1` plus `translateY(8px→0)`. **8px, not 40px.** Stagger 40ms, max 4 items, fires **once** — never re-animating on scroll-up.
- Signature transition: the **hairline draw** — `scaleX(0→1)`, `transform-origin: left`, `--dur-large`, `--ease-out`. This is the site's one "wow" moment and it is a 1px line. Used at section boundaries and on the Record axis.
- Hover on a Plate: media `scale(1.015)` inside a fixed-overflow frame, plus caption colour shift. Nothing else. No lift, no tilt, no shadow bloom.
- Total animated properties per element ≤ 2. Only `transform` and `opacity` are animated — never `width`, `height`, `top`, or `filter`.
- **`prefers-reduced-motion: reduce`** → all translation and scale removed, opacity-only, durations to `1ms`, Record axis becomes a static list. This is a launch blocker, not a nice-to-have.

### 5.6 Photography and image treatment

The archive spans 2005–2024 across dozens of cameras and photographers. Consistency must be manufactured in post, not hoped for.

**Unified grade** applied at build time to gallery and plate imagery:
- Saturation −8%
- Contrast +4%
- Neutralise extreme white balance (the 2016–2019 sets skew warm-yellow under hall lighting)
- No filters, no duotone, no colour overlay. **Do not tint photographs petrol or oxblood** — it destroys the "realistic" requirement instantly.

**Crop discipline** — a fixed ratio set. No arbitrary ratios:

| Ratio | Use |
| --- | --- |
| `1:1` | Portraits, contact sheet |
| `3:2` | Standard plates, event covers |
| `16:9` | Feature plates, page headers |
| `4:5` | Vertical plates in mixed grids |

**Never** distort to fit. **Never** upscale beyond native resolution. Use `object-fit: cover` with an art-directed focal point where a subject would be cropped out.

**Quality triage.** Weak photographs are used *small*, in grids, or not at all — never as a hero. The 116 pre-curated files in `BRS/best 20/` and the 7 in `Best of the bests/` are the hero pool; treat that curation as authoritative.

**Every image requires substantive alt text.** ~1,100 images is real labour and is budgeted in Phase 3. `alt=""` is permitted only for genuinely decorative images. `alt="image"`, `alt="photo"`, or a filename dump is a defect.

### 5.7 Iconography

Minimal. Most "icon" needs are better met by a mono label or a hairline rule.

Permitted: a stroked 1.5px geometric set at 16/20/24px (Lucide, subset to the ≤ 20 icons actually used, inlined as SVG). Arrows, external-link, close, search, chevron, menu, social marks.

**Forbidden:** gears/cogs, robot faces, circuit-trace motifs, lightbulbs, rockets, brains, binary strings, hexagons. See Section 17.2. A robotics club does not need to illustrate the word "robotics."

### 5.8 Voice and copy

**Register:** the wall label of a well-run museum. Factual, specific, quietly confident. Third person for institutional copy; first person plural ("we") permitted in Blog and Join Us only.

**Do:** "Panasonic Award, ABU Robocon 2005." · "Intra-BUET Robo Challenge 2024. Three segments. 28–29 November, BUET premises." · "Four days across two weeks. Participants completed Google Classroom assignments during the mid-break."

**Don't:** "Empowering the next generation of innovators." · "We are passionate about pushing boundaries." · "Where innovation meets excellence." · Any sentence that would survive being moved to a different club's website.

**The transferability test:** if a sentence works verbatim for another robotics club, delete it. Only specifics are worth publishing.

**Tense discipline.** Past events are past tense. This sounds obvious and is the single most common failure in the source material — `desc.txt` files are all future-tense promotional copy with live registration links (Section 10.4).

**Numerals.** Dates as `01–02 Feb 2024`. Years never abbreviated. Batches keep club convention (`EEE '20`) with a proper typographic apostrophe.

### 5.9 Signature motifs

The six devices that make this site unmistakably BRS. Each is cheap to build, accessible, and directly serves the concept — none is decoration for its own sake.

#### 5.9.1 Plate labels
Every artifact carries a mono placard: plate number, subject, date, location. Consistently applied across ~1,100 images, this *is* the visual identity. Plate numbers are assigned per collection at build time and are stable.

```
PL. 037 — ROBO CARNIVAL 2024
BUET PREMISES · 01–02 FEB 2024 · 6 SEGMENTS
```

#### 5.9.2 The Record — `RecordAxis`
The Achievements centrepiece. A horizontal instrument axis from **2005 to 2026**, with a tick per year, weighted by density of events. Entries attach to their year as plates. Horizontally scrubbable by drag, wheel, and **arrow keys**; each entry is a real focusable link.

This is the page that proves the twenty-year claim. It must not be a vertical stack of cards — that reads as a blog. It must read as a measuring instrument.

Accessibility: renders as a semantic `<ol>` and is fully keyboard-operable; under `prefers-reduced-motion` it becomes a static chronological list. Never the only route to the content.

#### 5.9.3 The Contact Sheet — `ContactSheet`
The ExCom grid, presented as a photographic contact sheet: uniform 1:1 crops, hairline dividers, mono index number per frame, name always visible, role revealed on hover **and** always present in the DOM for keyboard and screen-reader users.

This is the motif that solves a real problem — seven committees with three filename conventions and six dimension standards (Section 9.2) — by making uniformity the aesthetic rather than fighting the source material.

#### 5.9.4 Registration marks
L-shaped print crop marks at major section corners, at `--line-hairline`. Maximum two per page. Pure print-craft signal. Overuse turns precision into pastiche.

#### 5.9.5 The Datum line — `DatumLine`
A persistent 1px rule directly beneath the header carrying, in mono, the current section and a scroll-position readout:

```
─────────────────────────────────────────────────
ACHIEVEMENTS / INTERNATIONAL          2005—2026
─────────────────────────────────────────────────
```

Functions as an instrument readout and as genuine orientation on long archive pages.

#### 5.9.6 Specimen numbers
Robots and projects get catalogue designations (`SPEC. NVL-01`) on Team NUVOLA and Competition pages. Museum-collection convention. Requires the club to confirm real designations rather than invented ones (Section 19.4).

---

## 6. Information architecture

Implemented exactly as requested. Two structural observations are flagged below rather than resolved unilaterally.

```
/                                   Home
/events                             Events — hub
  /events/workshops                   Workshop           (19 events)
  /events/competitions                Competition        (external, 6 programmes)
  /events/intra-buet-robo-challenge   Intra BUET         (2 editions)
  /events/robo-carnival               Robo Carnival      (5 editions)
  /events/seminars                    Seminar            (11 events)
  /events/freshers-reception          Freshers' Reception (5 events)
/executive-committee                Executive Committee — hub
  /executive-committee/current         Current (10th)
  /executive-committee/previous        Previous (3rd–9th)
  /executive-committee/[nth]           Individual committee
/achievements                       Achievements — The Record
/team-nuvola                        Team NUVOLA
/explore                            Explore — hub
  /explore/members                     Member Directory
  /explore/join                        Join Us
  /explore/blog                        Blog
  /explore/blog/[slug]                 Post
/contact                            Contact Us
```

Plus utility routes: `/gallery` (Section 6.3), `/partners`, `/press`, `/search`, `/404`, `/rss.xml`, `/sitemap.xml`.

### 6.1 Flagged — "Competition" vs "Achievements" overlap

Your nav places *Competition* under Events, and *Achievements* as a top-level page. But Intra-BUET and Robo Carnival are themselves competitions, and the international competitions are also achievements. Left unresolved, three pages will show the same content.

**Proposed distinction** (override if you disagree):

| Page | Contains | Answers |
| --- | --- | --- |
| `/events/competitions` | Competitions BRS **enters** — IRC, iARC, Robocon, URC/ERC, NASA Lunabotics, national contests | "Where do BRS teams compete?" |
| `/events/robo-carnival`, `/events/intra-buet-robo-challenge` | Competitions BRS **hosts** | "What does BRS run?" |
| `/achievements` | **Results and awards only**, chronologically, cross-linked to both | "What has BRS won?" |

Achievements becomes the outcome record; Events describes the activity. No duplication.

### 6.2 Flagged — content with no home in the requested nav

Four content sets exist in the archive but have no page in the requested structure:

| Content | Volume | State | Proposal |
| --- | --- | --- | --- |
| **Annual General Meetings** | 5 (2017, 2018, 2019, 2022, 2024) | **Web copy already written** | Add to `/executive-committee` as a Governance section — AGMs are constitutional, not events |
| **Partners / sponsors** | `club partners.txt` (7 partners), Meghna Group, Transcom, co-organised RoboFiesta 2018 | Links only | `/partners` — also directly serves Audience 3 |
| **Press coverage** | 3 Prothom Alo clippings (iARC 2014, iARC 2015, IRC 2015) | Scans | `/press`, plus a `PressClip` strip on Home |
| **Curated photography** | 116 + 7 selects | Pre-curated | `/gallery` — see 6.3 |

The AGM case is the notable one: that copy is already written and ready to publish. Leaving it out discards finished work.

### 6.3 Flagged — Gallery

There is no Gallery page in the requested nav, but 1,105 photographs and an explicit pre-curated selection. For an *interactive museum*, an archive-browse surface is close to the core proposition.

**Recommendation:** `/gallery`, reachable from Explore and from Home, filterable by year and event type, built on `Plate` and `Lightbox`. Photographs otherwise appear only scattered across event pages, and the archive — the single strongest asset — never gets presented as a whole.

### 6.4 Navigation behaviour

Desktop: 10 top-level items, two with dropdowns (Events, Executive Committee, Explore). Dropdowns open on hover **and** click/Enter; hover-only is a defect. Sticky header, collapses 72px → 56px past 120px scroll, hairline base at all times.

Mobile (`<1024px`): full-height drawer, hairline-divided groups, accordion sub-navigation. A plain two-line menu mark — no morphing-hamburger animation.

**"Join Us" also appears as a persistent secondary action in the header**, despite living under Explore. It is the primary conversion and should not be two clicks deep. This is the one place I recommend deviating from strict nav hierarchy.

---

## 7. Page blueprints

Each blueprint maps to verified archive assets. Content marked **[GAP]** does not exist and must be created or supplied.

### 7.1 Home `/`

Purpose: establish institutional credibility in one viewport; route the seven audiences.

| # | Section | Content | Source |
| --- | --- | --- | --- |
| 1 | Hero | `display-xl` statement + one hero photograph, full-bleed with scrim. **No carousel, no video, no WebGL.** | `best 20/Best of the bests/` |
| 2 | Datum readout | Four `StatReadout`s: years active · committees · events hosted · international competitions | Computed from content, never hardcoded |
| 3 | The Record — condensed | 6–8 highest-value entries on a horizontal axis → Achievements | `Robocon/`, `NASA Lunabotics/`, `Rover/`, `IRC*`, `iARC*` |
| 4 | What BRS does | Four plates: Compete · Build · Teach · Convene | Curated |
| 5 | Recent | 3 most recent events, reverse-chronological | `events` collection |
| 6 | Team NUVOLA | Single feature plate | **[GAP]** — Section 19.4 |
| 7 | Press | `PressClip` strip, 3 clippings | Prothom Alo scans |
| 8 | Partners | Hairline logo row, greyscale, uniform optical sizing | **[GAP]** — vectors needed, 19.5 |
| 9 | Join | Single decisive CTA block | — |

Hero copy must pass the transferability test (5.8). Draft for review: *"Twenty years of building. BUET Robotics Society has designed, built and campaigned robots since 2005 — Robocon to Mars rover analogues."*

### 7.2 Events hub `/events`

Six category plates with real counts (19 · 6 · 2 · 5 · 11 · 5), plus a combined chronological index with year filter. Counts are computed, never written by hand.

### 7.3 Workshop `/events/workshops`

Strongest content in the archive: 19 workshops, **18 with publishable copy already written.**

Two series, presented distinctly:
- **Basic Workshop v1.0 → v8.0** — the flagship progression. Present as a *series* with version numbering; this progression is itself evidence of institutional continuity.
- **Specialised** — PCB Design (2017, 2021, 2024), Computer Vision, Image Processing, MATLAB, ML Mastery, Simulation Software, Trash Collector, Basic Robotics 2016.

Detail template: title · dates · platform · eligibility · day-by-day curriculum (`SpecTable`) · photo plates · outcome. Source `description for website.txt` where present; derive from `desc.txt` per Section 10.4 where not.

Photo sets available: v1.0 (6) · v2.0 (15) · v3.0 (18) · v5.0 (11) · v6.0 (10) · v8.0 (14) · pcb_21 (4) · ML (3).

### 7.4 Competition `/events/competitions`

Highest-value, **lowest-completeness** page. Six international programmes; metadata exists only in filenames.

| Programme | Year(s) | Teams (from filenames) | Assets |
| --- | --- | --- | --- |
| ABU Robocon | 2005, 2008 | Team BUET — **Panasonic Award 2005** | 2 photos |
| IRC | 2012–2015 | SKULL, ErfindeR, REX, Falcons, Exponential, AC~DC, Resonance | 15 photos + 1 press |
| iARC (Techkriti, IIT Kanpur) | 2014, 2015 | Exponential, AC~DC, Fireflies | 10 photos + 2 press |
| NASA Lunabotics | 2013 | MechaTron | 2 photos |
| University/European Rover Challenge | 2015, 2016 | **Team Interplanetar** | 3 photos |
| National contests | various | Resonance, AC~DC, Exponential, Team BUET | 6 photos |

**[GAP]** — every one of these needs: full competition name, host institution, placement/result, team roster, and one paragraph. Requires ExCom and alumni input (Section 19.2). Until supplied, publish photograph plates with verified filename metadata only, and **never invent a placement.**

Note a source inconsistency to resolve: the rover team appears as *Interplanetar* in the 2017 seminar copy and *Interplaneters* in filenames. Confirm the correct name (19.3).

### 7.5 Intra BUET Robo Challenge `/events/intra-buet-robo-challenge`

2024 edition is fully documented — `intra buet/intra_24/sum.txt` is publishable near-verbatim: Transcom-powered, theme "Engineering the Future," 28–29 Nov 2024, three segments, 26 photos. 2022 edition has `desc.txt` + 5 photos.

### 7.6 Robo Carnival `/events/robo-carnival`

Flagship hosted event, five editions (2016, 2017, 2019, 2023, 2024), 183 local photographs — the richest photo set in the archive.

2024 is fully documented: Meghna Group presented, theme "Innovative Robotics for Future Bangladesh," 01–02 Feb 2024, six segments (Aero Guardians · Techno Masters · Fire Fighting Bot · Industrial Line Tracker · Project Showcasing · Robotics Olympiad).

**Critical:** source copy is future-tense with live Google Form links, registration deadlines, and a bKash number. All must be stripped and the copy converted to past tense (Sections 10.4, 12).

### 7.7 Seminar `/events/seminars`

Eleven sessions, 2016–2024. Notable: the 2017 Mars Rover Challenge session facilitated by Khaled Bin Moinuddin (EEE '10), Team Interplanetar lead — direct evidence of alumni continuity, worth foregrounding. Also a 2016 radio appearance and 2024 outreach at St. Joseph.

Five have web-ready copy; six need derivation. Four `New Text Document.txt` files need renaming in the pipeline.

### 7.8 Freshers' Reception `/events/freshers-reception`

Consolidates orientation programmes (2020, 2022, 2023, RoboGenesis, Robotic Inception — 19 photos) and `BRS'24 Reception Programme` (2 photos). Serves Audience 1 directly; keep the tone warmer than the rest of the site while holding the type system.

### 7.9 Executive Committee `/executive-committee`

**Current (10th)** — best-supported committee: 52 portraits at a uniform 1024×1024, full roster. `ContactSheet` grid grouped by Core Committee then seven teams (Project & Competition · Workshop · Design · Event Management · Membership Development · Media & Outreach · Executive Members). Moderator Prof. Dr. Shaikh Anowarul Fattah, Department of EEE, presented first — consistent across all seven rosters.

**Previous (3rd–9th)** — `CommitteeSwitcher`. Portrait availability is uneven (Section 9.2); committees without usable portraits fall back to a hairline `SpecTable` roster, which is a legitimate archival presentation, not a failure state.

**Governance** — the five AGMs (Section 6.2).

**Absolute requirement:** the `Contact no.` column is stripped from all seven rosters. See Section 12.

**[GAP]** — 1st, 2nd, and 6th committees are entirely absent. Either source them or state the gap explicitly on the page; a silent jump from 3rd to 4th to 5th to 7th undermines the archival claim (19.1).

### 7.10 Achievements `/achievements`

The `RecordAxis`, 2005–2026. Three filterable tracks: International · National · Hosted. Each entry: year · competition · team · result · photograph · cross-link.

This page carries the institutional argument. It is also the page most dependent on **[GAP]** data from Section 7.4 — a timeline of participations without results is materially weaker than one with placements. Prioritise the alumni outreach in 19.2 accordingly.

### 7.11 Team NUVOLA `/team-nuvola`

**Near-total content gap.** Verified: exactly one asset exists — `BRS/best 20/brs/nuvola.heic`, 2.3 MB, in a format no browser renders. No description, no roster, no specification anywhere in the archive.

Given Team Interplanetar's rover history (ERC 2015, URC 2016), NUVOLA appears to be the current flagship rover or robot team — but I will not guess on a page this prominent.

Blueprint, contingent on 19.4: hero photograph · mission statement · `SpecTable` of subsystems (drivetrain, manipulator, power, comms, autonomy) · team structure · competition record · build gallery · recruitment route.

Until content is supplied this page must not ship with placeholders. Either it launches complete or it is held to Phase 6 and removed from the nav — a prominent nav item leading to a stub is worse than its absence.

### 7.12 Member Directory `/explore/members`

~470 members across 3rd–10th committees, from parsed rosters. Client-side search (prebuilt JSON index, MiniSearch — the dataset is trivially small); filters by committee, team, department, batch. `ContactSheet` and table views.

**Privacy is the governing constraint.** Publishable: name, designation, department, batch, committee, portrait. **Never publishable: phone numbers.** Consider whether current students should be listed at all without consent — a searchable directory of identifiable students is a materially different privacy proposition from a committee page. Flagged in 19.9 as a decision for the ExCom, not for me.

### 7.13 Join Us `/explore/join`

Serves the primary conversion. Content: what membership involves · the six teams and what each actually does · the annual recruitment cycle (nine documented drives, 2016–2024, establish a real pattern) · what a first-year member builds in year one · Basic Workshop as the entry path · FAQ · application route.

Recruitment history and orientation photographs supply the evidence. Form handling per 19.7.

### 7.14 Blog `/explore/blog`

**[GAP]** — no existing posts. Ships with the system and 3–4 seed posts to avoid an empty section. Highest-value seeds, all of which convert archive material into narrative: a Robo Carnival 2024 retrospective · "Building an LFR: what Basic Workshop actually teaches" · the Interplanetar rover history · an alumni interview.

Long-form defaults to **light theme** for readability. Optional Instrument Serif for pull quotes — the one licensed departure from the two-family system, restricted to Blog.

### 7.15 Contact Us `/contact`

`buet.robotics.society@gmail.com` (verified, appears in multiple sources) · [facebook.com/BUETRoboticsSociety](https://www.facebook.com/BUETRoboticsSociety) · BUET campus address **[GAP — confirm exact room/building]** · routed enquiry form (membership / sponsorship / collaboration / press) · a **club** contact number only if the ExCom designates an official line. Never a personal number.

---

## 8. Content model

Astro content collections with Zod schemas. Schemas are the enforcement mechanism for the discipline this design depends on — a plate cannot render without its metadata, so the schema makes metadata mandatory.

```ts
// src/content/config.ts  (illustrative, not final)

const events = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string(),
    category: z.enum([
      'workshop', 'competition', 'robo-carnival',
      'intra-buet', 'seminar', 'reception', 'agm', 'co-organised',
    ]),
    series: z.string().optional(),          // "Basic Workshop", "Robo Carnival"
    edition: z.string().optional(),         // "v8.0", "2024"
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    venue: z.string().optional(),
    platform: z.string().optional(),        // online events
    theme: z.string().optional(),
    presentedBy: z.string().optional(),     // "Meghna Group of Industries"
    eligibility: z.string().optional(),
    segments: z.array(z.object({
      name: z.string(),
      description: z.string(),
      eligibility: z.string().optional(),
    })).optional(),
    cover: image(),
    coverAlt: z.string().min(12),           // enforces real alt text
    gallery: z.array(z.object({
      src: image(), alt: z.string().min(12), plate: z.number().optional(),
    })).default([]),
    externalAlbum: z.string().url().optional(),
    copySource: z.enum(['web-ready', 'derived', 'authored']),
    status: z.enum(['past', 'upcoming']).default('past'),
    featured: z.boolean().default(false),
  }),
});

const committees = defineCollection({
  type: 'data',
  schema: z.object({
    ordinal: z.number(),                    // 3..10
    label: z.string(),                      // "10th Executive Committee"
    termStart: z.number(), termEnd: z.number(),
    moderator: z.object({
      name: z.string(), title: z.string(), department: z.string(),
    }),
    groups: z.array(z.object({
      name: z.string(),
      members: z.array(z.object({
        name: z.string(),
        designation: z.string(),
        department: z.string(),
        batch: z.string(),
        portrait: z.string().optional(),
        // NOTE: no phone/contact field. Absent by design — see §12.
      })),
    })),
  }),
});

const achievements = defineCollection({ /* year, programme, host, team,
  result, track: international|national|hosted, evidence[], relatedEvent */ });

const projects   = defineCollection({ /* Team NUVOLA, specimen, subsystems[] */ });
const posts      = defineCollection({ /* blog */ });
const partners   = defineCollection({ /* sponsors, tier, logo, year */ });
const press      = defineCollection({ /* outlet, date, scan, event */ });
```

The `committees` schema **has no contact field.** Privacy is enforced by the type system, not by reviewer vigilance.

`copySource` tracks provenance so it is always visible which pages still carry derived rather than authored copy.

---

## 9. Asset engineering

Four verified problems, each with a defined remedy. All scripts live in `scripts/`, run via `npm run assets:*`, and are idempotent.

### 9.1 Image weight — 1,780 MB across 1,105 files

Several Robo Carnival 2024 frames are 8–10 MB (`DSC00556.JPG` is 10.5 MB). Shipping any of these directly is disqualifying.

Pipeline: Astro `astro:assets` + sharp → AVIF (primary) + WebP (fallback) → responsive widths `320 · 640 · 960 · 1280 · 1920` → quality 78 AVIF / 82 WebP → LQIP blur placeholder inline → explicit `width`/`height` on every image to eliminate CLS → `loading="lazy"` + `decoding="async"` below the fold, eager for LCP only.

Target: hero ≤ 250 KB, plate ≤ 90 KB, portrait ≤ 40 KB. A ~40× reduction from source, which is the correct order of magnitude for 8 MB originals.

Originals stay outside the build in `assets-source/`, never in `public/`.

### 9.2 Portrait inconsistency

Verified state:

| Committee | Files | Naming convention | Dimensions |
| --- | --- | --- | --- |
| 10th | 52 png | `1. Name_Designation.png` | 1024×1024 ✅ |
| 9th | 67 png | `10 Designation - Name.png` | 2025×2025 ✅ |
| 3rd | 48 png | `10 Designation - Name.png` | ~702×960 |
| 4th | 44 jpg + 9 png | mixed | 640×960 |
| 5th | 40 jpg + 9 png | mixed | varies |
| 7th | 54 jpg | mixed | varies |
| 8th | 59 jpg | mixed | varies |

`scripts/normalize-portraits.ts` — sharp + `smartcrop-sharp` for face-aware 1:1 cropping → 1024/512/256 → AVIF+WebP → per-committee filename parser (three conventions, explicitly not one regex) → emits `portrait-manifest.json` and **a report of unmatched files for manual resolution.** Names in filenames will not all reconcile with names in rosters; the script surfaces mismatches rather than silently dropping people.

Known reconciliation issues: `Aasfee Mosharraf Bhuiya` / `Bhuiyan` (both spellings present), `Desing Team` typo, duplicate `Ahamad Abtahi` originals, one Windows `.lnk` in `10th/images original`.

### 9.3 HEIC — 34 files

Unrenderable in browsers. `scripts/transcode-heic.ts` via sharp/libheif → AVIF+WebP. Includes the sole Team NUVOLA asset. Verify each visually after conversion — HEIC colour profiles occasionally shift.

### 9.4 Non-web source files — excluded

`Booth 2.eps` (105 MB) · three `.ai` files (36 MB each) · `DSC06289.ARW` (37 MB raw) · two `.docx` · two `.zip` · one `.lnk`. Total ~250 MB excluded via `.assetignore`.

Exception: `logo/BRS Logo FINAL.ai` is the source for a hand-optimised inline SVG logo — the single most important asset on the site. Export, optimise manually, verify at 24px and 320px.

### 9.5 Filename metadata extraction

Competition filenames are the only record of that history: `BUET SKULL, IRC 2012-1.jpg` → `{team: "BUET SKULL", programme: "IRC", year: 2012, seq: 1}`. `scripts/parse-competition-filenames.ts` produces a seed dataset for human verification. **Parser output is a draft for review, never published unverified** — filenames are evidence, not authority.

### 9.6 Google Drive albums

`photos.txt` files hold Drive links (some with tracking parameters), not local paths. Drive is not a gallery backend — it is slow, unstyled, requires permissions, and links rot.

Approach: mirror the best 20–30 photographs per event locally as the on-site gallery; retain the Drive link as a clearly-labelled "full album" secondary action; strip all `fbclid` and tracking parameters. Flag: several links are `/drive/mobile/` URLs which behave inconsistently on desktop — normalise them.

---

## 10. Content production

### 10.1 Inventory

| Category | Items | Copy ready | Needs work |
| --- | --- | --- | --- |
| Workshops | 19 | 18 | 1 |
| AGM | 5 | 5 | 0 |
| Robo Carnival | 5 | 0 | 5 |
| Seminars | 11 | 5 | 6 |
| Recruitment | 9 | 0 | 9 |
| Orientation / Reception | 5 | 0 | 5 |
| Intra-BUET | 2 | 1 | 1 |
| Competitions | 6 programmes | 0 | **6 — needs research** |
| Team NUVOLA | 1 | 0 | **1 — needs everything** |
| Blog | 0 | 0 | 3–4 seeds |

23 of ~63 content items have publishable copy. **~40 need writing**, plus ~1,100 alt texts.

### 10.2 File naming to normalise

`desc.txt` · `description.txt` · `desc for web.txt` · `desc for website.txt` · `description for website.txt` · `New Text Document.txt` (×4) · `sum.txt` — seven conventions for two actual document types. Normalise on ingest to `body.md` and `body.web.md`.

### 10.3 Where web-ready copy exists, use it

`Workshops/pcb_24/description for website.txt` and `AGM/2024/desc for web.txt` are well-written, correctly past-tense, and match the target register. Whoever wrote them understood the assignment. Preserve that voice as the reference for all derived copy.

### 10.4 Deriving copy from promotional source

`desc.txt` files are Facebook posts. Every one requires:

1. **Strip unicode-styled text** — `𝐖𝐨𝐫𝐤𝐬𝐡𝐨𝐩` → `Workshop`. These are mathematical-alphanumeric codepoints; screen readers announce them character-by-character or not at all. **This is an accessibility defect, not a style preference.** Automate the transliteration and verify.
2. **Remove all emoji** from body copy.
3. **Convert future → past tense.**
4. **Remove registration mechanics** — Google Form links, deadlines, fees, bKash/Nagad numbers (one appears in `pcb_24`), "Enroll now."
5. **Remove personal phone numbers** (one appears in `pcb_24`, distinct from the payment number above).

   > Both numbers were quoted verbatim here in v1.0 of this document and were caught by the PII gate (`implementation_plan.md` §12.1) on its first real run. They are redacted above. The lesson generalises: planning documents get shared, pasted, and published, so they are a shippable surface and the gate scans them. Cite the file, never the digits.
6. **Preserve factual specifics** — dates, venues, curricula, segment descriptions, sponsors, eligibility. This is the valuable content.
7. **Retain rulebook links** where still live; mark clearly as archival. Several are truncated (`https://drive.google.com/.../1K4gfP0pIr.../view...`) and unrecoverable — omit rather than publish a broken link.

---

## 11. Technical architecture

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | **Astro 5** | Content-heavy, image-heavy, near-zero interactivity. Ships no JS by default; content collections with Zod give the schema enforcement this design depends on; `astro:assets` solves 9.1 natively. A React SPA would be actively worse here. |
| Language | TypeScript, `strict` | — |
| Styling | **Tailwind 4** with `@theme` tokens locked to Section 5 | Velocity plus enforced constraint. Arbitrary values (`text-[13px]`) fail lint. |
| Interactivity | Astro islands, vanilla TS. React only if a component genuinely needs it (likely: `RecordAxis`, `DirectorySearch`) | — |
| Images | `astro:assets` + sharp | — |
| Search | MiniSearch, prebuilt index | ~470 records — a server is unjustifiable |
| Content | Markdown/MDX + JSON data collections | — |
| CMS | **Keystatic** (git-based) | Section 16 |
| Forms | Section 19.7 | — |
| Hosting | **Cloudflare Pages** | Free tier, global edge, excellent asset caching, good Bangladesh latency |
| CI | GitHub Actions — typecheck, lint, build, Lighthouse CI, **PII gate (§12)**, link check | — |
| Analytics | Plausible or Cloudflare Web Analytics | Cookieless, no consent banner needed |

**Explicitly rejected:** WordPress (maintenance and security burden across annual handover) · Next.js (SSR/RSC complexity unjustified for a static archive) · Webflow/Framer (template aesthetic, per-seat cost, no git history, poor handover) · any headless CMS with a paid tier (a student club must not inherit a subscription).

Repository layout:

```
/
├── assets-source/          # 2 GB originals, git-lfs or external, NOT in build
├── scripts/                # asset + content pipeline (§9)
├── src/
│   ├── content/            # collections + Zod schemas
│   ├── components/         # design-system primitives (§5.4)
│   ├── layouts/ · pages/ · styles/ (tokens) · lib/
├── public/                 # only genuinely static files
├── docs/
│   ├── DESIGN_SYSTEM.md · CONTENT_GUIDE.md · HANDOVER.md · adr/
└── PROJECT_SPEC.md         # this file
```

---

## 12. Privacy — non-negotiable

**The seven ExCom rosters contain personal mobile numbers for approximately 470 people, most of them current students.** Verified across all seven markdown files, in a `Contact no.` column.

Publishing these would be a serious privacy breach: it exposes identifiable students to spam, harassment, and fraud, and it is the kind of thing that gets copied straight into a data file during a fast build.

**Controls, layered so that no single human error can cause a breach:**

1. The `committees` Zod schema **has no contact field.** Data carrying one fails validation at build.
2. `scripts/parse-excom.ts` drops the contact column at parse time. It never reaches `src/`.
3. `scripts/audit-pii.ts` greps all built output for Bangladeshi mobile patterns (`01[3-9]\d{8}`) and **fails the build** on any match. Runs in CI on every PR.
4. Manual review of `/executive-committee/*` and `/explore/members` before launch.

Also in scope for stripping: the bKash/Nagad number in `Workshops/pcb_24/description.txt`, the personal contact in the same file, and any number embedded in a promotional graphic — **including numbers rendered inside images**, which the grep cannot catch. Poster images require visual review.

Related decisions for the ExCom, not for me: whether current students appear in a public searchable directory at all (19.9); whether alumni consented to their photographs being published (19.10); whether minors appear in Robotics Olympiad photography (19.11).

---

## 13. Performance budgets

Enforced by Lighthouse CI; a PR that regresses any metric fails.

| Metric | Budget |
| --- | --- |
| LCP | < 1.8s (Slow 4G, mid-tier Android) |
| CLS | < 0.05 |
| INP | < 200ms |
| JS, content pages | < 60 KB gzip |
| JS, interactive pages | < 120 KB gzip |
| CSS | < 40 KB gzip |
| Fonts | < 120 KB total, 2 files, subset, preloaded |
| Largest image | < 250 KB |
| Total page weight | < 900 KB (excl. lazy gallery) |
| Lighthouse Perf / A11y / SEO | ≥ 95 / 100 / 100 |

Bangladesh mobile network conditions are the design target, not a desktop on fibre. This is a real constraint for Audience 1 and it disciplines the whole build.

---

## 14. Accessibility

**Standard: WCAG 2.2 Level AA.** Non-negotiable, not a Phase 6 cleanup.

Semantic landmarks and one `<h1>` per page, correct heading order · visible focus indicators (2px `--focus-ring`, 2px offset, never `outline: none` without replacement) · full keyboard operation including `RecordAxis`, `Lightbox`, `ContactSheet`, and dropdowns · all contrast pairings verified (Section 5.1) · `prefers-reduced-motion` fully honoured (5.5) · substantive alt text on ~1,100 images (5.6) · **no information conveyed by hover alone** — the ContactSheet role reveal must exist in the DOM · no text baked into images · forms with real `<label>`s, `aria-describedby` errors, and no placeholder-as-label · skip link · `lang` attributes, ready for future Bengali.

Testing: axe-core in CI · manual keyboard pass on every page · NVDA and VoiceOver spot-checks · 200% zoom and 400% reflow.

The unicode-styled text in source copy (10.4.1) is an accessibility defect and is treated as such.

---

## 15. SEO and metadata

Server-rendered static HTML · unique title and meta description per page · Open Graph and Twitter cards with a generated OG image per event (Satori/`astro-og-canvas`, using the design system) · `Organization`, `Event`, `Person`, and `Article` JSON-LD · canonical URLs · `sitemap.xml` · `rss.xml` for Blog · semantic slugs (`/events/robo-carnival/2024`).

Target queries: "BUET Robotics Society" · "robotics club Bangladesh" · "Robo Carnival BUET" · "BUET rover team" · specific competition and team names. The archive's specificity is a genuine long-tail asset — team names like *Interplanetar*, *MechaTron*, and *AC~DC* have effectively no competition in search.

---

## 16. Handover and maintainability

**The ExCom turns over annually.** The 11th committee takes over within roughly a year. This is the constraint most likely to determine whether the site is alive in 2030, and most likely to be ignored during an exciting build.

A design system a non-specialist cannot maintain has failed, however good it looks at launch.

Provisions:

1. **Keystatic CMS** — git-based, free, no subscription inherited, Astro-native. A new Media & Outreach secretary can add an event, upload photographs, and publish without touching code or a terminal.
2. **`docs/CONTENT_GUIDE.md`** — how to add an event, publish a committee, write in the house voice, write alt text, and crop a portrait. Written for a second-year student, not a developer.
3. **`docs/HANDOVER.md`** — annual checklist: publish the new committee, move the previous one, update AGM, rotate access credentials, verify the PII gate still passes.
4. **`docs/adr/`** — short architecture decision records, so a future maintainer understands *why* rather than reverse-engineering intent.
5. **Design tokens as the single source of truth.** No hardcoded values anywhere; the visual system cannot drift through casual edits.
6. **The PII gate (§12) persists in CI indefinitely.** It protects the site from every future maintainer, including well-meaning ones who paste a roster straight from a spreadsheet.
7. **Portrait normalisation is a script, not a Photoshop session** — the 11th committee's photographs run through the same pipeline.

---

## 17. What to avoid

The prohibition register. Each entry is a specific, plausible failure for *this* project — not generic advice. Violations are review blockers.

### 17.1 AI / SaaS / startup tropes

The dominant aesthetic of 2024–26 web design, and completely wrong for a twenty-year-old engineering institution. Avoid without exception:

- **Mesh gradients, gradient blobs, aurora backgrounds, animated gradient borders.** The instant signature of an AI startup.
- **Glassmorphism** — frosted translucent cards with `backdrop-filter`. Dated and hostile to the hairline system.
- **Purple-to-blue gradient** as an accent. You have `#0E516E` and `#7B1223`. Use them.
- **"Get Started" / "Book a Demo" / "Join the Waitlist"** button language. The verb is "Apply," "Read," or "View."
- **Bento grids** as a default layout. A bento grid of mismatched archive photographs is visual noise, not a system.
- **Testimonial carousels.** Nobody testimonialises a robotics club.
- **"Trusted by" logo strips** repurposed for sponsors. Sponsors get a `/partners` page with real context, not a social-proof bar borrowed from B2B SaaS.
- **Pricing-table layouts** for membership tiers.
- **Floating 3D shapes, Spline embeds, blob morphs, animated gradient orbs.**
- **Lottie robot mascots**, animated illustrations, waving hands.
- **Feature grids of vague icon + noun + one-line-of-nothing.**
- **Copy that could belong to any organisation:** "Empowering the next generation," "Where innovation meets excellence," "Pushing the boundaries of what's possible." Fails the transferability test (5.8).
- **A newsletter modal** on first visit.
- **Stock photography.** You have 1,105 real photographs. A stock photo of a generic robot arm on this site is an active lie about a club that has actually built things.

### 17.2 Robotics-club clichés

The specific trap for this brief. Every university robotics club builds the same site, and it always undercuts the engineering credibility it is reaching for:

- **Neon cyan or lime green on pure black, with glow.** The single most predictable choice available. It reads as gaming peripheral or crypto exchange, not engineering. Your brand palette is already better and more distinctive than anything in this direction.
- **`box-shadow` / `text-shadow` glow in any accent hue.** Restated from 5.1.2 because it is the hardest habit to break: glow is the opposite of precision. Precision is a hairline.
- **Circuit-board trace patterns** as background texture.
- **Matrix digital rain**, falling binary, `0101` decoration.
- **Gear and cog iconography.** A gear does not signify engineering; it signifies clip art.
- **Orbitron, Blade Runner, "techno," squared-terminal, or stencil display faces.** Instant amateurism. Precision comes from a well-set grotesque, not a sci-fi face.
- **Hexagon grids and honeycomb layouts.**
- **"Iron Man HUD" overlays** — targeting reticles, corner brackets, scanning lines, fake telemetry. Note the distinction from 5.9.4: *print registration marks* are a craft reference; *HUD brackets* are a film reference. One is restrained; the other is cosplay.
- **Chrome, metallic bevel, or carbon-fibre textures.**
- **Typewriter / text-scramble effects** on headings. Once might be defensible. On every heading it is a tic that delays content.
- **Robot emoji** 🤖 in headings or nav.
- **Fake terminal windows** with simulated command output.
- **3D renders of robots the club has not built.** Fatal to the "realistic" requirement.

### 17.3 Interaction and motion failures

- **Scrolljacking.** Never override native scroll. The Record axis scrubs horizontally *within its own bounds* and never hijacks page scroll — particularly on mobile, where horizontal hijack breaks the back-swipe gesture.
- **A custom cursor.** Especially a lagging blend-mode circle. Breaks affordances, fails accessibility, and dates the site to 2021.
- **A full-page preloader with a percentage counter.** Manufactured wait on a static site that should load in under two seconds. If you need a loader, the build is wrong.
- **Autoplaying audio or video with sound.**
- **`particles.js`** or any interactive particle field.
- **Tilt-on-hover cards** (`vanilla-tilt`). Toy physics.
- **Spring, bounce, and elastic easing.** Mechanisms settle.
- **Long scroll reveals** — 40px+ translations, 600ms+ durations, re-animating on scroll-up. 8px and 240ms, once (5.5).
- **Animating `width`, `height`, `top`, `left`, or `filter`.** Compositor-only properties.
- **Marquees and infinite auto-scrolling logo strips.**
- **Hover-only information.** An accessibility failure and useless on touch.
- **Parallax on everything.** One restrained instance at most; more reads as a template.
- **Page-transition libraries** that add perceived latency for a swipe effect.

### 17.4 Content and editorial failures

- **Publishing phone numbers.** Section 12. The highest-severity risk in the project.
- **Presenting past events as upcoming.** The source copy is all future-tense with live registration links and deadlines. Publishing it unedited makes the club look inattentive and sends people to closed forms.
- **Dead links presented as live.** Several rulebook URLs in the archive are truncated and unrecoverable. Omit them.
- **Invented competition results.** No filename records a placement. Never write "1st place" or "finalist" without club or alumni verification (19.2). A single fabricated result destroys the credibility of the entire Record.
- **A founding year that nobody verified.** Robocon 2005 is the earliest evidence, but "founded 2005" is an inference, not a fact. Confirm (19.6).
- **Unlabelled photographs.** Principle 3.
- **Lorem ipsum reaching production.**
- **"Coming Soon" pages in the primary nav** — most acutely Team NUVOLA (7.11). Remove the nav item rather than ship a stub.
- **Silent archival gaps.** The missing 1st, 2nd, and 6th committees should be stated, not concealed. An archive that acknowledges its gaps is more credible than one that hides them.
- **Unicode-styled text** (`𝐖𝐨𝐫𝐤𝐬𝐡𝐨𝐩`) copied from Facebook. An accessibility defect (10.4.1).
- **Emoji in body copy** carried over from promotional source.
- **Inflated language.** "World-renowned," "leading," "premier" — unless externally verifiable. The real record is impressive; overclaiming makes a reader doubt the parts that are true.
- **Google Drive folders as the gallery.** Section 9.6.
- **Untreated mixed-quality photography** at hero size (5.6).

### 17.5 Visual-craft failures

- **Pure black `#000000`** or pure white `#FFFFFF` as a page surface. `#0B0D0E` and `#F4F3F1`.
- **More than one accent colour in play.** Oxblood is a signal, not a second brand colour (5.1.1).
- **Tinting photographs** in a brand hue.
- **Stacked effects** — shadow plus border plus gradient plus blur on one element. One device per element.
- **Proportional numerals in tables and the Record axis.** Tabular figures (5.2).
- **Uppercase without letter-spacing.**
- **Centred long-form body text.**
- **Line lengths beyond 72ch.**
- **Distorted or upscaled images.** Never `width: 100%; height: 100%` without `object-fit`.
- **Arbitrary spacing values** outside the 4px scale.
- **More than three type sizes per viewport** (labels excepted).
- **Inconsistent border radii.** Pick two — `2px` for inputs and small elements, `0px` for plates and structural surfaces. This system is close to square by intent; large radii read as consumer-app friendliness and fight the archive concept.

### 17.6 Performance failures

- **Shipping source images.** 8–10 MB JPEGs exist in the archive and must never reach the build (9.1).
- **HEIC in an `<img>`.** 34 files (9.3).
- **Images without `width`/`height`.** Guaranteed CLS.
- **Third-party font CDN.** Self-host. Latency, privacy, and a single point of failure.
- **FOIT.** `font-display: swap`, preload the two primary weights.
- **A JS framework for static content.** Islands only.
- **Unsubset fonts** shipping full glyph coverage.
- **Loading the entire gallery eagerly.**
- **Embedding YouTube directly** — use a facade (a poster image that loads the player on click). A raw embed costs ~1 MB of third-party JS.
- **Any tracker requiring a cookie banner.**
- **Committing 2 GB of originals to plain git.** LFS or an external bucket.

### 17.7 Accessibility failures

- **`outline: none`** without an equivalent visible replacement.
- **Text baked into images.** Unsearchable, unselectable, untranslatable, breaks at zoom. Event posters are images *and* need their content as real text.
- **Contrast below AA**, most likely with `--text-tertiary` on a photograph.
- **Skipped heading levels** for visual sizing. Size is a token, not a tag.
- **Icon-only controls without an accessible name.**
- **Placeholder as label.**
- **Motion without a `prefers-reduced-motion` path.**
- **Keyboard-inaccessible custom widgets** — the Record axis is the main risk.
- **Autoplaying carousels** without pause.
- **`div` with `onclick`** instead of a `button` or `a`.

### 17.8 Architecture and process failures

- **Hardcoding content in components.** Everything through content collections. A hardcoded roster cannot be handed over.
- **Hardcoded design values** bypassing tokens.
- **A component library that fights the design system** — Material UI, Chakra, Bootstrap, shadcn/ui defaults. Their opinions are visible and are not these opinions.
- **Manual statistics.** "20+ events" written by hand goes stale and eventually becomes false. Compute from content.
- **Building pages before the design system** (Section 18 phase order). Guarantees drift and rework.
- **Skipping the Zod schemas.** They are the privacy and metadata enforcement mechanism, not paperwork.
- **A CMS with a paid tier.** A student club must not inherit a subscription that lapses.
- **Undocumented decisions.** ADRs (16.4).
- **Deferring accessibility and performance to a final phase.** Both are constraints during the build; retrofitting either costs several times more.

---

## 18. Phases

Sequencing matters: foundation before pages, always. The most common way a project like this fails is building attractive pages first and discovering the system afterwards.

| Phase | Work | Exit criteria |
| --- | --- | --- |
| **0 — Alignment** | Sign off Sections 2, 5, 6, 17. Resolve Section 19 blockers. | Written sign-off. Blocking questions answered. |
| **1 — Foundation** | Repo, Astro, tokens, fonts, Zod schemas, CI with **PII gate**, Cloudflare deploy. Logo SVG. | `main` deploys. PII gate proven to fail on a seeded number. |
| **2 — Asset pipeline** | Scripts 9.1–9.6. HEIC transcode. Portrait normalisation + mismatch report. Roster parse (contact stripped). Filename metadata draft. | All 1,105 images optimised and within budget. Zero contact data in `src/`. |
| **3 — Design system** | Components 5.4 in isolation. All states. Motion. Both themes. Axe-clean. Documented in `DESIGN_SYSTEM.md`. | Every primitive built, documented, keyboard-operable, AA-verified. **No page work before this closes.** |
| **4 — Content** | Write ~40 event descriptions. ~1,100 alt texts. Competition research (19.2). Verify parser output. 3–4 blog seeds. | All non-`[GAP]` content authored and reviewed. |
| **5 — Pages** | All routes (Section 7). Record axis. Contact sheet. Directory. Forms. SEO, OG images, JSON-LD. | Every page complete. Budgets (13) met. A11y (14) passed. |
| **6 — Handover & launch** | Keystatic. `CONTENT_GUIDE`, `HANDOVER`, ADRs. Manual PII review incl. poster images. Cross-browser and real-device testing. Lighthouse. Launch. | Someone non-technical adds an event unaided. All budgets green. |

Team NUVOLA (7.11) and any unresolved `[GAP]` items are held to Phase 6 and excluded from the nav until content exists.

---

## 19. Open questions

Eleven items. **1–4 block specific pages; 9–11 are governance decisions for the ExCom, not for me.** Everything else in Phases 1–3 can proceed in parallel.

| # | Question | Blocks | Severity |
| --- | --- | --- | --- |
| 1 | Do rosters or portraits exist for the **1st, 2nd, and 6th** committees? If not, may we state the gap explicitly? | Previous ExCom | High |
| 2 | **Competition results.** For each of Robocon 2005/2008, IRC 2012–15, iARC 2014/15, NASA Lunabotics 2013, URC 2016, ERC 2015 and the six national contests — full event name, host, and **placement**. Needs alumni outreach; the Panasonic Award 2005 is the only result currently evidenced. | Competition, Achievements | **Blocking** |
| 3 | Rover team name — **Interplanetar** (2017 seminar copy) or **Interplaneters** (filenames)? | Competition, Achievements | Medium |
| 4 | **Team NUVOLA** — what is it? Rover, humanoid, competition team? Roster, specification, results, photographs. One unrenderable HEIC is all that exists. | Team NUVOLA | **Blocking** |
| 5 | Partner/sponsor **logo vectors** and permission to display. Meghna Group and Transcom confirmed as prior sponsors. | Partners, Home | Medium |
| 6 | **Founding year.** Is BRS's founding 2005, or does Robocon 2005 predate the society's formal establishment? | Home, About copy | Medium |
| 7 | **Forms** — keep Google Forms (familiar, zero-maintenance, breaks the visual continuity) or native forms via Cloudflare Workers + Turnstile (premium feel, small maintenance burden)? Recommendation: native for Contact and Join Us; Google Forms retained for event registration. | Join Us, Contact | Medium |
| 8 | **Domain.** Is there an existing domain or a BUET subdomain available? Note the 3rd ExCom had a Webmaster role — does a prior site or archive exist? | Deploy | Medium |
| 9 | **Member Directory scope** — should ~470 identifiable current students and alumni be publicly searchable by name, department, and batch? A committee page and a searchable directory are materially different privacy propositions. | Member Directory | **ExCom decision** |
| 10 | **Photograph consent** — is there consent for publishing identifiable photographs of members and alumni, particularly pre-2018 sets? | Gallery, all events | **ExCom decision** |
| 11 | **Minors in photography** — Robotics Olympiad is explicitly for school and college students. Are there consent provisions for images of minors? | Robo Carnival, Gallery | **ExCom decision** |

---

## Appendix A — Verified archive metrics

```
Total size                     2.0 GB
Files                          1,231
Images                         1,105  (1,780 MB)
  jpg/JPG                        872
  png                            199
  heic/HEIC                       34   ← unrenderable in browsers
  jpeg                             8
Text files                       102
Markdown (rosters)                 7
PDF                                7
Non-web sources                    8   (.ai ×3, .eps, .docx ×2, .zip ×2, .lnk, .ARW)
Directories                      127

Largest single file            Booth 2.eps — 105 MB
Largest photograph             DSC00556.JPG — 10.5 MB
Largest photo set              Robo Carnival 2019 — 52 photographs
Curated selects                best 20/ — 116  ·  Best of the bests/ — 7
Committees documented          7 of 10  (3rd–5th, 7th–10th)
Roster rows                    ~470, all with phone numbers
Portraits                      ~430, 3 naming conventions, 6 dimension standards
Web-ready copy                 26 files
Raw promotional copy           76 files
```

## Appendix B — Verified facts for content use

- **Moderator:** Prof. Dr. Shaikh Anowarul Fattah, Professor, Department of EEE — consistent across all seven rosters
- **Email:** `buet.robotics.society@gmail.com`
- **Facebook:** `facebook.com/BUETRoboticsSociety`
- **10th ExCom President:** Sudipto Sarkar Joy, EEE '20
- **Teams (10th):** Project & Competition · Workshop · Design · Event Management · Membership Development · Media & Outreach
- **Robo Carnival 2024:** presented by Meghna Group of Industries; theme "Innovative Robotics for Future Bangladesh"; 01–02 Feb 2024, BUET premises; six segments
- **Intra-BUET 2024:** powered by Transcom Ltd; theme "Engineering the Future: Building Tomorrow's Solutions Today"; 28–29 Nov 2024; three segments
- **Rover lineage:** Team Interplanetar — ERC 2015, URC 2016; 2017 seminar facilitated by Khaled Bin Moinuddin, EEE '10, team lead
- **Confirmed award:** Panasonic Award, ABU Robocon 2005 — the only placement currently evidenced in the archive
- **Brand palette (measured):** `#0E516E` 33.2% · `#FFFFFF` 30.9% · `#7B1223` 17.9% · `#3A3A3C` 14.3%

---

*Sections 2, 5, 6 and 17 require sign-off before Phase 1. Items 2, 4, and 9–11 in Section 19 require answers from the Executive Committee.*
