/**
 * ══════════════════════════════════════════════════════════════════════
 * A STORED DOCUMENT → HTML, AND THE SECURITY MODEL INTACT.
 *
 * ── WHY THE STORED FORMAT IS JSON AND NOT HTML ──
 * The obvious way to add fonts, colours and inline pictures to an editor
 * is to let it save HTML. Then the article page renders author-supplied
 * HTML, and the only thing between a compromised editor account and
 * script running in every reader's browser is a sanitiser's allow-list —
 * a hand-written HTML parser, in the hot path, that has to be right
 * forever.
 *
 * lib/markdown.ts refused that trade for markdown and the reasoning does
 * not change because the feature list got longer. So the editor stores
 * its NATIVE DOCUMENT TREE — typed JSON, `{type, attrs, content}` — and
 * this walks it.
 *
 * The property that buys: THIS FILE NEVER PARSES HTML. It reads a tree of
 * known node names, and for each one it emits tags it wrote itself around
 * text it escaped itself. There is no code path by which a byte of author
 * input becomes a tag, an attribute name, or an attribute value that was
 * not first checked against a fixed list in ./palette.ts. A `<script>`
 * typed into the editor is a text node containing the characters
 * `<script>`, and it comes out as `&lt;script&gt;`.
 *
 * ── UNKNOWN NODES ARE LOUD, NOT SILENT ──
 * The failure mode this design could have had: somebody adds a Tiptap
 * extension in 2027, forgets this file, and four events quietly publish
 * with a missing paragraph. So `strict` throws instead — the content
 * build fails, which is a Tuesday afternoon rather than a silent hole in
 * the archive. The admin preview passes strict:false and shows a visible
 * marker, because a white-screened editor helps nobody.
 * ══════════════════════════════════════════════════════════════════════
 */

import {
  embedSrc,
  embedWatchUrl,
  imageAspect,
  imageWidth,
  isAlign,
  isImageAlign,
  isProvider,
  isVideoId,
  richLead,
  richStyleAttrs,
} from "./palette";

/* ── The shape of a stored document ───────────────────────────────────
 *
 * Typed as `unknown`-ish on purpose: this comes out of a database and
 * every field is checked before use. A `PMNode` here is a claim, not a
 * guarantee.
 */
export type PMNode = {
  type?: unknown;
  attrs?: Record<string, unknown> | null;
  content?: unknown;
  marks?: unknown;
  text?: unknown;
};

/** What an image asset looks like once resolved. Both callers supply the
 *  first four; only the build has derivatives to supply. */
export type RichImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  lqip?: string | null;
  avif?: { w: number; url: string }[];
  webp?: { w: number; url: string }[];
};

export type RenderOptions = {
  /** Resolve an asset id to something renderable, or null if it is gone. */
  image: (assetId: string) => RichImage | null;
  /** Throw on an unrecognised node or mark. The content build sets this. */
  strict?: boolean;
};

const escape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Same rule as lib/markdown.ts: http(s) and mailto survive, and a
 *  site-relative path survives. javascript:, data:, everything else is
 *  dropped and the link renders as its own text. */
const safeHref = (href: unknown): string | null => {
  if (typeof href !== "string") return null;
  const h = href.trim();
  if (/^(https?:\/\/|mailto:)/i.test(h)) return h;
  if (/^\/(?!\/)/.test(h)) return h;
  return null;
};

const asArray = (v: unknown): PMNode[] => (Array.isArray(v) ? (v as PMNode[]) : []);
const attr = (n: PMNode, k: string): unknown =>
  n.attrs && typeof n.attrs === "object" ? n.attrs[k] : undefined;

/**
 * The class and style a paragraph or heading carries: alignment,
 * line spacing, or both, in one `class` attribute and one `style`.
 *
 * Built together rather than by two helpers concatenating two `class`
 * attributes onto the same tag — which is what the previous pair did,
 * and which produces `<p class="rt-align-center" class="rt-lead">`.
 * Browsers keep the first and drop the second, silently.
 *
 * `richLead` returns a number it rounded and range-checked, so what is
 * interpolated into the style cannot carry a character an author typed.
 * Null writes nothing at all: the page's own leading belongs to the
 * stylesheet, and a paragraph nobody touched should follow the site if
 * its typography is ever retuned.
 */
function blockAttrs(n: PMNode): string {
  const a = attr(n, "textAlign");
  const lead = richLead(attr(n, "lead"));
  const classes = [
    isAlign(a) ? `rt-align-${a}` : "",
    // Paired with `.rt-lead + .rt-lead` in globals.css: a writer who
    // sets the spacing owns the gap between their paragraphs too.
    lead ? "rt-lead" : "",
  ].filter(Boolean);

  return (
    (classes.length ? ` class="${classes.join(" ")}"` : "") +
    (lead ? ` style="--rt-lh:${lead};"` : "")
  );
}

