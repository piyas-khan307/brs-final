-- ══════════════════════════════════════════════════════════════════════
-- 0006 — Committees become three levels deep, all admin-created.
--
--   11th Executive Committee            committees
--   ├── Standing Committee              committee_groups
--   │   ├── President                   committee_sections
--   │   │   └── Ahmed Reza Junaid       memberships → members
--   │   ├── Vice President
--   │   └── Treasurer
--   └── Design Team
--       └── Deputy Secretary
--           └── Faiaz Abdullah Bin Bashir
--
-- WHY
-- The old shape was two levels: committee → committee_teams → members,
-- with the role carried as a free-text `designation` on the membership.
-- That cannot express what the club actually publishes. Its own 11th
-- Executive Committee announcement posters carry three facts per person —
-- name, designation, and (sometimes) team — and a two-level model has to
-- flatten one of them away.
--
-- Both new levels are ROWS, not enums. An administrator can create an
-- "Advisory Panel" group with a "Joint Secretary" section inside it
-- without a migration, which is the entire point: committee structure
-- changes every year and a schema change per year is not a plan.
--
-- ── SAFETY ──
-- This migration REFUSES TO RUN if any memberships or committee_teams
-- rows exist, rather than silently dropping them. Right now both are
-- empty, so this is free; on a populated database it stops and demands a
-- data-migration plan. A destructive migration that runs quietly is how
-- an archive loses records.
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

DO $$
DECLARE
  n_memberships integer;
  n_teams       integer;
BEGIN
  SELECT count(*) INTO n_memberships FROM memberships;
  SELECT count(*) INTO n_teams       FROM committee_teams;

  IF n_memberships > 0 OR n_teams > 0 THEN
    RAISE EXCEPTION
      'Refusing to restructure: % membership row(s) and % team row(s) exist. '
      'This migration replaces committee_teams with committee_groups + '
      'committee_sections and would discard them. Write a data migration first.',
      n_memberships, n_teams;
  END IF;
END $$;

-- ── Level 2: groups ──────────────────────────────────────────────────
-- "Standing Committee", "General Committee", "Design Team".
CREATE TABLE committee_groups (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id uuid NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
  name         text NOT NULL,
  -- Optional one-line description shown above the group on the page.
  note         text,
  sort_order   integer NOT NULL DEFAULT 0,
  CONSTRAINT group_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT group_unique_per_committee UNIQUE (committee_id, name)
);

-- ── Level 3: sections ────────────────────────────────────────────────
-- "President", "Vice President", "Treasurer", "Deputy Secretary".
CREATE TABLE committee_sections (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid NOT NULL REFERENCES committee_groups(id) ON DELETE CASCADE,
  name       text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT section_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT section_unique_per_group UNIQUE (group_id, name)
);

-- ── Memberships hang off sections ────────────────────────────────────
-- Verified empty above, so this is a replacement rather than a migration.
DROP TABLE IF EXISTS committee_teams CASCADE;

ALTER TABLE memberships DROP COLUMN IF EXISTS team_id;

ALTER TABLE memberships
  ADD COLUMN section_id uuid REFERENCES committee_sections(id) ON DELETE SET NULL;

-- `designation` stays. It is NOT redundant with the section name: the
-- section is a heading on the page ("Deputy Secretary"), while the
-- designation is what this individual's own record says. They agree in
-- the common case and diverge for people holding a titled role inside a
-- team — which the club's own posters do show.
COMMENT ON COLUMN memberships.designation IS
  'This person''s title. The section name is the page heading they appear '
  'under; the two usually match and are allowed to differ.';

CREATE INDEX committee_groups_ordered_idx   ON committee_groups   (committee_id, sort_order);
CREATE INDEX committee_sections_ordered_idx ON committee_sections (group_id, sort_order);
CREATE INDEX memberships_section_idx        ON memberships        (section_id, sort_order);

COMMENT ON TABLE committee_groups IS
  'Second level of a committee — "Standing Committee", "Design Team". '
  'Admin-created rows, never an enum. See migration 0006.';
COMMENT ON TABLE committee_sections IS
  'Third level — "President", "Treasurer". Holds one or many people.';

INSERT INTO schema_migrations (version) VALUES ('0006_committee_groups_and_sections')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
