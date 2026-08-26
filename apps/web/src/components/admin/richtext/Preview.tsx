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

import { useEffect, useMemo, useRef, useState } from "react";

import { renderMarkdown } from "@/lib/markdown";
import { collectAssetIds, parseRichDoc, renderRichDoc } from "@/lib/richtext/render";
import { assetUrl } from "../PhotoPicker";
import { loadAsset, onAssetsChanged, peekAsset } from "./asset-cache";

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
    const off = onAssetsChanged(() => force((n) => n + 1));
    for (const id of collectAssetIds(doc)) void loadAsset(id);
    return off;
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
      });
    }
    return renderMarkdown(content);
  }, [doc, content, format, arrivals]);

  /* ── MOTION, PLAYED HERE AND NOWHERE ELSE IN THE ADMIN ─────────────
   *
   * The published page arms its animations with an inline script (see
   * RichMotion in app/events/[slug]/page.tsx). This is that script as a
   * React effect, and it is deliberately a COPY for the same reason the
   * video swap above is: the page's version has to be an inline
   * <script> string — the whole point is that it costs no React island
   * — so there is nothing importable to share. If one changes, both
   * change, and the pair name each other.
   *
   * ── ONE REAL DIFFERENCE, AND IT IS THE POINT OF THE TAB ──
   * The page puts `rt-motion` on <html>; this puts it on the preview
   * BOX. Every start state in globals.css is written as a descendant of
   * `.rt-motion`, so scoping it here is what keeps the writing surface
   * still: blocks do not fade and slide while somebody is trying to
   * type into them, and Preview is where the writer goes to watch it
   * play. Pressing Preview again replays it, which is what anybody
   * checking an entrance wants.
   */
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = box.current;
    if (!root) return;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const timers: number[] = [];
    const fmt = (n: number) => n.toLocaleString("en-GB");

    const count = (el: Element) => {
      const to = Number.parseInt(el.getAttribute("data-to") ?? "", 10) || 0;
      const pre = el.getAttribute("data-prefix") ?? "";
      const post = el.getAttribute("data-suffix") ?? "";
      const value = el.querySelector(".rt-count-value");
      if (!value) return;
      let t0 = 0;
      const dur = 1400;
      const step = (t: number) => {
        if (!t0) t0 = t;
        const k = Math.min(1, (t - t0) / dur);
        value.textContent = pre + fmt(Math.round(to * (1 - Math.pow(1 - k, 3)))) + post;
        if (k < 1) requestAnimationFrame(step);
      };
      value.textContent = pre + fmt(0) + post;
      requestAnimationFrame(step);
    };

    const UNITS: [string, number][] = [
      ["Days", 86400000],
      ["Hours", 3600000],
      ["Minutes", 60000],
      ["Seconds", 1000],
    ];
    const tick = (el: Element) => {
      const end = Date.parse(el.getAttribute("data-to") ?? "");
      if (Number.isNaN(end)) return;
      const draw = () => {
        let left = end - Date.now();
        if (left <= 0) {
          el.innerHTML = '<span class="rt-countdown-date">This has now started.</span>';
          return;
        }
        let out = "";
        for (const [unit, ms] of UNITS) {
          const v = Math.floor(left / ms);
          left -= v * ms;
          out +=
            `<span class="rt-countdown-cell"><span class="rt-countdown-n">` +
            `${v < 10 ? "0" : ""}${v}</span><span class="rt-countdown-u">${unit}</span></span>`;
        }
        el.innerHTML = out;
        timers.push(window.setTimeout(draw, 1000));
      };
      draw();
    };

    /* The clock runs either way — see the note in RichMotion on the
       event page. Entrances and the climb are decoration; time left is
       information. */
    root.querySelectorAll("[data-rt-countdown]").forEach(tick);
    if (still) {
      return () => {
        for (const t of timers) window.clearTimeout(t);
      };
    }

    root.classList.add("rt-motion");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("rt-in");
          if (e.target.hasAttribute("data-rt-count")) count(e.target);
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    root.querySelectorAll("[data-rt-anim],[data-rt-count]").forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      for (const t of timers) window.clearTimeout(t);
      root.classList.remove("rt-motion");
    };
  }, [html]);

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
      ref={box}
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
