/**
 * ══════════════════════════════════════════════════════════════════════
 * THE CLOSED VOCABULARY OF A WRITE-UP.
 *
 * Every font, size, colour and alignment an editor can choose is named
 * here, and NOWHERE ELSE can one be introduced. The toolbar builds itself
 * from these lists; the renderer validates against them; globals.css
 * styles them. Three consumers, one list.
 *
 * ── WHY NAMES AND NOT VALUES ──
 * The obvious build of "text colour" is a colour picker that stores
 * `#7b1223`. Three things break the moment you do that:
 *
 *   1. DARK MODE. This site has a petrol ground (see :root[data-theme]
 *      in globals.css) where #24282b is invisible. A stored hex cannot
 *      know that. A stored NAME — "ink-primary" — resolves through a
 *      token that already flips.
 *   2. SANITISING. Validating a name against a list of nine is a set
 *      membership test. Validating arbitrary CSS is a research project.
 *   3. THE HANDOVER. In 2028 somebody restyles the site. Names follow
 *      the restyle. Hexes are 400 events' worth of fossilised 2026.
 *
 * So the stored document holds `{ ink: "accent" }`, the renderer emits
 * `class="rt-ink-accent"`, and globals.css decides what that means in
 * each theme. The editor uses the SAME classes, so what is typed is
 * literally what publishes — not an approximation of it.
 *
 * ── ON THE SIZE OF THESE LISTS ──
 * The brief asked for 6–8 fonts. There are six, and NONE of them costs a
 * new download: three are the families the site already self-hosts, and
 * three are stacks already resolved on the reader's machine. Eight real
 * webfonts would have been ~200 KB added to every event page to let one
 * paragraph be different, which is a bad trade on a site whose whole
 * architecture is built around being fast and static (§4.7).
 * ══════════════════════════════════════════════════════════════════════
 */

export type Option = { id: string; label: string };

/**
 * Families. `id` becomes `rt-font-<id>`; the stack lives in globals.css.
 * "body" is the default and is never written into a document — it is the
 * absence of a font choice.
 */
/**
 * The families a writer may set, grouped the way a font menu is read.
 *
 * `group` is presentation only — the toolbar renders an <optgroup> from
 * it. What is STORED is the id, and the renderer turns that into
 * `rt-font-<id>` through a set-membership test, so a document can never
 * name a family globals.css has no rule for.
 *
 * ── WHY THIS IS NOT ~600 KB ON EVERY PAGE ──
 * Because none of them is preloaded. The @font-face block in globals.css
 * carries the argument in full; the short version is that a declaration
 * is inert until a rule matches it, so a page downloads the faces it
 * uses and no others. The three site families remain the only ones on
 * the critical path, and §4.7's 110 KB still measures exactly what it
 * was written to measure.
 */
export type FontOption = Option & { group: string };

export const RICH_FONTS: FontOption[] = [
  /* The site's own three first, because they are the right answer for a
     write-up and they are already loaded. */
  { id: "body", label: "Body — Plex Sans", group: "The site's own" },
  { id: "editorial", label: "Editorial — Source Serif", group: "The site's own" },
  { id: "mono", label: "Monospace — Plex Mono", group: "The site's own" },

  { id: "roboto", label: "Roboto", group: "Sans-serif" },
  { id: "opensans", label: "Open Sans", group: "Sans-serif" },
  { id: "montserrat", label: "Montserrat", group: "Sans-serif" },
  { id: "lato", label: "Lato", group: "Sans-serif" },
  { id: "poppins", label: "Poppins", group: "Sans-serif" },
  { id: "system", label: "System sans", group: "Sans-serif" },

  { id: "merriweather", label: "Merriweather", group: "Serif" },
  { id: "playfair", label: "Playfair Display", group: "Serif" },
  { id: "lora", label: "Lora", group: "Serif" },
  /* Georgia and Times are the reader's own copies, so they are free and
     they never swap. `classic` predates them and is kept because
     documents already store it. */
  { id: "georgia", label: "Georgia", group: "Serif" },
  { id: "times", label: "Times New Roman", group: "Serif" },
  { id: "classic", label: "Classic serif", group: "Serif" },

  { id: "oswald", label: "Oswald", group: "Display" },
  { id: "bebas", label: "Bebas Neue", group: "Display" },
  { id: "lobster", label: "Lobster", group: "Display" },

  { id: "spacemono", label: "Space Mono", group: "Monospace" },
  { id: "inconsolata", label: "Inconsolata", group: "Monospace" },
  { id: "courierprime", label: "Courier Prime", group: "Monospace" },
  { id: "typewriter", label: "Typewriter", group: "Monospace" },

  { id: "pacifico", label: "Pacifico", group: "Script" },
  { id: "greatvibes", label: "Great Vibes", group: "Script" },
  { id: "dancingscript", label: "Dancing Script", group: "Script" },
];

/** The menu's groups, in the order they are shown. Derived rather than
 *  listed twice, so a family added above cannot land in a group the
 *  toolbar never renders. */
export const RICH_FONT_GROUPS: string[] = [...new Set(RICH_FONTS.map((f) => f.group))];

/**
 * Sizes, in px, shown to the editor as the number they asked for.
 *
 * These are stored as numbers and rendered as `rt-size-<n>`, which means
 * the set is closed: a document cannot ask for 13px because there is no
 * class for it. 18 is body-l — the size an event page already sets — and
 * is the default, so it is never written into a document either.
 */
export const RICH_SIZES = [12, 14, 16, 18, 20, 24, 30, 36, 48] as const;
export const RICH_SIZE_DEFAULT = 18;

/**
 * Text colour. Every entry resolves to a design token, so every entry
 * survives the theme flip and every entry has a known contrast ratio
 * against both grounds. There is no "any colour you like", deliberately.
 */
export const RICH_INKS: Option[] = [
  { id: "primary", label: "Default" },
  { id: "secondary", label: "Muted" },
  { id: "accent", label: "Oxblood" },
  { id: "petrol", label: "Petrol" },
  { id: "success", label: "Green" },
  { id: "warning", label: "Amber" },
];

/**
 * Highlight / text background. Tints rather than solids: a saturated
 * block behind body copy fails contrast in one theme or the other, and
 * a tint of the same hue cannot.
 */
export const RICH_MARKS: Option[] = [
  { id: "accent", label: "Oxblood tint" },
  { id: "petrol", label: "Petrol tint" },
  { id: "success", label: "Green tint" },
  { id: "warning", label: "Amber tint" },
  { id: "neutral", label: "Grey" },
];

/** Paragraph and heading alignment. */
export const RICH_ALIGNS = ["left", "center", "right", "justify"] as const;

/* ── WHERE THE INDENT WENT ────────────────────────────────────────────
 *
 * There was a RICH_INDENT_MAX here, and a level Tab wrote onto the
 * paragraph for the renderer to turn into a left margin. It is gone,
 * because a margin cannot be what Tab is actually used for: a gap
 * BETWEEN TWO WORDS, at the caret, in the middle of a line. A block
 * margin is always at the front of the block, and the cap that kept a
 * deep level from eating a phone's column also stopped the line moving
 * at all after about half the measure.
 *
 * A tab is now a node in the text — BrsTab in richtext/extensions.tsx —
 * with its width in one stylesheet rule the editor and the page share.
 * There is no number to store and nothing here to coerce. ── */

