-- ══════════════════════════════════════════════════════════════════════
-- 0007 — Four columns stop demanding facts the sources do not carry.
--
--   members.department      NOT NULL → NULL
--   members.batch           NOT NULL → NULL
--   committees.term_start   NOT NULL → NULL
--   committees.term_end     NOT NULL → NULL
--
-- ── WHY ──
-- The 11th Executive Committee is the first real roster to be loaded, and
-- it exposed the problem. The club's own announcement posters carry three
-- facts per person and no more: name, designation, and (sometimes) team.
-- No department. No batch. No term years anywhere on any of the 84.
--
-- NOT NULL on those columns therefore does not enforce accuracy — it
-- FORCES INVENTION. The only ways to satisfy it are to guess someone's
-- department, or to write a placeholder like 'Unknown' / '' / 0 that is
-- indistinguishable from real data three years from now. Both put a
-- fabricated fact next to a real person's name, which is the one failure
-- mode this archive exists to avoid (§8).
--
-- NULL says "not recorded". That is a true statement, it is queryable
-- (`WHERE department IS NULL` is the to-do list), and it cannot be
-- mistaken for evidence. The constraint was protecting a shape, not a
-- fact; the fact is protected by keeping the gap visible.
--
-- ── WHAT THIS DOES NOT RELAX ──
-- `members.name` stays NOT NULL — a person with no name is not a record.
-- `assets.alt` keeps its hardened CHECK. Term years become optional to
-- STORE, not optional to KNOW: they are still wanted for the 11th and the
-- diagnostics count below makes the omission visible rather than quiet.
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE members ALTER COLUMN department DROP NOT NULL;
ALTER TABLE members ALTER COLUMN batch      DROP NOT NULL;

COMMENT ON COLUMN members.department IS
  'NULL means not recorded, never "none". The 11th ExCom posters carry no '
  'department, so guessing one was the alternative. See migration 0007.';
COMMENT ON COLUMN members.batch IS
  'Club convention with a typographic apostrophe: "EEE ''20" (U+2019). '
  'NULL means not recorded. See migration 0007.';

ALTER TABLE committees ALTER COLUMN term_start DROP NOT NULL;
ALTER TABLE committees ALTER COLUMN term_end   DROP NOT NULL;

-- Both or neither. A half-recorded term ("2024–?") reads as a committee
-- that never ended, and `term_ordered` cannot catch it because a CHECK
-- involving NULL evaluates to NULL and passes.
ALTER TABLE committees
  ADD CONSTRAINT term_both_or_neither
  CHECK ((term_start IS NULL) = (term_end IS NULL));

COMMENT ON COLUMN committees.term_start IS
  'NULL means the term years are not recorded. Not zero, not the year the '
  'row was created. See migration 0007.';

INSERT INTO schema_migrations (version) VALUES ('0007_unknown_is_not_absent')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
