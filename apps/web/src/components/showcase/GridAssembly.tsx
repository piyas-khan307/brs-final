"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ASSEMBLY } from "@/lib/showcase.generated";
import { ShowcaseImage } from "./ShowcaseImage";

/**
 * SECTION 3 — THE ASSEMBLY.  (Reference: client screenshots 7–9.)
 *
 * Nine plates arrive from nine different directions — the four edges, the
 * four corners, and one long entry from far right — and settle into a 3×3
 * grid, row by row, as you scroll.
 *
 * WHY NINE DISTINCT VECTORS AND NOT ONE STAGGERED ONE. The cheap version
 * of this effect gives every card the same entry and offsets it in time;
 * it reads as a slot machine. The reference frames show cards converging
 * from genuinely different places at genuinely different angles, which is
 * what makes the grid feel *assembled* rather than dealt. Each vector
 * below is hand-set, which is exactly why lint rule 3 is relaxed for this
 * directory: these are choreography, not design tokens, and hoisting
 * forty one-off values into globals.css to satisfy a rule would corrupt
 * the token file rather than protect it.
 *
 * ROW ORDER IS DELIBERATE. The stagger is indexed so the top row resolves
 * first and the bottom row last. Scrolling therefore reads top-to-bottom
 * like the page itself, instead of the grid filling in at random.
 *
 * THE PLATES ARE NEVER ACTUALLY OFF THE PAGE. They start translated, not
 * absolutely positioned elsewhere, so the grid's final geometry exists in
 * the DOM from the first frame. Nothing reflows when the timeline runs,
 * and with JS disabled or motion reduced you get the finished 3×3 grid.
 */

/** Entry vectors, one per plate. Units are viewport-relative so the
 *  travel distance scales with the screen instead of being tuned for a
 *  laptop and looking timid on a monitor. */
const VECTORS = [
  { x: "-72vw", y: "-58vh", rotate: -18, rotateY: 26 }, // top-left
  { x: "0vw", y: "-88vh", rotate: 9, rotateY: 0 }, // top
  { x: "72vw", y: "-58vh", rotate: 18, rotateY: -26 }, // top-right
  { x: "-98vw", y: "6vh", rotate: -12, rotateY: 34 }, // left
  { x: "0vw", y: "92vh", rotate: 0, rotateY: 0 }, // bottom
  { x: "98vw", y: "-6vh", rotate: 12, rotateY: -34 }, // right
  { x: "-78vw", y: "66vh", rotate: -24, rotateY: 22 }, // bottom-left
  { x: "78vw", y: "66vh", rotate: 24, rotateY: -22 }, // bottom-right
  { x: "116vw", y: "28vh", rotate: 30, rotateY: -30 }, // far right, low
];

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL ?? "http://localhost:8055";

type AssemblyAsset = (typeof ASSEMBLY)[number];

export function GridAssembly() {
  const root = useRef<HTMLDivElement>(null);
  const [featuredAssets, setFeaturedAssets] = useState<AssemblyAsset[] | null>(null);

  useEffect(() => {
    fetch(`${DIRECTUS_URL}/items/assets?filter[is_featured][_eq]=true&limit=9`)
      .then((r) => r.json())
      .then((d: { data?: Array<{ id: string; alt: string; storage_key: string; width: number; height: number }> }) => {
        if (Array.isArray(d.data) && d.data.length > 0) {
          const mapped = d.data.map((a) => ({
            id: a.id,
            caption: a.alt,
            storage_key: a.storage_key,
            width: a.width,
            height: a.height,
          }));
          setFeaturedAssets(mapped as unknown as AssemblyAsset[]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      const el = root.current;
      if (!el) return;

      const cells = gsap.utils.toArray<HTMLElement>("[data-cell]", el);

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: "+=140%",
          pin: true,
          scrub: 0.9,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      cells.forEach((cell, i) => {
        const v = VECTORS[i % VECTORS.length];
        if (!v) return;
        tl.fromTo(
          cell,
          { x: v.x, y: v.y, rotate: v.rotate, rotateY: v.rotateY, scale: 0.62, opacity: 0 },
          {
            x: 0,
            y: 0,
            rotate: 0,
            rotateY: 0,
            scale: 1,
            opacity: 1,
            ease: "power2.out",
            duration: 1,
          },
          Math.floor(i / 3) * 0.22 + (i % 3) * 0.07,
        );
      });

      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
      };
    });

    return () => mm.revert();
  }, [featuredAssets]);

  const displayList = featuredAssets && featuredAssets.length > 0 ? featuredAssets : ASSEMBLY;

  return (
    <section
      ref={root}
      aria-labelledby="as-heading"
      className="relative flex min-h-screen flex-col justify-between overflow-hidden border-t border-line-hairline px-6 py-16 md:px-16 md:py-20"
    >
      <header className="flex items-start justify-between gap-8">
        <div>
          <span className="font-mono text-micro uppercase text-text-tertiary">
            03 — The archive
          </span>
          <h2
            id="as-heading"
            className="optical-left mt-4 text-display-m text-text-primary"
            style={{ fontVariationSettings: "'wght' 560" }}
          >
            One thousand one hundred and five photographs
          </h2>
        </div>
        <span className="hidden shrink-0 font-mono text-micro uppercase tabular text-text-tertiary md:block">
          2005 — 2024
        </span>
      </header>

      {/* The field. Cards are laid out in their final positions and
          translated in from the vectors above. */}
      <div className="field flex flex-1 items-center justify-center py-10">
        <ul className="grid grid-cols-2 justify-center gap-3 sm:grid-cols-[repeat(3,auto)] md:gap-4">
          {displayList.map((asset) => (
            <li
              key={asset.id}
              data-cell
              className="travelling group relative aspect-[4/3] w-full md:h-[19vh] md:w-auto"
            >
              <div className="plate-surface h-full w-full">
                <ShowcaseImage asset={asset} sizes="(min-width: 768px) 26vh, 45vw" />
              </div>
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-[rgb(30_27_25/0.72)] px-3 py-2 font-mono text-micro uppercase text-bg-base opacity-0 transition-opacity duration-base ease-out group-hover:opacity-100">
                {asset.caption}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <footer className="flex flex-wrap items-end justify-between gap-6">
        <p className="max-w-sm text-body-s text-text-secondary">
          Competition arenas, workshop floors, committee rooms and build
          benches, catalogued by event and year.
        </p>
        <a
          href="/gallery"
          className="group flex items-center gap-3 border-b border-line-strong pb-2 font-mono text-micro uppercase text-text-primary no-underline transition-colors duration-base ease-out hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
        >
          Browse the archive
          <span aria-hidden="true">→</span>
        </a>
      </footer>
    </section>
  );
}
