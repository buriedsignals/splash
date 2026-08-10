// The render ladder for this choropleth beat. Rung 1 is the still (resvg, milliseconds); rung 2 is
// the video's LAST FRAME on its own; rung 3 is the mp4. In that order, always — a wrong end state
// is a wrong video, and finding out costs seconds at rung 2 instead of minutes at rung 3.
//
// It runs the two checks a render cannot make for itself:
//   · the JOIN, which fails loud naming any shape that found no value (`geo-discipline.md` rule 5);
//   · the CLAIM, "Poland's per-capita CO2 is more than double Sweden's" — measured against the
//     actual joined values, not assumed from the confirmed title.
//
// Usage:
//   bun proof/mapgen-choropleth-video/render.mjs --still
//   bun proof/mapgen-choropleth-video/render.mjs --final-frame
//   bun proof/mapgen-choropleth-video/render.mjs --video
//   bun proof/mapgen-choropleth-video/render.mjs --still --size square   # LOOKING, into sizes/

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
// TWO SIZE TABLES, BECAUSE THIS BEAT SHIPS TWO GENRES FROM ONE FOLDER, and they are not the same
// question. Both carry the same three frames; what differs is the legibility floor, because a
// static map is read in a ~900px article column (floor 26) and a landscape VIDEO is watched on a
// phone turned sideways, ~800dp (floor 30). Importing one table for both would silently hold the
// video to the article's floor — the exact "one table, two jobs" defect `sizes.mjs` refuses in its
// own header. The two are aliased at the import so no call site below can pick the wrong one by
// accident.
import {
  assertDeliveredSize as assertStillSize,
  assertTypeFloor as assertStillTypeFloor,
  assertWithinStage as assertStillWithinStage,
  readPinnedSize,
  readPngSize,
  sizeFor as stillSizeFor,
} from "#shared/chart-beat/sizes.mjs";
import {
  assertDeliveredSize as assertVideoSize,
  sizeFor as videoSizeFor,
} from "#shared/chart-video/sizes.mjs";
import { ChoroplethStill } from "./ChoroplethStill.tsx";
import {
  CHOROPLETH_BREAKS,
  CHOROPLETH_STUDY,
  en,
  joinValues,
  ratioClaimViolations,
  assertRampReads,
  dataRampEnd,
  sequentialRamp,
  valuesFromCsv,
} from "./geo-choropleth.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const ENTRY = join(HERE, "index.ts");
const BEAT_ID = "mapgen-choropleth-video";

/** The story's own constants: the confirmed title, its source, its subject, its comparison. */
// The colours are READ, not typed — see `PALETTE.md` beside this file.
const PALETTE = readPalette(HERE, { stopAt: join(HERE, "..") });
console.log(
  `palette from ${PALETTE.source} — ground ${PALETTE.ground}, accent ${PALETTE.accent}, ` +
    `chosen by ${PALETTE.origin}`,
);

const BEAT = {
  year: 2023,
  ground: PALETTE.ground,
  accent: PALETTE.accent,
  subject: "POL",
  subjectLabel: "Poland",
  comparison: "SWE",
  comparisonLabel: "Sweden",
  /** Checked below against the actual joined values, not assumed: 7.307086 / 3.4789953 ≈ 2.10. */
  minRatio: 2,
  title:
    "Poland's per-capita CO₂ emissions are more than double Sweden's, despite both being EU member states.",
  source: "Source: Global Carbon Budget 2025, via Our World in Data · 2023 data",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
  legendCaption: "Tonnes of CO₂ per person",
  caveat:
    "Territorial emissions: excludes emissions embedded in imported goods and international aviation.",
  noDataLabel: "no data",
};

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

