/**
 * ══════════════════════════════════════════════════════════════════════
 * TOKEN PROOF SHEET — Phase 0 artefact.
 *
 * ⚠ THIS IS NOT THE LANDING PAGE. ⚠
 *
 * Phase L has not started. Per implementation_plan.md §5.3, no landing-page
 * or other-page UI may be built until the design tokens are signed off, and
 * nothing else on the frontend track may be built until the Landing Gate is
 * passed.
 *
 * This sheet exists so the design lead can verify the palette, type scale,
 * spacing, and motion tokens as RENDERED PIXELS rather than as hex values in
 * a spec — before a single component depends on them. Getting a token wrong
 * here costs minutes; getting it wrong after Zone A is built costs a rebuild.
 *
 * DELETE THIS FILE at the start of Phase L and replace it with Sheet 01
 * (§4.2).
 *
 * Zero client JS: this is a Server Component and there is no 'use client'
 * anywhere in the tree.
 * ══════════════════════════════════════════════════════════════════════
 */

/* ── Verified contrast ratios against --brs-bg-base #0B0D0E (dark theme).
      Computed, not estimated. Rubric check 11 requires tool verification
      of every pairing before the Gate. ── */
const SURFACES = [
  { token: "bg-base", value: "#0B0D0E", note: "page surface — never pure #000" },
  { token: "bg-raised", value: "#131618", note: "the standard 'card' — surface + hairline, no shadow" },
  { token: "bg-inset", value: "#090B0C", note: "recessed wells" },
];

const TEXT = [
  { token: "text-primary", value: "#F4F3F1", ratio: "15.8:1", use: "body and display" },
  { token: "text-secondary", value: "#A8ADB0", ratio: "7.2:1", use: "secondary prose" },
  { token: "text-tertiary", value: "#6E7579", ratio: "3.6:1", use: "LARGE TEXT AND PLACARDS ONLY" },
];

const ACCENT = [
  { token: "accent", value: "#4FA8CE", ratio: "7.4:1", use: "links, active states. Never a glow." },
  { token: "accent-muted", value: "#2E6E8C", ratio: "—", use: "hover fills" },
  { token: "accent-deep", value: "#0E516E", ratio: "—", use: "large fills only, never text" },
];

const SIGNAL = [
  { token: "signal", value: "#C2394B", ratio: "4.9:1", use: "awards, live status, errors. ≤2 per viewport." },
  { token: "signal-deep", value: "#7B1223", ratio: "—", use: "measured brand oxblood" },
];

/* Class names are written out in full, never interpolated. Tailwind scans
   source statically, so `text-${token}` would generate nothing at all — a
   silent failure that would make this whole sheet lie about the system. */
const TYPE_SCALE = [
  { token: "display-hero", cls: "text-display-hero", sample: "BUET" },
  { token: "display-xl", cls: "text-display-xl", sample: "ROBOTICS" },
  { token: "display-l", cls: "text-display-l", sample: "Achievements" },
  { token: "display-m", cls: "text-display-m", sample: "The Record" },
  { token: "heading-l", cls: "text-heading-l", sample: "Basic Workshop v8.0" },
  { token: "heading-m", cls: "text-heading-m", sample: "Robo Carnival 2024" },
  { token: "heading-s", cls: "text-heading-s", sample: "Industrial Line Tracker" },
  {
    token: "body-l",
    cls: "text-body-l",
    sample: "Robots designed, built and campaigned at BUET since 2005.",
  },
  {
    token: "body-m",
    cls: "text-body-m",
    sample: "Six international programmes. Nineteen workshops.",
  },
  { token: "body-s", cls: "text-body-s", sample: "Registration closed 30 January 2024." },
];

const SPACING = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 40, 56];

function Placard({ children }: { children: React.ReactNode }) {
  return <p className="placard">{children}</p>;
}

