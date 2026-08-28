# ADR 0004 — The event write-up runs the content column, not the prose measure

**Status** Accepted · **Date** 17 August 2026 · **Overrides** `PROJECT_SPEC.md`
§5.2 (prose measure) and the §17.5 entry "line lengths beyond 72ch", for the
event write-up only

## Context

`PROJECT_SPEC.md` §5.2 sets the prose measure at 62–72ch with a hard cap of
72ch, and §17.5 lists line lengths beyond that cap as a visual-craft failure.
The event page honoured this: the write-up was `max-w-prose`, ~625px, centred
in a 1200px content column.

Two things made that untenable in use rather than in principle.

**The admin editor and the published page could not both be right.** The
description editor sits in a column of full-width form fields — a title input,
a cover-photograph picker. Sized to the article's 72ch it was ~670px in an
~1100px form and read as broken next to the box directly above it; sized to the
form it stopped matching the page it was writing. Four shapes were built and
looked at (a full-width panel with a narrow column inside it, a tray with a
page-sheet on it, the box shrunk to 72ch, and full width); the note in
`globals.css` above `.adm-editor` records all four and why each was discarded.

**The page contradicted itself.** The cover frame, the Segments table and the
facts grid are all `max-w-content`. Only the write-up was narrow, so the one
element a reader is actually there to read was the one threaded between wider
things.

The client, shown the trade-off explicitly — the spec text, the failure-list
entry, and the resulting ~115-character line — chose the wide column.

## Decision

The event write-up is `max-w-content` (1200px), matching every other section of
its own page, and the admin editor fills its form column. The sibling
paragraphs on that page — the "no write-up on file" line and the provenance
note — move with it, because a 625px paragraph under a 1200px article is the
same inconsistency in miniature.

`--container-prose` is **unchanged at 72ch**, and so is every other surface
that uses it. This override is scoped to one page's body copy. It was
deliberately not made by widening the token, which would have moved the
committee pages, the landing copy and the admin panel's own hint text with it.

## Consequences

- **Line length on `/events/[slug]` is ~115ch at desktop**, against a spec cap
  of 72. This is a real readability cost and it is the accepted one. Anyone
  reversing this decision should change the two `max-w-content` values on the
  write-up back to `max-w-prose` and expect the admin editor question to
  reopen immediately.
- **Editor and page agree to within ~8%** (an ~1100px form column against a
  1200px content column) rather than the 76% they differed by before, so a
  picture set to 40% while writing lands close to 40% of the same visual width
  when published.
- **Nothing else on the site moved.** `.prose` still caps at 72ch everywhere
  it is used; blog bodies, when they land, inherit the compliant measure unless
  someone repeats this decision for them explicitly.
- **`PROJECT_SPEC.md` §5.2 is no longer literally true of the built site.** It
  is left as written, with this ADR as the exception, following the pattern of
  ADR 0001 superseding §11 rather than editing the spec after the fact.
