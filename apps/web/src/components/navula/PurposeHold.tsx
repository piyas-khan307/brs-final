"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { NAVULA } from "@/lib/navula";

/**
 * §02 — THE PURPOSE, HELD.
 *
 * One sentence, pinned, revealed clause by clause as you scroll.
 *
 * ── WHY CLAUSES AND NOT WORDS ────────────────────────────────────────
 * Word-by-word reveal is the default effect of every scroll library's
 * demo page, and it reads as one: words arrive at a rate nobody reads
 * at, so the sentence becomes an animation you wait out. Clauses arrive
 * at the rate a sentence is actually parsed, and indexing them in the
 * margin turns the effect into an argument — 01, 02, 03 is a claim being
 * built, which is what a purpose statement is.
 *
 * ── WHY THE DIM STATE IS 0.18 AND NOT 0 ──────────────────────────────
 * Invisible text that appears is a reveal. Dim text that lights is a
 * sentence you can already see the shape of, so the reader knows how
 * long it is and how much is left. It also means a scrub that outruns
 * the timeline never shows an empty screen.
 *
 * ── THE FALLBACKS ────────────────────────────────────────────────────
 * The clauses render at FULL opacity in the server output. The effect
 * dims them on mount and animates back up, so with JavaScript disabled,
 * under prefers-reduced-motion, and on any screen where the pin is not
 * installed, this section is simply the finished sentence — which is
 * the correct failure for a statement of purpose.
 */
export function PurposeHold() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const el = root.current;
    if (!el) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const clauses = gsap.utils.toArray<HTMLElement>("[data-clause]");
      if (clauses.length === 0) return;

      gsap.set(clauses, { opacity: 0.18 });

      gsap
        .timeline({
          scrollTrigger: {
            trigger: el,
            start: "top top",
            // The pin length is DERIVED from the number of clauses, not
            // typed. Add a clause in navula.ts and the section gets
            // longer on its own; a hardcoded end is how these sections
            // end up either stalling on dead scroll or cutting the last
            // clause off mid-reveal.
            end: () => `+=${clauses.length * window.innerHeight * 0.6}`,
            scrub: 1,
            pin: true,
            invalidateOnRefresh: true,
          },
        })
        .to(clauses, { opacity: 1, duration: 1, stagger: 1, ease: "none" });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      aria-labelledby="navula-purpose"
      className="flex min-h-svh items-center border-t border-line-hairline px-6 py-24 md:px-16"
    >
      <div className="mx-auto w-full max-w-content">
        <h2
          id="navula-purpose"
          className="font-mono text-micro uppercase text-text-tertiary"
        >
          Purpose
        </h2>

        {/* A <p>, not a stack of divs. The clauses are spans inside one
            paragraph, so the sentence is one sentence to a screen reader
            and to anyone who copies it — the reveal is presentation and
            must not fragment the text it is presenting. */}
        <p className="mt-12 font-editorial text-editorial-l text-text-primary">
          {NAVULA.purpose.map((clause, i) => (
            <span key={clause} data-clause className="inline">
              {/* The margin index. Superscript-sized mono against a
                  serif — the two families are doing different jobs here
                  rather than competing, which is why the mix works. */}
              <span
                aria-hidden="true"
                className="mr-3 align-super font-mono text-micro text-accent tabular"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              {clause}{" "}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