/**
 * ── LINE SPACING ─────────────────────────────────────────────────────
 *
 * The menu a word processor has, meaning what a word processor means by
 * it. This matters more than it sounds, and the first version of this
 * control got it wrong in a way worth writing down.
 *
 * ── WHY "SINGLE" LOOKED DOUBLE ──
 * Single was defined as "whatever the page sets", which is 1.7 — the
 * measured editorial leading for this face at this measure. Set beside
 * Google Docs the two were not comparable at all, and the reason is
 * that leading was never the whole gap: the article also puts 24px of
 * margin between one paragraph and the next, and pressing Enter makes a
 * paragraph. Four short lines typed in the editor were therefore four
 * paragraphs, each 1.7 leading PLUS 24px apart, while four lines in
 * Docs are 1.15 apart and nothing else. "Single" was the loosest thing
 * on the menu.
 *
 * ── WHAT FIXED IT: THE DEFAULT ITSELF IS SINGLE ──
 * A first attempt kept 1.7-with-24px as a "Page default" entry and put
 * a real Single below it. That was still wrong, and obviously so once
 * seen: the spacing a writer gets WITHOUT touching the menu is the one
 * that matters, and it was the loose one. Nobody opens a document and
 * sets the line spacing to normal.
 *
 * So the write-up surface now behaves like a document, and the menu
 * below is Docs's menu exactly:
 *
 *   · SINGLE IS THE DEFAULT and stores nothing. `.prose.rt-doc` in
 *     globals.css sets 1.15 leading and NO gap between paragraphs, so
 *     pressing Enter puts the next line directly underneath, and a
 *     blank line is made by pressing Enter twice. That is what Docs
 *     does and it is what "single" has to mean to be believed.
 *   · THE OTHER THREE ARE DOCS'S MULTIPLIERS. Docs applies them to a
 *     font's natural line box (~1.15), so its "1.5" is 1.5 × 1.15 ≈
 *     1.72 in CSS terms, and that is what gets stored. Pick 1.5, get
 *     the spacing Docs gives you for 1.5.
 *
 * The editorial 1.7-with-24px has not gone away — it is still what
 * every other run of copy on the site uses. It is simply no longer
 * imposed on the thing a writer types into a document editor.
 */
/* FIVE STEPS, LABELLED AS THE MULTIPLIERS THEY ARE.
 *
 * The labels used to be "Single", "1.15", "1.5", "Double" — Docs's own
 * menu, words and numbers mixed. Five evenly spaced numbers say the
 * same thing without the reader having to know that Single and 1 are
 * the same row.
 *
 * The VALUES are unchanged in kind: each is the multiplier applied to
 * the font's natural line box (~1.15), which is what Docs does, so
 * picking 1.5 still gives the spacing Docs gives for 1.5. 1 stores null
 * — the surface's own default already IS single, and a paragraph nobody
 * touched should carry no line-height at all so the page can be
 * retuned. See the note above.
 *
 * 1.25 and 1.75 are new rows. Nothing that stored 1.32 (the old "1.15")
 * is harmed: richLead below CLAMPS rather than matching a list, which
 * is exactly the case it was written for. */
export const RICH_LEADS = [
  { id: "x1", label: "1", value: null },
  { id: "x125", label: "1.25", value: 1.44 },
  { id: "x150", label: "1.5", value: 1.72 },
  { id: "x175", label: "1.75", value: 2.01 },
  { id: "x2", label: "2", value: 2.3 },
] as const;

export const RICH_LEAD_MIN = 1;
export const RICH_LEAD_MAX = 3;

/**
 * A stored line-height, clamped — not snapped to the list above.
 *
 * Clamping rather than matching, for the same reason a picture's width
 * clamps: a document written against an earlier version of this menu
 * holds 1.5 or 2, and those are perfectly good line-heights that a
 * closed set would have silently discarded. Anything outside 1–3, or
 * anything that is not a number at all, is null and the paragraph falls
 * back to the page's own leading.
 *
 * The published page interpolates the RESULT of this function, so what
 * reaches the CSS is a number this file rounded — never a string an
 * author supplied.
 */
export function richLead(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  const r = Math.round(n * 100) / 100;
  if (r < RICH_LEAD_MIN || r > RICH_LEAD_MAX) return null;
  return r;
}

/**
 * How an inline picture sits in the column. Three, on client direction —
 * "full width" was a fourth and is now what dragging a picture out to
 * 100% does, which is the same result reached by the control that was
 * going to be built for resizing anyway.
 */
export const RICH_IMAGE_ALIGNS = ["left", "center", "right"] as const;

/**
 * A picture's width, as a PERCENTAGE of the column it sits in.
 *
 * Percent and not pixels, because the column is fluid: 420px is half the
 * measure on a laptop and wider than the screen on a phone. A percentage
 * resizes with the page and needs no breakpoint to stay sane.
 *
 * The floor is 10 — below that the drag handles are bigger than the
 * picture and it cannot be grabbed again.
 */
export const RICH_IMAGE_WIDTH_MIN = 10;
export const RICH_IMAGE_WIDTH_MAX = 100;

/**
 * The size buttons, as Blogger has them.
 *
 * Drag handles alone are not enough: getting two photographs in the same
 * article to the same width by eye is impossible, and most of the time
 * the writer does not want a specific width — they want "small". These
 * are the four everybody reaches for, and because they are percentages
 * two pictures set to M match exactly.
 *
 * X-Large is 100, which `imageWidth` stores as null — the full column is
 * the absence of a width rather than a width of its own.
 */
export const RICH_IMAGE_SIZES = [
  { id: "S", label: "Small", pct: 25 },
  { id: "M", label: "Medium", pct: 40 },
  { id: "L", label: "Large", pct: 60 },
  { id: "XL", label: "X-Large", pct: 100 },
] as const;

/**
 * What a picture is when it lands in the writing.
 *
 * It used to arrive at the full width of the column, which is a wall of
 * photograph in the middle of a sentence and meant every single insert
 * had to be resized afterwards. Medium is the size a picture in a
 * write-up usually wants to be, and it is the size Blogger drops one in
 * at.
 *
 * ── WHY LEFT AND NOT CENTRED ──
 * A centred picture CLEARS (see .rt-figure-center in globals.css), so it
 * always starts a new row no matter where the cursor was. Putting the
 * cursor in the gap beside a 40% picture and inserting a second one
 * therefore dropped it onto its own line UNDER the first, with half the
 * column left empty — the cursor said "here" and the picture went
 * somewhere else.
 *
 * Left floats instead, so a picture lands where the cursor is: beside
 * whatever is already there if it fits, and flush left on the next row
 * if it does not. That is how a word behaves, and it is the only
 * default that can honour an insertion point at all.
 */
export const RICH_IMAGE_DEFAULT_WIDTH = 40;
export const RICH_IMAGE_DEFAULT_ALIGN = "left";

/**
 * What a video is when it lands in the writing.
 *
 * A video is sized in the same units as a picture — percent of the
 * column, `imageWidth` clamps both — because they are the same decision
 * to a writer and two number systems for "how big" is one too many.
 *
 * 55 rather than the picture's 40: a video is watched rather than
 * glanced at, and there is no wrapping text to sit beside it. On the
 * 1200px column that is ~660px, about the size a video is on a page
 * that has one. It was a hardcoded 40rem before it was adjustable, and
 * 55% is that number turned into something a writer can change.
 */
export const RICH_EMBED_DEFAULT_WIDTH = 55;

/**
 * THE VERTICAL HANDLES CROP. THEY DO NOT STRETCH.
 *
 * Dragging the middle of the top or bottom edge changes how TALL the
 * frame is, and there are only two things that can mean:
 *
 *   stretch   the photograph is squashed to fit the new height. Every
 *             face in it gets wider or thinner than it was.
 *   crop      the frame gets shorter and the photograph is centred
 *             behind it at its true proportions.
 *
 * On an archive of real events the first one is falsification — a
 * distorted photograph is a photograph of something that did not look
 * like that. So this stores the frame's ASPECT RATIO and the picture is
 * drawn through it with object-fit: cover. A tall portrait can be pulled
 * into a letterbox band and nothing in it changes shape.
 *
 * Stored as width ÷ height, two decimals. Null is "however tall the
 * photograph actually is", which is the normal case and stores nothing.
 */
export const RICH_IMAGE_ASPECT_MIN = 0.25; // a tall column
export const RICH_IMAGE_ASPECT_MAX = 6; // a thin band

export function imageAspect(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  const r = Math.round(n * 100) / 100;
  return Math.min(RICH_IMAGE_ASPECT_MAX, Math.max(RICH_IMAGE_ASPECT_MIN, r));
}

/** Clamp to a whole percent in range, or null for "natural width". */
export function imageWidth(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  const r = Math.round(n);
  return Math.min(RICH_IMAGE_WIDTH_MAX, Math.max(RICH_IMAGE_WIDTH_MIN, r));
}

