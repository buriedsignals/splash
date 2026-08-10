// The render ladder for the proportional-symbol beat.
//
// Usage:
//   bun proof/map-quake-symbol/render.mjs --still
//   bun proof/map-quake-symbol/render.mjs --final-frame
//   bun proof/map-quake-symbol/render.mjs --video

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture, renderStill } from "./render-still.mjs";
// `readPalette` comes from the SHARED copy through the `#shared/…` subpath alias — a beat is a
// story, not a skill, so it may reach out where a skill may not.
import { readPalette } from "#shared/twin-chart-beat/render-still.mjs";
import { QuakeSymbolStill } from "./QuakeSymbolStill.tsx";
import {
  drawOrder,
  quakesFromCsv,
  energyRadiusScale,
  energyRatio,
  overlapReport,
  symbolClaimViolations,
  yearWindow,
} from "./geo-symbol.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const ENTRY = join(HERE, "index.ts");
const COMPOSITION = "quake-symbol";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const dataPath = flag("--data", join(HERE, "quakes-symbol.csv"));
const outDir = flag("--out", join(HERE, "render"));
// Both plates are frozen BESIDE THE BEAT, exactly as the csv is: `/tmp` cannot be committed, so a
// render reading its basemap from there leaves a still and an mp4 nobody can reproduce or audit —
// and MapTiler restyles, so a re-bake months later is a different picture under the same circles.
const stillPlate = flag("--still-plate", join(HERE, "plate-496"));
const videoPlate = flag("--video-plate", join(HERE, "plate-620"));
const wantStill = argv.includes("--still");
const wantFinalFrame = argv.includes("--final-frame");
const wantVideo = argv.includes("--video");

const quakes = quakesFromCsv(await readFile(dataPath, "utf8"));
console.log(`data: ${quakes.length} events, M${Math.min(...quakes.map((q) => q.mag))}–M${Math.max(...quakes.map((q) => q.mag))}`);

// ── Everything the furniture says about this file is READ OUT OF THE FILE ──────────────────
// The window, the magnitudes, the ranking and the size margin between the two biggest circles
// are all derived below. The previous version typed "2005–2024" and "in two decades" beside a
// file whose last event is 2017-01-22, and typed "the largest circle by a wide margin" beside a
// √-scaled encoding that makes the subject 2.9% wider than its runner-up. A number typed next to
// data it does not come from is the defect class this whole beat folder exists to prevent.
const window = yearWindow(quakes);
const ranked = drawOrder(quakes); // largest magnitude first
const subject = ranked[0];
const runnerUp = ranked[1];
const smallest = ranked[ranked.length - 1];
const subjectYear = Number(subject.time.slice(0, 4));
const minMag = smallest.mag;
const magSpan = Math.round((subject.mag - minMag) * 10) / 10;

/**
 * The story's own constants. Only the editorial words are typed here; every quantity, every year
 * and the size comparison come from the derivations above.
 */
// The colours are READ, not typed — see `PALETTE.md` beside this file.
const PALETTE = readPalette(HERE, { stopAt: join(HERE, "..") });
console.log(
  `palette from ${PALETTE.source} — ground ${PALETTE.ground}, accent ${PALETTE.accent}, ` +
    `chosen by ${PALETTE.origin}`,
);

const BEAT = {
  ground: PALETTE.ground,
  accent: PALETTE.accent,
  subjectKey: subject.key, // the largest row in quakes-symbol.csv, found by sorting it
  comparisonKey: runnerUp.key, // the next-largest
  title:
    `The ${subjectYear} Tohoku earthquake was the most powerful to strike the western Pacific ` +
    `between ${window.first} and ${window.last}.`,
  source:
    `Source: USGS Earthquake Catalog (earthquake.usgs.gov), M${minMag}+, western Pacific, ` +
    `${window.label}`,
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
  legendCaption: "Magnitude (circle AREA is proportional to the energy released)",
  // grounded-by-hand: caveat:32 — a constant of the moment-magnitude scale (10^1.5 = 31.6 times the
  // energy per whole step), not a reading from quakes-symbol.csv. No computation over this beat's
  // own rows could ever produce it; it holds whatever earthquakes the file happens to contain.
  // The second sentence is filled in below, once the plate is known: it carries the overlap this
  // camera really leaves, counted rather than felt.
  caveat:
    "Moment magnitude is logarithmic, so these circles are sized by ENERGY, not by the magnitude " +
    `number: the M${subject.mag} mark covers ${Math.round(energyRatio(subject.mag, minMag))}× the area of an M${minMag} one.`,
  alt:
    `Map of the western Pacific. A circle marks each of ${quakes.length} earthquakes of magnitude ` +
    `${minMag} or higher, ${window.label}. Circle AREA is proportional to the energy released, so the ` +
    `${subjectYear} Tohoku earthquake off Japan, magnitude ${subject.mag} and outlined in the accent ` +
    `colour, is by far the largest mark on the map — ${Math.round(energyRatio(subject.mag, runnerUp.mag))}× the ` +
    `area of the magnitude-${runnerUp.mag} circle off Sumatra, which is the next biggest.`,
};

const violations = symbolClaimViolations({ rows: quakes, subjectKey: BEAT.subjectKey });
if (violations.length === 0) console.log("claim: supported by the source.");
else
  console.log(
    `claim: NOT SUPPORTED, in ${violations.length} way(s):\n  ${violations.join("\n  ")}`,
  );

