/**
 * ══════════════════════════════════════════════════════════════════════
 * LOAD A COMMITTEE FROM ITS ANNOUNCEMENT POSTERS.
 *
 *   packages/db/seed/11th-excom.json  +  BRS 11th ExCom Post/*.jpg
 *     → 84 cropped portraits through the REAL ingest service
 *     → committee → groups → sections → members → memberships
 *
 * ── WHY IT POSTS TO @brs/ingest INSTEAD OF CALLING ingest() ──
 * Importing the pipeline directly would be simpler and would prove less.
 * Going over HTTP exercises the multipart parse, the auth middleware, the
 * size limit and the error translation — the same path Directus will take
 * when an editor drags in a photo. A bulk import is the best load test
 * this service will get before it is in front of real editors, and it is
 * free to run it that way.
 *
 * ── WHY THE PORTRAITS ARE CROPPED HERE ──
 * The posters are 1500×1800 graphics: club logo, headline, framed
 * photograph, name, designation, team. Storing those whole would mean a
 * committee page of 84 identical posters with the person 30% of the
 * height. The frame is at a FIXED position — measured on all 84, not
 * assumed; see scripts/measure-poster-frame.mjs — so the photograph can
 * be lifted out exactly.
 *
 * ── IDEMPOTENT ──
 * Re-running upserts. The assets are content-addressed, so re-running
 * uploads nothing new; the committee rows are matched on natural keys
 * (ordinal, group name, section name, person name). Safe to run twice,
 * which matters because the first run of anything that touches 84 people
 * is rarely the last.
 *
 *   pnpm --filter @brs/db seed:committee            # dry run
 *   pnpm --filter @brs/db seed:committee -- --write
 * ══════════════════════════════════════════════════════════════════════
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import sharp from "sharp";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const SEED = join(HERE, "..", "seed", "11th-excom.json");
const POSTERS = join(ROOT, "BRS 11th ExCom Post");

const WRITE = process.argv.includes("--write");
const INGEST_URL = process.env.INGEST_URL ?? "http://localhost:8790";
const INGEST_TOKEN = process.env.INGEST_TOKEN;

/**
 * The photograph's frame within the 1500×1800 poster, stroke included.
 * Measured on all 84 posters; every one agreed to the pixel. The +3/-3
 * insets drop the frame's own 5px light rule, which would otherwise ride
 * along as a bright border on every portrait.
 */
const FRAME = { left: 283, right: 1218, top: 490, bottom: 1390 } as const;
const INSET = 3;
const CROP = {
  left: FRAME.left + INSET,
  top: FRAME.top + INSET,
  width: FRAME.right - FRAME.left + 1 - INSET * 2,
  height: FRAME.bottom - FRAME.top + 1 - INSET * 2,
};

type SeedMember = {
  file: string;
  group: string;
  designation: string;
  name: string;
  portfolio?: string;
  teamAsPrinted?: string;
};
type Seed = {
  committee: { ordinal: number; label: string; isCurrent: boolean; termStart: number | null; termEnd: number | null };
  members: SeedMember[];
};

const seed = JSON.parse(readFileSync(SEED, "utf8")) as Seed;

/**
 * Alt text for a portrait names the person. That is not a privacy leak —
 * the name is printed on the poster the club published — and it is what a
 * screen-reader user needs; "a young man in a grey blazer" tells them
 * nothing about whose page they are on.
 *
 * Also has to satisfy `assets_alt_check`: ≥12 characters, ≥3 words, not a
 * filename, not starting with "photo"/"image"/"IMG".
 */
function altFor(m: SeedMember, label: string): string {
  const role = m.portfolio ? `${m.designation} (${m.portfolio})` : m.designation;
  const where = m.group === "Standing Committee" ? "" : `, ${m.group}`;
  return `${m.name}, ${role}${where} of the ${label}, BUET Robotics Society`;
}

/** The cropped picture area, re-encoded losslessly. PNG rather than JPEG
 *  because this is an intermediate: a second lossy pass before the
 *  pipeline's own AVIF/WebP encode would stack two generations of
 *  artefacts on someone's face. */
async function cropPortrait(file: string): Promise<Buffer> {
  return sharp(join(POSTERS, file)).extract(CROP).png({ compressionLevel: 6 }).toBuffer();
}

