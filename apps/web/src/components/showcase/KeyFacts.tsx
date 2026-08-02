"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { KEYFACTS } from "@/lib/showcase.generated";
import { ShowcaseImage } from "./ShowcaseImage";

/**
 * SECTION 1 — THE UN-SKEW.  (Reference: client screenshots 1–3.)
 *
 * WHAT THE SCREENSHOTS ACTUALLY SHOW, which is not quite what the brief
 * said: the three plates do not pivot from a horizontal row into a
 * vertical column. They begin *sheared and rotated in depth* — leaning
 * parallelograms, faded, undersized, as though lying at an angle in the
 * space behind the page — and as you scroll they rotate upright, square
 * up, and settle into one flat aligned row facing the viewer.
 *
 * So "horizontal to vertical" describes the plane of each plate, not the
 * axis of the layout: lying down, then standing up. That is the effect
 * built here.
 *
 * WHY SKEW *AND* ROTATE. Rotating in perspective alone produces a
 * trapezoid — one edge near, one edge far. The reference frames show
 * parallelograms, whose edges stay parallel. That is a 2D shear, not a
 * 3D rotation. Using both is what makes the plates read as physical
 * objects being handled rather than as a CSS transform being applied.
 *
 * THE SCRUB IS THE POINT. This is linked to scroll position, not fired on
 * entry — scrub: 1 adds about a frame of lag so the plates trail the
 * scroll very slightly, which is what makes them feel weighted. Drag the
 * scrollbar backwards and they lie back down.
 *
 * THE MIDDLE PLATE IS NOT A PHOTOGRAPH. Three identical image cards is
 * the generated-template pattern. The centre is a pale figure card, and
 * it arrives rotating on X while the outer two rotate on Y — so the
 * group resolves from three different attitudes, not one repeated.
 */

/* Every figure here is either counted from the archive or taken from the
   verified record. No rounding, no "+", nothing estimated — the entire
   point of putting numbers this large on screen is that they hold up when
   an alumnus in the room checks them. */
const FIGURES = {
  programmes: { value: "6", label: "International programmes", note: "2005 — 2015" },
  workshops: { value: "19", label: "Workshops delivered", note: "Basic Workshop now at v8.0" },
  years: { value: "21", label: "Years on record", note: "Founded for ABU Robocon 2005" },
};

