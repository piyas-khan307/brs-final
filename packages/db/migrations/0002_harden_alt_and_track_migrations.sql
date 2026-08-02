-- ══════════════════════════════════════════════════════════════════════
-- 0002 — Harden assets.alt, and start tracking migrations.
--
-- WHY THIS EXISTS
-- Phase B1 ran the schema against a live Postgres for the first time and
-- fired deliberately malformed inserts at it. Three were ACCEPTED that
-- should not have been:
--
--   'IMG_6738.JPG'        a filename. Exactly 12 characters, so the
--                         original `length(btrim(alt)) >= 12` passed it.
--   'photo photo photo'   placeholder prose.
--   'robot photograph'    two words; not a description of anything.
--
-- The Zod validator in packages/contract already rejects all three — it
-- was strengthened in Phase 0 after 'IMG_6738.JPG' slipped through a
-- min(12) check there too. The database constraint was never brought in
-- line, which left a real hole: rows can arrive through Directus, through
-- psql, or through any future service that does not import our schemas.
-- A rule enforced only in TypeScript is a convention, not a constraint.
--
-- This migration makes the database agree with the contract.
--
-- VERIFIED BEFORE APPLYING: all 42 alt strings currently in
-- plates.generated.ts and showcase.generated.ts were tested against the
-- new predicate. Zero would be rejected. This tightens the rule without
-- invalidating a single piece of real content.
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Migration tracking ───────────────────────────────────────────────
-- docker-entrypoint-initdb.d only runs on the FIRST boot of an empty
-- volume, so it cannot tell us what has been applied to a long-lived
-- database. Without this table, "which migrations has production had?"
-- is answered by guesswork.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     text PRIMARY KEY,
  applied_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO schema_migrations (version) VALUES ('0001_init')
  ON CONFLICT (version) DO NOTHING;

-- ── assets.alt ───────────────────────────────────────────────────────
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_alt_check;

ALTER TABLE assets ADD CONSTRAINT assets_alt_check CHECK (
  -- Length floor and ceiling. 280 mirrors AltText in the contract.
  length(btrim(alt)) BETWEEN 12 AND 280

  -- Not a filename. This is the one the length check could not catch:
  -- 'IMG_6738.JPG' is exactly 12 characters.
  AND btrim(alt) !~* '\.(jpe?g|png|webp|avif|heic|gif|tiff?)$'

  -- Not placeholder prose. \y is a word boundary, so this rejects
  -- 'photo of the arena' but permits 'photographic evidence of …'.
  AND btrim(alt) !~* '^(photo|image|picture|img|untitled|thumbnail|dsc|screenshot)\y'

  -- At least three words. Two words name a subject; they do not
  -- describe a frame to somebody who cannot see it.
  AND array_length(regexp_split_to_array(btrim(alt), '\s+'), 1) >= 3
);

COMMENT ON CONSTRAINT assets_alt_check ON assets IS
  'Mirrors AltText in packages/contract. Rejects empty, filename-shaped, '
  'placeholder, and under-three-word alt text. See 0002 migration header.';

INSERT INTO schema_migrations (version) VALUES ('0002_harden_alt_and_track_migrations')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
