/**
 * ══════════════════════════════════════════════════════════════════════
 * THE ONLY SQL-AWARE FILE IN THE REPOSITORY.
 *
 * Every column name, join, junction table and enum value lives here and is
 * translated into the stable DTOs from @brs/contract. Nothing above this
 * module may know that Postgres exists; nothing below it may know that a
 * contract exists.
 *
 * ── WHY POSTGRES DIRECTLY, AND NOT THROUGH DIRECTUS ──
 * This file replaces src/adapters/directus.ts, which was deleted. That
 * file described itself as "the only CMS-aware file in the repository" and
 * the intent behind it was right — but the implementation put Directus in
 * the read path, which the architecture explicitly does not want:
 *
 *   Plane 1 (Postgres) is the SOURCE OF TRUTH. Directus is Plane 2: a UI
 *   over our schema, which "reads this schema; it does not define it"
 *   (0001_init.sql header). Routing reads back out through the CMS would
 *   have made a UI a runtime dependency of content delivery — so a
 *   Directus outage, upgrade, or licence change (risk 10) would stop
 *   builds.
 *
 * Reading Plane 1 directly makes the façade CMS-unaware entirely, which is
 * strictly stronger than the original claim. "If Directus is replaced,
 * rewrite one file" becomes "if Directus is replaced, delete one
 * container". Directus keeps its job — authoring — and loses a job it
 * should never have had.
 *
 * ── PRIVACY ──
 * `members` has no contact column, so no query here can select one. The
 * absence is enforced four layers down (§12.1 control 1) and this file
 * inherits it for free. Do not add a raw-row escape hatch.
 * ══════════════════════════════════════════════════════════════════════
 */

import pg from "pg";
import { publicUrlFor } from "@brs/storage/url";
import type {
  AchievementDTO,
  CommitteeDTO,
  EventDTO,
  ImageDTO,
  MemberDTO,
  PartnerDTO,
  PostDTO,
  PressDTO,
  ProjectDTO,
  StatsDTO,
} from "@brs/contract";

import { pool } from "../db.js";

/**
 * Keep DATE columns as 'YYYY-MM-DD' strings.
 *
 * By default node-postgres parses OID 1082 into a JavaScript Date at
 * midnight in the PROCESS's timezone. Serialising that back through
 * toISOString() then shifts it into UTC — so an event on 2024-05-01 in
 * Dhaka (UTC+6) is emitted as 2024-04-30. A date with no time attached
 * should never acquire one; IsoDate in the contract is a calendar date.
 */
pg.types.setTypeParser(1082, (v: string) => v);

/* ── Assets ───────────────────────────────────────────────────────────
 *
 * Loaded in bulk by id, never one at a time. Every DTO that embeds images
 * (events, members, press, partners…) collects its asset ids first and
 * resolves them in a single round trip — otherwise a 40-event page is 40
 * extra queries, and it is the kind of N+1 that only shows up once the
 * archive is fully loaded.
 */

type AssetRow = {
  id: string;
  storage_key: string;
  alt: string;
  width: number;
  height: number;
  lqip: string;
  ratio: ImageDTO["ratio"];
  credit: string | null;
  derivatives: { format: "avif" | "webp"; width: number; key: string }[];
};

const ASSET_SELECT = `
  SELECT a.id, a.storage_key, a.alt, a.width, a.height, a.lqip, a.ratio, a.credit,
         COALESCE(
           json_agg(
             json_build_object('format', d.format, 'width', d.width, 'key', d.storage_key)
             ORDER BY d.format, d.width
           ) FILTER (WHERE d.id IS NOT NULL),
           '[]'
         ) AS derivatives
  FROM assets a
  LEFT JOIN asset_derivatives d ON d.asset_id = a.id
`;

function toImage(row: AssetRow, plate?: number | null): ImageDTO {
  return {
    id: row.id,
    // The canonical rendition. Resolved through @brs/storage so this file
    // never learns a bucket hostname — swapping providers is still config.
    url: publicUrlFor(row.storage_key),
    alt: row.alt,
    width: row.width,
    height: row.height,
    lqip: row.lqip,
    ratio: row.ratio,
    ...(row.credit ? { credit: row.credit } : {}),
    ...(plate ? { plate } : {}),
    // Everything a <picture> needs. See ImageSource in the contract for
    // why this had to travel with the data rather than be a query string.
    sources: row.derivatives.map((d) => ({
      format: d.format,
      width: d.width,
      url: publicUrlFor(d.key),
    })),
  };
}

/** Resolve many asset ids at once. Returns a Map so callers can look up
 *  by id without caring about ordering or about missing rows. */
async function loadAssets(ids: (string | null | undefined)[]): Promise<Map<string, ImageDTO>> {
  const wanted = [...new Set(ids.filter((v): v is string => Boolean(v)))];
  if (wanted.length === 0) return new Map();

  const { rows } = await pool.query<AssetRow>(
    `${ASSET_SELECT} WHERE a.id = ANY($1::uuid[]) AND a.published GROUP BY a.id`,
    [wanted],
  );
  return new Map(rows.map((r) => [r.id, toImage(r)]));
}

