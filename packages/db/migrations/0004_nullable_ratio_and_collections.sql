-- ══════════════════════════════════════════════════════════════════════
-- 0004 — Two changes, both forced by Phase B4 (the frontend swap).
--
--   1. assets.ratio becomes NULLABLE.
--   2. collections / collection_items — the editorial layer.
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Nullable ratio ────────────────────────────────────────────────
--
-- Three press-clipping scans could not be loaded in B2 because
-- `assets.ratio` is NOT NULL and a newspaper cutting has no design frame.
-- Its shape is whatever the cutting is: 360×593, 360×303, 360×410.
--
-- The three options were: make ratio nullable, crop the scans to fit, or
-- add a ratio that happens to match. Cropping a clipping to fit a grid
-- destroys evidence in a press archive, and no single new ratio fits all
-- three. So NULL now carries a precise meaning:
--
--   ratio IS NOT NULL  → a composed photograph, cropped to a design frame
--   ratio IS NULL      → intrinsic size, no design frame. A scan of a
--                        physical artefact, reproduced as it exists.
--
-- Note the CHECK does not need changing: a CHECK passes when it evaluates
-- to NULL, and `NULL IN (...)` is NULL, not false. Dropping NOT NULL is
-- sufficient — but the constraint is restated below so the intent is
-- readable rather than a subtlety of three-valued logic.
ALTER TABLE assets ALTER COLUMN ratio DROP NOT NULL;

ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_ratio_check;
ALTER TABLE assets ADD CONSTRAINT assets_ratio_check CHECK (
  ratio IS NULL OR ratio IN ('1:1', '4:3', '3:2', '16:9', '4:5')
);

COMMENT ON COLUMN assets.ratio IS
  'Design crop frame, or NULL for "intrinsic size, no frame" — a scan of a '
  'physical artefact reproduced as it exists. See migration 0004.';

-- ── 2. The editorial layer ───────────────────────────────────────────
--
-- WHY THIS EXISTS. Phase B4 set out to move the landing page off local
-- files and onto the API, and found that only half the data could move.
-- The photographs themselves were already in Postgres after B2 — but the
-- CURATION was not, and curation is the part an editor actually needs to
-- change:
--
--   · which photographs appear in which section
--   · what order they appear in
--   · the placard caption under each one     (26 of them)
--   · the museum plate number                (26 of them)
--   · titles, years and notes                (5 of each)
--
-- All of that was hand-written inside plates.generated.ts and
-- showcase.generated.ts — files whose headers say "do not edit by hand".
-- Leaving it there would have meant the landing page could only be
-- rearranged by a developer editing a generated file and redeploying,
-- which is the exact failure the CMS exists to prevent.
--
-- A collection is deliberately NOT an event. Events are things that
-- happened on a date; a collection is a curated sequence chosen for a
-- page. The landing page's "contact sheet" is not an event, and forcing
-- it to be one would have meant inventing an event that never occurred
-- purely to hang captions off — a fabrication (§8).

CREATE TABLE collections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  label       text NOT NULL,
  -- Free-text, not an enum: new sections are an editorial act, and needing
  -- a migration to add one would defeat the purpose of the table.
  note        text,
  sort_order  integer NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT collections_slug_shape CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE collection_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  asset_id      uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  sort_order    integer NOT NULL DEFAULT 0,

  -- Museum placard number (§5.9.1). On the item, not on the asset: the
  -- same photograph can be plate 7 in one sequence and plate 2 in
  -- another, because a plate number describes a POSITION IN A SEQUENCE,
  -- not a property of the picture. Thirteen of the 38 landing-page items
  -- are already the same photograph appearing in two collections.
  plate_no      integer CHECK (plate_no IS NULL OR plate_no > 0),

  -- The placard text. An array because a caption is set as separate
  -- lines — subject, then place and date — and joining them into one
  -- string would throw away the line breaks the design depends on.
  caption       text[] NOT NULL DEFAULT '{}',

  title         text,
  year          integer CHECK (year IS NULL OR (year BETWEEN 1990 AND 2100)),
  note          text,

  CONSTRAINT collection_item_unique UNIQUE (collection_id, asset_id)
);

CREATE INDEX collection_items_ordered_idx
  ON collection_items (collection_id, sort_order);

COMMENT ON TABLE collections IS
  'Curated sequences for pages. NOT events — an event happened on a date; '
  'a collection is a chosen order. See migration 0004.';

INSERT INTO schema_migrations (version) VALUES ('0004_nullable_ratio_and_collections')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