// THE JOURNALIST'S DECISION, READ RATHER THAN RETYPED. Gate 2c pins a size; this beat records it in
// its own `BRIEF.md` front matter; `readPinnedSize` throws naming every path it looked at if it is
// missing. Before this the size was two literals in each component and two more below, compared
// against each other by `renderStill` — so they agreed by construction and the pin reached nothing.
// One pin serves both genres: a beat is pinned, not a genre of it.
const pinnedSize = await readPinnedSize(HERE, { readFile, dirname, join });
// `--size <name>` renders one of the OTHER two, into `sizes/`, so all three can be opened and
// compared. Deliberately NOT a way to change what this beat delivers: the delivered files keep the
// beat's own names and the pinned size, and an override says so on stdout and writes elsewhere.
const sizeFlag = argv.indexOf("--size");
const size = sizeFlag === -1 ? pinnedSize : argv[sizeFlag + 1];

const dataPath = flag("--data", join(HERE, "co2-per-capita-2023.csv"));
const outDir = flag(
  "--out",
  sizeFlag === -1 ? join(HERE, "render") : join(HERE, "sizes"),
);
const stem = (name) => (sizeFlag === -1 ? name : `${name}-${size}`);
if (sizeFlag !== -1)
  console.log(
    `LOOKING at ${size}; the pinned size stays ${pinnedSize} -> ${outDir}`,
  );
// Both plates are frozen BESIDE THE BEAT, exactly as the csv and the geojson are: `/tmp` cannot be
// committed, so a render reading its basemap from there leaves a still and an mp4 nobody can
// reproduce or audit — and MapTiler restyles, so a re-bake months later is a different picture
// under the same shapes.
const stillPlate = flag("--still-plate", join(HERE, "plate-496"));
const videoPlate = flag("--video-plate", join(HERE, "plate-620"));
const wantStill = argv.includes("--still");
const wantFinalFrame = argv.includes("--final-frame");
const wantVideo = argv.includes("--video");

// ── The data, the join, the claim ──────────────────────────────────────────────────────────────
const values = valuesFromCsv(await readFile(dataPath, "utf8"), BEAT.year);
const joined = joinValues(CHOROPLETH_STUDY, values);
console.log(
  `join: ${joined.matched} of ${CHOROPLETH_STUDY.length} shapes carry a ${BEAT.year} value; ` +
    `${joined.noData.length} declared no-data (${joined.noData.join(", ") || "none"})`,
);

const violations = ratioClaimViolations({
  values,
  subject: BEAT.subject,
  comparison: BEAT.comparison,
  minRatio: BEAT.minRatio,
});
if (violations.length === 0) {
  const ratio = values.get(BEAT.subject) / values.get(BEAT.comparison);
  console.log(
    `claim: supported by the source. ${BEAT.subjectLabel} ${en(values.get(BEAT.subject), 2)} / ` +
      `${BEAT.comparisonLabel} ${en(values.get(BEAT.comparison), 2)} = ${en(ratio, 2)}x.`,
  );
} else {
  console.log(
    `claim: NOT SUPPORTED by the source, in ${violations.length} way(s):\n  ` +
      violations.join("\n  "),
  );
  throw new Error("claim check failed — refusing to render a title the source does not support");
}

// ── The alt, measured against this study set and against the frame it is drawn in ──────────────
// Two claims used to be typed here and neither survived checking. Sweden was called "the
// lightest-marked comparison on the same scale" — it ranks 37th of 41, and Albania, Moldova and
// two others are lighter; read as "the comparison, marked light" it is fine, read as written it is
// false. And "each of 41 countries is shaded" is true of the JOIN and not of the PICTURE: the
// plate's bounds cut through five of the shapes, Ukraine most visibly, so a reader counting
// countries in the frame cannot get to 41.
const ranked = [...values.entries()]
  .filter(([code]) => CHOROPLETH_STUDY.includes(code))
  .sort((a, b) => a[1] - b[1]);
const comparisonRank = ranked.findIndex(([code]) => code === BEAT.comparison) + 1;
const [lightestCode, lightestValue] = ranked[0];
console.log(
  `${BEAT.comparisonLabel} ranks ${comparisonRank} of ${ranked.length} from the bottom ` +
    `(${en(values.get(BEAT.comparison), 2)} t); the lightest is ${lightestCode} at ${en(lightestValue, 2)} t.`,
);

