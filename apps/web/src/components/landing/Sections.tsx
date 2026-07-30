import Link from "next/link";
import { FEATURES, PRESS, CONTACT_SHEET } from "@/lib/plates.generated";
import { Plate } from "@/components/primitives/Plate";
import { Eyebrow } from "@/components/primitives/Placard";
import { IndexedAction } from "@/components/primitives/IndexedAction";

/**
 * Zones C-F of Sheet 01.
 *
 * All Server Components — zero client JS. The only two islands on this page
 * are ZoneRail and ZoneD_RecordStrip.
 */

export function SectionHead({
  zone,
  title,
  note,
  right,
}: {
  zone: string;
  title: string;
  note?: string;
  right?: string;
}) {
  return (
    <header className="mb-12 border-t border-line-strong pt-6">
      <div className="flex items-baseline justify-between gap-6">
        <Eyebrow>
          {zone} — {title}
        </Eyebrow>
        {right ? (
          <span className="font-mono text-micro uppercase tabular text-text-tertiary">
            {right}
          </span>
        ) : null}
      </div>
      {note ? <p className="prose-measure mt-6 text-body-m text-text-secondary">{note}</p> : null}
    </header>
  );
}

/* ── ZONE C — What we build ─────────────────────────────────────────────
   Three plates at 7/5/5 columns with the middle one dropped 48px. A uniform
   3-up grid of identical cards is what a generated page produces; uneven
   widths and a deliberate vertical offset are art direction (§3.2). */
