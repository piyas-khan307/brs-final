"use client";

import { useEffect, useRef } from "react";
import { RECORD, RECORD_START, RECORD_END, densityByYear } from "@/lib/record";

/**
 * ZONE D — THE RECORD STRIP. §4.5.
 *
 * ISLAND 1 OF 2. Declared in apps/web/config/client-allowlist.json.
 *
 * This REPLACES the discarded prototype's stat bar entirely, for two
 * independent reasons: that bar is an AI tell (§2.2 defect 8-9), and half
 * its numbers were false — "480+ ACTIVE MEMBERS" was every roster row across
 * seven historical committees, against a current committee of ~52 (§2.3).
 *
 * An axis of ticks proves twenty years with evidence instead of a
 * rounded-up figure.
 *
 * ACCESSIBILITY IS THE CONSTRAINT, NOT A RETROFIT:
 *  · renders as a semantic <ol> of real links — works with zero JS
 *  · native overflow-x scrolling, so keyboard and touch work natively
 *  · JS adds only wheel-to-horizontal mapping and pointer drag
 *  · NEVER hijacks page scroll; the wheel handler is bounded to this element
 *    and releases at either end so the page keeps scrolling normally
 *  · prefers-reduced-motion → smooth scrolling off, no transforms
 */

export function ZoneD_RecordStrip() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Vertical wheel → horizontal scrub, but only while this strip can still
    // move in that direction. At either end the event is left alone so the
    // page scrolls: scroll hijacking is explicitly forbidden (§17.3).
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // pinch-zoom
      const dy = e.deltaY;
      if (Math.abs(dy) <= Math.abs(e.deltaX)) return; // already horizontal

      const atStart = el.scrollLeft <= 0;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1;
      if ((dy < 0 && atStart) || (dy > 0 && atEnd)) return;

      e.preventDefault();
      el.scrollLeft += dy;
    };

    // Pointer drag. Ignores primary-button-less and touch events, which the
    // browser already handles natively.
    let dragging = false;
    let startX = 0;
    let startScroll = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch" || e.button !== 0) return;
      dragging = true;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      el.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      el.scrollLeft = startScroll - (e.clientX - startX);
    };
    const stop = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", stop);
    el.addEventListener("pointercancel", stop);

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", stop);
      el.removeEventListener("pointercancel", stop);
    };
  }, []);

  // Tick geometry, named. Bare numerals in a file that presents figures are
  // rejected by lint rule brs/no-hardcoded-stats — correctly, because that
  // rule exists to stop invented statistics. These are layout, so they are
  // declared as such rather than left as loose literals in an expression.
  const TICK = { empty: 8, base: 16, perEvent: 10 };

  const density = densityByYear();
  const years = Array.from({ length: RECORD_END - RECORD_START + 1 }, (_, i) => RECORD_START + i);
  const anchors = RECORD.filter((e) => e.anchor);

  return (
    <>
      {/* Scroll affordance. The axis runs wider than the shell by design, and
          without a cue the final anchor just appears truncated. A mono note
          rather than a fade — gradients are banned (§3.3) and a fade would
          also hide content rather than explain it. */}
      <p className="mb-4 text-right font-mono text-micro uppercase text-text-tertiary">
        Drag or scroll horizontally →
      </p>
      <div
        ref={ref}
        className="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]"
        // The strip is a scrollable region, so it must be reachable and
        // operable by keyboard on its own.
        tabIndex={0}
        role="group"
        aria-label="The Record: BRS competition and event history, 2005 to 2026. Scrollable horizontally."
      >
      <div className="min-w-record pb-2">
        {/* ── Tick axis ── */}
        <div className="relative flex h-16 items-end gap-0 border-b border-line-strong">
          {years.map((y) => {
            const n = density.get(y) ?? 0;
            const h = n === 0 ? TICK.empty : TICK.base + n * TICK.perEvent;
            return (
              <div key={y} className="flex flex-1 flex-col items-center justify-end">
                <span
                  aria-hidden="true"
                  className={n > 0 ? "w-px bg-accent" : "w-px bg-line-hairline"}
                  style={{ height: `${h}px` }}
                />
              </div>
            );
          })}
        </div>

        {/* ── Year scale ── */}
        <div className="flex" aria-hidden="true">
          {years.map((y) => (
            <span
              key={y}
              className="flex-1 pt-2 text-center font-mono text-micro tabular text-text-tertiary"
            >
              {y % 5 === 0 ? y : "·"}
            </span>
          ))}
        </div>

        {/* ── Labelled anchors. Real links, real list. ── */}
        <ol className="mt-8 flex gap-8">
          {anchors.map((e) => (
            <li key={`${e.year}-${e.programme}`} className="min-w-anchor flex-1">
              <a
                href="/achievements"
                className="group block border-t border-line-hairline pt-4 no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
              >
                <span className="block font-mono text-micro tabular text-accent">{e.year}</span>
                <span className="mt-2 block text-body-s text-text-primary transition-colors duration-micro ease-out group-hover:text-accent">
                  {e.programme}
                </span>
                {e.host ? (
                  <span className="mt-1 block font-mono text-micro uppercase text-text-tertiary">
                    {e.host}
                  </span>
                ) : null}
                {/* Only a verified result is ever rendered as an outcome. */}
                {e.result && e.verified ? (
                  <span className="mt-2 block font-mono text-micro uppercase text-signal">
                    {e.result}
                  </span>
                ) : (
                  <span className="mt-2 block font-mono text-micro uppercase text-text-tertiary">
                    {e.teams ?? "Competed"}
                  </span>
                )}
              </a>
            </li>
          ))}
        </ol>
        </div>
      </div>
    </>
  );
}
