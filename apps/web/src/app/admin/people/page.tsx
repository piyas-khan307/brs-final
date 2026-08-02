"use client";

/**
 * Everyone on record, across every committee.
 *
 * A person is one row reused by every committee they serve on — that is
 * what keeps the alumni record intact when somebody serves twice. To put
 * someone ON a committee, use the Committee screen; this one is for
 * correcting a name or adding a portrait.
 */

import Link from "next/link";

import { RecordEditor } from "@/components/admin/RecordEditor";
import { Notice } from "@/components/admin/ui";

export default function PeoplePage() {
  return (
    <div className="space-y-6">
      <Notice tone="warning">
        <strong>Never record a phone number or home address here.</strong> There is no field for
        one and there must never be. If a contact route is needed, use an official club address.
      </Notice>

      <Notice tone="info">
        To put someone on a committee, use the{" "}
        <Link href="/admin/committee/" className="underline">
          Committee
        </Link>{" "}
        screen — it creates the person and the placement in one step.
      </Notice>

      <RecordEditor
        collection="members"
        title="People"
        description="One entry per person, shared across every committee they have served on."
        titleField="name"
        sort="name"
        fields={[
          { name: "name", label: "Full name", required: true, hint: "Exactly as it should appear on the website." },
          {
            name: "department",
            label: "Department",
            hint: "Leave empty if it is not recorded. Blank is a true answer — a guess is not.",
            inList: true,
          },
          {
            name: "batch",
            label: "Batch",
            hint: "Club convention, e.g. EEE ’20. Leave empty if not recorded.",
            inList: true,
          },
          { name: "portrait_asset_id", label: "Portrait", type: "photo" },
        ]}
      />
    </div>
  );
}