/**
 * Find posters that share a picture area with another poster.
 *
 * TWO OF THE 84 HAVE AN EMPTY FRAME — "Md. Abu Ashari" and "Saif Sheikh
 * Fahim" carry a name, a role and a team, but no photograph was ever
 * placed; the frame shows the template's circuit-board artwork straight
 * through. Cropping those yields a near-black rectangle that looks like a
 * loading failure on the committee page.
 *
 * ── WHY NOT AN EXACT HASH ──
 * That was the first attempt and it found nothing. The two posters were
 * exported as separate JPEGs, so their identical artwork differs by
 * compression noise at the byte level. Exact equality is the wrong test
 * for "the same picture".
 *
 * A 32×32 greyscale fingerprint throws that noise away while keeping
 * everything that distinguishes one photograph from another. Two crops
 * within MATCH_TOLERANCE mean levels of each other are the same image;
 * real portraits sit an order of magnitude apart.
 *
 * Detected by similarity rather than by hardcoding those two filenames:
 * a shared picture area means there is no unique photograph there,
 * whether the cause is an empty frame today or a copy-pasted placeholder
 * next year. Those members load WITHOUT a portrait — a missing picture
 * the page can handle deliberately, rather than a fake one it cannot tell
 * apart from a real one.
 */
const MATCH_TOLERANCE = 3; // mean levels out of 255

async function fingerprint(file: string): Promise<Buffer> {
  return sharp(join(POSTERS, file))
    .extract(CROP)
    .greyscale()
    .resize(32, 32, { fit: "fill" })
    .raw()
    .toBuffer();
}

async function findSharedPictureAreas(files: string[]): Promise<Set<string>> {
  const prints = new Map<string, Buffer>();
  for (const f of files) prints.set(f, await fingerprint(f));

  const distance = (a: Buffer, b: Buffer) => {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += Math.abs(a[i]! - b[i]!);
    return s / a.length;
  };

  const shared = new Set<string>();
  for (let i = 0; i < files.length; i++) {
    for (let j = i + 1; j < files.length; j++) {
      const d = distance(prints.get(files[i]!)!, prints.get(files[j]!)!);
      if (d <= MATCH_TOLERANCE) {
        shared.add(files[i]!);
        shared.add(files[j]!);
      }
    }
  }
  return shared;
}

async function uploadPortrait(m: SeedMember, label: string): Promise<string> {
  const bytes = await cropPortrait(m.file);

  const form = new FormData();
  form.set("file", new Blob([new Uint8Array(bytes)], { type: "image/png" }), `${m.file}.png`);
  form.set("alt", altFor(m, label));
  form.set("sourceRef", `BRS 11th ExCom Post/${m.file}`);
  form.set("published", "true");

  const res = await fetch(`${INGEST_URL}/ingest`, {
    method: "POST",
    headers: { "x-ingest-token": INGEST_TOKEN! },
    body: form,
  });
  const body = (await res.json()) as { assetId?: string; error?: string };
  if (!res.ok || !body.assetId) {
    throw new Error(`${m.file} (${m.name}): ${res.status} ${body.error ?? "no assetId"}`);
  }
  return body.assetId;
}

/* ── Ordering ──────────────────────────────────────────────────────────
 *
 * Groups, sections and people all take their display order from their
 * order of appearance in the seed file. That file lists the Standing
 * Committee first and every team in rank order — President before Vice
 * President, Head before Deputy Head before Member — because that is how
 * the club announced them.
 *
 * Deriving order from the file rather than sorting alphabetically keeps
 * the page agreeing with the posters, and keeps "who outranks whom"
 * editorial rather than something this script decides.
 */
function ordered<T>(items: T[], key: (t: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) if (!m.has(key(it))) m.set(key(it), m.size);
  return m;
}

