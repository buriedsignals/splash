// twin/proof/vidy-lollipop-renewables-share-europe/render.mjs
//
// This story's own render script — the render ladder's second rung, same shape as
// `twin-chart-video/scripts/render-video.mjs` and the other proof workspaces' (`readingsFromCsv`,
// then still-first, then mp4), its own story constants.
//
// `deriveFurniture` is imported from THIS SKILL's own copy
// (`skills/twin-chart-video/scripts/render-still.mjs`) by a relative path — not the `#shared/*`
// alias, and not `twin-chart-beat`'s original. The two files are byte-identical (both are copies of
// the one canonical implementation), so the choice changes nothing about what gets rendered; it is
// a direction, not a different function.
//
// Usage:  bun proof/vidy-lollipop-renewables-share-europe/render.mjs [--still-only] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveFurniture } from "../../skills/twin-chart-video/scripts/render-still.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const ENTRY = join(HERE, "index.ts");
const COMPOSITION = "vidy-lollipop-renewables-share-europe";

/** The story's own constants — the journalist's words, from `BRIEF.md`. */
const BEAT = {
  ground: "#FFFFFF",
  accent: "#0B7A75",
  title:
    "Switzerland's share of renewable electricity trails Norway's by more than 31 points",
  source:
    "Source: Ember & Energy Institute – Statistical Review of World Energy, via Our World in Data · latest available year, mostly 2025 (Iceland: 2024) · share of electricity generation from renewables",
  subjectCountry: "Switzerland",
  compareCountry: "Norway",
  // The fourteen countries this beat draws — the exact `Entity` spelling the CSV uses. See
  // `BRIEF.md`'s "A sharper version of the known OWID CSV filter trap": the fetch's own
  // `&country=` filter had no effect for this indicator, so filtering happens here, in code,
  // against the full frozen export — never re-fetched.
  countries: [
    "Iceland",
    "Norway",
    "Denmark",
    "Austria",
    "Portugal",
    "Sweden",
    "Switzerland",
    "Germany",
    "Finland",
    "Spain",
    "United Kingdom",
    "Italy",
    "Poland",
    "France",
  ],
};

/**
 * OWID's `electricity-mix` export (`Entity,Code,Year,Renewables,Renewables (Original Year)`), 192
 * rows, one per entity's latest available year — not a time series (`BRIEF.md`'s own note on the
 * indicator's shape). Filters to `BEAT.countries`, then sorts by value descending, so the chart's
 * own row order IS the ranking, not a separate editorial step.
 */
export function readingsFromCsv(csv) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const valueAt = columns.indexOf("Renewables");
  if (entityAt < 0 || valueAt < 0)
    throw new Error(`csv has no Entity / Renewables column, got: ${header}`);

  const wanted = new Set(BEAT.countries);
  const byCountry = new Map();
  for (const line of rows) {
    const cells = line.split(",");
    const entity = cells[entityAt];
    if (!wanted.has(entity)) continue;
    const value = Number(cells[valueAt]);
    if (!Number.isFinite(value)) continue;
    byCountry.set(entity, value);
  }

  return BEAT.countries.filter((c) => byCountry.has(c))
    .map((country) => ({ country, value: byCountry.get(country) }))
    .sort((a, b) => b.value - a.value);
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

// The story's own frozen series, committed beside it — OWID's raw `electricity-mix` export,
// unfiltered by the fetch (`BRIEF.md`'s trap note), filtered to the fourteen target countries here.
// Never re-fetched.
const dataPath = flag("--data", join(HERE, "data.csv"));
// The artifact lands in the beat's own folder by default — where its mp4 is committed and where it
// is audited from. It used to default to a scratch directory, so running this script the obvious way
// — no arguments — produced a fresh video nobody looks at, printed a path, exited zero, and left the
// committed one stale: the presence of a file mistaken for the existence of a result.
const outDir = flag("--out", HERE);
const stillOnly = argv.includes("--still-only");

await mkdir(outDir, { recursive: true });

const data = readingsFromCsv(await readFile(dataPath, "utf8"));
if (data.length !== BEAT.countries.length)
  throw new Error(
    `expected ${BEAT.countries.length} countries, got ${data.length}`,
  );
if (data[0].value !== 100 || data[0].country !== "Iceland")
  throw new Error(
    `expected Iceland at 100% to lead the ranking, got ${data[0].country} (${data[0].value})`,
  );
const subjectRow = data.find((r) => r.country === BEAT.subjectCountry);
const compareRow = data.find((r) => r.country === BEAT.compareCountry);
if (!subjectRow || !compareRow)
  throw new Error("subject or compare country missing from the filtered data");
if (compareRow.value - subjectRow.value <= 30)
  throw new Error(
    `expected ${BEAT.compareCountry} to lead ${BEAT.subjectCountry} by more than 30 points, got ${(compareRow.value - subjectRow.value).toFixed(1)}`,
  );

const props = { ...BEAT, data, ...deriveFurniture(BEAT.ground) };
const propsPath = join(outDir, "lollipop-props.json");
await writeFile(propsPath, JSON.stringify(props, null, 2));

// Rung 2a: the last frame, on its own. If the end state is not a complete, readable chart, the
// video is wrong and nothing below is worth waiting for.
const stillPath = join(outDir, "lollipop-final-frame.png");
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
const videoPath = join(outDir, "lollipop.mp4");
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
