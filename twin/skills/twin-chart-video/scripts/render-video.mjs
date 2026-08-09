// twin/skills/twin-chart-video/scripts/render-video.mjs
//
// The render ladder's second rung. Rung one (`twin-chart-beat/scripts/render-still.mjs`) turns a
// React element into a PNG; this turns a Remotion composition into a final-frame still and then an
// mp4, in that order, because a wrong end state is a wrong video and finding out costs seconds
// here instead of minutes there.
//
// It runs in node, which is why it is the piece that derives the furniture colours: `deriveFurniture`
// lives in the still script beside a native rasteriser that no browser bundle can load. Deriving
// here and passing ink/muted/grid in as input props keeps ONE implementation of the colour rule for
// both genres — the alternative was a second copy of the contrast escalation inside the composition,
// which is exactly how two genres drift apart.
//
// Usage:  bun skills/twin-chart-video/scripts/render-video.mjs [--still-only] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveFurniture } from "./render-still.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../../..");
const ENTRY = join(HERE, "../assets/index.ts");
const COMPOSITION = "co2-suisse";

/** The story's own constants — the journalist's words, from STORYBOARD.md and BRIEF.md. */
const BEAT = {
  firstYear: 1950,
  reference: 32.5,
  ground: "#FFFFFF",
  accent: "#0B7A75",
  title: "En 2024, la Suisse a émis moins de CO₂ sur son territoire qu'en 1967.",
  source:
    "Source : Global Carbon Budget 2025, via Our World in Data · données 2024",
  // Not "Niveau de 1967 : 32,5 Mt" — the y axis already states 32,5 on the tick this rule sits on,
  // and a number printed twice is `anti-patterns.md`'s "repeated years or values".
  referenceLabel: "Niveau de 1967",
};

/**
 * The frozen OWID series, tonnes to megatonnes. Two columns out of four; the year filter is the
 * journalist's, not a convenience — the series runs from 1858 and the beat is about the post-war
 * curve.
 */
export function readingsFromCsv(csv, firstYear) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.findIndex((c) => c.startsWith("Annual CO"));
  if (yearAt < 0 || valueAt < 0)
    throw new Error(`csv has no Year / Annual CO₂ emissions column, got: ${header}`);

  return rows
    .map((row) => row.split(","))
    .map((cells) => ({ year: Number(cells[yearAt]), mt: Number(cells[valueAt]) / 1e6 }))
    .filter((r) => Number.isFinite(r.year) && Number.isFinite(r.mt) && r.year >= firstYear)
    .sort((a, b) => a.year - b.year);
}

function remotion(args) {
  const binary = join(PACKAGE_ROOT, "node_modules/.bin/remotion");
  const started = Date.now();
  const result = spawnSync(binary, args, { cwd: PACKAGE_ROOT, stdio: "inherit" });
  if (result.status !== 0)
    throw new Error(`remotion ${args[0]} exited with ${result.status}`);
  return Math.round((Date.now() - started) / 1000);
}

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const dataPath = flag("--data", "/tmp/video-twin/data.csv");
const outDir = flag("--out", "/tmp/video-twin");
const stillOnly = argv.includes("--still-only");

await mkdir(outDir, { recursive: true });

const data = readingsFromCsv(await readFile(dataPath, "utf8"), BEAT.firstYear);
if (data.length < 2) throw new Error(`need at least two readings, got ${data.length}`);

const props = { ...BEAT, data, ...deriveFurniture(BEAT.ground) };
delete props.firstYear;
const propsPath = join(outDir, "props.json");
await writeFile(propsPath, JSON.stringify(props, null, 2));

// Rung 2a: the last frame, on its own. If the end state is not a complete, readable chart, the
// video is wrong and nothing below is worth waiting for.
const stillPath = join(outDir, "final-frame.png");
const stillSeconds = remotion([
  "still",
  ENTRY,
  COMPOSITION,
  stillPath,
  "--frame=-1",
  `--props=${propsPath}`,
  "--timeout=120000",
]);
console.log(`still (--frame=-1) → ${stillPath}  [${stillSeconds}s]`);

if (stillOnly) process.exit(0);

// Rung 2b: the mp4. Concurrency 1 keeps the render deterministic and the machine usable.
const videoPath = join(outDir, "co2.mp4");
const videoSeconds = remotion([
  "render",
  ENTRY,
  COMPOSITION,
  videoPath,
  `--props=${propsPath}`,
  "--concurrency=1",
  "--timeout=120000",
]);
console.log(`video → ${videoPath}  [${videoSeconds}s]`);
