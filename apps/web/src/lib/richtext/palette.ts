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
export const RICH_FONTS: Option[] = [
  { id: "body", label: "Body — Plex Sans" },
  { id: "editorial", label: "Editorial — Source Serif" },
  { id: "mono", label: "Monospace — Plex Mono" },
  { id: "system", label: "System sans" },
  { id: "classic", label: "Classic serif — Georgia" },
  { id: "typewriter", label: "Typewriter" },

  // ── The 17 below are next/font/google, not vendored .woff2 like the
  // six above — see fonts-richtext.ts for what that trade-off is.
  // Added at explicit direction; grouped exactly as requested.

  // Sans-serif
  { id: "gf-roboto", label: "Roboto" },
  { id: "gf-open-sans", label: "Open Sans" },
  { id: "gf-montserrat", label: "Montserrat" },
  { id: "gf-lato", label: "Lato" },
  { id: "gf-poppins", label: "Poppins" },

  // Serif (Georgia / Times New Roman are the existing "classic" entry
  // above, not repeated here — see fonts-richtext.ts's note)
  { id: "gf-merriweather", label: "Merriweather" },
  { id: "gf-playfair", label: "Playfair Display" },
  { id: "gf-lora", label: "Lora" },

  // Display
  { id: "gf-oswald", label: "Oswald" },
  { id: "gf-bebas", label: "Bebas Neue" },
  { id: "gf-lobster", label: "Lobster" },

  // Monospace
  { id: "gf-space-mono", label: "Space Mono" },
  { id: "gf-inconsolata", label: "Inconsolata" },
  { id: "gf-courier-prime", label: "Courier Prime" },

  // Script / handwriting
  { id: "gf-pacifico", label: "Pacifico" },
  { id: "gf-great-vibes", label: "Great Vibes" },
  { id: "gf-dancing-script", label: "Dancing Script" },
];

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
 * Letter-spacing (tracking). The other half of "space" a word processor
 * offers besides line spacing — RICH_LEADS above is the gap BETWEEN
 * lines, this is the gap WITHIN a line, between one letter and the
 * next. Named steps rather than a free number, for the same reason
 * every other list on this page is closed: "wider" is a decision an
 * editor can reason about across two paragraphs written a month apart,
 * "0.037em" is not.
 *
 * "Normal" stores nothing, same pattern as size 18 and font "body" —
 * the absence of a choice, not a stored zero.
 */
export const RICH_SPACINGS = [
  { id: "tight", label: "Tight", em: -0.02 },
  { id: "wide", label: "Wide", em: 0.05 },
  { id: "wider", label: "Wider", em: 0.1 },
] as const;
export type RichSpacing = (typeof RICH_SPACINGS)[number]["id"];

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
export const RICH_LEADS = [
  { id: "single", label: "Single", value: null },
  { id: "snug", label: "1.15", value: 1.32 },
  { id: "roomy", label: "1.5", value: 1.72 },
  { id: "double", label: "Double", value: 2.3 },
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
const SPACING_IDS = new Set<string>(RICH_SPACINGS.map((s) => s.id));

export const isFont = (v: unknown): v is string =>
  typeof v === "string" && FONT_IDS.has(v) && v !== "body";
export const isInk = (v: unknown): v is string => typeof v === "string" && INK_IDS.has(v);
export const isMark = (v: unknown): v is string => typeof v === "string" && MARK_IDS.has(v);
export const isSize = (v: unknown): v is number =>
  typeof v === "number" && SIZE_VALUES.has(v) && v !== RICH_SIZE_DEFAULT;
export const isSpacing = (v: unknown): v is RichSpacing =>
  typeof v === "string" && SPACING_IDS.has(v);

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
  spacing?: unknown;
}): { class?: string; style?: string } {
  const cls: string[] = [];
  const css: string[] = [];

  if (isFont(a.font)) cls.push(`rt-font-${a.font}`);
  if (isSize(a.size)) cls.push(`rt-size-${a.size}`);
  if (isSpacing(a.spacing)) cls.push(`rt-spacing-${a.spacing}`);

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
