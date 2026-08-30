import { NAVULA, ROLE_BY_CODE } from "@/lib/navula";
import { Mount } from "./Mount";

/**
 * §07 — THE SQUAD. A Server Component; zero client JS.
 *
 * ── GROUPED BY ROLE, NEVER ALPHABETICALLY ────────────────────────────
 * This is the whole design decision and it is not cosmetic. An
 * alphabetical grid of portraits is a list of people who happen to know
 * each other. The same portraits under LEAD / DEP / TECH / OPS are proof
 * that the roles in §05 and the rules in §03 describe real named humans,
 * which means those sections stop being a diagram and become a claim
 * with evidence attached. The three hold each other up.
 *
 * ── THE LEADER IS SET APART ──────────────────────────────────────────
 * The club named the leader as a defining feature of the team, so the
 * page treats the role that way: the LEAD group renders first and at a
 * larger portrait size, alone on its row. A leader who sorts into the
 * middle of a four-column grid is a filing decision, not a structure.
 *
 * ── `since` IS THE MOST PERSUASIVE LINE ON THE PAGE ──────────────────
 * Where an alumnus went afterwards is the only recruitment argument that
 * cannot be written by a marketing department, because it is checkable.
 * It renders only when supplied — an empty one is omitted rather than
 * shown as a rule, since unlike a placing this is a fact about a person
 * and a visible blank next to a name reads as a judgement.
 */
export function Squad() {
  // Group order follows the register, so §05 and §07 are read in the
  // same sequence and LEAD comes first in both.
  const groups = NAVULA.roles
    .map((role) => ({
      code: role.code,
      label: ROLE_BY_CODE.get(role.code)?.name ?? role.code,
      members: NAVULA.squad.filter((m) => m.role === role.code),
    }))
    .filter((g) => g.members.length > 0);

  return (
    <section
      aria-labelledby="navula-squad"
      className="border-t border-line-hairline px-6 py-24 md:px-16 md:py-40"
    >
      <div className="mx-auto max-w-shell">
        <header className="flex flex-wrap items-baseline justify-between gap-6">
          <h2
            id="navula-squad"
            className="font-mono text-micro uppercase text-text-tertiary"
          >
            The squad
          </h2>
          <p className="font-mono text-micro uppercase text-text-tertiary tabular">
            {NAVULA.squad.length} on the roster
          </p>
        </header>

        {groups.map((group) => {
          const isLead = group.code === "LEAD";
          return (
            <div key={group.code} className="mt-16">
              {/* The group rule carries its own code, so the grouping is
                  legible without a coloured band or a filled header —
                  the same device the register uses. */}
              <div className="flex items-baseline gap-6 border-t border-line-strong pt-4">
                <span className="w-12 shrink-0 font-mono text-micro uppercase text-accent tabular">
                  {group.code}
                </span>
                <h3 className="font-mono text-micro uppercase text-text-secondary">
                  {group.label}
                </h3>
              </div>

              <ul
                className={
                  isLead
                    ? "mt-8 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3"
                    : "mt-8 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4"
                }
              >
                {group.members.map((member, i) => (
                  <li key={`${member.name}-${i}`}>
                    <Mount
                      photo={member.photo}
                      ratio="4 / 5"
                      sizes={
                        isLead
                          ? "(min-width: 768px) 28vw, 44vw"
                          : "(min-width: 768px) 20vw, 44vw"
                      }
                    />
                    {/* The name is the only place a serif appears outside
                        a heading. That is deliberate: it says a person is
                        not a data field. */}
                    <p
                      className={
                        isLead
                          ? "mt-4 font-editorial text-editorial-m text-text-primary"
                          : "mt-4 font-editorial text-editorial-s text-text-primary"
                      }
                      style={{ fontVariationSettings: "'wght' 400" }}
                    >
                      {member.name}
                    </p>
                    <p className="mt-1 font-mono text-micro uppercase text-text-tertiary">
                      {member.title}
                    </p>
                    {member.since ? (
                      <p className="mt-2 font-mono text-micro uppercase text-text-secondary">
                        {member.since}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
