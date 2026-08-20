// stories/stress-l-mixed-unit-clinics/beats/mixed-unit-clinics/render-still.mjs
//
// The one rung this beat needs (format: static). Reads the frozen csv, runs the join TWICE — once
// per unit — and refuses to ever combine COUNT and RATE into one scale. Runs the join, prints it
// verbatim, then draws the still.
//
// Usage: bun stories/stress-l-mixed-unit-clinics/beats/mixed-unit-clinics/render-still.mjs

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  deriveFurniture,
  readPalette,
  renderStill,
  assertDrawnInActiveTypeface,
} from "#shared/chart-beat/render-still.mjs";
import { ClinicsMapStill } from "./ClinicsMapStill.tsx";
import {
  COUNT_STUDY,
  RATE_STUDY,
  dataRampEnd,
  joinShapes,
  joinValues,
  rowsFromCsv,
  sequentialRamp,
  assertRampReads,
} from "./geo-clinics.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY_ROOT = resolve(HERE, "../..");
const dataPath = join(STORY_ROOT, "source/data.csv");
const plateDir = join(HERE, "plate");
const outDir = join(HERE, "renders");

const PALETTE = readPalette(STORY_ROOT, { stopAt: dirname(STORY_ROOT) });
// No TYPEFACE.md exists anywhere in stories/ or proof/ — only each skill's own directory carries
// a default one (`skills/map-beat/TYPEFACE.md`), found by the seed's OWN render-map.mjs because it
// searches within the skill's own tree. No sibling story beat in this tree calls
// readTypeface/useTypeface at all (confirmed: grep over stories/ and proof/ finds none besides the
// skill seeds themselves) — this beat follows that same, already-established convention rather
// than inventing a new required file no other beat in the tree has.

const rows = rowsFromCsv(await readFile(dataPath, "utf8"));
const countRows = rows.filter((r) => r.unit === "clinics");
const rateRows = rows.filter((r) => r.unit === "per 100k");
console.log(
  `read ${rows.length} rows: ${countRows.length} report a COUNT (unit="clinics"), ` +
    `${rateRows.length} report a RATE (unit="per 100k"). Never joined onto one scale.`,
);

const geometry = JSON.parse(await readFile(join(plateDir, "geometry.json"), "utf8"));
const shapes = joinShapes([...COUNT_STUDY, ...RATE_STUDY], geometry.shapes);
console.log(`shape join: all ${shapes.length} declared countries found a shape in countries.geojson.`);

const countJoin = joinValues(COUNT_STUDY, countRows);
console.log(`COUNT join: ${countJoin.matched} of ${COUNT_STUDY.length} shapes carry a value.`);
const rateJoin = joinValues(RATE_STUDY, rateRows);
console.log(`RATE join: ${rateJoin.matched} of ${RATE_STUDY.length} shapes carry a value.`);

// ── The article's last line, checked by hand (groundTakeaway returns [] for this sentence — see
// BRIEF.md, "The article's last line, checked by hand") ─────────────────────────────────────────
const germanyCount = countRows.find((r) => r.code === "DEU").value;
const topCount = countRows.reduce((a, b) => (b.value > a.value ? b : a));
const topRate = rateRows.reduce((a, b) => (b.value > a.value ? b : a));
if (topCount.code !== "DEU")
  throw new Error(`"Germany has the most" (read as: the highest clinic COUNT) is false: ${topCount.country} (${topCount.value}) is higher than Germany (${germanyCount}).`);
console.log(
  `claim check (by hand — groundTakeaway found no checkable shape in "Germany has the most."): ` +
    `Germany (${germanyCount}) IS the highest of the four COUNT countries — true read that way. ` +
    `Read as a claim over all eight rows it is not a comparison the data supports: ${topRate.country} ` +
    `(${topRate.value} per 100k) cannot be ranked against a count at all.`,
);

const furniture = deriveFurniture(PALETTE.ground);
const ramp = assertRampReads(
  sequentialRamp(PALETTE.ground, dataRampEnd(PALETTE.accent, PALETTE.ground), 4, 0.1, 0.78),
  PALETTE.ground,
  "the clinics ramp",
);

const panels = [
  {
    key: "count",
    label: "CLINICS — count",
    unitLabel: "clinics",
    study: COUNT_STUDY,
    breaks: [1000, 1150, 1300],
    rows: countJoin.rows,
    ramp,
    topCode: topCount.code,
  },
  {
    key: "rate",
    label: "CLINICS — rate per 100,000 people",
    unitLabel: "per 100k",
    study: RATE_STUDY,
    breaks: [18, 19, 21],
    rows: rateJoin.rows,
    ramp,
    topCode: topRate.code,
  },
];

const props = {
  geometry: { frame: geometry.frame, shapes },
  plate: `data:image/png;base64,${(await readFile(join(plateDir, "plate.png"))).toString("base64")}`,
  overline: "Clinics across Europe",
  title: "Two tables, two measures — a count in four countries, a rate in four others.",
  subtitle:
    "Germany reports the highest clinic COUNT (1,880). Sweden reports the highest RATE (21.9 per 100,000). The two numbers do not compare.",
  source: "Source: ministry table, frozen 2026-08 · unit column: clinics (count) / per 100k (rate)",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
  caveat: "Never shown on one scale: a count and a rate are not the same measure.",
  alt:
    "Two small maps of Europe side by side. The left map shades France, Germany, Spain and Italy by their reported " +
    "clinic COUNT, Germany darkest at 1,880. The right map shades Poland, Sweden, the Netherlands and Belgium by " +
    "their reported RATE per 100,000 people, Sweden darkest at 21.9. Each map's other four countries are shown in a " +
    "neutral grey, labelled as reported on the other map.",
  ground: PALETTE.ground,
  accent: PALETTE.accent,
  ink: furniture.ink,
  muted: furniture.muted,
  panels,
};

const element = createElement(ClinicsMapStill, props);
assertDrawnInActiveTypeface(renderToStaticMarkup(element), { where: "the clinics map" });
const { pngPath } = await renderStill({ element, width: 900, height: 560, outDir, name: "mixed-unit-clinics-still" });
console.log(`still → ${pngPath}\nNow open it and look at it.`);
