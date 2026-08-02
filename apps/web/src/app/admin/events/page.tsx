"use client";

/** Workshops, competitions, Robo Carnival, seminars, AGMs. */

import { RecordEditor } from "@/components/admin/RecordEditor";

const slugHint =
  "The end of the link, e.g. brs.org/events/robo-carnival-2024. Lower case, words joined by hyphens.";

export default function EventsPage() {
  return (
    <RecordEditor
      collection="events"
      title="Events"
      description="Everything the club has run. Untick “Show on the website” to keep a record without publishing it."
      titleField="title"
      sort="-start_date"
      defaults={{ published: false, featured: false, body: "", body_format: "md", copy_source: "authored" }}
      fields={[
        { name: "title", label: "Name", required: true },
        { name: "slug", label: "Web address", required: true, hint: slugHint },
        {
          name: "category",
          label: "Kind of event",
          type: "select",
          required: true,
          options: [
            { value: "workshop", label: "Workshop" },
            { value: "competition", label: "Competition" },
            { value: "robo-carnival", label: "Robo Carnival" },
            { value: "intra-buet", label: "Intra-BUET" },
            { value: "seminar", label: "Seminar" },
            { value: "reception", label: "Reception" },
            { value: "agm", label: "AGM" },
            { value: "co-organised", label: "Co-organised" },
          ],
          inList: true,
        },
        { name: "start_date", label: "Start date", type: "date", required: true, inList: true },
        { name: "end_date", label: "End date", hint: "Only for events running more than one day.", type: "date" },
        { name: "venue", label: "Venue" },
        { name: "series", label: "Series", hint: "For recurring events, e.g. “Robo Carnival”." },
        { name: "edition", label: "Edition", hint: "e.g. “4th”." },
        { name: "theme", label: "Theme" },
        { name: "presented_by", label: "Presented by", hint: "Title sponsor, if there was one." },
        {
          name: "body",
          label: "Description",
          type: "textarea",
          hint:
            "Markdown. Write in the past tense — this is an archive. Do not include registration links, " +
            "deadlines or payment numbers from the original announcement; they are dead and misleading.",
        },
        {
          name: "featured",
          label: "Feature this event",
          type: "checkbox",
          hint: "Featured events are given more space on the site.",
        },
        {
          name: "published",
          label: "Show on the website",
          type: "checkbox",
          inList: true,
        },
      ]}
    />
  );
}
