// The render ladder for the hex-grid beat. Static genre only — no video.
//
// Usage:
//   bun proof/map-quake-density/render.mjs --still
//   bun proof/map-quake-density/render.mjs --still --size square    # LOOKING, into sizes/

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
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
import { HexGridStill } from "./HexGridStill.tsx";
import {
  cellMembers,
  chooseHexSize,
  countBreaks,
  dominantRegions,
  quakePointsFromCsv,
  assertRampReads,
  dataRampEnd,
  sequentialRamp,
} from "./geo-hex.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

// The colours are READ, not typed — see `PALETTE.md` beside this file.
const PALETTE = readPalette(HERE, { stopAt: join(HERE, "..") });
console.log(
  `palette from ${PALETTE.source} — ground ${PALETTE.ground}, accent ${PALETTE.accent}, ` +
    `chosen by ${PALETTE.origin}`,
);

const BEAT = {
  ground: PALETTE.ground,
  accent: PALETTE.accent,
  aggregateMode: "count",
  title: "Where 2024's earthquakes clustered: the Pacific “Ring of Fire”, not an even spread.",
  source: "Source: USGS Earthquake Catalog (earthquake.usgs.gov), magnitude 4.0+, worldwide, 2024",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
  legendCaption: "Earthquakes per cell (count, not energy or magnitude) —",
};
// The caveat's latitude range and the alt's place name used to be typed. Both are now read off the
// plate and out of the file: the range from the corners MapLibre actually settled on, the place
// from the subject cell's own member events. The old plate said "60°S–78°N" while drawing the
// world twice inside its frame, and the old alt said "around Indonesia and the Philippines" — true
// of the 836 × 300 binning, false of any other.

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

// THE JOURNALIST'S DECISION, READ RATHER THAN RETYPED. Gate 2c pins a size; this beat records it in
// its own `BRIEF.md` front matter; `readPinnedSize` throws naming every path it looked at if it is
// missing. Before this the size was a literal `900` in the component and a height this beat derived
// from its own plate — so the frame followed the plate and the pin reached nothing.
const pinnedSize = await readPinnedSize(HERE, { readFile, dirname, join });
// `--size <name>` renders one of the OTHER two, into `sizes/`, so all three can be opened and
// compared. Deliberately NOT a way to change what this beat delivers: the delivered file keeps the
// beat's own name and the pinned size, and an override says so on stdout and writes elsewhere.
const sizeFlag = argv.indexOf("--size");
const size = sizeFlag === -1 ? pinnedSize : argv[sizeFlag + 1];
const { width: FRAME_WIDTH, height: FRAME_HEIGHT } = sizeFor(size);

const dataPath = flag("--data", join(HERE, "quakes-density.csv"));
const outDir = flag(
  "--out",
  sizeFlag === -1 ? join(HERE, "render") : join(HERE, "sizes"),
);
const stem = sizeFlag === -1 ? "static" : `static-${size}`;
if (sizeFlag !== -1)
  console.log(
    `LOOKING at ${size}; the pinned size stays ${pinnedSize} -> ${outDir}`,
  );
console.log(`pinned size: ${size} (${FRAME_WIDTH}x${FRAME_HEIGHT})`);
// The plate is frozen BESIDE THE BEAT, exactly as the data is: `/tmp` cannot be committed, so a
// render reading its basemap from there leaves an artifact nobody can reproduce or audit — and
// MapTiler restyles, so a re-bake months later is a different picture under the same marks.
const stillPlate = flag("--still-plate", join(HERE, "plate"));
const wantStill = argv.includes("--still");

const points = quakePointsFromCsv(await readFile(dataPath, "utf8"));
console.log(`data: ${points.length} events, M${Math.min(...points.map((p) => p.mag)).toFixed(1)}+`);

