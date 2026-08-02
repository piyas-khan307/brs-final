#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════
 * SHOWCASE PREPARATION — the motion sheet.
 *
 * scripts/prepare-plates.mjs produced small derivatives sized for the
 * static landing page: the contact sheet tops out at 320px because it was
 * rendered in a 19-up grid where no tile exceeds 14vw.
 *
 * The motion sheet uses the same photographs at completely different
 * sizes. A plate that travels across the full viewport in the pinned
 * gallery is displayed near 1400px wide. Serving the 320px derivative
 * into that slot would be a visible quality failure on the one page whose
 * entire job is to look expensive — so this script emits a second,
 * larger set rather than inflating the first.
 *
 * WHY A SEPARATE SCRIPT: prepare-plates.mjs is the Phase L artefact and
 * its manifest is consumed by the static landing page, which still has to
 * build. Nothing here touches it.
 *
 * SOURCE RESOLUTION IS AMPLE. Measured before choosing targets:
 *   rc_24_1, rc_24_2, intra_24_2 .......... 6000 x 4000
 *   bw_v5 ................................. 4624 x 3468
 *   intra_24_1, ri_24 ..................... 4032 x 3024
 *   rc_23_2 ............................... 3280 x 2464
 *   most others ........................... 2048 x 1365
 * Nothing below is upscaled; the guard from prepare-plates.mjs is kept.
 *
 * ALT TEXT IS CARRIED OVER FROM prepare-plates.mjs, where it was written
 * from looking at each photograph. Same frame, same description.
 * ══════════════════════════════════════════════════════════════════════
 */

import sharp from "sharp";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "apps", "web", "public", "showcase");
const MANIFEST = join(ROOT, "apps", "web", "src", "lib", "showcase.generated.ts");

const RATIOS = { "1:1": 1, "3:2": 3 / 2, "4:3": 4 / 3, "4:5": 4 / 5, "3:4": 3 / 4 };

/** Identical grade to prepare-plates.mjs. The two sets appear on the same
 *  page; a different curve would be visible as a colour seam. */
const grade = (p) => p.modulate({ saturation: 0.92 }).linear(1.04, -5);

const BEST = "BRS/best 20";
const BOB = "BRS/best 20/Best of the bests";

/* ── SET 1 — KEY FACTS ────────────────────────────────────────────────
   Three plates that un-skew into alignment. Portrait, because the effect
   reads best on a tall object: a wide card at 40 degrees off-axis mostly
   shows you its own edge. */
const KEYFACTS = [
  {
    id: "kf-compete",
    src: `${BOB}/rc_24_1.JPG`,
    ratio: "4:5",
    widths: [480, 720],
    alt: "Organisers and faculty holding the Robo Carnival 2024 pennant beneath a cluster of balloons",
  },
  {
    id: "kf-teach",
    src: `${BOB}/bw_v8.jpg`,
    ratio: "4:5",
    widths: [480, 720],
    alt: "Participants standing behind a full-floor line-follower track at Basic Workshop v8.0",
  },
];

/* ── SET 2 — THE PINNED GALLERY ───────────────────────────────────────
   Five plates travelling right to left. Widest derivatives on the page. */