/* ── Pagination ───────────────────────────────────────────────────────
 *
 * Offset-based, behind an opaque cursor.
 *
 * Keyset pagination is the textbook answer and it is the wrong tool here:
 * these are small, stable, historical collections — a few hundred events
 * across twenty-one years — read almost entirely by a build process that
 * walks every page once. Offset's weakness is drift under concurrent
 * writes on large tables, which is not a situation this data is ever in.
 *
 * The cursor is opaque so that switching to keyset later is not a
 * breaking change: no client is allowed to construct or interpret one.
 */

const PAGE_DEFAULT = 24;
const PAGE_MAX = 100;

function decodeCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  const n = Number.parseInt(Buffer.from(cursor, "base64url").toString("utf8"), 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), "utf8").toString("base64url");
}

function clampLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit)) return PAGE_DEFAULT;
  return Math.min(Math.max(Math.trunc(limit), 1), PAGE_MAX);
}

export type Page<T> = { data: T[]; nextCursor: string | null; total: number };

/** `limit` is deliberately not a parameter: the next offset is where this
 *  page actually ended, not where it was asked to end. Using the requested
 *  limit would skip rows whenever the query returned fewer than asked. */
function paginate<T>(data: T[], total: number, offset: number): Page<T> {
  const next = offset + data.length;
  return { data, nextCursor: next < total ? encodeCursor(next) : null, total };
}

/* ── Events ───────────────────────────────────────────────────────────── */

type EventRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  category_name: string;
  parent_slug: string | null;
  parent_name: string | null;
  series: string | null;
  edition: string | null;
  start_date: string;
  end_date: string | null;
  venue: string | null;
  platform: string | null;
  theme: string | null;
  presented_by: string | null;
  eligibility: string | null;
  body: string;
  body_format: "md" | "html" | "doc";
  copy_source: EventDTO["copySource"];
  external_album: string | null;
  featured: boolean;
  updated_at: Date;
  cover_asset_id: string | null;
};

export type EventQuery = {
  category?: string;
  year?: number;
  series?: string;
  featured?: boolean;
  limit?: number;
  cursor?: string;
};

/**
 * NOTE — events with no cover photograph are EXCLUDED.
 *
 * `EventDTO.cover` is required, so an event without one cannot be
 * represented. Rather than fabricate a placeholder (§8: never invent
 * content) or crash the route, they are filtered out and counted; the
 * count is exposed on /v1/health as `eventsWithoutCover` so the omission
 * is visible rather than silent.
 *
 * This is a contract question, not a bug: early committees genuinely have
 * events with no surviving photograph. Making `cover` optional is the
 * honest fix, but it changes a published field's type, so it needs a
 * decision rather than a quiet edit.
 *
 * ── WHERE THE COVER COMES FROM ──
 * `events.cover_asset_id`, and nowhere else. It used to be read from an
 * `event_assets` row with role = 'cover', which meant the same fact was
 * recorded in two places and kept in step only by the one script that
 * happened to write both. The admin editor sets the column, so a cover
 * chosen in the panel would never have reached the site. Migration 0013
 * retires the role and leaves the column as the single answer.
 */
