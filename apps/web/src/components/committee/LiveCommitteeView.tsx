"use client";

import { useEffect, useState } from "react";
import type { CommitteeDTO } from "@brs/contract";
import type { Committee, CommitteeMember } from "@/lib/committee.generated";
import { Eyebrow } from "@/components/primitives/Placard";
import { Portrait } from "@/components/committee/Portrait";
import { SheetFooter } from "@/components/landing/Sections";

function term(start: number | null, end: number | null): string | null {
  if (start === null || end === null) return null;
  return `${start}–${String(end).slice(-2)}`;
}

/** "A", "A and B", "A, B and C". `join(" and ")` produced
 *  "A and B and C", which reads as a typo on a page about real people. */
function list(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function splitSources(
  image: { sources: { format: string; width: number; url: string }[] },
  format: "avif" | "webp"
) {
  return (image.sources || [])
    .filter((s) => s.format === format)
    .sort((a, b) => a.width - b.width)
    .map((s) => ({ w: s.width, url: s.url }));
}

function transformCommitteeDTO(c: CommitteeDTO): Committee {
  return {
    ordinal: c.ordinal,
    label: c.label,
    termStart: c.termStart,
    termEnd: c.termEnd,
    groups: c.groups.map((g) => ({
      name: g.name,
      ...(g.note ? { note: g.note } : {}),
      sections: g.sections.map((s) => ({
        name: s.name,
        members: s.members.map(
          (m): CommitteeMember => ({
            id: m.id,
            name: m.name,
            designation: m.designation,
            department: m.department,
            batch: m.batch,
            ...(m.portrait
              ? {
                  portrait: {
                    alt: m.portrait.alt,
                    width: m.portrait.width,
                    height: m.portrait.height,
                    lqip: m.portrait.lqip,
                    avif: splitSources(m.portrait, "avif"),
                    webp: splitSources(m.portrait, "webp"),
                  },
                }
              : {}),
          })
        ),
      })),
    })),
  };
}

export function LiveCommitteeView({
  initialCommittee,
}: {
  initialCommittee: Committee;
}) {
  const [committee, setCommittee] = useState<Committee>(initialCommittee);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_BRS_API || "http://localhost:8787";
    fetch(`${apiUrl}/v1/committees/${initialCommittee.ordinal}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch committee");
        return res.json();
      })
      .then((data: CommitteeDTO) => {
        if (data && Array.isArray(data.groups) && data.groups.length > 0) {
          setCommittee(transformCommitteeDTO(data));
        }
      })
      .catch(() => {
        // Silently retain pre-rendered static data if API is offline
      });
  }, [initialCommittee.ordinal]);

  const [standing, ...teams] = committee.groups;
  const people = committee.groups.flatMap((g) => g.sections.flatMap((s) => s.members));
  const years = term(committee.termStart, committee.termEnd);
  const missingPortraits = people.filter((m) => !m.portrait);

  return (
    <main id="main" className="mx-auto max-w-shell px-6 pb-24 pt-16 md:px-16 md:pb-40 md:pt-24">
      {/* ── Title ──────────────────────────────────────────────────── */}
      <header className="border-b border-line-strong pb-12">
        <Eyebrow>Sheet 06 · Executive Committee</Eyebrow>
        <h1
          className="mt-6 text-display-l text-text-primary"
          style={{ fontVariationSettings: "'wght' 600" }}
        >
          {committee.label}
        </h1>

        <p className="mt-6 max-w-prose text-body-l text-text-secondary">
          {`${people.length} members across ${committee.groups.length} sections` +
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
            {standing.sections
              .flatMap((section) => section.members)
              .map((member, i) => (
                <li key={member.id}>
                  <Portrait
                    member={member}
                    sizes="(min-width: 1024px) 20rem, (min-width: 640px) 30vw, 45vw"
                    eager={i < 4}
                  />
                  <p
                    className="mt-4 text-heading-s text-text-primary"
                    style={{ fontVariationSettings: "'wght' 550" }}
                  >
                    {member.name}
                  </p>
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

          {/* ── ONE GRID PER TEAM, NOT ONE ROW PER POSITION ──────────
              Each position used to get its own full-width row. With one
              Head, two Deputy Heads and two Secretaries, that left every
              row 60-80% empty and made 85 people 14,500px tall — a
              roster that reads as a broken layout rather than a team.

              Now the team is a single contact sheet in rank order, and
              the position travels with the person as a label instead of
              as a heading. The ranks stay legible; the page stops being
              mostly whitespace. */}
          <ul className="mt-10 grid grid-cols-3 gap-x-5 gap-y-10 border-t border-line-faint pt-10 sm:grid-cols-4 lg:grid-cols-6">
            {group.sections.flatMap((section) =>
              section.members.map((member) => (
                <li key={member.id}>
                  <Portrait
                    member={member}
                    sizes="(min-width: 1024px) 11rem, (min-width: 640px) 22vw, 30vw"
                  />
                  <p className="mt-3 text-body-s text-text-primary">{member.name}</p>
                  <p className="mt-1 font-mono text-micro uppercase text-text-tertiary">
                    {/* The designation carries the portfolio when there is
                        one ("Vice President (Technical)"); the section name
                        is the plain rank. Preferring the designation shows
                        the more specific of the two. */}
                    {member.designation || section.name}
                  </p>
                </li>
              )),
            )}
          </ul>
        </section>
      ))}

      {/* ── Provenance ─────────────────────────────────────────────── */}
      <section className="mt-24 border-t border-line-strong pt-12 md:mt-40">
        <Eyebrow>About this record</Eyebrow>
        <p className="mt-6 max-w-prose text-body-m text-text-secondary">
          Names, roles and photographs are taken from the club&rsquo;s own announcement
          posters for the {committee.label}. Those posters record a name, a role and a
          team and nothing else, so no department or batch is shown — that is not
          recorded rather than omitted.
        </p>
        {/* Said only when it is true. The paragraph above used to add "or
            term years" unconditionally, which became false the moment an
            administrator recorded them — and a provenance note that
            contradicts the heading above it is worse than none. */}
        {!years ? (
          <p className="mt-4 max-w-prose text-body-m text-text-secondary">
            The term years are not shown because they appear on none of the posters.
          </p>
        ) : null}
        {missingPortraits.length ? (
          <p className="mt-4 max-w-prose text-body-m text-text-secondary">
            {/* States the fact — no photograph on file — and not a cause.
                Two of these posters were published with an empty frame;
                asserting that of everyone in the list would be a claim
                about source material this page cannot check. */}
            {list(missingPortraits.map((m) => m.name))}{" "}
            {missingPortraits.length === 1 ? "appears" : "appear"} without a photograph:
            none is on file for them yet.
          </p>
        ) : null}
      </section>

      <div className="mt-24 md:mt-40">
        <SheetFooter />
      </div>
    </main>
  );
}
