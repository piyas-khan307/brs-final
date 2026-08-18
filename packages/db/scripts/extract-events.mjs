#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════
 * READ THE ARCHIVE, PROPOSE THE EVENTS. WRITE NOTHING TO THE DATABASE.
 *
 *   node packages/db/scripts/extract-events.mjs
 *
 * Output:
 *   content/events.seed.json      machine-readable, the loader's input
 *   content/events.review.md      human-readable, for the club to check
 *
 * ── WHY THIS IS TWO STEPS AND NOT ONE ──
 * The text in BRS/ is the club's ORIGINAL ANNOUNCEMENT COPY. It is
 * written in the future tense, it asks people to register, and sixteen
 * entries of it carry a mobile number or a bKash number (§12.1). None of
 * that may reach a public page, and no automated rule can be trusted to
 * catch all of it — so this step proposes and a person disposes.
 *
 * What it strips, and reports having stripped:
 *   · Bangladeshi mobile numbers in every shape the archive uses
 *   · bKash / বিকাশ payment lines
 *   · registration links, Google Forms, "register now" calls to action
 *   · deadlines and "last date" lines
 *
 * What it will NOT do:
 *   · invent a date. A folder called 2019 yields edition "2019" and a
 *     null start_date — see migration 0010.
 *   · rewrite future tense into past tense. Machine-rewriting a club's
 *     own words about its own events produces confident nonsense; the
 *     review file flags every entry that still reads as an advert so a
 *     human can decide.
 *   · publish anything. Everything it loads arrives with published=false.
 * ══════════════════════════════════════════════════════════════════════
 */

import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const ARCHIVE = join(ROOT, "BRS");
const OUT = join(ROOT, "content");

/* ── Sections ──────────────────────────────────────────────────────────
 *
 * Which archive folder becomes which kind of event. Anything not listed
 * is reported rather than guessed at — a mislabelled event is worse than
 * an unlisted one, and the list is short enough to maintain by hand.
 *
 * `photos` marks a folder that is a PICTURE COLLECTION and not an event:
 * "National Contests" is one JPEG per contest appearance, "best 20" is a
 * selection of photographs, "Robocon" is two historical photos. Those
 * belong to the achievements record and the gallery, not here.
 */
const SECTIONS = {
  Workshops: { category: "workshop", series: "Basic Workshop" },
  Seminars: { category: "seminar" },
  "Robo Carnivals": { category: "robo-carnival", series: "Robo Carnival" },
  "intra buet": { category: "intra-buet" },
  "co-organized": { category: "co-organised" },
  AGM: { category: "agm" },
  "BRS'24 Reception Programme": { category: "reception", single: true },
  "member recruitment": { category: "recruitment", series: "Member Recruitment" },
  "orientation programs": { category: "orientation" },
  "IRC 2012": { category: "competition", single: true },
  "IRC 2013": { category: "competition", single: true },
  "IRC 2014": { category: "competition", single: true },
  "IRC 2015": { category: "competition", single: true },
  "iARC 2014": { category: "competition", single: true },
  "iARC 2015": { category: "competition", single: true },
  "NASA Lunabotics": { category: "competition", single: true },
  Rover: { category: "competition" },

  "best 20": { photos: true },
  "National Contests": { photos: true },
  Robocon: { photos: true },
};

/* ── The redaction rules ───────────────────────────────────────────── */

const PHONE = /(?:\+?88)?0?1[3-9]\d{2}[-\s]?\d{6}/g;
const LINE_KILLERS = [
  { re: /\bbkash\b|\bবিকাশ\b/i, why: "payment reference" },
  { re: /https?:\/\/(?:docs\.google|forms\.gle|bit\.ly)/i, why: "registration link" },
  { re: /\bregistration (?:fee|link|form|deadline)\b/i, why: "registration call to action" },
  { re: /\bregister (?:now|here|at)\b/i, why: "registration call to action" },
  { re: /\b(?:last date|deadline|apply by)\b/i, why: "deadline" },
];
/**
 * Copy that still addresses the reader as a prospective attendee.
 *
 * The first version of this was a short list of obvious phrases and it
 * let Robo Carnival 2024 through to a published page reading "Mark the
 * dates on your calendar" and "Complete your registration soon". The
 * lesson is that the tell is rarely a slogan — it is TENSE and it is the
 * imperative mood, so those are what this looks for.
 *
 * Deliberately over-eager. A false positive costs one entry sitting in
 * drafts until somebody reads it; a false negative puts a live call to
 * action on a public page about an event that finished years ago.
 *
 * Note what is NOT here: bare "registration" or "eligibility". Real
 * retrospectives say "registration was open to the 17th batch", and
 * flagging those would hold back the very entries this is meant to let
 * through.
 */
