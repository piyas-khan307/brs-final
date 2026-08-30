/**
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THE ADMIN PANEL LOOKS LIKE, AS DATA.
 *
 * Directus reflects whatever tables it finds, so out of the box it shows
 * 21 raw table names — `committee_sections`, `asset_derivatives`,
 * `schema_migrations` — in one flat alphabetical list. That is a database
 * browser, not an admin panel, and it is how an editor ends up editing
 * the wrong thing.
 *
 * This file is the translation layer: plain English names, an explanation
 * on every collection that needs one, machine-generated tables hidden, and
 * four folders so related things sit together.
 *
 * It is DATA, not calls, so the whole configuration can be read in one
 * sitting and diffed in a review. configure.mjs applies it.
 * ══════════════════════════════════════════════════════════════════════
 */

/** Folders, in the order they appear down the left-hand side. */
export const FOLDERS = [
  { name: "content", label: "Content", icon: "article" },
  { name: "people", label: "People & Committees", icon: "groups" },
  // Not "Images & Files" — that is the `assets` collection's own name, and
  // a folder sharing its child's label reads as a duplicate in the sidebar.
  { name: "media", label: "Media Library", icon: "photo_library" },
  { name: "technical", label: "Technical — do not edit", icon: "warning" },
];

/**
 * Every application table, named as a person would say it.
 *
 * `hidden` marks tables that exist for the software's benefit rather than
 * an editor's. Hiding is not security — an Administrator can still reach
 * them — it is about what appears in the sidebar on a Tuesday afternoon.
 */
