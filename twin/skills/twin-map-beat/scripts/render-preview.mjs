// Renders THIS skill's seed from THIS skill's sample data. Never a story's render: a story's
// artifact proves the story, not the mechanism this skill teaches.
//
// The seed component never imports the rasteriser (`deriveFurniture`), which lives in
// `twin-chart-beat/scripts/render-still.mjs` beside a native rasteriser no browser bundle
// can load. This script is the one place per render that calls `deriveFurniture`, then
// threads the results in as props, once.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Resvg } from "@resvg/resvg-js";
import {
  deriveFurniture,
  renderStill,
} from "./render-still.mjs";
import { Co2MapStill } from "../assets/Co2MapStill.tsx";
import {
  CO2_ALIAS,
  CO2_BREAKS,
  CO2_EXPECTED_NO_DATA,
  CO2_STUDY,
  joinValues,
  sequentialRamp,
} from "../assets/geo.ts";

const HERE = import.meta.dirname;
const TWIN_ROOT = resolve(HERE, "../..");
const PLATE_DIR = `/tmp/map-twin/plate-900`;

// If --out <dir> is passed, write to that directory; otherwise write to assets/preview.png
const outDirArg = process.argv.indexOf("--out");
let outDir = outDirArg !== -1 ? process.argv[outDirArg + 1] : join(HERE, "..", "assets");
// Make outDir absolute
if (!outDir.startsWith("/")) {
  outDir = resolve(process.cwd(), outDir);
}
const TARGET = join(outDir, "preview.png");

// Ensure the plate is baked. If not, run bake-plate.mjs.
async function ensurePlate() {
  if (existsSync(join(PLATE_DIR, "geometry.json")) && existsSync(join(PLATE_DIR, "plate.png"))) {
    console.log(`plate exists at ${PLATE_DIR}`);
    return;
  }

  console.log(`plate not found at ${PLATE_DIR}, baking...`);
  await mkdir(PLATE_DIR, { recursive: true });

  const result = spawnSync("bun", [join(HERE, "bake-plate.mjs"), "--size", "900", "--out", PLATE_DIR], {
    cwd: TWIN_ROOT,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`bake-plate.mjs exited with ${result.status}`);
  }
}

// Read the baked plate
async function loadPlate() {
  const geometry = JSON.parse(await readFile(join(PLATE_DIR, "geometry.json"), "utf8"));
  const png = await readFile(join(PLATE_DIR, "plate.png"));
  return {
    geometry,
    plate: `data:image/png;base64,${png.toString("base64")}`,
  };
}

await ensurePlate();

const { geometry, plate } = await loadPlate();

// Read and prepare sample data
const sampleRegions = JSON.parse(
  await readFile(join(HERE, "..", "assets", "sample-data", "regions.json"), "utf8"),
);

// Convert sample regions to a values map
const values = new Map();
for (const region of sampleRegions) {
  values.set(region.key, region.value);
}

// Join values with the study set
const joined = joinValues(CO2_STUDY, values, {
  alias: CO2_ALIAS,
  expectedNoData: CO2_EXPECTED_NO_DATA,
});

console.log(
  `join: ${joined.matched} of ${CO2_STUDY.length} shapes carry a value; ` +
    `${joined.noData.length} declared no-data (${joined.noData.join(", ")})`,
);

// Derive furniture and ramp
const ground = "#FFFFFF";
const furniture = deriveFurniture(ground);
const ramp = sequentialRamp(ground, furniture.ink, CO2_BREAKS.length + 1);

// Compute the mean of all sample values for the comparison mark
const allValues = Array.from(values.values());
const meanValue = allValues.length > 0 ? allValues.reduce((a, b) => a + b, 0) / allValues.length : 0;

// Render the preview
const svg = renderToStaticMarkup(
  createElement(Co2MapStill, {
    geometry,
    plate,
    rows: joined.rows,
    breaks: CO2_BREAKS,
    ramp,
    title: "Sample map — CO₂ emissions per capita",
    source: "Sample data",
    basemapCredit: "© MapTiler, © OpenStreetMap",
    legendCaption: "Tonnes of CO₂ per capita",
    caveat: "Sample data for demonstration purposes.",
    noDataLabel: "no data",
    alt: "A map of Europe shaded by sample CO₂ values.",
    ground,
    accent: "#0B7A75",
    ink: furniture.ink,
    muted: furniture.muted,
    subject: "CHE",
    subjectLabel: "Subject",
    subjectValue: values.get("CHE") ?? 0,
    comparisonLabel: "Comparison",
    comparisonValue: meanValue,
  }),
);

const png = new Resvg(svg, { fitTo: { mode: "width", value: 900 } })
  .render()
  .asPng();

if (process.argv.includes("--check")) {
  const committed = await readFile(TARGET);
  if (!committed.equals(png)) {
    console.error("preview.png is stale — the seed changed and the preview did not. Re-run without --check.");
    process.exit(1);
  }
  console.log("preview.png matches a fresh render of the seed.");
} else {
  await mkdir(outDir, { recursive: true });
  await writeFile(TARGET, png);
  console.log(`wrote ${TARGET} (${png.length} bytes) — now open it and look at it.`);
}
