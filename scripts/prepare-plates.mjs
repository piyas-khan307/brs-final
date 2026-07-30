#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════
 * PLATE PREPARATION — Phase L.
 *
 * Generates optimised derivatives of archive photographs for the landing
 * page, plus a typed manifest.
 *
 * WHY LOCAL FILES AND NOT THE FAÇADE: /v1/assets is a Phase B1 route and
 * does not exist yet. Rubric check 19 requires every photograph to be a real
 * archive image with zero stock, so Phase L ships pre-generated local
 * derivatives. The <Plate> component's props are shaped like ImageDTO, so
 * Phase B1 swaps the source without touching a component.
 *
 * ALT TEXT IS WRITTEN FROM LOOKING AT EACH PHOTOGRAPH, not from filenames.
 * A filename tells you an event, not what is in the frame; inventing a
 * description would be fabrication, and the contract rejects filename-shaped
 * alt text precisely to stop it (packages/contract AltText).
 *
 * Source images are 2 GB of unoptimised JPEGs (one is 8.3 MB). Budgets:
 * hero <= 250 KB, plate <= 90 KB (§9.2).
 * ══════════════════════════════════════════════════════════════════════
 */

import sharp from "sharp";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "apps", "web", "public", "plates");
const MANIFEST = join(ROOT, "apps", "web", "src", "lib", "plates.generated.ts");

const RATIOS = { "1:1": 1, "3:2": 3 / 2, "16:9": 16 / 9, "4:5": 4 / 5 };

/** Unified grade (§5.6): the archive spans 2005-2024 across dozens of
 *  cameras. Consistency is manufactured in post, not hoped for. No filters,
 *  no tinting — "realistic" is an explicit requirement. */
const grade = (p) => p.modulate({ saturation: 0.92 }).linear(1.04, -5);

const PLATES = [
  {
    id: "hero-rc19",
    src: "BRS/best 20/Best of the bests/rc_19_1.jpg",
    ratio: "4:5",
    position: "left",
    widths: [480, 720, 960],
    alt: "A row of student-built robots on a bench at Robo Carnival 2019, their Arduino boards, ultrasonic sensors and jumper wiring exposed",
    plate: 1,
    caption: ["ROBO CARNIVAL 2019 · BUET PREMISES", "JANUARY 2019 · 5 SEGMENTS"],
  },
  {
    id: "compete-robocon05",
    src: "BRS/Robocon/Team BUET, Robocon Panasonic Award 2005.jpg",
    ratio: "3:2",
    position: "centre",
    widths: [480, 720],
    alt: "Four Team BUET members on stage in Beijing holding the Panasonic Award certificate and trophy beside a Bangladesh banner",
    plate: 2,
    caption: ["ABU ASIA-PACIFIC ROBOT CONTEST 2005 · BEIJING", "PANASONIC AWARD"],
  },
  {
    id: "build-mechatron13",
    src: "BRS/NASA Lunabotics/MechaTron, Team BUET Lunabotics, 2013.jpg",
    ratio: "3:2",
    position: "centre",
    widths: [480],
    alt: "MechaTron, the BUET Lunabotics excavation rover, standing on grass with its chain-driven bucket ladder and conveyor visible",
    plate: 3,
    caption: ["NASA LUNABOTICS 2013 · TEAM BUET LUNABOTICS", "SPECIMEN MECHATRON"],
  },
  {
    id: "teach-bwv8",
    src: "BRS/best 20/Best of the bests/bw_v8.jpg",
    ratio: "3:2",
    position: "centre",
    widths: [480, 720],
    alt: "Participants standing behind a full-floor line-follower track, their robots positioned on the black course, at Basic Workshop v8.0",
    plate: 4,
    caption: ["BASIC WORKSHOP v8.0 · BUET", "FOUR DAYS ACROSS TWO WEEKS"],
  },
];

/** Press scans. Kept at natural ratio — cropping a newspaper page is
 *  destructive to the evidence. */
const PRESS = [
  {
    id: "press-iarc14",
    src: "BRS/iARC 2014/prothom alo.jpg",
    widths: [240, 360],
    alt: "Prothom Alo newspaper coverage of BUET Exponential at the 2014 international robotics competition",
    outlet: "PROTHOM ALO",
    year: 2014,
  },
  {
    id: "press-iarc15",
    src: "BRS/iARC 2015/Prothom Alo News.png",
    widths: [240, 360],
    alt: "Prothom Alo newspaper coverage of BUET teams at Techkriti 2015, IIT Kanpur",
    outlet: "PROTHOM ALO",
    year: 2015,
  },
  {
    id: "press-irc15",
    src: "BRS/IRC 2015/IRC_ProthomAlo.png",
    widths: [240, 360],
    alt: "Prothom Alo newspaper coverage of BUET Resonance at the 2015 international robotics contest",
    outlet: "PROTHOM ALO",
    year: 2015,
  },
];

