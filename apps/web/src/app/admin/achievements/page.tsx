"use client";

/**
 * Competition results.
 *
 * The one screen where the form has to argue with the person using it.
 * Two CHECK constraints stand behind it:
 *
 *   result_needs_verification    a result may not be recorded unverified
 *   verified_needs_attribution   a verification must name a source
 *
 * The wording here exists so nobody meets those constraints as an error.
 * "Leave the result empty" is not a limitation of the software — an empty
 * result means "took part, outcome not confirmed", which is the honest
 * state of almost the entire archive. Writing "3rd place" because it
 * sounds about right is the failure this whole site is built to prevent.
 */

import { RecordEditor } from "@/components/admin/RecordEditor";

export default function AchievementsPage() {
  return (
    <RecordEditor
      collection="achievements"
      title="Achievements"
      description="Competitions the club has entered. A result is only shown once it has been verified against a source."
      titleField="programme"
      sort="-year"
      defaults={{ verified: false, track: "national" }}
      fields={[
        {
          name: "programme",
          label: "Competition",
          required: true,
          hint: "e.g. ABU Robocon 2005, Robo Carnival Line Following.",
          inList: false,
        },
        { name: "year", label: "Year", type: "number", required: true, inList: true },
        {
          name: "track",
          label: "Level",
          type: "select",
          required: true,
          options: [
            { value: "international", label: "International" },
            { value: "national", label: "National" },
            { value: "hosted", label: "Hosted by BRS" },
          ],
          inList: true,
        },
        { name: "host", label: "Host or organiser" },
        { name: "team_name", label: "Team name" },
        {
          name: "result",
          label: "Result",
          hint:
            "LEAVE THIS EMPTY unless the placement is confirmed and you can point to a source. " +
            "Empty means “took part, outcome not confirmed” — it does not mean the team lost. " +
            "You must also tick “Verified” below, or the save will be refused.",
          inList: true,
        },
        {
          name: "verified",
          label: "Verified",
          type: "checkbox",
          hint: "Tick only if you have checked this against a certificate, a report, or someone who was there.",
        },
        {
          name: "verified_by",
          label: "Verified against what",
          hint: "Name the source — “certificate held by the club”, “Prothom Alo, 12 March 2005”. Required once verified.",
          showWhen: (r) => Boolean(r["verified"]),
        },
        {
          name: "verified_at",
          label: "Date verified",
          type: "date",
          showWhen: (r) => Boolean(r["verified"]),
        },
      ]}
    />
  );
}
