/**
 * ══════════════════════════════════════════════════════════════════════
 * BUILD-TIME CONTENT FETCH — Phase B4, the frontend swap.
 *
 *   pnpm --filter @brs/web content        # regenerate from the API
 *   pnpm --filter @brs/web content --check # fail if the files are stale
 *
 * Reads /v1/collections through @brs/contract's typed client and rewrites
 * plates.generated.ts and showcase.generated.ts with byte-identical
 * EXPORT SHAPES. Every component keeps its imports, its types and its
 * property access. Not one component file changes.
 *
 * ── WHY CODEGEN AND NOT `await` IN A COMPONENT ──
 * The obvious design is a server component that fetches and passes props
 * down. It cannot work here, for two independent reasons:
 *
 *   1. KeyFacts, HorizontalGallery and GridAssembly are `"use client"` —
 *      they drive GSAP timelines against real DOM nodes. Client components
 *      cannot await, and passing the data as props would change every
 *      component signature, which is precisely the thing this phase exists
 *      to avoid.
 *
 *   2. `output: "export"` means there is no server at request time. The
 *      data has to be inside the bundle no matter which route it takes.
 *
 * So "fetch at build time" and "generate a module at build time" produce
 * the same artefact. The difference is only WHERE the fetch happens — and
 * doing it here keeps it out of the React tree entirely, where it would
 * otherwise be a suspense boundary and a loading state for data that is
 * already static.
 *
 * ── WHAT THIS PROVES ──
 * The generated modules used to be built from files on disk by
 * prepare-plates.mjs and prepare-showcase.mjs. They are now built from
 * Postgres, through the /v1 contract, with images served from object
 * storage. Three layers of the stack were replaced underneath the UI and
 * the UI did not notice. That is the Directive 3 test.
 * ══════════════════════════════════════════════════════════════════════
 */

import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { CollectionDTO, CollectionItemDTO, CommitteeDTO, EventDTO, ImageDTO } from "@brs/contract";

import { brs } from "../src/lib/content.js";
import { renderMarkdown, stripMarkdown } from "../src/lib/markdown.js";
import {
  collectAssetIds,
  parseRichDoc,
  renderRichDoc,
  richDocToText,
  type RichImage,
} from "../src/lib/richtext/render.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIB = path.resolve(HERE, "../src/lib");

const CHECK_ONLY = process.argv.includes("--check");

/* ── Shape mapping ────────────────────────────────────────────────────
 *
 * ImageDTO.sources is a flat list of {format, width, url}. The components
 * want it split per format and sorted ascending, because that is the order
 * a srcset has to be in. Splitting here rather than in the components is
 * what keeps them untouched.
 */

type Src = { w: number; url: string };

const sourcesOf = (item: CollectionItemDTO, format: "avif" | "webp"): Src[] =>
  item.image.sources
    .filter((s) => s.format === format)
    .sort((a, b) => a.width - b.width)
    .map((s) => ({ w: s.width, url: s.url }));

/** PlateAsset — plates.generated.ts. Caption is an array of placard
 *  lines; plate is the museum placard number. */
function toPlate(item: CollectionItemDTO) {
  return {
    id: item.key,
    alt: item.image.alt,
    width: item.image.width,
    height: item.image.height,
    ratio: item.image.ratio,
    plate: item.image.plate ?? null,
    caption: item.caption,
    lqip: item.image.lqip,
    avif: sourcesOf(item, "avif"),
    webp: sourcesOf(item, "webp"),
    // Press clippings only. `title` carries the outlet because that is the
    // only naming the archive has for these three.
    ...(item.title ? { outlet: item.title } : {}),
    ...(item.year !== undefined ? { year: item.year } : {}),
  };
}

/** ShowcaseAsset — showcase.generated.ts. Caption is a single string
 *  here, not an array; the two modules genuinely differ. */