/* ── Marks ────────────────────────────────────────────────────────────
 *
 * Applied outermost-first in a FIXED order, so the same document always
 * serialises to the same bytes. Without a fixed order the output would
 * depend on the sequence the writer happened to press the buttons in,
 * and every unrelated edit would churn the generated content files.
 */
const MARK_ORDER = ["link", "brsStyle", "bold", "italic", "underline", "strike", "code"] as const;

const SIMPLE_MARK_TAG: Record<string, string> = {
  bold: "strong",
  italic: "em",
  underline: "u",
  strike: "s",
  code: "code",
};

function wrapMarks(inner: string, marks: unknown, o: RenderOptions): string {
  const list = asArray(marks);
  if (!list.length) return inner;

  const byType = new Map<string, PMNode>();
  for (const m of list) {
    if (typeof m.type === "string") byType.set(m.type, m);
  }

  for (const m of list) {
    if (typeof m.type === "string" && !MARK_ORDER.includes(m.type as never)) {
      unknownThing(`mark "${m.type}"`, o);
    }
  }

  let out = inner;
  // Reverse, so MARK_ORDER[0] ends up outermost.
  for (let i = MARK_ORDER.length - 1; i >= 0; i--) {
    const type = MARK_ORDER[i]!;
    const m = byType.get(type);
    if (!m) continue;

    if (type === "link") {
      const href = safeHref(attr(m, "href"));
      // A dropped href leaves the label, exactly as the markdown
      // renderer does — the words are the author's, the link was not.
      if (!href) continue;
      const external = !href.startsWith("/");
      out = `<a href="${escape(href)}"${
        external ? ' target="_blank" rel="noopener noreferrer"' : ""
      }>${out}</a>`;
      continue;
    }

    if (type === "brsStyle") {
      const { class: cls, style } = richStyleAttrs({
        font: attr(m, "font"),
        size: attr(m, "size"),
        ink: attr(m, "ink"),
        mark: attr(m, "mark"),
      });
      // A brsStyle carrying nothing valid is not a span worth emitting.
      if (!cls && !style) continue;
      // Neither value is escaped because neither CAN need it: the class
      // is a literal prefix plus a set member, and the style is built
      // only from hex colours that matched /^#[0-9a-f]{6}$/. Nothing an
      // author typed reaches either attribute verbatim.
      out =
        `<span${cls ? ` class="${cls}"` : ""}${style ? ` style="${style}"` : ""}>` +
        `${out}</span>`;
      continue;
    }

    out = `<${SIMPLE_MARK_TAG[type]}>${out}</${SIMPLE_MARK_TAG[type]}>`;
  }
  return out;
}

function unknownThing(what: string, o: RenderOptions): void {
  if (o.strict) {
    throw new Error(
      `richtext: unsupported ${what} in a stored write-up. Either the editor ` +
        `gained an extension that src/lib/richtext/render.ts was not taught, or ` +
        `the document is not one this site wrote. Refusing to publish it.`,
    );
  }
}

/* ── Pictures ─────────────────────────────────────────────────────────
 *
 * Rendered as a full <picture> so an inline photograph gets the same
 * treatment as the cover: AVIF first, WebP second, explicit width and
 * height so nothing reflows, and the LQIP painted underneath while the
 * bytes arrive. This is the entire reason the document stores an ASSET
 * ID and not a URL — a URL would have been one fixed-size JPEG.
 */
function picture(img: RichImage, align: string, width: number | null): string {
  const srcset = (list: { w: number; url: string }[] | undefined) =>
    list?.length ? list.map((s) => `${escape(s.url)} ${s.w}w`).join(", ") : null;

  const avif = srcset(img.avif);
  const webp = srcset(img.webp);

  /* How much of the measure this picture actually occupies, so the
     browser can pick a derivative rather than always taking the largest.
     A dragged-down picture asking for the 1600px file is the whole
     reason the derivative ladder exists. Defaults match the CSS: a
     centred picture fills the column, a floated one takes half. */
  const frac = (width ?? (align === "center" ? 100 : 50)) / 100;
  const sizes = `(min-width: 72ch) ${Math.max(1, Math.round(72 * frac))}ch, ${Math.max(
    1,
    Math.round(100 * frac),
  )}vw`;

  const sources = [
    avif ? `<source type="image/avif" srcset="${avif}" sizes="${sizes}" />` : "",
    webp ? `<source type="image/webp" srcset="${webp}" sizes="${sizes}" />` : "",
  ].join("");

  const style = img.lqip
    ? ` style="background-image:url(&quot;${escape(img.lqip)}&quot;);background-size:cover;background-position:center"`
    : "";

  return (
    `<picture>${sources}` +
    `<img src="${escape(img.src)}" alt="${escape(img.alt)}" width="${img.width}" ` +
    `height="${img.height}" loading="lazy" decoding="async"${style} /></picture>`
  );
}

