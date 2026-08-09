// twin/proof/vidx-grouped-bar-co2-per-capita/render.mjs
//
// This story's own render script — the render ladder's second rung, same shape as
// `twin-chart-video/scripts/render-video.mjs` and the other proof workspaces' (read the frozen
// CSV, still-first, then mp4), its own story constants.
//
// Usage:  bun proof/vidx-grouped-bar-co2-per-capita/render.mjs [--still-only] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveFurniture } from "../../skills/twin-chart-video/scripts/render-still.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const ENTRY = join(HERE, "index.ts");
const COMPOSITION = "vidx-grouped-bar-co2-per-capita";

/** The story's own constants — the journalist's words, from `BRIEF.md`. */
const BEAT = {
  countries: ["United States", "China", "Brazil", "India", "Nigeria"], // sorted by 2023 value, descending
  ground: "#FFFFFF",
  accent: "#0B7A75",
  title: "China's per-person CO₂ emissions have nearly tripled since 2000, overtaking the world average",
  source: "Source: Global Carbon Budget (2025), via Our World in Data · 2000 & 2023 data, per capita",
  legendLabels: ["2000", "2023"],
  subjectCountry: "China",
};

/**
 * OWID's grapher CSV (`Entity,Code,Year,CO₂ emissions per capita`), 1007 rows across six entities
 * (five countries plus the World aggregate). This beat's window is exactly two years, 2000 and
 * 2023, per country — plus the World entity's 2023 row for the reference level.
 */
export function readingsFromCsv(csv) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.findIndex((c) => c.startsWith("CO"));
  if (entityAt < 0 || yearAt < 0 || valueAt < 0)
    throw new Error(`csv has no Entity / Year / CO2-per-capita column, got: ${header}`);

  const byEntity = new Map();
  for (const line of rows) {
    const cells = line.split(",");
    const year = Number(cells[yearAt]);
    if (year !== 2000 && year !== 2023) continue;
    const entity = cells[entityAt];
    const value = Number(cells[valueAt]);
    if (!Number.isFinite(value)) continue;
    if (!byEntity.has(entity)) byEntity.set(entity, {});
    byEntity.get(entity)[year] = value;
  }

  const worldReference = byEntity.get("World")?.[2023];
  if (!Number.isFinite(worldReference)) throw new Error("no World 2023 reference row found");

  const data = BEAT.countries.map((country) => {
    const byYear = byEntity.get(country);
    if (!byYear || !Number.isFinite(byYear[2000]) || !Number.isFinite(byYear[2023]))
      throw new Error(`missing 2000/2023 data for ${country}`);
    return { country, y2000: byYear[2000], y2023: byYear[2023] };
  });

  return { data, worldReference };
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
// The artifact lands in the beat's own folder by default — where its mp4 is committed and where it
// is audited from. It used to default to a scratch directory, so running this script the obvious way
// — no arguments — produced a fresh video nobody looks at, printed a path, exited zero, and left the
// committed one stale: the presence of a file mistaken for the existence of a result.
const outDir = flag("--out", HERE);
const stillOnly = argv.includes("--still-only");

await mkdir(outDir, { recursive: true });

const { data, worldReference } = readingsFromCsv(await readFile(dataPath, "utf8"));
if (data.length !== 5) throw new Error(`expected five countries, got ${data.length}`);
// Sorted by 2023 value, descending — the chart's own row/category order IS the finding
// (`BRIEF.md`), never a separate editorial step.
data.sort((a, b) => b.y2023 - a.y2023);
if (data[0].country !== "United States")
  throw new Error(`expected United States to have the largest 2023 value, got ${data[0].country}`);
if (data[1].country !== BEAT.subjectCountry)
  throw new Error(`expected ${BEAT.subjectCountry} to sort second, got ${data[1].country}`);

const referenceLabel = `World average, 2023: ${worldReference.toFixed(2)} t`;

const props = {
  ...BEAT,
  data,
  reference: worldReference,
  referenceLabel,
  ...deriveFurniture(BEAT.ground),
};
delete props.countries;
const propsPath = join(outDir, "grouped-bar-props.json");
await writeFile(propsPath, JSON.stringify(props, null, 2));

// Rung 2a: the last frame, on its own.
const stillPath = join(outDir, "grouped-bar-final-frame.png");
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
const videoPath = join(outDir, "grouped-bar.mp4");
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