function toShowcase(item: CollectionItemDTO) {
  return {
    id: item.key,
    alt: item.image.alt,
    width: item.image.width,
    height: item.image.height,
    ratio: item.image.ratio,
    lqip: item.image.lqip,
    avif: sourcesOf(item, "avif"),
    webp: sourcesOf(item, "webp"),
    ...(item.title ? { title: item.title } : {}),
    ...(item.year !== undefined ? { year: item.year } : {}),
    ...(item.note ? { note: item.note } : {}),
    ...(item.caption.length ? { caption: item.caption.join(" ") } : {}),
  };
}

/**
 * The same split, for a portrait. `sourcesOf` takes a CollectionItemDTO
 * and a committee member carries a bare ImageDTO, so the shared part is
 * lifted rather than duplicated — one place decides what a srcset looks
 * like.
 */
const splitSources = (image: ImageDTO, format: "avif" | "webp"): Src[] =>
  image.sources
    .filter((s) => s.format === format)
    .sort((a, b) => a.width - b.width)
    .map((s) => ({ w: s.width, url: s.url }));

/* ── Emit ─────────────────────────────────────────────────────────────── */

const json = (v: unknown) => JSON.stringify(v, null, 2).replace(/\n/g, "\n  ");

const HEADER = (from: string) => `/**
 * GENERATED by scripts/fetch-content.ts — do not edit by hand.
 *
 * Source: ${from}
 *
 * Until Phase B4 this file was generated from image files on disk. It is
 * now generated from Postgres, through the /v1 contract, with every URL
 * pointing at object storage. The export shapes are unchanged, which is
 * why no component needed touching.
 *
 * To change what appears here, edit the collection — not this file.
 */
`;

function platesModule(byslug: Map<string, CollectionDTO>): string {
  const features = byslug.get("features")?.items ?? [];
  const press = byslug.get("press")?.items ?? [];
  const contact = byslug.get("contact-sheet")?.items ?? [];

  const featureIds = features.map((i) => `"${i.key}"`).join("\n  | ");

  return `${HEADER("/v1/collections/{features,press,contact-sheet}")}
export type PlateSource = { w: number; url: string };
export type PlateAsset = {
  id: string;
  alt: string;
  width: number;
  height: number;
  /** null means "intrinsic size, no design frame" — a scan, not a crop. */
  ratio: string | null;
  plate: number | null;
  caption: string[];
  lqip: string;
  avif: PlateSource[];
  webp: PlateSource[];
  outlet?: string;
  year?: number;
};

/** Stable editorial handles. A key names a ROLE, not a picture — so
 *  reordering the collection cannot change which plate is the hero. */
export type FeatureId =
  | ${featureIds};

export const FEATURES: Record<FeatureId, PlateAsset> = ${json(
    Object.fromEntries(features.map((i) => [i.key, toPlate(i)])),
  )};

export const PRESS: PlateAsset[] = ${json(press.map(toPlate))};

export const CONTACT_SHEET: PlateAsset[] = ${json(contact.map(toPlate))};
`;
}

function showcaseModule(byslug: Map<string, CollectionDTO>): string {
  const keyfacts = byslug.get("key-facts")?.items ?? [];
  const gallery = byslug.get("gallery")?.items ?? [];
  const assembly = byslug.get("assembly")?.items ?? [];

  return `${HEADER("/v1/collections/{key-facts,gallery,assembly}")}
export type ShowcaseSource = { w: number; url: string };
export type ShowcaseAsset = {
  id: string;
  alt: string;
  width: number;
  height: number;
  /** null means "intrinsic size, no design frame" — a scan, not a crop. */
  ratio: string | null;
  lqip: string;
  avif: ShowcaseSource[];
  webp: ShowcaseSource[];
  title?: string;
  year?: number;
  note?: string;
  caption?: string;
};

export const KEYFACTS: ShowcaseAsset[] = ${json(keyfacts.map(toShowcase))};

export const GALLERY: ShowcaseAsset[] = ${json(gallery.map(toShowcase))};

export const ASSEMBLY: ShowcaseAsset[] = ${json(assembly.map(toShowcase))};
`;
}