export const COLLECTIONS = [
  /* ── Content ──────────────────────────────────────────────────────── */
  {
    name: "events",
    label: "Events",
    singular: "Event",
    icon: "event",
    folder: "content",
    note: "Workshops, competitions, Robo Carnival, seminars, AGMs — everything the club has run.",
  },
  {
    name: "event_categories",
    label: "Event Categories",
    singular: "Event Category",
    icon: "sell",
    folder: "content",
    note: "The kinds of event the club runs, and the subcategories under them. Add one here or from the category box while writing an event. Two levels only — a subcategory cannot have its own subcategories.",
  },
  {
    name: "event_segments",
    label: "Event Segments",
    singular: "Event Segment",
    icon: "list",
    folder: "content",
    note: "The individual contests inside a larger event, e.g. Line Following inside Robo Carnival.",
  },
  {
    name: "posts",
    label: "Blog Posts",
    singular: "Blog Post",
    icon: "edit_note",
    folder: "content",
    note: "Members write these. A post goes live only after an Administrator approves it.",
  },
  {
    name: "projects",
    label: "Projects",
    singular: "Project",
    icon: "precision_manufacturing",
    folder: "content",
    note: "Robots and builds — Mars rover, line followers, and the teams behind them.",
  },
  {
    name: "achievements",
    label: "Achievements",
    singular: "Achievement",
    icon: "emoji_events",
    folder: "content",
    note:
      "Competition results. Leave 'Result' empty when the outcome is not confirmed — " +
      "that means 'took part, result unverified', never 'did not win'. Nothing shows " +
      "as a placement until 'Verified' is ticked and a source is given.",
  },
  {
    name: "press",
    label: "Press Coverage",
    singular: "Press Item",
    icon: "newspaper",
    folder: "content",
    note: "Newspaper and online coverage of the club.",
  },
  {
    name: "partners",
    label: "Partners & Sponsors",
    singular: "Partner",
    icon: "handshake",
    folder: "content",
  },
  {
    name: "redirects",
    label: "URL Redirects",
    singular: "Redirect",
    icon: "alt_route",
    folder: "content",
    note: "Send an old address to a new one, so links printed on posters keep working.",
  },

  /* ── People & committees ──────────────────────────────────────────── */
  {
    name: "committees",
    label: "Committees",
    singular: "Committee",
    icon: "account_balance",
    folder: "people",
    note:
      "One row per executive committee, e.g. the 11th. Term years may be left empty " +
      "when they are not recorded anywhere — better blank than guessed.",
  },
  {
    name: "committee_groups",
    label: "Committee Sections",
    singular: "Committee Section",
    icon: "workspaces",
    folder: "people",
    note:
      "The parts a committee divides into — Standing Committee, Design Team, Workshop " +
      "Team. Add as many as you need; nothing here is fixed in advance.",
  },
  {
    name: "committee_sections",
    label: "Positions",
    singular: "Position",
    icon: "badge",
    folder: "people",
    note:
      "The positions inside a section — President, Vice President, Treasurer, Head, " +
      "Member. Each one can hold several people, and you can invent new ones freely.",
  },
  {
    name: "members",
    label: "People",
    singular: "Person",
    icon: "person",
    folder: "people",
    note:
      "One row per person, reused across every committee they serve on. " +
      "⚠ Never add a phone number or personal address to this table.",
  },
  {
    name: "memberships",
    label: "Committee Placements",
    singular: "Placement",
    icon: "how_to_reg",
    folder: "people",
    note: "Puts a person in a position on a committee. This is what the committee page reads.",
  },
  {
    name: "moderators",
    label: "Faculty Moderators",
    singular: "Moderator",
    icon: "school",
    folder: "people",
  },

  /* ── Media ────────────────────────────────────────────────────────── */
  {
    name: "assets",
    label: "Images & Files",
    singular: "Image",
    icon: "image",
    folder: "media",
    note:
      "Every photograph on the site. Sizes and formats are produced automatically on " +
      "upload — you never need to resize anything before uploading.",
  },
  {
    name: "documents",
    label: "PDF Documents",
    singular: "Document",
    icon: "picture_as_pdf",
    folder: "media",
    note:
      "PDFs embedded inline in write-ups — reports, posters, handouts. Unlike a " +
      "photograph, nothing is generated on upload: the original file is what the " +
      "reader's browser opens directly.",
  },
  {
    name: "collections",
    label: "Curated Collections",
    singular: "Collection",
    icon: "collections_bookmark",
    folder: "media",
    note: "Hand-picked groups of images that specific parts of the site display.",
  },
  {
    name: "collection_items",
    label: "Collection Items",
    singular: "Collection Item",
    icon: "photo_album",
    folder: "media",
    note: "Which image sits where inside a curated collection, and in what order.",
  },

  /* ── Technical ────────────────────────────────────────────────────── */
  {
    name: "asset_derivatives",
    label: "Generated Image Sizes",
    icon: "auto_awesome_motion",
    folder: "technical",
    hidden: true,
    note: "Written automatically by the uploader. Editing these breaks images on the site.",
  },
  {
    name: "event_assets",
    label: "Event ↔ Image Links",
    icon: "link",
    folder: "technical",
    hidden: true,
  },
  {
    name: "event_documents",
    label: "Event ↔ Document Links",
    icon: "link",
    folder: "technical",
    hidden: true,
  },
  {
    name: "achievement_assets",
    label: "Achievement ↔ Image Links",
    icon: "link",
    folder: "technical",
    hidden: true,
  },
  {
    name: "schema_migrations",
    label: "Schema Migrations",
    icon: "terminal",
    folder: "technical",
    hidden: true,
    note: "A record of which database migrations have run. Never edit this by hand.",
  },
];

/**
 * Field-level wording, for the fields where the raw column name misleads
 * or where a rule needs saying at the point somebody would break it.
 *
 * Only fields worth commenting on appear here. Everything else keeps
 * Directus's own title-casing, which is fine for `title` and `slug`.
 *
 *   readonly  the software writes it; a human editing it causes damage
 *   hidden    noise on the edit screen
 */
