/**
 * ══════════════════════════════════════════════════════════════════════
 * THE BRS CONTENT CONTRACT — v1
 * implementation_plan.md §7.
 *
 * These DTOs are the decoupling boundary. Rules:
 *
 *  1. FRONTEND-AGNOSTIC. No CMS field names, no junction tables, no `meta`
 *     envelopes. A DTO must make sense to a frontend that has never heard
 *     of Directus.
 *  2. VERSIONED IN THE PATH. Breaking changes create /v2. This file is /v1
 *     and stays servable for >= 6 months after any successor ships.
 *  3. ADDITIVE-ONLY within a version. New OPTIONAL fields are fine.
 *     Renames, removals, and type changes are not. CI diffs the generated
 *     OpenAPI and fails on a breaking change.
 *  4. ASSETS ARE FAÇADE-ISSUED URLS. Never a storage-provider URL, so
 *     R2 <-> Azure Blob <-> S3 stays a config change.
 *
 * PRIVACY: MemberDTO has no contact field. Not "we omit it in the
 * serialiser" — it does not exist in the type, the DB view, or the schema.
 * Privacy enforced by the type system, not by reviewer vigilance.
 * See §12.1 control 3.
 * ══════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";

/* ── Primitives ───────────────────────────────────────────────────────── */

export const IsoDate = z.string().describe("ISO-8601 date, e.g. 2024-02-01");

/** Fixed crop ratios. Arbitrary ratios are a design-system violation
 *  (PROJECT_SPEC.md §5.6). */
export const AspectRatio = z.enum(["1:1", "3:2", "16:9", "4:5"]);

/**
 * Alt text is required and must be substantive.
 *
 * `alt="photo"` or a filename dump is a defect (PROJECT_SPEC.md §5.6).
 * The 12-character floor is also enforced as a CHECK constraint in
 * Postgres, so unlabelled images cannot exist even if this layer is
 * bypassed. ~1,105 archive images need real alt text; the constraint keeps
 * that debt visible instead of silently skipped.
 */
const IMAGE_FILENAME = /\.(jpe?g|png|webp|avif|heic|gif|tiff?)$/i;
const PLACEHOLDER_ALT = /^(photo|image|picture|img|untitled|thumbnail|dsc|screenshot)\b/i;

export const AltText = z
  .string()
  .min(12, "Alt text must be substantive (>= 12 chars), not 'photo' or a filename")
  .max(280)
  // A length floor alone is not enough: "IMG_6738.JPG" is exactly 12
  // characters. The archive is full of such names and pasting one into an
  // alt attribute is the most likely way this debt gets faked at scale.
  .refine((v) => !IMAGE_FILENAME.test(v.trim()), {
    message: "Alt text looks like a filename. Describe what the photograph shows.",
  })
  .refine((v) => !PLACEHOLDER_ALT.test(v.trim()), {
    message: "Alt text is a placeholder. Describe the subject, not the medium.",
  })
  // Substantive means a phrase, not a token. Three words is the floor at
  // which alt text starts carrying information for a screen-reader user.
  .refine((v) => v.trim().split(/\s+/).length >= 3, {
    message: "Alt text must be at least three words.",
  });

/* ── Image ────────────────────────────────────────────────────────────── */

export const ImageDTO = z.object({
  id: z.string(),
  /** Façade-issued. Provider-agnostic by construction. */
  url: z.string(),
  alt: AltText,
  /** Always present, so every <Image> can set explicit dimensions.
   *  This is how CLS < 0.02 survives (§4.7). */
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  /** Inline base64 LQIP placeholder. */
  lqip: z.string(),
  /** Museum placard number. §5.9.1 */
  plate: z.number().int().positive().optional(),
  ratio: AspectRatio,
  credit: z.string().optional(),
});
export type ImageDTO = z.infer<typeof ImageDTO>;

/* ── Events ───────────────────────────────────────────────────────────── */

export const EventCategory = z.enum([
  "workshop",
  "competition",
  "robo-carnival",
  "intra-buet",
  "seminar",
  "reception",
  "agm",
  "co-organised",
]);

export const EventSegment = z.object({
  name: z.string(),
  description: z.string(),
  eligibility: z.string().optional(),
});

export const EventDTO = z.object({
  slug: z.string(),
  title: z.string(),
  category: EventCategory,
  /** "Basic Workshop", "Robo Carnival" — the series this belongs to. */
  series: z.string().optional(),
  /** "v8.0", "2024" */
  edition: z.string().optional(),
  dates: z.object({ start: IsoDate, end: IsoDate.optional() }),
  venue: z.string().optional(),
  platform: z.string().optional(),
  theme: z.string().optional(),
  presentedBy: z.string().optional(),
  eligibility: z.string().optional(),
  segments: z.array(EventSegment).optional(),
  cover: ImageDTO,
  gallery: z.array(ImageDTO).default([]),
  /** Drive album, retained as a clearly-labelled secondary link. Drive is
   *  an ingestion source, never a gallery backend (§9.6). */
  externalAlbum: z.string().url().optional(),
  body: z.object({ format: z.enum(["html", "md"]), content: z.string() }),
  /** Provenance, so it is always visible which pages still carry copy
   *  derived from Facebook promos rather than authored prose (§10.1). */
  copySource: z.enum(["web-ready", "derived", "authored"]),
  status: z.enum(["past", "upcoming"]).default("past"),
  featured: z.boolean().default(false),
  updatedAt: IsoDate,
});
export type EventDTO = z.infer<typeof EventDTO>;

/* ── Members & committees ─────────────────────────────────────────────── */