/**
 * The current committee, flattened just enough for a page to render it
 * without knowing anything about the API.
 *
 * The nesting is kept — group → section → people is the structure the
 * club actually publishes, and flattening it here would only force the
 * page to rebuild it. What IS flattened is the image: srcsets are split
 * per format, exactly as for plates and showcase assets.
 *
 * `portrait` is optional and that is load-bearing. Two of the 84 posters
 * for the 11th committee have an empty frame — the person's name and role
 * were set and no photograph was ever placed. They are members of the
 * committee and must appear on the page; the page just has nothing to
 * show for them.
 */
function shapeCommittee(committee: CommitteeDTO) {
  return {
    ordinal: committee.ordinal,
    label: committee.label,
    termStart: committee.termStart,
    termEnd: committee.termEnd,
    groups: committee.groups.map((g) => ({
      name: g.name,
      ...(g.note ? { note: g.note } : {}),
      sections: g.sections.map((s) => ({
        name: s.name,
        members: s.members.map((m) => ({
          id: m.id,
          name: m.name,
          designation: m.designation,
          department: m.department,
          batch: m.batch,
          ...(m.portrait
            ? {
                portrait: {
                  alt: m.portrait.alt,
                  width: m.portrait.width,
                  height: m.portrait.height,
                  lqip: m.portrait.lqip,
                  avif: splitSources(m.portrait, "avif"),
                  webp: splitSources(m.portrait, "webp"),
                },
              }
            : {}),
        })),
      })),
    })),
  };
}

function committeeModule(committee: CommitteeDTO): string {
  return `${HEADER(`/v1/committees?current=true`)}
export type Portrait = {
  alt: string;
  width: number;
  height: number;
  lqip: string;
  avif: { w: number; url: string }[];
  webp: { w: number; url: string }[];
};

export type CommitteeMember = {
  id: string;
  name: string;
  designation: string;
  /** Null means not recorded. The posters carry neither. */
  department: string | null;
  batch: string | null;
  /** Absent when the announcement poster had an empty frame. */
  portrait?: Portrait;
};

export type CommitteeSection = { name: string; members: CommitteeMember[] };
export type CommitteeGroup = { name: string; note?: string; sections: CommitteeSection[] };

export type Committee = {
  ordinal: number;
  label: string;
  /** Null when the term years are not recorded anywhere. */
  termStart: number | null;
  termEnd: number | null;
  groups: CommitteeGroup[];
};

export const COMMITTEE: Committee = ${json(shapeCommittee(committee))};
`;
}

/**
 * ══════════════════════════════════════════════════════════════════════
 * EVERY COMMITTEE, NOT JUST THE CURRENT ONE.
 *
 * Three artefacts come out of this, and the split between them is the
 * whole design:
 *
 *   committees/<n>.generated.ts   one committee, in full
 *   committees.generated.ts       the INDEX — ordinal, label, term, count
 *   committee.generated.ts        the current committee (unchanged)
 *
 * ── WHY NOT ONE MODULE WITH ALL OF THEM ──
 * A committee is roughly 85 members, each carrying a base64 blur
 * placeholder. One module holding every committee would be imported by
 * the masthead — which is on every page — and would therefore ship the
 * entire archive to the front page, the events page and everything else.
 * That grows without limit as the club adds a committee a year.
 *
 * The index carries four scalars per committee and nothing else, so the
 * navigation can list every term for the cost of a few hundred bytes.
 * The full rosters sit behind per-ordinal dynamic imports, and with
 * `output: "export"` each statically rendered route embeds only the one
 * it asked for.
 *
 * The current committee's module RE-EXPORTS rather than repeating it:
 * committee.generated.ts already holds it, and two copies of the same 85
 * people in the repository is the kind of thing that silently disagrees
 * six months later.
 */
