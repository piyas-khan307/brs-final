import type { Metadata } from "next";
import Link from "next/link";

import { Masthead } from "@/components/landing/Masthead";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { Nameplate } from "@/components/navula/Nameplate";
import { PurposeHold } from "@/components/navula/PurposeHold";
import { Mandate } from "@/components/navula/Mandate";
import { AnnotatedMachine } from "@/components/navula/AnnotatedMachine";
import { RoleRegister } from "@/components/navula/RoleRegister";
import { RecordTraverse } from "@/components/navula/RecordTraverse";
import { Squad } from "@/components/navula/Squad";
import { Selection } from "@/components/navula/Selection";
import { DRAFT, NAVULA } from "@/lib/navula";

/**
 * ══════════════════════════════════════════════════════════════════════
 * /teams/navula — THE TEAM DOSSIER.
 *
 * Nine sections. The organising idea is that scrolling the page is
 * reading the document, so the page is built as a dossier rather than as
 * a landing page about a team:
 *
 *   01  Nameplate    petrol drafting sheet, the name, five measured fields
 *   02  Purpose      one sentence, pinned, revealed clause by clause
 *   03  The mandate  the standing rules, as a numbered charter
 *   04  The flagship one photograph, annotated with drawn leader lines
 *   05  The roles    a hairline register that opens in place
 *   06  The record   a pinned horizontal chronology — the climax
 *   07  The squad    portraits grouped by role, the leader set apart
 *   08  Selection    how a member of the Society gets in
 *   09  Close        two indexed actions
 *
 * ── WHAT NAVULA IS, AND WHY THAT DECIDED THE STRUCTURE ───────────────
 * Per the club: Navula is a specialised team that represents BRS at
 * every competition it enters, national and international, with a leader
 * and standing rules.
 *
 * That is a competition SQUAD, not a build team, and an earlier draft of
 * this page had it wrong — it was organised around one machine and its
 * engineering subsystems, which describes whichever robot is current and
 * nothing about the team. §03 and §05 now carry the two things the club
 * actually named, the rules and the leader; machines belong to campaigns
 * in §06; and §04 is optional because a squad need not have a flagship.
 *
 * ── THE RHYTHM IS THE POINT ──────────────────────────────────────────
 * 02, 04 and 06 are the loud sections and every one of them is separated
 * by a quiet, dense one. A page where every section performs reads as a
 * demo reel and stops meaning anything by the third scroll; the quiet
 * sections are what make the set pieces land. The record is last of the
 * three because it is what the team is for, so the page builds to it.
 * Do not add a fourth animated section between them.
 *
 * ── ROUTE ────────────────────────────────────────────────────────────
 * /teams/navula rather than /navula. There will be other teams, and a
 * top-level slug per team is a namespace that fills up with things that
 * are not teams. The Masthead gains a Teams entry pointing here.
 *
 * ── CONTENT ──────────────────────────────────────────────────────────
 * All of it is in lib/navula.ts, on instruction, matching how the motion
 * sheet was built. Nothing on this page is fetched and nothing needs the
 * backend running. When the club wants to edit it from /admin, the types
 * in that file become the DTO and this tree does not change.
 * ══════════════════════════════════════════════════════════════════════
 */

export const metadata: Metadata = {
  title: `Team ${NAVULA.name} — BUET Robotics Society`,
  description: `Team ${NAVULA.name} of the BUET Robotics Society: the machine, its subsystems, the competition record, and the crew who built it.`,
};

export default function TeamNavula() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-50 focus:border focus:border-line-strong focus:bg-bg-raised focus:px-4 focus:py-2 focus:text-body-s focus:text-text-primary"
      >
        Skip to content
      </a>

      <Masthead />

      {/* Lenis, for the same reason the motion sheet carries it: two
          pinned sections scrubbing against a native wheel event read as
          stepped. Not installed under prefers-reduced-motion, and it
          renders null, so no-JS scrolls natively. */}
      <SmoothScroll />

      {/* THE DRAFT RIBBON. Shown while lib/navula.ts still holds
          placeholders, and it is not subtle on purpose: the failure mode
          this guards against is placeholder copy reaching a visitor
          because it looked finished enough in review. Flip DRAFT to
          false in lib/navula.ts and it disappears. */}
      {DRAFT ? (
        <p
          role="status"
          className="border-b border-line-accent bg-bg-inset px-6 py-3 text-center font-mono text-micro uppercase text-accent md:px-16"
        >
          Draft — placeholder content. Every name, figure and photograph on
          this page is a stand-in. Edit src/lib/navula.ts.
        </p>
      ) : null}

      {/* --navula-chrome is what sits ABOVE the nameplate: the sticky
          masthead, plus the draft ribbon while it is up. §01 subtracts it
          from 100svh so its bottom rail lands on the fold rather than
          just under it. This page is the only place that knows whether
          the ribbon is currently rendered, so this is where the figure
          is stated. */}
      <main
        id="main"
        style={{ "--navula-chrome": DRAFT ? "7.5rem" : "4rem" } as React.CSSProperties}
      >
        <Nameplate />
        <PurposeHold />
        <Mandate />
        {/* Optional: null flagship drops the section outright. See the
            header of AnnotatedMachine.tsx for why a squad may not have
            one machine to put at the top of a page. */}
        {NAVULA.flagship ? <AnnotatedMachine /> : null}
        <RoleRegister />
        <RecordTraverse />
        <Squad />
        <Selection />

        {/* ── §09 CLOSE ──────────────────────────────────────────────
            Two indexed actions in the site's existing pattern: a rule
            under a label, never a filled pill. They sit at the very end
            because someone who has read the whole dossier is ready to
            act, and someone offered a button before seeing anything is
            being sold to. */}
        <section
          aria-labelledby="navula-close"
          className="border-t border-line-hairline px-6 py-24 md:px-16 md:py-40"
        >
          <div className="mx-auto flex max-w-shell flex-wrap items-end justify-between gap-12">
            <h2
              id="navula-close"
              className="max-w-prose font-editorial text-editorial-l text-text-primary"
              style={{ fontVariationSettings: "'wght' 400" }}
            >
              Team {NAVULA.name} recruits once a year.
            </h2>

            <div className="flex flex-wrap gap-x-10 gap-y-4">
              {NAVULA.actions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group flex items-baseline gap-3 border-b border-line-strong pb-2 no-underline transition-colors duration-base ease-out hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
                >
                  <span className="font-mono text-micro tabular text-text-tertiary">
                    {action.index}
                  </span>
                  <span className="text-body-m text-text-primary transition-colors duration-base ease-out group-hover:text-accent">
                    {action.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
