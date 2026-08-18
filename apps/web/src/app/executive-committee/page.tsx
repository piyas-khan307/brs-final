import type { Metadata } from "next";

import { Masthead } from "@/components/landing/Masthead";
import { LiveCommitteeView } from "@/components/committee/LiveCommitteeView";
import { COMMITTEE } from "@/lib/committee.generated";

export const metadata: Metadata = {
  title: `${COMMITTEE.label} — BUET Robotics Society`,
  description: `The ${COMMITTEE.label} of the BUET Robotics Society: office-bearers and team members across ${COMMITTEE.groups.length} sections.`,
};

export default function ExecutiveCommittee() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-50 focus:border focus:border-line-strong focus:bg-bg-raised focus:px-4 focus:py-2 focus:text-body-s focus:text-text-primary"
      >
        Skip to content
      </a>

      <Masthead />

      <LiveCommitteeView initialCommittee={COMMITTEE} />
    </>
  );
}

