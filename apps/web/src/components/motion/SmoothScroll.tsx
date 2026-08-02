"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Lenis drives the scroll position; GSAP reads it.
 *
 * WHY SMOOTH SCROLL AT ALL: every effect on this sheet is scrub-linked to
 * scroll position. A native wheel event on Windows arrives as a ~100px
 * jump, so a scrubbed 3D rotation advances in visible steps — the effect
 * reads as broken rather than as smooth. Lenis interpolates those jumps
 * into a continuous position, which is what makes the un-skew and the
 * pinned gallery feel machined instead of notchy.
 *
 * THIS IS NOT SCROLL HIJACKING. The distinction matters and the plan
 * (§17.3) bans the other thing:
 *   · the page still scrolls in the direction and roughly the amount the
 *     user asked for — nothing is snapped, redirected, or held hostage
 *   · no section refuses to release; every pin has a finite end
 *   · keyboard, scrollbar drag, Home/End and find-in-page all still work
 *   · it is off entirely under prefers-reduced-motion
 *
 * THE TICKER: Lenis must be driven by GSAP's ticker rather than its own
 * rAF loop, otherwise the two run on separate frames and every scrubbed
 * animation lags the scroll by one. lagSmoothing(0) stops GSAP from
 * time-correcting after a slow frame, which would desynchronise the pin.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      duration: 1.05,
      // Slightly under-damped: settles without the floaty overshoot that
      // makes smooth-scroll libraries feel like a demo of themselves.
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      // Touch devices already interpolate in the compositor. Doubling that
      // in JS makes phones feel laggy, so native scrolling stays native.
      syncTouch: false,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Fonts land after first paint and change the height of every heading,
    // which invalidates the pin distances measured before they loaded.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
