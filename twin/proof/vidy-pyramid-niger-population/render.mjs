// twin/proof/vidy-pyramid-niger-population/render.mjs
//
// This story's own render script — the render ladder's second rung, same shape as
// `../video-population-growth-dumbbell/render.mjs` and `twin-chart-video/scripts/render-video.mjs`
// (`readingsFromCsv`, then still-first, then mp4), its own story constants.
//
// `deriveFurniture` is imported from `twin-chart-video`'s own copy
// (`skills/twin-chart-video/scripts/render-still.mjs`) by a relative path — the same direction
// `../video-population-growth-dumbbell/render.mjs` uses, not the `#shared/*` alias: a story workspace
// reaches a skill's script by relative path for the render-time-only node helpers, and consumes the
// shared TYPE via `#shared/*` in the composition/timing files instead.
//
// Usage:  bun proof/vidy-pyramid-niger-population/render.mjs [--still-only] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveFurniture } from "../../skills/twin-chart-video/scripts/render-still.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const ENTRY = join(HERE, "index.ts");
const COMPOSITION = "vidy-pyramid-niger-population";

/** The story's own constants — the journalist's words, from `BRIEF.md`. */
const BEAT = {
  ground: "#FFFFFF",
  male: "#0072B2",
  female: "#D55E00",
  title: "Niger's youngest age band dwarfs its entire population aged 65 and older",
  note: "Each bar pair is a five-year age band's population by sex, 2023",
  source:
    "Source: UN, World Population Prospects (2024), via Our World in Data · 2023 data",
  referenceLabel: "Both sides share a zero at the centre",
  legendLabels: ["Male", "Female"],
  subjectBand: "0-4",
};

const ELDER_BANDS = new Set([
  "65-69",
  "70-74",
  "75-79",
  "80-84",
  "85-89",
  "90-94",
  "95-99",
  "100+",
]);

/**
 * OWID's grapher CSVs (`male-population-by-age-group.csv` and `female-population-by-age-group.csv`),
 * merged at freeze time into `data.csv`'s `age_band,male,female` shape — the same convention
 * `../static-swiss-age-pyramid/data.csv` uses. Rows are in their DATA-NATURAL order: youngest first
 * ("0-4"), oldest last ("100+"). This function returns them in that same order unchanged —
 * `PyramidVideo.tsx` does the one, documented reversal to display order (oldest at top) itself, so
 * there is exactly one place in the whole pipeline where that reversal happens.
 */
export function readingsFromCsv(csv) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const bandAt = columns.indexOf("age_band");
  const maleAt = columns.indexOf("male");
  const femaleAt = columns.indexOf("female");
  if (bandAt < 0 || maleAt < 0 || femaleAt < 0)
    throw new Error(`csv has no age_band / male / female column, got: ${header}`);

  return rows.map((line) => {
    const cells = line.split(",");
    const ageBand = cells[bandAt];
    const male = Number(cells[maleAt]);
    const female = Number(cells[femaleAt]);
    if (!Number.isFinite(male) || !Number.isFinite(female))
      throw new Error(`non-numeric male/female for band ${ageBand}: ${line}`);
    return { ageBand, male, female };
  });
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

// The story's own frozen series, committed beside it — merged from OWID's two raw
// `*-population-by-age-group.csv` grapher exports, `&csvType=filtered&country=~NER`, verified
// single-country, single-year (2023) (`BRIEF.md`). Never re-fetched.
const dataPath = flag("--data", join(HERE, "data.csv"));
const outDir = flag("--out", "/tmp/vidy-pyramid-niger-population");
const stillOnly = argv.includes("--still-only");

await mkdir(outDir, { recursive: true });

const data = readingsFromCsv(await readFile(dataPath, "utf8"));
if (data.length !== 21)
  throw new Error(`expected 21 age bands, got ${data.length}`);
if (data[0].ageBand !== BEAT.subjectBand)
  throw new Error(
    `expected the first (youngest) band to be the subject ${BEAT.subjectBand}, got ${data[0].ageBand}`,
  );

// The two facts `conclusion` states, computed from the actual data — not hardcoded — and checked
// here so a bad freeze fails loud before it ever reaches the render.
const subjectRow = data.find((b) => b.ageBand === BEAT.subjectBand);
const subjectTotal = subjectRow.male + subjectRow.female;
const elderTotal = data
  .filter((b) => ELDER_BANDS.has(b.ageBand))
  .reduce((sum, b) => sum + b.male + b.female, 0);
const grandTotal = data.reduce((sum, b) => sum + b.male + b.female, 0);
console.table(
  data.map((b) => ({ band: b.ageBand, male: b.male, female: b.female, total: b.male + b.female })),
);
console.log(`0-4 band total: ${subjectTotal.toLocaleString()}`);
console.log(`65+ population total: ${elderTotal.toLocaleString()}`);
console.log(`ratio: ${(subjectTotal / elderTotal).toFixed(2)}x`);
console.log(`grand total (sum of bands): ${grandTotal.toLocaleString()}`);
if (subjectTotal <= elderTotal)
  throw new Error(
    `expected the 0-4 band (${subjectTotal}) to exceed the 65+ population (${elderTotal}) — the claim does not hold`,
  );
// `data` is in its natural, youngest-first order (0-4 at index 0, 100+ at the last index), so age
// INCREASES with the array index. Every successive (older) band must be no larger than the one
// before it (younger) — the monotonic "youthquake" silhouette the reveal order (oldest first,
// escalating toward the youngest) depends on. If this ever fails on a re-freeze, the reveal order
// this beat chose no longer matches the data it draws.
for (let i = 1; i < data.length; i++) {
  const youngerTotal = data[i - 1].male + data[i - 1].female;
  const olderTotal = data[i].male + data[i].female;
  if (olderTotal > youngerTotal)
    throw new Error(
      `band ${data[i].ageBand} (${olderTotal}) is larger than the younger band ${data[i - 1].ageBand} (${youngerTotal}) — the monotonic escalation this beat's reveal order depends on does not hold`,
    );
}

const props = {
  ...BEAT,
  data,
  elderTotal,
  ...deriveFurniture(BEAT.ground),
};
const propsPath = join(outDir, "pyramid-props.json");
await writeFile(propsPath, JSON.stringify(props, null, 2));

// Rung 2a: the last frame, on its own. If the end state is not a complete, readable chart, the
// video is wrong and nothing below is worth waiting for.
const stillPath = join(outDir, "pyramid-final-frame.png");
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
const videoPath = join(outDir, "pyramid.mp4");
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