/** Which shapes this plate's own bounds cut through — any ring point outside the frame. */
function clippedShapes(geometry) {
  const cut = [];
  for (const shape of geometry.shapes) {
    const outside = shape.parts.some((part) =>
      part.some((ring) =>
        ring.some(
          ([x, y]) =>
            x < 0 || y < 0 || x > geometry.frame.width || y > geometry.frame.height,
        ),
      ),
    );
    if (outside) cut.push(shape.name ?? shape.key);
  }
  return cut;
}

function altFor(geometry) {
  const cut = clippedShapes(geometry);
  // The plate carries each shape's own name, so the lightest country is named from the same source
  // the picture is drawn from rather than from a second table that could drift out of step.
  const nameOf = (code) =>
    geometry.shapes.find((shape) => shape.key === code)?.name ?? code;
  return (
    `Map of Europe. All ${CHOROPLETH_STUDY.length} countries in the study set are shaded by their ` +
    `${BEAT.year} per-capita CO2 emissions, from a light shade under 2 tonnes to a dark shade at 10 ` +
    `tonnes and above; the frame cuts through ${cut.length} of them (${cut.join(", ")}), which are ` +
    `shaded but not wholly visible. Poland, outlined and named, is in the 6-to-8-tonne class at ` +
    `${en(values.get(BEAT.subject), 1)} tonnes per person — more than double Sweden's ` +
    `${en(values.get(BEAT.comparison), 1)} tonnes. Sweden is the comparison, not the minimum: it is ` +
    `${comparisonRank}th lightest of ${ranked.length}, and the lightest shading on the map belongs to ` +
    `${nameOf(lightestCode)} at ${en(lightestValue, 1)} tonnes.`
  );
}

const furniture = deriveFurniture(BEAT.ground);
// THE SHADING IS THE DATA. Until 2026-08-10 this ramp ran ground -> furniture.ink — computed
// between the background and the ink, so it never touched the recorded accent, and a newsroom
// could change its house colour while this map stayed grey (`AUDIT-W2-palette-credits.md` H3).
// `dataRampEnd` walks the accent toward the pole the ground is not; `assertRampReads` then
// measures the finished classes: monotone, separated, top class above the 3:1 mark floor.
const ramp = assertRampReads(
  sequentialRamp(
    BEAT.ground,
    dataRampEnd(BEAT.accent, BEAT.ground),
    CHOROPLETH_BREAKS.length + 1,
    0.1,
    0.78,
  ),
  BEAT.ground,
  "the per-capita CO2 choropleth ramp",
);

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
  breaks: CHOROPLETH_BREAKS,
  ramp,
  rows: joined.rows,
  title: BEAT.title,
  source: BEAT.source,
  basemapCredit: BEAT.basemapCredit,
  legendCaption: BEAT.legendCaption,
  caveat: BEAT.caveat,
  noDataLabel: BEAT.noDataLabel,
  ground: BEAT.ground,
  accent: BEAT.accent,
  ...furniture,
  subject: BEAT.subject,
  subjectLabel: BEAT.subjectLabel,
  subjectValue: values.get(BEAT.subject),
  comparisonLabel: BEAT.comparisonLabel,
  comparisonValue: values.get(BEAT.comparison),
};

await mkdir(outDir, { recursive: true });