/** Contact sheet. Alt text written from a montage of all nineteen. */
const CONTACT = [
  ["agm_24.jpg", "Members seated in a BUET lecture room during the 2024 Annual General Meeting", "AGM 2024"],
  ["bw_v1.jpg", "Participants at laptops filling a lecture room during Basic Workshop v1.0", "BASIC WORKSHOP v1.0"],
  ["bw_v5.jpg", "Instructors receiving a framed certificate at the front of a classroom, a line-follower robot on the desk", "BASIC WORKSHOP v5.0"],
  ["bw_v6.jpg", "Participants seated before a projector screen during Basic Workshop v6.0", "BASIC WORKSHOP v6.0"],
  ["bw_v8.jpg", "Participants standing behind a full-floor line-follower track at Basic Workshop v8.0", "BASIC WORKSHOP v8.0"],
  ["intra_24_1.JPG", "Line-follower robots lined up along the track at the Intra-BUET Robo Challenge 2024", "INTRA-BUET 2024"],
  ["intra_24_2.JPG", "Participants and faculty gathered on the ECE building steps at the Intra-BUET Robo Challenge 2024", "INTRA-BUET 2024"],
  ["rc_16_1.jpg", "Participants and organisers on stage beneath the Robo Carnival 2016 banner", "ROBO CARNIVAL 2016"],
  ["rc_16_2.jpg", "Competitor robots arranged on the arena table at Robo Carnival 2016", "ROBO CARNIVAL 2016"],
  ["rc_17_1.jpg", "Winners holding certificates on the arena floor at Robo Carnival 2017", "ROBO CARNIVAL 2017"],
  ["rc_17_2.jpg", "A line-follower robot tracking an angular black course at Robo Carnival 2017", "ROBO CARNIVAL 2017"],
  ["rc_17_3.jpg", "A robot lifting stacked blocks during a Robo Carnival 2017 segment", "ROBO CARNIVAL 2017"],
  ["rc_17_4.jpg", "Spectators seated around the white arena mat at Robo Carnival 2017", "ROBO CARNIVAL 2017"],
  ["rc_19_1.jpg", "A row of student-built robots on a bench at Robo Carnival 2019", "ROBO CARNIVAL 2019"],
  ["rc_23_1.jpg", "Teams lined up beside the arena track at Robo Carnival 2023", "ROBO CARNIVAL 2023"],
  ["rc_23_2.jpg", "Two robots on the hall floor before spectators at Robo Carnival 2023", "ROBO CARNIVAL 2023"],
  ["rc_24_1.JPG", "Organisers and faculty holding the Robo Carnival 2024 pennant beneath a cluster of balloons", "ROBO CARNIVAL 2024"],
  ["rc_24_2.JPG", "Competitor robots lined up on the ground at Robo Carnival 2024", "ROBO CARNIVAL 2024"],
  ["ri_24.JPG", "Attendees seated in a lecture room at the Robotic Inception 2024 orientation", "ROBOTIC INCEPTION 2024"],
].map(([file, alt, event], i) => ({
  id: `cs-${String(i + 1).padStart(2, "0")}`,
  src: `BRS/best 20/${file}`,
  ratio: "1:1",
  position: "attention",
  widths: [200, 320],
  alt,
  plate: 100 + i + 1,
  caption: [event],
}));

mkdirSync(OUT_DIR, { recursive: true });

async function lqip(input) {
  const buf = await grade(sharp(input).resize(16)).webp({ quality: 30 }).toBuffer();
  return `data:image/webp;base64,${buf.toString("base64")}`;
}

