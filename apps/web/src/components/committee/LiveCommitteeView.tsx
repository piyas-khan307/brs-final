"use client";

import Link from "next/link";
import { forwardRef, useEffect, useRef, useState, type CSSProperties } from "react";
import type { CommitteeDTO } from "@brs/contract";
import type { Committee, CommitteeMember } from "@/lib/committee.generated";
import { Portrait } from "@/components/committee/Portrait";
import { SheetFooter } from "@/components/landing/Sections";
import { COMMITTEES } from "@/lib/committees.generated";

function term(start: number | null, end: number | null): string | null {
  if (start === null || end === null) return null;
  return `${start}–${String(end).slice(-2)}`;
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
  const years = term(committee.termStart, committee.termEnd);
  const headcount = committee.groups.reduce(
    (n, g) => n + g.sections.reduce((m, s) => m + s.members.length, 0),
    0,
  );
  /* Not every committee on record is the one in office. A page that never
     says which it is leaves a reader who arrived from a search engine with
     no way to tell a current roster from a five-year-old one. */
  const isCurrent =
    COMMITTEES.find((c) => c.ordinal === committee.ordinal)?.current ?? true;

  /**
   * THE ENLARGED VIEW.
   *
   * One flat list in reading order, holding only the members who have a
   * photograph — an enlarged view of a missing photograph is not worth
   * opening, so those two tiles are not controls at all. That list is
   * also what the arrow keys walk, which is why it is built here rather
   * than inside the lightbox: the lightbox should not have to know how
   * the page is grouped.
   */
  const gallery = committee.groups.flatMap((g) =>
    g.sections.flatMap((s) =>
      s.members
        .filter((m) => m.portrait)
        .map((member) => ({ member, sectionName: s.name })),
    ),
  );
  const galleryIndex = new Map(gallery.map((e, i) => [e.member.id, i]));
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const open = openIndex === null ? null : (gallery[openIndex] ?? null);

  return (
    <main
      id="main"
      className="mx-auto max-w-shell px-6 pb-24 pt-16 md:px-16 md:pb-40 md:pt-24"
    >
      {/* ── Title ───────────────────────────────────────────────────
          TWO THINGS. Nothing else.

          This header carried a sheet number, a lead paragraph, a
          hover hint, a "show all names" control, and a four-cell rail
          of figures. Every one of them was defensible on its own and
          together they were a preamble in front of the thing the page
          is actually for. Club direction, and the right call: the
          committee's name, its term, and then the committee.

          The counts have not been deleted, they have been moved to the
          place that was always their home — "About this record" at the
          foot of the page, where a reader who wants provenance goes and
          a reader who wants faces never has to look. */}
      <header className="text-center">
        {/* SPACE GROTESK AT 700, NOT THE SERIF.
            "Make it bold" is not a thing Instrument Serif can do — it
            ships as a single 400 weight with no axes, so asking it for a
            bold would either silently do nothing or hand the browser a
            fake synthetic smear. Space Grotesk is variable 300-700, so
            this is a real 700 cut, and it is the face drawn closest to
            the squared lettering in the badge. The serif keeps the
            section headings and the names; the masthead is set in the
            club's own letterform.

            No `optical-left`: that -0.06em nudge exists to hang display
            type on a left margin, and there is no left margin here. */}
        <h1
          className="font-display text-display-l text-text-primary"
          style={{ fontVariationSettings: "'wght' 700" }}
        >
          {committee.label}
        </h1>

        {/* THE TERM, SET INTO A RULE.
            Stacked under the title it read as a leftover field from the
            table this page used to be. Hung in the middle of a hairline
            it becomes a datum on a drawing — the same device the rest of
            the sheet uses for structure, doing one more job.

            The word "Term" is gone on club direction. The years carry it
            on their own: a date range suspended in a rule directly under
            a committee's name is not ambiguous, and the label was the
            only thing on the line that was not information.

            Shown only when it is known. An empty rule with nothing hung
            in it would be a worse answer than no line at all, and the
            provenance note at the foot explains the absence when there
            is one. */}
        {years ? (
          <div className="mx-auto mt-12 flex max-w-content items-center gap-6">
            <span aria-hidden="true" className="h-px flex-1 bg-line-strong" />
            {/* <time> rather than <p>: it is a date range, and saying so
                costs nothing and tells a machine the same thing the
                typography tells a reader. */}
            <time className="whitespace-nowrap font-editorial text-editorial-m tabular text-text-primary">
              {years}
            </time>
            <span aria-hidden="true" className="h-px flex-1 bg-line-strong" />
          </div>
        ) : null}

        {/* The way back to every other term. It is on the page and not
            only in the masthead menu, because a masthead menu opens on
            hover and a phone has no hover — and because someone who
            arrives here from a search result should not have to guess
            that an archive exists. */}
        <p className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {!isCurrent ? (
            <span className="border border-line-accent px-2 py-1 font-mono text-micro uppercase tabular text-accent">
              Past term
            </span>
          ) : null}
          {COMMITTEES.length > 1 ? (
            <Link
              href="/executive-committee/archive"
              className="font-mono text-micro uppercase tabular text-text-tertiary underline-offset-4 transition-colors hover:text-accent"
            >
              All {COMMITTEES.length} committees
            </Link>
          ) : null}
        </p>
      </header>

      {/* ── Standing Committee ───────────────────────────────────────
          THE ONE SECTION THAT IS NOT A CONTACT SHEET.

          The Standing Committee holds the society's authority and must
          not look like the six teams under it. Four things separate it:

          1. IT IS ON PAPER, a near-white field lifted off the page
             ground rather than a dark band cut into it.
             `data-field="paper"` re-points the surface tokens, so every
             component inside picks the new ground up without knowing it
             has — no isDark prop, no second set of classes. The value
             itself is argued at [data-field="paper"].

             This section was on petrol and then on ink before this, and
             both were wrong the same way: a dark band on a light sheet
             reads as a different document. Lifted instead of sunk, it
             reads as the sheet's own paper, and the dark mounts do the
             separating that the background was failing to do.

          2. EVERYTHING IS CENTRED. One office, its holder or holders
             beneath it, on the axis of the page. The earlier version
             hung each office off a label column at the left, which read
             as a table of contents; centred, it reads as a plate.

          3. ONE ROW PER OFFICE. Six of the seven offices are held by a
             single person, so a grid rendered them as an anonymous run
             of squares. This is deliberately the opposite of what the
             teams below do — down there one Head against five
             Secretaries left 80% of every row empty, which is why they
             became contact sheets. Here the office IS the row.

          4. THE PORTRAITS ARE LARGER: 20rem against the teams' 15rem.

          What is NOT here, on club direction: the section number, the
          "Office-bearers" kicker, the introductory sentence, and the
          holder counts. The office name and the face are the content;
          everything else was apparatus. */}
      {/* A committee can exist with nobody entered against it yet — an
          administrator creates the term first and adds people after,
          which is the right order to work in. Saying so beats rendering
          a header above nothing at all. */}
      {headcount === 0 ? (
        <section className="mt-16 border-t border-line-strong pt-12 text-center md:mt-24">
          <p className="mx-auto max-w-prose text-body-l text-text-secondary">
            No members are on record for this committee yet.
          </p>
          <p className="mx-auto mt-4 max-w-prose text-body-m text-text-tertiary">
            Rosters are entered in the admin panel, under Committees.
          </p>
        </section>
      ) : null}

      {standing ? (
        <section
          data-field="paper"
          aria-labelledby="standing"
          // `.roster-band` takes it to the full width of the window and
          // fades both edges into the page ground — no hairline, no hard
          // seam at the shell's margin. The inner container puts the type
          // straight back on the measure everything else uses.
          className="roster-band mt-16 bg-bg-base py-12 md:mt-24 md:py-16"
          style={{ "--roster-name-size": "var(--text-editorial-m)" } as CSSProperties}
        >
          <div className="mx-auto max-w-shell px-6 md:px-16">
          {/* Space Grotesk at 700, matching the page title — the two
              headline moments on this page are now set in the same
              voice, and the serif is left to do the section headings
              below and the names inside the captions. One step down
              from the page title, because it is one step down. */}
          <h2
            id="standing"
            className="scroll-mt-32 text-center font-display text-display-m text-text-primary"
            style={{ fontVariationSettings: "'wght' 700" }}
          >
            {standing.name}
          </h2>

          <ol className="mt-10 border-t border-line-strong">
            {standing.sections.map((section, si) => (
              <li
                key={section.name}
                className="border-b border-line-hairline py-8 text-center"
              >
                {/* The office, named once, in the placard voice the rest
                    of the sheet uses for labels. Mono, tracked, uppercase
                    — a wall label above the print, not a heading. */}
                <h3 className="font-mono text-label uppercase tabular text-accent">
                  {section.name}
                </h3>

                <ul className="roster-lead mt-6">
                  {section.members.map((member, mi) => (
                    <Tile
                      key={member.id}
                      member={member}
                      sectionName={section.name}
                      sizes="(min-width: 480px) 20rem, 90vw"
                      eager={si === 0 && mi === 0}
                      onOpen={openerFor(galleryIndex, member.id, setOpenIndex)}
                    />
                  ))}
                </ul>
              </li>
            ))}
            </ol>
          </div>
        </section>
      ) : null}

      {/* ── Teams ──────────────────────────────────────────────────── */}
      {teams.map((group) => (
        <section
          key={group.name}
          className="pt-20 md:pt-32"
          aria-labelledby={group.name.replace(/\s+/g, "-").toLowerCase()}
        >
          <SectionHead
            id={group.name.replace(/\s+/g, "-").toLowerCase()}
            title={group.name}
          />
          {group.note ? (
            <p className="mt-6 max-w-prose text-body-m text-text-secondary">{group.note}</p>
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
          <ul className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {group.sections.flatMap((section) =>
              section.members.map((member) => (
                <Tile
                  key={member.id}
                  member={member}
                  sectionName={section.name}
                  sizes="(min-width: 1024px) 15rem, (min-width: 640px) 24vw, 45vw"
                  onOpen={openerFor(galleryIndex, member.id, setOpenIndex)}
                />
              )),
            )}
          </ul>
        </section>
      ))}

      <div className="mt-24 md:mt-40">
        <SheetFooter />
      </div>

      {open ? (
        <Lightbox
          member={open.member}
          sectionName={open.sectionName}
          position={(openIndex ?? 0) + 1}
          total={gallery.length}
          onClose={() => setOpenIndex(null)}
          onStep={(delta) =>
            setOpenIndex((i) =>
              i === null ? null : (i + delta + gallery.length) % gallery.length,
            )
          }
        />
      ) : null}
    </main>
  );
}

/**
 * A tile opens the enlarged view only if there is something to enlarge.
 * Returns undefined for the two members with no photograph on file, and
 * `Tile` renders those as a plain div rather than a button.
 */
function openerFor(
  index: Map<string, number>,
  id: string,
  set: (i: number) => void,
): (() => void) | undefined {
  const i = index.get(id);
  return i === undefined ? undefined : () => set(i);
}

/**
 * A team heading. The team's name, a rule above it, and nothing else.
 *
 * It used to carry an oxblood 01/02/03 in mono and a "12 members" count
 * hung off the right margin. Both went on club direction, and neither is
 * missed: the number was a table of contents for a page with no table of
 * contents, and the count was a fact about the database sitting where a
 * name should be. The totals now live in "About this record" at the foot
 * of the page, which is where a reader who wants them goes.
 *
 * LEFT, NOT CENTRED — deliberately. The page has exactly two centred
 * moments, the title and the Standing Committee, and they are centred
 * because they outrank everything else. Centring these six as well would
 * spend the only device the page has for saying so.
 *
 * Space Grotesk at 700, like the two headings above it. The serif is now
 * confined to the member names and the term.
 */
function SectionHead({ id, title }: { id: string; title: string }) {
  return (
    <div className="border-t border-line-strong pt-6">
      <h2
        id={id}
        className="scroll-mt-32 font-display text-heading-l text-text-primary"
        style={{ fontVariationSettings: "'wght' 700" }}
      >
        {title}
      </h2>
    </div>
  );
}

/**
 * One person: a print on a mount, with the caption held back until asked
 * for.
 *
 * The tile IS the photograph — the caption is a plate laid across the
 * foot of it, absolutely positioned, so nothing hangs below the frame
 * and the grid is a clean run of squares whether or not anything is
 * revealed.
 *
 * It is hidden with OPACITY rather than `display`, which is what keeps
 * every name in the accessibility tree and read aloud exactly as before.
 */
function Tile({
  member,
  sectionName,
  sizes,
  eager = false,
  onOpen,
}: {
  member: CommitteeMember;
  sectionName: string;
  sizes: string;
  eager?: boolean;
  /** Absent when there is no photograph — see openerFor. */
  onOpen?: (() => void) | undefined;
}) {
  const role = member.designation || sectionName;

  const inner = (
    <>
      <Portrait member={member} sizes={sizes} eager={eager} />
      <div className="roster-caption">
        <p className="roster-name">{member.name}</p>
        <p className="roster-role">
          {/* The designation carries the portfolio when there is one
              ("Vice President (Technical)"); the section name is the
              plain rank. Preferring the designation shows the more
              specific of the two. */}
          {role}
        </p>
      </div>
    </>
  );

  return (
    <li>
      {onOpen ? (
        <button
          type="button"
          className="roster-tile"
          onClick={onOpen}
          // The visible caption is hidden until hover, so the control
          // has to say who it is regardless of what is on screen. Given
          // in full because it is announced out of context.
          aria-label={`${member.name}, ${role} — view larger photograph`}
        >
          {inner}
        </button>
      ) : (
        <div className="roster-tile">{inner}</div>
      )}
    </li>
  );
}

/**
 * ══════════════════════════════════════════════════════════════════════
 * THE ENLARGED VIEW.
 *
 * Club instruction: "when I click an image, this image should pop up
 * with a bit big picture."
 *
 * What that turns into once it has to behave like a dialog:
 *
 *   · ESCAPE closes it, and the LEFT/RIGHT arrows walk the committee.
 *     Eighty-two portraits behind eighty-two round trips of click-close-
 *     click is not a way to look at a roster.
 *   · The page behind it does not scroll. Nothing looks more broken than
 *     a backdrop sliding under a fixed panel.
 *   · Focus moves in on open and RETURNS TO THE TILE on close, and Tab
 *     is trapped in between. Without the return, dismissing the dialog
 *     drops a keyboard reader back at the top of the document.
 *   · The picture is the largest derivative on file, not the original —
 *     the original is not public, and 1600px is already four times the
 *     tile.
 * ══════════════════════════════════════════════════════════════════════
 */
function Lightbox({
  member,
  sectionName,
  position,
  total,
  onClose,
  onStep,
}: {
  member: CommitteeMember;
  sectionName: string;
  position: number;
  total: number;
  onClose: () => void;
  onStep: (delta: number) => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  /**
   * The two callbacks arrive as fresh closures on every render, and the
   * parent re-renders on every arrow press. Depending on them directly
   * would tear the effect down and set it up again each step — which
   * means the scroll lock would be released and re-taken, and worse,
   * `returnTo` would be re-read as the close button. Dismissing the
   * dialog after stepping once would then "return" focus to a button
   * that no longer exists, instead of to the tile that opened it.
   *
   * So the handlers live in refs and the effect runs exactly once.
   */
  const handlers = useRef({ onClose, onStep });
  useEffect(() => {
    handlers.current = { onClose, onStep };
  });

  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") return handlers.current.onClose();
      if (e.key === "ArrowRight") return handlers.current.onStep(1);
      if (e.key === "ArrowLeft") return handlers.current.onStep(-1);
      if (e.key !== "Tab") return;

      // Keep Tab inside the dialog. Three controls, so this is a wrap
      // rather than a general-purpose trap.
      const focusable = panel.current?.querySelectorAll<HTMLElement>("button");
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      returnTo?.focus();
    };
    // Deliberately empty: this runs once, on open. Everything it needs
    // that can change is read through `handlers` — see the note above.
  }, []);

  const role = member.designation || sectionName;
  const portrait = member.portrait;
  // Largest rung of the ladder. The arrays are sorted ascending by
  // splitSources, so this is the widest file that exists for this asset.
  const largest = portrait?.webp[portrait.webp.length - 1];
  const largestAvif = portrait?.avif[portrait.avif.length - 1];

  return (
    // The backdrop closes on click; the panel stops the event so that a
    // click on the photograph itself does not dismiss what it opened.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 md:p-8"
      onClick={onClose}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={`${member.name}, ${role}`}
        // No `w-full`: the panel shrink-wraps the photograph, so the
        // caption and the controls line up with the edges of the print
        // instead of floating out at the edges of the screen.
        className="flex max-h-full max-w-content flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {portrait ? (
          <picture>
            {largestAvif ? <source type="image/avif" srcSet={largestAvif.url} /> : null}
            <img src={largest?.url} alt={portrait.alt} className="lightbox-image" />
          </picture>
        ) : null}

        <div className="mt-6 flex w-full flex-wrap items-end justify-between gap-4">
          <div>
            <p className="lightbox-name">{member.name}</p>
            <p className="roster-role">{role}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="mr-2 font-mono text-micro uppercase tabular text-mount-text">
              {String(position).padStart(2, "0")} / {total}
            </span>
            <LightboxButton onClick={() => onStep(-1)} label="Previous member">
              ←
            </LightboxButton>
            <LightboxButton onClick={() => onStep(1)} label="Next member">
              →
            </LightboxButton>
            <LightboxButton ref={closeButton} onClick={onClose} label="Close">
              ✕
            </LightboxButton>
          </div>
        </div>
      </div>
    </div>
  );
}

const LightboxButton = forwardRef<
  HTMLButtonElement,
  { onClick: () => void; label: string; children: React.ReactNode }
>(function LightboxButton({ onClick, label, children }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={label}
      className="border border-mount-line px-4 py-2 font-mono text-body-s text-mount-text transition-colors hover:border-accent hover:text-white"
    >
      {children}
    </button>
  );
});