export type RichAlign = (typeof RICH_ALIGNS)[number];
export type RichImageAlign = (typeof RICH_IMAGE_ALIGNS)[number];

/* ── Membership tests, used by the renderer ───────────────────────────
 *
 * The renderer treats a value that fails one of these as ABSENT rather
 * than passing it through. That is what makes the class attribute it
 * emits unforgeable: `rt-ink-` can only ever be followed by one of six
 * strings this file names.
 */

const ids = (list: Option[]) => new Set(list.map((o) => o.id));

const FONT_IDS = ids(RICH_FONTS);
const INK_IDS = ids(RICH_INKS);
const MARK_IDS = ids(RICH_MARKS);
const SIZE_VALUES = new Set<number>(RICH_SIZES);
const ALIGN_VALUES = new Set<string>(RICH_ALIGNS);
const IMAGE_ALIGN_VALUES = new Set<string>(RICH_IMAGE_ALIGNS);

export const isFont = (v: unknown): v is string =>
  typeof v === "string" && FONT_IDS.has(v) && v !== "body";
export const isInk = (v: unknown): v is string => typeof v === "string" && INK_IDS.has(v);
export const isMark = (v: unknown): v is string => typeof v === "string" && MARK_IDS.has(v);
export const isSize = (v: unknown): v is number =>
  typeof v === "number" && SIZE_VALUES.has(v) && v !== RICH_SIZE_DEFAULT;

/**
 * ANY COLOUR AT ALL, ON TOP OF THE NAMED SIX.
 *
 * The named inks above are the good ones and they stay the default,
 * because they are the only colours that follow an inverted field and
 * that have a measured contrast ratio. But the club asked to be able to
 * pick any colour, and that is a reasonable thing to want from an
 * editor, so an exact value is allowed alongside them.
 *
 * ── WHY THIS IS SAFE TO PUT IN A STYLE ATTRIBUTE ──
 * A six-digit hex is the one kind of author input that can be checked
 * completely. `#` plus exactly six characters from [0-9a-f] cannot
 * contain a quote, a semicolon, a bracket, `url(`, or whitespace, so
 * there is no sequence of them that ends the declaration or the
 * attribute. Everything else is rejected outright rather than escaped —
 * this is a set-membership test with 16.7 million members, not a
 * sanitiser.
 *
 * Three-digit shorthand and `rgb()` are deliberately not accepted. One
 * canonical spelling keeps the check to a single regex.
 */
export const isHexColour = (v: unknown): v is string =>
  typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

/** A stored ink or highlight: one of the named tokens, or an exact hex. */
export const isInkValue = (v: unknown): v is string => isInk(v) || isHexColour(v);
export const isMarkValue = (v: unknown): v is string => isMark(v) || isHexColour(v);
export const isAlign = (v: unknown): v is RichAlign =>
  typeof v === "string" && ALIGN_VALUES.has(v) && v !== "left";
export const isImageAlign = (v: unknown): v is RichImageAlign =>
  typeof v === "string" && IMAGE_ALIGN_VALUES.has(v);

/**
 * THE ONE PLACE A CLASS ATTRIBUTE FOR STYLED TEXT IS BUILT.
 *
 * Called by the Tiptap mark (so the editor shows it) and by the renderer
 * (so the page shows it). Sharing it is what makes the draft and the
 * published article the same pixels rather than two implementations that
 * drift — which was the original sin of the execCommand editor, where
 * the toolbar could apply things the renderer then silently dropped.
 *
 * Each segment is a literal prefix plus a value that has already passed
 * a set-membership test above, so the result cannot contain a character
 * the author chose.
 */
export function richStyleAttrs(a: {
  font?: unknown;
  size?: unknown;
  ink?: unknown;
  mark?: unknown;
}): { class?: string; style?: string } {
  const cls: string[] = [];
  const css: string[] = [];

  if (isFont(a.font)) cls.push(`rt-font-${a.font}`);
  if (isSize(a.size)) cls.push(`rt-size-${a.size}`);

  // A NAMED colour becomes a class, so it follows the theme. An EXACT
  // colour becomes a declaration, because there is no class to give it —
  // and it is the editor saying "this precise colour", which is a
  // different instruction from "the accent colour".
  if (isInk(a.ink)) cls.push(`rt-ink-${a.ink}`);
  else if (isHexColour(a.ink)) css.push(`color:${a.ink.toLowerCase()}`);

  if (isMark(a.mark)) cls.push(`rt-mark-${a.mark}`);
  else if (isHexColour(a.mark)) css.push(`background-color:${a.mark.toLowerCase()}`);

  // A highlight of either kind needs the same padding; the class-based
  // ones get it from [class*="rt-mark-"] in globals.css, and an exact
  // one has no class to hook, so it is added here.
  if (isHexColour(a.mark)) css.push("padding:0.1em 0.2em", "box-decoration-break:clone");

  return {
    ...(cls.length ? { class: cls.join(" ") } : {}),
    ...(css.length ? { style: css.join(";") } : {}),
  };
}

/** Just the class half. Kept because the editor's node views want it. */
export const richStyleClass = (a: Parameters<typeof richStyleAttrs>[0]): string =>
  richStyleAttrs(a).class ?? "";

/**
 * The two video hosts an event page will embed.
 *
 * NOT a general oEmbed client, and not "paste your embed code". Both of
 * those end with third-party HTML — or a third-party SCRIPT — inside an
 * article, which is the one thing this whole pipeline exists to prevent.
 * The editor takes a URL, this extracts an id, and the renderer builds
 * the iframe itself from a hardcoded origin.
 *
 * Facebook and Instagram are absent because their embeds require
 * Facebook's JS SDK, which is a tracker, does not work on a static
 * export without shipping their loader to every reader, and would be the
 * only third-party script on the site. Those links stay links.
 */
export const RICH_PROVIDERS = ["youtube", "vimeo"] as const;
export type RichProvider = (typeof RICH_PROVIDERS)[number];

const PROVIDER_VALUES = new Set<string>(RICH_PROVIDERS);
export const isProvider = (v: unknown): v is RichProvider =>
  typeof v === "string" && PROVIDER_VALUES.has(v);

/** Ids are echoed into an iframe URL, so they are character-checked. */
export const isVideoId = (v: unknown): v is string =>
  typeof v === "string" && /^[\w-]{1,32}$/.test(v);

/**
 * URL → { provider, id }, or null when it is not a video link we host.
 *
 * Deliberately strict about the HOST. `youtube.com.evil.test` must not
 * match, so each arm tests the hostname for equality against a known
 * list rather than with `.includes("youtube")`.
 */
export function parseVideoUrl(raw: string): { provider: RichProvider; id: string } | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    return isVideoId(id) ? { provider: "youtube", id } : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    // /watch?v=ID, /embed/ID, /shorts/ID, /live/ID
    const v = url.searchParams.get("v");
    if (isVideoId(v)) return { provider: "youtube", id: v };
    const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]+)/);
    if (m && isVideoId(m[1])) return { provider: "youtube", id: m[1] };
    return null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = url.pathname.match(/(?:^|\/)(\d{6,12})(?:$|\/|\?)/);
    if (m && isVideoId(m[1])) return { provider: "vimeo", id: m[1] };
    return null;
  }
  return null;
}

/** The only origins an embed iframe may point at. Built here, never stored. */
export function embedSrc(provider: RichProvider, id: string): string {
  return provider === "youtube"
    ? // -nocookie is the version that does not set advertising cookies
      // before a reader has pressed play.
      `https://www.youtube-nocookie.com/embed/${id}?rel=0`
    : `https://player.vimeo.com/video/${id}?dnt=1`;
}

/** Where "Watch on …" points when JavaScript or the iframe is blocked. */
export function embedWatchUrl(provider: RichProvider, id: string): string {
  return provider === "youtube"
    ? `https://www.youtube.com/watch?v=${id}`
    : `https://vimeo.com/${id}`;
}

