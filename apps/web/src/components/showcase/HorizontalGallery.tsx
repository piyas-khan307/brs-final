"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { GALLERY } from "@/lib/showcase.generated";
import { ShowcaseImage } from "./ShowcaseImage";

/**
 * SECTION 2 — THE PINNED TRAVERSE.  (Reference: client screenshots 4–6.)
 *
 * The section pins to the viewport and vertical scroll is mapped onto
 * horizontal travel: the track moves right to left while the page stays
 * still. The heading panel is *inside* the track, which is why it exits
 * to the left along with everything else in the reference frames rather
 * than staying anchored.
 *
 * THE PIN LENGTH IS DERIVED, NOT GUESSED. It is exactly the overflow
 * distance (scrollWidth − viewport width), so the traverse finishes at
 * the instant the last plate reaches the left edge, and the section
 * releases. A hardcoded pin length is how these sections end up either
 * stalling on a dead scroll or cutting off the final panel.
 *
 * invalidateOnRefresh recomputes that distance on resize. Without it, a
 * window resize leaves the pin measured against the old width and the
 * traverse ends early or runs past the end.
 *
 * WHY THIS ISN'T HIJACKING: the pin has a finite, computed end and then
 * hands scrolling straight back. Nothing snaps, nothing is captured, and
 * scroll direction still maps to travel direction the whole way through.
 */
export function HorizontalGallery() {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    // Below 768px the traverse is replaced by a native horizontal
    // scroller (see markup): pinning a full viewport on a phone fights
    // the browser's own address-bar collapse and feels broken.
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
      aria-labelledby="gal-heading"
      // THE INVERTED FIELD. data-field="deep" re-points the colour tokens
      // in globals.css at their on-petrol values, so every child below
      // inverts without being told — no isDark prop, no parallel classes.
      //
      // This is the "dont make full same color" instruction: the badge's
      // own #0E516E appears at full strength exactly once, as a section,
      // rather than being diluted across the whole page. It also gives the
      // scroll a dark movement between two pale ones.
      data-field="deep"
      className="relative overflow-hidden bg-bg-base"
    >
      <div
        ref={track}
        className={
          // Desktop: a flex track that GSAP translates.
          // Mobile: the same track, scrolled natively instead.
          "flex h-screen items-center gap-0 " +
          "max-md:h-auto max-md:snap-x max-md:snap-mandatory max-md:overflow-x-auto max-md:py-24"
        }
      >
        {/* ── Panel 0: the heading, which travels off with the rest ── */}
        <div className="relative flex w-[86vw] shrink-0 flex-col justify-center px-6 md:w-[46vw] md:px-16">
          <span className="font-mono text-micro uppercase text-text-tertiary">
            02 — Selected events
          </span>
          <h2
            id="gal-heading"
            className="optical-left mt-6 text-display-l text-text-primary"
            style={{ fontVariationSettings: "'wght' 560" }}
          >
            Selected events
            <br />&amp; builds
          </h2>
          <p className="mt-8 max-w-sm text-body-m text-text-secondary">
            Five from the archive. Every photograph below was taken at a BRS
            event on BUET premises.
          </p>
          <span className="mt-10 font-mono text-micro uppercase text-text-tertiary max-md:hidden">
            Keep scrolling →
          </span>
        </div>

        {/* ── Panels 1..n: the plates ── */}
        {GALLERY.map((asset, i) => (
          <article
            key={asset.id}
            className="relative flex w-[86vw] shrink-0 snap-center flex-col justify-center px-6 md:w-[52vw] md:px-10"
          >
            {/* Panel divider with a crosshair at the head. A drafting
                registration mark, not decoration — it tells you where one
                panel ends and the next begins during the traverse. */}
            <span
              aria-hidden="true"
              className="absolute inset-y-[12%] left-0 hidden w-px bg-line-hairline md:block"
            />
            <span
              aria-hidden="true"
              className="absolute left-0 top-[12%] hidden -translate-x-1/2 -translate-y-1/2 font-mono text-micro text-text-tertiary md:block"
            >
              +
            </span>

            <div className="plate-surface aspect-[3/2] w-full">
              <ShowcaseImage asset={asset} sizes="(min-width: 768px) 52vw, 86vw" />
            </div>

            <div className="mt-6 flex items-start justify-between gap-8">
              <div>
                <h3 className="text-heading-l text-text-primary">
                  {asset.title}
                  <span className="ml-3 font-mono text-micro tabular text-accent">
                    {asset.year}
                  </span>
                </h3>
                <p className="mt-2 max-w-sm text-body-s text-text-secondary">
                  {asset.note}
                </p>
              </div>
              <span className="shrink-0 font-mono text-micro tabular text-text-tertiary">
                {String(i + 1).padStart(2, "0")} / {String(GALLERY.length).padStart(2, "0")}
              </span>
            </div>
          </article>
        ))}

        {/* Tail spacer so the last plate can clear the right margin
            instead of ending flush against the viewport edge. */}
        <div aria-hidden="true" className="w-16 shrink-0 md:w-40" />
      </div>
    </section>
  );
}
