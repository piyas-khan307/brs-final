#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════
 * LIVE SCHEMA VERIFIER — asserts against a running Postgres.
 *
 * The sibling verify-schema.mjs parses the migration text. It exists
 * because Docker was unavailable when the schema was written, and it can
 * only ever prove that a constraint was *declared*. It cannot prove one
 * *fires* — and in Phase B1 that distinction turned out to matter:
 * assets_alt_check was declared, present, and accepted 'IMG_6738.JPG'.
 *
 * This script connects to a real database and does two things the static
 * checker cannot:
 *
 *   1. STRUCTURE — every expected table, enum and constraint is present.
 *   2. BEHAVIOUR — deliberately malformed rows are actually rejected, and
 *      well-formed rows are actually accepted. Both directions matter: a
 *      constraint that rejects everything passes a naive "does it error?"
 *      test while making the table useless.
 *
 * Everything runs inside a transaction that is rolled back. Safe against
 * a populated database, including production.
 *
 *   node scripts/verify-live.mjs
 *   DATABASE_URL=postgres://… node scripts/verify-live.mjs
 *
 * Exit 0 clean · exit 1 violations
 * ══════════════════════════════════════════════════════════════════════
 */

import pg from "pg";

const URL =
  process.env.DATABASE_URL ?? "postgres://brs:brs@localhost:5433/brs";

const EXPECTED_TABLES = [
  "achievement_assets", "achievements", "asset_derivatives", "assets",
  // committee_groups, not committee_teams. The table was renamed and this
  // list was not, so the verifier has been reporting a MISSING TABLE on
  // every run — which is how a safety net stops being one: nobody reads a
  // check that is always red.
  "committee_groups", "committees", "event_assets", "event_segments",
  "events", "members", "memberships", "moderators", "partners",
  "posts", "press", "projects", "redirects",
];

const EXPECTED_ENUMS = [
  "achievement_track", "asset_source", "copy_source", "event_category",
];

/** Column-name shapes that must never exist anywhere in the schema.
 *  Personal phone numbers for ~470 students sit in the source rosters;
 *  this removes the possibility rather than policing it. */
const FORBIDDEN_COLUMN_RE = /contact|phone|mobile|cell|whatsapp|telephone|bkash|nagad/i;

const OK_ALT =
  "Four Team BUET members on stage holding the Panasonic Award certificate";

/**
 * Behavioural cases. `expect: "reject"` means the database MUST refuse the
 * statement. `expect: "accept"` means it MUST allow it — those are the
 * controls that stop a constraint being tightened into uselessness.
 */
