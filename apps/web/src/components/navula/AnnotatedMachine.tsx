"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { NAVULA } from "@/lib/navula";
import { Mount } from "./Mount";

/**
 * §04 — THE FLAGSHIP, ANNOTATED.
 *
 * One photograph of a whole machine. As it enters, hairline leader lines
 * DRAW from the margins onto five parts, each arriving with a placard:
 * plate number, part, one measured fact.
 *
 * ── WHY THIS SECTION IS OPTIONAL ─────────────────────────────────────
 * Navula is a competition squad, not a build team: it fields whatever a
 * given competition requires, and those machines are recorded against
 * their campaigns in §06. So there is not necessarily ONE machine to put
 * at the top of a page.
 *
 * This section exists for the case where the team has a flagship it
 * wants shown large and explained — the current entry, or the one it is
 * known for. Set `flagship` to null in lib/navula.ts and the page drops
 * the section entirely; nothing else needs changing.
 *
 * ── WHY THIS AND NOT A GALLERY ───────────────────────────────────────
 * A gallery of robot photographs says a robot exists. An annotated
 * drawing says somebody understands it. The page is arguing the second
 * thing, so this gets the largest image and the only real drawing.
 *
 * ── WHY LINES AND NOT BOXES ──────────────────────────────────────────
 * globals.css states the structural order: prefer a 1px rule over a
 * filled panel, a panel over a shadow. A callout is normally a floating
 * rounded box with a shadow, which breaks all three. A leader line is
 * literally a 1px rule, so the most elaborate effect on the site is also
 * its most obedient one.
 *
 * ── THE DISTORTED VIEWBOX, DELIBERATELY ──────────────────────────────
 * The overlay is a 0-100 square stretched over a non-square photograph
 * with preserveAspectRatio="none". That is what lets a callout be
 * authored as a plain percentage in navula.ts — "the drive is 30% across
 * and 68% down" — without anyone needing to know the image's ratio.
 *
 * The cost is that the geometry shears, which would normally also shear
 * the stroke into a wedge. vector-effect="non-scaling-stroke" is what
 * pays that cost: the stroke is rasterised after the transform, so every
 * line is exactly 1px at every viewport width. The target markers are
 * HTML elements rather than SVG circles for the same reason — a circle
 * in this viewBox would render as an ellipse.
 *
 * ── FALLBACKS ────────────────────────────────────────────────────────
 * · The lines are fully drawn in the server output. Dash attributes are
 *   applied by the effect, so no JS means the finished diagram.
 * · Below 768px the callouts stop being positioned and become a plain
 *   register beneath the photograph — see .navula-callout in globals.css.
 *   Annotation over a phone-width image is illegible, and shrinking the
 *   type until it fits is not a fix.
 * · prefers-reduced-motion: no timeline, everything final.
 */
export function AnnotatedMachine() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // The callouts are not positioned below 768px, so there is nothing
    // to draw onto and no reason to fetch a timeline for it.
    if (window.matchMedia("(max-width: 767px)").matches) return;

    const el = root.current;
    if (!el) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const lines = gsap.utils.toArray<SVGPathElement>("[data-leader]");
      const placards = gsap.utils.toArray<HTMLElement>("[data-callout]");

      // Each line's dash pattern is its OWN measured length. A shared
      // constant would leave short lines finishing early and long ones
      // clipped — the classic tell of a copied draw-on snippet.
      lines.forEach((line) => {
        const length = line.getTotalLength();
        gsap.set(line, { strokeDasharray: length, strokeDashoffset: length });
      });
      gsap.set(placards, { opacity: 0, y: 8 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: "top 70%",
          end: "bottom 70%",
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });

      tl.to(lines, {
        strokeDashoffset: 0,
        duration: 1,
        stagger: 0.35,
        ease: "none",
      }).to(
        placards,
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.35, ease: "none" },
        // Offset by a third of a line's draw: the placard lands while
        // its own line is still travelling, so the two read as one
        // gesture instead of a queue.
        0.3,
      );
    }, el);

    return () => ctx.revert();
  }, []);

  const flagship = NAVULA.flagship;
  const { photo, callouts } = flagship;

  return (
    <section
      aria-labelledby="navula-machine"
      className="border-t border-line-hairline px-6 py-24 md:px-16 md:py-40"
    >
      <div className="mx-auto max-w-shell">
        <header className="flex flex-wrap items-baseline justify-between gap-6">
          <h2
            id="navula-machine"
            className="font-mono text-micro uppercase text-text-tertiary"
          >
            The flagship
          </h2>
          {/* Designation and what it was built for, so the machine is
              tied to a campaign rather than floating free of one. */}
          <p className="font-mono text-micro uppercase text-text-tertiary tabular">
            {flagship.designation} · Built for {flagship.builtFor}
          </p>
        </header>

        <div ref={root} className="navula-callouts relative mt-12">
          {/* THE FIGURE. Inset on desktop so the callouts have margins to
              live in — see .navula-figure in globals.css.

              This is not a proportion chosen by eye. The placards were
              first laid over the photograph itself, and they were
              illegible for a structural reason rather than a stylistic
              one: the mount is near-black by design, and every text
              token on a light field resolves to near-black too, so the
              labels were dark-on-dark and clipped at both edges.

              Inset the plate and the problem disappears at its source.
              The placards sit on the page ground where the light palette
              is legible, the leader lines enter the frame from outside
              it, and the section becomes what it was always meant to be:
              a drawing with margins, annotated in them. */}
          <div className="navula-figure relative">
            <Mount
              photo={photo}
              ratio="16 / 10"
              sizes="(min-width: 768px) 56vw, 100vw"
            />

            {/* THE LINES. Decoration: every word a reader needs is in the
                placards, which are real text in the flow. */}
            <svg
              aria-hidden="true"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
            >
              {callouts.map((c) => {
                // A leader line runs horizontally out of its placard, then
                // breaks once toward the part. Two segments, one bend —
                // the convention every engineering drawing uses, and the
                // reason the lines stay readable when five of them share
                // an image.
                const startX = c.side === "left" ? 2 : 98;
                const bendX = c.side === "left" ? 22 : 78;
                return (
                  <polyline
                    key={c.plate}
                    data-leader
                    points={`${startX},${c.label} ${bendX},${c.label} ${c.at.x},${c.at.y}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                    className="text-accent"
                  />
                );
              })}
            </svg>

            {/* THE TARGET MARKERS. HTML, so they stay square in the
                stretched overlay. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden md:block">
              {callouts.map((c) => (
                <span
                  key={c.plate}
                  className="absolute block h-2 w-2 -translate-x-1 -translate-y-1 border border-accent bg-mount"
                  style={{ left: `${c.at.x}%`, top: `${c.at.y}%` }}
                />
              ))}
            </div>
          </div>

          {/* THE PLACARDS. In the margins beside the plate on desktop,
              a plain register beneath it on a phone. One list either way
              — nothing here is duplicated for a breakpoint, and nothing
              is hidden at one size and shown at another. */}
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 md:mt-0 md:block">
            {callouts.map((c) => (
              <li
                key={c.plate}
                data-callout
                data-side={c.side}
                className="navula-callout"
                style={{ "--navula-label": `${c.label}%` } as React.CSSProperties}
              >
                <span className="block font-mono text-micro uppercase text-accent tabular">
                  PL. {String(c.plate).padStart(3, "0")}
                </span>
                <span className="mt-1 block text-heading-s text-text-primary">
                  {c.part}
                </span>
                <span className="mt-1 block font-mono text-micro uppercase text-text-secondary tabular">
                  {c.spec}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
