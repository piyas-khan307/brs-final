#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════
 * BRAND MARK PREPARATION.
 *
 * The source is logo/BRS Logo transparent.png — 1946 x 1942, RGBA, and
 * 434 KB. That file is committed to the archive, not to the web app: the
 * archive directories are gitignored, and shipping a 434 KB PNG for a
 * 36px masthead mark would be indefensible on a page that argues for
 * craftsmanship.
 *
 * The mark is a diamond badge. Its four measured values are the source of
 * the entire palette in globals.css:
 *
 *   #0E516E  petrol     the badge field, carrying a blueprint grid
 *   #7B1223  oxblood    the inner rule, and the gear
 *   #3A3A3C  graphite   the outer border
 *   #FFFFFF  white      the circuitry, the arm, the BRS lettering
 *
 * WHY PNG AND NOT SVG: the vector original is logo/BRS Logo FINAL.ai,
 * which is an Illustrator binary, not an SVG. Converting it faithfully
 * needs Illustrator or Inkscape and a human eye on the result — the mark
 * contains a fine blueprint grid and a 40-tooth gear that a bad autotrace
 * will mangle. A crisp raster at 3x the largest displayed size is honest
 * and costs almost nothing; the SVG can replace it later without touching
 * a component.
 * ══════════════════════════════════════════════════════════════════════
 */

import sharp from "sharp";
import { mkdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "logo", "BRS Logo transparent.png");
const OUT = join(ROOT, "apps", "web", "public", "brand");

mkdirSync(OUT, { recursive: true });

// Displayed at most at 200px (the intro). 3x covers a 3dppx phone.
const WIDTHS = [72, 128, 256, 600];

console.log("\nBRS MARK");
for (const w of WIDTHS) {
  for (const fmt of ["avif", "webp", "png"]) {
    const pipeline = sharp(SRC).resize(w, w, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
    const out =
      fmt === "avif"
        ? pipeline.avif({ quality: 82 })
        : fmt === "webp"
          ? pipeline.webp({ quality: 88, alphaQuality: 100 })
          : pipeline.png({ compressionLevel: 9, palette: true });
    const file = `brs-mark-${w}.${fmt}`;
    await out.toFile(join(OUT, file));
    if (fmt === "webp") {
      const kb = (statSync(join(OUT, file)).size / 1024).toFixed(1);
      console.log(`  ${String(w).padStart(3)}px  ${kb.padStart(6)} KB webp`);
    }
  }
}

// Favicon. 32px PNG, because .ico is not worth the dependency.
await sharp(SRC)
  .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(join(ROOT, "apps", "web", "public", "icon.png"));

console.log("  icon.png (32px favicon)\n");
