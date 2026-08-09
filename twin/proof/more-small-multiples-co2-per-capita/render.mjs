// twin/proof/more-small-multiples-co2-per-capita/render.mjs
//
// Same shape as `../video-cumulative-co2-area/render.mjs`, `../life-expectancy/render.mjs` and
// `../migration/render.mjs` — still-first, then mp4, this story's own frozen data and constants.
//
// Usage: bun render.mjs [--still-only] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveFurniture } from "#shared/twin-chart-beat/render-still.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const ENTRY = join(HERE, "index.ts");
const COMPOSITION = "small-multiples-co2";

const BEAT = {
  ground: "#FFFFFF",
  accent: "#0B7A75",
  title:
    "Poland's per-capita CO2 emissions have overtaken Germany's, even as both have fallen sharply since their 1979-80 peaks.",
  source:
    "Source: Global Carbon Budget 2025, via Our World in Data · 1950-2024, extracted 8 August 2026",
  limits: "Territorial emissions only. Same zero-based scale on every panel.",
  conclusionText:
    "In 2024, Poland emitted 7.1 t per person against Germany's 6.8 t — a gap that did not exist a decade ago.",
};

/** OWID's `co-emissions-per-capita` grapher CSV, four countries at once, `&csvType=filtered`
 *  (`twin-intake/references/ourworldindata-csv-filter-trap.md`) — verified below to contain only
 *  these four entities before being trusted. */
export function readingsByCountryFromCsv(csv, { countries, firstYear }) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.findIndex((c) => c.startsWith("CO"));
  if (entityAt < 0 || yearAt < 0 || valueAt < 0)
    throw new Error(`csv missing Entity/Year/CO2 column, got: ${header}`);

  const byCountry = new Map(countries.map((c) => [c, []]));
  for (const row of rows) {
    const cells = row.split(",");
    const entity = cells[entityAt];
    if (!byCountry.has(entity)) continue;
    const year = Number(cells[yearAt]);
    const value = Number(cells[valueAt]);
    if (!Number.isFinite(year) || !Number.isFinite(value) || year < firstYear) continue;
    byCountry.get(entity).push({ year, value });
  }
  for (const [country, readings] of byCountry) {
    readings.sort((a, b) => a.year - b.year);
    if (readings.length === 0) throw new Error(`no readings found for ${country}`);
  }
  return byCountry;
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

const COUNTRIES_ORDER = ["Switzerland", "France", "Germany", "Poland"]; // ascending 2024 value
const csv = await readFile(dataPath, "utf8");
const byCountry = readingsByCountryFromCsv(csv, { countries: COUNTRIES_ORDER, firstYear: 1950 });

console.log(`row count check per country:`);
for (const c of COUNTRIES_ORDER) console.log(`  ${c}: ${byCountry.get(c).length} readings`);

// Verify the claim against the data actually parsed — never assumed. The claim is that Poland's
// LAST reading exceeds Germany's last reading, and that both are below their own historical peaks.
const last = (c) => byCountry.get(c)[byCountry.get(c).length - 1];
const peak = (c) => byCountry.get(c).reduce((a, b) => (b.value > a.value ? b : a));
const polandLast = last("Poland");
const germanyLast = last("Germany");
if (!(polandLast.value > germanyLast.value))
  throw new Error(
    `claim requires Poland (${polandLast.value}) > Germany (${germanyLast.value}) in their final year, but it does not hold`,
  );
for (const c of COUNTRIES_ORDER) {
  const p = peak(c);
  const l = last(c);
  if (l.value >= p.value)
    throw new Error(`${c}: last reading (${l.value}) is not below its own peak (${p.value} in ${p.year})`);
  console.log(`  ${c}: peak ${p.value.toFixed(2)} (${p.year}) -> last ${l.value.toFixed(2)} (${l.year})`);
}
console.log(
  `conclusion check: Poland ${polandLast.value.toFixed(1)} (${polandLast.year}) > Germany ${germanyLast.value.toFixed(1)} (${germanyLast.year})`,
);

const countries = COUNTRIES_ORDER.map((name) => ({ name, data: byCountry.get(name) }));
const props = {
  ...BEAT,
  countries,
  order: [0, 1, 2, 3], // reading order == the array order above (already ascending final value)
  subjectIndex: 3, // Poland
  ...deriveFurniture(BEAT.ground),
};
const propsPath = join(outDir, "small-multiples-co2-props.json");
await writeFile(propsPath, JSON.stringify(props, null, 2));

// Rung 2a: the last frame, on its own, first.
const stillPath = join(outDir, "small-multiples-co2-final-frame.png");
const stillSeconds = remotion([
  "still",
  ENTRY,
  COMPOSITION,
  stillPath,
  "--frame=-1",
  `--props=${propsPath}`,
  "--timeout=120000",
]);
console.log(`still (--frame=-1) -> ${stillPath}  [${stillSeconds}s]`);

if (stillOnly) process.exit(0);

// Rung 2b: the mp4. Concurrency 1 keeps the render deterministic.
const videoPath = join(outDir, "small-multiples-co2.mp4");
const videoSeconds = remotion([
  "render",
  ENTRY,
  COMPOSITION,
  videoPath,
  `--props=${propsPath}`,
  "--concurrency=1",
  "--timeout=120000",
]);
console.log(`video -> ${videoPath}  [${videoSeconds}s]`);
