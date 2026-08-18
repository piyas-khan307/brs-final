-- ══════════════════════════════════════════════════════════════════════
-- 0009 — Add category and is_featured columns to assets table
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE assets ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'archive';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

INSERT INTO schema_migrations (version) VALUES ('0009_asset_category_and_featured')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
