// twin/proof/vidx-line-life-expectancy/render.mjs
//
// This story's own render script — the render ladder's second rung, same shape as
// `twin-chart-video/scripts/render-video.mjs` and the other proof workspaces' (read the frozen
// CSV, still-first, then mp4), its own story constants.
//
// Usage:  bun proof/vidx-line-life-expectancy/render.mjs [--still-only] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveFurniture } from "../../skills/twin-chart-video/scripts/render-still.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const ENTRY = join(HERE, "index.ts");
const COMPOSITION = "vidx-line-life-expectancy";

/** The story's own constants — the journalist's words, from `BRIEF.md`. */
const BEAT = {
  firstYear: 1990,
  reference: 80,
  ground: "#FFFFFF",
  accent: "#0B7A75",
  title: "Switzerland has kept a longer life expectancy than France for over three decades",
  source: "Source: UN World Population Prospects (2024) & other sources, via Our World in Data · 1990–2023 data",
  referenceLabel: "80 years",
};

/**
 * OWID's grapher CSV (`Entity,Code,Year,Life expectancy`), 355 rows across two countries, France's
 * series running from 1751 and Switzerland's from 1876 (`BRIEF.md`'s own convention: the raw fetch
 * is frozen unedited; the year window is applied here, never at fetch time). The beat draws only
 * 1990–2023, the span both countries report every year.
 */
export function readingsFromCsv(csv, entity, firstYear) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.indexOf("Life expectancy");
  if (entityAt < 0 || yearAt < 0 || valueAt < 0)
    throw new Error(`csv has no Entity / Year / Life expectancy column, got: ${header}`);

  return rows
    .map((row) => row.split(","))
    .filter((cells) => cells[entityAt] === entity)
    .map((cells) => ({ year: Number(cells[yearAt]), value: Number(cells[valueAt]) }))
    .filter((r) => Number.isFinite(r.year) && Number.isFinite(r.value) && r.year >= firstYear)
    .sort((a, b) => a.year - b.year);
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

const csv = await readFile(dataPath, "utf8");
const che = readingsFromCsv(csv, "Switzerland", BEAT.firstYear);
const fra = readingsFromCsv(csv, "France", BEAT.firstYear);
if (che.length < 2 || fra.length < 2)
  throw new Error(`need at least two readings per country, got che=${che.length} fra=${fra.length}`);
if (che.length !== fra.length)
  throw new Error(`the two series must share the same years, got che=${che.length} fra=${fra.length} rows`);
if (che[che.length - 1].value <= fra[fra.length - 1].value)
  throw new Error(
    `expected Switzerland to stay ahead of France at the last year, got che=${che[che.length - 1].value} fra=${fra[fra.length - 1].value}`,
  );

const props = { ...BEAT, che, fra, ...deriveFurniture(BEAT.ground) };
delete props.firstYear;
const propsPath = join(outDir, "line-props.json");
await writeFile(propsPath, JSON.stringify(props, null, 2));

// Rung 2a: the last frame, on its own.
const stillPath = join(outDir, "line-final-frame.png");
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
const videoPath = join(outDir, "line.mp4");
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
