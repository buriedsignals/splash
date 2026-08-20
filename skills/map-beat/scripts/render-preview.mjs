// Renders THIS skill's seed from THIS skill's sample data. Never a story's render: a story's
// artifact proves the story, not the mechanism this skill teaches.
//
// The seed component never imports the rasteriser (`deriveFurniture`), which lives in this skill's
// OWN `./render-still.mjs` — a copy of `chart-beat`'s, not an import of it, because nothing
// under a skill may import out of the skill — beside a native rasteriser no browser bundle can load.
// This script is the one place per render that calls `deriveFurniture`, then threads the results in
// as props, once.

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Resvg } from "@resvg/resvg-js";
import {
  deriveFurniture,
  readPalette,
  renderStill,
  readTypeface,
  useTypeface,
  assertDrawnInActiveTypeface,
} from "./render-still.mjs";
import { Co2MapStill } from "../assets/Co2MapStill.tsx";
import {
  CO2_ALIAS,
  CO2_BREAKS,
  CO2_EXPECTED_NO_DATA,
  CO2_STUDY,
  joinValues,
  assertRampReads,
  dataRampEnd,
  sequentialRamp,
} from "../assets/geo.ts";
import { comparePngBuffers } from "./compare-png.mjs";

const HERE = import.meta.dirname;
// The seed preview is an offline fixture. A real beat still runs `bake-plate.mjs` with the
// newsroom's MapTiler capability, but checking or installing the skill must never spend a tile
// request or require a secret merely because `/tmp` is cold.
const PLATE_DIR = join(HERE, "..", "assets", "sample-data", "plate");

// If --out <dir> is passed, write to that directory; otherwise write to assets/preview.png
const outDirArg = process.argv.indexOf("--out");
let outDir = outDirArg !== -1 ? process.argv[outDirArg + 1] : join(HERE, "..", "assets");
// Make outDir absolute
if (!outDir.startsWith("/")) {
  outDir = resolve(process.cwd(), outDir);
}
const TARGET = join(outDir, "preview.png");

// The frozen sample plate is part of the seed's sample data, just like regions.json.
async function ensurePlate() {
  if (existsSync(join(PLATE_DIR, "geometry.json")) && existsSync(join(PLATE_DIR, "plate.png"))) {
    return;
  }
  throw new Error(
    `the committed sample plate is incomplete at ${PLATE_DIR}; restore geometry.json and plate.png`,
  );
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

// Derive furniture and ramp. The colours are READ, not typed —
// see `PALETTE.md` at this skill's own root.
const { ground, accent } = readPalette(join(HERE, "..", "assets"), { stopAt: join(HERE, "..") });

// The typeface is a RECORDED ANSWER, read the same way the palette is and put in force
// before anything is laid out — `FONT_FAMILY` is a live binding, so the seed draws in
// whatever this resolves, and `measureText` measures in the same thing. A face that does
// not resolve on this machine refuses here rather than being silently substituted.
useTypeface(readTypeface(join(HERE, "..", "assets"), { stopAt: join(HERE, "..") }));
const furniture = deriveFurniture(ground);
// The shading IS the data — see the same block in `render-map.mjs`. The ramp carries the recorded
// accent rather than the ink pole, and is measured before it is drawn.
const ramp = assertRampReads(
  sequentialRamp(ground, dataRampEnd(accent, ground), CO2_BREAKS.length + 1, 0.1, 0.78),
  ground,
  "the seed's choropleth ramp",
);

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
    accent,
    ink: furniture.ink,
    muted: furniture.muted,
    subject: "CHE",
    subjectLabel: "Subject",
    subjectValue: values.get("CHE") ?? 0,
    comparisonLabel: "Comparison",
    comparisonValue: meanValue,
  }),
);
// Nothing renders in a typeface nobody chose: if the element declared a family other
// than the one in force, every gutter in it was measured against a font nobody is
// looking at, and it would clip in the PNG rather than say so.
assertDrawnInActiveTypeface(svg, { where: "the seed" });

const png = new Resvg(svg, { fitTo: { mode: "width", value: 900 } })
  .render()
  .asPng();

if (process.argv.includes("--check")) {
  const committed = await readFile(TARGET);
  // THE SAME PICTURE, not the same bytes. `chart-video`'s preview flipped 78611 -> 78605 between two
  // machines and back again; `scrolly`'s own check went red rendering 6543 where 6609 was committed.
  // 0,002 % and 0,065 % of pixels apart, text rasterised through the SYSTEM fonts in both cases.
  // Byte equality was asserting that this PNG is reproducible on any machine, which neither resvg
  // nor Chrome promises — see `scripts/compare-png.mjs`.
  const diff = comparePngBuffers(committed, png);
  if (!diff.same) {
    console.error(
      `preview.png is stale — the seed changed and the preview did not (${diff.reason}). Re-run without --check.`,
    );
    process.exit(1);
  }
  console.log(
    `preview.png matches a fresh render of the seed (${diff.diffPixels}/${diff.totalPixels} pixels differ).`,
  );
} else {
  await mkdir(outDir, { recursive: true });
  await writeFile(TARGET, png);
  // No --out override: this IS the canonical regenerate, so the proof a reader opens is written from
  // the SAME buffer in the SAME run — never a second render (not byte-reproducible across launches,
  // see compare-png.mjs's own header) and never a second command (the step three regenerations in a
  // row forgot: bc308ab8, 97293519, and the state this branch found).
  let proofNote = "";
  if (outDirArg === -1) {
    const proofDir = join(HERE, "..", "output-proof");
    await mkdir(proofDir, { recursive: true });
    await writeFile(join(proofDir, "preview.png"), png);
    proofNote = ` and ${join(proofDir, "preview.png")}`;
  }
  console.log(`wrote ${TARGET}${proofNote} (${png.length} bytes) — now open it and look at it.`);
}