/* ══════════════════════════════════════════════════════════════════════
 * PAGE FURNITURE: BUTTONS, COLUMNS, CARDS, ICONS.
 *
 * Everything above this line describes a WRITE-UP — text with pictures
 * in it. Everything below describes a PAGE: a call to action, a row of
 * boxes, a badge above a number. An event announcement is not an
 * article, and the archive now has to hold both.
 *
 * The rule does not change with the feature list. A button stores a
 * VARIANT NAME, not a colour; a grid stores a COUNT, not a
 * grid-template-columns; a card stores an ICON NAME, not a path. Same
 * three reasons as the fonts and inks above — the theme flip, the
 * membership test, and the 2028 restyle.
 * ══════════════════════════════════════════════════════════════════════
 */

/* ── A button ─────────────────────────────────────────────────────────
 *
 * WHY THIS IS NOT A LINK WITH A CLASS ON IT.
 *
 * A link is a run of text inside a sentence; a button is a block that
 * owns its own line and its own alignment. Storing one as the other
 * means either a link mark that carries layout attributes it cannot
 * honour inline, or a paragraph whose only child is a link and which
 * the renderer has to sniff. Both are the same mistake: a thing
 * pretending to be another thing so the schema does not have to grow.
 *
 * The four variants are the four this site actually has — see the
 * `.rt-btn-*` rules in globals.css, which reuse the same tokens the
 * admin's own buttons do. There is no "any colour" here, on purpose: a
 * call to action is the one element on a page whose contrast must be
 * right in both themes, and a hex cannot flip.
 */
/**
 * ── THE BUTTON'S FOUR KNOBS ───────────────────────────────────────────
 *
 * STYLE is the preset: a fill, a text colour and a border that are all
 * design tokens, so the whole set survives the theme flip and every
 * combination has a known contrast ratio against both grounds. This is
 * the control a writer should reach for.
 *
 * COLOUR is the escape hatch: an exact colour, for the day the poster
 * and the page have to match and no token does. It overrides the style
 * rather than replacing it, so a button with no colour set is exactly
 * the button that existed before this was added.
 *
 * The split is the same one RICH_INKS and isHexColour already make for
 * text, and for the same reason: "the accent colour" and "#8b1e3f" are
 * different instructions, and only one of them still means something
 * after the palette is retuned.
 */

/** `fill` says whether the shape has a background at all. An outlined
 *  or a text-only button has none, so offering to recolour a fill it
 *  does not have is offering a control that does nothing — the dialog
 *  reads this and disables the picker instead. */
export type ButtonVariant = Option & { fill: boolean };

/* ── A PDF, SHOWN WHOLE ─────────────────────────────────────────────────
 *
 * Not a link that says "rulebook.pdf", but the document itself, in the
 * browser's own viewer, resizable like a picture.
 *
 * ── WHERE THE BYTES LIVE ──
 * In the document, as a `data:application/pdf;base64,…` URL. The image
 * pipeline cannot take a PDF — it is sharp, front to back, and a PDF has
 * no width, height or ratio for the `assets` table to hold — so the
 * asset route is closed to it. A data URL needs no route: the file is
 * part of the saved write-up, which is why it is capped. Eight megabytes
 * of base64 is a large but survivable document column; a scanned
 * brochure that runs past it belongs behind a link, not inline.
 *
 * ── WHY THE VALIDATOR IS STRICT TO THE POINT OF RUDENESS ──
 * The renderer puts this straight into an <iframe src>. The one thing
 * that must never reach it is a `data:text/html` URL wearing a .pdf
 * name, because that is a script running in the page. So the check is
 * not "does it look like a data URL" — it is "does it begin with exactly
 * `data:application/pdf;base64,` and continue with nothing but base64".
 * The MIME is fixed by us, not read from the upload, so the browser
 * renders a PDF and cannot be talked into rendering markup. base64's
 * alphabet has no quote and no angle bracket, so the tail cannot close
 * the attribute either.
 */
export const RICH_PDF_MAX_BYTES = 8 * 1024 * 1024;

/** The viewer box height, in px. A PDF has no intrinsic aspect the way a
 *  photograph does — it is pages, not a shape — so the height is set
 *  rather than derived, and the writer drags it to taste. */
export const RICH_PDF_HEIGHT_MIN = 200;
export const RICH_PDF_HEIGHT_MAX = 2000;
export const RICH_PDF_HEIGHT_DEFAULT = 560;

export const pdfHeight = (v: unknown): number => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return RICH_PDF_HEIGHT_DEFAULT;
  return Math.min(RICH_PDF_HEIGHT_MAX, Math.max(RICH_PDF_HEIGHT_MIN, Math.round(n)));
};

/** A data URL this file is willing to hand to an <iframe src>. Exact
 *  prefix, base64 tail, nothing else. See the note above. */
export const isPdfDataUrl = (v: unknown): v is string =>
  typeof v === "string" && /^data:application\/pdf;base64,[A-Za-z0-9+/]+=*$/.test(v);

export const RICH_BUTTON_VARIANTS: ButtonVariant[] = [
  { id: "primary", label: "Solid — oxblood", fill: true },
  { id: "petrol", label: "Solid — petrol", fill: true },
  { id: "ink", label: "Solid — ink", fill: true },
  { id: "success", label: "Solid — green", fill: true },
  { id: "warning", label: "Solid — ochre", fill: true },
  { id: "soft", label: "Soft tint", fill: true },
  { id: "outline", label: "Outlined — oxblood", fill: false },
  { id: "outline-ink", label: "Outlined — grey", fill: false },
  { id: "quiet", label: "Text only", fill: false },
  { id: "link", label: "Underlined link", fill: false },
];

export const RICH_BUTTON_SIZES: Option[] = [
  { id: "xs", label: "Extra small" },
  { id: "s", label: "Small" },
  { id: "m", label: "Medium" },
  { id: "l", label: "Large" },
  { id: "xl", label: "Extra large" },
];

/** Corner rounding. Named steps rather than a pixel field: a radius
 *  typed in pixels is a radius that looks right at one size and wrong
 *  at the other four, and `pill` has to mean "half the height" rather
 *  than any fixed number for exactly that reason. */
export const RICH_BUTTON_RADII: Option[] = [
  { id: "square", label: "Square" },
  { id: "xs", label: "Barely rounded" },
  { id: "s", label: "Slightly rounded" },
  { id: "m", label: "Rounded" },
  { id: "l", label: "Very rounded" },
  { id: "pill", label: "Pill" },
];

/**
 * ── THE WORDS THEMSELVES ──────────────────────────────────────────────
 *
 * Weight, and three switches. Bold is not among the switches because
 * bold IS a weight — offering both would be two controls that fight
 * over one property, and the loser would depend on which was read last.
 *
 * NOTHING HERE MAY EXCEED 700. The display face's axis is 100–700 and
 * it clamps SILENTLY above that, so an 800 renders as a 700 and the bug
 * is invisible — app/fonts.ts writes down the last time that cost
 * somebody an afternoon.
 */
export const RICH_BUTTON_WEIGHTS: Option[] = [
  { id: "300", label: "Light" },
  { id: "400", label: "Regular" },
  { id: "500", label: "Medium" },
  { id: "600", label: "Semibold" },
  { id: "700", label: "Bold" },
];

export const RICH_BUTTON_VARIANT_DEFAULT = "primary";
export const RICH_BUTTON_SIZE_DEFAULT = "m";
/** Square, because that is what every button on the site already is.
 *  A new default would restyle every button ever published the moment
 *  this shipped. */
export const RICH_BUTTON_RADIUS_DEFAULT = "square";
/** 600, because that is the weight every button on the site already
 *  has. Same reasoning as the square corner: a new default restyles
 *  everything ever published. */
export const RICH_BUTTON_WEIGHT_DEFAULT = "600";

const BUTTON_VARIANT_IDS = ids(RICH_BUTTON_VARIANTS);
const BUTTON_SIZE_IDS = ids(RICH_BUTTON_SIZES);
const BUTTON_RADIUS_IDS = ids(RICH_BUTTON_RADII);
const BUTTON_WEIGHT_IDS = ids(RICH_BUTTON_WEIGHTS);
const BUTTON_FILLED = new Set(RICH_BUTTON_VARIANTS.filter((v) => v.fill).map((v) => v.id));