export async function listEvents(q: EventQuery = {}): Promise<Page<EventDTO>> {
  const limit = clampLimit(q.limit);
  const offset = decodeCursor(q.cursor);

  const where: string[] = ["e.published", "e.cover_asset_id IS NOT NULL"];
  const params: unknown[] = [];
  const add = (clause: string, value: unknown) => {
    params.push(value);
    where.push(clause.replace("$?", `$${params.length}`));
  };

  /* Matches a subcategory by its own slug, and a top-level category by
     its slug OR by any of its children's — filtering the feed by
     "Workshop" has to include the events filed under "Basic Workshop",
     or the parent category appears to contain nothing. */
  if (q.category) {
    // Pushed once and referenced twice — `add` only substitutes the
    // first $?, and a second placeholder here would silently read the
    // NEXT filter's value.
    params.push(q.category);
    where.push(`(c.slug = $${params.length} OR p.slug = $${params.length})`);
  }
  if (q.series) add("e.series = $?", q.series);
  if (q.year) add("EXTRACT(YEAR FROM e.start_date) = $?", q.year);
  if (q.featured !== undefined) add("e.featured = $?", q.featured);

  const from = `
    FROM events e
    JOIN event_categories c ON c.id = e.category_id
    LEFT JOIN event_categories p ON p.id = c.parent_id
    WHERE ${where.join(" AND ")}
  `;

  const { rows: countRows } = await pool.query<{ total: string }>(
    `SELECT count(*)::text AS total ${from}`,
    params,
  );
  const total = Number(countRows[0]?.total ?? 0);

  const { rows } = await pool.query<EventRow>(
    `SELECT e.*, ${CATEGORY_COLUMNS} ${from}
     ORDER BY e.start_date DESC NULLS LAST, e.edition DESC NULLS LAST, e.slug
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );

  const events = await hydrateEvents(rows);
  return paginate(events, total, offset);
}

export async function eventBySlug(slug: string): Promise<EventDTO | null> {
  const { rows } = await pool.query<EventRow>(
    `SELECT e.*, ${CATEGORY_COLUMNS}
     FROM events e
     JOIN event_categories c ON c.id = e.category_id
     LEFT JOIN event_categories p ON p.id = c.parent_id
     WHERE e.slug = $1 AND e.published`,
    [slug],
  );
  if (rows.length === 0) return null;
  const [event] = await hydrateEvents(rows);
  return event ?? null;
}

  const CATEGORY_COLUMNS = `
    c.slug AS category, c.name AS category_name,
    p.slug AS parent_slug, p.name AS parent_name`;

/** Segments, gallery and cover for a page of events, in three queries
 *  total rather than three per event. */
async function hydrateEvents(rows: EventRow[]): Promise<EventDTO[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [{ rows: segments }, { rows: gallery }] = await Promise.all([
    pool.query<{ event_id: string; name: string; description: string; eligibility: string | null }>(
      `SELECT event_id, name, description, eligibility FROM event_segments
       WHERE event_id = ANY($1::uuid[]) ORDER BY sort_order, name`,
      [ids],
    ),
    /* The cover is excluded, so a photograph promoted to the top of the
       article does not also appear halfway down the contact sheet. Doing
       it here rather than by moving rows around means the admin panel can
       let somebody pick any attached photograph as the cover without
       having to keep two lists in agreement. */
    pool.query<{ event_id: string; asset_id: string; plate_no: number | null }>(
      `SELECT ea.event_id, ea.asset_id, ea.plate_no
         FROM event_assets ea
         JOIN events e ON e.id = ea.event_id
        WHERE ea.event_id = ANY($1::uuid[])
          AND ea.role = 'gallery'
          AND ea.asset_id IS DISTINCT FROM e.cover_asset_id
        ORDER BY ea.sort_order`,
      [ids],
    ),
  ]);

  const assets = await loadAssets([
    ...rows.map((r) => r.cover_asset_id),
    ...gallery.map((g) => g.asset_id),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return rows.flatMap((r): EventDTO[] => {
    const cover = r.cover_asset_id ? assets.get(r.cover_asset_id) : undefined;
    // Belt and braces: the SQL already excludes these, but an unpublished
    // cover asset would slip through the join and produce an invalid DTO.
    if (!cover) return [];

    const mySegments = segments
      .filter((s) => s.event_id === r.id)
      .map((s) => ({
        name: s.name,
        description: s.description,
        ...(s.eligibility ? { eligibility: s.eligibility } : {}),
      }));

    return [
      {
        slug: r.slug,
        title: r.title,
        category: r.category,
        categoryName: r.category_name,
        ...(r.parent_slug && r.parent_name
          ? { categoryParent: { slug: r.parent_slug, name: r.parent_name } }
          : {}),
        ...(r.series ? { series: r.series } : {}),
        ...(r.edition ? { edition: r.edition } : {}),
        dates: {
          // Omitted rather than null when unrecorded — see EventDTO.
          ...(r.start_date ? { start: r.start_date } : {}),
          ...(r.end_date ? { end: r.end_date } : {}),
        },
        ...(r.venue ? { venue: r.venue } : {}),
        ...(r.platform ? { platform: r.platform } : {}),
        ...(r.theme ? { theme: r.theme } : {}),
        ...(r.presented_by ? { presentedBy: r.presented_by } : {}),
        ...(r.eligibility ? { eligibility: r.eligibility } : {}),
        ...(mySegments.length ? { segments: mySegments } : {}),
        cover,
        gallery: gallery
          .filter((g) => g.event_id === r.id)
          .map((g) => assets.get(g.asset_id))
          .filter((img): img is ImageDTO => Boolean(img)),
        ...(r.external_album ? { externalAlbum: r.external_album } : {}),
        body: { format: r.body_format, content: r.body },
        copySource: r.copy_source,
        // Derived, never stored. A stored status is wrong the day after it
        // is written and nobody notices until an old event says "upcoming".
        // No date means it is in the archive, not in the diary. An
        // undated event is never "upcoming": that would put a workshop
        // from 2016 in a "what's on" list because nobody wrote the day
        // down.
        status: r.start_date && r.start_date > today ? "upcoming" : "past",
        featured: r.featured,
        updatedAt: r.updated_at.toISOString(),
      },
    ];
  });
}

/* ── Committees & members ─────────────────────────────────────────────── */

type MemberRow = {
  id: string;
  name: string;
  department: string | null;
  batch: string | null;
  portrait_asset_id: string | null;
  designation: string;
  committee_ordinal: number;
  section_name: string | null;
  section_order: number | null;
  group_name: string | null;
  group_note: string | null;
  group_order: number | null;
};

/* Three levels: memberships → sections → groups → committees. Written as
 * LEFT JOINs so a person recorded against a committee but not yet placed
 * in a section still appears, rather than silently vanishing from the
 * roster because somebody has not finished organising it. */
const MEMBER_SELECT = `
  SELECT m.id, m.name, m.department, m.batch, m.portrait_asset_id,
         ms.designation, c.ordinal AS committee_ordinal,
         sec.name AS section_name, sec.sort_order AS section_order,
         grp.name AS group_name, grp.note AS group_note, grp.sort_order AS group_order
  FROM memberships ms
  JOIN members m    ON m.id = ms.member_id
  JOIN committees c ON c.id = ms.committee_id
  LEFT JOIN committee_sections sec ON sec.id = ms.section_id
  LEFT JOIN committee_groups   grp ON grp.id = sec.group_id
`;

function toMember(r: MemberRow, portrait?: ImageDTO): MemberDTO {
  return {
    id: r.id,
    name: r.name,
    designation: r.designation,
    department: r.department,
    batch: r.batch,
    committeeOrdinal: r.committee_ordinal,
    ...(r.section_name ? { section: r.section_name } : {}),
    ...(r.group_name ? { group: r.group_name } : {}),
    ...(portrait ? { portrait } : {}),
    // There is no contact field to omit. See the file header.
  };
}

export async function listCommittees(opts: { current?: boolean; ordinal?: number } = {}): Promise<
  CommitteeDTO[]
> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.current) where.push("c.is_current");
  if (opts.ordinal !== undefined) {
    params.push(opts.ordinal);
    where.push(`c.ordinal = $${params.length}`);
  }

  const { rows: committees } = await pool.query<{
    id: string;
    ordinal: number;
    label: string;
    term_start: number | null;
    term_end: number | null;
    is_current: boolean;
    mod_name: string | null;
    mod_title: string | null;
    mod_department: string | null;
  }>(
    `SELECT c.id, c.ordinal, c.label, c.term_start, c.term_end, c.is_current,
            mo.name AS mod_name, mo.title AS mod_title, mo.department AS mod_department
     FROM committees c
     LEFT JOIN moderators mo ON mo.id = c.moderator_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY c.ordinal DESC`,
    params,
  );
  if (committees.length === 0) return [];

  const ordinals = committees.map((c) => c.ordinal);
  const { rows: members } = await pool.query<MemberRow>(
    `${MEMBER_SELECT} WHERE c.ordinal = ANY($1::int[])
     ORDER BY grp.sort_order NULLS LAST, sec.sort_order NULLS LAST, ms.sort_order, m.name`,
    [ordinals],
  );

  const portraits = await loadAssets(members.map((m) => m.portrait_asset_id));

  return committees.map((c) => {
    const mine = members.filter((m) => m.committee_ordinal === c.ordinal);

    // Fold the flat rows back into two levels of nesting. The SQL already
    // ordered them, so insertion order into these Maps IS the display
    // order — no re-sorting here, and therefore no chance of the API
    // disagreeing with what an editor arranged.
    //
    // Members with no section land under an unnamed group and section.
    // Older committees are genuinely recorded that way: they predate the
    // structure entirely, and dropping them to keep the shape tidy would
    // lose real people from the archive.
    const groups = new Map<string, { note?: string; sections: Map<string, MemberDTO[]> }>();
    for (const m of mine) {
      const gKey = m.group_name ?? "";
      const sKey = m.section_name ?? "";
      let g = groups.get(gKey);
      if (!g) {
        g = { ...(m.group_note ? { note: m.group_note } : {}), sections: new Map() };
        groups.set(gKey, g);
      }
      if (!g.sections.has(sKey)) g.sections.set(sKey, []);
      g.sections.get(sKey)!.push(
        toMember(m, m.portrait_asset_id ? portraits.get(m.portrait_asset_id) : undefined),
      );
    }

    return {
      ordinal: c.ordinal,
      label: c.label,
      termStart: c.term_start,
      termEnd: c.term_end,
      moderator: {
        // A committee with no moderator on file is recorded as unknown, not
        // as somebody plausible. §8.
        name: c.mod_name ?? "Not recorded",
        title: c.mod_title ?? "",
        department: c.mod_department ?? "",
      },
      groups: [...groups].map(([name, g]) => ({
        name,
        ...(g.note ? { note: g.note } : {}),
        sections: [...g.sections].map(([sName, members]) => ({ name: sName, members })),
      })),
      isCurrent: c.is_current,
    };
  });
}

export type MemberQuery = {
  committee?: number;
  section?: string;
  department?: string;
  batch?: string;
  q?: string;
  limit?: number;
  cursor?: string;
};

export async function listMembers(q: MemberQuery = {}): Promise<Page<MemberDTO>> {
  const limit = clampLimit(q.limit);
  const offset = decodeCursor(q.cursor);

  const where: string[] = [];
  const params: unknown[] = [];
  const add = (clause: string, value: unknown) => {
    params.push(value);
    where.push(clause.replace("$?", `$${params.length}`));
  };

  if (q.committee !== undefined) add("c.ordinal = $?", q.committee);
  if (q.section) add("sec.name = $?", q.section);
  if (q.department) add("m.department = $?", q.department);
  if (q.batch) add("m.batch = $?", q.batch);
  // Name search only. There is nothing else on a member worth searching,
  // and there is deliberately nothing sensitive to match against.
  if (q.q) add("m.name ILIKE '%' || $? || '%'", q.q);

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const { rows: countRows } = await pool.query<{ total: string }>(
    `SELECT count(*)::text AS total
     FROM memberships ms
     JOIN members m    ON m.id = ms.member_id
     JOIN committees c ON c.id = ms.committee_id
     LEFT JOIN committee_sections sec ON sec.id = ms.section_id
     LEFT JOIN committee_groups   grp ON grp.id = sec.group_id
     ${clause}`,
    params,
  );
  const total = Number(countRows[0]?.total ?? 0);

  const { rows } = await pool.query<MemberRow>(
    `${MEMBER_SELECT} ${clause}
     ORDER BY c.ordinal DESC, grp.sort_order NULLS LAST, sec.sort_order NULLS LAST, ms.sort_order, m.name
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );

  const portraits = await loadAssets(rows.map((r) => r.portrait_asset_id));
  const data = rows.map((r) =>
    toMember(r, r.portrait_asset_id ? portraits.get(r.portrait_asset_id) : undefined),
  );

  return paginate(data, total, offset);
}

