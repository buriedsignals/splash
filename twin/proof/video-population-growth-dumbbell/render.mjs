// twin/proof/video-population-growth-dumbbell/render.mjs
//
// This story's own render script — the render ladder's second rung, same shape as
// `twin-chart-video/scripts/render-video.mjs` and the other proof workspaces'
// (`readingsFromCsv`, then still-first, then mp4), its own story constants.
//
// `deriveFurniture` is imported from THIS SKILL's own copy
// (`skills/twin-chart-video/scripts/render-still.mjs`) by a relative path — not the `#shared/*`
// alias the other two proof workspaces use, and not `twin-chart-beat`'s original. The two files
// are byte-identical (both are copies of the one canonical implementation), so the choice changes
// nothing about what gets rendered; it is a direction, not a different function.
//
// Usage:  bun proof/video-population-growth-dumbbell/render.mjs [--still-only] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveFurniture } from "../../skills/twin-chart-video/scripts/render-still.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const ENTRY = join(HERE, "index.ts");
const COMPOSITION = "video-population-growth-dumbbell";

/** The story's own constants — the journalist's words, from `BRIEF.md`. */
const BEAT = {
  ground: "#FFFFFF",
  accent: "#0B7A75",
  title: "Switzerland's population grew fastest of ten European countries since 2000",
  source:
    "Source: HYDE, Gapminder & UN, via Our World in Data · 2000 & 2023 data, indexed to 2000 = 100",
  referenceLabel: "Population, indexed to 2000 = 100",
  legendLabels: ["2000", "2023"],
  subjectCountry: "Switzerland",
};

/**
 * OWID's grapher CSV (`Entity,Code,Year,Population`), 2610 rows across ten countries and a
 * -10000..2023 year range — the committed `data.csv` is the raw, unedited fetch (`BRIEF.md`'s own
 * convention). This beat's window is exactly two years, 2000 and 2023: index each country's 2023
 * population to its own 2000 population = 100, then sort by the resulting gap, descending, so the
 * chart's own row order IS the finding, not a separate editorial step.
 */
export function readingsFromCsv(csv) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const yearAt = columns.indexOf("Year");
  const populationAt = columns.indexOf("Population");
  if (entityAt < 0 || yearAt < 0 || populationAt < 0)
    throw new Error(`csv has no Entity / Year / Population column, got: ${header}`);

  const byCountry = new Map();
  for (const line of rows) {
    const cells = line.split(",");
    const year = Number(cells[yearAt]);
    if (year !== 2000 && year !== 2023) continue;
    const entity = cells[entityAt];
    const population = Number(cells[populationAt]);
    if (!Number.isFinite(population)) continue;
    if (!byCountry.has(entity)) byCountry.set(entity, {});
    byCountry.get(entity)[year] = population;
  }

  return [...byCountry.entries()]
    .filter(([, byYear]) => Number.isFinite(byYear[2000]) && Number.isFinite(byYear[2023]))
    .map(([country, byYear]) => {
      const index2023 = (byYear[2023] / byYear[2000]) * 100;
      return {
        country,
        index2000: 100,
        index2023,
        gap: index2023 - 100,
      };
    })
    .sort((a, b) => b.gap - a.gap);
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

// The story's own frozen series, committed beside it — OWID's raw `population` grapher export,
// `&csvType=filtered&country=~CHE~DEU~FRA~ITA~AUT~SWE~NOR~ESP~GBR~POL`, verified ten-country
// (`BRIEF.md`). Never re-fetched.
const dataPath = flag("--data", join(HERE, "data.csv"));
const outDir = flag("--out", "/tmp/video-twin");
const stillOnly = argv.includes("--still-only");

await mkdir(outDir, { recursive: true });

const data = readingsFromCsv(await readFile(dataPath, "utf8"));
if (data.length !== 10)
  throw new Error(`expected ten countries, got ${data.length}`);
if (data[0].country !== BEAT.subjectCountry)
  throw new Error(
    `expected ${BEAT.subjectCountry} to have the largest gap, got ${data[0].country} (${data[0].gap})`,
  );

const props = { ...BEAT, data, ...deriveFurniture(BEAT.ground) };
const propsPath = join(outDir, "dumbbell-props.json");
await writeFile(propsPath, JSON.stringify(props, null, 2));

// Rung 2a: the last frame, on its own. If the end state is not a complete, readable chart, the
// video is wrong and nothing below is worth waiting for.
const stillPath = join(outDir, "dumbbell-final-frame.png");
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
const videoPath = join(outDir, "dumbbell.mp4");
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