/* These COERCE rather than merely testing, because unlike a font — where
 * "no choice" is a real state that stores nothing — a button always has
 * a variant, a size and a corner. There is no such thing as an unstyled
 * button, so an unreadable value becomes the default rather than
 * becoming absent. */
export const buttonVariant = (v: unknown): string =>
  typeof v === "string" && BUTTON_VARIANT_IDS.has(v) ? v : RICH_BUTTON_VARIANT_DEFAULT;
export const buttonSize = (v: unknown): string =>
  typeof v === "string" && BUTTON_SIZE_IDS.has(v) ? v : RICH_BUTTON_SIZE_DEFAULT;
export const buttonRadius = (v: unknown): string =>
  typeof v === "string" && BUTTON_RADIUS_IDS.has(v) ? v : RICH_BUTTON_RADIUS_DEFAULT;
export const buttonWeight = (v: unknown): string => {
  const id = typeof v === "number" ? String(v) : typeof v === "string" ? v : "";
  return BUTTON_WEIGHT_IDS.has(id) ? id : RICH_BUTTON_WEIGHT_DEFAULT;
};

/** Whether this style has a fill the writer may recolour. */
export const buttonHasFill = (v: unknown): boolean => BUTTON_FILLED.has(buttonVariant(v));

/* A COLOUR, UNLIKE THE THREE ABOVE, IS ALLOWED TO BE ABSENT — and null
 * is the overwhelmingly common answer. It means "whatever the style
 * says", which is the whole point of having styles. Only an exact hex
 * is accepted; see isHexColour for why that set-membership test is what
 * makes interpolating it into a style attribute safe. */
export const buttonColour = (v: unknown): string | null =>
  isHexColour(v) ? v.toLowerCase() : null;

/**
 * THE ONE PLACE A BUTTON'S CLASS AND STYLE ARE BUILT.
 *
 * Called by the node view (so the draft shows it) and by the renderer
 * (so the page shows it) — the same bargain richStyleAttrs makes, and
 * for the same reason. The editor and the published page drifting apart
 * is this file's oldest bug and this is how it stays fixed.
 *
 * The overrides are written as the CUSTOM PROPERTIES the stylesheet
 * already funnels every variant through, not as `background-color` and
 * `color` directly. That is what keeps one rule — `.prose a.rt-btn` —
 * able to beat `.prose a` for a custom-coloured button as well as a
 * preset one, instead of needing a second rule that names colours.
 */
type ButtonLook = {
  variant?: unknown;
  size?: unknown;
  radius?: unknown;
  bg?: unknown;
  fg?: unknown;
  weight?: unknown;
  italic?: unknown;
  underline?: unknown;
  caps?: unknown;
};

/**
 * The custom properties an exact colour sets, as a map.
 *
 * They are written as the properties the stylesheet already funnels
 * every variant through, not as `background-color` and `color` directly.
 * That is what keeps one rule — `.prose a.rt-btn` — able to beat
 * `.prose a` for a recoloured button as well as a preset one, instead
 * of needing a second rule that names colours.
 *
 * Empty for the overwhelmingly common button, which sets no colour at
 * all and takes its style's.
 */
export function buttonVars(a: ButtonLook): Record<string, string> {
  const bg = buttonColour(a.bg);
  const fg = buttonColour(a.fg);
  // A fill the style does not have cannot be overridden — see `fill`.
  const fill = BUTTON_FILLED.has(buttonVariant(a.variant)) ? bg : null;

  const weight = buttonWeight(a.weight);

  return {
    ...(fill ? { "--rt-btn-bg": fill, "--rt-btn-edge": fill } : {}),
    ...(fg ? { "--rt-btn-fg": fg } : {}),
    // Only when it differs from the stylesheet's own, so an untouched
    // button carries no declaration at all.
    ...(weight !== RICH_BUTTON_WEIGHT_DEFAULT ? { "--rt-btn-wght": weight } : {}),
  };
}

export function buttonAttrs(a: ButtonLook): { class: string; style?: string } {
  const vars = buttonVars(a);
  const css = Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");

  const cls = [
    "rt-btn",
    `rt-btn-${buttonVariant(a.variant)}`,
    `rt-btn-${buttonSize(a.size)}`,
    `rt-btn-r-${buttonRadius(a.radius)}`,
    a.italic ? "rt-btn-i" : "",
    a.underline ? "rt-btn-u" : "",
    a.caps ? "rt-btn-caps" : "",
    /* An inline custom property beats the variant's :hover rule, which
       sets the same property from a class — so a recoloured button would
       simply not react to the pointer. This class is the hook for the
       one hover rule that works on any colour without naming it.

       Keyed on the COLOURS rather than on `css` being non-empty: a
       button whose only override is its weight has nothing tinted about
       it, and would otherwise dim under the pointer for no reason. */
    buttonColour(a.bg) || buttonColour(a.fg) ? "rt-btn-tinted" : "",
  ].filter(Boolean);

  return { class: cls.join(" "), ...(css ? { style: css } : {}) };
}

/* ── A row of columns ─────────────────────────────────────────────────
 *
 * TWO, THREE OR FOUR. Not "any number", and not a width per column.
 *
 * A free column count produces five-across rows that are unreadable on
 * a laptop and impossible on a phone; per-column widths produce the
 * 63%/37% split somebody eyeballed once and can never reproduce. Three
 * equal columns is the SEGMENTS grid, three equal columns is the fact
 * strip, and four is the widest thing that still collapses cleanly to
 * two on a tablet.
 *
 * WHAT HAPPENS ON A PHONE IS NOT STORED. The count is the DESKTOP count;
 * globals.css decides that 3 and 4 become 2 on a tablet and 1 on a
 * phone. Storing a per-breakpoint count would be asking a committee
 * member to do responsive design in a dialog.
 */
export const RICH_COLUMN_COUNTS = [2, 3, 4] as const;
export const RICH_COLUMN_COUNT_DEFAULT = 3;

const COLUMN_COUNT_VALUES = new Set<number>(RICH_COLUMN_COUNTS);

export const columnCount = (v: unknown): number => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return COLUMN_COUNT_VALUES.has(n) ? n : RICH_COLUMN_COUNT_DEFAULT;
};

/* ── A card ───────────────────────────────────────────────────────────
 *
 * One cell of the row. It holds real blocks — a heading, a paragraph, a
 * picture, even a button — rather than a title-and-body pair of string
 * attributes.
 *
 * ── WHY CONTENT AND NOT ATTRIBUTES ──
 * Two reasons, and the second is the one that decided it:
 *
 *   1. The toolbar already knows how to make a heading bold, oxblood
 *      and centred. With title-as-attribute, none of that works inside
 *      a card and the dialog grows a second copy of the toolbar.
 *   2. richDocToText() in render.ts walks `content` to build the meta
 *      description and the feed excerpt. Text living in an attribute is
 *      invisible to it — a page whose entire body is cards would
 *      publish with an empty description.
 *
 * `plain` is the difference between a segment grid that is findable and
 * one that is a picture of words.
 */
export const RICH_CARD_VARIANTS: Option[] = [
  { id: "bordered", label: "Bordered box" },
  { id: "tinted", label: "Tinted panel" },
  { id: "plain", label: "No box" },
];

/* A CARD IS CENTRED, AND THAT IS NOT A SETTING.
 *
 * There were three chips here — left, centre, right — and they were the
 * first thing a writer asked to have taken away. They were three of the
 * six controls on a card's strip, and the answer was "centre" every
 * time: a segment card is an icon over a name over a line of small
 * capitals, and that shape only reads centred. Left or right turned it
 * into a paragraph wearing a border.
 *
 * The alignment lives in one rule in globals.css now. Nothing stored it
 * — no write-up in content/ contains a card at all, checked before
 * removing — so there was no document to keep working. */
export const RICH_CARD_VARIANT_DEFAULT = "bordered";

const CARD_VARIANT_IDS = ids(RICH_CARD_VARIANTS);

export const cardVariant = (v: unknown): string =>
  typeof v === "string" && CARD_VARIANT_IDS.has(v) ? v : RICH_CARD_VARIANT_DEFAULT;