// ── Rung 1: the still ──────────────────────────────────────────────────────────────────────────
if (wantStill) {
  // The STATIC genre's size table — the same one every static chart beat reads, and deliberately
  // not a fourth copy of it. `minTypePx` is "12 CSS px at the distance this output is read", and a
  // static map sits in the same ~900px article column a static chart does.
  const { width, height } = stillSizeFor(size);
  console.log(`still at ${size} (${width}x${height})`);
  const { geometry, plate } = await plateOf(stillPlate);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(ChoroplethStill, {
      ...shared,
      geometry,
      plate,
      alt: altFor(geometry),
      size,
    }),
    width,
    height,
    // 1:1 — the frame IS the export size, so the PNG on disk measures what gate 2c pinned. The
    // default 2 belongs to the frames that have not moved to the table yet.
    scale: 1,
    outDir,
    name: stem("static"),
  });

  // THE DELIVERED FILE, MEASURED FROM ITS OWN BYTES. Not the element, not the arguments — the PNG
  // on disk. It is the one reading the code that wrote it cannot make agree with itself.
  assertStillSize(readPngSize(await readFile(pngPath)), size, { what: pngPath });
  const svg = await readFile(svgPath, "utf8");
  assertStillTypeFloor(svg, size, { what: "mapgen-choropleth-video (static)" });
  assertStillWithinStage(svg, size, {
    what: "mapgen-choropleth-video (static)",
  });
  console.log(
    `still → ${pngPath} at ${width}x${height}, verified from the file  ` +
      `(${BEAT.subjectLabel} ${en(shared.subjectValue, 1)} · ` +
      `${BEAT.comparisonLabel} ${en(shared.comparisonValue, 1)})\nNow open it and look at it.`,
  );
}

// ── Rungs 2 and 3: the video ───────────────────────────────────────────────────────────────────
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
 * that letterboxed, or a `--scale` left on a command line, would arrive in the newsroom unnoticed.
 */
function mp4Size(path) {
  const probe = spawnSync(
    "ffprobe",
    [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height",
      "-of", "csv=p=0",
      path,
    ],
    { encoding: "utf8" },
  );
  if (probe.status !== 0)
    throw new Error(`ffprobe could not read ${path}: ${probe.stderr}`);
  const [width, height] = probe.stdout.trim().split(",").map(Number);
  if (!Number.isFinite(width) || !Number.isFinite(height))
    throw new Error(`ffprobe returned no dimensions for ${path}: ${probe.stdout}`);
  return { width, height };
}

if (wantFinalFrame || wantVideo) {
  // The VIDEO genre's own size table — landscape floor 30 against the static's 26, because a
  // landscape video is watched on a phone turned sideways rather than read in an article column.
  const { width, height } = videoSizeFor(size);
  // `remotion still` / `remotion render` select a beat by composition id and nothing else, so the
  // size travels in the id. `Root.tsx` builds one composition per row of the same table.
  const composition = `${BEAT_ID}-${size}`;
  console.log(`video at ${size} (${width}x${height}) — composition ${composition}`);
  const { geometry, plate } = await plateOf(videoPlate);
  const propsPath = join(outDir, `${stem("video-props")}.json`);
  await writeFile(
    propsPath,
    JSON.stringify({ ...shared, geometry, plate, alt: altFor(geometry), size }),
  );

  const framePath = join(outDir, `${stem("final-frame")}.png`);
  const stillSeconds = remotion([
    "still",
    ENTRY,
    composition,
    framePath,
    "--frame=-1",
    `--props=${propsPath}`,
    "--timeout=180000",
  ]);
  // The final frame, measured from its own IHDR — not from the arguments that drew it.
  assertVideoSize(readPngSize(await readFile(framePath)), size, {
    what: framePath,
  });
  console.log(
    `final frame (--frame=-1) → ${framePath}  [${stillSeconds}s], verified from the file`,
  );

  if (wantVideo) {
    const videoPath = join(outDir, `${stem("choropleth")}.mp4`);
    const videoSeconds = remotion([
      "render",
      ENTRY,
      composition,
      videoPath,
      `--props=${propsPath}`,
      "--concurrency=1",
      "--timeout=180000",
    ]);
    // And the DELIVERED mp4, out of the container itself. This is the assertion the whole size
    // decision rests on for the video genre: everything upstream of it agrees by construction.
    assertVideoSize(mp4Size(videoPath), size, { what: videoPath });
    console.log(
      `video → ${videoPath}  [${videoSeconds}s], verified from the container\n` +
        `Now extract frames with ffmpeg and look at them.`,
    );
  }
}

if (!wantStill && !wantFinalFrame && !wantVideo)
  console.log("nothing asked for. Pass --still, --final-frame or --video.");
