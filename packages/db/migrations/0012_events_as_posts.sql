-- ══════════════════════════════════════════════════════════════════════
-- AN EVENT IS SOMETHING SOMEBODY WROTE ABOUT.
--
-- Club direction: the events section should work "like Blogger". Read
-- carefully, that is a statement about two things:
--
--   READING   an event is an article — cover photograph, title, date,
--             prose with pictures in it — and the index is a feed, not a
--             filterable catalogue.
--   WRITING   a committee member should get a title, a picture, a box to
--             type in and a Publish button. Not fourteen labelled fields.
--
-- The second half is the one that decides whether this survives the annual
-- handover, and it is the reason for this migration. `posts` already has
-- exactly these four columns and a working editor built on them; `events`
-- had none of them, so recording an event meant filling in a form and
-- recording a blog entry meant writing. Same club, same act, two
-- completely different experiences.
--
-- ── WHY EVENTS ARE NOT SIMPLY MERGED INTO posts ──
-- It was the obvious move and it is wrong. The club runs SERIES:
-- nineteen Basic Workshops, five Robo Carnivals, eight recruitment
-- drives. A flat blog feed cannot say "the 5th Robo Carnival" or list
-- every workshop in order, and `event_segments` — the six separate
-- contests inside one carnival, each with its own eligibility — has no
-- equivalent in a post at all.
--
-- So events keep their structure and gain a post's surface. Structure is
-- very hard to add back once discarded; a surface is not.
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

-- The feed needs a sentence that is not the first sentence of the body.
-- Nullable: a photo-only entry has nothing to excerpt, and inventing one
-- from the title would just print the title twice.
ALTER TABLE events ADD COLUMN IF NOT EXISTS excerpt text;

-- The one image that represents the event. ON DELETE SET NULL rather than
-- CASCADE: deleting a photograph must never delete the account of the
-- event it was taken at.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS cover_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL;

-- A name, not a foreign key to members. Same reasoning as posts: the
-- person who writes up an event may have graduated, may never have been
-- a committee member, and must not vanish from their own byline because
-- a membership row was tidied up. Nullable — the archive entries were
-- written by nobody in particular.
ALTER TABLE events ADD COLUMN IF NOT EXISTS author_name text;

-- When it went public, which is NOT when it happened. An event from 2016
-- written up in 2026 is dated 2016 in the archive and appears at the top
-- of the feed on the day it is published.
ALTER TABLE events ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Published means published ON a date. Without this, `published = true`
-- with a null timestamp sorts unpredictably in a reverse-chronological
-- feed, which is the one thing a feed has to get right.
ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_published_needs_a_date;
ALTER TABLE events
  ADD CONSTRAINT events_published_needs_a_date
  CHECK (published = false OR published_at IS NOT NULL);

-- An excerpt is a hook, not an abstract. The cap is enforced here because
-- a 900-character "excerpt" silently breaks every card in the feed, and
-- the feed is not where you want to discover that.
ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_excerpt_length;
ALTER TABLE events
  ADD CONSTRAINT events_excerpt_length
  CHECK (excerpt IS NULL OR char_length(excerpt) BETWEEN 20 AND 320);

-- The feed's own ordering.
CREATE INDEX IF NOT EXISTS events_feed
  ON events (published_at DESC NULLS LAST)
  WHERE published = true;

INSERT INTO schema_migrations (version) VALUES ('0012_events_as_posts')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