const GALLERY = [
  {
    id: "gal-rc24",
    src: `${BOB}/rc_24_1.JPG`,
    ratio: "3:2",
    widths: [720, 1080, 1440],
    alt: "Organisers and faculty holding the Robo Carnival 2024 pennant beneath a cluster of balloons",
    title: "Robo Carnival",
    year: "2024",
    note: "The society's flagship public event. Five segments, open to teams from across the country.",
  },
  {
    id: "gal-intra24",
    src: `${BOB}/intra_24_2.JPG`,
    ratio: "3:2",
    widths: [720, 1080, 1440],
    alt: "Participants and faculty gathered on the ECE building steps at the Intra-BUET Robo Challenge 2024",
    title: "Intra-BUET Robo Challenge",
    year: "2024",
    note: "The internal competition. Teams form inside BUET and build to a fixed brief.",
  },
  {
    id: "gal-rc19",
    src: `${BOB}/rc_19_1.jpg`,
    ratio: "3:2",
    widths: [720, 1080, 1440],
    alt: "A row of student-built robots on a bench at Robo Carnival 2019, their Arduino boards, ultrasonic sensors and jumper wiring exposed",
    title: "Robo Carnival",
    year: "2019",
    note: "Boards, sensors and wiring left exposed. Nothing on this bench arrived in a case.",
  },
  {
    id: "gal-bwv8",
    src: `${BOB}/bw_v8.jpg`,
    ratio: "3:2",
    widths: [720, 1080, 1440],
    alt: "Participants standing behind a full-floor line-follower track at Basic Workshop v8.0",
    title: "Basic Workshop v8.0",
    year: "2024",
    note: "Four days across two weeks, ending with a robot that completes the course.",
  },
  {
    id: "gal-rc17",
    src: `${BOB}/rc_17_3.jpg`,
    ratio: "3:2",
    widths: [720, 1080, 1440],
    alt: "A robot lifting stacked blocks during a Robo Carnival 2017 segment",
    title: "Robo Carnival",
    year: "2017",
    note: "Manipulator segment. Blocks stacked against the clock.",
  },
];

/* ── SET 3 — THE ASSEMBLY GRID ────────────────────────────────────────
   Nine plates arriving from nine directions and settling into 3x3. */
const ASSEMBLY = [
  ["as-rc16a", `${BOB}/rc_16_1.jpg`, "Participants and organisers on stage beneath the Robo Carnival 2016 banner", "ROBO CARNIVAL 2016"],
  ["as-rc16b", `${BEST}/rc_16_2.jpg`, "Competitor robots arranged on the arena table at Robo Carnival 2016", "ROBO CARNIVAL 2016"],
  ["as-rc17a", `${BEST}/rc_17_1.jpg`, "Winners holding certificates on the arena floor at Robo Carnival 2017", "ROBO CARNIVAL 2017"],
  ["as-rc17b", `${BOB}/rc_17_2.jpg`, "A line-follower robot tracking an angular black course at Robo Carnival 2017", "ROBO CARNIVAL 2017"],
  ["as-rc23a", `${BEST}/rc_23_1.jpg`, "Teams lined up beside the arena track at Robo Carnival 2023", "ROBO CARNIVAL 2023"],
  ["as-rc23b", `${BEST}/rc_23_2.jpg`, "Two robots on the hall floor before spectators at Robo Carnival 2023", "ROBO CARNIVAL 2023"],
  ["as-intra24", `${BEST}/intra_24_1.JPG`, "Line-follower robots lined up along the track at the Intra-BUET Robo Challenge 2024", "INTRA-BUET 2024"],
  ["as-agm24", `${BEST}/agm_24.jpg`, "Members seated in a BUET lecture room during the 2024 Annual General Meeting", "AGM 2024"],
  ["as-ri24", `${BEST}/ri_24.JPG`, "Attendees seated in a lecture room at the Robotic Inception 2024 orientation", "ROBOTIC INCEPTION 2024"],
].map(([id, src, alt, caption]) => ({
  id,
  src,
  ratio: "4:3",
  widths: [400, 640],
  position: "attention",
  alt,
  caption,
}));

mkdirSync(OUT_DIR, { recursive: true });

async function lqip(input) {
  const buf = await grade(sharp(input).resize(16)).webp({ quality: 30 }).toBuffer();
  return `data:image/webp;base64,${buf.toString("base64")}`;
}

let over = 0;

