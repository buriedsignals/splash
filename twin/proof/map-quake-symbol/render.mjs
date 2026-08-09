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
import { QuakeSymbolStill } from "./QuakeSymbolStill.tsx";
import {
  drawOrder,
  quakesFromCsv,
  radiusScale,
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
// The size margin is a RATIO, so it holds at any maximum radius — the still draws at 30 px, the
// video at 46. Measured through the beat's own scale rather than by re-deriving √(9.1/8.6) by hand.
const STILL_MAX_RADIUS = 30;
const radiusOf = radiusScale(subject.mag, STILL_MAX_RADIUS);
const radiusGainPct = (radiusOf(subject.mag) / radiusOf(runnerUp.mag) - 1) * 100;
const radiusGainPx = radiusOf(subject.mag) - radiusOf(runnerUp.mag);
const magSpan = Math.round((subject.mag - minMag) * 10) / 10;
console.log(
  `derived: window ${window.label} · subject M${subject.mag} vs runner-up M${runnerUp.mag} ` +
    `· radius ratio ${(1 + radiusGainPct / 100).toFixed(6)} (+${radiusGainPct.toFixed(2)}%, ` +
    `+${radiusGainPx.toFixed(2)}px at the still's 30px maximum)`,
);

/**
 * The story's own constants. Only the editorial words are typed here; every quantity, every year
 * and the size comparison come from the derivations above.
 */
const BEAT = {
  ground: "#FFFFFF",
  accent: "#C1440E",
  subjectKey: subject.key, // the largest row in quakes-symbol.csv, found by sorting it
  comparisonKey: runnerUp.key, // the next-largest
  title:
    `The ${subjectYear} Tohoku earthquake was the most powerful to strike the western Pacific ` +
    `between ${window.first} and ${window.last}.`,
  source:
    `Source: USGS Earthquake Catalog (earthquake.usgs.gov), M${minMag}+, western Pacific, ` +
    `${window.label}`,
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
  legendCaption: "Magnitude (radius scaled to √magnitude, not to energy released)",
  // grounded-by-hand: caveat:32 — a constant of the moment-magnitude scale (10^1.5 = 31.6 times the
  // energy per whole step), not a reading from quakes-symbol.csv. No computation over this beat's
  // own rows could ever produce it; it holds whatever earthquakes the file happens to contain.
  caveat:
    "Moment magnitude is a logarithmic scale: each whole step is roughly 32× the energy release, " +
    `so a circle ${magSpan} units bigger is not ${magSpan}× the event — it is orders of magnitude bigger.`,
  alt:
    `Map of the western Pacific. A circle marks each of ${quakes.length} earthquakes of magnitude ` +
    `${minMag} or higher, ${window.label}, sized by magnitude. The ${subjectYear} Tohoku earthquake, ` +
    `magnitude ${subject.mag} off Japan, is outlined in the accent colour. It is the largest circle, but ` +
    `only just: radius goes as the square root of magnitude from zero, so it is under ` +
    `${Math.ceil(radiusGainPct)}% wider than the magnitude-${runnerUp.mag} circle off Sumatra — a ` +
    `difference of ${radiusGainPx.toFixed(1)} pixels at this size. The accent outline, not the size, ` +
    `is what identifies it.`,
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

const shared = {
  title: BEAT.title,
  source: BEAT.source,
  basemapCredit: BEAT.basemapCredit,
  legendCaption: BEAT.legendCaption,
  caveat: BEAT.caveat,
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
