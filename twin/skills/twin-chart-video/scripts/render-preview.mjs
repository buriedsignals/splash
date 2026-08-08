// Renders THIS skill's seed from THIS skill's sample data at its last frame.
// Never a story's render: a story's artifact proves the story, not the mechanism this skill teaches.
//
// A video seed's first frame is deliberately empty — the reference rule is laid down before any
// data arrives. A preview rendered at frame 0 would be a blank image that passes every existence
// test. This renders at frame 239 (CO2_TIMING.total - 1), the last frame, which shows the finished chart.

import { spawnSync } from "node:child_process";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveFurniture } from "../../twin-chart-beat/scripts/render-still.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../../..");
const ENTRY = join(HERE, "../assets/index.ts");
const COMPOSITION = "co2-suisse";
const TARGET = join(HERE, "..", "assets", "preview.png");
const TEMP_PNG = join(dirname(TARGET), ".preview-temp.png");

// CO2_TIMING.total is 240 frames, so the last frame is 239
const LAST_FRAME = 239;

const rainfallRaw = JSON.parse(
  await readFile(join(HERE, "..", "assets", "sample-data", "rainfall.json"), "utf8"),
);

// Transform rainfall data to match EmissionsVideo's data format (year + mt)
const data = rainfallRaw.map(row => ({ year: row.year, mt: row.value }));

const ground = "#FFFFFF";
const furniture = deriveFurniture(ground);

// Build the props for the preview
const props = {
  data,
  title: "Rainfall over the sample town fell by a third",
  source: "Sample data — not a real measurement",
  ground,
  accent: "#0B7A75",
  reference: 700,
  referenceLabel: "Reference level",
  peakLabel: "Peak year",
  ...furniture,
};

await mkdir(dirname(TARGET), { recursive: true });
const propsPath = join(dirname(TARGET), "preview-props.json");
await writeFile(propsPath, JSON.stringify(props, null, 2));

// Determine output path based on whether we're checking
const outputPath = process.argv.includes("--check") ? TEMP_PNG : TARGET;

// Render at the last frame
const binary = join(PACKAGE_ROOT, "node_modules/.bin/remotion");
const startTime = Date.now();
const result = spawnSync(binary, [
  "still",
  ENTRY,
  COMPOSITION,
  outputPath,
  `--frame=${LAST_FRAME}`,
  `--props=${propsPath}`,
  "--timeout=120000",
], { cwd: PACKAGE_ROOT, stdio: "inherit" });

if (result.status !== 0) {
  console.error(`remotion still exited with ${result.status}`);
  process.exit(1);
}

const elapsed = Math.round((Date.now() - startTime) / 1000);

if (process.argv.includes("--check")) {
  const committed = await readFile(TARGET);
  const freshlyRendered = await readFile(TEMP_PNG);
  await rm(TEMP_PNG);
  if (!committed.equals(freshlyRendered)) {
    console.error("preview.png is stale — the seed changed and the preview did not. Re-run without --check.");
    process.exit(1);
  }
  console.log("preview.png matches a fresh render of the seed.");
} else {
  console.log(`wrote ${TARGET} at frame ${LAST_FRAME} (${elapsed}s) — now open it and look at it.`);
}
