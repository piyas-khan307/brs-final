import { NAVULA } from "@/lib/navula";

/**
 * §01 — THE NAMEPLATE. A Server Component; zero client JS.
 *
 * ── WHY THERE IS NO HERO PHOTOGRAPH HERE ─────────────────────────────
 * The obvious opening is the machine full-bleed with the name over it.
 * It was not built, for a reason that is about this club's photographs
 * rather than about taste: they arrive in every ratio a phone produces,
 * with corridors and poster walls behind them. Type set over an image
 * like that either becomes unreadable or forces a scrim, and a scrim
 * over a photograph is the single most generated-looking thing on the
 * web. The machine gets a whole section to itself in §03, shown whole
 * and annotated, which is a better use of it than a backdrop.
 *
 * What opens the page instead is the drafting sheet the badge already
 * implies — petrol field, blueprint grid, one name, and a rule of
 * measured fields. It cannot break on any screen, it needs no asset,
 * and it is the one thing on the page that is unmistakably this club.
 *
 * ── data-field="deep" ────────────────────────────────────────────────
 * Re-points every colour token at its on-petrol equivalent for this
 * subtree. Nothing inside knows it has inverted — that mechanism was
 * already built in globals.css for the pinned gallery, and this is its
 * second use, which is what an inversion mechanism is for.
 *
 * ── THE FIGURES ARE FIELDS, NOT STATISTICS ───────────────────────────
 * Five, and the same five every time. An unrecorded one renders as an
 * em-rule rather than being dropped, so the rail keeps its shape and the
 * gap is visibly a gap.
 *
 * LEADER is on the rail because the club named it as a defining feature
 * of the team rather than as an item of trivia: Navula has a leader, and
 * a nameplate that omitted the one role the team is organised around
 * would be describing a different team.
 *
 * CONTESTED IS COMPUTED, never typed. It is `record.length`, so adding a
 * campaign updates the nameplate on its own. A hand-typed competition
 * count is precisely the figure that goes stale the first year nobody
 * remembers to update it, and this site's whole argument is that its
 * numbers hold up (§2.3).
 */
export function Nameplate() {
  const fields = [
    { key: "Team", value: NAVULA.kind },
    { key: "Founded", value: NAVULA.founded },
    { key: "Leader", value: NAVULA.leader },
    { key: "Contested", value: String(NAVULA.record.length) },
    { key: "Society", value: NAVULA.parent },
  ];

  return (
    <section
      data-field="deep"
      aria-labelledby="navula-name"
      className="navula-nameplate navula-grid relative flex flex-col justify-between bg-bg-base px-6 pb-12 pt-24 md:px-16 md:pb-16 md:pt-32"
    >
      <div className="mx-auto flex w-full max-w-shell flex-1 flex-col justify-center">
        {/* The eyebrow is a catalogue line, not a tagline. It says what
            kind of document this is before the name says whose. */}
        <p className="font-mono text-micro uppercase text-text-tertiary tabular">
          Team dossier
        </p>

        <h1
          id="navula-name"
          className="mt-6 font-editorial text-editorial-hero text-text-primary"
          style={{ fontVariationSettings: "'wght' 400" }}
        >
          {NAVULA.name}
        </h1>

        {/* One accent mark on the whole opening, and it is a rule rather
            than a colour fill — the accent's job here is to point at the
            name, not to decorate the section. */}
        <span
          aria-hidden="true"
          className="mt-8 block h-px w-24 bg-accent"
        />
      </div>

      {/* THE RAIL. Four fields, hairline-separated, mono and tabular so
          the columns align down the page the way a spec sheet's do. */}
      <dl className="mx-auto grid w-full max-w-shell grid-cols-2 gap-px border-t border-line-hairline pt-8 md:grid-cols-5">
        {fields.map((field) => (
          <div key={field.key} className="pr-6">
            <dt className="font-mono text-micro uppercase text-text-tertiary">
              {field.key}
            </dt>
            <dd className="mt-2 font-mono text-body-s uppercase text-text-primary tabular">
              {field.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
