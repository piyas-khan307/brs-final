-- ══════════════════════════════════════════════════════════════════════
-- AN EVENT THAT HAPPENED ON A DAY NOBODY WROTE DOWN.
--
-- `events.start_date` was NOT NULL. The archive does not support that.
--
-- Of 69 entries in BRS/, most are a folder with a year in its name and a
-- description that never states a date: "Basic Workshop V3.0", "intra_22",
-- "member recruitment/2019". The club knows roughly when these happened
-- and did not record when precisely, which is completely normal for a
-- student society's own files.
--
-- NOT NULL leaves exactly three options, and two of them are lies:
--
--   1. invent a date — 1 January of the folder's year is a fact this
--      project would be asserting on the club's behalf and would be
--      wrong for nearly every entry
--   2. drop the event — nineteen workshops disappear because the day
--      they started was never typed anywhere
--   3. record that the date is not known
--
-- This is the same argument as migration 0007 for members.department and
-- committees.term_start, and it gets the same answer. A page can say
-- "2022" or say nothing; it must never say "1 January 2022" because a
-- column demanded a value.
--
-- `dates_ordered` still holds: it is written as (end_date IS NULL OR
-- end_date >= start_date), and in SQL a comparison against a NULL
-- start_date is UNKNOWN, which a CHECK constraint accepts. An end date
-- without a start date is therefore permitted — and that is right, since
-- it is no more contradictory than either alone.
--
-- The year, when it is the only thing known, belongs in `edition`
-- ("2022"), which is text and already exists for exactly this purpose.
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE events ALTER COLUMN start_date DROP NOT NULL;

-- Order without a date is otherwise arbitrary, and an archive that
-- reshuffles itself between builds is not an archive. Undated events sort
-- last, then by edition text, then by title — all three stable.
CREATE INDEX IF NOT EXISTS events_chronology
  ON events (start_date DESC NULLS LAST, edition DESC NULLS LAST, title);

INSERT INTO schema_migrations (version) VALUES ('0010_events_without_a_date')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
