import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Masthead } from "@/components/landing/Masthead";
import { SheetFooter } from "@/components/landing/Sections";
import { EventGallery } from "@/components/events/EventGallery";
import { EVENTS } from "@/lib/events.generated";
import { loadEvent } from "@/lib/events.load.generated";

/**
 * ══════════════════════════════════════════════════════════════════════
 * ONE EVENT, AS AN ARTICLE.
 *
 * Cover, title, date, then the writing. The structured record — venue,
 * platform, presented by, the segments of a Robo Carnival — sits BELOW
 * the prose, under its own rule, because it is reference and the account
 * is the story.
 *
 * The body is inert HTML rendered at build time — by lib/markdown.ts for
 * the archive's markdown entries, by lib/richtext/render.ts for anything
 * written in the admin editor since migration 0014. Both escape every
 * byte of input before adding a single tag, so neither can emit markup
 * an author supplied.
 * ══════════════════════════════════════════════════════════════════════
 */

export const dynamicParams = false;

/**
 * THE ONE SCRIPT ON THIS PAGE, AND IT ONLY EXISTS WHEN THERE IS A VIDEO.
 *
 * A write-up can embed YouTube or Vimeo. The build renders that as a
 * facade — a play triangle over a link — and this swaps in the real
 * iframe when a reader presses it. The iframe is built from
 * `data-embed-src`, which the renderer wrote from a hardcoded origin and
 * an id it character-checked; nothing an editor typed reaches it.
 *
 * ── WHY NOT JUST RENDER THE IFRAME ──
 * A YouTube iframe pulls roughly a megabyte of third-party JavaScript on
 * page open, watched or not. This page otherwise ships no third-party
 * script at all, and an archive is mostly read rather than watched, so
 * the default would have been paying the heaviest cost on the site for
 * the least-used thing on it.
 *
 * ── WHY A SCRIPT TAG AND NOT A COMPONENT ──
 * Because a client component here would be a React island — the ~110 KB
 * runtime floor plus a hydration boundary — to do what eleven lines of
 * DOM code does. WITHOUT JAVASCRIPT nothing is lost: the facade is an
 * <a> to the video, so it stays a working link.
 */
function EmbedFacade() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `document.addEventListener("click",function(e){
var a=e.target.closest?e.target.closest(".rt-embed-play"):null;if(!a)return;
var box=a.parentNode,src=box.getAttribute("data-embed-src");if(!src)return;
e.preventDefault();
var f=document.createElement("iframe");
f.src=src+"&autoplay=1";f.title=a.textContent.trim();f.loading="lazy";f.allowFullscreen=true;
f.allow="accelerometer;autoplay;clipboard-write;encrypted-media;picture-in-picture";
f.referrerPolicy="strict-origin-when-cross-origin";
box.replaceChild(f,a);});`,
      }}
    />
  );
}

