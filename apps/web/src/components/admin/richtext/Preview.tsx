"use client";

/**
 * THE PAGE, NOT AN APPROXIMATION OF IT.
 *
 * This runs the SAME two renderers the content build runs — markdown.ts
 * for archive entries, richtext/render.ts for anything written in the
 * editor — so what an editor checks before publishing is the article,
 * including the parts that come out as visible text rather than markup.
 *
 * The one honest difference: the build resolves an inline photograph to
 * a full <picture> with the AVIF/WebP derivative ladder, and this
 * resolves it to the single original. The layout is identical; only the
 * bytes a reader would download differ, and there is no derivative list
 * on this side of the API to hand it.
 */

import { useEffect, useMemo, useState } from "react";

import { renderMarkdown } from "@/lib/markdown";
import { collectAssetIds, collectDocumentIds, parseRichDoc, renderRichDoc } from "@/lib/richtext/render";
import { documentUrl } from "../documents";
import { assetUrl } from "../PhotoPicker";
import { loadAsset, onAssetsChanged, peekAsset } from "./asset-cache";
import { loadDocument, onDocumentsChanged, peekDocument } from "./document-cache";

export function RichPreview({ content, format }: { content: string; format: string }) {
  /* Bumped when a photograph this document points at finishes loading.
     It is a render dependency rather than decoration: the memo below
     returned null for that image a moment ago and has to run again. */
  const [arrivals, force] = useState(0);

  const doc = useMemo(
    () => (format === "doc" ? parseRichDoc(content) : null),
    [content, format],
  );

  // Pull in whatever the document points at, then repaint as they land.
  useEffect(() => {
    if (!doc) return;
    const offAssets = onAssetsChanged(() => force((n) => n + 1));
    const offDocuments = onDocumentsChanged(() => force((n) => n + 1));
    for (const id of collectAssetIds(doc)) void loadAsset(id);
    for (const id of collectDocumentIds(doc)) void loadDocument(id);
    return () => {
      offAssets();
      offDocuments();
    };
  }, [doc]);

  const html = useMemo(() => {
    if (format === "doc") {
      if (!doc) {
        return `<p class="rt-unknown">This write-up is stored as a document but the content is not one. Nothing will publish until it is rewritten.</p>`;
      }
      return renderRichDoc(doc, {
        // Not strict: a white-screened admin panel helps nobody. An
        // unknown node shows as a visible marker here, and the content
        // build refuses to publish the same document.
        strict: false,
        image: (id) => {
          const row = peekAsset(id);
          if (!row) return null;
          return {
            src: assetUrl(row),
            alt: row.alt,
            width: row.width,
            height: row.height,
            lqip: row.lqip,
          };
        },
        document: (id) => {
          const row = peekDocument(id);
          if (!row) return null;
          return { src: documentUrl(row), title: row.title };
        },
      });
    }
    return renderMarkdown(content);
  }, [doc, content, format, arrivals]);

  if (!content.trim()) {
    return <p className="text-body-m text-text-tertiary">Nothing written yet.</p>;
  }

  /* THE SAME CLASSES THE EDITOR PUTS ON ITS EDITABLE ELEMENT, and the
     caller puts this inside the same .adm-editor > .adm-richtext box.
     Preview is not a second rendering of the article with its own
     styling — it is the article in the same frame, which is the only
     way the tab is worth anything. `prose` carries the type and the
     line breaking; the width comes from the box. */
  return (
    <div
      className="prose rt-doc adm-richtext-body"
      /**
       * PRESSING PLAY HERE PLAYS THE VIDEO HERE.
       *
       * The renderer emits a facade — a play button over a flat mount,
       * with the real iframe written in only when somebody asks for it
       * (see lib/richtext/render.ts for why a live iframe on page open
       * is not acceptable). On the published page an inline script does
       * that swap. This tab had no such script, so the facade fell back
       * to what it is without JavaScript: an <a> to YouTube. Checking
       * your own page ejected you to another site.
       *
       * This is the same eight lines as the page's script, as a React
       * handler. It is deliberately a COPY rather than a shared module:
       * the page's version has to be an inline <script> string — the
       * whole point is that it costs no React island — so there is
       * nothing importable to share. If the swap ever changes, both
       * change, and the pair are named in each other's comments.
       */
      onClick={(e) => {
        const play = (e.target as HTMLElement).closest?.(".rt-embed-play");
        const box = play?.parentElement;
        const src = box?.getAttribute("data-embed-src");
        if (!play || !box || !src) return;
        e.preventDefault();
        const frame = document.createElement("iframe");
        frame.src = `${src}&autoplay=1`;
        frame.title = play.textContent?.trim() ?? "";
        frame.allow =
          "accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture";
        frame.referrerPolicy = "strict-origin-when-cross-origin";
        frame.allowFullscreen = true;
        box.replaceChild(frame, play);
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