/* ── Icons ────────────────────────────────────────────────────────────
 *
 * A FIXED SET, DRAWN HERE, AND NOT AN UPLOAD.
 *
 * The obvious build of "an icon on a card" is a small image, which
 * means the asset pipeline, which means every segment card carries a
 * 4 KB PNG that does not follow the theme and is soft on a retina
 * screen. These are twenty paths that cost nothing, ride `currentColor`
 * so they invert with the page, and cannot be a broken image because
 * they are not a request.
 *
 * The cost is honest and worth writing down: a twenty-first icon is a
 * deploy, not an upload. For a club that runs six segments a year that
 * is the right side of the trade — and a card with no icon is still a
 * card, so nothing is blocked while the deploy waits.
 */
const RICH_ICON_PATHS: Record<string, string> = {
  trophy:
    "M8 4h8v5a4 4 0 0 1-8 0zM8 6H5v2a3 3 0 0 0 3 3M16 6h3v2a3 3 0 0 1-3 3M10 17h4M9 20h6M12 13v4",
  medal: "M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM8.2 13.5 7 21l5-2.5L17 21l-1.2-7.5",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  calendar: "M4 6h16v14H4zM4 10h16M9 3v4M15 3v4",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  location: "M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  prize: "M3 6h18v12H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 9h.01M18 15h.01",
  users:
    "M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-2a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8",
  flag: "M5 21V3M5 3h12l-2.5 4L17 11H5",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
  rocket:
    "M12 2c3.5 2.4 5.5 6 5.5 10l-2 4h-7l-2-4C6.5 8 8.5 4.4 12 2zM12 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM9 20l1.5-2M15 20l-1.5-2",
  gear: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1",
  chip: "M8 8h8v8H8zM4 9h4M4 15h4M16 9h4M16 15h4M9 4v4M15 4v4M9 16v4M15 16v4",
  bot: "M9 3h6M12 3v3M5 6h14v11H5zM9 11h.01M15 11h.01M9.5 14h5M3 10v4M21 10v4",
  drone:
    "M4 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM20 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM4 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM20 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM6 7h2l2 3M18 7h-2l-2 3M6 17h2l2-3M18 17h-2l-2-3M9 10h6v4H9z",
  flame: "M12 22c3.9 0 6-2.6 6-6 0-4-3-6-4.5-9C13 9 11.5 10 10 11c0-2-1-3.5-1-3.5C7 9.5 6 12.5 6 16c0 3.4 2.1 6 6 6z",
  wrench: "M14.7 6.3a4 4 0 1 0 3 3l-8.6 8.6a2.1 2.1 0 1 1-3-3z",
  presentation: "M3 4h18M4 4v9h16V4M12 17v3M9 21l3-2 3 2M8 10l2-3 2 2 3-4",
  shield: "M12 3l7 3v5c0 4.4-3 8.2-7 10-4-1.8-7-5.6-7-10V6z",
  book: "M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z",
};

/** The picker's list. Ordered by what an event page reaches for first. */
export const RICH_ICONS: Option[] = [
  { id: "trophy", label: "Trophy" },
  { id: "medal", label: "Medal" },
  { id: "star", label: "Star" },
  { id: "calendar", label: "Calendar" },
  { id: "clock", label: "Clock" },
  { id: "location", label: "Location" },
  { id: "prize", label: "Prize money" },
  { id: "users", label: "Team" },
  { id: "flag", label: "Flag" },
  { id: "bolt", label: "Power" },
  { id: "rocket", label: "Rocket" },
  { id: "gear", label: "Gear" },
  { id: "chip", label: "Circuit" },
  { id: "bot", label: "Robot" },
  { id: "drone", label: "Drone" },
  { id: "flame", label: "Fire" },
  { id: "wrench", label: "Workshop" },
  { id: "presentation", label: "Showcase" },
  { id: "shield", label: "Shield" },
  { id: "book", label: "Rulebook" },
];

export const isIcon = (v: unknown): v is string =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(RICH_ICON_PATHS, v);

/**
 * THE ONE PLACE AN ICON BECOMES MARKUP — for the same reason
 * richStyleAttrs() is the one place a style does.
 *
 * Returns a complete SVG string, used by the renderer to build the page
 * and by the card's editor view to show the draft. Both get identical
 * bytes, so an icon cannot look like one thing in the box and another
 * on the page.
 *
 * ── ON HANDING THIS TO dangerouslySetInnerHTML ──
 * Every character it returns comes from the table above, which is a
 * literal in this file. `isIcon` is a hasOwnProperty test against that
 * table, so a stored value either names one of twenty paths WE wrote or
 * returns null. No author input reaches the output — not as a path, not
 * as an attribute, not as a byte. That is a different situation from
 * interpolating a string, and it is the reason this is a lookup rather
 * than a builder.
 */
export function richIconSvg(id: unknown): string | null {
  if (!isIcon(id)) return null;
  return (
    `<svg class="rt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"` +
    ` stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"` +
    ` aria-hidden="true" focusable="false"><path d="${RICH_ICON_PATHS[id]}" /></svg>`
  );
}

/* ── A callout ────────────────────────────────────────────────────────
 *
 * The box that says "registration closes on the 20th".
 *
 * Five tones, and they are the five the site's tokens already name, so
 * each one has a measured contrast ratio in both themes and none of
 * them is a colour somebody picked in a dialog. A callout is the
 * element most likely to carry the one sentence a reader must not miss;
 * it is the last place to accept "any colour you like".
 */
export const RICH_CALLOUT_TONES: Option[] = [
  { id: "info", label: "Note — petrol" },
  { id: "warning", label: "Deadline — amber" },
  { id: "success", label: "Good news — green" },
  { id: "accent", label: "Important — oxblood" },
  { id: "neutral", label: "Aside — grey" },
];

export const RICH_CALLOUT_TONE_DEFAULT = "info";

const CALLOUT_TONE_IDS = ids(RICH_CALLOUT_TONES);

export const calloutTone = (v: unknown): string =>
  typeof v === "string" && CALLOUT_TONE_IDS.has(v) ? v : RICH_CALLOUT_TONE_DEFAULT;

/* ── Deliberate empty space ───────────────────────────────────────────
 *
 * A block whose entire job is to be nothing, for a certain height.
 *
 * ── WHY THIS EXISTS WHEN THE ENTER KEY DOES ──
 * Because pressing Enter four times stores four empty paragraphs, and
 * four empty paragraphs are four things that a later change to the
 * document's leading silently resizes. A spacer says "24px of nothing
 * here, on purpose" in one node that means the same thing next year.
 *
 * Named rather than numeric for the usual reason: `xl` is 96px on a
 * desktop and 48px on a phone, and a stored 96 cannot know that.
 */
export const RICH_SPACER_SIZES: Option[] = [
  { id: "s", label: "Small" },
  { id: "m", label: "Medium" },
  { id: "l", label: "Large" },
  { id: "xl", label: "Extra large" },
];

export const RICH_SPACER_SIZE_DEFAULT = "m";

const SPACER_SIZE_IDS = ids(RICH_SPACER_SIZES);

export const spacerSize = (v: unknown): string =>
  typeof v === "string" && SPACER_SIZE_IDS.has(v) ? v : RICH_SPACER_SIZE_DEFAULT;

/* ── A section band ───────────────────────────────────────────────────
 *
 * THE ONE BLOCK THAT LEAVES THE COLUMN.
 *
 * Everything else in a write-up lives inside the article's measure. A
 * band does not: it runs the full width of the window, with its content
 * still held to the measure inside it. That is the hero at the top of
 * the client's page, and it is the only way to put a field of colour
 * behind a heading without the page showing two vertical seams where
 * the shell ends.
 *
 * The mechanics are `.band`'s, already in globals.css and already
 * argued there — 100vw with a centring translate rather than negative
 * margins, because negative margins only reach the shell's own edge.
 *
 * ── THE BACKGROUND IS AN ASSET ID, AND IT IS RENDERED AS AN <img> ──
 * Not `background-image: url(...)`. Two reasons, and the first one is
 * the rule this whole pipeline is built on: a url() in a style
 * attribute is author-adjacent bytes inside CSS, and there is no need
 * to go anywhere near that when an <img> behind the content does the
 * same job. The second is that an <img> gets the derivatives, the
 * srcset and the lazy loading that the asset pipeline already built,
 * and a CSS background gets none of them.
 */