const STILL_AN_ADVERT = new RegExp(
  [
    // Future tense about something already over.
    /\b(?:will be (?:held|organised|organized|arranged)|is scheduled|are scheduled|to be held|upcoming event)\b/,
    // Imperatives aimed at a reader.
    /\bmark (?:the|your) (?:dates?|calendars?)\b/,
    /\bcomplete your\b|\bgear up\b|\bstay tuned\b|\bhurry\b|\bdon'?t miss\b/,
    /\bregister (?:now|here|at|online|today)\b|\bsign up (?:now|here|today)\b/,
    /\bapply (?:now|here|today)\b|\bjoin (?:us|now|today)\b/,
    // Money and forms, in any phrasing — the URL itself is stripped
    // earlier, and a sentence pointing at a form that no longer exists is
    // no better than the link was.
    /\bgoogle form\b|\bform link\b|\bregistration (?:fee|form|link|deadline|open)\b/,
    /\bpayment (?:details?|method|information|info)\b|\bentry fee\b/,
    // Scarcity.
    /\bseats? (?:are )?limited\b|\blimited seats?\b|\bare invited\b|\blast chance\b/,
    /* Deixis — words whose meaning depends on the day they were written.
       Found by looking at the published feed and reading a card titled
       "Tomorrow at 10 a.m. we're going LIVE on Radio Shadhin 92.4 FM!".
       Every other rule above was written against the BODY, and this one
       was in the TITLE, which nothing had ever checked. "Tomorrow" on an
       archive page from 2016 is not a smaller error than a dead
       registration link; it is the same error in fewer words. */
    /\b(?:tomorrow|today|tonight|this (?:week|weekend|evening|afternoon))\b/,
    /\bwe(?:'| a)?re going live\b|\bgoing live\b/,
  ]
    .map((r) => r.source)
    .join("|"),
  "i",
);

const IMAGE = /\.(jpe?g|png|heic|webp|avif)$/i;
const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

function walk(dir) {
  const out = { files: [], dirs: [] };
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    (statSync(p).isDirectory() ? out.dirs : out.files).push(p);
  }
  return out;
}

/** The club's own web copy first; its original announcement only as a
 *  fallback, and flagged when that happens. */
function pickCopy(files) {
  const texts = files.filter((f) => f.toLowerCase().endsWith(".txt"));
  const score = (f) => {
    const b = f.split("/").pop().toLowerCase();
    if (b.includes("website") || b.includes("for web")) return 0;
    if (b.startsWith("description")) return 1;
    if (b === "desc.txt") return 2;
    if (b.includes("photo")) return 9;
    return 5;
  };
  const ranked = texts.sort((a, b) => score(a) - score(b));
  for (const t of ranked) {
    if (score(t) === 9) continue;
    const body = readFileSync(t, "utf8").trim();
    if (body.length < 60) continue;
    const bangla = (body.match(/[ঀ-৿]/g) ?? []).length;
    return { file: t, body, bangla: bangla / body.length, webReady: score(t) <= 1 };
  }
  return null;
}

/** Strip what must never be published; report every cut. */
function redact(text) {
  const removed = [];
  let out = text.replace(PHONE, () => {
    removed.push("phone number");
    return "";
  });

  out = out
    .split("\n")
    .filter((line) => {
      for (const { re, why } of LINE_KILLERS) {
        if (re.test(line)) {
          removed.push(`${why}: ${line.trim().slice(0, 60)}`);
          return false;
        }
      }
      return true;
    })
    .join("\n");

  // Collapse the holes the cuts left behind.
  out = out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return { text: out, removed };
}

/** A four-digit year anywhere in the folder name, and nothing more
 *  clever than that. "intra_22" yields no year on purpose — guessing
 *  that 22 means 2022 is exactly the kind of inference that puts a
 *  wrong fact on a public page. */
const yearOf = (name) => name.match(/\b(19|20)\d{2}\b/)?.[0] ?? null;

/* ── Walk ──────────────────────────────────────────────────────────── */

const events = [];
const notes = [];
const unmapped = [];

