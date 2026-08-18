-- ══════════════════════════════════════════════════════════════════════
-- TWO KINDS OF EVENT THE ENUM DID NOT HAVE.
--
-- `event_category` was written from the project plan, before anyone had
-- read the archive. The archive has eight `member recruitment` folders
-- and five `orientation programs` folders — thirteen real events, none of
-- which is a workshop, a seminar or a competition.
--
-- The alternative was to file them under `seminar`, which is the failure
-- mode this whole schema exists to avoid: a category that is nearly right
-- becomes a page that quietly says something untrue, and nobody ever
-- corrects it because nothing is obviously broken.
--
-- ADD VALUE, never rename or drop. Renaming an enum value rewrites every
-- row that used it, and Postgres cannot do it inside a transaction that
-- also inserts rows using the new name.
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TYPE event_category ADD VALUE IF NOT EXISTS 'recruitment';
ALTER TYPE event_category ADD VALUE IF NOT EXISTS 'orientation';

INSERT INTO schema_migrations (version)
  VALUES ('0011_event_categories_the_club_actually_runs')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
