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
  calloutTone,
  cellAlign,
  cellVAlign,
  gridDensity,
  gridRowRem,
  gridWAt,
  gridX,
  gridY,
  gridH,
  buttonAttrs,
  cardAlign,
  cardVariant,
  columnCount,
  embedSrc,
  embedWatchUrl,
  imageAspect,
  imageWidth,
  pdfHeight,
  isAlign,
  isImageAlign,
  isHeadingLevel,
  isPdfDataUrl,
  isProvider,
  isVideoId,
  richIconSvg,
  richLead,
  richStyleAttrs,
  sectionScrim,
  sectionTone,
  spacerSize,
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

/**
 * What the walk carries that the CALLER does not supply.
 *
 * Anchors are the reason this exists. A heading's id has to be unique
 * within the page, which means the thing that mints one has to remember
 * every id it has already minted — and that memory has to be per-render,
 * not per-module, or the second event built in the same process would
 * start numbering its anchors from wherever the first one stopped.
 *
 * Internal. The exported RenderOptions is still the two fields a caller
 * knows about.
 */
type Ctx = RenderOptions & { anchors: Set<string> };

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

  const style = lead ? `--rt-lh:${lead};` : "";

  return (
    (classes.length ? ` class="${classes.join(" ")}"` : "") +
    (style ? ` style="${style}"` : "")
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

function wrapMarks(inner: string, marks: unknown, o: Ctx): string {
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

function unknownThing(what: string, o: Ctx): void {
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
function picture(
  img: RichImage,
  align: string,
  width: number | null,
  /** Overrides the computed `sizes`. A band's background is the width of
   *  the WINDOW, not of the measure, so the ch-based guess below would
   *  have it fetch a 700px derivative for a 2560px field. */
  sizesOverride?: string,
): string {
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
  const sizes =
    sizesOverride ??
    `(min-width: 72ch) ${Math.max(1, Math.round(72 * frac))}ch, ${Math.max(
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

/** Every character of text under a node, marks and nesting ignored. */
const textOf = (n: PMNode): string =>
  typeof n.text === "string" ? n.text : asArray(n.content).map(textOf).join("");

/**
 * A HEADING'S ANCHOR, so a long announcement can be linked into.
 *
 * "SEGMENTS" becomes `#segments`, and a button elsewhere on the page can
 * point at it. Nothing in the editor asks for this — it is minted from
 * the words that are already there, because an id somebody has to
 * remember to fill in is an id that is empty on every page.
 *
 * ── WHY THE OUTPUT NEEDS NO ESCAPING ──
 * The regex keeps `a-z`, `0-9` and `-`, and drops every other byte
 * rather than replacing it. There is no input — not a quote, not an
 * angle bracket, not a space — that survives into the returned string.
 * That is a whitelist, not a sanitiser, and it is the same shape of
 * check as every other value this file lets through.
 *
 * Collisions are numbered rather than allowed: two sections called
 * "Rules" give `#rules` and `#rules-2`, so the first link on the page
 * does not silently win.
 */
function anchorFor(text: string, o: Ctx): string | null {
  const base = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  if (!base) return null;

  let id = base;
  let n = 2;
  while (o.anchors.has(id)) id = `${base}-${n++}`;
  o.anchors.add(id);
  return id;
}

/**
 * Whether a subtree already contains something clickable.
 *
 * A card can be given a destination of its own — the whole box becomes
 * the link, which is how a grid of segments behaves everywhere. But a
 * card can also CONTAIN a link or a button, and an <a> inside an <a> is
 * invalid HTML that browsers do not merely tolerate: the parser closes
 * the outer anchor early and re-opens it after, which leaves a second
 * link in the tab order with no accessible name and a card whose top
 * half goes somewhere different from its bottom half.
 *
 * So the outer link is dropped rather than the inner one. The card
 * keeps the writing the editor put in it; it just stops being a link
 * itself, which is the half of the conflict a reader can actually see.
 */
function hasInteractive(n: PMNode): boolean {
  if (n.type === "brsButton") return true;
  if (Array.isArray(n.marks) && (n.marks as PMNode[]).some((m) => m && m.type === "link")) {
    return true;
  }
  return asArray(n.content).some(hasInteractive);
}

/* ── The walk ─────────────────────────────────────────────────────────── */

function children(n: PMNode, o: Ctx): string {
  return asArray(n.content)
    .map((c) => node(c, o))
    .join("");
}

function node(n: PMNode, o: Ctx): string {
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
      /* h1 belongs to the page title — the event page already renders
         one, and a second is the heading fault that makes a document
         outline useless. h5 and h6 are flattened to h3 rather than
         dropped, which is what a document written before h4 existed
         needs. See RICH_HEADING_LEVELS. */
      const raw = attr(n, "level");
      const level = isHeadingLevel(raw) ? raw : 3;
      const id = anchorFor(textOf(n), o);
      return (
        `<h${level}${id ? ` id="${id}"` : ""}${blockAttrs(n)}>` +
        `${children(n, o)}</h${level}>`
      );
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

    /* ── A TAB ─────────────────────────────────────────────────────
       What Tab writes: a gap in the line, at the point the writer put
       it. There is nothing of the author's in this tag — not a
       character, not a number — so it is a literal string, and its
       width is one rule in the stylesheet that the editor reads too. */
    case "brsTab":
      return `<span class="rt-tab"></span>`;

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

    /* ── A PDF, SHOWN WHOLE ────────────────────────────────────────
       The <iframe src> is the one place in this renderer that carries a
       URL an author supplied, so it is also the most carefully guarded.
       isPdfDataUrl demands the exact `data:application/pdf;base64,`
       prefix and a base64 tail — the MIME is fixed by us, not read from
       the file, so the browser renders a PDF and cannot be coaxed into
       rendering markup, and base64 has no character that could close the
       attribute. Anything failing the test renders NOTHING, the same as
       a deleted picture. */
    case "brsPdf": {
      const src = attr(n, "src");
      if (!isPdfDataUrl(src)) return "";
      const nameRaw = attr(n, "name");
      const name = typeof nameRaw === "string" && nameRaw.trim() ? nameRaw.trim() : "PDF document";
      const rawAlign = attr(n, "align");
      const align = isImageAlign(rawAlign) ? rawAlign : "center";
      // Width in percent, height in px — both computed and clamped here,
      // never a character the author chose. The width rides a custom
      // property so a media query can override it on a phone; the height
      // is fixed pixels because a PDF box has no aspect to reflow.
      const w = imageWidth(attr(n, "width"));
      const h = pdfHeight(attr(n, "height"));
      const vars = (w ? `--rt-w:${w}%;` : "") + `--rt-pdf-h:${h}px;`;
      /* ── NO `sandbox`, AND THAT IS MEASURED RATHER THAN ASSUMED ──
         It used to carry sandbox="allow-scripts", on the reasoning that
         the viewer needs its own scripts and nothing else. The reasoning
         was sound and the result was not: Chrome refuses to hand a
         `data:` PDF to its viewer through a sandboxed frame AT ALL, with
         ANY value of the attribute — allow-scripts, allow-same-origin,
         both together, the lot. Checked one combination at a time in
         Chromium: every one drew the grey broken-document icon, and only
         the frame with no attribute showed the document. So the choice
         was never "sandboxed viewer or open viewer", it was "no document
         or a document".

         WHAT STILL HOLDS IT SHUT is the MIME, not the attribute. The src
         passed isPdfDataUrl, so it is `data:application/pdf;base64,` —
         and a `data:` document has an opaque origin no attribute can
         widen, so it cannot read this page, its cookies or its storage.
         Bytes of HTML uploaded under that MIME do not become a page
         either: the browser hands them to the PDF viewer, which fails to
         parse them. Verified the same way — a data:application/pdf frame
         whose payload was <script> and an onerror handler executed
         nothing, messaged nothing, and navigated nothing, with no
         sandbox attribute present.

         What the attribute did buy, and what a PDF from the library can
         now do, is a link the reader clicks and a form the reader
         submits. The file is uploaded by a signed-in editor, which is
         the same trust as every other thing on this page. */
      return (
        `<figure class="rt-figure rt-pdf rt-figure-${align}" style="${vars}">` +
        `<div class="rt-pdf-frame">` +
        `<iframe class="rt-pdf-iframe" src="${escape(src)}#toolbar=1&navpanes=0&view=FitH"` +
        ` title="${escape(name)}" loading="lazy"></iframe>` +
        `</div></figure>`
      );
    }

    /* ── A CALL TO ACTION ──────────────────────────────────────────
       The label and the address are the only author bytes here, and
       both go through escape(). Everything else in the tag is a class
       built from a value that buttonAttrs coerced into one
       of a handful of strings this build names. */
    case "brsButton": {
      const href = safeHref(attr(n, "href"));
      const raw = attr(n, "label");
      const label = typeof raw === "string" ? raw.trim() : "";
      if (!href || !label) return "";

      /* Class and style from the same builder the node view uses, so
         the draft and this are one implementation rather than two that
         drift. Every value inside has been through a coercer or the hex
         set-membership test, so nothing an author typed reaches the
         attribute unescaped. */
      const look = buttonAttrs({
        variant: attr(n, "variant"),
        size: attr(n, "size"),
        radius: attr(n, "radius"),
        bg: attr(n, "bg"),
        fg: attr(n, "fg"),
        weight: attr(n, "weight"),
        italic: attr(n, "italic"),
        underline: attr(n, "underline"),
        caps: attr(n, "caps"),
      });

      const away = href.startsWith("/")
        ? ""
        : ' target="_blank" rel="noopener noreferrer"';

      /* NO ALIGNMENT AND NO OFFSET. Both used to be written here, and
         the alignment half was a class — rt-btn-wrap-center — that no
         stylesheet has ever defined, so it did nothing on the published
         page while appearing to work in the editor. The honest version
         is that a button is an inline node: it sits where the writer put
         it in the sentence, and the paragraph's own text-align (see
         blockAttrs) decides where the line sits. One mechanism, and it
         is the one that already survives a phone screen. */
      return (
        `<span class="rt-btn-wrap">` +
        `<a class="${look.class}"${look.style ? ` style="${look.style}"` : ""}` +
        ` href="${escape(href)}"${away}>${escape(label)}</a></span>`
      );
    }

    /* ── A ROW OF COLUMNS ──────────────────────────────────────────
       The count is the desktop count; what happens on a narrow screen
       is globals.css's decision, not the document's. See
       RICH_COLUMN_COUNTS in palette.ts. */
    case "brsColumns": {
      const inner = children(n, o);
      // Every card was emptied or dropped. An empty grid is a gap in the
      // page that nobody can see to delete.
      if (!inner) return "";
      return `<div class="rt-cols rt-cols-${columnCount(attr(n, "cols"))}">${inner}</div>`;
    }

    /* ── ONE CARD ──────────────────────────────────────────────────
       Its text is real child content rather than attributes, so
       richDocToText() below finds it and the page keeps a meta
       description even when the whole body is cards. */
    case "brsCard": {
      const variant = cardVariant(attr(n, "variant"));
      const align = cardAlign(attr(n, "align"));
      const icon = richIconSvg(attr(n, "icon"));
      const inner =
        (icon ? `<span class="rt-card-icon">${icon}</span>` : "") + children(n, o);
      const cls = `rt-card rt-card-${variant} rt-card-${align}`;

      const href = safeHref(attr(n, "href"));
      if (href && !hasInteractive(n)) {
        const away = href.startsWith("/")
          ? ""
          : ' target="_blank" rel="noopener noreferrer"';
        return `<a class="${cls} rt-card-link" href="${escape(href)}"${away}>${inner}</a>`;
      }
      return `<div class="${cls}">${inner}</div>`;
    }

    /* ── A CALLOUT ─────────────────────────────────────────────────
       The sentence a reader must not miss. Tone is a token name, so it
       is the one element on the page whose contrast is right in both
       themes by construction rather than by somebody checking. */
    case "brsCallout": {
      const inner = children(n, o);
      if (!inner) return "";
      const icon = richIconSvg(attr(n, "icon"));
      return (
        `<div class="rt-callout rt-callout-${calloutTone(attr(n, "tone"))}">` +
        (icon ? `<span class="rt-callout-icon">${icon}</span>` : "") +
        `<div class="rt-callout-body">${inner}</div></div>`
      );
    }

    /* ── DELIBERATE EMPTY SPACE ────────────────────────────────────
       aria-hidden and empty: it is a gap, and a gap announced to a
       screen reader is noise. */
    case "brsSpacer":
      return `<div class="rt-spacer rt-spacer-${spacerSize(attr(n, "size"))}" aria-hidden="true"></div>`;

    /* ── AN ACCORDION ──────────────────────────────────────────────
       <details> and <summary>, which is the browser's own disclosure
       widget: it opens without JavaScript, it is in the tab order
       already, it announces its state to a screen reader, and Ctrl+F
       opens it to reach text inside. A div with a click handler would
       have been none of those four. */
    case "brsDetails": {
      const kids = asArray(n.content);
      const head = kids.find((k) => k.type === "brsSummary");
      const summary = head ? children(head, o) : "";
      const body = kids
        .filter((k) => k.type !== "brsSummary")
        .map((k) => node(k, o))
        .join("");
      if (!summary && !body) return "";
      // The fallback is this file's own bytes, not an author's.
      return (
        `<details class="rt-details"${attr(n, "open") === true ? " open" : ""}>` +
        `<summary class="rt-summary">${summary || "Details"}</summary>` +
        `<div class="rt-details-body">${body}</div></details>`
      );
    }

    /* Rendered by its parent, above. Reached on its own only by a
       document that has been edited by hand, and then it is just its
       words rather than a thrown build. */
    case "brsSummary":
      return children(n, o);

    /* ── A FULL-BLEED BAND ─────────────────────────────────────────
       The only block that leaves the article's measure — see
       RICH_SECTION_TONES for the mechanics and for why the background
       is an <img> rather than a CSS url(). */
    case "brsSection": {
      const inner = children(n, o);
      const assetId = attr(n, "assetId");
      const img = typeof assetId === "string" && assetId ? o.image(assetId) : null;
      if (!inner && !img) return "";

      const tone = sectionTone(attr(n, "tone"));
      const scrim = sectionScrim(attr(n, "scrim"));

      /* alt="" DELIBERATELY. A band's background is decoration behind
         the words on top of it; describing it twice is what makes a
         screen reader read a page's furniture aloud. */
      const bg = img
        ? `<div class="rt-band-bg" aria-hidden="true">` +
          `${picture({ ...img, alt: "" }, "center", 100, "100vw")}</div>`
        : "";
      const veil =
        img && scrim !== "none"
          ? `<div class="rt-band-scrim rt-band-scrim-${scrim}" aria-hidden="true"></div>`
          : "";

      return (
        `<section class="rt-band rt-band-${tone}${img ? " rt-band-photo" : ""}">` +
        `${bg}${veil}<div class="rt-band-inner">${inner}</div></section>`
      );
    }

    /* ── A TABLE ───────────────────────────────────────────────────
       The node names are prosemirror-tables', not ours, because the
       editing behaviour — tab between cells, select a rectangle, merge,
       split — is that library's and it addresses its own schema by
       those names. Renaming them would mean forking it.

       A FIRST ROW OF HEADER CELLS BECOMES A <thead>. Not cosmetic: it
       is what lets a screen reader say "Prize, second place, 50,000"
       instead of reading three loose numbers. */
    case "table": {
      const rows = asArray(n.content);
      const [firstRow] = rows;
      const first = firstRow ? asArray(firstRow.content) : [];
      const headed =
        firstRow !== undefined && first.length > 0 && first.every((c) => c.type === "tableHeader");

      const head = headed && firstRow ? `<thead>${node(firstRow, o)}</thead>` : "";
      const body = (headed ? rows.slice(1) : rows).map((r) => node(r, o)).join("");
      if (!head && !body) return "";

      /* THE WRAPPER IS NOT DECORATION. A table wider than the measure
         otherwise takes the whole PAGE's horizontal scrollbar with it,
         which is the one layout fault that is invisible on the machine
         it was built on and unmissable on a phone. */
      return (
        `<div class="rt-table-wrap"><table class="rt-table">` +
        `${head}${body ? `<tbody>${body}</tbody>` : ""}</table></div>`
      );
    }

    case "tableRow":
      return `<tr>${children(n, o)}</tr>`;

    case "tableCell":
    case "tableHeader": {
      const tag = type === "tableHeader" ? "th" : "td";
      const span = (k: string) => {
        const v = attr(n, k);
        return typeof v === "number" && Number.isInteger(v) && v > 1 && v <= 100 ? v : 1;
      };
      const cs = span("colspan");
      const rs = span("rowspan");
      return (
        `<${tag}${cs > 1 ? ` colspan="${cs}"` : ""}${rs > 1 ? ` rowspan="${rs}"` : ""}` +
        // Only column headers are offered by the toolbar, so the scope
        // is known rather than guessed.
        `${tag === "th" ? ' scope="col"' : ""}>${children(n, o)}</${tag}>`
      );
    }

    /* ── A LAYOUT AREA ─────────────────────────────────────────────
       Twenty-four columns and rows of a fixed height. Free placement
       that cannot overlap — see the layout note in palette.ts.

       The column count is a literal from this file, and the row height
       is a number looked up in this file's own table. Neither is
       author-supplied, so neither needs escaping. */
    case "brsGrid": {
      const inner = children(n, o);
      const assetId = attr(n, "assetId");
      const img = typeof assetId === "string" && assetId ? o.image(assetId) : null;
      if (!inner && !img) return "";

      const tone = sectionTone(attr(n, "tone"));
      const scrim = sectionScrim(attr(n, "scrim"));
      const density = gridDensity(attr(n, "density"));

      const bg = img
        ? `<div class="rt-grid-bg" aria-hidden="true">` +
          `${picture({ ...img, alt: "" }, "center", 100, "100vw")}</div>`
        : "";
      const veil =
        img && scrim !== "none"
          ? `<div class="rt-band-scrim rt-band-scrim-${scrim}" aria-hidden="true"></div>`
          : "";

      return (
        `<div class="rt-grid rt-grid-${tone} rt-grid-d-${density}` +
        `${img ? " rt-grid-photo" : ""}" style="--rt-row:${gridRowRem(density)}rem;">` +
        `${bg}${veil}<div class="rt-grid-stage">${inner}</div></div>`
      );
    }

    /* ── ONE CELL ──────────────────────────────────────────────────
       Stored zero-based because that is what the editor's arithmetic
       wants; converted to CSS's one-based grid lines here, at the one
       point where it becomes a grid-column.

       The SPAN is clamped against the start, so a cell stored at column
       20 with a width of 10 stops at the edge instead of wrapping onto
       the next row. */
    case "brsCell": {
      const inner = children(n, o);
      if (!inner) return "";
      const x = gridX(attr(n, "x"));
      const y = gridY(attr(n, "y"));
      const w = gridWAt(attr(n, "x"), attr(n, "w"));
      const h = gridH(attr(n, "h"));
      return (
        `<div class="rt-cell rt-cell-${cellAlign(attr(n, "align"))}` +
        ` rt-cell-v-${cellVAlign(attr(n, "valign"))}"` +
        ` style="--cx:${x + 1};--cy:${y + 1};--cw:${w};--ch:${h};">${inner}</div>`
      );
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
  // A fresh anchor set per document — see Ctx.
  return node(doc as PMNode, { ...options, anchors: new Set<string>() });
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
    if (n.type === "hardBreak" || n.type === "brsTab") parts.push(" ");
    const kids = asArray(n.content);
    for (const c of kids) walk(c);
    // Blocks end with a space so two paragraphs do not run together.
    if (kids.length && n.type !== "text") parts.push(" ");
  };
  if (doc && typeof doc === "object") walk(doc as PMNode);
  return parts.join("").replace(/\s+/g, " ").trim();
}
