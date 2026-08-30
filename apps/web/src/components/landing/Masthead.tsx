import Link from "next/link";

import { COMMITTEES } from "@/lib/committees.generated";

/**
 * MASTHEAD — §4.3.
 *
 * Server Component; zero client JS. The 72→56px collapse specified in §4.3
 * is deliberately NOT implemented as an island: it would cost a scroll
 * listener for a cosmetic effect, against a 15 KB first-party budget. A
 * static height with a permanent hairline base achieves the same visual
 * discipline. Revisit only if the Gate review asks for it.
 *
 * "Apply" is distinguished by a 1px hairline box, never a filled pill —
 * pill CTAs are SaaS furniture (§17.1).
 */

const NAV = [
  { label: "Record", href: "/achievements" },
  { label: "Events", href: "/events" },
  // Points straight at the team rather than at a /teams index, which does
  // not exist yet and would be a one-item list if it did. When a second
  // team is written this becomes a nav-menu like Committee's.
  { label: "Navula", href: "/teams/navula" },
  { label: "Explore", href: "/explore" },
];

/** Everything except the term currently in office. Newest first — the
 *  index is already in that order, so this preserves it. */
const PREVIOUS = COMMITTEES.filter((c) => !c.current);

const years = (start: number | null, end: number | null) =>
  start !== null && end !== null ? `${start}–${String(end).slice(-2)}` : null;

export function Masthead() {
  return (
    // Fully opaque. A translucent header would need backdrop-blur to read
    // cleanly, and blur is banned (§3.3). Opacity here is also the more
    // precise choice: the hairline base is the only separation needed.
    <header className="sticky top-0 z-50 border-b border-line-hairline bg-bg-base">
      <div className="mx-auto flex h-16 max-w-shell items-center justify-between px-6 md:px-16">
        <Link
          href="/"
          className="flex items-baseline gap-3 no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
        >
          <span
            className="text-heading-s text-text-primary"
            style={{ fontVariationSettings: "'wght' 600" }}
          >
            BRS
          </span>
          <span className="hidden font-mono text-micro uppercase text-text-tertiary sm:inline">
            BUET Robotics Society
          </span>
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-8">
          <ul className="hidden items-center gap-8 md:flex">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="font-mono text-micro uppercase text-text-secondary no-underline transition-colors duration-micro ease-out hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
                >
                  {item.label}
                </Link>
              </li>
            ))}

            {/* ── COMMITTEE, WITH ITS ARCHIVE UNDER IT ──────────────────
                Hover it for Current and Previous; hover Previous for
                every term on record. CSS only — see `.nav-menu` in
                globals.css for why, and for what happens on a keyboard
                and on a touchscreen.

                The trigger is still a LINK, not a button that only opens
                a menu. Clicking "Committee" goes to the current committee,
                which is what it did before this existed and what someone
                who never hovers will expect. The menu is an accelerator,
                never the only way through. */}
            <li className="nav-menu flex h-16 items-center">
              <Link
                href="/executive-committee"
                className="font-mono text-micro uppercase text-text-secondary no-underline transition-colors duration-micro ease-out hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
              >
                Committee
              </Link>

              <div className="nav-panel">
                <Link href="/executive-committee" className="nav-item">
                  Current
                  <span className="nav-item__meta">
                    {COMMITTEES.find((c) => c.current)?.ordinal ?? "—"}
                  </span>
                </Link>

                {PREVIOUS.length ? (
                  <div className="nav-sub relative">
                    <Link href="/executive-committee/archive" className="nav-item">
                      Previous
                      {/* The arrow points at the submenu, which opens to
                          the left because this sits near the right edge
                          of the shell. */}
                      <span className="nav-item__meta" aria-hidden="true">
                        ←
                      </span>
                    </Link>

                    <div className="nav-panel">
                      {PREVIOUS.map((c) => (
                        <Link
                          key={c.ordinal}
                          href={`/executive-committee/${c.ordinal}`}
                          className="nav-item"
                        >
                          {c.label}
                          <span className="nav-item__meta">
                            {years(c.termStart, c.termEnd) ?? "—"}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </li>
          </ul>
          <Link
            href="/explore/join"
            className="border border-line-strong px-4 py-2 font-mono text-micro uppercase text-text-primary no-underline transition-colors duration-micro ease-out hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
          >
            Apply
          </Link>
        </nav>
      </div>
    </header>
  );
}