function committeeIndexModule(all: CommitteeDTO[], currentOrdinal: number): string {
  const summaries = all.map((c) => ({
    ordinal: c.ordinal,
    label: c.label,
    termStart: c.termStart,
    termEnd: c.termEnd,
    members: c.groups.reduce(
      (n, g) => n + g.sections.reduce((m, s) => m + s.members.length, 0),
      0,
    ),
    current: c.ordinal === currentOrdinal,
  }));

  const loaders = all
    .map((c) => `  ${c.ordinal}: () => import("./committees/${c.ordinal}.generated"),`)
    .join("\n");

  return `${HEADER(`/v1/committees`)}
import type { Committee } from "./committee.generated";

export type CommitteeSummary = {
  ordinal: number;
  label: string;
  /** Null when the term years are not recorded anywhere. */
  termStart: number | null;
  termEnd: number | null;
  /** Members on record. Zero is a real answer: a committee can be created
   *  before anyone has been entered against it. */
  members: number;
  current: boolean;
};

/** Newest first — the order a reader wants and the order a menu wants. */
export const COMMITTEES: CommitteeSummary[] = ${json(summaries)};

export const CURRENT_ORDINAL = ${currentOrdinal};

/**
 * Per-ordinal dynamic imports, written out one by one rather than built
 * from a template string. A template literal here would make webpack
 * emit a context module covering every match, which is exactly the
 * bundle-everything behaviour the split above exists to avoid.
 */
const LOADERS: Record<number, () => Promise<{ COMMITTEE: Committee }>> = {
${loaders}
};

export async function loadCommittee(ordinal: number): Promise<Committee | null> {
  const load = LOADERS[ordinal];
  if (!load) return null;
  return (await load()).COMMITTEE;
}
`;
}

/** One committee, in full. The current one re-exports rather than repeats. */
function oneCommitteeModule(committee: CommitteeDTO, isCurrent: boolean): string {
  if (isCurrent) {
    return `${HEADER(`/v1/committees/${committee.ordinal}`)}
/* The current committee already has a module. Re-exported rather than
   repeated, so the two can never drift apart. */
export { COMMITTEE } from "../committee.generated";
`;
  }
  return `${HEADER(`/v1/committees/${committee.ordinal}`)}
import type { Committee } from "../committee.generated";

export const COMMITTEE: Committee = ${json(shapeCommittee(committee))};
`;
}

/**
 * ══════════════════════════════════════════════════════════════════════
 * THE EVENTS FEED, AND EVERY EVENT IN IT.
 *
 * Same split as the committees, for the same reason: the feed needs a
 * cover and a sentence from all sixty-five, and an article needs one
 * body and up to thirty photographs from exactly one. Putting both in a
 * single module would ship every gallery on the site to every route.
 *
 * ── THE MARKDOWN IS RENDERED HERE, NOT IN THE BROWSER ──
 * Bodies are authored markdown. Rendering at build time means no parser
 * in the client bundle, no flash of unstyled source, and — the part that
 * matters — the escaping in lib/markdown.ts runs once, here, over input
 * that is already at rest. The pages receive inert HTML strings.
 */
function toImage(image: ImageDTO) {
  return {
    alt: image.alt,
    width: image.width,
    height: image.height,
    lqip: image.lqip,
    avif: image.sources.filter((s) => s.format === "avif").sort((a, b) => a.width - b.width)
      .map((s) => ({ w: s.width, url: s.url })),
    webp: image.sources.filter((s) => s.format === "webp").sort((a, b) => a.width - b.width)
      .map((s) => ({ w: s.width, url: s.url })),
  };
}

/* ── The write-up ─────────────────────────────────────────────────────
 *
 * TWO STORED FORMATS, ONE OUTPUT, AND BOTH RENDERED HERE RATHER THAN IN
 * THE BROWSER.
 *
 *   md    the archive — ~400 entries authored as markdown
 *   doc   what the admin editor writes since migration 0014: the editor's
 *         own document tree, which is the only format that can carry a
 *         font, a colour, an alignment, an inline photograph or a video
 *
 * Neither renderer ships to a reader. Both escape every byte of author
 * input before emitting a tag, and the page receives a finished string.
 *
 * ── WHY AN INLINE PICTURE IS AN ASSET ID AND NOT A URL ──
 * Because a URL is one fixed-size JPEG. Resolving the id HERE, against
 * the ImageDTOs the API already sent, is what lets an inline photograph
 * publish as a <picture> with the same AVIF/WebP derivative ladder, LQIP
 * and explicit dimensions as the cover — content-addressed storage keys
 * cannot be computed from an id and a width, so the derivative list has
 * to travel with the image and be joined up at build time.
 */