function Section({
  zone,
  title,
  note,
  children,
}: {
  zone: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="hairline-t pt-16 pb-24">
      <header className="mb-12">
        <Placard>
          {zone} — {title}
        </Placard>
        {note ? (
          <p className="mt-4 text-body-s text-text-secondary prose-measure">{note}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function Swatch({
  token,
  value,
  ratio,
  use,
}: {
  token: string;
  value: string;
  ratio?: string;
  use?: string;
}) {
  return (
    <div className="border border-line-hairline">
      {/* Inline style is legitimate here: this sheet must render the RAW
          token value to prove it, which no utility class can do. */}
      <div className="h-20 w-full" style={{ backgroundColor: value }} />
      <div className="border-t border-line-hairline p-4">
        <p className="font-mono text-micro uppercase text-text-primary">{token}</p>
        <p className="mt-2 font-mono text-micro text-text-tertiary">{value}</p>
        {ratio && ratio !== "—" ? (
          <p className="mt-1 font-mono text-micro text-text-tertiary">contrast {ratio}</p>
        ) : null}
        {use ? <p className="mt-3 text-body-s text-text-secondary">{use}</p> : null}
      </div>
    </div>
  );
}

export default function TokenProofSheet() {
  return (
    <main className="mx-auto max-w-content px-6 py-24 md:px-16">
      <header className="pb-24">
        <Placard>Phase 0 artefact — not the landing page</Placard>
        <h1 className="mt-8 text-display-l optical-left">Design token proof sheet</h1>
        <p className="mt-8 text-body-l text-text-secondary prose-measure">
          Renders every token in <code className="font-mono text-body-s">globals.css</code> so the
          system can be verified as pixels before any component depends on it. Colour values are
          derived by pixel-frequency analysis of the BRS logo mark, not chosen: petrol{" "}
          <span className="font-mono text-body-s">#0E516E</span> at 33.2 per cent, bone at 30.9,
          oxblood <span className="font-mono text-body-s">#7B1223</span> at 17.9, graphite at 14.3.
        </p>
        <div className="mt-12 border border-line-strong p-6">
          <Placard>How to review</Placard>
          <ul className="mt-4 space-y-3 text-body-s text-text-secondary">
            <li>
              Light theme: set <code className="font-mono">data-theme=&quot;light&quot;</code> on{" "}
              <code className="font-mono">&lt;html&gt;</code> in devtools, or switch your OS
              preference.
            </li>
            <li>
              Reduced motion: enable it at OS level — the hairline draw below must resolve instantly
              rather than animate.
            </li>
            <li>
              Type will render in a system fallback until the Archivo and IBM Plex Mono files land.
              The <code className="font-mono">wdth</code> axis is required before the Landing Gate.
            </li>
          </ul>
        </div>
      </header>

      <Section
        zone="A"
        title="Surfaces"
        note="Never pure #000. Elevation is expressed by surface value plus a hairline — there is effectively no shadow in this system."
      >
        <div className="grid gap-6 sm:grid-cols-3">
          {SURFACES.map((s) => (
            <Swatch key={s.token} token={s.token} value={s.value} use={s.note} />
          ))}
        </div>
      </Section>

      <Section
        zone="B"
        title="Text"
        note="text-tertiary sits at 3.6:1 and is therefore restricted to large text and placards. Using it for body copy is an accessibility failure."
      >
        <div className="grid gap-6 sm:grid-cols-3">
          {TEXT.map((t) => (
            <Swatch key={t.token} {...t} />
          ))}
        </div>
      </Section>

      <Section
        zone="C"
        title="Accent — petrol"
        note="The workhorse. Never rendered as a glow: no box-shadow or drop-shadow in an accent hue, ever. That single rule is what separates this system from every neon robotics template."
      >
        <div className="grid gap-6 sm:grid-cols-3">
          {ACCENT.map((a) => (
            <Swatch key={a.token} {...a} />
          ))}
        </div>
      </Section>

      <Section
        zone="D"
        title="Signal — oxblood"
        note="The exception, not a second brand colour. Awards and podium placements, live status, destructive actions, form errors. Three instances on one screen means the page is wrong."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          {SIGNAL.map((s) => (
            <Swatch key={s.token} {...s} />
          ))}
        </div>
      </Section>

      <Section
        zone="E"
        title="Type scale"
        note="Fluid via clamp(). Line-height tightens as size increases and tracking follows an optical curve by size band — never one global value."
      >
        <div className="space-y-12">
          {TYPE_SCALE.map((t) => (
            <div key={t.token} className="hairline-b pb-8">
              <Placard>{t.token}</Placard>
              <p className={`mt-4 ${t.cls}`}>{t.sample}</p>
            </div>
          ))}
          <div>
            <Placard>label — mono, uppercase, 0.12em</Placard>
            <p className="placard mt-4">PL. 001 — ROBO CARNIVAL 2024 · BUET PREMISES</p>
          </div>
          <div>
            <Placard>micro — mono, uppercase, 0.14em</Placard>
            <p className="mt-4 font-mono text-micro uppercase text-text-tertiary">
              SHEET 01/10 · ZONE E · REV 2026.07
            </p>
          </div>
        </div>
      </Section>

      <Section
        zone="F"
        title="Tabular figures"
        note="Mandatory in every numeric context. Proportional numerals in a roster table destroy the precision claim instantly — compare the columns below."
      >
        <div className="grid gap-12 sm:grid-cols-2">
          <div>
            <Placard>tabular-nums (correct)</Placard>
            <table className="mt-4 w-full text-body-s">
              <tbody className="text-text-secondary">
                {[
                  ["ABU Robocon", "2005"],
                  ["NASA Lunabotics", "2013"],
                  ["URC Rover", "2016"],
                  ["Robo Carnival", "2024"],
                ].map(([k, v]) => (
                  <tr key={k} className="border-b border-line-faint">
                    <td className="py-3">{k}</td>
                    <td className="py-3 text-right font-mono">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <Placard>Verified figures only</Placard>
            <p className="mt-4 text-body-s text-text-secondary">
              Every number on the finished site comes from the computed{" "}
              <code className="font-mono">StatsDTO</code>. No figure is typed by hand and none
              carries a plus suffix — lint rule{" "}
              <code className="font-mono">brs/no-hardcoded-stats</code> enforces both.
            </p>
            <p className="mt-4 text-body-s text-text-tertiary">
              The discarded prototype claimed 480 active members. The current committee is roughly
              fifty.
            </p>
          </div>
        </div>
      </Section>

      <Section
        zone="G"
        title="Spacing — 4px base"
        note="Values outside this scale fail lint rule 3. Section rhythm on the landing page is deliberately irregular; the scale is what makes irregularity a decision rather than an accident."
      >
        <div className="space-y-3">
          {SPACING.map((s) => (
            <div key={s} className="flex items-center gap-6">
              <span className="w-16 font-mono text-micro text-text-tertiary">{s * 4}px</span>
              <div className="h-3 bg-accent-deep" style={{ width: `${s * 4}px` }} />
            </div>
          ))}
        </div>
      </Section>

      <Section
        zone="H"
        title="Hairlines and motion"
        note="The hairline is the primary structural device: prefer a 1px rule over a filled panel, a filled panel over a shadow. On high-DPI displays it renders at true 0.5px via a scaleY transform."
      >
        <div className="space-y-8">
          <div>
            <Placard>line-faint / line-hairline / line-strong</Placard>
            <div className="mt-4 space-y-4">
              <div className="h-px w-full bg-line-faint" />
              <div className="h-px w-full bg-line-hairline" />
              <div className="h-px w-full bg-line-strong" />
            </div>
          </div>
          <div>
            <Placard>hairline draw — scaleX 0→1, 400ms, ease-out</Placard>
            <p className="mt-4 text-body-s text-text-secondary prose-measure">
              The site&rsquo;s one flourish, and it is a single pixel. Motion is mechanical, not
              playful: no spring, no bounce, no overshoot. Mechanisms settle.
            </p>
            <div className="mt-6 h-px w-full origin-left bg-accent hairline-draw" data-drawn="true" />
          </div>
        </div>
      </Section>

      <footer className="hairline-t pt-16">
        <Placard>End of proof sheet</Placard>
        <p className="mt-4 text-body-s text-text-secondary prose-measure">
          Delete this file at the start of Phase L and replace it with Sheet 01. Phase L may not
          begin until these tokens are signed off, and no other page may be built until the Landing
          Gate is passed.
        </p>
      </footer>
    </main>
  );
}