async function emit(def, kind) {
  const abs = join(ROOT, def.src);
  if (!existsSync(abs)) {
    console.error(`  MISSING SOURCE: ${def.src}`);
    return null;
  }

  const meta = await sharp(abs).metadata();
  const targetRatio = def.ratio ? RATIOS[def.ratio] : meta.width / meta.height;

  // Never upscale beyond native resolution (§5.6). A 500px source used at
  // 960px would be a visible quality failure on the very page arguing for
  // craftsmanship.
  const widths = def.widths.filter((w) => w <= meta.width).sort((a, b) => a - b);
  if (widths.length === 0) widths.push(Math.min(def.widths[0], meta.width));

  const sources = { avif: [], webp: [] };
  let largestBytes = 0;

  for (const w of widths) {
    const h = Math.round(w / targetRatio);
    for (const fmt of ["avif", "webp"]) {
      const pipeline = grade(
        sharp(abs).resize(w, def.ratio ? h : null, {
          fit: def.ratio ? "cover" : "inside",
          position: def.position === "attention" ? sharp.strategy.attention : def.position,
        }),
      );
      const out = fmt === "avif" ? pipeline.avif({ quality: 78 }) : pipeline.webp({ quality: 82 });
      const file = `${def.id}-${w}.${fmt}`;
      const info = await out.toFile(join(OUT_DIR, file));
      sources[fmt].push({ w, url: `/plates/${file}` });
      if (fmt === "avif") largestBytes = Math.max(largestBytes, info.size);
    }
  }

  const biggest = widths[widths.length - 1];
  const height = def.ratio ? Math.round(biggest / targetRatio) : Math.round(biggest / targetRatio);

  const budget = kind === "hero" ? 250 * 1024 : 90 * 1024;
  const flag = largestBytes > budget ? "  OVER BUDGET" : "";
  console.log(
    `  ${def.id.padEnd(22)} ${String(biggest).padStart(4)}px  ` +
      `${String(Math.round(largestBytes / 1024)).padStart(4)} KB avif${flag}`,
  );

  return {
    id: def.id,
    alt: def.alt,
    width: biggest,
    height,
    ratio: def.ratio ?? null,
    plate: def.plate ?? null,
    caption: def.caption ?? [],
    lqip: await lqip(abs),
    avif: sources.avif,
    webp: sources.webp,
    ...(def.outlet ? { outlet: def.outlet, year: def.year } : {}),
  };
}

console.log("PLATE PREPARATION");
console.log("─".repeat(64));

const features = [];
for (const p of PLATES) {
  const r = await emit(p, p.id.startsWith("hero") ? "hero" : "plate");
  if (r) features.push(r);
}

console.log("  ── press ──");
const press = [];
for (const p of PRESS) {
  const r = await emit(p, "plate");
  if (r) press.push(r);
}

console.log("  ── contact sheet ──");
const contact = [];
for (const p of CONTACT) {
  const r = await emit(p, "plate");
  if (r) contact.push(r);
}

const banner = `/**
 * GENERATED by scripts/prepare-plates.mjs — do not edit by hand.
 *
 * Derivatives of BRS archive photographs. Alt text was written from looking
 * at each image, never from its filename.
 *
 * Phase B1 replaces this module with live /v1/assets data; the shape is
 * deliberately ImageDTO-like so no component changes.
 */\n\n`;

const ts =
  banner +
  `export type PlateSource = { w: number; url: string };\n` +
  `export type PlateAsset = {\n` +
  `  id: string;\n  alt: string;\n  width: number;\n  height: number;\n` +
  `  ratio: string | null;\n  plate: number | null;\n  caption: string[];\n` +
  `  lqip: string;\n  avif: PlateSource[];\n  webp: PlateSource[];\n` +
  `  outlet?: string;\n  year?: number;\n};\n\n` +
  `export type FeatureId =\n` +
  features.map((f) => `  | ${JSON.stringify(f.id)}`).join("\n") +
  `;\n\n` +
  `/** Exact keys, so noUncheckedIndexedAccess cannot make every lookup\n` +
  ` *  possibly-undefined. A missing plate is a build error, not a runtime one. */\n` +
  `export const FEATURES: { [K in FeatureId]: PlateAsset } = ${JSON.stringify(
    Object.fromEntries(features.map((f) => [f.id, f])),
    null,
    2,
  )};\n\n` +
  `export const PRESS: PlateAsset[] = ${JSON.stringify(press, null, 2)} as const;\n\n` +
  `export const CONTACT_SHEET: PlateAsset[] = ${JSON.stringify(contact, null, 2)} as const;\n`;

mkdirSync(dirname(MANIFEST), { recursive: true });
writeFileSync(MANIFEST, ts, "utf8");

console.log("─".repeat(64));
console.log(
  `  ${features.length} features · ${press.length} press · ${contact.length} contact sheet`,
);
console.log(`  manifest → ${MANIFEST.slice(ROOT.length + 1)}\n`);