for (const section of readdirSync(ARCHIVE)) {
  const path = join(ARCHIVE, section);
  if (!statSync(path).isDirectory()) continue;

  const rule = SECTIONS[section];
  if (!rule) {
    unmapped.push(section);
    continue;
  }
  if (rule.photos) {
    const { files, dirs } = walk(path);
    const n = files.filter((f) => IMAGE.test(f)).length;
    notes.push(
      `**${section}** — treated as a picture collection, not an event ` +
        `(${n} photographs${dirs.length ? `, ${dirs.length} folders` : ""}). ` +
        `These belong to the achievements record and the gallery.`,
    );
    continue;
  }

  const { dirs } = walk(path);
  const entries = rule.single || dirs.length === 0 ? [path] : dirs;

  for (const dir of entries) {
    const name = dir.split("/").pop();
    const { files, dirs: sub } = walk(dir);
    const all = [...files];
    for (const d of sub) all.push(...walk(d).files);

    const photos = all.filter((f) => IMAGE.test(f));
    const copy = pickCopy(all);
    const year = yearOf(name) ?? yearOf(section);

    let title = name === section ? section : `${section} — ${name}`;
    let body = "";
    let removed = [];
    let webReady = false;
    let bangla = 0;

    if (copy) {
      webReady = copy.webReady;
      bangla = copy.bangla;
      const r = redact(copy.body);
      removed = r.removed;
      const lines = r.text.split("\n").filter(Boolean);
      // A short opening line that is not a sentence is a headline.
      if (lines.length > 1 && lines[0].length <= 90 && !/[.!?]$/.test(lines[0])) {
        title = lines[0].replace(/^#+\s*/, "").trim();
        body = lines.slice(1).join("\n").trim();
      } else {
        body = r.text;
      }
    }

    events.push({
      slug: slugify(name === section ? section : `${section}-${name}`),
      title,
      category: rule.category,
      series: rule.series ?? null,
      edition: name === section ? (year ?? null) : name,
      startDate: null, // never invented — migration 0010
      body,
      bodyFormat: "md",
      copySource: webReady ? "web-ready" : copy ? "derived" : "derived",
      published: false,
      // Provenance for the loader and for the review file.
      _source: copy ? copy.file.replace(`${ROOT}/`, "") : null,
      _dir: dir.replace(`${ROOT}/`, ""),
      _photos: photos.length,
      _year: year,
      _removed: removed,
      _banglaRatio: Number(bangla.toFixed(3)),
      // Title AND body. Checking only the body was a gap wide enough for
      // a whole card — see the deixis note on STILL_AN_ADVERT.
      _stillAnAdvert: STILL_AN_ADVERT.test(`${title}\n${body}`),
    });
  }
}

events.sort((a, b) => (b._year ?? "0").localeCompare(a._year ?? "0") || a.title.localeCompare(b.title));

/* ── Write ─────────────────────────────────────────────────────────── */

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "events.seed.json"), `${JSON.stringify(events, null, 2)}\n`);

const withCopy = events.filter((e) => e.body.length > 0);
const redacted = events.filter((e) => e._removed.length);
const adverts = events.filter((e) => e._stillAnAdvert);
const bangla = events.filter((e) => e._banglaRatio > 0.05);
const noCopy = events.filter((e) => !e.body);

const md = [
  `# Events extracted from the archive`,
  ``,
  `Generated by \`packages/db/scripts/extract-events.mjs\`. Nothing here is`,
  `in the database yet, and everything loads with \`published = false\`.`,
  ``,
  `- **${events.length}** events proposed`,
  `- **${withCopy.length}** have usable English copy`,
  `- **${noCopy.length}** have no copy — a title and photographs only`,
  `- **${redacted.length}** had a phone number, payment reference, registration link or deadline removed`,
  `- **${adverts.length}** still read as an advertisement and need rewriting into the past tense`,
  `- **${bangla.length}** are substantially Bangla and need translating`,
  ``,
  ...(unmapped.length
    ? [`## Archive folders with no rule yet`, ``, ...unmapped.map((u) => `- \`${u}\``), ``]
    : []),
  ...(notes.length ? [`## Not treated as events`, ``, ...notes.map((n) => `- ${n}`), ``] : []),
  `## What was removed`,
  ``,
  ...(redacted.length
    ? redacted.flatMap((e) => [
        `### ${e.title}`,
        `\`${e._source}\``,
        ``,
        ...e._removed.map((r) => `- ${r}`),
        ``,
      ])
    : [`Nothing.`, ``]),
  `## Needs a human before publishing`,
  ``,
  ...adverts.map((e) => `- **${e.title}** — still written as an advert`),
  ...bangla.map((e) => `- **${e.title}** — ${Math.round(e._banglaRatio * 100)}% Bangla`),
  ``,
  `## Every event`,
  ``,
  `| Title | Category | Edition | Year | Photos | Copy |`,
  `| --- | --- | --- | --- | --- | --- |`,
  ...events.map(
    (e) =>
      `| ${e.title.replace(/\|/g, "/")} | ${e.category} | ${e.edition ?? "—"} | ${e._year ?? "—"} | ${e._photos} | ${e.body ? `${e.body.length} chars` : "none"} |`,
  ),
  ``,
].join("\n");

writeFileSync(join(OUT, "events.review.md"), md);

console.log(`${events.length} events proposed → content/events.seed.json`);
console.log(`  ${withCopy.length} with copy · ${noCopy.length} without`);
console.log(`  ${redacted.length} redacted · ${adverts.length} still advertisements · ${bangla.length} Bangla`);
if (unmapped.length) console.log(`  ⚠ no rule for: ${unmapped.join(", ")}`);
console.log(`\nRead content/events.review.md before loading anything.`);
