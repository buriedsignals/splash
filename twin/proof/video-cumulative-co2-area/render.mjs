// twin/proof/video-cumulative-co2-area/render.mjs
//
// Fourth beat through the render ladder's second rung — same shape as
// `twin-chart-video/scripts/render-video.mjs`, `../life-expectancy/render.mjs` and
// `../migration/render.mjs` (`readingsFromCsv`, then still-first, then mp4), its own story
// constants. See `render-video.mjs` for the doc-comment on why this runs in node
// (`deriveFurniture`) and why the still is rendered before the mp4.
//
// Usage:  bun proof/video-cumulative-co2-area/render.mjs [--still-only] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveFurniture } from "#shared/twin-chart-beat/render-still.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const ENTRY = join(HERE, "index.ts");
const COMPOSITION = "cumulative-co2-area";

/**
 * The story's own constants — the journalist's words, from BRIEF.md. `reference` and
 * `subjectYear` are NOT hand-typed: `reference` is derived below from the frozen data's own last
 * reading (half of the all-time total), and `subjectYear` is the first year the running total
 * reaches it, asserted against BRIEF.md's verified value rather than duplicated by hand — the
 * exact defect `life-expectancy`'s and `migration`'s source-correction fixes closed (a number
 * living only in a prompt, never checked against the committed CSV).
 */
const BEAT = {
  ground: "#FFFFFF",
  accent: "#0B7A75",
  title:
    "More than half of Switzerland's all-time CO₂ has been emitted since 1986.",
  source:
    "Source: Global Carbon Budget (2025), via Our World in Data · data through 2024",
  // Not "half of the all-time total (1,579 Mt)" — the y axis already states that number on the
  // tick this rule sits on, so printing it again here would be `anti-patterns.md`'s "repeated
  // years or values". Wording matches BRIEF.md's own anti-pattern note: state what "half" means
  // in words, not a bare number.
  referenceLabel: "Half of Switzerland's all-time total",
};

/**
 * OWID's `cumulative-co-emissions` grapher CSV: `Entity,Code,Year,Cumulative CO₂ emissions`,
 * tonnes to megatonnes (this beat's own unit — see CumulativeCo2AreaVideo.tsx). The whole range,
 * 1858 → 2024: the claim is about the all-time total, so there is no window to trim the way
 * `co2-suisse`'s `firstYear` or `life-expectancy`'s do.
 */
export function readingsFromCsv(csv) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.findIndex((c) => c.startsWith("Cumulative CO"));
  if (yearAt < 0 || valueAt < 0)
    throw new Error(
      `csv has no Year / Cumulative CO₂ emissions column, got: ${header}`,
    );

  return rows
    .map((row) => row.split(","))
    .map((cells) => ({
      year: Number(cells[yearAt]),
      mt: Number(cells[valueAt]) / 1e6,
    }))
    .filter((r) => Number.isFinite(r.year) && Number.isFinite(r.mt))
    .sort((a, b) => a.year - b.year);
}

/** The first year the running total reaches or passes `half` — computed from the data, never
 *  hand-typed, so a re-fetch that shifts the series shifts this beat's subject year with it. */
export function firstYearAtOrAbove(data, half) {
  const reading = data.find((r) => r.mt >= half);
  if (!reading)
    throw new Error(`no reading in the series reaches half the all-time total (${half})`);
  return reading.year;
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

// The story's own frozen series, committed beside it — OWID's raw `cumulative-co-emissions`
// grapher export for Switzerland, `&csvType=filtered&country=~CHE`, verified single-country
// (BRIEF.md). No longer `/tmp`.
const dataPath = flag("--data", join(HERE, "data.csv"));
const outDir = flag("--out", "/tmp/video-twin");
const stillOnly = argv.includes("--still-only");

await mkdir(outDir, { recursive: true });

const data = readingsFromCsv(await readFile(dataPath, "utf8"));
if (data.length < 2) throw new Error(`need at least two readings, got ${data.length}`);

const lastMt = data[data.length - 1].mt;
const reference = lastMt / 2;
const subjectYear = firstYearAtOrAbove(data, reference);
// BRIEF.md's exact verified crossing year — the tripwire, not a duplicate of the computation
// above: if a re-fetch ever moves the crossing, this beat must not silently keep drawing an
// on-screen claim ("since 1986") the frozen data no longer supports.
if (subjectYear !== 1986)
  throw new Error(
    `BRIEF.md claims the crossing year is 1986, but the frozen data crosses in ${subjectYear}`,
  );

const props = { ...BEAT, data, reference, subjectYear, ...deriveFurniture(BEAT.ground) };
const propsPath = join(outDir, "cumulative-co2-area-props.json");
await writeFile(propsPath, JSON.stringify(props, null, 2));

// Rung 2a: the last frame, on its own. If the end state is not a complete, readable chart, the
// video is wrong and nothing below is worth waiting for.
const stillPath = join(outDir, "cumulative-co2-area-final-frame.png");
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
const videoPath = join(outDir, "cumulative-co2-area.mp4");
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