/* ── Achievements ─────────────────────────────────────────────────────── */

export async function listAchievements(
  q: { track?: string; from?: number; to?: number } = {},
): Promise<AchievementDTO[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (clause: string, value: unknown) => {
    params.push(value);
    where.push(clause.replace("$?", `$${params.length}`));
  };

  if (q.track) add("a.track = $?::achievement_track", q.track);
  if (q.from !== undefined) add("a.year >= $?", q.from);
  if (q.to !== undefined) add("a.year <= $?", q.to);

  const { rows } = await pool.query<{
    id: string;
    year: number;
    programme: string;
    host: string | null;
    team_name: string | null;
    result: string | null;
    track: AchievementDTO["track"];
    verified: boolean;
    related_slug: string | null;
    evidence_ids: string[];
  }>(
    `SELECT a.id, a.year, a.programme, a.host, a.team_name, a.result, a.track, a.verified,
            e.slug AS related_slug,
            COALESCE(array_agg(aa.asset_id) FILTER (WHERE aa.asset_id IS NOT NULL), '{}') AS evidence_ids
     FROM achievements a
     LEFT JOIN events e ON e.id = a.related_event_id
     LEFT JOIN achievement_assets aa ON aa.achievement_id = a.id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     GROUP BY a.id, e.slug
     ORDER BY a.year DESC, a.programme`,
    params,
  );

  const assets = await loadAssets(rows.flatMap((r) => r.evidence_ids));

  return rows.map((r) => ({
    id: r.id,
    year: r.year,
    programme: r.programme,
    ...(r.host ? { host: r.host } : {}),
    ...(r.team_name ? { teamName: r.team_name } : {}),
    // Passed through as null, never coerced to "—" or "Participated".
    // Null means "competed, outcome unconfirmed"; the DB CHECK
    // result_needs_verification guarantees a non-null result is verified.
    result: r.result,
    track: r.track,
    ...(r.related_slug ? { relatedEventSlug: r.related_slug } : {}),
    evidence: r.evidence_ids
      .map((id) => assets.get(id))
      .filter((img): img is ImageDTO => Boolean(img)),
    verified: r.verified,
  }));
}

