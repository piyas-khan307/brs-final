-- ══════════════════════════════════════════════════════════════════════
-- 0003 — Add 4:3 to the permitted aspect ratios.
--
-- WHY THIS EXISTS
-- Phase B2 loaded the first real photographs into `assets` and nine of
-- them were refused:
--
--   as-rc16a as-rc16b as-rc17a as-rc17b as-rc23a
--   as-rc23b as-ri24  as-agm24 as-intra24        all 640×480
--
-- 640×480 is exactly 4:3, and `assets_ratio_check` did not list it.
--
-- ── WHY WIDENING THE LIST IS THE RIGHT FIX, NOT A WEAKENING ──
-- The constraint exists because arbitrary ratios are a design-system
-- violation (PROJECT_SPEC.md §5.6) — a page where every image is its own
-- shape has no grid. That argument is about a SMALL FIXED SET, not about
-- which four members it has.
--
-- 4:3 is not an arbitrary ratio. It is the native output of every compact
-- camera and phone that photographed this archive before about 2015, and
-- scripts/prepare-showcase.mjs has been emitting `ratio: "4:3"` into
-- showcase.generated.ts since the motion sheet was built. The design
-- system already renders it. The enum simply never learned about it.
--
-- So this aligns the constraint with a decision the design had already
-- made, rather than relaxing a rule to admit messy data.
--
-- ── WHAT IS DELIBERATELY *NOT* FIXED HERE ──
-- Three press-clipping scans (press-iarc14, and its two siblings) carry
-- `ratio: null` in plates.generated.ts, because a newspaper cutting has
-- no design frame — it is whatever shape the cutting is. `assets.ratio`
-- is NOT NULL and `ImageDTO.ratio` is required, so those three cannot be
-- loaded without a modelling decision:
--
--   (a) make ratio nullable, meaning "intrinsic, no design frame"; or
--   (b) crop the scans to a listed ratio, which destroys evidence; or
--   (c) add a fifth ratio that happens to fit them.
--
-- That decision belongs to whoever owns the contract, not to a migration
-- run in passing. Their bytes are in the bucket; their rows are not.
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_ratio_check;

ALTER TABLE assets ADD CONSTRAINT assets_ratio_check CHECK (
  ratio IN ('1:1', '4:3', '3:2', '16:9', '4:5')
);

COMMENT ON CONSTRAINT assets_ratio_check ON assets IS
  'Fixed crop ratios. Mirrors AspectRatio in packages/contract. '
  'A closed set is the point; which members it has is a design decision. '
  'See the 0003 migration header for why 4:3 was added.';

INSERT INTO schema_migrations (version) VALUES ('0003_allow_four_three_ratio')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
