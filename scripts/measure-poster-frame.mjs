/**
 * Measure the photo frame on the 11th-ExCom posters.
 *
 * Template-generated, so the frame SHOULD be identical on all 84.
 * "Should" is not a measurement — cropping 84 portraits on an assumed box
 * is how you silently decapitate someone. This proves it.
 *
 * METHOD, and three attempts that failed (recorded so nobody repeats them):
 *   · Brightness scan down the centre — caught the headline and the name,
 *     and missed dark photographs entirely.
 *   · Cross-poster variance in the outer columns — the team-name line
 *     ("PROJECT AND COMPETITION TEAM") runs nearly full width, so it read
 *     as part of the photograph.
 *   · A column at x=292 — that is INSIDE the photo, not the stroke, so it
 *     measured picture content.
 *
 * What works is scanning a column that lands within the frame's own
 * stroke. The stroke is a light rule the template draws at a fixed
 * position; nothing else on the poster is that colour at that x, so its
 * run length gives the frame's exact vertical extent, and a row inside the
 * top stroke gives the horizontal one.
 */
import sharp from "sharp";
import { readdirSync } from "node:fs";
import { join } from "node:path";

export const DIR = "BRS 11th ExCom Post";
const W = 1500, H = 1800;

/** Longest run of pixels at or above `t`, as [start, end]. */
const longestRun = (vals, t) => {
  let best = [-1, -1], bestLen = 0, s = -1;
  for (let i = 0; i <= vals.length; i++) {
    if (i < vals.length && vals[i] >= t) { if (s < 0) s = i; }
    else if (s >= 0) { if (i - s > bestLen) { bestLen = i - s; best = [s, i - 1]; } s = -1; }
  }
  return best;
};

async function frameOf(file) {
  const { data, info } = await sharp(join(DIR, file))
    .greyscale().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== W || info.height !== H) throw new Error(`${file} is ${info.width}x${info.height}`);
  const at = (x, y) => data[y * W + x];

  // x = 285 falls within the left stroke (the photo starts near 288).
  const col = []; for (let y = 0; y < H; y++) col.push(at(285, y));
  const [top, bottom] = longestRun(col, 90);
  // y = top + 2 falls within the top stroke.
  const row = []; for (let x = 0; x < W; x++) row.push(at(x, top + 2));
  const [left, right] = longestRun(row, 90);
  return { file, left, right, top, bottom };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = readdirSync(DIR).filter((f) => /\.jpe?g$/i.test(f)).sort();
  const boxes = [];
  for (const f of files) boxes.push(await frameOf(f));

  const tally = (k) => {
    const m = new Map();
    for (const b of boxes) m.set(b[k], (m.get(b[k]) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]);
  };
  for (const k of ["left", "right", "top", "bottom"]) {
    console.log(k.padEnd(7), tally(k).slice(0, 4).map(([v, n]) => `${v}×${n}`).join("  "));
  }
  const [L, R, T, B] = ["left", "right", "top", "bottom"].map((k) => tally(k)[0][0]);
  console.log(`\nframe, stroke included: x ${L}..${R} (${R - L + 1})  y ${T}..${B} (${B - T + 1})`);
  const dis = boxes.filter((b) => b.left !== L || b.right !== R || b.top !== T || b.bottom !== B);
  console.log(`disagreeing posters: ${dis.length}`);
  for (const b of dis) console.log(`  ${b.file.padEnd(24)} x ${b.left}..${b.right}  y ${b.top}..${b.bottom}`);
}
export { frameOf };