/* ── Projects ─────────────────────────────────────────────────────────── */

export async function projectBySlug(slug: string): Promise<ProjectDTO | null> {
  const { rows } = await pool.query<{
    id: string;
    slug: string;
    name: string;
    specimen_code: string | null;
    mission: string;
    subsystems: { name: string; detail: string }[];
  }>(
    `SELECT id, slug, name, specimen_code, mission, subsystems
     FROM projects WHERE slug = $1 AND published`,
    [slug],
  );
  const p = rows[0];
  if (!p) return null;

  return {
    slug: p.slug,
    name: p.name,
    ...(p.specimen_code ? { specimenCode: p.specimen_code } : {}),
    mission: p.mission,
    subsystems: p.subsystems ?? [],
    // Project team and gallery have no join tables in 0001_init. They are
    // returned empty rather than guessed at; when the NUVOLA content
    // arrives (§4) the schema gains the joins and this fills in.
    team: [],
    gallery: [],
    achievements: [],
  };
}

/* ── Editorial ────────────────────────────────────────────────────────── */

/** Words per minute for the reading estimate. 200 is the conventional
 *  figure for adult reading of non-technical prose. Stored nowhere —
 *  computed, so it can never disagree with the body it describes. */
const WPM = 200;

export async function listPosts(
  q: { tag?: string; limit?: number; cursor?: string } = {},
): Promise<Page<PostDTO>> {
  const limit = clampLimit(q.limit);
  const offset = decodeCursor(q.cursor);

  const where = ["p.published", "p.published_at IS NOT NULL"];
  const params: unknown[] = [];
  if (q.tag) {
    params.push(q.tag);
    where.push(`$${params.length} = ANY(p.tags)`);
  }
  const clause = `WHERE ${where.join(" AND ")}`;

  const { rows: countRows } = await pool.query<{ total: string }>(
    `SELECT count(*)::text AS total FROM posts p ${clause}`,
    params,
  );
  const total = Number(countRows[0]?.total ?? 0);

  const { rows } = await pool.query<PostRow>(
    `${POST_SELECT} ${clause}
     ORDER BY p.published_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );

  return paginate(await hydratePosts(rows), total, offset);
}

export async function postBySlug(slug: string): Promise<PostDTO | null> {
  const { rows } = await pool.query<PostRow>(
    `${POST_SELECT} WHERE p.slug = $1 AND p.published AND p.published_at IS NOT NULL`,
    [slug],
  );
  const [post] = await hydratePosts(rows);
  return post ?? null;
}

type PostRow = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  body_format: "md" | "html" | "doc";
  author_name: string;
  author_batch: string | null;
  cover_asset_id: string | null;
  tags: string[];
  published_at: Date;
};

const POST_SELECT = `
  SELECT p.slug, p.title, p.excerpt, p.body, p.body_format, p.author_name,
         m.batch AS author_batch, p.cover_asset_id, p.tags, p.published_at
  FROM posts p
  LEFT JOIN members m ON m.id = p.author_member_id
`;

async function hydratePosts(rows: PostRow[]): Promise<PostDTO[]> {
  if (rows.length === 0) return [];
  const covers = await loadAssets(rows.map((r) => r.cover_asset_id));

  return rows.map((r) => {
    const words = r.body.trim().split(/\s+/).filter(Boolean).length;
    const cover = r.cover_asset_id ? covers.get(r.cover_asset_id) : undefined;
    return {
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      body: { format: r.body_format, content: r.body },
      author: {
        name: r.author_name,
        ...(r.author_batch ? { batch: r.author_batch } : {}),
      },
      publishedAt: r.published_at.toISOString(),
      tags: r.tags ?? [],
      ...(cover ? { cover } : {}),
      // At least 1 — the DTO requires a positive integer, and a 40-word
      // note is not a zero-minute read.
      readingMinutes: Math.max(1, Math.round(words / WPM)),
    };
  });
}

export async function listPartners(): Promise<PartnerDTO[]> {
  const { rows } = await pool.query<{
    id: string;
    name: string;
    tier: PartnerDTO["tier"];
    logo_asset_id: string | null;
    years: number[];
    url: string | null;
  }>(`SELECT id, name, tier, logo_asset_id, years, url FROM partners ORDER BY name`);

  const logos = await loadAssets(rows.map((r) => r.logo_asset_id));

  return rows.map((r) => {
    const logo = r.logo_asset_id ? logos.get(r.logo_asset_id) : undefined;
    return {
      id: r.id,
      name: r.name,
      tier: r.tier,
      ...(logo ? { logo } : {}),
      years: r.years ?? [],
      ...(r.url ? { url: r.url } : {}),
    };
  });
}

export async function listPress(): Promise<PressDTO[]> {
  const { rows } = await pool.query<{
    id: string;
    outlet: string;
    headline: string | null;
    published_on: string;
    scan_asset_id: string;
    related_slug: string | null;
    url: string | null;
  }>(
    `SELECT pr.id, pr.outlet, pr.headline, pr.published_on, pr.scan_asset_id,
            e.slug AS related_slug, pr.url
     FROM press pr
     LEFT JOIN events e ON e.id = pr.related_event_id
     ORDER BY pr.published_on DESC`,
  );

  const scans = await loadAssets(rows.map((r) => r.scan_asset_id));

  // A press item whose scan is unpublished cannot be rendered — PressDTO
  // requires the scan. Dropped rather than emitted broken.
  return rows.flatMap((r): PressDTO[] => {
    const scan = scans.get(r.scan_asset_id);
    if (!scan) return [];
    return [
      {
        id: r.id,
        outlet: r.outlet,
        ...(r.headline ? { headline: r.headline } : {}),
        publishedOn: r.published_on,
        scan,
        ...(r.related_slug ? { relatedEventSlug: r.related_slug } : {}),
        ...(r.url ? { url: r.url } : {}),
      },
    ];
  });
}

/* ── Gallery ──────────────────────────────────────────────────────────── */

export async function listGallery(
  q: { event?: string; year?: number; limit?: number; cursor?: string } = {},
): Promise<Page<ImageDTO>> {
  const limit = clampLimit(q.limit);
  const offset = decodeCursor(q.cursor);

  const where = ["a.published"];
  const params: unknown[] = [];
  const joins: string[] = [];

  if (q.event) {
    params.push(q.event);
    joins.push(`JOIN event_assets ea ON ea.asset_id = a.id
                JOIN events ev ON ev.id = ea.event_id AND ev.slug = $${params.length}`);
  }
  if (q.year) {
    params.push(q.year);
    // Only meaningful for assets attached to an event; a bare archive
    // photograph has no year of its own until someone records one.
    joins.push(`JOIN event_assets ey ON ey.asset_id = a.id
                JOIN events ey2 ON ey2.id = ey.event_id
                                AND EXTRACT(YEAR FROM ey2.start_date) = $${params.length}`);
  }

  const from = `FROM assets a ${joins.join(" ")} WHERE ${where.join(" AND ")}`;

  const { rows: countRows } = await pool.query<{ total: string }>(
    `SELECT count(DISTINCT a.id)::text AS total ${from}`,
    params,
  );
  const total = Number(countRows[0]?.total ?? 0);

  const { rows } = await pool.query<AssetRow>(
    `${ASSET_SELECT} ${joins.join(" ")} WHERE ${where.join(" AND ")}
     GROUP BY a.id
     ORDER BY a.created_at DESC, a.id
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );

  return paginate(rows.map((r) => toImage(r)), total, offset);
}

