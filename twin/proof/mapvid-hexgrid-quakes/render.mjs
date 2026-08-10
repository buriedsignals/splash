// The render ladder for the hex-grid VIDEO beat. Rung 1 is the video's LAST FRAME on its own
// (`--frame=-1`, seconds); rung 2 is the mp4 (minutes). In that order, always — a wrong end state
// is a wrong video, and finding out costs seconds at rung 1 instead of minutes at rung 2.
//
// EVERY NUMBER ON THE FRAME IS COMPUTED HERE, from the frozen catalogue and this beat's own plate:
// the class breaks, the cell counts, the running totals the clock prints, the densest cell, the
// days it was active, its busiest day, and the whole conclusion sentence. Nothing about the year's
// shape is typed, because the claim IS the year's shape.
//
// It runs the two checks a render cannot make for itself:
//   · the SUBJECT is the actual maximum of this plate's own binning — throws if the outlined cell
//     is not the densest, which is the failure mode the static sibling documents at length (change
//     the cell size, the frame or the seam and the "densest cell" changes hands);
//   · the CLAIM, "this cell's events are spread across the year rather than delivered by a swarm",
//     measured as active days and the busiest day's own share — throws if either fails its floor.
//
// Usage:
//   bun proof/mapvid-hexgrid-quakes/render.mjs --final-frame
//   bun proof/mapvid-hexgrid-quakes/render.mjs --video

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveFurniture,
  readPalette,
} from "../../skills/twin-map-beat/scripts/render-still.mjs";
import {
  binIndexUpperInclusive,
  cellMembers,
  chooseHexSize,
  countBreaks,
  cumulativeByDay,
  dayIndexInYear,
  daysInYear,
  dominantRegions,
  quakePointsFromCsv,
  quakeTimesFromCsv,
  assertRampReads,
  dataRampEnd,
  sequentialRamp,
  spreadOverDays,
} from "./geo-hex.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const ENTRY = join(HERE, "index.ts");
const COMPOSITION = "mapvid-hexgrid-quakes";

/** The story's own constants. Every quantity is derived below; these are editorial, not numeric. */
const BEAT = {
  year: 2024,
  /** A cell whose events land on fewer days than this is a swarm, and this beat's claim would be
   *  false of it. Asserted, not assumed — see the claim check. */
  minActiveDayShare: 0.8,
  /** …and no single day may carry more than this share of the cell's own year. */
  maxBusiestDayShare: 0.1,
  // The title is BUILT below, after the measurement, rather than typed here: its whole content is
  // two counts, and a typed count is the defect this repository has paid for twelve times.
  titleFor: ({ activeDays, days }) =>
    `The Ring of Fire is not one bad day: 2024's densest cell shook on ${activeDays} days out of ${days}.`,
  source:
    "Source: USGS Earthquake Catalog (earthquake.usgs.gov), magnitude 4.0+, worldwide, 2024",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
  legendCaption:
    "Earthquakes per cell, cumulative through the year (count, not energy or magnitude) —",
};

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const dataPath = flag("--data", join(HERE, "quakes-density.csv"));
const outDir = flag("--out", join(HERE, "render"));
// The plate is frozen BESIDE THE BEAT, exactly as the data is: `/tmp` cannot be committed, so a
// render reading its basemap from there leaves an mp4 nobody can reproduce or audit — and MapTiler
// restyles, so a re-bake months later is a different picture under the same marks.
const plateDir = flag("--plate", join(HERE, "plate"));
const wantFinalFrame = argv.includes("--final-frame");
const wantVideo = argv.includes("--video");

// ── The catalogue, and its clock ───────────────────────────────────────────────────────────────
const csv = await readFile(dataPath, "utf8");
const points = quakePointsFromCsv(csv);
const times = quakeTimesFromCsv(csv);
if (times.length !== points.length)
  throw new Error(
    `the catalogue's times and points are out of step (${times.length} vs ${points.length}) — a cell would be dated by other events' days`,
  );
const days = daysInYear(BEAT.year);
const dayOf = (index) => dayIndexInYear(times[index], BEAT.year);
const outOfYear = times.filter(
  (time) => dayIndexInYear(time, BEAT.year) === null,
).length;
if (outOfYear > 0)
  throw new Error(
    `${outOfYear} of ${times.length} catalogued events fall outside ${BEAT.year} — this beat plays one year and cannot show them`,
  );
console.log(
  `data: ${points.length} events, M${Math.min(...points.map((p) => p.mag)).toFixed(1)}+, ` +
    `${days} days in ${BEAT.year}`,
);

/** Bakes the plate ONLY when the frozen one is absent — a warm run never touches the network. */
function ensurePlate(dir) {
  if (existsSync(join(dir, "geometry.json")) && existsSync(join(dir, "plate.png")))
    return;
  console.log(`no frozen plate at ${dir} — baking one there.`);
  const result = spawnSync("bun", [join(HERE, "bake.mjs"), "--out", dir], {
    cwd: resolve(HERE, "../../.."),
    stdio: "inherit",
  });
  if (result.status !== 0) throw new Error(`bake.mjs exited with ${result.status}`);
}

