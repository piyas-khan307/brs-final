import type { Metadata } from "next";

import { Masthead } from "@/components/landing/Masthead";
import { SheetFooter } from "@/components/landing/Sections";
import { EventFeed } from "@/components/events/EventFeed";
import { EVENTS, EVENT_CATEGORIES, EVENT_YEARS } from "@/lib/events.generated";

/**
 * ══════════════════════════════════════════════════════════════════════
 * THE EVENTS FEED.
 *
 * Club direction: the events section should work "like Blogger". Read as
 * a statement about reading, that means a FEED of written pieces —
 * cover, title, date, a sentence — and not the filterable catalogue of
 * venues and eligibility criteria the schema was originally shaped for.
 *
 * The structured fields have not been deleted; they moved. They appear on
 * the article, under the writing, where a reader who wants to know the
 * venue can find it and a reader who wants to know what happened is not
 * made to read a form first.
 * ══════════════════════════════════════════════════════════════════════
 */

export const metadata: Metadata = {
  title: "Events — BUET Robotics Society",
  description:
    `Workshops, competitions, Robo Carnivals, seminars and recruitment drives run by the ` +
    `BUET Robotics Society. ${EVENTS.length} on record.`,
};

export default function EventsPage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-50 focus:border focus:border-line-strong focus:bg-bg-raised focus:px-4 focus:py-2 focus:text-body-s focus:text-text-primary"
      >
        Skip to content
      </a>

      <Masthead />

      <main
        id="main"
        className="mx-auto max-w-shell px-6 pb-24 pt-16 md:px-16 md:pb-40 md:pt-24"
      >
        <header className="text-center">
          <h1
            className="font-display text-display-l text-text-primary"
            style={{ fontVariationSettings: "'wght' 700" }}
          >
            Events
          </h1>
          <div className="mx-auto mt-12 flex max-w-content items-center gap-6">
            <span aria-hidden="true" className="h-px flex-1 bg-line-strong" />
            <span className="whitespace-nowrap font-mono text-micro uppercase tabular text-text-tertiary">
              {EVENTS.length} on record
            </span>
            <span aria-hidden="true" className="h-px flex-1 bg-line-strong" />
          </div>
        </header>

        <EventFeed events={EVENTS} categories={EVENT_CATEGORIES} years={EVENT_YEARS} />

        <div className="mt-24 md:mt-40">
          <SheetFooter />
        </div>
      </main>
    </>
  );
}
