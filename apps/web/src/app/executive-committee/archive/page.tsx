import type { Metadata } from "next";
import Link from "next/link";

import { Masthead } from "@/components/landing/Masthead";
import { SheetFooter } from "@/components/landing/Sections";
import { COMMITTEES } from "@/lib/committees.generated";

/**
 * ══════════════════════════════════════════════════════════════════════
 * EVERY COMMITTEE ON RECORD.
 *
 * A server component with no client JS: it is a list of links, and a list
 * of links does not need a runtime.
 *
 * ── IT SHOWS WHAT IS THERE, INCLUDING NOTHING ──
 * A committee can exist with nobody entered against it — an administrator
 * creates the term first and adds people afterwards, which is the correct
 * order to work in. Those rows say "no members on record yet" and are
 * still links, because the page they lead to says the same thing and says
 * where to go and fix it.
 *
 * The alternative — hiding empty committees — would mean the archive
 * quietly disagreed with the admin panel, and the person most likely to
 * notice is the one halfway through entering a roster.
 * ══════════════════════════════════════════════════════════════════════
 */

export const metadata: Metadata = {
  title: "Executive committees — BUET Robotics Society",
  description: `Every executive committee of the BUET Robotics Society on record: ${COMMITTEES.length} terms.`,
};

function term(start: number | null, end: number | null): string | null {
  if (start === null || end === null) return null;
  return `${start}–${String(end).slice(-2)}`;
}

export default function CommitteeArchive() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-50 focus:border focus:border-line-strong focus:bg-bg-raised focus:px-4 focus:py-2 focus:text-body-s focus:text-text-primary"
      >
        Skip to content
      </a>

      <Masthead />

      <main
        id="main"
        className="mx-auto max-w-shell px-6 pb-24 pt-16 md:px-16 md:pb-40 md:pt-24"
      >
        <header className="text-center">
          <h1
            className="font-display text-display-l text-text-primary"
            style={{ fontVariationSettings: "'wght' 700" }}
          >
            Executive Committees
          </h1>
          <div className="mx-auto mt-12 flex max-w-content items-center gap-6">
            <span aria-hidden="true" className="h-px flex-1 bg-line-strong" />
            <span className="whitespace-nowrap font-mono text-micro uppercase tabular text-text-tertiary">
              {COMMITTEES.length} {COMMITTEES.length === 1 ? "term" : "terms"} on record
            </span>
            <span aria-hidden="true" className="h-px flex-1 bg-line-strong" />
          </div>
        </header>

        <ol className="mt-16 border-t border-line-strong md:mt-24">
          {COMMITTEES.map((c) => {
            const years = term(c.termStart, c.termEnd);
            return (
              <li key={c.ordinal}>
                <Link
                  href={`/executive-committee/${c.ordinal}`}
                  className="term-row grid gap-x-8 gap-y-2 border-b border-line-hairline py-8 no-underline md:grid-cols-[var(--container-anchor)_1fr_auto] md:items-baseline"
                >
                  {/* The ordinal, big, in the serif. It is the one number
                      on the page that is a name rather than a quantity. */}
                  <span className="font-editorial text-editorial-m tabular text-accent">
                    {String(c.ordinal).padStart(2, "0")}
                  </span>

                  <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span
                      className="font-display text-heading-l text-text-primary"
                      style={{ fontVariationSettings: "'wght' 700" }}
                    >
                      {c.label}
                    </span>
                    {c.current ? (
                      <span className="border border-line-accent px-2 py-1 font-mono text-micro uppercase tabular text-accent">
                        Current
                      </span>
                    ) : null}
                  </span>

                  <span className="font-mono text-micro uppercase tabular text-text-tertiary">
                    {years ? <span className="text-text-secondary">{years}</span> : "Term not recorded"}
                    {" · "}
                    {c.members === 0
                      ? "No members on record yet"
                      : `${c.members} ${c.members === 1 ? "member" : "members"}`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>

        <div className="mt-24 md:mt-40">
          <SheetFooter />
        </div>
      </main>
    </>
  );
}