/** An ImageDTO in the shape the rich-text renderer wants. */
function toRichImage(image: ImageDTO): RichImage {
  const sized = (format: "avif" | "webp") =>
    image.sources
      .filter((s) => s.format === format)
      .sort((a, b) => a.width - b.width)
      .map((s) => ({ w: s.width, url: s.url }));
  return {
    src: image.url,
    alt: image.alt,
    width: image.width,
    height: image.height,
    lqip: image.lqip,
    avif: sized("avif"),
    webp: sized("webp"),
  };
}

type Body = { html: string; plain: string; inline: string[] };

/* Rendered once per event, not twice. The feed card wants `plain` and
   the article wants `html`, and they are generated by separate passes —
   without this, every write-up on the site was rendered a second time to
   produce a 200-character excerpt of itself. */
const bodyCache = new WeakMap<EventDTO, Body>();

function eventBody(e: EventDTO): Body {
  const hit = bodyCache.get(e);
  if (hit) return hit;
  const computed = renderBody(e);
  bodyCache.set(e, computed);
  return computed;
}

function renderBody(e: EventDTO): Body {
  if (!e.body.content) return { html: "", plain: "", inline: [] };

  if (e.body.format === "doc") {
    const doc = parseRichDoc(e.body.content);
    if (!doc) {
      // The column says 'doc' and does not hold one. Publishing the raw
      // JSON as prose would be worse than publishing nothing, and silence
      // would hide a real corruption, so it is named and skipped.
      console.warn(`  ! ${e.slug}: body_format is 'doc' but the content is not a document`);
      return { html: "", plain: "", inline: [] };
    }

    /* Every photograph the API sent with this event, by id. An inline
       picture must be one of them — the editor attaches what it inserts,
       which is what puts the derivatives in reach here. */
    const pool = new Map<string, ImageDTO>();
    for (const g of e.gallery) pool.set(g.id, g);
    pool.set(e.cover.id, e.cover);

    const unresolved: string[] = [];
    const html = renderRichDoc(doc, {
      // Throw rather than quietly drop a node this build was never
      // taught. A missing paragraph nobody notices for a year is the
      // failure mode worth spending a broken build to avoid.
      strict: true,
      image: (id) => {
        const dto = pool.get(id);
        if (!dto) {
          unresolved.push(id);
          return null;
        }
        return toRichImage(dto);
      },
    });

    if (unresolved.length) {
      console.warn(
        `  ! ${e.slug}: ${unresolved.length} inline photograph(s) are not attached to this ` +
          `event and were left out. Re-open it in the admin panel and save.`,
      );
    }

    return { html, plain: richDocToText(doc), inline: collectAssetIds(doc) };
  }

  // 'md', and 'html' — which nothing writes and which renders as nothing
  // rather than as author-supplied markup. See migration 0014.
  return {
    html: e.body.format === "md" ? renderMarkdown(e.body.content) : "",
    plain: stripMarkdown(e.body.content),
    inline: [],
  };
}

/** The year an event is filed under: its own date when there is one, the
 *  edition when the edition IS a year, and null rather than a guess. */
function eventYear(e: EventDTO): string | null {
  if (e.dates.start) return e.dates.start.slice(0, 4);
  if (e.edition && /^(19|20)\d{2}$/.test(e.edition)) return e.edition;
  return null;
}

const EVENT_TYPES = `export type EventImage = {
  alt: string;
  width: number;
  height: number;
  lqip: string;
  avif: { w: number; url: string }[];
  webp: { w: number; url: string }[];
};

export type EventCard = {
  slug: string;
  title: string;
  /** Absent when the entry is photographs and a title only. */
  excerpt?: string;
  category: string;
  /** The display name — "Member recruitment", not "recruitment". Carried
   *  rather than derived: title-casing a slug turns "agm" into "Agm",
   *  and a category the club adds itself can be spelled any way it
   *  likes. See migration 0015. */
  categoryName: string;
  /** Present only when the category is a subcategory. */
  categoryParent?: { slug: string; name: string };
  series?: string;
  edition?: string;
  /** Null when nobody recorded when this happened — see migration 0010. */
  year: string | null;
  date?: string;
  cover: EventImage;
};
`;