export const RICH_SECTION_TONES: Option[] = [
  { id: "plain", label: "Page colour" },
  { id: "tinted", label: "Tinted" },
  { id: "petrol", label: "Petrol — inverted" },
  { id: "accent", label: "Oxblood — inverted" },
];

/** How hard the scrim over a background photograph is. Without one,
 *  white type on a bright photograph is unreadable and there is no
 *  choice of colour that fixes it. */
export const RICH_SECTION_SCRIMS: Option[] = [
  { id: "none", label: "No scrim" },
  { id: "soft", label: "Soft scrim" },
  { id: "strong", label: "Strong scrim" },
];

export const RICH_SECTION_TONE_DEFAULT = "plain";
export const RICH_SECTION_SCRIM_DEFAULT = "soft";

const SECTION_TONE_IDS = ids(RICH_SECTION_TONES);
const SECTION_SCRIM_IDS = ids(RICH_SECTION_SCRIMS);

export const sectionTone = (v: unknown): string =>
  typeof v === "string" && SECTION_TONE_IDS.has(v) ? v : RICH_SECTION_TONE_DEFAULT;
export const sectionScrim = (v: unknown): string =>
  typeof v === "string" && SECTION_SCRIM_IDS.has(v) ? v : RICH_SECTION_SCRIM_DEFAULT;

/* ── Heading levels ───────────────────────────────────────────────────
 *
 * H2, H3 AND NOW H4. NOT H1, AND THAT IS NOT AN OVERSIGHT.
 *
 * The event page already renders the event's title as the page's only
 * <h1>. A second one in the body does not make the words bigger in any
 * way that matters — it makes the document have two top-level headings,
 * which is the single most common heading fault a screen reader hits
 * and the one that makes a page's outline useless.
 *
 * What "I want it BIGGER" actually wants is already on the toolbar: the
 * size control goes to 48px, and it changes the type without lying
 * about the structure. So the ceiling stays at h2 and the floor drops
 * to h4, which is the level a card's sub-label wants.
 */
export const RICH_HEADING_LEVELS = [2, 3, 4] as const;

const HEADING_LEVEL_VALUES = new Set<number>(RICH_HEADING_LEVELS);

export const isHeadingLevel = (v: unknown): v is number =>
  typeof v === "number" && HEADING_LEVEL_VALUES.has(v);

/* ══════════════════════════════════════════════════════════════════════
 * THE LAYOUT AREA: FREE PLACEMENT THAT CANNOT BREAK.
 *
 * THE ONE PLACE THINGS ARE PUT WHERE YOU WANT THEM. Everything else in
 * this file describes a document that FLOWS — blocks in an order, the
 * browser deciding where they land. Here they are placed, in a CELL of
 * a twenty-four column grid.
 *
 * ── WHY A GRID AND NOT EXACT COORDINATES ──
 * There was a free canvas here for a while, storing an exact point for
 * each thing. It was deleted, and the reason is worth keeping: on a
 * canvas an element's height is however many lines its words take, so
 * two things that clear each other on the machine they were arranged
 * on can overlap on a machine whose font is a hair wider — and the page
 * has no way to notice. Tolerable for a hero with four things on it,
 * not tolerable for a page a committee edits.
 *
 * A grid row GROWS. If a cell's words need more room than its rows
 * allow, the row gets taller and everything below is pushed down — the
 * thing every reader expects and nothing a designer has to check for.
 * Overlap stops being a bug you find later and becomes a state the
 * layout cannot express.
 *
 * ── AND WHY IT STILL FEELS FREE ──
 * Twenty-four columns is fine enough that a dragged box lands where the
 * hand meant it to. Twelve is visibly chunky; thirty-six is precise
 * enough to be untidy. This is the number that stops feeling like a
 * grid while still behaving like one.
 *
 * ── WHAT MAKES IT RESPONSIVE ──
 * Nothing here is a pixel. A column is 1/24th of the area, so the whole
 * arrangement narrows with the page. Rows are a fixed height in rem, on
 * purpose: shrinking rows would shrink the space text sits in without
 * shrinking the text, which is the one way a grid can still overflow.
 * Under 40rem the grid stops being a grid — see the stacking note in
 * globals.css — and the cells become ordinary blocks at full readable
 * size, in the order they are stored.
 *
 * WHICH IS WHY STORED ORDER IS KEPT SORTED BY POSITION. The editor
 * re-sorts a grid's cells top-to-bottom, left-to-right after every
 * move, so the phone's stack, a screen reader's reading order and what
 * a sighted reader sees are the same sequence rather than three.
 * ══════════════════════════════════════════════════════════════════════
 */

export const RICH_GRID_COLS = 24;

/** A sanity ceiling, not a design limit: a grid this tall is a page. */
export const RICH_GRID_ROWS_MAX = 240;
export const RICH_GRID_SPAN_MAX = 40;

/**
 * Row height. Named, and fixed in rem rather than scaled with the
 * width — see the responsiveness note above for why scaling rows is the
 * one thing that can make a grid overflow.
 */
export const RICH_GRID_DENSITIES: { id: string; label: string; rem: number }[] = [
  { id: "tight", label: "Tight rows", rem: 1.5 },
  { id: "normal", label: "Normal rows", rem: 2.5 },
  { id: "roomy", label: "Roomy rows", rem: 4 },
];

export const RICH_GRID_DENSITY_DEFAULT = "normal";

const GRID_DENSITY_IDS = new Set(RICH_GRID_DENSITIES.map((d) => d.id));

export const gridDensity = (v: unknown): string =>
  typeof v === "string" && GRID_DENSITY_IDS.has(v) ? v : RICH_GRID_DENSITY_DEFAULT;

export const gridRowRem = (v: unknown): number =>
  RICH_GRID_DENSITIES.find((d) => d.id === gridDensity(v))?.rem ?? 2.5;

/* ── Cell geometry ────────────────────────────────────────────────────
 *
 * Four whole numbers: which column it starts in, which row, and how many
 * of each it covers. Integers rather than percentages, so two cells
 * dragged to the same column ARE in the same column — there is no
 * 41.28% that nearly matches 41.3%.
 *
 * x and y are ZERO-BASED here and one-based in CSS. Stored from zero
 * because that is what the arithmetic in the editor wants; converted at
 * the single point where it becomes a `grid-column`.
 */
const whole = (v: unknown, lo: number, hi: number, fallback: number): number => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, Math.round(n)));
};

export const gridX = (v: unknown): number => whole(v, 0, RICH_GRID_COLS - 1, 0);
export const gridY = (v: unknown): number => whole(v, 0, RICH_GRID_ROWS_MAX - 1, 0);
export const gridW = (v: unknown): number => whole(v, 1, RICH_GRID_COLS, 6);
export const gridH = (v: unknown): number => whole(v, 1, RICH_GRID_SPAN_MAX, 2);

/** A cell can start at column 20 and be 10 wide; it stops at the edge
 *  rather than wrapping onto the next row, which is what a stored width
 *  that overhangs would otherwise do. */
export const gridWAt = (x: unknown, w: unknown): number =>
  Math.min(gridW(w), RICH_GRID_COLS - gridX(x));

export const RICH_CELL_ALIGNS = ["left", "center", "right"] as const;
export const RICH_CELL_ALIGN_DEFAULT = "left";

const CELL_ALIGN_VALUES = new Set<string>(RICH_CELL_ALIGNS);

export const cellAlign = (v: unknown): string =>
  typeof v === "string" && CELL_ALIGN_VALUES.has(v) ? v : RICH_CELL_ALIGN_DEFAULT;

/** How a cell's content sits in a box taller than it needs. */
export const RICH_CELL_VALIGNS = ["top", "middle", "bottom"] as const;
export const RICH_CELL_VALIGN_DEFAULT = "top";

const CELL_VALIGN_VALUES = new Set<string>(RICH_CELL_VALIGNS);

