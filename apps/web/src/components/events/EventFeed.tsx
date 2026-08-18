"use client";

/**
 * ══════════════════════════════════════════════════════════════════════
 * THE FEED, WITH ITS FILTERS.
 *
 * An island, and the reason is worth stating because most of this site
 * deliberately is not one: sixty-five events across nine categories and
 * a decade of years is more than a person can scan. Filtering is the
 * feature, and doing it without JavaScript would mean a page load per
 * click — which on a static export is a full navigation for what should
 * be instant.
 *
 * WITHOUT JAVASCRIPT: every event renders, unfiltered, in feed order.
 * The filters are the only thing that stops working, and the content is
 * all still there — which is the correct failure for an archive.
 *
 * ── THE CARD IS THE WHOLE LINK ──
 * Not a title-link with a picture next to it. The entire card is one
 * anchor, so the target is 300px tall instead of the height of one line
 * of text, and the hover state can describe the whole thing at once.
 * ══════════════════════════════════════════════════════════════════════
 */

import Link from "next/link";
import { useMemo, useState } from "react";

import type { EventCard } from "@/lib/events.generated";

const srcSet = (sources: { w: number; url: string }[]) =>
  sources.map((s) => `${s.url} ${s.w}w`).join(", ");

/* A category's display name is CARRIED, not derived. Title-casing the
   slug was close enough while the categories were a fixed enum, and it
   is wrong the moment the club adds its own: it renders "agm" as "Agm"
   and "recruitment" as "Recruitment" rather than "Member recruitment".
   See migration 0015. */

const ALL = "All";

export function EventFeed({
  events,
  categories,
  years,
}: {
  events: EventCard[];
  categories: { slug: string; name: string }[];
  years: string[];
}) {
  const [category, setCategory] = useState(ALL);
  const [year, setYear] = useState(ALL);

  const shown = useMemo(
    () =>
      events.filter(
        (e) =>
          // A parent category matches its subcategories too, so
          // "Workshop" is not empty when everything is filed under
          // "Basic Workshop".
          (category === ALL ||
            e.category === category ||
            e.categoryParent?.slug === category) &&
          (year === ALL || e.year === year),
      ),
    [events, category, year],
  );

  return (
    <>
      {/* ── The filters ────────────────────────────────────────────────
          Two rows of hairline chips rather than two dropdowns. A select
          hides its own options until clicked, and the point of these is
          that a visitor can see at a glance that the club runs nine
          kinds of thing across a decade. */}
      <div className="mt-16 space-y-4 border-t border-line-strong pt-8 md:mt-24">
        <Filter
          name="Kind"
          options={[ALL, ...categories.map((c) => c.slug)]}
          value={category}
          onChange={setCategory}
          format={(slug) => categories.find((c) => c.slug === slug)?.name ?? slug}
        />
        <Filter name="Year" options={[ALL, ...years]} value={year} onChange={setYear} />
      </div>

      <p
        className="mt-8 font-mono text-micro uppercase tabular text-text-tertiary"
        // Announced when the count changes, so a screen-reader user gets
        // the same feedback a sighted one gets from the grid redrawing.
        aria-live="polite"
      >
        {shown.length} {shown.length === 1 ? "event" : "events"}
        {category === ALL && year === ALL ? "" : " shown"}
      </p>

      {shown.length === 0 ? (
        <p className="mt-16 border-t border-line-hairline pt-16 text-center text-body-l text-text-secondary">
          Nothing on record matches that yet.
        </p>
      ) : (
        <ul className="mt-8 grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((e, i) => (
            <li key={e.slug}>
              <Link href={`/events/${e.slug}`} className="event-card group block no-underline">
                <picture
                  className="event-card__frame"
                  style={{ aspectRatio: `${e.cover.width} / ${e.cover.height}` }}
                >
                  <source type="image/avif" srcSet={srcSet(e.cover.avif)} sizes={SIZES} />
                  <source type="image/webp" srcSet={srcSet(e.cover.webp)} sizes={SIZES} />
                  <img
                    src={e.cover.webp[e.cover.webp.length - 1]?.url}
                    alt={e.cover.alt}
                    width={e.cover.width}
                    height={e.cover.height}
                    sizes={SIZES}
                    loading={i < 6 ? "eager" : "lazy"}
                    decoding="async"
                    style={{
                      backgroundImage: `url("${e.cover.lqip}")`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                </picture>

                <p className="mt-5 flex flex-wrap items-baseline gap-x-3 font-mono text-micro uppercase tabular text-text-tertiary">
                  <span className="text-accent">{e.categoryName}</span>
                  {/* The year, or an honest silence. An event whose date
                      nobody recorded says nothing rather than guessing. */}
                  {e.year ? <span>{e.year}</span> : null}
                  {e.edition && e.edition !== e.year ? <span>{e.edition}</span> : null}
                </p>

                <h2 className="event-card__title mt-3 font-display text-heading-m text-text-primary">
                  {e.title}
                </h2>

                {e.excerpt ? (
                  <p className="mt-3 line-clamp-3 text-body-m text-text-secondary">
                    {e.excerpt}
                  </p>
                ) : (
                  <p className="mt-3 font-mono text-micro uppercase text-text-tertiary">
                    Photographs only
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const SIZES = "(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 90vw";

function Filter({
  name,
  options,
  value,
  onChange,
  format = (s: string) => s,
}: {
  name: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  format?: (s: string) => string;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
      <span className="w-16 shrink-0 font-mono text-micro uppercase tabular text-text-tertiary">
        {name}
      </span>
      {/* A radio group, not a row of buttons: exactly one is chosen at a
          time, and arrow keys move between them the way a keyboard user
          expects. The visible control is the label. */}
      <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={value === o}
            onClick={() => onChange(o)}
            className="chip"
          >
            {format(o)}
          </button>
        ))}
      </div>
    </div>
  );
}
