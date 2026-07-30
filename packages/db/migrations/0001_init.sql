-- ══════════════════════════════════════════════════════════════════════
-- BRS — initial schema
-- implementation_plan.md §8. Plane 1: PostgreSQL is the SOURCE OF TRUTH.
--
-- Directus reads this schema; it does not define it. That inversion is the
-- whole architecture: the CMS is a UI over our data, not the owner of it.
-- Replacing Directus later means replacing a UI, not re-modelling content
-- (§1.2, §6.2, risk 10).
--
-- PRIVACY (§12.1 control 1): `members` has NO contact column. The ~470
-- phone numbers in the source rosters have nowhere to land. This is the
-- strongest of the five layered controls because it removes the
-- possibility rather than policing it.
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Assets ────────────────────────────────────────────────────────────
-- Provenance is first-class: 1,105 archive files plus future SharePoint
-- and Drive imports all need to be traceable to where they came from.

CREATE TYPE asset_source AS ENUM ('upload', 'sharepoint', 'drive', 'archive');

CREATE TABLE assets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key   text        NOT NULL,
  provider      text        NOT NULL DEFAULT 'r2',
  mime          text        NOT NULL,
  width         integer     NOT NULL CHECK (width  > 0),
  height        integer     NOT NULL CHECK (height > 0),

  -- Alt text enforced at the DATABASE level, not by reviewer diligence.
  -- ~1,105 images need real alt text; this keeps the debt visible rather
  -- than silently skipped (§9.2, §15 risk 6). The >= 12 floor mirrors the
  -- contract's AltText schema, which additionally rejects filename-shaped
  -- strings — "IMG_6738.JPG" is exactly 12 characters.
  alt           text        NOT NULL CHECK (length(btrim(alt)) >= 12),

  lqip          text        NOT NULL,
  ratio         text        NOT NULL CHECK (ratio IN ('1:1','3:2','16:9','4:5')),
  credit        text,
  source        asset_source NOT NULL DEFAULT 'upload',
  source_ref    text,
  -- Deduplication. The archive already contains byte-identical duplicates:
  -- IMG_6738.JPG and brs/lfr.JPG are both exactly 8,679,826 bytes.
  checksum      text        NOT NULL,
  -- Synced files land unpublished until an editor supplies alt text (§9.3).
  published     boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assets_checksum_unique UNIQUE (checksum)
);

CREATE TABLE asset_derivatives (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id    uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  width       integer NOT NULL CHECK (width > 0),
  format      text    NOT NULL CHECK (format IN ('avif','webp')),
  storage_key text    NOT NULL,
  bytes       integer NOT NULL CHECK (bytes > 0),
  CONSTRAINT derivative_unique UNIQUE (asset_id, width, format)
);

-- ── Governance ────────────────────────────────────────────────────────

CREATE TABLE moderators (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  title      text NOT NULL,
  department text NOT NULL
);

CREATE TABLE committees (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 3..10 documented. The 1st, 2nd and 6th are absent from the archive;
  -- the gap is stated on the site, not concealed (§16.1).
  ordinal     integer NOT NULL UNIQUE CHECK (ordinal > 0),
  label       text    NOT NULL,
  term_start  integer NOT NULL,
  term_end    integer NOT NULL,
  moderator_id uuid REFERENCES moderators(id),
  is_current  boolean NOT NULL DEFAULT false,
  CONSTRAINT term_ordered CHECK (term_end >= term_start)
);

-- Only one committee may be current.
CREATE UNIQUE INDEX one_current_committee
  ON committees ((is_current)) WHERE is_current;

CREATE TABLE committee_teams (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id uuid NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
  name         text NOT NULL,
  sort_order   integer NOT NULL DEFAULT 0,
  CONSTRAINT team_unique_per_committee UNIQUE (committee_id, name)
);

-- ── People ────────────────────────────────────────────────────────────

CREATE TABLE members (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  department        text NOT NULL,
  -- Club convention with a typographic apostrophe: "EEE '20" (U+2019).
  batch             text NOT NULL,
  portrait_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()

  -- ⚠ DO NOT ADD A CONTACT / PHONE / MOBILE COLUMN.
  -- ~470 students' mobile numbers sit in the source roster files. This
  -- table is where a careless import would put them. Their absence here
  -- is control 1 of 5 (§12.1). If a contact route is genuinely needed,
  -- use an official club address — never a personal number.
);

-- A join table, not a column on `members`: people serve on several
-- committees across years. The archive shows exactly this — Aasfee
-- Mosharraf Bhuiya appears in both the 9th and 10th. Denormalising here
-- would corrupt the alumni record (§8).
CREATE TABLE memberships (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  committee_id uuid NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
  team_id      uuid REFERENCES committee_teams(id) ON DELETE SET NULL,
  designation  text NOT NULL,
  sort_order   integer NOT NULL DEFAULT 0,
  CONSTRAINT membership_unique UNIQUE (member_id, committee_id, designation)
);

-- ── Events ────────────────────────────────────────────────────────────

CREATE TYPE event_category AS ENUM (
  'workshop','competition','robo-carnival','intra-buet',
  'seminar','reception','agm','co-organised'
);