/**
 * NO CONTACT FIELD. This absence is the contract's most important feature.
 *
 * ~470 students' mobile numbers sit in the source rosters. Adding a phone
 * field here would be the single highest-severity defect possible on this
 * project. If you are reading this because you need to surface a contact
 * number: use an official club address, never a personal number (§12.1).
 */
export const MemberDTO = z.object({
  id: z.string(),
  name: z.string(),
  designation: z.string(),
  department: z.string(),
  /** Club convention with a typographic apostrophe: "EEE '20" (U+2019). */
  batch: z.string(),
  committeeOrdinal: z.number().int().positive(),
  team: z.string().optional(),
  portrait: ImageDTO.optional(),
});
export type MemberDTO = z.infer<typeof MemberDTO>;

export const CommitteeTeamDTO = z.object({
  name: z.string(),
  members: z.array(MemberDTO),
});

export const CommitteeDTO = z.object({
  /** 3..10 documented. 1st, 2nd and 6th are absent from the archive and
   *  the gap is stated explicitly rather than concealed (§16.1). */
  ordinal: z.number().int().positive(),
  label: z.string(),
  termStart: z.number().int(),
  termEnd: z.number().int(),
  moderator: z.object({
    name: z.string(),
    title: z.string(),
    department: z.string(),
  }),
  groups: z.array(CommitteeTeamDTO),
  isCurrent: z.boolean().default(false),
});
export type CommitteeDTO = z.infer<typeof CommitteeDTO>;

/* ── Achievements ─────────────────────────────────────────────────────── */

/**
 * `verified` defaults FALSE and nothing renders as a placement until a
 * human sets it true. This makes fabricated results structurally
 * impossible (§8, §17.4).
 *
 * At time of writing the Panasonic Award (ABU Robocon 2005) is the ONLY
 * placement evidenced anywhere in the 2 GB archive. Everything else is
 * participation until alumni outreach confirms otherwise (§16.2).
 */
export const AchievementDTO = z.object({
  id: z.string(),
  year: z.number().int(),
  programme: z.string(),
  host: z.string().optional(),
  teamName: z.string().optional(),
  /** Null means "participated, result unknown" — never "no award". */
  result: z.string().nullable(),
  track: z.enum(["international", "national", "hosted"]),
  relatedEventSlug: z.string().optional(),
  evidence: z.array(ImageDTO).default([]),
  verified: z.boolean().default(false),
});
export type AchievementDTO = z.infer<typeof AchievementDTO>;

/* ── Projects (Team NUVOLA) ───────────────────────────────────────────── */

export const ProjectDTO = z.object({
  slug: z.string(),
  name: z.string(),
  /** Museum catalogue designation, e.g. "NVL-01". Must be a real club
   *  designation, not invented (§5.9.6, §16.4). */
  specimenCode: z.string().optional(),
  mission: z.string(),
  subsystems: z
    .array(z.object({ name: z.string(), detail: z.string() }))
    .default([]),
  team: z.array(MemberDTO).default([]),
  gallery: z.array(ImageDTO).default([]),
  achievements: z.array(AchievementDTO).default([]),
});
export type ProjectDTO = z.infer<typeof ProjectDTO>;

/* ── Editorial ────────────────────────────────────────────────────────── */

export const PostDTO = z.object({
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  body: z.object({ format: z.enum(["html", "md"]), content: z.string() }),
  author: z.object({ name: z.string(), batch: z.string().optional() }),
  publishedAt: IsoDate,
  tags: z.array(z.string()).default([]),
  cover: ImageDTO.optional(),
  readingMinutes: z.number().int().positive(),
});
export type PostDTO = z.infer<typeof PostDTO>;

export const PartnerDTO = z.object({
  id: z.string(),
  name: z.string(),
  tier: z.enum(["presenting", "powered-by", "partner", "co-organiser"]),
  logo: ImageDTO.optional(),
  years: z.array(z.number().int()).default([]),
  url: z.string().url().optional(),
});
export type PartnerDTO = z.infer<typeof PartnerDTO>;

export const PressDTO = z.object({
  id: z.string(),
  outlet: z.string(),
  headline: z.string().optional(),
  publishedOn: IsoDate,
  scan: ImageDTO,
  relatedEventSlug: z.string().optional(),
  url: z.string().url().optional(),
});
export type PressDTO = z.infer<typeof PressDTO>;

/* ── Stats ────────────────────────────────────────────────────────────── */

/**
 * Exists specifically so §2.3 cannot happen again.
 *
 * The discarded prototype hardcoded "480+ ACTIVE MEMBERS" (false — 480 is
 * every roster row across seven HISTORICAL committees; the current one is
 * ~52) and "10 EXECUTIVE COMMITTEES" (unsupported — seven are documented).
 *
 * Every field here is COMPUTED from content at build time. No component
 * may render a hand-typed figure; lint rule `brs/no-hardcoded-stats`
 * enforces it. No `+` suffixes anywhere — precision is the brand.
 */
export const StatsDTO = z.object({
  committeesDocumented: z.number().int(),
  currentCommitteeSize: z.number().int(),
  workshops: z.number().int(),
  seminars: z.number().int(),
  internationalProgrammes: z.number().int(),
  nationalContests: z.number().int(),
  hostedEventEditions: z.number().int(),
  archivePhotographs: z.number().int(),
  verifiedAwards: z.number().int(),
  earliestEvidenceYear: z.number().int(),
  yearsActive: z.number().int(),
  computedAt: IsoDate,
});
export type StatsDTO = z.infer<typeof StatsDTO>;

/* ── Envelopes ────────────────────────────────────────────────────────── */

export const Paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    nextCursor: z.string().nullable(),
    total: z.number().int(),
  });

export const CONTRACT_VERSION = "v1" as const;
