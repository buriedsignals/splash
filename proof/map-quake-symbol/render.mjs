// The render ladder for the proportional-symbol beat.
//
// TWO GENRES, TWO TABLES. The still is read in an article column and takes `chart-beat`'s size
// table (landscape floor 26); the video is watched and takes `chart-video`'s (landscape floor 30,
// because a 16:9 video is designed for a phone turned sideways, ~800 dp). Both read the SAME pin,
// out of this beat's own `BRIEF.md` front matter — one journalist's decision, two floors.
//
// Usage:
//   bun proof/map-quake-symbol/render.mjs --still
//   bun proof/map-quake-symbol/render.mjs --still --size square   # LOOKING, into sizes/
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
import { readPalette } from "#shared/chart-beat/render-still.mjs";
// The STATIC genre's size table — the same one every static chart beat reads, and deliberately not
// a fourth copy of it. `minTypePx` is "12 CSS px at the distance this output is read", and a static
// map sits in the same ~900px article column a static chart does.
import {
  assertDeliveredSize,
  assertTypeFloor,
  assertWithinStage,
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/chart-beat/sizes.mjs";
// …and the VIDEO genre's, for the mp4 half. Same three rows, a different floor, which is exactly
// the split `typeScale` is per-craft-skill for.
import {
  assertDeliveredSize as assertDeliveredVideoSize,
  sizeFor as videoSizeFor,
} from "#shared/chart-video/sizes.mjs";
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
const BEAT_ID = "quake-symbol";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

// THE JOURNALIST'S DECISION, READ RATHER THAN RETYPED. Gate 2c pins a size; this beat records it in
// its own `BRIEF.md` front matter; `readPinnedSize` throws naming every path it looked at if it is
// missing. Before this the size was two literals in each component and two more below, compared
// against each other by `renderStill` — so they agreed by construction and the pin reached nothing.
const pinnedSize = await readPinnedSize(HERE, { readFile, dirname, join });
// `--size <name>` renders one of the OTHER two, into `sizes/`, so all three can be opened and
// compared. Deliberately NOT a way to change what this beat delivers: the delivered file keeps the
// beat's own name and the pinned size, and an override says so on stdout and writes elsewhere.
const sizeFlag = argv.indexOf("--size");
const size = sizeFlag === -1 ? pinnedSize : argv[sizeFlag + 1];
const { width: FRAME_WIDTH, height: FRAME_HEIGHT } = sizeFor(size);

const dataPath = flag("--data", join(HERE, "quakes-symbol.csv"));
const outDir = flag(
  "--out",
  sizeFlag === -1 ? join(HERE, "render") : join(HERE, "sizes"),
);
const stillStem = sizeFlag === -1 ? "static" : `static-${size}`;
const videoStem = sizeFlag === -1 ? BEAT_ID : `${BEAT_ID}-${size}`;
if (sizeFlag !== -1)
  console.log(
    `LOOKING at ${size}; the pinned size stays ${pinnedSize} -> ${outDir}`,
  );
console.log(
  `pinned size: ${size} — still ${FRAME_WIDTH}x${FRAME_HEIGHT} (floor ${sizeFor(size).minTypePx}px), ` +
    `video ${videoSizeFor(size).width}x${videoSizeFor(size).height} (floor ${videoSizeFor(size).minTypePx}px)`,
);

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
// beat states the events its frame crops.
//
// THE RATIO IS THE SAME AT EVERY EXPORT SIZE, and that is worth saying out loud now that the frame
// moves: the radii are fractions of the plate and the distances between marks are drawn from the
// same plate, so both scale together. Drawing the plate at 910 px instead of 496 makes every mark
// bigger and changes nothing about how much of the field overlaps.
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
  size,
};

await mkdir(outDir, { recursive: true });

