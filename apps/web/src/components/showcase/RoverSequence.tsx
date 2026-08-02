"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  SEQUENCE_FRAMES,
  SEQUENCE_WIDTH,
  SEQUENCE_HEIGHT,
  SEQUENCE_BACKDROP,
  sequenceFrameUrl,
} from "@/lib/sequence.generated";

/**
 * THE SEQUENCE — a scroll-scrubbed canvas of an exploded-view assembly.
 *
 * 240 frames driven by scroll position: the rover starts whole, comes
 * apart into boards, harnesses, gearing and optics, and settles held open.
 * Scroll forward it disassembles; scroll back it reassembles.
 *
 * ONE PIECE OF TYPE, ON INSTRUCTION. "there will be no writing in side..
 * only one writing will appear". The section carries no heading, no
 * caption, no placard, no index — nothing but the canvas and the wordmark.
 * The wordmark is OUTLINED rather than filled, per the reference: hollow
 * letters let the machine read straight through them, so the one piece of
 * type on screen never hides the thing it is titling.
 *
 * ── WHY A CANVAS AND NOT 240 <img> ELEMENTS ──────────────────────────
 * Stacking images and toggling opacity puts 240 nodes in the layer tree
 * and asks the compositor to keep them all alive. One canvas holds one
 * bitmap. drawImage of an already-decoded frame is a memcpy.
 *
 * ── WHY DECODE UP FRONT ──────────────────────────────────────────────
 * `new Image()` + .src does not guarantee a decoded bitmap; the first
 * drawImage of an undecoded frame can block for tens of milliseconds,
 * which during a scrub reads as a stutter exactly when the user is paying
 * attention. Every frame is explicitly .decode()'d before the pin arms,
 * so scrubbing never touches the decoder.
 *
 * ── WHY THE PIN IS ARMED IMMEDIATELY, NOT AFTER LOADING ──────────────
 * The obvious design is to wait for the frames and then create the pin.
 * It is wrong, and it produced a real bug: a pin inserts a spacer three
 * viewports tall, so arming it seconds after first paint shoves every
 * section below it down by ~2700px — and every ScrollTrigger below had
 * already measured its start against the old layout. The gallery went on
 * pinning at its pre-sequence position, which put two position:fixed
 * sections at top 0 at the same time. The later one painted over this one,
 * so the sequence ran correctly and invisibly underneath the gallery.
 *
 * The pin is therefore created synchronously on mount, before a single
 * frame is fetched. Layout is final from first paint and nothing below
 * ever needs re-measuring.
 *
 * The cost is that the scrub can outrun the decoder on a first visit, so
 * render() clamps to the highest contiguous frame loaded so far. Early
 * scrubbing lags rather than showing holes, and catches up within a second.
 *
 * ── FALLBACKS ────────────────────────────────────────────────────────
 * · prefers-reduced-motion — no pin, no scrub, no 9 MB fetch. One frame,
 *   the settled exploded view, as a plain <img>.
 * · no JavaScript — same single <img> via <noscript>.
 * · below 768px — same. A 9 MB prefetch and a pinned canvas is not a
 *   reasonable thing to do to a phone on Bangladeshi mobile data.
 */

/** The held exploded view. Used as the still for every fallback path. */
const POSTER = SEQUENCE_FRAMES - 1;

