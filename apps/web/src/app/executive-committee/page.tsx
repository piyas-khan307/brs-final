import type { Metadata } from "next";

import { Masthead } from "@/components/landing/Masthead";
import { SheetFooter } from "@/components/landing/Sections";
import { Portrait } from "@/components/committee/Portrait";
import { Eyebrow } from "@/components/primitives/Placard";
import { COMMITTEE } from "@/lib/committee.generated";

/**
 * ══════════════════════════════════════════════════════════════════════
 * SHEET 06 — THE EXECUTIVE COMMITTEE.
 *
 * 84 people, seven sections, drawn from the database rather than typed
 * into this file. Every name, role and photograph here arrived through
 * the real pipeline: transcribed from the club's own announcement
 * posters, cropped at a measured frame position, uploaded through the
 * ingest service, and read back through /v1/committees.
 *
 * ── WHY THE DATA IS A GENERATED MODULE AND NOT AN await ──
 * `output: "export"` means a Server Component here COULD await at build
 * time, and it would work. It would also make every `next build` depend
 * on a live API and a live database, including a colleague's first
 * checkout and any CI run. plates.generated.ts and showcase.generated.ts
 * already set the precedent for the same reason: fetch once, commit the
 * result, and the build stays offline-capable. Refresh with
 * `pnpm --filter @brs/web content`.
 *
 * ── STRUCTURE ──
 * The Standing Committee is given its own larger grid and everything
 * else a denser one. That is not decoration: seven office-bearers and
 * seventy-seven team members are different kinds of information, and one
 * uniform grid of 84 identical squares would flatten the distinction the
 * club's own posters make.
 *
 * ── WHAT THIS PAGE REFUSES TO INVENT ──
 * Term years are not printed, because they appear nowhere on any of the
 * 84 posters and nobody has supplied them. Department and batch are not
 * printed for the same reason. The page says less than it could rather
 * than more than it knows (§8).
 * ══════════════════════════════════════════════════════════════════════
 */

export const metadata: Metadata = {
  title: `${COMMITTEE.label} — BUET Robotics Society`,
  description: `The ${COMMITTEE.label} of the BUET Robotics Society: office-bearers and team members across ${COMMITTEE.groups.length} sections.`,
};

/** "2024–25" from two years, or nothing at all. Never "0–0". */
function term(start: number | null, end: number | null): string | null {
  if (start === null || end === null) return null;
  return `${start}–${String(end).slice(-2)}`;
}

