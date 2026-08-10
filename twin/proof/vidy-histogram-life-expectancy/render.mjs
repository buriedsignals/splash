// twin/proof/vidy-histogram-life-expectancy/render.mjs
//
// This story's own render script — the render ladder's second rung, same shape as
// `twin-chart-video/scripts/render-video.mjs` and the other proof workspaces'
// (`readingsFromCsv`, then still-first, then mp4), its own story constants.
//
// `deriveFurniture` is imported from THIS SKILL's own copy
// (`skills/twin-chart-video/scripts/render-still.mjs`) by a relative path — not the `#shared/…`
// alias and not `twin-chart-beat`'s original, the same direction
// `../video-population-growth-dumbbell/render.mjs` takes.
//
// Usage:  bun proof/vidy-histogram-life-expectancy/render.mjs [--still-only] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveFurniture,
  readPalette,
} from "../../skills/twin-chart-video/scripts/render-still.mjs";
// The annotation-ink arithmetic, reached the way every static beat reaches it. It lives HERE and
// not in `HistogramVideo.tsx` for a measured reason: it takes `contrast` from `render-still.mjs`,
// which loads a native rasteriser, and Remotion's webpack cannot parse a `.node` binary — the
// bundle fails with "Module parse failed: Unexpected character". Same split as `deriveFurniture`
// above: the rule is computed once in node and travels as a prop.
import {
  NON_TEXT_CONTRAST_FLOOR,
  assertAnnotationReadsOverMarks,
  inkThatReadsOver,
  textContrastFloor,
} from "#shared/twin-chart-beat/annotation-ink.mjs";
import { NOTE } from "./HistogramVideo.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const ENTRY = join(HERE, "index.ts");
const COMPOSITION = "vidy-histogram-life-expectancy";

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
  title:
    "In 2023, more countries reach 75-to-80 years of life expectancy than any other five-year span",
  source: "Source: UN World Population Prospects, via Our World in Data · 2023, 237 countries and territories",
  axisNote: "Countries per 5-year band",
  unitLabel: "Life expectancy at birth, years (2023)",
  binWidth: 5,
  domainStart: 50,
  domainEnd: 90,
  subjectBinStart: 75,
};

/**
 * The five-and-a-half-decade family of aggregate rows Our World in Data ships beside real
 * countries in this grapher — continents, income groups, "World" — identified by their `Code`
 * column: every one of them uses an `OWID_...` synthetic code EXCEPT Kosovo (`OWID_KOS`, a real
 * country with a disputed-but-real ISO situation, kept), and a second family of aggregates ships
 * with NO code at all ("Americas", "Land-locked Developing Countries (LLDC)", …), which the empty
 * check below also excludes. Verified by listing every 2023 entity/code pair from the frozen CSV
 * and reading the list by hand — `twin-intake/references/ourworldindata-csv-filter-trap.md`'s
 * "always verify a fetched dataset by counting rows and checking the distinct values" applied to
 * an aggregate-vs-country distinction, not just a country filter.
 */
const AGGREGATE_CODES = new Set([
  "OWID_AFR",
  "OWID_ASI",
  "OWID_EUR",
  "OWID_HIC",
  "OWID_LIC",
  "OWID_LMC",
  "OWID_OCE",
  "OWID_UMC",
  "OWID_WRL",
]);

/**
 * OWID's grapher CSV (`Entity,Code,Year,Life expectancy`), 21,565 rows across every country and
 * aggregate the grapher tracks, 1950–2023 — the committed `data.csv` is the raw, unedited fetch
 * (`BRIEF.md`'s own convention, the same one `../video-population-growth-dumbbell/render.mjs`
 * follows). This beat's window is exactly one year, 2023 — the latest year present for every
 * entity in this export (`BRIEF.md` verifies there is no 2024 row) — with the continent/income/
 * world aggregate rows excluded, leaving one reading per actual country or territory.
 */
export function readingsFromCsv(csv) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const codeAt = columns.indexOf("Code");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.indexOf("Life expectancy");
  if (entityAt < 0 || codeAt < 0 || yearAt < 0 || valueAt < 0)
    throw new Error(`csv has no Entity / Code / Year / Life expectancy column, got: ${header}`);

  const readings = [];
  for (const line of rows) {
    const cells = line.split(",");
    const year = Number(cells[yearAt]);
    if (year !== 2023) continue;
    const code = cells[codeAt];
    if (!code || AGGREGATE_CODES.has(code)) continue;
    const value = Number(cells[valueAt]);
    if (!Number.isFinite(value)) continue;
    readings.push({ entity: cells[entityAt], value });
  }
  return readings.sort((a, b) => a.value - b.value);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
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