export const FIELDS = {
  assets: {
    alt: {
      label: "Description",
      required: true,
      note:
        "Describe what the photograph shows, for people using a screen reader. " +
        "At least three words. 'IMG_4821.jpg' or 'photo' will be rejected — " +
        "say who or what is in it, e.g. 'Line-following robot on the practice track'.",
    },
    credit: { label: "Photographer / Credit", note: "Who took it, if known." },
    published: {
      label: "Show on the website",
      note: "Untick to keep an image in the archive without publishing it.",
    },
    storage_key: { label: "Storage key", readonly: true, note: "Set automatically. Do not edit." },
    checksum: { label: "Checksum", readonly: true, hidden: true },
    lqip: { label: "Blur placeholder", readonly: true, hidden: true },
    provider: { label: "Storage provider", readonly: true, hidden: true },
    mime: { label: "File type", readonly: true },
    width: { label: "Width (px)", readonly: true },
    height: { label: "Height (px)", readonly: true },
    ratio: {
      label: "Aspect ratio",
      readonly: true,
      note: "Detected automatically. Empty means the image is not one of the design shapes.",
    },
    source_ref: { label: "Where it came from", note: "Original filename or folder, for provenance." },
  },

  documents: {
    title: {
      label: "Title",
      required: true,
      note:
        "What the document is — shown in the library and, unless overridden in the " +
        "article, as its caption. At least 12 characters. '1.pdf' will be rejected.",
    },
    credit: { label: "Credit", note: "Who produced it, if known." },
    published: {
      label: "Show on the website",
      note: "Untick to keep a PDF in the archive without publishing it.",
    },
    storage_key: { label: "Storage key", readonly: true, note: "Set automatically. Do not edit." },
    checksum: { label: "Checksum", readonly: true, hidden: true },
    provider: { label: "Storage provider", readonly: true, hidden: true },
    bytes: { label: "File size (bytes)", readonly: true },
    source_ref: { label: "Where it came from", note: "Original filename or folder, for provenance." },
  },

  posts: {
    review_state: {
      label: "Review status",
      note:
        "Members: set this to 'Submitted for review' when your post is ready. " +
        "Only an Administrator can move it to 'Approved'.",
    },
    published: {
      label: "Live on the website",
      note:
        "Administrators only. A post cannot be published until its review status is " +
        "'Approved' — the database itself refuses otherwise.",
    },
    review_note: {
      label: "Reviewer's note",
      note: "If you are sending a post back, say what needs changing. The author sees this.",
    },
    reviewed_by: { label: "Approved by", readonly: true },
    reviewed_at: { label: "Approved at", readonly: true },
    created_by: { label: "Written by (account)", readonly: true, hidden: true },
    author_name: { label: "Byline", note: "The name shown on the post." },
    author_member_id: { label: "Author (person record)" },
    body_format: {
      label: "Body format",
      note:
        "Set by the admin editor — leave it alone. 'doc' is the rich write-up " +
        "(migration 0014), 'md' is an older markdown one. Editing the body here " +
        "rather than in the panel will corrupt a 'doc' row.",
      readonly: true,
    },
    slug: { label: "URL slug", note: "The address of the post, e.g. 'robo-carnival-2024'." },
  },

  members: {
    name: { label: "Full name", required: true },
    department: {
      label: "Department",
      note: "Leave empty if it is not recorded. Do not guess — blank is a true answer.",
    },
    batch: {
      label: "Batch",
      note: "Club convention, e.g. EEE ’20. Leave empty if not recorded.",
    },
    portrait_asset_id: { label: "Portrait" },
  },

  committees: {
    ordinal: { label: "Committee number", note: "11 for the 11th Executive Committee." },
    label: { label: "Full name", note: "e.g. '11th Executive Committee'." },
    term_start: { label: "Term from (year)", note: "Leave empty if not recorded. Fill both or neither." },
    term_end: { label: "Term to (year)", note: "Leave empty if not recorded. Fill both or neither." },
    is_current: { label: "This is the current committee", note: "Only one committee can be current." },
    moderator_id: { label: "Faculty moderator" },
  },

  committee_groups: {
    name: { label: "Section name", note: "e.g. 'Standing Committee', 'Design Team'." },
    note: { label: "Description", note: "Optional line shown above this section on the page." },
    sort_order: { label: "Order", note: "Lower numbers appear first." },
  },

  committee_sections: {
    name: { label: "Position name", note: "e.g. 'President', 'Deputy Head', 'Member'." },
    group_id: { label: "Belongs to section" },
    sort_order: { label: "Order", note: "Lower numbers appear first. Put senior positions first." },
  },

  memberships: {
    member_id: { label: "Person" },
    committee_id: { label: "Committee" },
    section_id: { label: "Position" },
    designation: {
      label: "Title as printed",
      note: "Usually the same as the position. Differs for things like 'Vice President (Technical)'.",
    },
    sort_order: { label: "Order within the position" },
  },

  /* The club's own panel at /admin/events is the intended way in — this
     wording is for the Directus fallback, and it has to agree with it. */
  events: {
    excerpt: {
      label: "Summary",
      note:
        "One or two sentences for the card in the events feed. Between 20 and 320 " +
        "characters, or empty for a photographs-only entry — the database enforces both ends.",
    },
    cover_asset_id: {
      label: "Cover photograph",
      note:
        "An event with no cover is NOT shown on the site, however complete the rest of it is.",
    },
    author_name: { label: "Byline", note: "Who wrote the account. Blank for the old archive entries." },
    published_at: {
      label: "Went public",
      note:
        "When the write-up was published, which is not when the event happened. Required " +
        "once 'Show on the website' is ticked.",
    },
    published: {
      label: "Show on the website",
      note: "Needs a cover photograph and a publication date. Prefer the Publish button in the club's own panel.",
    },
    body: {
      label: "The write-up",
      note:
        "Markdown, past tense. Never paste registration links, deadlines or payment " +
        "numbers from the original announcement — they are dead, and a page still asking " +
        "people to sign up for a finished event is worse than no page.",
    },
    copy_source: {
      label: "Where the words came from",
      note:
        "'derived' means lifted from the club's own announcement — the public page says " +
        "so. 'authored' means somebody wrote it for the site.",
    },
    start_date: {
      label: "Date",
      note: "May be left empty. Much of the archive is a folder with a year and no date; a blank is true and a guess is not.",
    },
  },

  event_categories: {
    name: {
      label: "Name",
      required: true,
      note: "As it should read on the site, e.g. 'AGM', not 'agm'. This is the text a visitor sees.",
    },
    slug: {
      label: "Address",
      required: true,
      note:
        "The category's part of a web address, e.g. /events?category=workshop. " +
        "Lower case, words joined by hyphens. Changing it breaks any link already " +
        "shared, so set it once and leave it.",
    },
    parent_id: {
      label: "Belongs under",
      note:
        "Empty for a top-level kind. Set it to make this a subcategory, e.g. " +
        "'Basic Workshop' under 'Workshop'. Two levels only — a subcategory " +
        "cannot have subcategories of its own, and the database refuses.",
    },
    sort_order: { label: "Order", note: "Lower numbers appear first in the category box." },
    created_at: { label: "Added", readonly: true },
  },

  achievements: {
    result: {
      label: "Result",
      note:
        "Leave empty unless the placement is confirmed. Empty means 'took part, outcome " +
        "unverified' — it does NOT mean the team lost.",
    },
    verified: {
      label: "Result verified",
      note: "Tick only with a source in 'Evidence'. Nothing displays as a placement without this.",
    },
  },
};

/**
 * What a Member may do. Everything absent from this list is denied — this
 * is the whole of their access, not a starting point.
 *
 * The club's instruction was exact: a Member "can create blog post only,
 * cannot edit anything else". Read access to People and Images is
 * included because writing a post means picking a cover picture and
 * setting a byline; without it the one permitted task cannot be finished.
 */
export const MEMBER_ACCESS = {
  role: {
    name: "Member",
    icon: "person",
    description: "Can write blog posts and submit them for approval. Nothing else.",
  },
  policy: {
    name: "Member — blog authoring",
    icon: "edit_note",
    description:
      "Create and edit your own blog posts, and submit them for an Administrator to " +
      "approve. Cannot publish, and cannot change anything else on the site.",
  },
};
