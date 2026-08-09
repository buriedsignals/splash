// twin/proof/vidx-stacked-bar-swiss-electricity/render.mjs
//
// This story's own render script — the render ladder's second rung, same shape as
// `twin-chart-video/scripts/render-video.mjs` and the other proof workspaces' (read the frozen
// CSV, still-first, then mp4), its own story constants.
//
// Usage:  bun proof/vidx-stacked-bar-swiss-electricity/render.mjs [--still-only] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveFurniture } from "../../skills/twin-chart-video/scripts/render-still.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const ENTRY = join(HERE, "index.ts");
const COMPOSITION = "vidx-stacked-bar-swiss-electricity";

const YEARS = [2000, 2010, 2020, 2024];

/** The story's own constants — the journalist's words, from `BRIEF.md`. The title is NOT among
 *  them: it states solar and wind's share of the subject year, which is arithmetic over the same
 *  CSV this script reads, so it is built after the read (see `title` below) rather than typed
 *  beside constants that cannot move with the file. */
const BEAT = {
  ground: "#FFFFFF",
  accent: "#0B7A75",
  source: "Source: Ember & Energy Institute, via Our World in Data · 2000, 2010, 2020 & 2024 data",
  legendLabels: ["Solar & wind", "Hydropower", "Nuclear & other"],
  subjectYear: 2024,
};

/**
 * OWID's grapher CSV (`Entity,Code,Year,Other renewables,Bioenergy,Solar,Wind,Hydropower,Nuclear,
 * Gas,Oil,Coal`), 25 rows, Switzerland only, 2000–2025 (TWh). This beat draws four snapshot years
 * and buckets the nine raw columns into three (`BRIEF.md`'s own convention).
 */
export function readingsFromCsv(csv, years) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const at = (name) => {
    const i = columns.indexOf(name);
    if (i < 0) throw new Error(`csv has no "${name}" column, got: ${header}`);
    return i;
  };
  const yearAt = at("Year");
  const num = (cells, name) => Number(cells[at(name)]);

  const byYear = new Map();
  for (const line of rows) {
    const cells = line.split(",");
    const year = Number(cells[yearAt]);
    if (!years.includes(year)) continue;
    byYear.set(year, {
      year,
      solarWind: num(cells, "Solar") + num(cells, "Wind"),
      hydro: num(cells, "Hydropower"),
      nuclearOther:
        num(cells, "Nuclear") +
        num(cells, "Bioenergy") +
        num(cells, "Other renewables") +
        num(cells, "Gas") +
        num(cells, "Oil") +
        num(cells, "Coal"),
    });
  }

  return years.map((year) => {
    const row = byYear.get(year);
    if (!row) throw new Error(`no row for ${year}`);
    return row;
  });
}

function remotion(args) {
  const binary = join(PACKAGE_ROOT, "node_modules/.bin/remotion");
  const started = Date.now();
  const result = spawnSync(binary, args, { cwd: PACKAGE_ROOT, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`remotion ${args[0]} exited with ${result.status}`);
  return Math.round((Date.now() - started) / 1000);
}

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const dataPath = flag("--data", join(HERE, "data.csv"));
const outDir = flag("--out", "/tmp/video-twin");
const stillOnly = argv.includes("--still-only");

await mkdir(outDir, { recursive: true });

const data = readingsFromCsv(await readFile(dataPath, "utf8"), YEARS);
if (data.length !== 4) throw new Error(`expected four snapshot years, got ${data.length}`);

const total = (row) => row.solarWind + row.hydro + row.nuclearOther;
const reference = total(data[0]);
if (data[data.length - 1].solarWind <= data[0].solarWind)
  throw new Error(
    `expected solar & wind to have grown by the last year, got ${data[0].solarWind} -> ${data[data.length - 1].solarWind}`,
  );

const referenceLabel = `${data[0].year} total: ${reference.toFixed(1)} TWh`;

// The headline share, read off the same four rows the columns are drawn from. "Almost nothing" is
// pinned too: the first year's share has to round to zero at one decimal for that phrase to hold.
const subject = data[data.length - 1];
const subjectShare = (subject.solarWind / total(subject)) * 100;
const firstShare = (data[0].solarWind / reference) * 100;
console.log(`solar & wind: ${firstShare.toFixed(2)}% in ${data[0].year} -> ${subjectShare.toFixed(2)}% in ${subject.year}`);
if (Math.round(firstShare * 10) / 10 !== 0)
  throw new Error(`the title says "almost nothing" in ${data[0].year}, but the share is ${firstShare.toFixed(2)}%`);
const title = `Solar and wind went from almost nothing to ${Math.round(subjectShare)}% of Switzerland's electricity`;
console.log(`title: ${title}`);

const props = {
  ...BEAT,
  title,
  subjectYear: subject.year,
  data,
  reference,
  referenceLabel,
  ...deriveFurniture(BEAT.ground),
};
const propsPath = join(outDir, "stacked-bar-props.json");
await writeFile(propsPath, JSON.stringify(props, null, 2));

// Rung 2a: the last frame, on its own.
const stillPath = join(outDir, "stacked-bar-final-frame.png");
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
const videoPath = join(outDir, "stacked-bar.mp4");
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