// The story's own frozen series, committed beside it — OWID's raw `life-expectancy` grapher
// export, unfiltered (`BRIEF.md`). Never re-fetched.
const dataPath = flag("--data", join(HERE, "data.csv"));
// The artifact lands in the beat's own folder by default — where its mp4 is committed and where it
// is audited from. It used to default to a scratch directory, so running this script the obvious way
// — no arguments — produced a fresh video nobody looks at, printed a path, exited zero, and left the
// committed one stale: the presence of a file mistaken for the existence of a result.
const outDir = flag("--out", HERE);
const stillOnly = argv.includes("--still-only");

await mkdir(outDir, { recursive: true });

const readings = readingsFromCsv(await readFile(dataPath, "utf8"));

// Tripwires: the claim in the title must stay true of the data actually drawn.
if (readings.length !== 237)
  throw new Error(`expected 237 countries/territories, got ${readings.length}`);

const medianValue = median(readings.map((r) => r.value));
if (Math.abs(medianValue - 75.3128) > 0.01)
  throw new Error(`expected the median to be ~75.31 years, got ${medianValue}`);

const binCount = Math.round((BEAT.domainEnd - BEAT.domainStart) / BEAT.binWidth);
const counts = new Array(binCount).fill(0);
for (const r of readings) {
  const idx = Math.min(
    binCount - 1,
    Math.max(0, Math.floor((r.value - BEAT.domainStart) / BEAT.binWidth)),
  );
  counts[idx] += 1;
}
const modalIdx = counts.indexOf(Math.max(...counts));
const modalBinStart = BEAT.domainStart + modalIdx * BEAT.binWidth;
if (modalBinStart !== BEAT.subjectBinStart)
  throw new Error(
    `expected the tallest bin to start at ${BEAT.subjectBinStart}, got ${modalBinStart} (counts: ${counts.join(",")})`,
  );
const modalCount = counts[modalIdx];
if (modalCount !== 65)
  throw new Error(`expected the modal bin's count to be 65, got ${modalCount}`);

const referenceLabel = `Median: ${medianValue.toFixed(1)} years`;

const furniture = deriveFurniture(BEAT.ground);

// B6.4a — THE MEDIAN RULE, INKED AGAINST WHAT IT IS DRAWN OVER.
//
// It used to be `stroke={muted}` over bars that are also `muted`: **1.00:1**, an invisible rule.
// Extract frame 131 of the mp4 as it stood and the dashes stop dead at the top of the 75–80 bar.
//
// The set is this chart's WHOLE fill palette — the page, the neutral every bar wears, and the
// accent the subject bin takes at its own boundary — rather than the marks a crossing test says
// are under the rule right now. Two reasons, both deliberate:
//
//   - the ink must be ONE colour for the whole beat. The bars rise past the rule during `reveal`
//     and the subject bin changes fill at `subject`; a rule that recomputed its colour as that
//     happened would be a colour crossfade on the one mark every bar is read against.
//   - the geometry lives in the component (`histogramGeometry` needs the wrapped title's height),
//     and this script has the palette. Deriving against every fill that can appear under a rule
//     spanning the plot's full height is the conservative answer, and it costs nothing: black
//     clears all three.
//
// The answer is `#000000` — 3.39:1 over `#616161`, 4.25:1 over the accent, 21:1 over the page.
// White is the alternative pole and reaches 1.00:1 on the page, so it loses.
const medianRuleInk = inkThatReadsOver(
  [BEAT.ground, furniture.muted, BEAT.accent],
  NON_TEXT_CONTRAST_FLOOR,
);
assertAnnotationReadsOverMarks(
  { what: "the median rule", colour: medianRuleInk },
  [BEAT.ground, furniture.muted, BEAT.accent],
  NON_TEXT_CONTRAST_FLOOR,
);

// The caption stays `muted`, and that is now a measured claim rather than a habit: it is drawn
// above `plot.top` (the component throws if a future layout drops it into the plot), so the only
// thing under it is the page, and `muted` is 6.19:1 there against a 4.5:1 floor.
assertAnnotationReadsOverMarks(
  { what: `the median caption "${referenceLabel}"`, colour: furniture.muted },
  [BEAT.ground],
  textContrastFloor(NOTE),
);

const props = {
  ...BEAT,
  readings,
  medianValue,
  referenceLabel,
  medianRuleInk,
  ...furniture,
};
const propsPath = join(outDir, "histogram-props.json");
await writeFile(propsPath, JSON.stringify(props, null, 2));

// Rung 2a: the last frame, on its own. If the end state is not a complete, readable chart, the
// video is wrong and nothing below is worth waiting for.
const stillPath = join(outDir, "histogram-final-frame.png");
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
const videoPath = join(outDir, "histogram.mp4");
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