/* ── Collections — the editorial layer ────────────────────────────────
 *
 * A curated sequence with its placard text. This is what makes the landing
 * page editable without a deploy: the photographs came from B2, but the
 * ORDER, the captions and the plate numbers lived hand-written inside
 * files headed "do not edit by hand" until 0004 gave them a table.
 */

type CollectionItemRow = {
  slug: string;
  label: string;
  collection_note: string | null;
  key: string;
  plate_no: number | null;
  caption: string[];
  title: string | null;
  year: number | null;
  item_note: string | null;
} & AssetRow;

const COLLECTION_SELECT = `
  SELECT c.slug, c.label, c.note AS collection_note,
         ci.key, ci.plate_no, ci.caption, ci.title, ci.year, ci.note AS item_note,
         a.id, a.storage_key, a.alt, a.width, a.height, a.lqip, a.ratio, a.credit,
         COALESCE(
           json_agg(
             json_build_object('format', d.format, 'width', d.width, 'key', d.storage_key)
             ORDER BY d.format, d.width
           ) FILTER (WHERE d.id IS NOT NULL),
           '[]'
         ) AS derivatives
  FROM collections c
  JOIN collection_items ci ON ci.collection_id = c.id
  JOIN assets a            ON a.id = ci.asset_id AND a.published
  LEFT JOIN asset_derivatives d ON d.asset_id = a.id
`;

