// twin/proof/vidx-scatter-income-life-expectancy/render.mjs
//
// This story's own render script — the render ladder's second rung, same shape as
// `twin-chart-video/scripts/render-video.mjs` and the other proof workspaces' (read the frozen
// CSV, still-first, then mp4), its own story constants.
//
// The frozen `data.csv` is the RAW, UNFILTERED fetch — the `country` query param has no effect on
// this particular OWID grapher (`BRIEF.md`), so all 165 countries in its one available year (2022)
// are on disk. This script selects the twenty-country peer set from within that file.
//
// Usage:  bun proof/vidx-scatter-income-life-expectancy/render.mjs [--still-only] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveFurniture,
  readPalette,
} from "../../skills/twin-chart-video/scripts/render-still.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const ENTRY = join(HERE, "index.ts");
const COMPOSITION = "vidx-scatter-income-life-expectancy";

const PEERS = [
  "United States", "Switzerland", "Germany", "France", "United Kingdom", "Japan", "Canada",
  "Australia", "Sweden", "Norway", "Netherlands", "Italy", "Spain", "South Korea", "Ireland",
  "Denmark", "Finland", "Belgium", "Austria", "Singapore",
];

// The two colours this beat is drawn in come from the recorded decision beside it, never from a
// hex typed here — see `PALETTE.md`. The search stops at `proof/`, so a palette recorded once at a
// story root would serve every beat under it.
const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
  stopAt: resolve(HERE, ".."),
});
console.log(
  `palette read from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`,
);

/** The story's own constants — the journalist's words, from `BRIEF.md`. */
const BEAT = {
  ground,
  accent,
  title: "Among twenty wealthy countries, the United States has the lowest life expectancy",
  source: "Source: World Bank via Gapminder, UN World Population Prospects (2024), via Our World in Data · 2022 data",
  subjectCountry: "United States",
  xAxisLabel: "GDP per capita ($)",
  yAxisLabel: "Life expectancy at birth (years)",
};

/**
 * OWID's grapher CSV (`Entity,Code,Year,Life expectancy at birth,GDP per capita,Population,World
 * region according to OWID`), 165 rows, all one year (2022), 165 distinct countries. Selects the
 * twenty-country peer set from within it — the country filter had no effect at fetch time
 * (`BRIEF.md`), so this is where the beat's own selection actually happens.
 */
export function readingsFromCsv(csv, peers) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const lifeAt = columns.indexOf("Life expectancy at birth");
  const gdpAt = columns.indexOf("GDP per capita");
  if (entityAt < 0 || lifeAt < 0 || gdpAt < 0)
    throw new Error(`csv has no Entity / Life expectancy / GDP per capita column, got: ${header}`);

  const byCountry = new Map();
  for (const line of rows) {
    const cells = line.split(",");
    const country = cells[entityAt];
    const lifeExpectancy = Number(cells[lifeAt]);
    const gdp = Number(cells[gdpAt]);
    if (Number.isFinite(lifeExpectancy) && Number.isFinite(gdp)) byCountry.set(country, { gdp, lifeExpectancy });
  }

  return peers.map((country) => {
    const row = byCountry.get(country);
    if (!row) throw new Error(`no complete row for ${country}`);
    return { country, ...row };
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
// The artifact lands in the beat's own folder by default — where its mp4 is committed and where it
// is audited from. It used to default to a scratch directory, so running this script the obvious way
// — no arguments — produced a fresh video nobody looks at, printed a path, exited zero, and left the
// committed one stale: the presence of a file mistaken for the existence of a result.
const outDir = flag("--out", HERE);
const stillOnly = argv.includes("--still-only");

await mkdir(outDir, { recursive: true });

const rows = readingsFromCsv(await readFile(dataPath, "utf8"), PEERS);
if (rows.length !== 20) throw new Error(`expected twenty countries, got ${rows.length}`);

// Sorted by GDP, ascending — the x-axis's own order, and the reveal's own order (`BRIEF.md`).
rows.sort((a, b) => a.gdp - b.gdp);

const subject = rows.find((r) => r.country === BEAT.subjectCountry);
const others = rows.filter((r) => r.country !== BEAT.subjectCountry);
if (!others.every((r) => r.lifeExpectancy > subject.lifeExpectancy))
  throw new Error(`expected ${BEAT.subjectCountry} to have the lowest life expectancy of the twenty`);

const peerMedian = (() => {
  const sorted = [...others].map((r) => r.lifeExpectancy).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
})();

const referenceLabel = `Peer median: ${peerMedian.toFixed(1)} years`;

const props = {
  ...BEAT,
  data: rows,
  reference: peerMedian,
  referenceLabel,
  ...deriveFurniture(BEAT.ground),
};
const propsPath = join(outDir, "scatter-props.json");
await writeFile(propsPath, JSON.stringify(props, null, 2));

// Rung 2a: the last frame, on its own.
const stillPath = join(outDir, "scatter-final-frame.png");
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
const videoPath = join(outDir, "scatter.mp4");
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
