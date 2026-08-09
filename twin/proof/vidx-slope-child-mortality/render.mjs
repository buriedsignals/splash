// twin/proof/vidx-slope-child-mortality/render.mjs
//
// This story's own render script — the render ladder's second rung, same shape as
// `twin-chart-video/scripts/render-video.mjs` and the other proof workspaces' (read the frozen
// CSV, still-first, then mp4), its own story constants.
//
// Usage:  bun proof/vidx-slope-child-mortality/render.mjs [--still-only] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveFurniture } from "../../skills/twin-chart-video/scripts/render-still.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const ENTRY = join(HERE, "index.ts");
const COMPOSITION = "vidx-slope-child-mortality";

/** The story's own constants — the journalist's words, from `BRIEF.md`. */
const BEAT = {
  countries: ["Niger", "Nigeria", "Rwanda", "India", "Brazil", "Switzerland"], // sorted by 1990 value, descending
  ground: "#FFFFFF",
  accent: "#0B7A75",
  title: "Rwanda cut its child mortality rate by three-quarters since 1990",
  source: "Source: UN Inter-agency Group for Child Mortality Estimation, via Our World in Data · 1990 & 2023 data",
  reference: 2.5,
  referenceLabel: "UN SDG target for 2030: 2.5%",
  periodLabels: ["1990", "2023"],
  subjectCountry: "Rwanda",
};

/**
 * OWID's grapher CSV (`Entity,Code,Year,Under-five mortality rate (selected)`), 542 rows across
 * six countries. This beat's window is exactly two years, 1990 and 2023, per country.
 */
export function readingsFromCsv(csv) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.findIndex((c) => c.startsWith("Under-five mortality"));
  if (entityAt < 0 || yearAt < 0 || valueAt < 0)
    throw new Error(`csv has no Entity / Year / Under-five mortality column, got: ${header}`);

  const byEntity = new Map();
  for (const line of rows) {
    const cells = line.split(",");
    const year = Number(cells[yearAt]);
    if (year !== 1990 && year !== 2023) continue;
    const entity = cells[entityAt];
    const value = Number(cells[valueAt]);
    if (!Number.isFinite(value)) continue;
    if (!byEntity.has(entity)) byEntity.set(entity, {});
    byEntity.get(entity)[year] = value;
  }

  return BEAT.countries.map((country) => {
    const byYear = byEntity.get(country);
    if (!byYear || !Number.isFinite(byYear[1990]) || !Number.isFinite(byYear[2023]))
      throw new Error(`missing 1990/2023 data for ${country}`);
    return { country, v1990: byYear[1990], v2023: byYear[2023] };
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

const data = readingsFromCsv(await readFile(dataPath, "utf8"));
if (data.length !== 6) throw new Error(`expected six countries, got ${data.length}`);

// Sorted by 1990 value, descending — the worst 1990 crisis draws first (`BRIEF.md`).
data.sort((a, b) => b.v1990 - a.v1990);
if (data[0].country !== "Niger")
  throw new Error(`expected Niger to have the highest 1990 value, got ${data[0].country}`);
if (!data.every((d) => d.v2023 < d.v1990))
  throw new Error("expected every country's rate to have fallen between 1990 and 2023");

const props = {
  ...BEAT,
  data,
  ...deriveFurniture(BEAT.ground),
};
delete props.countries;
const propsPath = join(outDir, "slope-props.json");
await writeFile(propsPath, JSON.stringify(props, null, 2));

// Rung 2a: the last frame, on its own.
const stillPath = join(outDir, "slope-final-frame.png");
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
const videoPath = join(outDir, "slope.mp4");
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