const COLLECTION_GROUP = `
  GROUP BY c.slug, c.label, c.note, c.sort_order, ci.sort_order, ci.key,
           ci.plate_no, ci.caption, ci.title, ci.year, ci.note,
           a.id, a.storage_key, a.alt, a.width, a.height, a.lqip, a.ratio, a.credit
  ORDER BY c.sort_order, ci.sort_order
`;

export type CollectionRecord = {
  slug: string;
  label: string;
  note?: string;
  items: {
    key: string;
    image: ImageDTO;
    caption: string[];
    title?: string;
    year?: number;
    note?: string;
  }[];
};

function foldCollections(rows: CollectionItemRow[]): CollectionRecord[] {
  const bySlug = new Map<string, CollectionRecord>();

  for (const r of rows) {
    let col = bySlug.get(r.slug);
    if (!col) {
      col = {
        slug: r.slug,
        label: r.label,
        ...(r.collection_note ? { note: r.collection_note } : {}),
        items: [],
      };
      bySlug.set(r.slug, col);
    }
    col.items.push({
      key: r.key,
      // plate_no lives on the ITEM, not the asset: the same photograph is
      // plate 101 in the contact sheet and has no plate number at all in
      // the gallery. A plate number describes a position in a sequence.
      image: toImage(r, r.plate_no),
      caption: r.caption ?? [],
      ...(r.title ? { title: r.title } : {}),
      ...(r.year !== null ? { year: r.year } : {}),
      ...(r.item_note ? { note: r.item_note } : {}),
    });
  }

  // Insertion order is already c.sort_order thanks to the ORDER BY.
  return [...bySlug.values()];
}

export async function listCollections(): Promise<CollectionRecord[]> {
  const { rows } = await pool.query<CollectionItemRow>(
    `${COLLECTION_SELECT} ${COLLECTION_GROUP}`,
  );
  return foldCollections(rows);
}

