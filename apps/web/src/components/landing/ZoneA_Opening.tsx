import { FEATURES } from "@/lib/plates.generated";
import { Plate } from "@/components/primitives/Plate";
import { Eyebrow } from "@/components/primitives/Placard";
import { IndexedAction } from "@/components/primitives/IndexedAction";

/**
 * ZONE A — the opening. §4.4.
 *
 * The replacement for the discarded prototype's hero, and the section the
 * Landing Gate turns on. Four deliberate inversions:
 *
 * 1. NO badge → headline → paragraph → two-buttons stack. That sequence is
 *    the canonical AI landing-page skeleton (§2.1) and no restyling rescues
 *    it, so the structure itself is discarded.
 *
 * 2. THE INSTITUTION'S NAME IS THE HEADLINE. The prototype spent its largest
 *    typographic asset on "Shaping the Future of Autonomous Robotics" — a
 *    slogan transplantable to any robotics club on earth. A twenty-year-old
 *    institution's own name, set with authority, cannot be transplanted.
 *
 * 3. ASYMMETRIC GRID. Content occupies columns 2-8 of 12; the plate occupies
 *    9-12 and hangs 64px lower. Nothing is centred. Symmetry here would be
 *    the absence of a decision, not a decision (§3.1 test 3).
 *
 * 4. THE PHOTOGRAPH IS EVIDENCE, NOT WALLPAPER. The prototype faded an
 *    archive photo to ~8% behind text. Here it sits at full contrast in a
 *    sharp 4:5 frame with a museum placard. Same asset, opposite thesis.
 */

export function ZoneA_Opening() {
  const hero = FEATURES["hero-rc19"];

  return (
    <section id="zone-a" aria-labelledby="zone-a-heading" className="scroll-mt-24">
      <div className="grid grid-cols-4 gap-6 md:grid-cols-12 md:gap-8">
        {/* ── Content: columns 2-8 ── */}
        <div className="col-span-4 md:col-start-2 md:col-span-7">
          <Eyebrow>Bangladesh University of Engineering &amp; Technology · Dhaka</Eyebrow>

          <h1
            id="zone-a-heading"
            className="optical-left mt-8 text-display-hero text-text-primary"
            // font-variation-settings cannot be expressed as a utility, and
            // arbitrary Tailwind values are banned by lint rule 3. The wdth
            // axis at 112 is the page's clearest craft marker (§3.2).
            style={{ fontVariationSettings: "'wght' 600, 'wdth' 112" }}
          >
            <span className="block">BUET</span>
            <span className="block">Robotics</span>
            <span className="block">Society</span>
          </h1>

          {/* The hairline draw — the site's one flourish, and it is 1px.
              data-drawn is set statically so it resolves without JS. */}
          <div
            aria-hidden="true"
            className="hairline-draw mt-10 h-px w-full bg-line-strong"
            data-drawn="true"
          />

          <p className="prose-measure mt-10 text-body-l text-text-secondary">
            Robots designed, built and campaigned at Bangladesh University of Engineering &amp;
            Technology since ABU Robocon 2005. Six international programmes. Nineteen workshops.
            One Panasonic Award.
          </p>

          <div className="mt-16">
            <IndexedAction index={1} label="The Record" href="/achievements" note="2005 — 2026" />
            <IndexedAction index={2} label="Apply for membership" href="/explore/join" />
          </div>
        </div>

        {/* ── Plate: columns 9-12, hanging lower. The asymmetry is the point. ── */}
        <div className="col-span-4 md:col-start-9 md:col-span-4 md:pt-16">
          <Plate
            asset={hero}
            priority
            sizes="(min-width: 1024px) 30vw, (min-width: 768px) 40vw, 100vw"
            frameClassName="aspect-[4/5]"
          />
        </div>
      </div>
    </section>
  );
}