function eventsIndexModule(events: EventDTO[]): string {
  const cards = events.map((e) => ({
    slug: e.slug,
    title: e.title,
    // The feed card's text. There is no excerpt column that ever reached
    // a reader (see the admin editor's header), so it is the opening of
    // the write-up — in whichever format the write-up is stored.
    ...(e.body.content ? { excerpt: eventBody(e).plain.slice(0, 200) } : {}),
    category: e.category,
    categoryName: e.categoryName,
    ...(e.categoryParent ? { categoryParent: e.categoryParent } : {}),
    ...(e.series ? { series: e.series } : {}),
    ...(e.edition ? { edition: e.edition } : {}),
    year: eventYear(e),
    ...(e.dates.start ? { date: e.dates.start } : {}),
    cover: toImage(e.cover),
  }));

  /* Slug + name pairs. A subcategory is offered under its own name and
     its parent is offered too — the API returns a parent's children with
     it, so choosing "Workshop" also shows everything filed under "Basic
     Workshop". */
  const catMap = new Map<string, string>();
  for (const e of events) {
    catMap.set(e.category, e.categoryName);
    if (e.categoryParent) catMap.set(e.categoryParent.slug, e.categoryParent.name);
  }
  const byCategory = [...catMap]
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const byYear = [...new Set(events.map((e) => eventYear(e)).filter(Boolean))].sort().reverse();

  return `${HEADER(`/v1/events`)}
${EVENT_TYPES}
/** Newest first. Undated entries sort last — the API orders them that
 *  way and this preserves it. */
export const EVENTS: EventCard[] = ${json(cards)};

/** The filters the feed offers, derived from what is actually there
 *  rather than from the enum — a category with no events in it is a
 *  button that returns nothing. */
export const EVENT_CATEGORIES: { slug: string; name: string }[] = ${json(byCategory)};
export const EVENT_YEARS: string[] = ${json(byYear)};
`;
}

/**
 * The per-slug loader map, in its own module.
 *
 * Separate from events.generated.ts because that one is imported by the
 * feed — which every visitor loads — and this one is imported only by the
 * article route. Written out entry by entry rather than built from a
 * template literal: a template would make webpack emit a context module
 * covering every event, which is the bundle-everything behaviour the
 * split exists to prevent.
 */
function eventsLoaderModule(events: EventDTO[]): string {
  const entries = events
    .map((e) => `  ${JSON.stringify(e.slug)}: () => import("./events/${e.slug}.generated"),`)
    .join("\n");

  return `${HEADER(`/v1/events`)}
import type { EventArticle } from "./events/${events[0]?.slug ?? "none"}.generated";

export type { EventArticle };

const LOADERS: Record<string, () => Promise<{ EVENT: EventArticle }>> = {
${entries}
};

export async function loadEvent(slug: string): Promise<EventArticle | null> {
  const load = LOADERS[slug];
  if (!load) return null;
  return (await load()).EVENT;
}
`;
}