const CASES = [
  // ── assets.alt ──
  { name: "alt: empty string", expect: "reject",
    sql: `INSERT INTO assets (storage_key,mime,width,height,alt,lqip,ratio,checksum)
          VALUES ('k','image/webp',100,100,'','data:,','1:1','c')` },
  { name: "alt: whitespace only", expect: "reject",
    sql: `INSERT INTO assets (storage_key,mime,width,height,alt,lqip,ratio,checksum)
          VALUES ('k','image/webp',100,100,'            ','data:,','1:1','c')` },
  { name: "alt: filename 'IMG_6738.JPG' (exactly 12 chars)", expect: "reject",
    sql: `INSERT INTO assets (storage_key,mime,width,height,alt,lqip,ratio,checksum)
          VALUES ('k','image/webp',100,100,'IMG_6738.JPG','data:,','1:1','c')` },
  { name: "alt: placeholder prose", expect: "reject",
    sql: `INSERT INTO assets (storage_key,mime,width,height,alt,lqip,ratio,checksum)
          VALUES ('k','image/webp',100,100,'photo photo photo','data:,','1:1','c')` },
  { name: "alt: fewer than three words", expect: "reject",
    sql: `INSERT INTO assets (storage_key,mime,width,height,alt,lqip,ratio,checksum)
          VALUES ('k','image/webp',100,100,'robot photograph','data:,','1:1','c')` },
  { name: "alt: well-formed description", expect: "accept",
    sql: `INSERT INTO assets (storage_key,mime,width,height,alt,lqip,ratio,checksum)
          VALUES ('k','image/webp',960,1200,$$${OK_ALT}$$,'data:,','4:5','c')` },

  // ── assets: dimensions and ratio ──
  { name: "assets: zero width", expect: "reject",
    sql: `INSERT INTO assets (storage_key,mime,width,height,alt,lqip,ratio,checksum)
          VALUES ('k','image/webp',0,100,$$${OK_ALT}$$,'data:,','1:1','c')` },
  { name: "assets: unlisted ratio", expect: "reject",
    sql: `INSERT INTO assets (storage_key,mime,width,height,alt,lqip,ratio,checksum)
          VALUES ('k','image/webp',100,100,$$${OK_ALT}$$,'data:,','7:3','c')` },
  // Added in 0003. Nine 640×480 archive photographs were refused before
  // it; if this ever starts failing, those rows stop loading.
  { name: "assets: 4:3 ratio (added in 0003)", expect: "accept",
    sql: `INSERT INTO assets (storage_key,mime,width,height,alt,lqip,ratio,checksum)
          VALUES ('k','image/webp',640,480,$$${OK_ALT}$$,'data:,','4:3','c')` },

  // ── achievements: the accuracy invariants ──
  { name: "achievements: result without verification", expect: "reject",
    sql: `INSERT INTO achievements (year,programme,track,result,verified)
          VALUES (2015,'Contest','international','1st Place',false)` },
  { name: "achievements: verified without attribution", expect: "reject",
    sql: `INSERT INTO achievements (year,programme,track,result,verified)
          VALUES (2015,'Contest','international','1st Place',true)` },
  { name: "achievements: unverified participation (result NULL)", expect: "accept",
    sql: `INSERT INTO achievements (year,programme,track,result,verified)
          VALUES (2013,'NASA Lunabotics','international',NULL,false)` },
  { name: "achievements: verified WITH attribution", expect: "accept",
    sql: `INSERT INTO achievements (year,programme,track,result,verified,verified_by,verified_at)
          VALUES (2005,'ABU Robocon','international','Panasonic Award',true,'certificate photograph',now())` },

  // ── ordering and enums ──
  { name: "events: end_date before start_date", expect: "reject",
    sql: `INSERT INTO events (slug,title,category,start_date,end_date)
          VALUES ('s','T','workshop','2024-05-10','2024-05-01')` },
  { name: "events: unlisted category", expect: "reject",
    sql: `INSERT INTO events (slug,title,category,start_date)
          VALUES ('s','T','hackathon','2024-05-01')` },
  // ── events as posts (0012) and one place for the cover (0013) ──
  // These govern what the admin panel is allowed to save, so they are the
  // rules an editor will actually meet.
  { name: "events: published with no publication date", expect: "reject",
    sql: `INSERT INTO events (slug,title,category,published)
          VALUES ('s','T','workshop',true)` },
  { name: "events: published WITH a publication date", expect: "accept",
    sql: `INSERT INTO events (slug,title,category,published,published_at)
          VALUES ('s','T','workshop',true,now())` },
  { name: "events: a five-character excerpt", expect: "reject",
    sql: `INSERT INTO events (slug,title,category,excerpt)
          VALUES ('s','T','workshop','short')` },
  { name: "events: an excerpt longer than a feed card", expect: "reject",
    sql: `INSERT INTO events (slug,title,category,excerpt)
          VALUES ('s','T','workshop',repeat('x',321))` },
  { name: "events: no excerpt at all (a photographs-only entry)", expect: "accept",
    sql: `INSERT INTO events (slug,title,category) VALUES ('s','T','workshop')` },
  { name: "events: no date at all (migration 0010)", expect: "accept",
    sql: `INSERT INTO events (slug,title,category,start_date)
          VALUES ('s','T','workshop',NULL)` },
  { name: "event_assets: the retired 'cover' role", expect: "reject",
    sql: `INSERT INTO event_assets (event_id,asset_id,role)
          VALUES (gen_random_uuid(),gen_random_uuid(),'cover')` },

  { name: "committees: term_end before term_start", expect: "reject",
    sql: `INSERT INTO committees (ordinal,label,term_start,term_end)
          VALUES (11,'11th',2025,2024)` },
  { name: "committees: ordinal zero", expect: "reject",
    sql: `INSERT INTO committees (ordinal,label,term_start,term_end)
          VALUES (0,'zeroth',2024,2025)` },
  { name: "partners: unlisted tier", expect: "reject",
    sql: `INSERT INTO partners (name,tier) VALUES ('X','platinum')` },
  { name: "asset_derivatives: png format", expect: "reject",
    sql: `INSERT INTO asset_derivatives (asset_id,width,format,storage_key,bytes)
          VALUES (gen_random_uuid(),100,'png','k',1)` },
];

