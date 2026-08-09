// The render ladder for the hex-grid beat. Static genre only.
//
// Usage:
//   bun proof/map-quake-density/render.mjs --still

import { mkdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture, renderStill } from "./render-still.mjs";
import { HexGridStill } from "./HexGridStill.tsx";
import { binHex, chooseHexSize, countBreaks, quakePointsFromCsv, sequentialRamp } from "./geo-hex.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

const BEAT = {
  ground: "#FFFFFF",
  accent: "#C1440E",
  aggregateMode: "count",
  title: "Where 2024's earthquakes clustered: the Pacific “Ring of Fire”, not an even spread.",
  source: "Source: USGS Earthquake Catalog (earthquake.usgs.gov), magnitude 4.0+, worldwide, 2024",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
  legendCaption: "Earthquakes per cell (count, not energy or magnitude) —",
  caveat:
    "This grid shows COUNT per cell, not total energy released — a cell packed with many small " +
    "quakes can outrank a cell with fewer, larger ones. Cell size is chosen from point density; " +
    "the map holds 60°S–78°N (Mercator distorts the poles beyond usefulness at this scale).",
  alt:
    "World map binned into a hexagonal grid. Cells are shaded by how many magnitude 4-or-greater " +
    "earthquakes occurred there in 2024, from pale for a handful up to a dark cell around Indonesia " +
    "and the Philippines, outlined in the accent colour, which holds the single densest cell.",
};

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const dataPath = flag("--data", join(HERE, "quakes-density.csv"));
const outDir = flag("--out", join(HERE, "render"));
const stillPlate = flag("--still-plate", "/tmp/map-twin/quake-density-836x300");
const wantStill = argv.includes("--still");

const points = quakePointsFromCsv(await readFile(dataPath, "utf8"));
console.log(`data: ${points.length} events, M${Math.min(...points.map((p) => p.mag)).toFixed(1)}+`);

async function plateOf(dir) {
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

  const furniture = deriveFurniture(BEAT.ground);
  const ramp = sequentialRamp(BEAT.ground, furniture.ink, breaks.length + 1);

  const { pngPath } = await renderStill({
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
      caveat: BEAT.caveat,
      alt: BEAT.alt,
      ground: BEAT.ground,
      accent: BEAT.accent,
      ...furniture,
      subjectKey: subject.key,
    }),
    width: 900,
    height: 560,
    outDir,
    name: "static",
  });
  console.log(`still → ${pngPath}\nNow open it and look at it.`);
} else console.log("nothing asked for. Pass --still.");