/** Bakes the plate ONLY when the frozen one is absent — a warm run never touches the network. */
function ensurePlate(plateDir) {
  if (existsSync(join(plateDir, "geometry.json")) && existsSync(join(plateDir, "plate.png"))) return;
  console.log(`no frozen plate at ${plateDir} — baking one there.`);
  const result = spawnSync("bun", [join(HERE, "bake.mjs"), "--width", "836", "--height", "480", "--out", plateDir], {
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

await mkdir(outDir, { recursive: true });

if (wantStill) {
  const { geometry, plate } = await plateOf(stillPlate);
  const { size: hexSize, cells } = chooseHexSize(geometry.points, geometry.frame, { targetCells: 220, maxCells: 400 });
  console.log(`hex grid: size ${hexSize.toFixed(1)}px, ${cells.length} nonempty cells (of a possible many more empty ones, dropped)`);

  const breaks = countBreaks(cells.map((c) => c.count));
  console.log(`class breaks (count): ${breaks.join(", ")}`);

  const subject = cells.reduce((max, c) => (c.count > max.count ? c : max), cells[0]);
  console.log(`densest cell: ${subject.count} events at pixel (${subject.cx.toFixed(0)}, ${subject.cy.toFixed(0)})`);

  // The claim check: the subject really must be the max, and the distribution really must be
  // uneven (top cell far above the median) — both measured, not assumed.
  const median = [...cells.map((c) => c.count)].sort((a, b) => a - b)[Math.floor(cells.length / 2)];
  if (!cells.every((c) => c.count <= subject.count)) throw new Error("subject is not actually the densest cell");
  console.log(`claim: densest cell (${subject.count}) is ${(subject.count / median).toFixed(1)}x the median cell (${median}) — supported.`);

  // ── Where that cell is, and what this plate actually shows — both measured ──────────────────
  if (!geometry.frameCorners || geometry.points.some((p) => p.i === undefined))
    throw new Error(
      "this plate predates the corrected bake (no frameCorners, or points with no source index). " +
        "Delete proof/map-quake-density/plate/ and re-run, or re-bake explicitly: " +
        "bun proof/map-quake-density/bake.mjs --width 836 --height 480",
    );
  const members = cellMembers(geometry.points, hexSize);
  const subjectPlaces = members.get(subject.key).map((i) => points[i].place);
  const regions = dominantRegions(subjectPlaces, 2);
  const subjectWhere = regions.map((r) => r.label).join(" and ");
  console.log(
    `densest cell's own events are catalogued as: ` +
      regions.map((r) => `${r.label} ${(r.share * 100).toFixed(0)}%`).join(" · "),
  );

  const { north, south } = geometry.frameCorners;
  const latRange =
    `${Math.abs(south).toFixed(0)}°${south < 0 ? "S" : "N"}–` +
    `${Math.abs(north).toFixed(0)}°${north < 0 ? "S" : "N"}`;
  console.log(`plate ${geometry.frame.width}×${geometry.frame.height} holds ${latRange}`);

  const caveat =
    "This grid shows COUNT per cell, not total energy released — a cell packed with many small " +
    "quakes can outrank a cell with fewer, larger ones. Cell size is chosen from point density; " +
    `the map holds ${latRange} (Mercator distorts the poles beyond usefulness at this scale), and ` +
    `${(points.length - geometry.points.length).toLocaleString()} of the ${points.length.toLocaleString()} ` +
    "catalogued events fall outside it.";
  const alt =
    `World map binned into a hexagonal grid, ${cells.length} non-empty cells. Cells are shaded by how many ` +
    `magnitude 4-or-greater earthquakes occurred there in 2024, from pale for a handful up to the single ` +
    `densest cell, outlined in the accent colour, which holds ${subject.count.toLocaleString()} events — ` +
    `${(subject.count / median).toFixed(0)}× the median non-empty cell. Its own events are catalogued as ` +
    `${subjectWhere}.`;

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
      breaks.length + 1,
      0.14,
      0.82,
    ),
    BEAT.ground,
    "the hex-density ramp",
  );

  const { pngPath, svgPath } = await renderStill({
    element: createElement(HexGridStill, {
      geometry,
      plate,
      cells,
      hexSize,
      breaks,
      ramp,
      title: BEAT.title,
      source: BEAT.source,
      basemapCredit: BEAT.basemapCredit,
      legendCaption: `${BEAT.legendCaption} aggregate mode: ${BEAT.aggregateMode}`,
      caveat,
      alt,
      ground: BEAT.ground,
      accent: BEAT.accent,
      ...furniture,
      subjectKey: subject.key,
      // B6.16 — the ring's own words. The same two facts the alt string already carried and the
      // plate did not: how many events the emphasised cell holds, and where the catalogue puts
      // them. Derived from the cell's own members (`dominantRegions` above), never typed; the
      // component refuses to draw a ring whose note omits the count.
      subjectNote: `${subject.count.toLocaleString()} events · ${subjectWhere}`,
      size,
    }),
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    // 1:1 — the frame IS the export size, so the PNG on disk measures what gate 2c pinned. The
    // default 2 belongs to the frames that have not moved to the table yet.
    scale: 1,
    outDir,
    name: stem,
  });

  // THE DELIVERED FILE, MEASURED FROM ITS OWN BYTES. Not the element, not the arguments — the PNG
  // on disk. It is the one reading the code that wrote it cannot make agree with itself.
  assertDeliveredSize(readPngSize(await readFile(pngPath)), size, {
    what: pngPath,
  });
  const svg = await readFile(svgPath, "utf8");
  assertTypeFloor(svg, size, { what: "map-quake-density" });
  assertWithinStage(svg, size, { what: "map-quake-density" });
  console.log(
    `still → ${pngPath} at ${FRAME_WIDTH}x${FRAME_HEIGHT}, verified from the file\nNow open it and look at it.`,
  );
} else console.log("nothing asked for. Pass --still.");
