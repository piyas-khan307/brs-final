-- ══════════════════════════════════════════════════════════════════════
-- 0005 — Stable editorial keys on collection items.
--
-- WHY THIS EXISTS
-- 0004 gave collections an ORDER. Phase B4 then found that order is not
-- enough, because the page does not only iterate a collection — it also
-- reaches into one by name:
--
--   const hero    = FEATURES["hero-rc19"];
--   const compete = FEATURES["compete-robocon05"];
--
-- With position as the only identity, an editor dragging an item in the
-- CMS would silently swap which photograph is the hero of the site. The
-- page would still build, still validate, and be wrong — the worst
-- possible failure mode, because nothing reports it.
--
-- A key makes the reference explicit: reordering changes the sequence,
-- and only renaming a key can change what "the hero" means. Renaming is
-- then a visible, deliberate act rather than a side effect of a drag.
--
-- Not a global identifier: unique WITHIN a collection. The same
-- photograph legitimately appears in several collections under different
-- keys, because a key names a ROLE ("the hero"), not a picture.
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE collection_items ADD COLUMN IF NOT EXISTS key text;

-- Backfill before enforcing. Existing rows are ordered, so position is a
-- defensible provisional key — the seed immediately overwrites these with
-- the real authored handles.
UPDATE collection_items SET key = 'item-' || sort_order WHERE key IS NULL;

ALTER TABLE collection_items ALTER COLUMN key SET NOT NULL;

ALTER TABLE collection_items ADD CONSTRAINT collection_item_key_shape
  CHECK (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

ALTER TABLE collection_items ADD CONSTRAINT collection_item_key_unique
  UNIQUE (collection_id, key);

COMMENT ON COLUMN collection_items.key IS
  'Stable editorial handle, unique within the collection. Names a ROLE '
  '("hero-rc19"), not a picture — pages reference items by this, so '
  'reordering cannot silently change which photograph is the hero. 0005.';

INSERT INTO schema_migrations (version) VALUES ('0005_collection_item_keys')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