export function generateStaticParams() {
  return EVENTS.map((e) => ({ slug: e.slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const event = await loadEvent(slug);
  if (!event) return { title: "Not found — BUET Robotics Society" };

  return {
    title: `${event.title} — BUET Robotics Society`,
    description:
      event.plain.slice(0, 200) ||
      `${event.title}, BUET Robotics Society${event.year ? `, ${event.year}` : ""}.`,
  };
}

/** "2024-03-14" → "14 March 2024". Undated events render nothing. */
function longDate(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const srcSet = (sources: { w: number; url: string }[]) =>
  sources.map((s) => `${s.url} ${s.w}w`).join(", ");

export default async function EventArticle({ params }: Params) {
  const { slug } = await params;
  const event = await loadEvent(slug);
  if (!event) notFound();

  const date = longDate(event.date);
  const facts: [string, string][] = [
    ...(event.series ? ([["Series", event.series]] as [string, string][]) : []),
    ...(event.edition ? ([["Edition", event.edition]] as [string, string][]) : []),
    ...(event.venue ? ([["Venue", event.venue]] as [string, string][]) : []),
    ...(event.platform ? ([["Platform", event.platform]] as [string, string][]) : []),
    ...(event.theme ? ([["Theme", event.theme]] as [string, string][]) : []),
    ...(event.presentedBy ? ([["Presented by", event.presentedBy]] as [string, string][]) : []),
    ...(event.eligibility ? ([["Open to", event.eligibility]] as [string, string][]) : []),
  ];

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
        <article>
          <header className="mx-auto max-w-content text-center">
            <p className="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-2 font-mono text-micro uppercase tabular text-text-tertiary">
              <Link
                href="/events"
                className="text-accent no-underline transition-colors hover:text-accent-deep"
              >
                Events
              </Link>
              <span>{event.categoryName}</span>
              {/* A date if one was recorded, the year if that is all there
                  is, and nothing at all rather than a guess. */}
              {date ? (
                <time dateTime={event.date}>{date}</time>
              ) : event.year ? (
                <span>{event.year}</span>
              ) : null}
            </p>

            <h1
              className="mt-6 font-display text-display-m text-text-primary"
              style={{ fontVariationSettings: "'wght' 700" }}
            >
              {event.title}
            </h1>
          </header>

          {/* The cover, full width of the content measure. Its own ratio,
              uncropped, on the mount — the same rule the roster follows. */}
          <picture
            className="event-card__frame mx-auto mt-12 max-w-content"
            style={{ aspectRatio: `${event.cover.width} / ${event.cover.height}` }}
          >
            <source type="image/avif" srcSet={srcSet(event.cover.avif)} sizes={COVER_SIZES} />
            <source type="image/webp" srcSet={srcSet(event.cover.webp)} sizes={COVER_SIZES} />
            <img
              src={event.cover.webp[event.cover.webp.length - 1]?.url}
              alt={event.cover.alt}
              width={event.cover.width}
              height={event.cover.height}
              sizes={COVER_SIZES}
              decoding="async"
              style={{
                backgroundImage: `url("${event.cover.lqip}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          </picture>

          {/* ── THE WRITE-UP RUNS THE FULL CONTENT COLUMN ─────────────
              `max-w-content` (1200px), not `max-w-prose` (72ch, ~625px).
              This is a DELIBERATE OVERRIDE of PROJECT_SPEC.md §5.2
              ("prose measure 62–72ch, hard cap 72ch") and of the §17.5
              failure list, which names line lengths beyond 72ch. See
              docs/adr/0004-event-write-up-runs-the-content-column.md for
              who decided it and on what grounds.

              The width is the one the rest of this page already uses —
              the cover frame, Segments, the facts grid — so the article
              is now flush with everything above and below it rather
              than being a narrow column threaded between wide ones. ── */}
          {event.html ? (
            <>
              <div
                className="prose rt-doc mx-auto mt-16 max-w-content"
                // Inert by construction: rendered at build time by
                // lib/markdown.ts or lib/richtext/render.ts, both of which
                // escape every character of input before adding a single
                // tag. No author-supplied HTML can reach this point.
                dangerouslySetInnerHTML={{ __html: event.html }}
              />
              {event.html.includes("rt-embed") ? <EmbedFacade /> : null}
            </>
          ) : (
            <p className="mx-auto mt-16 max-w-content text-body-l text-text-secondary">
              No write-up is on file for this one — the photographs below are the
              whole of the record.
            </p>
          )}

          {event.segments?.length ? (
            <section className="mx-auto mt-24 max-w-content border-t border-line-strong pt-12">
              <h2
                className="font-display text-heading-l text-text-primary"
                style={{ fontVariationSettings: "'wght' 700" }}
              >
                Segments
              </h2>
              <dl className="mt-8">
                {event.segments.map((s) => (
                  <div
                    key={s.name}
                    className="grid gap-2 border-b border-line-hairline py-6 md:grid-cols-[var(--container-anchor)_1fr] md:gap-8"
                  >
                    <dt className="font-mono text-micro uppercase tabular text-accent">
                      {s.name}
                    </dt>
                    <dd className="text-body-m text-text-secondary">
                      {s.description}
                      {s.eligibility ? (
                        <span className="mt-2 block font-mono text-micro uppercase text-text-tertiary">
                          Open to {s.eligibility}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {facts.length ? (
            <section className="mx-auto mt-24 max-w-content border-t border-line-strong pt-12">
              <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                {facts.map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-mono text-micro uppercase tabular text-text-tertiary">
                      {k}
                    </dt>
                    <dd className="mt-2 text-body-m text-text-primary">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {event.gallery.length ? (
            <EventGallery images={event.gallery} title={event.title} />
          ) : null}

          {/* Provenance, said plainly. "derived" means this text came from
              the club's own announcement rather than an account written
              afterwards, and a reader is entitled to know which. */}
          {event.copySource === "derived" && event.html ? (
            <p className="mx-auto mt-24 max-w-content border-t border-line-hairline pt-8 text-body-s text-text-tertiary">
              This description is adapted from the club&rsquo;s own announcement of the
              event rather than an account written afterwards.
            </p>
          ) : null}
        </article>

        <div className="mt-24 md:mt-40">
          <SheetFooter />
        </div>
      </main>
    </>
  );
}

const COVER_SIZES = "(min-width: 1280px) 1200px, 92vw";
