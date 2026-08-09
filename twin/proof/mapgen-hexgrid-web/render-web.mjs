// twin/proof/mapgen-hexgrid-web/render-web.mjs
//
// This beat's own WEB runner, and this beat's OWN physical copy of the web genre's machinery
// (`renderHexGridWeb`, modelled on `twin-map-web/scripts/render-web.mjs`'s own `renderMapWeb`) —
// nothing in this file imports out of a skill or another `proof/` beat. Binning happens AFTER the
// bake, from the baked points' own pixel coordinates, the same order
// `proof/map-quake-density/render.mjs` follows for its own static genre
// (`twin-map-beat/references/types/hex-grid.md`'s own cell-size rule: check the rendered cell
// count, never the config value alone).
//
// Usage:  bun proof/mapgen-hexgrid-web/render-web.mjs [outDir] [--data <csv>]

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { deriveFurniture, measureText } from "./render-still.mjs";
import { HexGridWeb, DensityTable, LAYOUTS } from "./HexGridWeb.tsx";
import {
  chooseHexSize,
  countBreaks,
  quakePointsFromCsv,
  sequentialRamp,
  pixelToLonLat,
} from "./geo-hex.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

// ===== CONFIG — this beat's own words =====
const BEAT = {
  ground: "#FFFFFF",
  accent: "#C1440E",
  aggregateMode: "count",
  title:
    "2024's earthquakes clustered along tectonic plate boundaries — the Pacific “Ring of Fire” most densely, not spread evenly across the globe.",
  source: "Source: USGS Earthquake Catalog (earthquake.usgs.gov), magnitude 4.0+, worldwide, 2024",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
  legendCaption: "Earthquakes per cell (count, not energy or magnitude)",
};
// The desktop layout's own map size — `bake-plate.mjs` bakes the ONE plate at EXACTLY this pixel
// size (`HexGridWeb.tsx`'s `DESKTOP_LAYOUT`), so the desktop SVG never scales the raster at all;
// only the narrow layout scales it down.
const PLATE_WIDTH = 836;
const PLATE_HEIGHT = 520;
const DEFAULT_PLATE_DIR = `/tmp/mapgen-hexgrid-web/plate-${PLATE_WIDTH}x${PLATE_HEIGHT}`;
const DEFAULT_DATA_PATH = join(HERE, "quakes-density.csv");
const DEFAULT_OUT_DIR = "/tmp/mapgen-hexgrid-web-render";
const OUTPUT_NAME = "hex-grid.html";
// ===========================================

/**
 * SSRs one React element per entry in `layouts` (the map itself), SSRs `table` ONCE (the same
 * ranked cells do not need saying twice per layout — see `HexGridWeb.tsx`'s own doc-comment on
 * `DensityTable`), wraps both in one self-contained HTML file and writes it to disk.
 */
async function renderHexGridWeb({ component, table, layouts, props, outDir, name }) {
  const furniture = deriveFurniture(props.ground);
  const svgs = layouts.map((layout) =>
    renderToStaticMarkup(
      createElement(component, { ...props, ...furniture, measure: measureText, layout }),
    ),
  );
  const tableHtml = renderToStaticMarkup(
    createElement(table, {
      cells: props.cells,
      breaks: props.breaks,
      subjectKey: props.subjectKey,
      ...furniture,
    }),
  );

  const interactionSource = await readFile(join(HERE, "interaction.mjs"), "utf8");
  const inlineScript = inlineable(interactionSource);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(props.title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${buildCss({ ground: props.ground, accent: props.accent, ...furniture })}
</style>
</head>
<body>
<figure class="map-figure">
${svgs.join("\n")}
</figure>
${tableHtml}
<div id="tooltip" role="status" aria-live="polite" hidden></div>
<script>
${inlineScript}
</script>
</body>
</html>
`;

  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, name);
  await writeFile(outPath, html);
  return { outPath, layouts: layouts.length };
}

/** Strips the `export` keyword from each top-level declaration — see `interaction.mjs`'s own
 *  header note for why. */
function inlineable(moduleSource) {
  return moduleSource.replace(/^export /gm, "");
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildCss({ ground, accent, ink, muted }) {
  return `
:root {
  --ground: ${ground};
  --accent: ${accent};
  --ink: ${ink};
  --muted: ${muted};
}
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 16px;
  background: var(--ground);
  color: var(--ink);
  font-family: Helvetica, Arial, sans-serif;
}
.map-figure { margin: 0 0 24px; max-width: 900px; }
svg.map { display: block; width: 100%; height: auto; }
/* Two pre-rendered layouts — the narrow one hidden by default, swapped in below a fixed
   breakpoint. No layout is computed in the browser; the media query only chooses which
   server-rendered frame is on screen. */
svg.map[data-layout="narrow"] { display: none; }
@media (max-width: 480px) {
  svg.map[data-layout="desktop"] { display: none; }
  svg.map[data-layout="narrow"] { display: block; }
}
/* A hex cell's own fill already carries the data encoding, unlike a symbol map's invisible hit
   circle, so hover/focus cannot swap the fill without erasing that encoding — the highlight is a
   stroke instead. */
.pt { cursor: pointer; }
.pt:hover, .pt:focus, .pt-active {
  stroke: var(--ink) !important;
  stroke-width: 2.5px !important;
  outline: none;
}
.pt:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 1px;
}
#tooltip {
  position: fixed;
  max-width: 260px;
  padding: 6px 10px;
  font-size: 13px;
  line-height: 1.3;
  background: var(--ground);
  color: var(--ink);
  border: 1px solid var(--muted);
  border-radius: 3px;
  pointer-events: none;
  z-index: 10;
}
#tooltip[hidden] { display: none; }
/* The accessible table (HexGridWeb.tsx's DensityTable): a real, always-visible table, not a
   screen-reader-only trick — see the type's own accessibility adaptation in HexGridWeb.tsx's
   header. Deliberately long (one row per non-empty cell) and never truncated. */