/**
 * A video, as a click-to-load facade rather than a live iframe.
 *
 * A YouTube iframe is ~1 MB of third-party JavaScript and it loads on
 * page open whether or not anybody watches. On an archive page that
 * mostly gets read, that is the single heaviest thing on the site, and
 * it would run on a page that otherwise ships no third-party script at
 * all. So: a link and a play button, and the iframe is written in by
 * eight lines of inline script only once a reader asks for it.
 *
 * WITHOUT JAVASCRIPT the <a> is a working link to the video. That is why
 * the facade is an anchor and not a button.
 */
function embed(
  provider: "youtube" | "vimeo",
  id: string,
  title: string,
  width: number | null,
): string {
  const src = embedSrc(provider, id);
  const watch = embedWatchUrl(provider, id);
  const label = title.trim() || (provider === "youtube" ? "YouTube video" : "Vimeo video");

  /**
   * THE VIDEO'S OWN FRAME AS THE POSTER, for YouTube.
   *
   * The facade was a flat dark rectangle with a triangle on it, which
   * is honest — nothing had been fetched from YouTube — and reads as a
   * placeholder for a video rather than as a video. Client direction,
   * and right: a reader decides whether to press play by looking at the
   * picture.
   *
   * WHAT IT COSTS, SAID PLAINLY: one image request to i.ytimg.com per
   * video, before the reader has asked for anything. That is a real
   * departure from "nothing loads from YouTube until they press play" —
   * but it is ~15 KB of image against ~1 MB of player JavaScript, and
   * no script, no cookie and no iframe comes with it. `no-referrer`
   * keeps the page they are on out of the request.
   *
   * hqdefault, not maxres: maxresdefault does not exist for every video
   * and 404s to a grey placeholder, which is worse than soft. It is 4:3
   * with letterbox bars, so it is cropped to 16:9 by object-fit rather
   * than shown with its own black bars inside our black frame.
   *
   * Vimeo has no thumbnail URL that can be built from an id — it needs
   * an API call — so a Vimeo embed keeps the flat mount.
   */
  const poster =
    provider === "youtube"
      ? `<img class="rt-embed-poster" src="https://i.ytimg.com/vi/${escape(id)}/hqdefault.jpg"` +
        ` alt="" width="480" height="360" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
      : "";

  // A number this file clamped, so it cannot carry a character an author
  // chose. See the same construction on a picture, above.
  const vars = width ? ` style="--rt-w:${width}%;"` : "";

  return (
    `<div class="rt-embed" data-embed-src="${escape(src)}"${vars}>` +
    /* The visible words are the title. The accessible name says what
       the link DOES, because "Robo Carnival 2024" on its own tells a
       screen-reader user nothing about pressing it. */
    `<a class="rt-embed-play" href="${escape(watch)}" target="_blank" rel="noopener noreferrer"` +
    ` aria-label="Play the video: ${escape(label)}">` +
    poster +
    `<span class="rt-embed-icon" aria-hidden="true"></span>` +
    `<span class="rt-embed-label">${escape(label)}</span>` +
    `</a></div>`
  );
}

/* ── The walk ─────────────────────────────────────────────────────────── */

function children(n: PMNode, o: RenderOptions): string {
  return asArray(n.content)
    .map((c) => node(c, o))
    .join("");
}

function node(n: PMNode, o: RenderOptions): string {
  const type = typeof n.type === "string" ? n.type : "";

  switch (type) {
    case "text": {
      const text = typeof n.text === "string" ? n.text : "";
      return wrapMarks(escape(text), n.marks, o);
    }

    case "paragraph": {
      const inner = children(n, o);
      // An empty paragraph is the writer's blank line. It is kept, but as
      // a spacer rather than a <p> the browser collapses to nothing.
      if (!inner) return `<p${blockAttrs(n)}><br /></p>`;
      return `<p${blockAttrs(n)}>${inner}</p>`;
    }

    case "heading": {
      const level = attr(n, "level");
      // h1 belongs to the page title. A write-up starts at h2, and
      // anything deeper than h3 is flattened rather than dropped.
      const tag = level === 2 ? "h2" : "h3";
      return `<${tag}${blockAttrs(n)}>${children(n, o)}</${tag}>`;
    }

    case "bulletList":
      return `<ul>${children(n, o)}</ul>`;
    case "orderedList": {
      const start = attr(n, "start");
      const from = typeof start === "number" && Number.isInteger(start) && start > 1 ? ` start="${start}"` : "";
      return `<ol${from}>${children(n, o)}</ol>`;
    }
    case "listItem":
      return `<li>${children(n, o)}</li>`;

    case "blockquote":
      return `<blockquote>${children(n, o)}</blockquote>`;

    case "horizontalRule":
      return "<hr />";

    case "hardBreak":
      return "<br />";

    case "brsImage": {
      const assetId = attr(n, "assetId");
      if (typeof assetId !== "string" || !assetId) return "";
      const img = o.image(assetId);
      // A picture that has been deleted from the library leaves nothing
      // behind. Not a broken-image icon, and not a caption for an absent
      // photograph.
      if (!img) return "";
      const rawAlign = attr(n, "align");
      const align = isImageAlign(rawAlign) ? rawAlign : "center";
      // The alt written on the node wins over the asset's own, because
      // the same photograph illustrates different sentences in different
      // articles.
      const alt = attr(n, "alt");
      const resolved: RichImage =
        typeof alt === "string" && alt.trim() ? { ...img, alt: alt.trim() } : img;
      // A number between 10 and 99, or nothing. imageWidth() rounds and
      // clamps, so the only thing that can reach this attribute is an
      // integer this file computed — never a string an author supplied.
      const w = imageWidth(attr(n, "width"));
      const ar = imageAspect(attr(n, "crop"));
      /* A CUSTOM PROPERTY, not `width` directly.
         An inline `width` beats every stylesheet rule including media
         queries, so a picture set to 25% on a laptop stayed 25% on a
         phone — a thumbnail, with text wrapped around it. Handing the
         number to CSS instead lets globals.css decide what to do with it
         per breakpoint, which is where that decision belongs. */
      // Both are numbers this file computed and clamped, so neither can
      // carry a character the author chose.
      const vars =
        (w ? `--rt-w:${w}%;` : "") + (ar ? `--rt-ar:${ar};` : "");
      return (
        `<figure class="rt-figure rt-figure-${align}"${vars ? ` style="${vars}"` : ""}>` +
        `${picture(resolved, align, w)}</figure>`
      );
    }

    case "brsEmbed": {
      const provider = attr(n, "provider");
      const videoId = attr(n, "videoId");
      if (!isProvider(provider) || !isVideoId(videoId)) return "";
      const title = attr(n, "title");
      // Same clamp as a picture, and the same reason for handing the
      // number to CSS as a custom property rather than writing an inline
      // width: an inline width beats every media query, and a video
      // pinned to 30% on a laptop is a postage stamp on a phone.
      const w = imageWidth(attr(n, "width"));
      return embed(provider, videoId, typeof title === "string" ? title : "", w);
    }

    case "doc":
      return children(n, o);

    default:
      unknownThing(`node "${type}"`, o);
      return `<span class="rt-unknown">[unsupported: ${escape(type)}]</span>`;
  }
}

/**
 * Returns an HTML string for `dangerouslySetInnerHTML`.
 *
 * The prop name is accurate everywhere else and misleading here, for the
 * same reason it is misleading in lib/markdown.ts: every tag below was
 * written by this file, and every author-supplied byte went through
 * `escape` before reaching the output.
 */
export function renderRichDoc(doc: unknown, options: RenderOptions): string {
  if (!doc || typeof doc !== "object") return "";
  return node(doc as PMNode, options);
}

/** Parse what the database column holds. Returns null for anything that
 *  is not a document, so a caller can fall back to markdown. */
export function parseRichDoc(source: string): PMNode | null {
  try {
    const parsed: unknown = JSON.parse(source);
    if (!parsed || typeof parsed !== "object") return null;
    if ((parsed as PMNode).type !== "doc") return null;
    return parsed as PMNode;
  } catch {
    return null;
  }
}

/** Every asset id the document places inline, in document order. The
 *  content build uses this to keep an inline photograph from also
 *  appearing in the contact sheet underneath the article. */
export function collectAssetIds(doc: unknown): string[] {
  const out: string[] = [];
  const walk = (n: PMNode) => {
    if (n.type === "brsImage") {
      const id = attr(n, "assetId");
      if (typeof id === "string" && id && !out.includes(id)) out.push(id);
    }
    for (const c of asArray(n.content)) walk(c);
  };
  if (doc && typeof doc === "object") walk(doc as PMNode);
  return out;
}

/** Plain text, for meta descriptions and feed-card excerpts — the
 *  stripMarkdown() of this format. */
export function richDocToText(doc: unknown): string {
  const parts: string[] = [];
  const walk = (n: PMNode) => {
    if (n.type === "text" && typeof n.text === "string") parts.push(n.text);
    if (n.type === "hardBreak") parts.push(" ");
    const kids = asArray(n.content);
    for (const c of kids) walk(c);
    // Blocks end with a space so two paragraphs do not run together.
    if (kids.length && n.type !== "text") parts.push(" ");
  };
  if (doc && typeof doc === "object") walk(doc as PMNode);
  return parts.join("").replace(/\s+/g, " ").trim();
}