const furniture = deriveFurniture(BEAT.ground);

/** Bakes the plate ONLY when the frozen one is absent — a warm run never touches the network. The
 *  size is read off the folder name, so `plate-496` and `plate-620` each rebuild themselves. */
function ensurePlate(plateDir) {
  if (existsSync(join(plateDir, "geometry.json")) && existsSync(join(plateDir, "plate.png"))) return;
  const size = plateDir.match(/plate-(\d+)$/)?.[1];
  if (!size) throw new Error(`cannot bake ${plateDir}: the folder name must end in plate-<size>`);
  console.log(`no frozen plate at ${plateDir} — baking one there.`);
  const result = spawnSync("bun", [join(HERE, "bake.mjs"), "--size", size, "--out", plateDir], {
    cwd: resolve(HERE, "../../.."),
    stdio: "inherit",
  });
  if (result.status !== 0) throw new Error(`bake.mjs exited with ${result.status}`);
}

async function plateOf(dir) {
  ensurePlate(dir);
  const geometry = JSON.parse(await readFile(join(dir, "geometry.json"), "utf8"));
  const png = await readFile(join(dir, "plate.png"));
  return { geometry, plate: `data:image/png;base64,${png.toString("base64")}` };
}

// WHAT THIS CAMERA LEAVES OVERLAPPING, COUNTED (B6.17). The owner's report was "watch overlap and
// the size of symbols close together — it becomes unreadable fast". Part of it was the flat size
// scale, fixed in `energyRadiusScale`; part of it is the data — two of these events are catalogued
// less than two pixels apart at this camera, and no radius makes them two marks. So the number goes
// in the beat's own caveat rather than being left for a reader to discover, the same way the hex
// beat states the events its frame crops. Measured on the still's plate; the ratio is identical on
// the video's, because both the positions and the radii scale with the frame.
const sizingGeometry = JSON.parse(
  await readFile(join(stillPlate, "geometry.json"), "utf8"),
);
const { radiusOf: sizingRadiusOf, maxRadiusPx, minRadiusPx } = energyRadiusScale(
  sizingGeometry.points.map((p) => p.mag),
  {
    frameWidth: sizingGeometry.frame.width,
    maxRadiusFraction: 0.062,
    minLegibleRadiusPx: 4,
    maxRadiusCeilingFraction: 0.12,
  },
);
const overlap = overlapReport(sizingGeometry.points, sizingRadiusOf);
console.log(
  `size: radius ${minRadiusPx.toFixed(2)}–${maxRadiusPx.toFixed(2)}px on a ${sizingGeometry.frame.width}px plate ` +
    `(${(maxRadiusPx / minRadiusPx).toFixed(2)}x) · ${overlap.overlappingPairs} of ${overlap.pairs} pairs overlap, ` +
    `${overlap.marksTouched} of ${sizingGeometry.points.length} marks touched`,
);
const caveat =
  BEAT.caveat +
  ` ${overlap.marksTouched} of the ${sizingGeometry.points.length} overlap a neighbour; smaller circles are drawn on top.`;

const shared = {
  title: BEAT.title,
  source: BEAT.source,
  basemapCredit: BEAT.basemapCredit,
  legendCaption: BEAT.legendCaption,
  caveat,
  alt: BEAT.alt,
  ground: BEAT.ground,
  accent: BEAT.accent,
  ...furniture,
  subjectKey: BEAT.subjectKey,
  comparisonKey: BEAT.comparisonKey,
};

await mkdir(outDir, { recursive: true });

if (wantStill) {
  const { geometry, plate } = await plateOf(stillPlate);
  const { pngPath } = await renderStill({
    element: createElement(QuakeSymbolStill, { ...shared, geometry, plate }),
    width: 900,
    height: 560,
    outDir,
    name: "static",
  });
  console.log(`still → ${pngPath}\nNow open it and look at it.`);
}

function remotion(args) {
  const binary = join(PACKAGE_ROOT, "node_modules/.bin/remotion");
  const started = Date.now();
  const result = spawnSync(binary, args, { cwd: PACKAGE_ROOT, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`remotion ${args[0]} exited with ${result.status}`);
  return Math.round((Date.now() - started) / 1000);
}

if (wantFinalFrame || wantVideo) {
  const { geometry, plate } = await plateOf(videoPlate);
  const propsPath = join(outDir, "video-props.json");
  await writeFile(propsPath, JSON.stringify({ ...shared, geometry, plate }));

  const framePath = join(outDir, "final-frame.png");
  const stillSeconds = remotion(["still", ENTRY, COMPOSITION, framePath, "--frame=-1", `--props=${propsPath}`, "--timeout=180000"]);
  console.log(`final frame (--frame=-1) → ${framePath}  [${stillSeconds}s]`);

  if (wantVideo) {
    const videoPath = join(outDir, "quake-symbol.mp4");
    const videoSeconds = remotion([
      "render",
      ENTRY,
      COMPOSITION,
      videoPath,
      `--props=${propsPath}`,
      "--concurrency=1",
      "--timeout=180000",
    ]);
    console.log(`video → ${videoPath}  [${videoSeconds}s]`);
  }
}

if (!wantStill && !wantFinalFrame && !wantVideo) console.log("nothing asked for. Pass --still, --final-frame or --video.");
