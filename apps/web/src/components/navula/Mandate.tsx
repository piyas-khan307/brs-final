import { NAVULA, PENDING } from "@/lib/navula";

/**
 * §03 — THE MANDATE. A Server Component; zero client JS.
 *
 * The standing rules, as a numbered charter.
 *
 * ── WHY THIS SECTION EXISTS ──────────────────────────────────────────
 * The club described Navula as a team that "has a leader and other
 * rules". That is an unusual thing for a student team to have and it is
 * the most valuable thing on this page, because rules are what separate
 * a team that represents an institution from a group of friends who
 * enter competitions together. Almost every club site claims the former
 * and can only evidence the latter.
 *
 * So the rules are set as a charter and given a whole section, rather
 * than being compressed into a paragraph of about-us copy where they
 * would read as tone instead of as governance.
 *
 * ── THE NUMERALS ARE THE DESIGN ──────────────────────────────────────
 * Large serif numerals in the margin, each clause hairline-ruled off the
 * next. That is what a charter, a constitution and a set of competition
 * regulations all actually look like, and it needs no ornament to say
 * so. The number is set in the editorial face at heading scale because
 * it is doing structural work — this is clause 02, not decoration.
 *
 * ── UNWRITTEN CLAUSES ────────────────────────────────────────────────
 * A clause whose text is still PENDING keeps its number and its heading
 * and shows an em-rule. It is NOT dropped. A charter with a visible gap
 * at clause 04 tells the club exactly what is missing; a charter that
 * silently renders three of five looks finished and is not.
 */
export function Mandate() {
  return (
    <section
      aria-labelledby="navula-mandate"
      className="border-t border-line-hairline px-6 py-24 md:px-16 md:py-40"
    >
      <div className="mx-auto max-w-shell">
        <header className="flex flex-wrap items-baseline justify-between gap-6">
          <h2
            id="navula-mandate"
            className="font-mono text-micro uppercase text-text-tertiary"
          >
            The mandate
          </h2>
          <p className="max-w-prose text-body-m text-text-secondary">
            The standing rules of the team, as they are written.
          </p>
        </header>

        <ol className="mt-12 border-t border-line-strong">
          {NAVULA.mandate.map((clause, i) => (
            <li
              key={clause.heading}
              className="navula-clause grid gap-4 border-b border-line-hairline py-8 md:gap-8"
            >
              {/* The clause number. Editorial face, because it is
                  structure rather than a statistic — a charter numbers
                  its clauses the way a book numbers its chapters. */}
              <span
                aria-hidden="true"
                className="font-editorial text-editorial-m text-accent tabular"
                style={{ fontVariationSettings: "'wght' 300" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              <h3 className="font-mono text-micro uppercase text-text-secondary">
                {clause.heading}
              </h3>

              {/* An unwritten clause keeps its place in the charter. */}
              <p
                className={
                  clause.text === PENDING
                    ? "max-w-prose font-mono text-body-s uppercase text-text-tertiary tabular"
                    : "max-w-prose text-body-l text-text-primary"
                }
              >
                {clause.text}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
