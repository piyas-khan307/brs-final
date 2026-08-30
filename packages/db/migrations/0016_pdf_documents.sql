-- ══════════════════════════════════════════════════════════════════════
-- PDF DOCUMENTS.
--
-- A parallel table to `assets`, not a widening of it. `assets` carries a
-- CHECK (width > 0, height > 0) and a ratio CHECK against five design
-- ratios — both meaningless for a PDF, and NULLing them out on every PDF
-- row would turn those constraints into decoration. A second table keeps
-- both sets of constraints honest.
--
-- Mirrors `event_assets` for attachment, for the same reason `assets`
-- and `event_assets` are already split: which files exist is one
-- question, which of them a given event has attached is another.
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key   text        NOT NULL,
  provider      text        NOT NULL DEFAULT 'r2',
  mime          text        NOT NULL DEFAULT 'application/pdf'
                              CHECK (mime = 'application/pdf'),
  bytes         integer     NOT NULL CHECK (bytes > 0),

  -- Same floor as `assets.alt`, for the same reason: a title enforced at
  -- the database level rather than by reviewer diligence. "1.pdf" is
  -- exactly five characters and does not clear it.
  title         text        NOT NULL CHECK (length(btrim(title)) >= 12),

  credit        text,
  source        asset_source NOT NULL DEFAULT 'upload',
  source_ref    text,
  checksum      text        NOT NULL,
  published     boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT documents_checksum_unique UNIQUE (checksum)
);

CREATE TABLE event_documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  sort_order  integer NOT NULL DEFAULT 0,
  CONSTRAINT event_document_unique UNIQUE (event_id, document_id)
);

COMMIT;
