-- ══════════════════════════════════════════════════════════════════════
-- 0008 — Blog posts get a review state and an owner.
--
--   posts.review_state   draft → submitted → approved | changes_requested
--   posts.created_by     the account that wrote it
--
-- ── WHY ──
-- The club wants two kinds of account: an Administrator who can do
-- everything, and a Member who can write a blog post and nothing else —
-- and a Member's post must be APPROVED BY AN ADMINISTRATOR BEFORE IT GOES
-- LIVE. `posts.published` is a boolean and cannot express the middle
-- state; there is no way to say "written, waiting to be read" as opposed
-- to "still being drafted".
--
-- ── WHY THE RULE IS A CHECK CONSTRAINT AND NOT JUST A PERMISSION ──
-- Directus permissions would enforce this perfectly well for anyone using
-- Directus. They would not enforce it for a Flow, a bulk import, a psql
-- session, or whatever tool replaces Directus in three years. "A post
-- cannot be published unless a human approved it" is a rule about the
-- club's editorial standards, not about one CMS's UI, so it lives with
-- the data. Directus enforcement is then the convenient layer on top,
-- not the only layer.
--
-- ── ON created_by, AND WHY IT IS NOT A FOREIGN KEY ──
-- Directus needs a column to compare against $CURRENT_USER so a Member
-- can edit their own drafts and nobody else's. That value is a
-- directus_users id. A real FK to directus_users would make Plane 1
-- depend on Plane 2 — the schema is the source of truth and Directus is a
-- UI over it, never the other way round (§7.1). So this is a plain uuid:
-- meaningful to Directus, opaque and harmless to everything else, and it
-- survives Directus being replaced.
--
-- `author_name` remains the byline. It is what gets PUBLISHED; created_by
-- is who typed it. They are usually the same person and are allowed to
-- differ — an officer posting on behalf of a team, for instance.
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE posts
  ADD COLUMN review_state text NOT NULL DEFAULT 'draft',
  ADD COLUMN created_by   uuid,
  ADD COLUMN reviewed_by  uuid,
  ADD COLUMN reviewed_at  timestamptz,
  -- Why an Administrator sent it back. Shown to the author, so it must be
  -- allowed to be long; a one-word rejection helps nobody.
  ADD COLUMN review_note  text;

ALTER TABLE posts
  ADD CONSTRAINT posts_review_state_check
  CHECK (review_state IN ('draft', 'submitted', 'approved', 'changes_requested'));

-- The rule the club actually asked for, stated once, in the one place
-- every writer must pass through.
ALTER TABLE posts
  ADD CONSTRAINT posts_publish_needs_approval
  CHECK (published = false OR review_state = 'approved');

-- An approval is a person and a moment or it is not an approval. Without
-- this, `review_state` could read 'approved' with nobody accountable for
-- it, which is exactly the kind of unattributed claim §8 exists to stop.
ALTER TABLE posts
  ADD CONSTRAINT posts_approval_needs_attribution
  CHECK (review_state <> 'approved' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL));

-- Everything already in the table was written by an administrator through
-- a seed script, so it is approved by definition — but it must still name
-- who and when, and the honest answer is the migration itself.
UPDATE posts
   SET review_state = 'approved',
       reviewed_at  = now(),
       reviewed_by  = '00000000-0000-0000-0000-000000000000'
 WHERE published;

COMMENT ON COLUMN posts.review_state IS
  'draft → submitted → approved | changes_requested. A post cannot be '
  'published unless this reads approved — enforced by '
  'posts_publish_needs_approval, not merely by Directus. See migration 0008.';
COMMENT ON COLUMN posts.created_by IS
  'The account that wrote this, as a Directus user id. Deliberately NOT a '
  'foreign key: the schema does not depend on the CMS. See migration 0008.';
COMMENT ON COLUMN posts.reviewed_by IS
  'The Administrator who approved or returned this. '
  'All-zeros means "approved by migration 0008", i.e. seeded before review '
  'existed.';

CREATE INDEX posts_review_state_idx ON posts (review_state);

INSERT INTO schema_migrations (version) VALUES ('0008_post_review_workflow')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
