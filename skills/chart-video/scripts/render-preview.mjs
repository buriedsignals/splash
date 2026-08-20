// Renders THIS skill's seed from THIS skill's sample data at its last frame.
// Never a story's render: a story's artifact proves the story, not the mechanism this skill teaches.
//
// A video seed's first frame is deliberately empty — the reference rule is laid down before any
// data arrives. A preview rendered at frame 0 would be a blank image that passes every existence
// test. This renders at the LAST frame, which shows the finished chart.

import { spawnSync } from "node:child_process";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveFurniture, readPalette } from "./render-still.mjs";
import { CO2_TIMING } from "../assets/timing.ts";
import { comparePngBuffers } from "./compare-png.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../../..");
const ENTRY = join(HERE, "../assets/index.ts");
const COMPOSITION = "co2-suisse";

// If --out <dir> is passed, write to that directory; otherwise write to assets/preview.png
const outDirArg = process.argv.indexOf("--out");
let outDir = outDirArg !== -1 ? process.argv[outDirArg + 1] : join(HERE, "..", "assets");
// Make outDir absolute
if (!outDir.startsWith("/")) {
  outDir = resolve(process.cwd(), outDir);
}
const TARGET = join(outDir, "preview.png");
const TEMP_PNG = join(dirname(TARGET), ".preview-temp.png");

// Derived, never typed: a journalist who lengthens a hold in `assets/timing.ts` gets a preview of
// the new last frame, not a preview of frame 239 of a longer video.
const LAST_FRAME = CO2_TIMING.total - 1;

const rainfallRaw = JSON.parse(
  await readFile(join(HERE, "..", "assets", "sample-data", "rainfall.json"), "utf8"),
);

// Transform rainfall data to match EmissionsVideo's data format (year + mt)
const data = rainfallRaw.map(row => ({ year: row.year, mt: row.value }));

// Read, not typed — see `PALETTE.md` at this skill's own root for why the seed reads its colours
// the same way a beat does.
const { ground, accent } = readPalette(join(HERE, "..", "assets"), {
  stopAt: join(HERE, ".."),
});
const furniture = deriveFurniture(ground);

// Build the props for the preview
// The reference is the first reading (2015, 912mm) because the title's claim ("fell by a third")
// is measured against that level. Each beat's reference is its own editorial choice, derived
// from the numbers but not automatically — a different beat's honest reference might be a
// multi-year average, not the series' first reading.
const firstReading = data[0];
const props = {
  data,
  title: "Rainfall over the sample town fell by a third",
  source: "Sample data — not a real measurement",
  ground,
  accent,
  reference: firstReading.mt,
  referenceLabel: `${firstReading.year} level`,
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
  // Clean up before leaving, on this path too: a failed render used to leave preview-props.json
  // behind, so a plain `bun test` (whose canon check spawns this script) dirtied the tree exactly
  // when something had gone wrong and the tree most needed to be readable.
  await rm(propsPath, { force: true });
  if (outputPath === TEMP_PNG) await rm(TEMP_PNG, { force: true });
  console.error(`remotion still exited with ${result.status}`);
  process.exit(1);
}

const elapsed = Math.round((Date.now() - startTime) / 1000);

if (process.argv.includes("--check")) {
  const committed = await readFile(TARGET);
  const freshlyRendered = await readFile(TEMP_PNG);
  await rm(TEMP_PNG);
  await rm(propsPath);
  // THE SAME PICTURE, not the same bytes. `chart-video`'s preview flipped 78611 -> 78605 between two
  // machines and back again; `scrolly`'s own check went red rendering 6543 where 6609 was committed.
  // 0,002 % and 0,065 % of pixels apart, text rasterised through the SYSTEM fonts in both cases.
  // Byte equality was asserting that this PNG is reproducible on any machine, which neither resvg
  // nor Chrome promises — see `scripts/compare-png.mjs`.
  const diff = comparePngBuffers(committed, freshlyRendered);
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
  // No --out override: this IS the canonical regenerate, so the proof a reader opens is a COPY of
  // the exact bytes remotion just wrote to TARGET — never a second still render (not
  // byte-reproducible across launches, see compare-png.mjs's own header) and never a second command
  // (the step three regenerations in a row forgot: bc308ab8, 97293519, and the state this branch
  // found).
  let proofNote = "";
  if (outDirArg === -1) {
    const proofDir = join(HERE, "..", "output-proof");
    await mkdir(proofDir, { recursive: true });
    const rendered = await readFile(TARGET);
    await writeFile(join(proofDir, "preview.png"), rendered);
    proofNote = ` and ${join(proofDir, "preview.png")}`;
  }
  console.log(`wrote ${TARGET}${proofNote} at frame ${LAST_FRAME} (${elapsed}s) — now open it and look at it.`);
  await rm(propsPath);
}
