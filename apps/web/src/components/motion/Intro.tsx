"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Mark } from "@/components/brand/Mark";

/**
 * THE INTRO — a 2D motion on the BRS mark and the letters B R S.
 *
 * PLACEHOLDER CONTENT, ON INSTRUCTION. The readout strings below are
 * deliberately provisional ("fill it with dummy something now"). They are
 * structurally real — a mono readout column that counts to 100 and then
 * clears — but the specific lines are stand-ins for whatever the society
 * wants stated at the door. They are marked DUMMY in one place so there is
 * no chance of them surviving to launch by accident.
 *
 * WHY 2D AND NOT 3D: the three sections below this one are all 3D. If the
 * first thing on the page also rotates in depth, the depth stops reading as
 * an event by the time you reach the sections that depend on it. The intro
 * is strictly planar — masks, translation, tracking — so the first rotation
 * on the page lands as a surprise.
 *
 * THE MECHANIC:
 *   0.0s  the mark settles — the badge is a diamond, so it arrives rotated
 *         a further 45 degrees onto its side and turns square. Rotation on
 *         a square canvas would be a spin; on a diamond it is a resolution.
 *   0.3s  hairline draws left to right across the middle
 *   0.6s  B R S rise from behind that line, clipped by it, staggered 90ms
 *   1.1s  mono lockup tracks out from under the letters
 *   1.2s  readout counts 000 → 100
 *   2.5s  the whole overlay lifts on the Y axis and the page is underneath
 *
 * ESCAPE HATCHES, because an intro you cannot get past is a defect:
 *   · click or press any key to skip
 *   · prefers-reduced-motion removes it entirely — no flash, no delay
 *   · a 4s failsafe timer removes it even if the timeline never completes
 */

/* DUMMY — replace before launch. */
const READOUT = [
  "SHEET 01 · REV 2026.07",
  "ARCHIVE 2005—2026",
  "DHAKA · BANGLADESH",
];

export function Intro() {
  const root = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setGone(true);
      return;
    }

    const el = root.current;
    if (!el) return;

    // The page must not be scrollable underneath the overlay: scrolling
    // during the intro would start the pinned sections mid-timeline.
    document.body.style.overflow = "hidden";

    const finish = () => {
      document.body.style.overflow = "";
      setGone(true);
    };

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: finish });

      // The mark arrives first and alone. It is the identity; the type is
      // the caption. 45 degrees because the badge is already a diamond —
      // it lands square-on rather than appearing to spin.
      tl.fromTo(
        "[data-intro-mark]",
        { rotate: 45, scale: 0.45, opacity: 0 },
        { rotate: 0, scale: 1, opacity: 1, duration: 1.05, ease: "power4.out" },
        0,
      )
        .fromTo(
          "[data-intro-rule]",
          { scaleX: 0 },
          { scaleX: 1, duration: 0.62, ease: "power3.inOut" },
          0.3,
        )
        .fromTo(
          "[data-intro-letter]",
          { yPercent: 115 },
          { yPercent: 0, duration: 0.78, ease: "power4.out", stagger: 0.09 },
          0.62,
        )
        .fromTo(
          "[data-intro-lockup]",
          { opacity: 0, letterSpacing: "0.6em" },
          { opacity: 1, letterSpacing: "0.22em", duration: 0.9, ease: "power2.out" },
          1.1,
        )
        .fromTo(
          "[data-intro-readout] > *",
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", stagger: 0.07 },
          1.2,
        )
        // The counter is a tweened object rather than 100 DOM writes.
        .to(
          { n: 0 },
          {
            n: 100,
            duration: 1.15,
            ease: "power1.inOut",
            onUpdate() {
              const node = el.querySelector("[data-intro-count]");
              const v = Math.round((this.targets()[0] as { n: number }).n);
              if (node) node.textContent = String(v).padStart(3, "0");
            },
          },
          1.22,
        )
        .to("[data-intro-body] > *", { opacity: 0, duration: 0.3, ease: "power2.in" }, 2.5)
        .to(el, { yPercent: -100, duration: 0.85, ease: "power4.inOut" }, 2.62);

      return () => tl.kill();
    }, root);

    // Skip on any input.
    const skip = () => {
      ctx.revert();
      finish();
    };
    el.addEventListener("click", skip);
    window.addEventListener("keydown", skip);

    // Failsafe: if the timeline is interrupted (tab backgrounded mid-run,
    // a throwing onUpdate), the page must not stay locked behind a veil.
    const failsafe = window.setTimeout(finish, 4000);

    return () => {
      el.removeEventListener("click", skip);
      window.removeEventListener("keydown", skip);
      window.clearTimeout(failsafe);
      document.body.style.overflow = "";
      ctx.revert();
    };
  }, []);

  if (gone) return null;

  return (
    <div
      ref={root}
      // aria-hidden: the page beneath carries the real document outline.
      // A screen reader should never be held at a splash screen.
      aria-hidden="true"
      className="fixed inset-0 z-50 flex flex-col justify-between bg-bg-base px-6 py-8 md:px-16 md:py-12"
    >
      <div data-intro-body className="contents">
        {/* ── Top rail ── */}
        <div className="flex items-start justify-between">
          <span className="font-mono text-micro uppercase text-text-tertiary">
            BUET Robotics Society
          </span>
          <span className="font-mono text-micro uppercase tabular text-text-tertiary">
            <span data-intro-count>000</span>
            <span className="text-accent"> / 100</span>
          </span>
        </div>

        {/* ── The mark and the letters ── */}
        <div className="relative">
          <div data-intro-mark className="mb-8 md:mb-10">
            <Mark size="lg" className="md:hidden" />
            <Mark size="xl" className="max-md:hidden" />
          </div>

          {/* The rule the letters rise from behind. */}
          <span
            data-intro-rule
            className="absolute bottom-0 left-0 right-0 block h-px origin-left bg-line-strong"
          />
          <div className="flex items-end gap-[0.06em] overflow-hidden pb-0">
            {["B", "R", "S"].map((ch) => (
              <span key={ch} className="block overflow-hidden">
                <span
                  data-intro-letter
                  // Smaller than before: the mark above now carries the
                  // identity, so the letters are a lockup rather than the
                  // whole event, and both have to share the viewport.
                  className="optical-left block text-[clamp(4rem,15vw,12rem)] leading-[0.78] text-text-primary"
                  style={{ fontVariationSettings: "'wght' 620" }}
                >
                  {ch}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* ── Bottom rail ── */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <span
            data-intro-lockup
            className="font-mono text-label uppercase text-text-secondary"
          >
            Bangladesh University of Engineering &amp; Technology
          </span>
          <ul data-intro-readout className="text-right">
            {READOUT.map((line) => (
              <li
                key={line}
                className="font-mono text-micro uppercase tabular text-text-tertiary"
              >
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