export const cellVAlign = (v: unknown): string =>
  typeof v === "string" && CELL_VALIGN_VALUES.has(v) ? v : RICH_CELL_VALIGN_DEFAULT;

/**
 * DOES A RECTANGLE OVERLAP ANY OF THESE?
 *
 * Shared by the editor — which uses it to refuse a drop onto an
 * occupied square and to find the nearest free one — and by nothing
 * else, because the renderer does not need to: a grid that somehow
 * stored two cells on top of each other still lays out, it just looks
 * wrong. The guarantee is enforced where the arrangement is MADE.
 */
export type GridBox = { x: number; y: number; w: number; h: number };

export const gridHits = (a: GridBox, b: GridBox): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * The nearest free home for a box, searching downward from where the
 * hand let go.
 *
 * ── WHY DOWNWARD, AND WHY IT ALWAYS SUCCEEDS ──
 * A drop that lands on something occupied has three possible answers:
 * refuse it, shove the other thing out of the way, or slide down to the
 * first clear row. Refusing makes the editor feel broken; shoving moves
 * something the hand never touched. Sliding down is the only one that
 * always does something, never surprises, and cannot fail — a grid has
 * no bottom, so there is always a clear row further down.
 */
export function gridFreeSpot(want: GridBox, taken: GridBox[]): GridBox {
  for (let y = want.y; y < RICH_GRID_ROWS_MAX; y++) {
    const at = { ...want, y };
    if (!taken.some((b) => gridHits(at, b))) return at;
  }
  return { ...want, y: RICH_GRID_ROWS_MAX - want.h };
}

/** Top-to-bottom, then left-to-right: the order a page is read in, and
 *  therefore the order the cells are stored in. */
export const gridReadingOrder = (a: GridBox, b: GridBox): number =>
  a.y - b.y || a.x - b.x;

/* ── MOTION ───────────────────────────────────────────────────────────
 *
 * WHAT A BLOCK DOES WHEN THE READER REACHES IT.
 *
 * An announcement page is read once, scrolled fast, and often shown on
 * a projector to a room. Motion is what makes it read as a page someone
 * built rather than a wall of boxes — so the writer picks an entrance
 * per block, the same way they pick an alignment.
 *
 * ── EVERY ONE OF THESE IS A NAME, NOT A NUMBER ──
 * The writer chooses from this list and nothing else. No duration, no
 * distance, no easing: those live in one place in globals.css, so the
 * whole site's motion can be retuned without touching a stored
 * document, and so no write-up can carry a two-second bounce because
 * somebody typed 2000 into a box. It is the same bargain as a colour
 * token or an icon id.
 *
 * ── AND EVERY ONE IS AN ENHANCEMENT, NEVER A REQUIREMENT ──
 * The start state is applied by CSS that only matches once a script has
 * marked the document, and the script does not run at all under
 * prefers-reduced-motion. So a reader with no JavaScript, or one who
 * has asked their system for less movement, gets the finished page with
 * everything visible and nothing hidden waiting for an event that will
 * never come. That is the failure mode this list is designed around.
 */
export const RICH_ANIMS: Option[] = [
  { id: "fade", label: "Fade in" },
  { id: "rise", label: "Rise up" },
  { id: "sink", label: "Drop down" },
  { id: "left", label: "In from the left" },
  { id: "right", label: "In from the right" },
  { id: "zoom", label: "Zoom in" },
  { id: "shrink", label: "Zoom out" },
  { id: "pop", label: "Pop" },
  { id: "blur", label: "Focus in" },
  { id: "tilt", label: "Tilt up" },
  { id: "sweep", label: "Wipe across" },
];

/**
 * WHAT A CARD OR A BUTTON DOES UNDER THE POINTER.
 *
 * Separate from the entrance list because it is a different event and a
 * different failure: an entrance happens once and a hover happens every
 * time the pointer crosses, so these are smaller by design. On a
 * touchscreen there is no hover and nothing here fires, which is
 * correct rather than a gap — a card must never NEED one of these to
 * look finished.
 */
export const RICH_HOVERS: Option[] = [
  { id: "lift", label: "Lift" },
  { id: "glow", label: "Glow" },
  { id: "grow", label: "Grow" },
  { id: "sink", label: "Press in" },
];

const ANIM_IDS = ids(RICH_ANIMS);
const HOVER_IDS = ids(RICH_HOVERS);

/** The entrance, or null for "just be there" — which is the default and
 *  stores nothing, so a document written before this existed does not
 *  grow an attribute on every block the day it shipped. */
export const richAnim = (v: unknown): string | null =>
  typeof v === "string" && ANIM_IDS.has(v) ? v : null;

/** The hover, or null for none. */
export const richHover = (v: unknown): string | null =>
  typeof v === "string" && HOVER_IDS.has(v) ? v : null;

/**
 * HOW FAR APART THE CHILDREN OF A ROW ARRIVE.
 *
 * Set on the container — a grid, a row of cards, a band — rather than
 * on each child, because the writer's intention is about the ROW ("these
 * six arrive one after another") and because setting it per child would
 * mean renumbering by hand after every reorder.
 *
 * A count of steps rather than milliseconds, for the reason the
 * entrance names are names: the step is 70ms in the stylesheet, and six
 * cards at 70ms is a fifth of a second across the whole row, which
 * reads as one movement rather than six.
 *
 * CAPPED AT TWELVE. The thirteenth child and everything after it shares
 * the twelfth's delay: past that the last card is arriving nearly a
 * second after the first, which stops looking deliberate and starts
 * looking slow. The cap lives in the stylesheet too — this is only the
 * switch.
 */
export const richStagger = (v: unknown): boolean => v === true || v === "true" || v === "";

/* ── A NUMBER THAT COUNTS UP, AND A CLOCK THAT COUNTS DOWN ────────────
 *
 * The two things every event page has and no rich-text editor has: "250
 * PARTICIPANTS" arriving from zero, and "3 days to go".
 *
 * WHAT IS STORED IS THE FACT, NOT THE ANIMATION. The counter stores the
 * final number and the countdown stores the target instant; the running
 * is done by the page. That matters for more than tidiness — a reader
 * with no JavaScript sees the finished number and the target date
 * rendered as plain text by the build, which is the honest fallback,
 * and a crawler indexes "250" rather than "0".
 */

/** The final value. Whole numbers only, and bounded — a counter is a
 *  headline figure, and a headline figure with nine digits is a bug in
 *  whatever produced it. */
export const RICH_COUNT_MAX = 1_000_000;

export const countTo = (v: unknown): number => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return 0;
  return Math.min(RICH_COUNT_MAX, Math.max(0, Math.round(n)));
};

/**
 * A short label beside the number, or an empty string. Length-capped
 * here rather than in the node view so the renderer cannot be handed a
 * paragraph pretending to be a caption.
 *
 * ── IT DOES NOT TRIM, AND THAT IS THE WHOLE POINT ──
 * It used to, and the field it guards is a CONTROLLED input that runs
 * this on every keystroke. So typing "Until registration closes" went:
 * "Until", then space → "Until " → trimmed back to "Until" → the space
 * deleted before the next letter arrived → "Untilregistrationcloses".
 * The label could not contain a space at all, in the counter or the
 * countdown.
 *
 * Line breaks and control characters are still removed — a caption is
 * one line — and the length cap still holds. A value that is nothing
 * but whitespace is empty, so a stray space cannot produce an empty
 * element on the page; a space BETWEEN words is a space between words.
 */
export const countText = (v: unknown, max = 48): string => {
  if (typeof v !== "string") return "";
  // eslint-disable-next-line no-control-regex
  const oneLine = v.replace(/[\u0000-\u001f\u007f]+/g, " ").slice(0, max);
  return oneLine.trim() ? oneLine : "";
};

/**
 * THE INSTANT A COUNTDOWN IS COUNTING TO.
 *
 * Stored as the exact ISO string the browser produced, and validated by
 * round-tripping it through Date: anything that does not parse becomes
 * null and the block renders nothing rather than "NaN days".
 */
export const countdownAt = (v: unknown): string | null => {
  if (typeof v !== "string" || !v.trim()) return null;
  const t = new Date(v);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
};
