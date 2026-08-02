import { Masthead } from "@/components/landing/Masthead";
import { ZoneRail } from "@/components/landing/ZoneRail";
import { ZoneA_Opening } from "@/components/landing/ZoneA_Opening";
import { ZoneD_RecordStrip } from "@/components/landing/ZoneD_RecordStrip";
import {
  SectionHead,
  ZoneC_WhatWeBuild,
  ZoneD_Archive,
  ZoneE_PartnersPress,
  ZoneF_Apply,
  SheetFooter,
} from "@/components/landing/Sections";

/**
 * ══════════════════════════════════════════════════════════════════════
 * SHEET 01 — the landing page. §4.
 *
 * Composed as the first sheet of a technical drawing set: edge zoning, a
 * title block, hairline annotation, mono placards. Abstraction, never
 * skeuomorphism — no CAD border, no blueprint texture, no paper grain.
 * The reference should be legible to an engineer and invisible to everyone
 * else, who simply register precision.
 *
 * VERTICAL RHYTHM IS DELIBERATELY IRREGULAR: 224 / 160 / 96 / 224 / 128px
 * between zones, not a constant. A constant rhythm is what happens when
 * nobody chooses (§3.2, rubric check 3).
 *
 * Two client islands only: ZoneRail and ZoneD_RecordStrip. Everything else
 * on this page is a Server Component shipping zero JS.
 * ══════════════════════════════════════════════════════════════════════
 */

export default function Sheet01() {
  return (
    <>
      <a
        href="#zone-a"
        className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-50 focus:border focus:border-line-strong focus:bg-bg-raised focus:px-4 focus:py-2 focus:text-body-s focus:text-text-primary"
      >
        Skip to content
      </a>

      <Masthead />
      <ZoneRail />

      <main className="mx-auto max-w-shell px-6 md:px-16 lg:pl-24">
        {/* Zone A — 224px top offset. */}
        <div className="pt-24 md:pt-56">
          <ZoneA_Opening />
        </div>

        {/* Zone B — The Record. 160px. */}
        <section id="zone-b" aria-labelledby="zone-b-heading" className="scroll-mt-24 pt-24 md:pt-40">
          <h2 id="zone-b-heading" className="sr-only">
            The Record
          </h2>
          <SectionHead
            zone="B"
            title="The Record"
            right="2005 — 2026"
            note="Every entry below is a competition BRS entered or an event it hosted. Only one placement is externally verified; the rest read as participation until the alumni who competed confirm otherwise."
          />
          <ZoneD_RecordStrip />

          {/* Exact, computed-style figures. No plus suffixes, no rounding.
              These replace the prototype's "480+ / 35+ / 10 / 40+", two of
              which were false (§2.3). */}
          <dl className="mt-16 grid grid-cols-2 gap-8 border-t border-line-hairline pt-8 md:grid-cols-4">
            {[
              ["7", "Executive committees documented"],
              ["19", "Workshops"],
              ["11", "Seminars"],
              ["1,105", "Photographs in archive"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd>
                  <span
                    className="block text-display-m tabular text-text-primary"
                    style={{ fontVariationSettings: "'wght' 600" }}
                  >
                    {value}
                  </span>
                  <span className="mt-2 block font-mono text-micro uppercase text-text-tertiary">
                    {label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Zone C — 96px. Tighter on purpose. */}
        <div className="pt-24">
          <ZoneC_WhatWeBuild />
        </div>

        {/* Zone D — 224px. The page's widest breath. */}
        <div className="pt-24 md:pt-56">
          <ZoneD_Archive />
        </div>

        {/* Zone E — 128px. */}
        <div className="pt-24 md:pt-32">
          <ZoneE_PartnersPress />
        </div>

        {/* Zone F — 160px. */}
        <div className="pt-24 md:pt-40">
          <ZoneF_Apply />
        </div>

        <div className="pt-24 md:pt-40">
          <SheetFooter />
        </div>
      </main>
    </>
  );
}