ensurePlate(plateDir);
const geometry = JSON.parse(await readFile(join(plateDir, "geometry.json"), "utf8"));
const plateBytes = await readFile(join(plateDir, "plate.png"));
const plate = `data:image/png;base64,${plateBytes.toString("base64")}`;

// ── The binning, on this plate's own points ────────────────────────────────────────────────────
const { size: hexSize, cells } = chooseHexSize(geometry.points, geometry.frame);
const members = cellMembers(geometry.points, hexSize);
const breaks = countBreaks(cells.map((cell) => cell.count));
const sorted = [...cells].sort((a, b) => b.count - a.count);
const subject = sorted[0];
const medianCount = [...cells.map((c) => c.count)].sort((a, b) => a - b)[
  Math.floor(cells.length / 2)
];
console.log(
  `binning: ${cells.length} non-empty cells at hex size ${hexSize.toFixed(2)}px on a ` +
    `${geometry.frame.width}x${geometry.frame.height} plate; breaks ${breaks.join(", ")}; ` +
    `top counts ${sorted.slice(0, 5).map((c) => c.count).join(", ")}; median ${medianCount}`,
);

// The subject is the maximum of THIS plate's binning, found by reducing — never a key typed here.
for (const cell of cells)
  if (cell.count > subject.count)
    throw new Error(
      `the subject ${subject.key} holds ${subject.count} but ${cell.key} holds ${cell.count}`,
    );

// ── The claim: spread through the year, not one swarm ──────────────────────────────────────────
const subjectIndices = members.get(subject.key);
if (!subjectIndices)
  throw new Error(`the densest cell ${subject.key} has no member list — the binning disagrees with itself`);
const spread = spreadOverDays(subjectIndices, dayOf, days);
const activeShare = spread.activeDays / days;
const busiestShare = spread.busiestDayCount / spread.events;
if (activeShare < BEAT.minActiveDayShare)
  throw new Error(
    `claim check failed: the densest cell was active on ${spread.activeDays} of ${days} days ` +
      `(${(activeShare * 100).toFixed(1)}%), under the ${(BEAT.minActiveDayShare * 100).toFixed(0)}% floor — ` +
      `"not one bad day" would not be true of this data`,
  );
if (busiestShare > BEAT.maxBusiestDayShare)
  throw new Error(
    `claim check failed: the densest cell's busiest day carries ${spread.busiestDayCount} of its ` +
      `${spread.events} events (${(busiestShare * 100).toFixed(1)}%), over the ` +
      `${(BEAT.maxBusiestDayShare * 100).toFixed(0)}% ceiling — this cell IS a swarm`,
  );
const regions = dominantRegions(subjectIndices.map((i) => points[i].place));
const subjectLabel = regions.map((r) => r.label).join(" / ");
console.log(
  `claim: supported. The densest cell (${subjectLabel}) holds ${spread.events} events on ` +
    `${spread.activeDays} of ${days} days; its busiest single day carries ${spread.busiestDayCount} ` +
    `(${(busiestShare * 100).toFixed(1)}%).`,
);

// ── What each cell does over the year: its first day, and the day it entered each class ─────────
const series = cumulativeByDay(members, dayOf, days);

/** The day a cell's running count first passed each break, or null if it never did. */
function crossingsOf(key) {
  const running = series.get(key);
  return breaks.map((threshold) => {
    for (let day = 0; day < days; day++) if (running[day] > threshold) return day;
    return null;
  });
}

const drawn = cells.map((cell) => {
  const running = series.get(cell.key);
  const firstDay = running.findIndex((n) => n > 0);
  if (firstDay < 0)
    throw new Error(`cell ${cell.key} holds ${cell.count} events but none of them has a date`);
  if (running[days - 1] !== cell.count)
    throw new Error(
      `cell ${cell.key} bins to ${cell.count} events but its own daily series ends at ${running[days - 1]}`,
    );
  return {
    key: cell.key,
    cx: cell.cx,
    cy: cell.cy,
    firstDay,
    crossings: crossingsOf(cell.key),
    total: cell.count,
  };
});

// The running totals the clock prints — the whole map's, and the subject cell's alone.
const runningTotal = new Array(days).fill(0);
for (const [, running] of series)
  for (let day = 0; day < days; day++) runningTotal[day] += running[day];
const subjectRunning = series.get(subject.key);
if (runningTotal[days - 1] !== geometry.points.length)
  throw new Error(
    `the clock would end at ${runningTotal[days - 1]} events, but ${geometry.points.length} are on this plate`,
  );

// How fast the picture arrives — the second half of the argument, and stated on the frame.
const cellsByDay = (limit) =>
  drawn.filter((cell) => cell.firstDay <= limit).length;
const inThirtyDays = cellsByDay(29);
console.log(
  `shape: ${inThirtyDays} of ${drawn.length} cells have appeared within 30 days ` +
    `(${((inThirtyDays / drawn.length) * 100).toFixed(0)}%).`,
);

// ── The words, every number in them interpolated from the measurements above ────────────────────
const title = BEAT.titleFor({ activeDays: spread.activeDays, days });
const conclusion =
  `${spread.events.toLocaleString("en-GB")} events in one cell, on ${spread.activeDays} of ${days} days — ` +
  `its busiest day carried ${spread.busiestDayCount}.`;