function eventModule(e: EventDTO): string {
  const body = eventBody(e);
  const shaped = {
    slug: e.slug,
    title: e.title,
    category: e.category,
    ...(e.series ? { series: e.series } : {}),
    ...(e.edition ? { edition: e.edition } : {}),
    year: eventYear(e),
    ...(e.dates.start ? { date: e.dates.start } : {}),
    ...(e.dates.end ? { endDate: e.dates.end } : {}),
    ...(e.venue ? { venue: e.venue } : {}),
    ...(e.platform ? { platform: e.platform } : {}),
    ...(e.theme ? { theme: e.theme } : {}),
    ...(e.presentedBy ? { presentedBy: e.presentedBy } : {}),
    ...(e.eligibility ? { eligibility: e.eligibility } : {}),
    ...(e.segments?.length ? { segments: e.segments } : {}),
    categoryName: e.categoryName,
    ...(e.categoryParent ? { categoryParent: e.categoryParent } : {}),
    copySource: e.copySource,
    /** Pre-rendered, escaped HTML. See lib/markdown.ts and
     *  lib/richtext/render.ts — every byte was escaped before a tag
     *  was added, by whichever of the two rendered it. */
    html: body.html,
    plain: body.plain,
    cover: toImage(e.cover),
    /* A photograph placed IN the article is not also a thumbnail under
       it. Without this, inserting a picture inline showed it twice —
       once where the writer put it and once in the contact sheet — which
       reads as a mistake rather than as emphasis. The contact sheet
       keeps everything the article did not use. */
    gallery: e.gallery.filter((g) => !body.inline.includes(g.id)).map(toImage),
  };

  return `${HEADER(`/v1/events/${e.slug}`)}
import type { EventImage } from "../events.generated";

export type EventSegment = { name: string; description: string; eligibility?: string };

export type EventArticle = {
  slug: string;
  title: string;
  category: string;
  /** The display name — "Member recruitment", not "recruitment". Carried
   *  rather than derived: title-casing a slug turns "agm" into "Agm",
   *  and a category the club adds itself can be spelled any way it
   *  likes. See migration 0015. */
  categoryName: string;
  /** Present only when the category is a subcategory. */
  categoryParent?: { slug: string; name: string };
  series?: string;
  edition?: string;
  year: string | null;
  date?: string;
  endDate?: string;
  venue?: string;
  platform?: string;
  theme?: string;
  presentedBy?: string;
  eligibility?: string;
  segments?: EventSegment[];
  copySource: "web-ready" | "derived" | "authored";
  /** Already escaped and rendered at build time. */
  html: string;
  plain: string;
  cover: EventImage;
  gallery: EventImage[];
};

export const EVENT: EventArticle = ${json(shaped)};
`;
}

/* ── Main ─────────────────────────────────────────────────────────────── */

let collections: CollectionDTO[];
try {
  collections = await brs.collections.list();
} catch (e) {
  console.error(`\n  Cannot reach the API at ${process.env.NEXT_PUBLIC_BRS_API}`);
  console.error(`  ${(e as Error).message}`);
  console.error(`\n  Start it with:  pnpm --filter @brs/api dev\n`);
  process.exit(1);
}

const bySlug = new Map(collections.map((c) => [c.slug, c]));

const REQUIRED = ["features", "press", "contact-sheet", "key-facts", "gallery", "assembly"];
const missing = REQUIRED.filter((s) => !bySlug.has(s));
if (missing.length) {
  // Emitting a module with an empty FEATURES would produce `Record<never,
  // PlateAsset>` and a page that builds but renders nothing. Failing here
  // is the only way that stays visible.
  console.error(`\n  Missing collections: ${missing.join(", ")}`);
  console.error(`  Seed them with:  pnpm --filter @brs/db seed:collections\n`);
  process.exit(1);
}

const [current] = await brs.committees.current();
if (!current) {
  // A committee page that builds with nobody on it is worse than a build
  // that stops and says why.
  console.error(`\n  No committee is marked current.`);
  console.error(`  Load one with:  pnpm --filter @brs/db seed:committee -- --write\n`);
  process.exit(1);
}

const all = await brs.committees.list();
// Newest first. The API orders by ordinal ascending; every reader of this
// list — the menu, the archive page — wants the reverse.
all.sort((a, b) => b.ordinal - a.ordinal);

await mkdir(path.join(LIB, "committees"), { recursive: true });

/* Every published event, in feed order. `limit` is the API's maximum;
   the club has 65 events and will not have 500 before someone revisits
   this, but a silent truncation would be the worst possible failure so
   it is asserted rather than assumed. */
