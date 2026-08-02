"use client";

/** Sponsors and newspaper coverage. Two small collections, one screen —
 *  they are looked after by the same person and neither is big enough to
 *  deserve its own place in the menu. */

import { useState } from "react";

import { RecordEditor } from "@/components/admin/RecordEditor";
import { Button } from "@/components/admin/ui";

export default function PartnersPage() {
  const [tab, setTab] = useState<"partners" | "press">("partners");

  return (
    <div className="space-y-6">
      <div className="flex gap-2" role="tablist" aria-label="Partners or press">
        <Button
          role="tab"
          aria-selected={tab === "partners"}
          variant={tab === "partners" ? "secondary" : "quiet"}
          onClick={() => setTab("partners")}
        >
          Partners &amp; sponsors
        </Button>
        <Button
          role="tab"
          aria-selected={tab === "press"}
          variant={tab === "press" ? "secondary" : "quiet"}
          onClick={() => setTab("press")}
        >
          Press coverage
        </Button>
      </div>

      {tab === "partners" ? (
        <RecordEditor
          collection="partners"
          title="Partners & sponsors"
          description="Organisations that have supported the club."
          titleField="name"
          sort="name"
          defaults={{ tier: "partner", years: [] }}
          fields={[
            { name: "name", label: "Organisation", required: true },
            {
              name: "tier",
              label: "Relationship",
              type: "select",
              required: true,
              options: [
                { value: "presenting", label: "Presenting sponsor" },
                { value: "powered-by", label: "Powered by" },
                { value: "partner", label: "Partner" },
                { value: "co-organiser", label: "Co-organiser" },
              ],
              inList: true,
            },
            {
              name: "years",
              label: "Years",
              type: "tags",
              hint: "Which years they supported, separated by commas — 2023, 2024.",
              inList: true,
            },
            { name: "url", label: "Website" },
            { name: "logo_asset_id", label: "Logo", type: "photo" },
          ]}
        />
      ) : (
        <RecordEditor
          collection="press"
          title="Press coverage"
          description="Newspaper and online articles about the club. A scan is required — the cutting is the evidence."
          titleField="outlet"
          sort="-published_on"
          fields={[
            { name: "outlet", label: "Publication", required: true, hint: "e.g. The Daily Star." },
            { name: "headline", label: "Headline" },
            { name: "published_on", label: "Date published", type: "date", required: true, inList: true },
            {
              name: "scan_asset_id",
              label: "Scan or screenshot",
              type: "photo",
              hint: "Required. Without the cutting there is nothing to check the claim against.",
              required: true,
            },
            { name: "url", label: "Link", hint: "If it is still online." },
          ]}
        />
      )}
    </div>
  );
}