const caveat =
  `A hexagon appears on the day its first magnitude-4 event was catalogued, and darkens as its ` +
  `running count crosses each class — an absent cell means "nothing catalogued yet", never "no ` +
  `earthquakes here". Count is not energy: a cell of hundreds of M4 events outranks one holding a ` +
  `single M7.5. ${(points.length - geometry.points.length).toLocaleString("en-GB")} of the ` +
  `${points.length.toLocaleString("en-GB")} catalogued events fall outside this frame, poleward of ` +
  `${Math.abs(geometry.frameCorners.south).toFixed(0)}°S–${geometry.frameCorners.north.toFixed(0)}°N.`;
const alt =
  `A world map of 2024's magnitude-4-or-greater earthquakes, binned into ${drawn.length} equal ` +
  `hexagons and played through the year one day at a time. Cells trace the Pacific plate boundaries: ` +
  `${inThirtyDays} of the ${drawn.length} cells have already appeared within the first 30 days, and ` +
  `the picture thickens rather than changing shape. The densest cell, outlined in the accent colour ` +
  `off the Fiji–Tonga trench, ends the year holding ${spread.events.toLocaleString("en-GB")} events ` +
  `against a median non-empty cell of ${medianCount} — and those ${spread.events.toLocaleString("en-GB")} ` +
  `fall on ${spread.activeDays} of the year's ${days} days, with the busiest single day carrying ` +
  `${spread.busiestDayCount} of them, so the cell is continuously active rather than the record of ` +
  `one aftershock sequence. Its events are catalogued by USGS as ` +
  `${regions.map((r) => `${r.label} ${(r.share * 100).toFixed(0)}%`).join(" and ")}.`;

const palette = readPalette(import.meta.dirname, { stopAt: HERE });
const furniture = deriveFurniture(palette.ground);
// THE SHADING IS THE DATA. Until 2026-08-10 this ramp ran ground -> furniture.ink — computed
// between the background and the ink, so it never touched the recorded accent, and a newsroom
// could change its house colour while this map stayed grey (`AUDIT-W2-palette-credits.md` H3).
// `dataRampEnd` walks the accent toward the pole the ground is not; `assertRampReads` then
// measures the finished classes: monotone, separated, top class above the 3:1 mark floor.
const ramp = assertRampReads(
  sequentialRamp(
    palette.ground,
    dataRampEnd(palette.accent, palette.ground),
    breaks.length + 1,
    0.14,
    0.82,
  ),
  palette.ground,
  "the hex-density ramp",
);
console.log(
  `palette: ground ${palette.ground}, accent ${palette.accent} (chosen by ${palette.origin}, ${palette.source})`,
);

// A sanity check on the scale itself: every class must be reachable, or the legend prints a shade
// no cell ever wears.
for (let index = 0; index < ramp.length; index++)
  if (!cells.some((cell) => binIndexUpperInclusive(cell.count, breaks) === index))
    throw new Error(`class ${index} of the legend holds no cell — the breaks and the data disagree`);

const props = {
  geometry: { frame: geometry.frame },
  plate,
  cells: drawn,
  hexSize,
  breaks,
  ramp,
  runningTotal,
  subjectRunning,
  yearStart: `${BEAT.year}-01-01T00:00:00.000Z`,
  subjectKey: subject.key,
  subjectLabel,
  title,
  source: BEAT.source,
  basemapCredit: BEAT.basemapCredit,
  legendCaption: BEAT.legendCaption,
  conclusion,
  caveat,
  ground: palette.ground,
  accent: palette.accent,
  ...furniture,
  alt,
};

await mkdir(outDir, { recursive: true });
const propsPath = join(outDir, "video-props.json");
await writeFile(propsPath, JSON.stringify(props));

function remotion(args) {
  const binary = join(PACKAGE_ROOT, "node_modules/.bin/remotion");
  const started = Date.now();
  const result = spawnSync(binary, args, { cwd: PACKAGE_ROOT, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`remotion ${args[0]} exited with ${result.status}`);
  return Math.round((Date.now() - started) / 1000);
}

if (wantFinalFrame || wantVideo) {
  const framePath = join(outDir, "final-frame.png");
  const seconds = remotion([
    "still",
    ENTRY,
    COMPOSITION,
    framePath,
    "--frame=-1",
    `--props=${propsPath}`,
    "--timeout=180000",
  ]);
  console.log(`final frame (--frame=-1) → ${framePath}  [${seconds}s]`);
}

if (wantVideo) {
  const videoPath = join(outDir, "hexgrid.mp4");
  const seconds = remotion([
    "render",
    ENTRY,
    COMPOSITION,
    videoPath,
    `--props=${propsPath}`,
    "--concurrency=1",
    "--timeout=180000",
  ]);
  console.log(`video → ${videoPath}  [${seconds}s]\nNow extract frames from it and look at them.`);
}

if (!wantFinalFrame && !wantVideo)
  console.log("nothing asked for. Pass --final-frame or --video.");