const eventPage = await brs.events.list({ limit: 100 });
if (eventPage.data.length < eventPage.total) {
  console.error(
    `\n  Only ${eventPage.data.length} of ${eventPage.total} events fetched.` +
      `\n  Raise the limit in fetch-content.mts before this ships.\n`,
  );
  process.exit(1);
}
const eventList = eventPage.data;
await mkdir(path.join(LIB, "events"), { recursive: true });

const targets: [string, string][] = [
  [path.join(LIB, "plates.generated.ts"), platesModule(bySlug)],
  [path.join(LIB, "showcase.generated.ts"), showcaseModule(bySlug)],
  [path.join(LIB, "committee.generated.ts"), committeeModule(current)],
  [path.join(LIB, "events.generated.ts"), eventsIndexModule(eventList)],
  [path.join(LIB, "events.load.generated.ts"), eventsLoaderModule(eventList)],
  ...eventList.map(
    (e): [string, string] => [
      path.join(LIB, "events", `${e.slug}.generated.ts`),
      eventModule(e),
    ],
  ),
  [path.join(LIB, "committees.generated.ts"), committeeIndexModule(all, current.ordinal)],
  ...all.map(
    (c): [string, string] => [
      path.join(LIB, "committees", `${c.ordinal}.generated.ts`),
      oneCommitteeModule(c, c.ordinal === current.ordinal),
    ],
  ),
];

let stale = 0;
for (const [file, content] of targets) {
  const current = await readFile(file, "utf8").catch(() => "");
  const changed = current !== content;

  if (CHECK_ONLY) {
    if (changed) stale++;
    console.log(`  ${changed ? "STALE  " : "current"}  ${path.basename(file)}`);
    continue;
  }

  if (changed) await writeFile(file, content, "utf8");
  console.log(`  ${changed ? "written" : "no change"}  ${path.basename(file)}`);
}

/**
 * ── AND REMOVE THE MODULES THAT NO LONGER HAVE ANYTHING BEHIND THEM ──
 *
 * Writing was only ever half of it. Unpublish an event and its index entry
 * and loader line disappear, but `events/<slug>.generated.ts` stayed on
 * disk for good — so the full text of something deliberately taken off the
 * site remained in the source tree, and got committed.
 *
 * Nothing imports it, so it never reached a visitor. That is the reason it
 * went unnoticed and not a reason to leave it: "unpublished" has to mean
 * the words are gone from the build, not that no page happens to link to
 * them.
 *
 * Only files this script generates are considered — the directories hold
 * nothing else, and the suffix is checked rather than assumed.
 */
for (const [dir, keep] of [
  ["events", new Set(eventList.map((e) => `${e.slug}.generated.ts`))],
  ["committees", new Set(all.map((c) => `${c.ordinal}.generated.ts`))],
] as const) {
  const present = await readdir(path.join(LIB, dir)).catch(() => [] as string[]);
  for (const name of present) {
    if (!name.endsWith(".generated.ts") || keep.has(name)) continue;
    if (CHECK_ONLY) {
      stale++;
      console.log(`  ORPHAN   ${dir}/${name}`);
      continue;
    }
    await rm(path.join(LIB, dir, name));
    console.log(`  removed  ${dir}/${name}`);
  }
}

const counts = REQUIRED.map((s) => `${s} ${bySlug.get(s)!.items.length}`).join(" · ");
const people = current.groups.flatMap((g) => g.sections.flatMap((s) => s.members));
const withoutPortrait = people.filter((m) => !m.portrait);
console.log(`\n  ${counts}`);
console.log(
  `  ${current.label} — ${people.length} people in ${current.groups.length} groups` +
    (withoutPortrait.length
      ? `, ${withoutPortrait.length} without a portrait (${withoutPortrait
          .map((m) => m.name)
          .join(", ")})`
      : ""),
);
if (current.termStart === null) {
  console.log(`  ⚠ ${current.label} has no term years recorded — the page will omit them.`);
}
console.log("");

if (CHECK_ONLY && stale) {
  console.error(`  ${stale} file(s) out of date. Run: pnpm --filter @brs/web content\n`);
  process.exit(1);
}
