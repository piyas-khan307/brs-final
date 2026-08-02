import { Mark } from "@/components/brand/Mark";
import { Intro } from "@/components/motion/Intro";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { KeyFacts } from "@/components/showcase/KeyFacts";
import { RoverSequence } from "@/components/showcase/RoverSequence";
import { HorizontalGallery } from "@/components/showcase/HorizontalGallery";
import { GridAssembly } from "@/components/showcase/GridAssembly";
import { SheetFooter } from "@/components/landing/Sections";

/**
 * ══════════════════════════════════════════════════════════════════════
 * THE MOTION SHEET — the landing page, built to be shown.
 *
 * SCOPE, ON CLIENT INSTRUCTION: "i dont need full deplyment level
 * website .. just need best of the best UI to show and convince the club
 * members". This page is a pitch artefact. Content is hardcoded, there is
 * no CMS behind it, and it runs on localhost. It is optimised for the
 * first ten seconds in front of an audience.
 *
 * RULES DELIBERATELY SET ASIDE, so that none of this is mistaken for an
 * oversight later:
 *   · the 15 KB first-party JS budget (§4.7) — GSAP and Lenis are the
 *     instrument this brief is written for, and they cost what they cost
 *   · "no scroll hijacking" (§17.3) — sections 2 and 3 are pinned. That
 *     rule was written against pins that never release; every pin here has
 *     a computed, finite end
 *   · the 34-check Landing Gate — a production-readiness rubric, not a
 *     measure of whether a demo lands
 *
 * RULES DELIBERATELY KEPT, because a demo is exactly where they slip:
 *   · every figure on the page is counted or verified. No "500+ members"
 *   · every photograph is a real BRS archive image with real alt text
 *   · prefers-reduced-motion removes the intro and every scroll timeline
 *   · the page is legible and complete with JavaScript disabled
 *
 * The previous static design is preserved at /sheet-01 rather than
 * deleted — it is the fallback if the club prefers restraint.
 * ══════════════════════════════════════════════════════════════════════
 */

export default function MotionSheet() {
  return (
    <>
      <a
        // Points at <main>, not at a section id — the section that used to
        // own "#opening" was deleted with the old hero.
        href="#main"
        // z-50 matches the intro overlay rather than beating it, which is
        // correct: the intro skips on any keypress, so the first Tab both
        // dismisses it and lands here.
        className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-50 focus:border focus:border-line-strong focus:bg-bg-raised focus:px-4 focus:py-2 focus:text-body-s focus:text-text-primary"
      >
        Skip to content
      </a>

      <Intro />
      <SmoothScroll />

      {/* Fixed masthead. Opaque, not translucent — a blurred bar over
          plates travelling underneath it turns into visual mud. */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-line-hairline bg-bg-base px-6 py-4 md:px-16">
        <a
          href="/"
          className="flex items-center gap-3 font-mono text-micro uppercase tracking-widest text-text-primary no-underline"
        >
          <Mark size="sm" label="BUET Robotics Society — home" />
          {/* The full name wraps to three lines beside the nav on a 390px
              screen. The mark alone carries it there. */}
          <span className="hidden text-text-tertiary sm:inline">
            BUET Robotics Society
          </span>
        </a>
        <nav aria-label="Primary">
          <ul className="flex items-center gap-6 md:gap-10">
            {[
              ["Events", "/events"],
              ["Achievements", "/achievements"],
              ["Join", "/explore/join"],
            ].map(([label, href]) => (
              <li key={label}>
                <a
                  href={href}
                  className="font-mono text-micro uppercase text-text-secondary no-underline transition-colors duration-base ease-out hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main">
        {/* THE SEQUENCE IS THE OPENING. It replaces the previous hero
            outright rather than sitting below it.

            The hero it replaced was a display heading left, a paragraph,
            two indexed links, and a photograph right — which is the
            single most generated layout on the web, and reading as such
            was a fair call. Nothing was added to fix it; the section was
            deleted. Its one piece of substance, the four-clause evidenced
            statement, moved down into The record where the figures it
            cites actually live. */}
        <RoverSequence />
        <KeyFacts />
        <HorizontalGallery />
        <GridAssembly />
      </main>

      <div className="border-t border-line-hairline px-6 pt-16 md:px-16">
        <div className="mx-auto max-w-shell">
          {/* The mark closes the page as well as opening it. Third and last
              appearance: masthead, intro, here. */}
          {/* No bottom border here — SheetFooter opens with its own
              border-t, and the two together drew a rule, a band of dead
              space, and a second rule. */}
          <div className="mb-12 flex flex-wrap items-center justify-between gap-8">
            <div className="flex items-center gap-5">
              <Mark size="md" />
              <div>
                <span className="block text-heading-m text-text-primary">
                  BUET Robotics Society
                </span>
                <span className="mt-1 block font-mono text-micro uppercase text-text-tertiary">
                  Founded for ABU Robocon 2005 · Dhaka
                </span>
              </div>
            </div>

            {/* The two actions from the deleted hero. They survive because
                a landing page with no way in is decoration — but they sit
                at the end, where someone who has just watched the whole
                page is actually ready to act, rather than being offered
                before anything has been shown. */}
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              {[
                ["01", "Apply for membership", "/explore/join"],
                ["02", "Read the record", "/achievements"],
              ].map(([index, label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="group flex items-baseline gap-3 border-b border-line-strong pb-2 no-underline transition-colors duration-base ease-out hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
                >
                  <span className="font-mono text-micro tabular text-text-tertiary">
                    {index}
                  </span>
                  <span className="text-body-m text-text-primary transition-colors duration-base ease-out group-hover:text-accent">
                    {label}
                  </span>
                  <span aria-hidden="true" className="text-text-tertiary">
                    →
                  </span>
                </a>
              ))}
            </div>
          </div>
          <SheetFooter />
        </div>
      </div>
    </>
  );
}
