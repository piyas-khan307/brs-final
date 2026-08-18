-- ══════════════════════════════════════════════════════════════════════
-- A COVER PHOTOGRAPH IS ONE FACT, SO IT LIVES IN ONE COLUMN.
--
-- Until now an event's cover was recorded twice: as `events.cover_asset_id`
-- (added by 0012, alongside the same column on `posts`) and as an
-- `event_assets` row with role = 'cover' (from 0001). Nothing kept the two
-- in step except load-event-photos.mjs happening to write both, and the
-- API read only the second.
--
-- That went unnoticed while one script was the only writer. It stops being
-- survivable the moment a human can choose a cover in the admin panel: the
-- panel sets the column, the site reads the row, and the editor watches
-- their choice do nothing. A control that always fails is worse than no
-- control.
--
-- ── WHY THE COLUMN WON ──
--   · it is a foreign key, so ONE cover per event is true by construction
--     rather than by a partial unique index defending against a shape the
--     table otherwise permits
--   · ON DELETE SET NULL — deleting a photograph must not delete the
--     account of the event it was taken at. The join row cascades
--   · `posts` already works this way, and an editor should not have to
--     learn that events keep their cover somewhere else
--
-- `event_assets` keeps its real job: the gallery, in order. After this it
-- holds gallery rows only, which is also what the API has always read from
-- it.
--
-- NOTHING IS LOST. Every cover row's asset is copied to the column first,
-- and the backfill runs before the delete in the same transaction.
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Anything recorded only as a role row becomes the column. COALESCE
--    rather than an overwrite: where both exist and disagree, the column
--    is the newer statement and wins.
UPDATE events e
   SET cover_asset_id = ea.asset_id
  FROM event_assets ea
 WHERE ea.event_id = e.id
   AND ea.role = 'cover'
   AND e.cover_asset_id IS NULL;

-- 2. The role rows are now redundant. Deleting them removes the second
--    place the fact could be written, which is the entire point — leaving
--    them as "history" would leave the ambiguity too.
DELETE FROM event_assets WHERE role = 'cover';

-- 3. The index existed to stop a second cover row. There are no cover rows.
DROP INDEX IF EXISTS one_cover_per_event;

-- 4. And the role can no longer be written. Without this the next script
--    somebody writes re-creates the problem, and it will look correct
--    because the old column still accepts the value.
ALTER TABLE event_assets DROP CONSTRAINT IF EXISTS event_assets_role_check;
ALTER TABLE event_assets
  ADD CONSTRAINT event_assets_role_check CHECK (role = 'gallery');

INSERT INTO schema_migrations (version) VALUES ('0013_one_place_for_the_cover')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