.density-table {
  max-width: 900px;
  border-collapse: collapse;
  font-size: 14px;
}
.density-table caption {
  text-align: left;
  font-size: 12.5px;
  color: var(--muted);
  margin-bottom: 8px;
}
.density-table th, .density-table td {
  text-align: left;
  padding: 5px 16px 5px 0;
  border-bottom: 1px solid var(--muted);
}
.density-table tr.subject th, .density-table tr.subject td {
  color: var(--accent);
  font-weight: 700;
}
`.trim();
}

/** Bakes the plate if it is not already at `plateDir`. */
async function ensurePlate(plateDir) {
  if (existsSync(join(plateDir, "geometry.json")) && existsSync(join(plateDir, "plate.png")))
    return;
  await mkdir(plateDir, { recursive: true });
  const result = spawnSync(
    "bun",
    [
      join(HERE, "bake-plate.mjs"),
      "--width",
      String(PLATE_WIDTH),
      "--height",
      String(PLATE_HEIGHT),
      "--out",
      plateDir,
    ],
    { cwd: resolve(HERE, "../../.."), stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error(`bake-plate.mjs exited with ${result.status}`);
}

async function loadPlate(plateDir) {
  const geometry = JSON.parse(await readFile(join(plateDir, "geometry.json"), "utf8"));
  const png = await readFile(join(plateDir, "plate.png"));
  return { geometry, plate: `data:image/png;base64,${png.toString("base64")}` };
}

/** This beat's own runner: bakes the plate if missing, reads the CSV, bins hex cells from the
 *  BAKED (projected) points — bake first, bin second — computes class breaks, the densest/median
 *  ratio the claim rests on, and hands everything to `renderHexGridWeb`. */
async function render({ dataPath, plateDir, outDir, name = OUTPUT_NAME }) {
  const csv = await readFile(dataPath, "utf8");
  const csvRows = csv.trim().split(/\r?\n/).length - 1; // minus header
  const points = quakePointsFromCsv(csv);
  console.log(`data: ${csvRows} csv data rows, ${points.length} parsed as valid points`);
  if (points.length < 8) throw new Error(`need enough points for a density surface, got ${points.length}`);

  await ensurePlate(plateDir);
  const { geometry, plate } = await loadPlate(plateDir);
  console.log(
    `plate: ${geometry.frame.width}x${geometry.frame.height}, gated by ${geometry.gatedBy}, ` +
      `${geometry.points.length}/${points.length} points on-frame`,
  );

  const { size: hexSize, cells } = chooseHexSize(geometry.points, geometry.frame, {
    targetCells: 220,
    maxCells: 400,
  });
  console.log(
    `hex grid: size ${hexSize.toFixed(1)}px, ${cells.length} nonempty cells (of a possible many more empty ones, dropped)`,
  );

  const breaks = countBreaks(cells.map((c) => c.count));
  console.log(`class breaks (count): ${breaks.join(", ")}`);

  const subject = cells.reduce((max, c) => (c.count > max.count ? c : max), cells[0]);
  const sortedCounts = [...cells.map((c) => c.count)].sort((a, b) => a - b);
  const median = sortedCounts[Math.floor(cells.length / 2)];
  const ratio = subject.count / median;

  // The claim check: the subject really must be the max, and the distribution really must be
  // uneven (top cell far above the median) — both measured, not assumed.
  if (!cells.every((c) => c.count <= subject.count))
    throw new Error("subject is not actually the densest cell");
  console.log(
    `densest cell: ${subject.count} events at pixel (${subject.cx.toFixed(0)}, ${subject.cy.toFixed(0)})`,
  );
  console.log(
    `claim: densest cell (${subject.count}) is ${ratio.toFixed(1)}x the median nonempty cell (${median}) — supported.`,
  );

  // Where the subject cell actually IS, in the real world — a render audit caught the alt text
  // naming "Indonesia, the Philippines and Japan" while the true densest cell (same 1374-event
  // count the alt text already quoted correctly) sits in the South Pacific near Tonga, ~169.6°W
  // 21°S; the Indonesia/Philippines cell is real but is the SECOND-densest (1371, three fewer),
  // not the subject. `frameCorners` (measured at bake time via `map.unproject`, not the nominal
  // `bounds` fitBounds was asked for — see bake-plate.mjs) makes this derivable instead of a
  // hand-typed place name that can silently point at the wrong cell.
  if (!geometry.frameCorners)
    throw new Error("plate geometry has no frameCorners — re-bake with the current bake-plate.mjs");
  const subjectLonLat = pixelToLonLat(subject.cx, subject.cy, geometry.frameCorners, geometry.frame);
  const subjectLatLabel = `${Math.abs(subjectLonLat.lat).toFixed(0)}°${subjectLonLat.lat < 0 ? "S" : "N"}`;
  const subjectLonLabel = `${Math.abs(subjectLonLat.lon).toFixed(0)}°${subjectLonLat.lon < 0 ? "W" : "E"}`;
  console.log(`densest cell location: ${subjectLonLat.lon.toFixed(1)}, ${subjectLonLat.lat.toFixed(1)}`);

  const furniture = deriveFurniture(BEAT.ground);
  const ramp = sequentialRamp(BEAT.ground, furniture.ink, breaks.length + 1);

  const legendCaption = `${BEAT.legendCaption} — aggregate mode: ${BEAT.aggregateMode}`;
  const caveat =
    `This grid shades cells by COUNT of magnitude 4.0+ earthquakes, not by total energy released — a cell packed ` +
    `with many small quakes can outrank one with fewer, larger ones. Cell size (${hexSize.toFixed(0)}px) is chosen from ` +
    `point density and grows until the ${cells.length}-cell grid clears a fixed cap. The densest cell holds ` +
    `${ratio.toFixed(1)}× the median non-empty cell's count. The map holds 60°S–78°N (Mercator distorts ` +
    `the poles beyond usefulness at this scale).`;
  const alt =
    `World map binned into a hexagonal grid, ${cells.length} non-empty cells. Cells are shaded by how many ` +
    `magnitude 4-or-greater earthquakes occurred there in 2024, from pale for a handful up to a dark cell in ` +
    `the South Pacific near ${subjectLatLabel}, ${subjectLonLabel} (the Tonga-Kermadec trench), outlined in ` +
    `the accent colour, which holds the single densest cell (${subject.count} events, ${ratio.toFixed(1)}× ` +
    `the median nonempty cell).`;

  const { outPath } = await renderHexGridWeb({
    component: HexGridWeb,
    table: DensityTable,
    layouts: LAYOUTS,
    props: {
      geometry,
      plate,
      cells,
      hexSize,
      breaks,
      ramp,
      subjectKey: subject.key,
      title: BEAT.title,
      source: BEAT.source,
      basemapCredit: BEAT.basemapCredit,
      legendCaption,
      caveat,
      alt,
      ground: BEAT.ground,
      accent: BEAT.accent,
    },
    outDir,
    name,
  });
  return { outPath, cells: cells.length, ratio, points: points.length, csvRows };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flag = (name, fallback) => {
    const at = argv.indexOf(name);
    return at >= 0 ? argv[at + 1] : fallback;
  };
  const positional = argv.find((a) => !a.startsWith("--"));
  const dataPath = resolve(flag("--data", DEFAULT_DATA_PATH));
  const plateDir = resolve(flag("--plate", DEFAULT_PLATE_DIR));
  const outDir = resolve(positional ?? flag("--out", DEFAULT_OUT_DIR));

  const { outPath, cells, ratio, points, csvRows } = await render({ dataPath, plateDir, outDir });
  console.log(
    `map-web hex-grid beat → ${outPath}  [${points} points from ${csvRows} csv rows, ${cells} nonempty cells, ${ratio.toFixed(1)}x densest/median]`,
  );
}

export {
  render,
  renderHexGridWeb,
  ensurePlate,
  loadPlate,
  BEAT,
  PLATE_WIDTH,
  PLATE_HEIGHT,
  DEFAULT_PLATE_DIR,
  DEFAULT_DATA_PATH,
};
