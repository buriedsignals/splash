// twin/proof/life-expectancy/render.mjs
//
// This story's own render script — the render ladder's second rung, same shape as
// `twin-chart-video/scripts/render-video.mjs` (`readingsFromCsv`, then still-first, then mp4),
// its own story constants and its own CSV column names, because the story is not the CO₂ beat's
// and should not pretend to share its nouns. See `render-video.mjs` for the doc-comment on why
// this runs in node (`deriveFurniture`) and why the still is rendered before the mp4.
//
// Usage:  bun proof/life-expectancy/render.mjs [--still-only] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveFurniture } from "#shared/twin-chart-beat/render-still.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const ENTRY = join(HERE, "index.ts");
const COMPOSITION = "life-expectancy";

/** The story's own constants — the journalist's words, from the CADRAGE exchange. */
const BEAT = {
  ground: "#FFFFFF",
  accent: "#0B7A75",
  title:
    "Covid cost Switzerland nearly a year of life expectancy — and it took three years to win it back.",
  source: "Source: Federal Statistical Office · data 2024",
  reference: 83.8,
  // Not "the 2019 level (83.8 years)" — the y axis already states 83.8 on the tick this rule sits
  // on, and the text beside this beat already gives 83.8, so printing it again here would be
  // `anti-patterns.md`'s "repeated years or values" twice over.
  referenceLabel: "2019 level",
  subjectYear: 2020,
  recoveryYear: 2023,
};

/** A plain `year,value` CSV — this beat's own frozen series, not OWID's column names. */
export function readingsFromCsv(csv) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const yearAt = columns.indexOf("year");
  const valueAt = columns.indexOf("value");
  if (yearAt < 0 || valueAt < 0)
    throw new Error(`csv has no year / value column, got: ${header}`);

  return rows
    .map((row) => row.split(","))
    .map((cells) => ({ year: Number(cells[yearAt]), value: Number(cells[valueAt]) }))
    .filter((r) => Number.isFinite(r.year) && Number.isFinite(r.value))
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

const dataPath = flag("--data", "/tmp/video-twin/life-expectancy.csv");
const outDir = flag("--out", "/tmp/video-twin");
const stillOnly = argv.includes("--still-only");

await mkdir(outDir, { recursive: true });

const data = readingsFromCsv(await readFile(dataPath, "utf8"));
if (data.length < 2) throw new Error(`need at least two readings, got ${data.length}`);

const props = { ...BEAT, data, ...deriveFurniture(BEAT.ground) };
const propsPath = join(outDir, "life-expectancy-props.json");
await writeFile(propsPath, JSON.stringify(props, null, 2));

// Rung 2a: the last frame, on its own. If the end state is not a complete, readable chart, the
// video is wrong and nothing below is worth waiting for.
const stillPath = join(outDir, "life-expectancy-final-frame.png");
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
const videoPath = join(outDir, "life-expectancy.mp4");
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
