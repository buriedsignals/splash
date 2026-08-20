// stories/stress-m-forest-loss/beats/forest-loss/render-still.mjs
//
// Rung 1 of the ladder (format: video, but the ladder is still-first). Reads the frozen csv, runs
// the join AS DECLARED (FOREST_STUDY carries the ministry's own `SDS` unaliased — see BRIEF.md,
// "The join, both directions": aliasing it toward `SSD` is what actually FAILS in this tree).
//
// Usage: bun stories/stress-m-forest-loss/beats/forest-loss/render-still.mjs

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { deriveFurniture, readPalette, renderStill, assertDrawnInActiveTypeface } from "#shared/chart-beat/render-still.mjs";
import { ForestMapStill } from "./ForestMapStill.tsx";
import { FOREST_STUDY, dataRampEnd, joinShapes, joinValues, rowsFromCsv, sequentialRamp, assertRampReads } from "./geo-forest.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY_ROOT = resolve(HERE, "../..");
const dataPath = join(STORY_ROOT, "source/data.csv");
const plateDir = join(HERE, "plate-still");
const outDir = join(HERE, "renders");

const PALETTE = readPalette(STORY_ROOT, { stopAt: dirname(STORY_ROOT) });

const rows = rowsFromCsv(await readFile(dataPath, "utf8"));
console.log(`read ${rows.length} rows, codes: ${rows.map((r) => r.code).join(", ")}`);

const geometry = JSON.parse(await readFile(join(plateDir, "geometry.json"), "utf8"));

// ── The join, as declared: no alias. Rule 5 says ADM0_A3, never ISO_A3 — and Natural Earth's own
// ADM0_A3 for South Sudan happens to BE `SDS`, the ministry's own code. Aliasing it toward `SSD`
// (which is what the article's own wording, read literally, suggests) is what FAILS in this tree —
// see BRIEF.md's verbatim record of both attempts. ─────────────────────────────────────────────
const shapes = joinShapes(FOREST_STUDY, geometry.shapes);
console.log(`shape join: all ${shapes.length} declared countries found a shape (no alias needed — ADM0_A3 for South Sudan IS "SDS" in this tree's own countries.geojson).`);
const values = new Map(rows.map((r) => [r.code, r.loss_ha]));
const joined = joinValues(FOREST_STUDY, values);
console.log(`value join: ${joined.matched} of ${FOREST_STUDY.length} shapes carry a value.`);

// ── The claim, checked by hand (groundTakeaway returns [] for "Brazil leads the annual figures
// again." — no numeral, no year, no "highest/lowest" — see BRIEF.md) ──────────────────────────
const topRow = rows.reduce((a, b) => (b.loss_ha > a.loss_ha ? b : a));
if (topRow.code !== "BRA") throw new Error(`"Brazil leads" is false: ${topRow.country} (${topRow.loss_ha}) is higher.`);
console.log(`claim check (by hand): Brazil (${topRow.loss_ha} ha) IS the highest of the ${rows.length} declared countries — true.`);

const somaliland = "Natural Earth splits the Horn of Africa into Somalia (SOM, the code the ministry publishes) and Somaliland (SOL, an unrecognised breakaway region NOT in this study set). Somaliland's own shape is drawn in the plain background land colour, not the no-data grey — it was never declared, so it is out of scope rather than silently missing.";
console.log(`note: ${somaliland}`);

const furniture = deriveFurniture(PALETTE.ground);
const ramp = assertRampReads(sequentialRamp(PALETTE.ground, dataRampEnd(PALETTE.accent, PALETTE.ground), 5, 0.1, 0.78), PALETTE.ground, "the forest-loss ramp");
const breaks = [50000, 150000, 350000, 700000];

const namesByCode = Object.fromEntries(rows.map((r) => [r.code, r.country]));

const props = {
  geometry: { frame: geometry.frame, shapes },
  plate: `data:image/png;base64,${(await readFile(join(plateDir, "plate.png"))).toString("base64")}`,
  rows: joined.rows,
  namesByCode,
  breaks,
  ramp,
  overline: "Forest loss in 2025",
  title: "Brazil lost more forest than any other single country in 2025.",
  subtitle: "1,120,000 hectares in Brazil — nearly double Congo DR, the next highest (588,000 ha). The other six together lost more (1,582,000 ha), but not one of them alone came close.",
  source: "Source: ministry table, frozen 2026-08 · codes are the ministry's own, incl. SDS for South Sudan",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
  caveat: "South Sudan's code, SDS, is read directly — aliasing it to ISO's SSD fails the join instead (see BRIEF.md).",
  alt:
    "A wide band map from South America to Southeast Asia, shading seven countries by their 2025 forest loss in hectares. " +
    "Brazil, outlined and labelled, is the darkest at 1,120,000 hectares. A ranked list below the map gives the exact " +
    "figure for every country from Brazil down to South Sudan's 39,000 hectares.",
  ground: PALETTE.ground,
  accent: PALETTE.accent,
  ink: furniture.ink,
  muted: furniture.muted,
  subject: "BRA",
};

const element = createElement(ForestMapStill, props);
assertDrawnInActiveTypeface(renderToStaticMarkup(element), { where: "the forest-loss map" });
const { pngPath } = await renderStill({ element, width: 900, height: 560, outDir, name: "forest-loss-still" });
console.log(`still → ${pngPath}\nNow open it and look at it.`);
