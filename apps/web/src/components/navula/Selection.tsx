import { NAVULA } from "@/lib/navula";

/**
 * §08 — SELECTION. A Server Component; zero client JS.
 *
 * How a member of the Society gets into Navula.
 *
 * ── WHY THIS REPLACED A BUILD LOG ────────────────────────────────────
 * The section here was a dated field log, which assumed a team that
 * builds one machine across one season. Navula is a squad that is
 * SELECTED — the club's own word was "specialised" — and for that kind
 * of team the way in is both the more truthful content and the strongest
 * recruitment argument available, because it is the one thing a reader
 * cannot find out any other way.
 *
 * It is also the section that makes §03's rules concrete. A charter that
 * says membership is governed by rules, followed by the actual stages of
 * getting in, is an institution describing itself. A charter alone is a
 * claim.
 *
 * ── THE LAYOUT ───────────────────────────────────────────────────────
 * Numbered stages down a single rule, each one the width of a paragraph
 * and no wider. This is the quietest section on the page and the last
 * before the close, which is deliberate: it is what someone who has read
 * everything else is looking for, and it should read as an answer rather
 * than as a pitch.
 *
 * Renders nothing when the array is empty, so an informal process is
 * removed by deleting its entries rather than by editing this file.
 */
export function Selection() {
  if (NAVULA.selection.length === 0) return null;

  return (
    <section
      aria-labelledby="navula-selection"
      data-field="paper"
      className="border-t border-line-hairline bg-bg-base px-6 py-24 md:px-16 md:py-40"
    >
      <div className="mx-auto max-w-content">
        <header className="flex flex-wrap items-baseline justify-between gap-6">
          <h2
            id="navula-selection"
            className="font-mono text-micro uppercase text-text-tertiary"
          >
            Selection
          </h2>
          <p className="max-w-prose text-body-m text-text-secondary">
            How a member of the Society joins the team.
          </p>
        </header>

        <ol className="mt-12 border-t border-line-strong">
          {NAVULA.selection.map((step, i) => (
            <li
              key={`${step.stage}-${i}`}
              className="navula-stage grid gap-4 border-b border-line-hairline py-8 md:gap-8"
            >
              <span
                aria-hidden="true"
                className="font-mono text-micro uppercase text-accent tabular"
              >
                Stage {String(i + 1).padStart(2, "0")}
              </span>

              <div>
                <h3
                  className="font-editorial text-editorial-s text-text-primary"
                  style={{ fontVariationSettings: "'wght' 400" }}
                >
                  {step.stage}
                </h3>
                <p className="mt-2 max-w-prose text-body-m text-text-secondary">
                  {step.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