async function emit(def, budgetKB) {
  const abs = join(ROOT, def.src);
  if (!existsSync(abs)) {
    console.error(`  MISSING SOURCE: ${def.src}`);
    return null;
  }

  const meta = await sharp(abs).metadata();
  const targetRatio = RATIOS[def.ratio];

  // Never upscale beyond native resolution (§5.6).
  const widths = def.widths.filter((w) => w <= meta.width).sort((a, b) => a - b);
  if (widths.length === 0) widths.push(Math.min(def.widths[0], meta.width));

  const sources = { avif: [], webp: [] };
  let largestBytes = 0;

  for (const w of widths) {
    const h = Math.round(w / targetRatio);
    for (const fmt of ["avif", "webp"]) {
      const pipeline = grade(
        sharp(abs).resize(w, h, {
          fit: "cover",
          position: def.position === "attention" ? sharp.strategy.attention : "centre",
        }),
      );
      const out = fmt === "avif" ? pipeline.avif({ quality: 76 }) : pipeline.webp({ quality: 80 });
      const file = `${def.id}-${w}.${fmt}`;
      const info = await out.toFile(join(OUT_DIR, file));
      sources[fmt].push({ w, url: `/showcase/${file}` });
      if (fmt === "avif") largestBytes = Math.max(largestBytes, info.size);
    }
  }

  const biggest = widths[widths.length - 1];
  const flagged = largestBytes > budgetKB * 1024;
  if (flagged) over += 1;
  console.log(
    `  ${def.id.padEnd(14)} ${String(biggest).padStart(4)}px  ` +
      `${String(Math.round(largestBytes / 1024)).padStart(4)} KB avif` +
      `${flagged ? `  OVER ${budgetKB} KB` : ""}`,
  );

  return {
    id: def.id,
    alt: def.alt,
    width: biggest,
    height: Math.round(biggest / targetRatio),
    ratio: def.ratio,
    lqip: await lqip(abs),
    avif: sources.avif,
    webp: sources.webp,
    ...(def.title ? { title: def.title, year: def.year, note: def.note } : {}),
    ...(def.caption ? { caption: def.caption } : {}),
  };
}

console.log("\nKEY FACTS");
const keyfacts = (await Promise.all(KEYFACTS.map((d) => emit(d, 120)))).filter(Boolean);

console.log("\nGALLERY");
const gallery = (await Promise.all(GALLERY.map((d) => emit(d, 260)))).filter(Boolean);

console.log("\nASSEMBLY");
const assembly = (await Promise.all(ASSEMBLY.map((d) => emit(d, 90)))).filter(Boolean);

const header = `/**
 * GENERATED by scripts/prepare-showcase.mjs — do not edit by hand.
 *
 * Larger derivatives of the same BRS archive photographs used by
 * plates.generated.ts, sized for the motion sheet where plates are
 * displayed up to 1440px wide.
 *
 * Alt text was written from looking at each image, never from its
 * filename, and is carried over unchanged from prepare-plates.mjs.
 */

export type ShowcaseSource = { w: number; url: string };
export type ShowcaseAsset = {
  id: string;
  alt: string;
  width: number;
  height: number;
  ratio: string;
  lqip: string;
  avif: ShowcaseSource[];
  webp: ShowcaseSource[];
  title?: string;
  year?: string;
  note?: string;
  caption?: string;
};
`;

writeFileSync(
  MANIFEST,
  header +
    `\nexport const KEYFACTS: ShowcaseAsset[] = ${JSON.stringify(keyfacts, null, 2)};\n` +
    `\nexport const GALLERY: ShowcaseAsset[] = ${JSON.stringify(gallery, null, 2)};\n` +
    `\nexport const ASSEMBLY: ShowcaseAsset[] = ${JSON.stringify(assembly, null, 2)};\n`,
);

const total = keyfacts.length + gallery.length + assembly.length;
console.log(`\n  ${total} showcase plates written to public/showcase/`);
console.log(`  manifest: src/lib/showcase.generated.ts`);
if (over > 0) {
  console.error(`\n  ${over} plate(s) over budget. Lower quality or width before shipping.\n`);
  process.exit(1);
}
console.log("  All within budget.\n");