async function main() {
  if (!INGEST_TOKEN) {
    throw new Error("INGEST_TOKEN is not set. Add it to .env — see .env.example.");
  }

  const { committee, members } = seed;
  const groupOrder = ordered(members, (m) => m.group);
  const sectionOrder = new Map<string, Map<string, number>>();
  for (const [g] of groupOrder) {
    sectionOrder.set(g, ordered(members.filter((m) => m.group === g), (m) => m.designation));
  }

  console.log(`${committee.label} — ${members.length} people in ${groupOrder.size} groups`);
  for (const [g] of groupOrder) {
    const n = members.filter((m) => m.group === g).length;
    console.log(`  ${g.padEnd(42)} ${String(n).padStart(2)} people, ${sectionOrder.get(g)!.size} sections`);
  }
  if (committee.termStart === null) {
    console.log(
      `\n⚠ Term years are not recorded — they appear nowhere on the posters.\n` +
        `  Loading anyway; the page will simply not print a year range.`,
    );
  }

  process.stdout.write("\nchecking picture areas ... ");
  const noPhoto = await findSharedPictureAreas(members.map((m) => m.file));
  console.log(`${members.length - noPhoto.size} distinct, ${noPhoto.size} without a photograph`);
  for (const m of members) {
    if (noPhoto.has(m.file)) {
      console.log(`  ⚠ ${m.name} (${m.file}) — empty frame on the poster; loading with no portrait`);
    }
  }

  if (!WRITE) {
    console.log("\nDry run. Pass --write to upload the portraits and load the roster.");
    return;
  }

  // Health-check before uploading 84 files, so a misconfigured storage
  // endpoint fails in one second rather than on portrait 40.
  const health = await fetch(`${INGEST_URL}/health`).then((r) => r.json()).catch(() => null);
  if (!health?.ok) throw new Error(`Ingest service is not healthy at ${INGEST_URL}: ${JSON.stringify(health)}`);
  console.log(`\ningest: ${health.storage} → ${health.bucket}\n`);

  const t0 = Date.now();
  const assetIds = new Map<string, string>();
  const toUpload = members.filter((m) => !noPhoto.has(m.file));
  for (const [i, m] of toUpload.entries()) {
    const id = await uploadPortrait(m, committee.label);
    assetIds.set(m.file, id);
    process.stdout.write(`\r  uploaded ${i + 1}/${toUpload.length}  ${m.name.slice(0, 40).padEnd(40)}`);
  }
  console.log(`\n  ${toUpload.length} portraits in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL ?? "postgres://brs:brs@localhost:5433/brs",
  });
  await client.connect();
  await client.query("BEGIN");
  try {
    const { rows: [c] } = await client.query<{ id: string }>(
      `INSERT INTO committees (ordinal, label, term_start, term_end, is_current)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (ordinal) DO UPDATE SET label = EXCLUDED.label, is_current = EXCLUDED.is_current
       RETURNING id`,
      [committee.ordinal, committee.label, committee.termStart, committee.termEnd, committee.isCurrent],
    );
    const committeeId = c!.id;

    const groupIds = new Map<string, string>();
    for (const [name, sort] of groupOrder) {
      const { rows: [g] } = await client.query<{ id: string }>(
        `INSERT INTO committee_groups (committee_id, name, sort_order) VALUES ($1,$2,$3)
         ON CONFLICT (committee_id, name) DO UPDATE SET sort_order = EXCLUDED.sort_order
         RETURNING id`,
        [committeeId, name, sort],
      );
      groupIds.set(name, g!.id);
    }

    const sectionIds = new Map<string, string>();
    for (const [gName, sections] of sectionOrder) {
      for (const [sName, sort] of sections) {
        const { rows: [s] } = await client.query<{ id: string }>(
          `INSERT INTO committee_sections (group_id, name, sort_order) VALUES ($1,$2,$3)
           ON CONFLICT (group_id, name) DO UPDATE SET sort_order = EXCLUDED.sort_order
           RETURNING id`,
          [groupIds.get(gName), sName, sort],
        );
        sectionIds.set(`${gName}/${sName}`, s!.id);
      }
    }

    let n = 0;
    for (const [i, m] of members.entries()) {
      /* `members` has no natural key — two students can share a name, and
       * pretending otherwise would silently merge two people. Matched on
       * name AND this committee's membership instead, so a re-run updates
       * the person it loaded last time and a genuine namesake elsewhere in
       * the archive is left alone. Department and batch stay NULL: the
       * posters do not carry them (migration 0007). */
      const { rows: [existing] } = await client.query<{ id: string }>(
        `SELECT m.id FROM members m
         JOIN memberships ms ON ms.member_id = m.id AND ms.committee_id = $2
         WHERE m.name = $1 LIMIT 1`,
        [m.name, committeeId],
      );
      const memberId = existing?.id ?? (
        await client.query<{ id: string }>(
          `INSERT INTO members (name, portrait_asset_id) VALUES ($1,$2) RETURNING id`,
          [m.name, assetIds.get(m.file) ?? null],
        )
      ).rows[0]!.id;
      if (existing) {
        await client.query(`UPDATE members SET portrait_asset_id = $2 WHERE id = $1`,
          [memberId, assetIds.get(m.file) ?? null]);
      }

      // The designation carries the portfolio ("Vice President
      // (Technical)") while the section stays the plain rank, so the two
      // Vice Presidents share one heading and still read distinctly.
      const designation = m.portfolio ? `${m.designation} (${m.portfolio})` : m.designation;
      await client.query(
        `INSERT INTO memberships (member_id, committee_id, section_id, designation, sort_order)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (member_id, committee_id, designation)
         DO UPDATE SET section_id = EXCLUDED.section_id, sort_order = EXCLUDED.sort_order`,
        [memberId, committeeId, sectionIds.get(`${m.group}/${m.designation}`), designation, i],
      );
      n++;
    }

    await client.query("COMMIT");
    console.log(`  ${n} memberships written.`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    await client.end();
  }
}

await main();
