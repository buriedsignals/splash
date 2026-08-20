// stories/stress-m-forest-loss/beats/forest-loss/render-video.mjs
//
// Rungs 2 and 3 of the ladder: the video's final frame, then the mp4. Reuses the SAME join and
// props shape as render-still.mjs, against the VIDEO plate (baked at 1016px wide, not 836).
//
// Usage:
//   bun stories/stress-m-forest-loss/beats/forest-loss/render-video.mjs --final-frame
//   bun stories/stress-m-forest-loss/beats/forest-loss/render-video.mjs --video

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveFurniture, readPalette } from "#shared/chart-beat/render-still.mjs";
import { FOREST_STUDY, dataRampEnd, joinShapes, joinValues, rowsFromCsv, sequentialRamp, assertRampReads } from "./geo-forest.ts";
import { checkTiming } from "#shared/chart-video/timing.ts";
import { FOREST_TIMING } from "./timing.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY_ROOT = resolve(HERE, "../..");
const PACKAGE_ROOT = resolve(HERE, "../../../..");
const dataPath = join(STORY_ROOT, "source/data.csv");
const plateDir = join(HERE, "plate-video");
const outDir = join(HERE, "renders");
const ENTRY = join(HERE, "index.ts");
const COMPOSITION = "forest-loss";

const timingErrors = checkTiming(FOREST_TIMING);
if (timingErrors.length > 0) throw new Error(`FOREST_TIMING is not a legal beat timing:\n  ${timingErrors.join("\n  ")}`);

const PALETTE = readPalette(STORY_ROOT, { stopAt: dirname(STORY_ROOT) });

const rows = rowsFromCsv(await readFile(dataPath, "utf8"));
const geometry = JSON.parse(await readFile(join(plateDir, "geometry.json"), "utf8"));
const shapes = joinShapes(FOREST_STUDY, geometry.shapes);
const values = new Map(rows.map((r) => [r.code, r.loss_ha]));
const joined = joinValues(FOREST_STUDY, values);
console.log(`join: ${joined.matched} of ${FOREST_STUDY.length} shapes carry a value (video plate, ${geometry.frame.width}x${geometry.frame.height}).`);

const furniture = deriveFurniture(PALETTE.ground);
const ramp = assertRampReads(sequentialRamp(PALETTE.ground, dataRampEnd(PALETTE.accent, PALETTE.ground), 5, 0.1, 0.78), PALETTE.ground, "the forest-loss ramp");
const breaks = [50000, 150000, 350000, 700000];
const namesByCode = Object.fromEntries(rows.map((r) => [r.code, r.country]));

const shared = {
  geometry: { frame: geometry.frame, shapes },
  rows: joined.rows,
  namesByCode,
  breaks,
  ramp,
  title: "Brazil lost more forest than any other single country in 2025.",
  subtitle: "Seven countries' forest loss in 2025, ministry figures — built country by country, lowest to highest.",
  source: "Source: ministry table, frozen 2026-08 · codes are the ministry's own, incl. SDS for South Sudan",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
  caveat: "South Sudan's code, SDS, is read directly in this tree; aliasing it to ISO's SSD fails the join instead.",
  conclusion: "1,120,000 ha in Brazil — nearly double Congo DR, the next highest (588,000 ha).",
  ground: PALETTE.ground,
  accent: PALETTE.accent,
  ink: furniture.ink,
  muted: furniture.muted,
  subject: "BRA",
};

const argv = process.argv.slice(2);
const wantFinalFrame = argv.includes("--final-frame");
const wantVideo = argv.includes("--video");

await mkdir(outDir, { recursive: true });

function remotion(args) {
  const binary = join(PACKAGE_ROOT, "node_modules/.bin/remotion");
  const started = Date.now();
  const result = spawnSync(binary, args, { cwd: PACKAGE_ROOT, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`remotion ${args[0]} exited with ${result.status}`);
  return Math.round((Date.now() - started) / 1000);
}

if (wantFinalFrame || wantVideo) {
  const plate = `data:image/png;base64,${(await readFile(join(plateDir, "plate.png"))).toString("base64")}`;
  const propsPath = join(outDir, "video-props.json");
  await writeFile(propsPath, JSON.stringify({ ...shared, plate }));

  const framePath = join(outDir, "forest-loss-final-frame.png");
  const stillSeconds = remotion(["still", ENTRY, COMPOSITION, framePath, "--frame=-1", `--props=${propsPath}`, "--timeout=180000"]);
  console.log(`final frame (--frame=-1) → ${framePath}  [${stillSeconds}s]`);

  if (wantVideo) {
    const videoPath = join(outDir, "forest-loss.mp4");
    const videoSeconds = remotion(["render", ENTRY, COMPOSITION, videoPath, `--props=${propsPath}`, "--concurrency=1", "--timeout=180000"]);
    console.log(`video → ${videoPath}  [${videoSeconds}s]`);
  }
} else {
  console.log("nothing asked for. Pass --final-frame or --video.");
}
