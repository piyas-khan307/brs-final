import { NAVULA } from "@/lib/navula";
import { Mount } from "./Mount";

/**
 * §05 — THE ROLES. A Server Component; zero client JS.
 *
 * Who does what inside the team, as hairline-ruled rows that open in
 * place, starting with the leader.
 *
 * ── WHY ROLES AND NOT SUBSYSTEMS ─────────────────────────────────────
 * This register first listed engineering subsystems — mechanical,
 * electrical, software. That was the wrong model, and wrong in an
 * instructive way: subsystems describe a MACHINE, and Navula is a squad
 * that fields a different machine at every competition it enters. A
 * standing org chart made of one machine's parts would have described
 * whichever robot happened to be current and nothing about the team.
 *
 * Roles are the structure that actually persists between campaigns, and
 * the club named them as the thing that defines the team: a leader, and
 * rules. §03 carries the rules; this carries the leader and everyone
 * under them.
 *
 * ── WHY A REGISTER AND NOT A CARD GRID ───────────────────────────────
 * Three-to-five cards with an icon, a heading and two lines of copy is
 * the single most generated layout on the web, and "meet the roles" is
 * exactly the content that invites it. A ruled register is what an
 * accession list, a parts schedule and a set of competition regulations
 * all actually look like — the more truthful form here, and the one
 * nobody else's club site uses.
 *
 * ── WHY <details> AND NOT STATE ──────────────────────────────────────
 * The obvious build is useState and a height transition, which costs an
 * island, a hydration boundary and a section that shows nothing without
 * JavaScript. <details> is disclosure implemented by the browser:
 * keyboard-operable, announced correctly, findable by in-page search
 * even while closed, and free.
 *
 * The shared `name` makes the rows mutually exclusive — opening one
 * closes the rest — which is an accordion with no accordion code. Where
 * a browser does not support exclusivity yet, the failure is that two
 * rows can be open at once. That is not a failure worth an island.
 */
export function RoleRegister() {
  return (
    <section
      aria-labelledby="navula-roles"
      data-field="paper"
      className="border-t border-line-hairline bg-bg-base px-6 py-24 md:px-16 md:py-40"
    >
      <div className="mx-auto max-w-shell">
        <header className="flex flex-wrap items-baseline justify-between gap-6">
          <h2
            id="navula-roles"
            className="font-mono text-micro uppercase text-text-tertiary"
          >
            The roles
          </h2>
          <p className="max-w-prose text-body-m text-text-secondary">
            Every part of a campaign is owned by one role. Open a row to see
            what it answers for.
          </p>
        </header>

        <div className="mt-12 border-t border-line-strong">
          {NAVULA.roles.map((role) => (
            <details
              key={role.code}
              name="navula-register"
              className="navula-row group border-b border-line-hairline"
            >
              <summary className="navula-row-summary flex cursor-pointer items-baseline gap-6 py-6">
                {/* The role code. Fixed width so the names below it all
                    start on the same vertical, which is the entire
                    visual argument of a register. */}
                <span className="w-12 shrink-0 font-mono text-micro uppercase text-accent tabular">
                  {role.code}
                </span>

                <span className="flex-1">
                  <span
                    className="block font-editorial text-editorial-m text-text-primary"
                    style={{ fontVariationSettings: "'wght' 400" }}
                  >
                    {role.name}
                  </span>
                  <span className="mt-1 block text-body-m text-text-secondary">
                    {role.brief}
                  </span>
                </span>

                <span aria-hidden="true" className="navula-marker shrink-0" />
              </summary>

              <div className="grid gap-8 pb-10 md:grid-cols-2 md:gap-16">
                <Mount
                  photo={role.photo}
                  ratio="3 / 2"
                  sizes="(min-width: 768px) 44vw, 100vw"
                />

                <div>
                  <p className="max-w-prose text-body-m text-text-secondary">
                    {role.detail}
                  </p>

                  {/* A definition list, because that is what it is — and
                      mono tabular figures so two rows opened one after
                      the other line up rather than jittering. */}
                  <dl className="mt-8 border-t border-line-hairline">
                    {role.specs.map((spec) => (
                      <div
                        key={spec.key}
                        className="flex items-baseline justify-between gap-6 border-b border-line-faint py-3"
                      >
                        <dt className="font-mono text-micro uppercase text-text-tertiary">
                          {spec.key}
                        </dt>
                        <dd className="font-mono text-body-s uppercase text-text-primary tabular">
                          {spec.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