export function RoverSequence() {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  // "still" until the effect confirms this client should run the sequence
  // at all. Server-rendered output is always the still, so reduced-motion
  // users and phones never see a canvas appear and never fetch 9 MB.
  const [mode, setMode] = useState<"still" | "canvas">("still");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.matchMedia("(max-width: 767px)").matches;
    if (reduced || small) return;

    setMode("canvas");
    gsap.registerPlugin(ScrollTrigger);

    let cancelled = false;
    const images: HTMLImageElement[] = [];
    const state = { frame: 0 };
    // Highest contiguous frame decoded so far. render() clamps to it, so a
    // scrub that outruns the decoder lags instead of showing nothing.
    let loadedTo = -1;
    let trigger: ScrollTrigger | undefined;

    /** Letterbox the frame into the canvas without distorting it. */
    const render = () => {
      const el = canvas.current;
      if (!el || loadedTo < 0) return;
      const img = images[Math.min(Math.round(state.frame), loadedTo)];
      if (!img?.complete) return;
      const ctx = el.getContext("2d", { alpha: false });
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (el.width !== Math.round(cw * dpr) || el.height !== Math.round(ch * dpr)) {
        el.width = Math.round(cw * dpr);
        el.height = Math.round(ch * dpr);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = SEQUENCE_BACKDROP;
      ctx.fillRect(0, 0, cw, ch);

      const scale = Math.min(cw / SEQUENCE_WIDTH, ch / SEQUENCE_HEIGHT);
      const w = SEQUENCE_WIDTH * scale;
      const h = SEQUENCE_HEIGHT * scale;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    };

    const load = (i: number) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.src = sequenceFrameUrl(i);
        images[i] = img;
        const done = () => resolve();
        // .decode() rejects on some browsers for images already in cache;
        // onload is the floor, decode is the upgrade.
        img.decode().then(done, () => (img.complete ? done() : (img.onload = done)));
        img.onerror = done;
      });

    // ── The pin, created NOW. See the header note: deferring this is what
    //    silently put the gallery on top of this section. ──
    trigger = ScrollTrigger.create({
      trigger: root.current,
      start: "top top",
      // Three viewports of scroll across 240 frames — roughly 11px per
      // frame at 900px tall, which is slow enough to read the assembly
      // and fast enough not to feel like a hostage situation.
      end: "+=300%",
      pin: true,
      scrub: 0.6,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        state.frame = self.progress * (SEQUENCE_FRAMES - 1);
        render();
        // The wordmark resolves over the last third, once the machine is
        // open. Driven off the same progress so it cannot desynchronise.
        const t = gsap.utils.clamp(0, 1, (self.progress - 0.62) / 0.3);
        gsap.set("[data-seq-word]", { opacity: t, letterSpacing: `${0.4 - t * 0.28}em` });
      },
    });

    (async () => {
      // Frame 0 first so something is on screen immediately, then the rest
      // in bounded batches — 240 parallel requests starves the connection
      // pool and the early frames arrive last.
      await load(0);
      if (cancelled) return;
      loadedTo = 0;
      render();

      const BATCH = 16;
      for (let i = 1; i < SEQUENCE_FRAMES; i += BATCH) {
        if (cancelled) return;
        const n = Math.min(BATCH, SEQUENCE_FRAMES - i);
        await Promise.all(Array.from({ length: n }, (_, k) => load(i + k)));
        loadedTo = i + n - 1;
        setProgress((loadedTo + 1) / SEQUENCE_FRAMES);
        // Keep drawing as frames arrive, so a user already scrolled into
        // the section watches it catch up rather than sitting on frame 0.
        render();
      }
      if (cancelled) return;
      setReady(true);
      render();
    })();

    const onResize = () => render();
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      trigger?.kill();
      images.length = 0;
    };
  }, []);

  return (
    <section
      ref={root}
      aria-label="Exploded-view assembly of a planetary rover"
      // The frames' own measured backdrop, so the letterbox edge has no
      // seam against the canvas.
      style={{ backgroundColor: SEQUENCE_BACKDROP }}
      className="relative flex h-screen items-center justify-center overflow-hidden max-md:h-auto max-md:py-16"
    >
      {mode === "canvas" ? (
        <canvas ref={canvas} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      ) : (
        /* The still. This is what the server renders, and what phones and
           reduced-motion clients keep — they never fetch the sequence. */
        <img
          src={sequenceFrameUrl(POSTER)}
          alt="A planetary rover shown in exploded view, its boards, wiring harnesses, gearing and optics separated from the chassis"
          width={SEQUENCE_WIDTH}
          height={SEQUENCE_HEIGHT}
          className="relative max-h-full w-full max-w-5xl object-contain"
        />
      )}

      <noscript>
        <img
          src={sequenceFrameUrl(POSTER)}
          alt="A planetary rover shown in exploded view, its boards, wiring harnesses, gearing and optics separated from the chassis"
          width={SEQUENCE_WIDTH}
          height={SEQUENCE_HEIGHT}
          className="relative w-full max-w-5xl object-contain"
        />
      </noscript>

      {/* ── THE ONE PIECE OF TYPE ──────────────────────────────────────
          Outlined, not filled. The machine reads through the letters, so
          the title never covers the subject. */}
      {/* <h1>, not <h2>. The deleted hero owned the page's only top-level
          heading, and a landing page with no h1 is a real defect rather
          than a style question. This lockup is the page's title in every
          sense — so it carries the tag, and the outline treatment means it
          does that without covering the machine. */}
      <h1
        data-seq-word
        style={{ opacity: 0, letterSpacing: "0.4em" }}
        className="pointer-events-none relative select-none text-center text-[clamp(1.5rem,5.4vw,4.5rem)] font-semibold uppercase leading-[1.12] text-transparent max-md:opacity-100!"
      >
        {/* 2px, not 1.5px: at 1.5 the stroke thins to nothing against the
            brightest parts of the render and the lockup half-disappears. */}
        <span className="block [-webkit-text-stroke:2px_rgb(232_237_239/0.95)]">
          BUET Robotics
        </span>
        <span className="block [-webkit-text-stroke:2px_rgb(232_237_239/0.95)]">
          Society
        </span>
      </h1>

      {/* Decode progress. Mono, tiny, bottom-right — it exists so a long
          first load never looks like a broken page, and it removes itself. */}
      {mode === "canvas" && !ready ? (
        <span className="absolute bottom-6 right-6 font-mono text-micro uppercase tabular text-[rgb(226_232_234/0.42)]">
          Loading sequence {String(Math.round(progress * 100)).padStart(3, "0")} / 100
        </span>
      ) : null}
    </section>
  );
}
