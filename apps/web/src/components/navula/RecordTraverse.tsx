"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { NAVULA } from "@/lib/navula";
import { Mount } from "./Mount";

/**
 * §06 — THE RECORD. A pinned traverse, built as a timeline.
 *
 * THE CENTREPIECE OF THE PAGE, and it earned that position by what the
 * club said Navula is: the team that represents the Society at every
 * competition it enters. A squad defined by competing should build
 * toward its record rather than list it near the bottom, so this is the
 * last loud section and everything after it is quiet.
 *
 * The section pins and vertical scroll becomes horizontal travel, the
 * same mechanism the landing sheet's gallery uses. What is different is
 * what travels: a continuous hairline axis with a tick at every campaign,
 * so the section reads as a chronology being walked rather than as a
 * carousel of photographs. Reusing the mechanism and changing the
 * content is the point — a second pinned gallery would have been a
 * repeat; a pinned axis is a different instrument on the same string.
 *
 * ── THE PIN LENGTH IS DERIVED ────────────────────────────────────────
 * Exactly the overflow distance, recomputed on resize via
 * invalidateOnRefresh. The traverse ends the instant the last campaign
 * reaches the left edge and hands scrolling straight back. Nothing
 * snaps and nothing is captured, so this is a pin and not hijacking.
 *
 * ── FALLBACKS ────────────────────────────────────────────────────────
 * Below 768px and under prefers-reduced-motion the matchMedia block
 * never runs and the identical track becomes a native snap-scrolling
 * list — reachable by touch, trackpad, scrollbar and keyboard, with no
 * pin at all. With JS disabled that is also what you get.
 *
 * ── SCOPE IS A FIELD, NOT AN INFERENCE ───────────────────────────────
 * The club drew the national/international distinction explicitly, so
 * each campaign carries it as data and the panel states it. Leaving a
 * reader to work it out from a city name fails exactly the people the
 * distinction matters most to — a sponsor scanning for international
 * entries, or an applicant deciding whether this team travels.
 *
 * ── THE FIGURES ──────────────────────────────────────────────────────
 * Every result here must be checkable against a certificate or a
 * published table. Unverified placings stay as an em-rule; see the
 * placeholder rule at the top of lib/navula.ts. The one thing this page
 * cannot survive is an alumnus in the room finding an inflated placing.
 */
export function RecordTraverse() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      const el = root.current;
      const inner = track.current;
      if (!el || !inner) return;

      const distance = () => Math.max(0, inner.scrollWidth - window.innerWidth);

      const tween = gsap.to(inner, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={root}
      aria-labelledby="navula-record"
      data-field="deep"
      className="relative overflow-hidden bg-bg-base"
    >
      <div
        ref={track}
        className="navula-track flex h-svh items-center max-md:h-auto max-md:snap-x max-md:snap-mandatory max-md:overflow-x-auto max-md:py-24"
      >
        {/* Panel 0 — the heading travels off with everything else, which
            is what stops the section reading as a header with a widget
            underneath it. */}
        <div className="navula-panel navula-panel-lead flex shrink-0 flex-col justify-center px-6 md:px-16">
          <span className="font-mono text-micro uppercase text-text-tertiary">
            The record
          </span>
          <h2
            id="navula-record"
            className="mt-6 font-editorial text-editorial-l text-text-primary"
            style={{ fontVariationSettings: "'wght' 400" }}
          >
            Every campaign,
            <br />
            in order.
          </h2>
          <p className="mt-8 max-w-prose text-body-m text-text-secondary">
            Results are recorded as the organisers published them. Anything
            not yet checked against a certificate is left as a rule.
          </p>
          <span className="mt-10 font-mono text-micro uppercase text-text-tertiary max-md:hidden">
            Keep scrolling →
          </span>
        </div>

        {NAVULA.record.map((c, i) => (
          <article
            key={`${c.event}-${i}`}
            className="navula-panel navula-stop relative flex shrink-0 flex-col justify-center px-6 max-md:snap-center md:px-12"
          >
            {/* THE AXIS. One hairline per panel, butted end to end, so
                the line is continuous across the whole traverse without
                anything having to measure the track. The tick sits on it
                at the panel's own centre. */}
            <span aria-hidden="true" className="navula-axis" />
            <span aria-hidden="true" className="navula-tick" />

            <div className="flex items-baseline gap-4">
              <span className="font-mono text-micro uppercase text-accent tabular">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-mono text-label uppercase text-text-primary tabular">
                {c.year}
              </span>
              {/* Scope, boxed in a hairline rather than a filled chip.
                  A pill here would be the one piece of SaaS furniture on
                  the page, and the rule reads as a stamp instead. */}
              <span className="border border-line-strong px-2 py-1 font-mono text-micro uppercase text-text-secondary">
                {c.scope}
              </span>
            </div>

            <h3 className="mt-4 text-heading-l text-text-primary">{c.event}</h3>

            <p className="mt-2 font-mono text-micro uppercase text-text-tertiary tabular">
              {c.place}
            </p>

            {/* What was entered. Machines belong to campaigns on this
                page, which is why this line exists here and why there is
                no standing machine roster anywhere else. */}
            <p className="mt-1 font-mono text-micro uppercase text-text-tertiary tabular">
              Entered {c.machine}
            </p>

            {/* The result is the loudest line in the panel because it is
                the only one anyone came to read. */}
            <p className="mt-6 font-mono text-label uppercase text-accent tabular">
              {c.result}
            </p>

            <Mount
              photo={c.photo}
              ratio="3 / 2"
              sizes="(min-width: 768px) 34vw, 86vw"
              className="mt-8"
            />

            <p className="mt-4 max-w-prose text-body-s text-text-secondary">
              {c.note}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
