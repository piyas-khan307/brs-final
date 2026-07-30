"use client";

import { useEffect, useState } from "react";
import { ZONES } from "@/lib/zones";

/**
 * THE ZONE RAIL — §4.3.
 *
 * ISLAND 2 OF 2. Declared in apps/web/config/client-allowlist.json.
 *
 * The sheet edge of a technical drawing, doing real work: it is the page's
 * most distinctive device AND its section navigation.
 *
 * IT IS A REAL <nav> OF REAL ANCHOR LINKS, not a decorative scroll
 * indicator. Without JS it still navigates; JS only adds aria-current and
 * the active-tick emphasis. Hover-only information is forbidden (§17.7), so
 * every zone label is in the DOM at all times — visually hidden but
 * available to screen readers.
 *
 * Removed entirely below 1280px rather than degraded: a cramped rail is
 * worse than none.
 */

export function ZoneRail() {
  const [active, setActive] = useState<string>(ZONES[0]!.id);

  useEffect(() => {
    const els = ZONES.map((z) => document.getElementById(z.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // Bias toward the upper third so the readout changes when a section
      // genuinely becomes the subject, not when it first peeks in.
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <nav
      aria-label="Sheet zones"
      className="pointer-events-none fixed inset-y-0 left-0 z-40 hidden w-16 lg:block"
    >
      <ul className="pointer-events-auto flex h-full flex-col items-center justify-center gap-1">
        {ZONES.map((z) => {
          const isActive = z.id === active;
          return (
            <li key={z.id}>
              <a
                href={`#${z.id}`}
                aria-current={isActive ? "true" : undefined}
                className="group flex h-10 w-10 flex-col items-center justify-center no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                <span
                  className={`font-mono text-micro uppercase tabular transition-colors duration-micro ease-out ${
                    isActive
                      ? "text-text-primary"
                      : "text-text-tertiary group-hover:text-text-secondary"
                  }`}
                >
                  {z.letter}
                </span>
                <span
                  aria-hidden="true"
                  className={`mt-1 h-px transition-all duration-base ease-out ${
                    isActive ? "w-5 bg-accent" : "w-2 bg-line-hairline group-hover:w-3"
                  }`}
                />
                {/* Label always present for assistive tech — never hover-only. */}
                <span className="sr-only">{z.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