if (wantStill) {
  const { geometry, plate } = await plateOf(stillPlate);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(QuakeSymbolStill, { ...shared, geometry, plate }),
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    // 1:1 — the frame IS the export size, so the PNG on disk measures what gate 2c pinned. The
    // default 2 belongs to the frames that have not moved to the table yet.
    scale: 1,
    outDir,
    name: stillStem,
  });

  // THE DELIVERED FILE, MEASURED FROM ITS OWN BYTES. Not the element, not the arguments — the PNG
  // on disk. It is the one reading the code that wrote it cannot make agree with itself.
  assertDeliveredSize(readPngSize(await readFile(pngPath)), size, {
    what: pngPath,
  });
  const svg = await readFile(svgPath, "utf8");
  assertTypeFloor(svg, size, { what: "map-quake-symbol" });
  assertWithinStage(svg, size, { what: "map-quake-symbol" });
  console.log(
    `still → ${pngPath} at ${FRAME_WIDTH}x${FRAME_HEIGHT}, verified from the file\nNow open it and look at it.`,
  );
}

function remotion(args) {
  const binary = join(PACKAGE_ROOT, "node_modules/.bin/remotion");
  const started = Date.now();
  const result = spawnSync(binary, args, { cwd: PACKAGE_ROOT, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`remotion ${args[0]} exited with ${result.status}`);
  return Math.round((Date.now() - started) / 1000);
}

/**
 * The DELIVERED mp4's own dimensions, read out of the container by `ffprobe`.
 *
 * The video analogue of `readPngSize`, and it exists for the same reason: the only reading the code
 * that wrote the file cannot make agree with itself. `Root.tsx` sizes the composition and the
 * component draws into it, both from the same table — so they agree by construction, and an encoder
 * that letterboxed or a `--scale` left on a command line would arrive in the newsroom unnoticed.
 */
function mp4Size(path) {
  const probe = spawnSync(
    "ffprobe",
    ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", path],
    { encoding: "utf8" },
  );
  if (probe.status !== 0) throw new Error(`ffprobe could not read ${path}: ${probe.stderr}`);
  const [width, height] = probe.stdout.trim().split(",").map(Number);
  if (!Number.isFinite(width) || !Number.isFinite(height))
    throw new Error(`ffprobe returned no dimensions for ${path}: ${probe.stdout}`);
  return { width, height };
}

if (wantFinalFrame || wantVideo) {
  // ONE COMPOSITION PER SIZE, selected by id. `QuakeSymbolVideo` refuses inside the composition,
  // loudly and with its own arithmetic, at every size whose band its words do not leave a map in —
  // which today is all three. See `BRIEF.md`'s table and the block at the top of that component.
  const COMPOSITION = `${BEAT_ID}-${size}`;
  const { geometry, plate } = await plateOf(videoPlate);
  const propsPath = join(outDir, `${videoStem}-props.json`);
  await writeFile(propsPath, JSON.stringify({ ...shared, geometry, plate }));

  const framePath = join(outDir, `${videoStem}-final-frame.png`);
  const stillSeconds = remotion(["still", ENTRY, COMPOSITION, framePath, "--frame=-1", `--props=${propsPath}`, "--timeout=180000"]);
  assertDeliveredVideoSize(readPngSize(await readFile(framePath)), size, {
    what: framePath,
  });
  console.log(`final frame (--frame=-1) → ${framePath}  [${stillSeconds}s], verified from the file`);

  if (wantVideo) {
    const videoPath = join(outDir, `${videoStem}.mp4`);
    const videoSeconds = remotion([
      "render",
      ENTRY,
      COMPOSITION,
      videoPath,
      `--props=${propsPath}`,
      "--concurrency=1",
      "--timeout=180000",
    ]);
    // And the DELIVERED mp4, out of the container itself. This is the assertion the whole size
    // decision rests on for the video genre: everything upstream of it agrees with itself.
    assertDeliveredVideoSize(mp4Size(videoPath), size, { what: videoPath });
    console.log(`video → ${videoPath}  [${videoSeconds}s], verified from the container`);
  }
}

if (!wantStill && !wantFinalFrame && !wantVideo) console.log("nothing asked for. Pass --still, --final-frame or --video.");