export async function collectionBySlug(slug: string): Promise<CollectionRecord | null> {
  const { rows } = await pool.query<CollectionItemRow>(
    `${COLLECTION_SELECT} WHERE c.slug = $1 ${COLLECTION_GROUP}`,
    [slug],
  );
  return foldCollections(rows)[0] ?? null;
}

/** For /v1/assets/:id — the storage seam. Returns the key, not the URL,
 *  so the route decides between redirecting and describing. */
export async function assetById(
  id: string,
): Promise<{ image: ImageDTO; storageKey: string } | null> {
  const { rows } = await pool.query<AssetRow & { storage_key: string }>(
    `${ASSET_SELECT} WHERE a.id = $1 AND a.published GROUP BY a.id`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  return { image: toImage(row), storageKey: row.storage_key };
}

/* ── Stats ────────────────────────────────────────────────────────────── */

export class InsufficientEvidence extends Error {
  override readonly name = "InsufficientEvidence";
}

/**
 * Every figure the site displays, COMPUTED — never stored, never typed.
 *
 * This function is the structural answer to §2.3. The discarded prototype
 * hardcoded "480+ ACTIVE MEMBERS" (480 is every roster row across seven
 * historical committees; the current one is ~52) and "10 EXECUTIVE
 * COMMITTEES" (seven are documented). Neither number could have survived
 * being derived from the data, which is exactly why it is derived here.
 *
 * `earliestEvidenceYear` is the one field that cannot be faked into
 * existence. With no events and no achievements loaded there is no
 * earliest year, and the honest values — 0, or 1970, or a founding date
 * copied from a poster — are all fabrications of precisely the kind this
 * endpoint exists to prevent. So it throws, and the route answers 503
 * with a reason. It starts working the moment real content lands.
 */
export async function computeStats(): Promise<StatsDTO> {
  const { rows } = await pool.query<Record<string, string | null>>(`
    SELECT
      (SELECT count(*) FROM committees)                                        AS committees_documented,
      (SELECT count(*) FROM memberships ms JOIN committees c ON c.id = ms.committee_id
        WHERE c.is_current)                                                    AS current_committee_size,
      (SELECT count(*) FROM events WHERE published AND category = 'workshop')  AS workshops,
      (SELECT count(*) FROM events WHERE published AND category = 'seminar')   AS seminars,
      (SELECT count(*) FROM achievements WHERE track = 'international')        AS international_programmes,
      (SELECT count(*) FROM achievements WHERE track = 'national')             AS national_contests,
      (SELECT count(*) FROM events WHERE published
        AND category IN ('robo-carnival','intra-buet'))                        AS hosted_event_editions,
      (SELECT count(*) FROM assets WHERE published)                            AS archive_photographs,
      -- Verified AND actually carrying a result. The verified flag alone
      -- would count a confirmed participation as an award.
      (SELECT count(*) FROM achievements WHERE verified AND result IS NOT NULL) AS verified_awards,
      LEAST(
        (SELECT min(year) FROM achievements),
        (SELECT min(EXTRACT(YEAR FROM start_date))::int FROM events WHERE published)
      )                                                                        AS earliest_evidence_year
  `);

  const r = rows[0] ?? {};
  const num = (k: string) => Number(r[k] ?? 0);
  const earliest = r["earliest_evidence_year"] === null ? null : Number(r["earliest_evidence_year"]);

  if (earliest === null || !Number.isFinite(earliest)) {
    throw new InsufficientEvidence(
      "earliestEvidenceYear cannot be computed: no published events and no achievements are loaded. " +
        "Emitting a placeholder year would be a fabricated figure (§2.3), so /v1/stats reports " +
        "unavailable until content exists.",
    );
  }

  return {
    committeesDocumented: num("committees_documented"),
    currentCommitteeSize: num("current_committee_size"),
    workshops: num("workshops"),
    seminars: num("seminars"),
    internationalProgrammes: num("international_programmes"),
    nationalContests: num("national_contests"),
    hostedEventEditions: num("hosted_event_editions"),
    archivePhotographs: num("archive_photographs"),
    verifiedAwards: num("verified_awards"),
    earliestEvidenceYear: earliest,
    yearsActive: new Date().getFullYear() - earliest + 1,
    computedAt: new Date().toISOString(),
  };
}

/* ── Diagnostics ──────────────────────────────────────────────────────── */

/** Surfaced on /v1/health so silent exclusions stay visible. */
export async function diagnostics() {
  const { rows } = await pool.query<Record<string, string>>(`
    SELECT
      (SELECT count(*) FROM events e
         WHERE e.published AND e.cover_asset_id IS NULL)                   AS events_without_cover,
      (SELECT count(*) FROM assets WHERE NOT published)                   AS unpublished_assets,
      (SELECT count(*) FROM assets)                                       AS assets
  `);
  const r = rows[0] ?? {};
  return {
    eventsWithoutCover: Number(r["events_without_cover"] ?? 0),
    unpublishedAssets: Number(r["unpublished_assets"] ?? 0),
    assets: Number(r["assets"] ?? 0),
  };
}