export function ZoneC_WhatWeBuild() {
  const compete = FEATURES["compete-robocon05"];
  const build = FEATURES["build-mechatron13"];
  const teach = FEATURES["teach-bwv8"];

  return (
    <section id="zone-c" aria-labelledby="zone-c-heading" className="scroll-mt-24">
      <h2 id="zone-c-heading" className="sr-only">
        What we build
      </h2>
      <SectionHead zone="C" title="What we build" right="Compete · Build · Teach" />

      <div className="grid grid-cols-4 gap-8 md:grid-cols-12">
        <div className="col-span-4 md:col-span-7">
          <Plate
            asset={compete}
            sizes="(min-width: 768px) 55vw, 100vw"
            frameClassName="aspect-[3/2]"
          />
          <p className="prose-measure mt-6 text-body-m text-text-secondary">
            BRS has entered six international programmes. The certificate above is the society&rsquo;s
            only externally documented placement; the rest of the competition record awaits
            confirmation from the alumni who competed.
          </p>
        </div>

        {/* Dropped 48px. The uneven baseline is deliberate. */}
        <div className="col-span-4 md:col-span-5 md:pt-12">
          <Plate
            asset={build}
            sizes="(min-width: 768px) 38vw, 100vw"
            frameClassName="aspect-[3/2]"
          />
          <p className="prose-measure mt-6 text-body-m text-text-secondary">
            Machines are designed and fabricated on campus — excavation rovers, line followers,
            firefighting and soccer bots, autonomous arms.
          </p>

          <div className="mt-12">
            <Plate
              asset={teach}
              sizes="(min-width: 768px) 38vw, 100vw"
              frameClassName="aspect-[3/2]"
            />
            <p className="prose-measure mt-6 text-body-m text-text-secondary">
              Nineteen workshops have run since 2016, the Basic Workshop series reaching v8.0 — four
              days across two weeks, ending with a robot that completes a course.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── ZONE D — The Archive ───────────────────────────────────────────────
   Contact sheet. This zone carries the page's ONE deliberate margin
   overflow (§3.2): the grid breaks the right content margin into the outer
   gutter. Exactly once per page. */
export function ZoneD_Archive() {
  return (
    <section id="zone-d" aria-labelledby="zone-d-heading" className="scroll-mt-24">
      <h2 id="zone-d-heading" className="sr-only">
        The Archive
      </h2>
      <SectionHead
        zone="D"
        title="The Archive"
        right={`${CONTACT_SHEET.length} plates shown`}
        note="One thousand one hundred and five photographs, 2005 to 2024. These nineteen are the club's own selection."
      />

      {/* Separators are borders on each tile, not a gap over a coloured
          parent: 19 tiles do not fill a 7-column grid, and a background-based
          rule would leave a visible grey block in the trailing empty cells. */}
      <ul className="-mr-6 grid grid-cols-3 border-l border-t border-line-hairline sm:grid-cols-5 md:-mr-16 lg:grid-cols-7">
        {CONTACT_SHEET.map((asset) => (
          <li key={asset.id} className="border-b border-r border-line-hairline">
            <Plate
              asset={asset}
              showPlacard={false}
              sizes="(min-width: 1024px) 14vw, (min-width: 640px) 20vw, 33vw"
              frameClassName="aspect-square border-0"
            />
            <span className="sr-only">{asset.caption[0]}</span>
          </li>
        ))}
      </ul>

      <div className="mt-12 md:max-w-action">
        <IndexedAction index={3} label="Browse the archive" href="/gallery" />
      </div>
    </section>
  );
}

/* ── ZONE E — Partners & Press ──────────────────────────────────────────
   Partner logos are still outstanding (§16.5: vectors and permission), so
   the partner row lists names as set type rather than shipping a row of
   placeholder boxes. Press clips are real scans. */
export function ZoneE_PartnersPress() {
  return (
    <section id="zone-e" aria-labelledby="zone-e-heading" className="scroll-mt-24">
      <h2 id="zone-e-heading" className="sr-only">
        Partners and press
      </h2>
      <SectionHead zone="E" title="Partners & Press" />

      <div className="grid grid-cols-4 gap-12 md:grid-cols-12">
        <div className="col-span-4 md:col-span-5">
          <Eyebrow>Presented by</Eyebrow>
          <ul className="mt-6 space-y-4">
            {[
              ["Meghna Group of Industries", "Robo Carnival 2024"],
              ["Transcom Ltd", "Intra-BUET Robo Challenge 2024"],
            ].map(([name, event]) => (
              <li key={name} className="border-t border-line-hairline pt-4">
                <span className="block text-heading-s text-text-primary">{name}</span>
                <span className="mt-1 block font-mono text-micro uppercase text-text-tertiary">
                  {event}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="col-span-4 md:col-start-7 md:col-span-6">
          <Eyebrow>Press</Eyebrow>
          <ul className="mt-6 grid grid-cols-3 gap-6">
            {PRESS.map((clip) => (
              <li key={clip.id}>
                <Plate
                  asset={clip}
                  showPlacard={false}
                  sizes="(min-width: 768px) 16vw, 30vw"
                />
                <span className="mt-3 block font-mono text-micro uppercase tabular text-text-tertiary">
                  {clip.outlet} · {clip.year}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ── ZONE F — Apply ─────────────────────────────────────────────────────
   One sentence left, entry right. No gradient band, no full-width colour
   block, no "Get Started". */
export function ZoneF_Apply() {
  return (
    <section id="zone-f" aria-labelledby="zone-f-heading" className="scroll-mt-24">
      <h2 id="zone-f-heading" className="sr-only">
        Apply
      </h2>
      <SectionHead zone="F" title="Apply" right="Recruitment runs annually" />

      <div className="grid grid-cols-4 gap-8 md:grid-cols-12">
        <div className="col-span-4 md:col-span-6">
          <p className="prose-measure text-body-l text-text-secondary">
            Nine recruitment drives have run since 2016. New members usually begin at the Basic
            Workshop and build a line-following robot before their first competition.
          </p>
        </div>
        <div className="col-span-4 md:col-start-8 md:col-span-5">
          <IndexedAction index={4} label="Apply for membership" href="/explore/join" />
          <IndexedAction index={5} label="Contact the society" href="/contact" />
        </div>
      </div>
    </section>
  );
}

/* ── Footer: the title block, expanded ──────────────────────────────── */
export function SheetFooter() {
  const SHEETS = [
    ["01", "Home", "/"],
    ["02", "Events", "/events"],
    ["03", "Workshops", "/events/workshops"],
    ["04", "Competitions", "/events/competitions"],
    ["05", "Robo Carnival", "/events/robo-carnival"],
    ["06", "Executive Committee", "/executive-committee"],
    ["07", "Achievements", "/achievements"],
    ["08", "Member Directory", "/explore/members"],
    ["09", "Blog", "/explore/blog"],
    ["10", "Contact", "/contact"],
  ] as const;

  return (
    <footer className="border-t border-line-strong pt-16">
      <div className="grid grid-cols-4 gap-12 md:grid-cols-12">
        <div className="col-span-4 md:col-span-5">
          <Eyebrow>Sheet index</Eyebrow>
          <ol className="mt-6 columns-2 gap-8">
            {SHEETS.map(([n, label, href]) => (
              <li key={n} className="mb-3 break-inside-avoid">
                <Link
                  href={href}
                  className="flex items-baseline gap-3 no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
                >
                  <span className="font-mono text-micro tabular text-text-tertiary">{n}</span>
                  <span className="text-body-s text-text-secondary transition-colors duration-micro ease-out hover:text-text-primary">
                    {label}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>

        <div className="col-span-4 md:col-start-7 md:col-span-3">
          <Eyebrow>Moderator</Eyebrow>
          <p className="mt-6 text-body-s text-text-secondary">
            Prof. Dr. Shaikh Anowarul Fattah
            <br />
            Professor, Department of EEE
            <br />
            BUET
          </p>
        </div>

        <div className="col-span-4 md:col-start-10 md:col-span-3">
          <Eyebrow>Contact</Eyebrow>
          <p className="mt-6 text-body-s text-text-secondary">
            <a
              href="mailto:buet.robotics.society@gmail.com"
              className="text-text-secondary underline decoration-line-hairline underline-offset-4 transition-colors duration-micro ease-out hover:text-accent"
            >
              buet.robotics.society@gmail.com
            </a>
            <br />
            <a
              href="https://www.facebook.com/BUETRoboticsSociety"
              className="text-text-secondary underline decoration-line-hairline underline-offset-4 transition-colors duration-micro ease-out hover:text-accent"
              rel="noreferrer"
            >
              facebook.com/BUETRoboticsSociety
            </a>
          </p>
        </div>
      </div>

      <div className="mt-16 flex flex-wrap items-baseline justify-between gap-4 border-t border-line-hairline py-8">
        <span className="font-mono text-micro uppercase tabular text-text-tertiary">
          BUET Robotics Society · Dhaka
        </span>
        <span className="font-mono text-micro uppercase tabular text-text-tertiary">
          Sheet 01 of 10 · Rev 2026.07
        </span>
      </div>
    </footer>
  );
}
