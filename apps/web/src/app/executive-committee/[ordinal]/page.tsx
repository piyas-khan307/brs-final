import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Masthead } from "@/components/landing/Masthead";
import { LiveCommitteeView } from "@/components/committee/LiveCommitteeView";
import { COMMITTEES, loadCommittee } from "@/lib/committees.generated";

/**
 * ══════════════════════════════════════════════════════════════════════
 * ANY COMMITTEE, AT ITS OWN ADDRESS.
 *
 *   /executive-committee        the current one
 *   /executive-committee/11     the same committee, by ordinal
 *   /executive-committee/10     the one before it
 *
 * The two are not a redundancy. `/executive-committee` is the address you
 * give someone — it follows the club from one year to the next. The
 * ordinal is the address that never moves, which is what a link in a
 * write-up from 2019 needs to still resolve to the committee it meant.
 *
 * ── ONE PAGE, EVERY TERM ──
 * Exactly the same component renders all of them. A past committee is not
 * a lesser thing with a smaller layout; it is the same record, older. The
 * only difference on the page is that the archive link points back.
 *
 * `dynamicParams = false` because there is no server: the build enumerates
 * every committee on record and anything else is a 404 rather than a
 * route that quietly renders nothing.
 * ══════════════════════════════════════════════════════════════════════
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return COMMITTEES.map((c) => ({ ordinal: String(c.ordinal) }));
}

type Params = { params: Promise<{ ordinal: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { ordinal } = await params;
  const summary = COMMITTEES.find((c) => String(c.ordinal) === ordinal);
  if (!summary) return { title: "Not found — BUET Robotics Society" };

  const years =
    summary.termStart && summary.termEnd
      ? `, ${summary.termStart}–${String(summary.termEnd).slice(-2)}`
      : "";

  return {
    title: `${summary.label} — BUET Robotics Society`,
    description: `The ${summary.label} of the BUET Robotics Society${years}: ${summary.members} members on record.`,
  };
}

export default async function CommitteeByOrdinal({ params }: Params) {
  const { ordinal } = await params;
  const committee = await loadCommittee(Number(ordinal));
  if (!committee) notFound();

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-50 focus:border focus:border-line-strong focus:bg-bg-raised focus:px-4 focus:py-2 focus:text-body-s focus:text-text-primary"
      >
        Skip to content
      </a>

      <Masthead />

      <LiveCommitteeView initialCommittee={committee} />
    </>
  );
}