const problems = [];
const passes = [];

const client = new pg.Client({ connectionString: URL });

try {
  await client.connect();
} catch (e) {
  console.error(`\n  Cannot reach Postgres at ${URL}`);
  console.error(`  ${e.message}`);
  console.error(`\n  Start it with:  docker compose up -d postgres\n`);
  process.exit(1);
}

console.log(`\n  Connected: ${URL.replace(/:[^:@/]*@/, ":****@")}\n`);

/* ── 1. Structure ─────────────────────────────────────────────────── */

const { rows: tables } = await client.query(
  `select tablename from pg_tables where schemaname='public' order by tablename`,
);
const have = tables.map((r) => r.tablename);
for (const t of EXPECTED_TABLES) {
  if (have.includes(t)) passes.push(`table ${t}`);
  else problems.push(`MISSING TABLE: ${t}`);
}

const { rows: enums } = await client.query(
  `select distinct t.typname from pg_type t join pg_enum e on e.enumtypid=t.oid`,
);
for (const e of EXPECTED_ENUMS) {
  if (enums.some((r) => r.typname === e)) passes.push(`enum ${e}`);
  else problems.push(`MISSING ENUM: ${e}`);
}

/* ── 2. Privacy — no contact column anywhere in the schema ────────── */

const { rows: cols } = await client.query(
  `select table_name, column_name from information_schema.columns
   where table_schema='public'`,
);
const offenders = cols.filter((c) => FORBIDDEN_COLUMN_RE.test(c.column_name));
if (offenders.length === 0) {
  passes.push("privacy: no contact/phone column in any table");
} else {
  for (const o of offenders) {
    problems.push(`FORBIDDEN COLUMN: ${o.table_name}.${o.column_name} — §12.1 control 1`);
  }
}

/* ── 3. Behaviour — do the constraints actually fire? ─────────────── */

await client.query("BEGIN");
for (const c of CASES) {
  await client.query("SAVEPOINT tc");
  let rejected = false;
  let detail = "";
  try {
    await client.query(c.sql);
  } catch (e) {
    rejected = true;
    detail = e.constraint ?? e.code ?? e.message.split("\n")[0];
  }
  await client.query("ROLLBACK TO SAVEPOINT tc");

  if (c.expect === "reject" && rejected) {
    passes.push(`rejects — ${c.name}  [${detail}]`);
  } else if (c.expect === "accept" && !rejected) {
    passes.push(`accepts — ${c.name}`);
  } else if (c.expect === "reject") {
    problems.push(`NOT ENFORCED: "${c.name}" was ACCEPTED but must be rejected`);
  } else {
    problems.push(`TOO STRICT: "${c.name}" was REJECTED but must be accepted [${detail}]`);
  }
}
await client.query("ROLLBACK");

/* ── 4. Applied migrations ────────────────────────────────────────── */

try {
  const { rows: mig } = await client.query(
    `select version, applied_at from schema_migrations order by version`,
  );
  console.log("  Applied migrations:");
  for (const m of mig) {
    console.log(`    ${m.version}  ${m.applied_at.toISOString().slice(0, 19)}Z`);
  }
  console.log("");
} catch {
  problems.push("MISSING TABLE: schema_migrations — 0002 has not been applied");
}

await client.end();

/* ── Report ───────────────────────────────────────────────────────── */

for (const p of passes) console.log(`  ok    ${p}`);

if (problems.length) {
  console.error(`\n  ${problems.length} PROBLEM(S):\n`);
  for (const p of problems) console.error(`    ${p}`);
  console.error("");
  process.exit(1);
}

console.log(`\n  ${passes.length} checks passed. Schema is live and enforcing.\n`);