export function KeyFacts() {
  const root = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // matchMedia rather than an early return: it registers the teardown
    // with GSAP, so toggling the OS setting live reverts cleanly.
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = { scope: root.current ?? undefined };

      // TRIGGER ON THE PLATE ROW, NOT THE SECTION. The section opens with
      // 224px of padding and a display heading, so its top crosses the
      // viewport roughly 500px before the plates do. Triggering on the
      // section ran the entire un-skew while the plates were still below
      // the fold — the transforms were provably firing and nobody would
      // ever have seen them. The trigger has to be the thing that moves.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: field.current,
          // MEASURED FROM THE ROW'S BOTTOM, NOT ITS TOP. The plates hinge
          // on their bottom edge, so that edge is the only part of the row
          // that holds still — the top edge sweeps down by nearly 400px as
          // they flatten. Triggering on "top" therefore aims at a moving
          // target, and the flattest, most dramatic part of the sequence
          // played out below the fold. The bottom edge is the hinge, so the
          // bottom edge is the reference.
          start: "bottom 100%",
          end: "bottom 55%",
          scrub: 1,
        },
      });

      // ── THE HINGE ────────────────────────────────────────────────────
      // rotateX near 80 degrees with the origin on the bottom edge is what
      // makes a portrait plate read as HORIZONTAL: seen almost edge-on from
      // above, a 4:5 card collapses into a wide flat sliver. Bringing
      // rotateX to 0 stands it up on that bottom edge like a drawbridge,
      // and it becomes VERTICAL. That is the flip, literally — the plate's
      // apparent shape goes from wide to tall, which is the transition in
      // the reference frames.
      //
      // The earlier version rotated and scaled but held the plate portrait
      // the whole way, so it never read as horizontal at any point. That
      // was the miss.
      //
      // rotateY and rotateZ ride on top to produce the sheared parallelogram
      // rather than a clean trapezoid, and they differ per plate so the
      // three do not resolve as one gesture.
      gsap.set("[data-plate]", { transformOrigin: "50% 100%" });

      tl.fromTo(
        "[data-plate='left']",
        { rotateX: 76, rotateY: 20, rotationZ: -4, yPercent: 4, scale: 0.94, opacity: 0.14 },
        {
          rotateX: 0, rotateY: 0, rotationZ: 0, yPercent: 0, scale: 1, opacity: 1,
          ease: "power2.out", duration: 1,
        },
        0,
      )
        .fromTo(
          "[data-plate='mid']",
          { rotateX: 82, rotateY: 0, rotationZ: 0, yPercent: 3, scale: 0.96, opacity: 0.12 },
          {
            rotateX: 0, rotateY: 0, rotationZ: 0, yPercent: 0, scale: 1, opacity: 1,
            ease: "power2.out", duration: 1,
          },
          // Staggered starts, so the row stands up left-to-right instead of
          // as a single block. The reference frames show exactly this: the
          // left plate is already upright while the right one is still flat.
          0.16,
        )
        .fromTo(
          "[data-plate='right']",
          { rotateX: 79, rotateY: -24, rotationZ: 5, yPercent: 5, scale: 0.93, opacity: 0.12 },
          {
            rotateX: 0, rotateY: 0, rotationZ: 0, yPercent: 0, scale: 1, opacity: 1,
            ease: "power2.out", duration: 1,
          },
          0.32,
        );

      // The heading drifts up against the plates rather than with them.
      // Same direction, different rate — that difference is the depth cue.
      gsap.fromTo(
        "[data-kf-head]",
        { yPercent: 18 },
        {
          yPercent: -10,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: 1 },
        },
      );

      void ctx;
      return () => tl.kill();
    });

    return () => mm.revert();
  }, []);

  const [left, right] = KEYFACTS;

  return (
    <section
      ref={root}
      aria-labelledby="kf-heading"
      className="relative px-6 py-24 md:px-16 md:py-40"
    >
      <div className="mx-auto max-w-content">
        <header data-kf-head className="mb-16 text-center md:mb-24">
          <h2
            id="kf-heading"
            className="optical-left text-display-xl text-text-primary"
            style={{ fontVariationSettings: "'wght' 560" }}
          >
            The record
          </h2>
          {/* The evidenced statement, rehoused from the deleted hero. It
              belongs here rather than above a photograph: every clause in
              it is a figure, and the three plates below are those figures.
              Six programmes, nineteen workshops, one award — each one
              checkable, none rounded, no "+" anywhere. */}
          <p className="prose-measure mx-auto mt-8 text-body-l text-text-secondary">
            Robots designed, fabricated and entered into competition at
            Bangladesh University of Engineering &amp; Technology since ABU
            Robocon 2005. Six international programmes. Nineteen workshops.
            One Panasonic Award, in Beijing.
          </p>
        </header>

        {/* The shared 3D field. One perspective origin for all three.
            items-center, not items-end: the middle plate is deliberately
            shorter than its neighbours (see below) and bottom-aligning it
            would open a gap above it instead of insetting it. */}
        {/* Narrower than the content column. At full width the plates are
            ~470px tall, and an upright 470px row plus the display heading
            cannot both hold the screen — the heading is pushed off exactly
            as the row squares up, which is the moment you want to read them
            together. */}
        <div
          ref={field}
          className="field mx-auto grid max-w-4xl grid-cols-1 items-center gap-6 sm:grid-cols-3 md:gap-8"
        >
          {/* ── Left: photograph ── */}
          {left ? (
            <FigurePlate
              slot="left"
              asset={left}
              figure={FIGURES.programmes}
              index="1.00"
            />
          ) : null}

          {/* ── Middle: the pale figure card ── */}
          <div data-plate="mid" className="travelling">
            {/* 3:4 against the outer plates' 4:5 — shorter, and inset by
                the items-center above. Three plates of identical height is
                the shape a template makes; the pale one sitting lower and
                smaller is what makes the row look composed. */}
            <div className="plate-surface flex aspect-[9/10] flex-col items-center justify-between bg-bg-raised px-6 py-10 text-center md:px-8 md:py-12">
              <span className="font-mono text-micro uppercase text-text-tertiary">
                {FIGURES.workshops.label}
              </span>

              {/* A disc, because a number this size needs something to sit
                  inside or it reads as a stray glyph. Square everywhere
                  else on the site; round exactly here, exactly once. */}
              <span className="my-6 flex aspect-square w-28 items-center justify-center rounded-full bg-bg-base md:w-36">
                <span
                  className="text-display-l tabular text-text-primary"
                  style={{ fontVariationSettings: "'wght' 500" }}
                >
                  {FIGURES.workshops.value}
                </span>
              </span>

              <span className="text-body-s text-text-secondary">
                {FIGURES.workshops.note}
              </span>
            </div>
          </div>

          {/* ── Right: photograph ── */}
          {right ? (
            <FigurePlate
              slot="right"
              asset={right}
              figure={FIGURES.years}
              index="1.02"
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function FigurePlate({
  slot,
  asset,
  figure,
  index,
}: {
  slot: "left" | "right";
  asset: (typeof KEYFACTS)[number];
  figure: { value: string; label: string; note: string };
  index: string;
}) {
  return (
    <div data-plate={slot} className="travelling">
      <div className="plate-surface relative aspect-[4/5]">
        <ShowcaseImage asset={asset} sizes="(min-width: 640px) 32vw, 90vw" />

        {/* Drawing-sheet index marker, top left — the one device carried
            over from the static sheet, so the two share a grammar. */}
        <span className="absolute left-4 top-4 font-mono text-micro tabular text-bg-base opacity-80">
          {index}
        </span>

        {/* Solid scrim, not a gradient. A gradient over a photograph is
            the single most common way a page announces it was generated,
            and a flat panel is also the only version whose contrast can
            actually be computed. */}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-[rgb(30_27_25/0.66)] px-5 py-4">
          <span className="font-mono text-micro uppercase text-bg-base">
            {figure.label}
            <span className="mt-1 block opacity-70">{figure.note}</span>
          </span>
          <span
            className="text-display-m tabular leading-none text-bg-base"
            style={{ fontVariationSettings: "'wght' 500" }}
          >
            {figure.value}
          </span>
        </div>
      </div>
    </div>
  );
}