export default function ExecutiveCommittee() {
  const [standing, ...teams] = COMMITTEE.groups;
  const people = COMMITTEE.groups.flatMap((g) => g.sections.flatMap((s) => s.members));
  const years = term(COMMITTEE.termStart, COMMITTEE.termEnd);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-50 focus:border focus:border-line-strong focus:bg-bg-raised focus:px-4 focus:py-2 focus:text-body-s focus:text-text-primary"
      >
        Skip to content
      </a>

      <Masthead />

      <main id="main" className="mx-auto max-w-shell px-6 pb-24 pt-16 md:px-16 md:pb-40 md:pt-24">
        {/* ── Title ──────────────────────────────────────────────────── */}
        <header className="border-b border-line-strong pb-12">
          <Eyebrow>Sheet 06 · Executive Committee</Eyebrow>
          <h1
            className="mt-6 text-display-l text-text-primary"
            style={{ fontVariationSettings: "'wght' 600" }}
          >
            {COMMITTEE.label}
          </h1>

          {/* Counted from the data, never typed. A hardcoded "84" here
              would be a lint failure and, worse, would quietly go stale
              the first time somebody is added. */}
          {/* Built as one string rather than as adjacent JSX expressions:
              a line break between `sections` and the conditional renders
              as a space, which put a gap before the full stop. */}
          <p className="mt-6 max-w-prose text-body-l text-text-secondary">
            {`${people.length} members across ${COMMITTEE.groups.length} sections` +
              (years ? `, serving ${years}` : "") +
              "."}
          </p>
        </header>

        {/* ── Standing Committee ─────────────────────────────────────── */}
        {standing ? (
          <section className="pt-16 md:pt-24" aria-labelledby="standing">
            <Eyebrow>Office-bearers</Eyebrow>
            <h2
              id="standing"
              className="mt-4 text-display-m text-text-primary"
              style={{ fontVariationSettings: "'wght' 600" }}
            >
              {standing.name}
            </h2>
            {standing.note ? (
              <p className="mt-4 max-w-prose text-body-m text-text-secondary">{standing.note}</p>
            ) : null}

            <ul className="mt-12 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
              {/* Flattened first, so the eager/lazy cut is by POSITION IN
                  THE GRID. Indexing inside the inner map counts from zero
                  again in every section, which made the first portrait of
                  each of the six sections eager and missed the ones
                  actually in the first row. */}
              {standing.sections
                .flatMap((section) => section.members)
                .map((member, i) => (
                  <li key={member.id}>
                    <Portrait
                      member={member}
                      // Matches the grid above: 2 up, then 3, then 4,
                      // inside a 1440px shell with 6/16 gutters. A wrong
                      // `sizes` is invisible in review and doubles the
                      // bytes on a phone.
                      sizes="(min-width: 1024px) 20rem, (min-width: 640px) 30vw, 45vw"
                      // The first row only. Everything below the fold is
                      // lazy — 84 eager portraits would be absurd.
                      eager={i < 4}
                    />
                    <p
                      className="mt-4 text-heading-s text-text-primary"
                      style={{ fontVariationSettings: "'wght' 550" }}
                    >
                      {member.name}
                    </p>
                    {/* No tracking class: `text-micro` already carries
                        0.14em from @theme. Uppercase at default tracking
                        is a defect (§5.2). */}
                    <p className="mt-1 font-mono text-micro uppercase text-text-tertiary">
                      {member.designation}
                    </p>
                  </li>
                ))}
            </ul>
          </section>
        ) : null}

        {/* ── Teams ──────────────────────────────────────────────────── */}
        {teams.map((group) => (
          <section
            key={group.name}
            className="border-t border-line-hairline pt-16 md:pt-24"
            aria-labelledby={group.name.replace(/\s+/g, "-").toLowerCase()}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h2
                id={group.name.replace(/\s+/g, "-").toLowerCase()}
                className="text-heading-l text-text-primary"
                style={{ fontVariationSettings: "'wght' 600" }}
              >
                {group.name}
              </h2>
              <span className="font-mono text-micro uppercase tabular text-text-tertiary">
                {group.sections.reduce((n, s) => n + s.members.length, 0)} members
              </span>
            </div>
            {group.note ? (
              <p className="mt-4 max-w-prose text-body-m text-text-secondary">{group.note}</p>
            ) : null}

            {/* Grouped by position rather than one flat run of faces. The
                club announced these people under a rank, and a page that
                dissolves that is a page that has thrown away information
                its source took the trouble to record. */}
            {/* The position is a LABEL IN THE MARGIN, not a heading over
                its own row.

                The first attempt gave each position a full-width row, and
                the result was a page of near-empty bands: "Head" is one
                person, so one portrait sat beside four columns of nothing,
                six times per team, seven teams over. A catalogue puts the
                rubric in the margin and lets the plates run — same
                hierarchy, a third of the scrolling. */}
            {group.sections.map((section) => (
              <div
                key={section.name}
                className="mt-10 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-line-faint pt-8 md:grid-cols-12"
              >
                <h3 className="font-mono text-label uppercase tabular text-text-secondary md:col-span-2">
                  {section.name}
                </h3>
                <ul className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 md:col-span-10 lg:grid-cols-5">
                  {section.members.map((member) => (
                    <li key={member.id}>
                      <Portrait
                        member={member}
                        sizes="(min-width: 1024px) 12rem, (min-width: 768px) 18vw, 30vw"
                      />
                      <p className="mt-3 text-body-s text-text-primary">{member.name}</p>
                      {/* The designation is printed only when it says
                          something the section label does not — "Vice
                          President (Technical)" under "Vice President".
                          Repeating an identical string under every face
                          is noise. */}
                      {member.designation !== section.name ? (
                        <p className="mt-1 font-mono text-micro uppercase text-text-tertiary">
                          {member.designation}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}

        {/* ── Provenance ─────────────────────────────────────────────── */}
        <section className="mt-24 border-t border-line-strong pt-12 md:mt-40">
          <Eyebrow>About this record</Eyebrow>
          <p className="mt-6 max-w-prose text-body-m text-text-secondary">
            Names, roles and photographs are taken from the club&rsquo;s own announcement
            posters for the {COMMITTEE.label}. The posters record a name, a role and a
            team and nothing else, so no department, batch or term years are shown here
            — they are not recorded rather than omitted.
          </p>
          {/* Named, not silently skipped. A gap that is stated is a gap
              somebody can close; a gap that is hidden is one nobody
              knows about (§16.1). */}
          {people.some((m) => !m.portrait) ? (
            <p className="mt-4 max-w-prose text-body-m text-text-secondary">
              {people
                .filter((m) => !m.portrait)
                .map((m) => m.name)
                .join(" and ")}{" "}
              appear without a photograph: their announcement posters were published with
              an empty frame.
            </p>
          ) : null}
        </section>

        <div className="mt-24 md:mt-40">
          <SheetFooter />
        </div>
      </main>
    </>
  );
}
