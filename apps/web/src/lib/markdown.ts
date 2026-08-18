/**
 * ══════════════════════════════════════════════════════════════════════
 * MARKDOWN, FOR TEXT THE CLUB TYPED.
 *
 * ── WHY THIS IS NOT `marked` OR `remark` ──
 * Not because they are bad. Because of what they do by DEFAULT: both pass
 * raw HTML through, which means the moment a committee secretary pastes
 * something containing a <script> tag, or an attacker gets one editor
 * account, every visitor to this site runs their JavaScript. The usual
 * answer is to add a sanitiser — a second dependency, with its own
 * allow-list to keep correct, guarding a feature nobody asked for.
 *
 * Nobody needs raw HTML in an event write-up. So this renders a small,
 * fixed subset and ESCAPES EVERYTHING ELSE. `<script>` in a body comes
 * out as visible text, which is both safe and the correct thing to show
 * someone who typed it by accident.
 *
 * It is not a general markdown implementation and must not be sold as
 * one. It supports what the archive copy and the editor actually use:
 *
 *     ## heading            h2, h3
 *     paragraphs            blank-line separated
 *     - bullets             unordered lists
 *     1. numbers            ordered lists
 *     > quote               blockquote
 *     **bold**  *italic*    inline emphasis
 *     [text](https://…)     links, http(s) and mailto only
 *     ---                   horizontal rule
 *
 * Anything else is left as plain text. No images: pictures on an event
 * page come from `event_assets`, so that they are content-addressed,
 * resized, EXIF-stripped and credited like every other image on the site
 * — a markdown <img> would bypass all of that.
 *
 * ── THE ESCAPING IS THE WHOLE SECURITY MODEL ──
 * `escape()` runs on every character of input BEFORE any rule matches, so
 * no rule can ever emit an attacker's angle bracket. Rules only add tags
 * around text that is already inert. Do not "optimise" by escaping later.
 * ══════════════════════════════════════════════════════════════════════
 */

const escape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** http(s) and mailto. Anything else — javascript:, data: — is dropped
 *  and the link renders as its own text. */
const safeHref = (href: string) => (/^(https?:\/\/|mailto:)/i.test(href) ? href : null);

function inline(text: string): string {
  let out = escape(text);

  // Links before emphasis: a URL can contain underscores and asterisks.
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label: string, href: string) => {
    const url = safeHref(href);
    if (!url) return label;
    const external = !url.startsWith("/");
    return `<a href="${url}"${
      external ? ' target="_blank" rel="noopener noreferrer"' : ""
    }>${label}</a>`;
  });

  out = out
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`\n]+)`/g, "<code>$1</code>");

  return out;
}

/**
 * Returns an HTML string for `dangerouslySetInnerHTML`.
 *
 * The prop name is accurate everywhere else and misleading here: the
 * danger is raw input reaching the DOM, and by this point every byte of
 * input has been escaped. The tags in the output were written above, not
 * supplied by the author.
 */
export function renderMarkdown(source: string): string {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];

  let paragraph: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;
  let quote: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) html.push(`<p>${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list) {
      html.push(
        `<${list.type}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.type}>`,
      );
    }
    list = null;
  };
  const flushQuote = () => {
    if (quote.length) html.push(`<blockquote><p>${inline(quote.join(" "))}</p></blockquote>`);
    quote = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushAll();
      continue;
    }

    const heading = line.match(/^(#{2,3})\s+(.*)$/);
    if (heading) {
      flushAll();
      const level = heading[1]!.length;
      html.push(`<h${level}>${inline(heading[2]!)}</h${level}>`);
      continue;
    }

    if (/^(---+|\*\*\*+)$/.test(line.trim())) {
      flushAll();
      html.push("<hr />");
      continue;
    }

    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      flushQuote();
      if (!list || list.type !== "ul") {
        flushList();
        list = { type: "ul", items: [] };
      }
      list.items.push(bullet[1]!);
      continue;
    }

    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (numbered) {
      flushParagraph();
      flushQuote();
      if (!list || list.type !== "ol") {
        flushList();
        list = { type: "ol", items: [] };
      }
      list.items.push(numbered[1]!);
      continue;
    }

    const quoted = line.match(/^>\s?(.*)$/);
    if (quoted) {
      flushParagraph();
      flushList();
      quote.push(quoted[1]!);
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line.trim());
  }

  flushAll();
  return html.join("\n");
}

/** Plain text, for meta descriptions and card excerpts. */
export function stripMarkdown(source: string): string {
  return source
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