CREATE TYPE copy_source AS ENUM ('web-ready','derived','authored');

CREATE TABLE events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           text NOT NULL UNIQUE,
  title          text NOT NULL,
  category       event_category NOT NULL,
  series         text,
  edition        text,
  start_date     date NOT NULL,
  end_date       date,
  venue          text,
  platform       text,
  theme          text,
  presented_by   text,
  eligibility    text,
  body           text NOT NULL DEFAULT '',
  body_format    text NOT NULL DEFAULT 'md' CHECK (body_format IN ('md','html')),
  -- Tracks whether copy is publishable prose or still derived from a
  -- Facebook promo, so provenance stays visible (§10.1).
  copy_source    copy_source NOT NULL DEFAULT 'derived',
  external_album text,
  featured       boolean NOT NULL DEFAULT false,
  published      boolean NOT NULL DEFAULT false,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dates_ordered CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE event_segments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text NOT NULL,
  eligibility text,
  sort_order  integer NOT NULL DEFAULT 0
);

CREATE TABLE event_assets (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  -- Museum placard number (§5.9.1).
  plate_no integer,
  role     text NOT NULL CHECK (role IN ('cover','gallery')),
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT event_asset_unique UNIQUE (event_id, asset_id, role)
);

CREATE UNIQUE INDEX one_cover_per_event
  ON event_assets (event_id) WHERE role = 'cover';

-- ── Achievements ──────────────────────────────────────────────────────

CREATE TYPE achievement_track AS ENUM ('international','national','hosted');

CREATE TABLE achievements (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year             integer NOT NULL,
  programme        text NOT NULL,
  host             text,
  team_name        text,
  -- NULL means "participated, result unknown" — never "no award".
  result           text,
  track            achievement_track NOT NULL,
  related_event_id uuid REFERENCES events(id) ON DELETE SET NULL,

  -- Defaults FALSE and nothing renders as a placement until a human sets
  -- it true. Fabricated results are structurally impossible (§17.4).
  -- At time of writing the Panasonic Award (ABU Robocon 2005) is the ONLY
  -- placement evidenced anywhere in the 2 GB archive (§16.2).
  verified         boolean NOT NULL DEFAULT false,
  verified_by      text,
  verified_at      timestamptz,

  CONSTRAINT verified_needs_attribution
    CHECK (NOT verified OR (verified_by IS NOT NULL AND verified_at IS NOT NULL)),
  -- A stated result must be attributable. Prevents "1st place" appearing
  -- with nobody's name against it.
  CONSTRAINT result_needs_verification
    CHECK (result IS NULL OR verified)
);

CREATE TABLE achievement_assets (
  achievement_id uuid NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  asset_id       uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  PRIMARY KEY (achievement_id, asset_id)
);

-- ── Projects (Team NUVOLA) ────────────────────────────────────────────

CREATE TABLE projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  name          text NOT NULL,
  -- Real club designation, never invented (§5.9.6, §16.4).
  specimen_code text,
  mission       text NOT NULL,
  subsystems    jsonb NOT NULL DEFAULT '[]'::jsonb,
  published     boolean NOT NULL DEFAULT false
);

-- ── Editorial ─────────────────────────────────────────────────────────

CREATE TABLE posts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text NOT NULL UNIQUE,
  title            text NOT NULL,
  excerpt          text NOT NULL,
  body             text NOT NULL,
  body_format      text NOT NULL DEFAULT 'md' CHECK (body_format IN ('md','html')),
  author_member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  author_name      text NOT NULL,
  cover_asset_id   uuid REFERENCES assets(id) ON DELETE SET NULL,
  tags             text[] NOT NULL DEFAULT '{}',
  published_at     timestamptz,
  published        boolean NOT NULL DEFAULT false
);

CREATE TABLE partners (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  tier           text NOT NULL CHECK (tier IN ('presenting','powered-by','partner','co-organiser')),
  logo_asset_id  uuid REFERENCES assets(id) ON DELETE SET NULL,
  years          integer[] NOT NULL DEFAULT '{}',
  url            text
);

CREATE TABLE press (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet           text NOT NULL,
  headline         text,
  published_on     date NOT NULL,
  scan_asset_id    uuid NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  related_event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  url              text
);

-- ── Redirects ─────────────────────────────────────────────────────────
-- The IA will change. Cool URIs do not.

CREATE TABLE redirects (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path text NOT NULL UNIQUE,
  to_path   text NOT NULL,
  permanent boolean NOT NULL DEFAULT true
);

-- ── Indexes ───────────────────────────────────────────────────────────

CREATE INDEX events_category_idx      ON events (category, start_date DESC);
CREATE INDEX events_published_idx     ON events (published, start_date DESC);
CREATE INDEX events_series_idx        ON events (series) WHERE series IS NOT NULL;
CREATE INDEX memberships_committee_idx ON memberships (committee_id, sort_order);
CREATE INDEX memberships_member_idx    ON memberships (member_id);
CREATE INDEX achievements_year_idx     ON achievements (year DESC, track);
CREATE INDEX assets_source_idx         ON assets (source, published);
CREATE INDEX posts_published_idx       ON posts (published, published_at DESC);

COMMIT;
