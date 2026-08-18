-- ══════════════════════════════════════════════════════════════════════
-- CATEGORIES BECOME DATA, AND GAIN A SECOND LEVEL.
--
-- `events.category` is a Postgres ENUM. Migration 0011 already had to
-- widen it once, after reading the archive and finding eight recruitment
-- drives and five orientation programmes that were none of the eight
-- values then available — and widening an enum means a migration, a
-- contract change, a deploy, and a developer. The club cannot file an
-- event under something the club thought of.
--
-- So categories move out of the type system and into a table the admin
-- panel can write to.
--
-- ── TWO LEVELS, AND NOT THREE ──
-- The brief is "under a category there might be one or multiple
-- subcategory". Two levels covers Workshop → Basic Workshop, Competition
-- → Line Following. Three would be a taxonomy, and a taxonomy nobody
-- maintains becomes a list of near-duplicates within a year — this
-- archive already has nineteen events called some version of "Basic
-- Workshop". The depth limit is enforced by a trigger below rather than
-- by everyone remembering, because a CHECK cannot see another row.
--
-- ── NOTHING IS CONVERTED AND NOTHING IS DROPPED ──
-- The ten enum values are seeded as top-level categories, every existing
-- event is pointed at the matching row, and `events.category` KEEPS its
-- value. Two reasons: the column is what /v1/events has always served,
-- so nothing breaks between this migration and the deploy that reads the
-- new column; and if this design turns out to be wrong, the enum is
-- still the truth and nothing has been lost.
--
-- The enum column does lose NOT NULL, because an event filed under a
-- category the club invents next year has no enum value to put there.
--
-- ── AFTER THIS RUNS, RUN `pnpm --filter @brs/cms configure` ──
-- This is the first migration since Phase B to add a TABLE, and Directus
-- will not serve a table it has no `directus_collections` row for: the
-- items endpoint answers 403 "or it does not exist" to an Administrator,
-- and clearing the schema cache does not help. So the admin panel's
-- category box hangs on "Loading the categories…" until the CMS
-- configuration is applied. It is idempotent and takes a second.
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS event_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- RESTRICT, not CASCADE: deleting "Workshop" must not silently take
  -- its four subcategories and every event filed under them.
  parent_id   uuid REFERENCES event_categories(id) ON DELETE RESTRICT,
  name        text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 60),
  slug        text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- The order the club wants them listed in, not alphabetical: "Workshop"
  -- before "AGM" is a statement about what the club does.
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT category_is_not_its_own_parent CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE INDEX IF NOT EXISTS event_categories_parent ON event_categories(parent_id);

/* A subcategory's parent must be a TOP-LEVEL category. This is the rule
   a CHECK cannot express, because it depends on another row. */
CREATE OR REPLACE FUNCTION event_categories_two_levels() RETURNS trigger AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL
     AND (SELECT parent_id FROM event_categories WHERE id = NEW.parent_id) IS NOT NULL THEN
    RAISE EXCEPTION
      'Categories are two levels deep. "%" is already a subcategory, so nothing can be filed under it.',
      (SELECT name FROM event_categories WHERE id = NEW.parent_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS event_categories_depth ON event_categories;
CREATE TRIGGER event_categories_depth
  BEFORE INSERT OR UPDATE ON event_categories
  FOR EACH ROW EXECUTE FUNCTION event_categories_two_levels();

/* The ten values the enum already carries, in the order the club runs
   them rather than alphabetically. Names match what the admin panel has
   been showing for these all along. */
INSERT INTO event_categories (name, slug, sort_order) VALUES
  ('Workshop',           'workshop',      10),
  ('Competition',        'competition',   20),
  ('Robo Carnival',      'robo-carnival', 30),
  ('Intra-BUET',         'intra-buet',    40),
  ('Seminar',            'seminar',       50),
  ('Reception',          'reception',     60),
  ('AGM',                'agm',           70),
  ('Co-organised',       'co-organised',  80),
  ('Member recruitment', 'recruitment',   90),
  ('Orientation',        'orientation',  100)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES event_categories(id) ON DELETE RESTRICT;

-- Every existing event already has an enum value, and every enum value
-- now has a row, so this leaves nothing unfiled.
UPDATE events e
   SET category_id = c.id
  FROM event_categories c
 WHERE c.slug = e.category::text
   AND e.category_id IS NULL;

CREATE INDEX IF NOT EXISTS events_category_id ON events(category_id);

-- Now that every row has one, require it. An event with no category is
-- an event the feed cannot file.
ALTER TABLE events ALTER COLUMN category_id SET NOT NULL;

-- And release the enum, so a category invented next year is writable.
ALTER TABLE events ALTER COLUMN category DROP NOT NULL;

INSERT INTO schema_migrations (version) VALUES ('0015_categories_the_club_can_add_to')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
