// twin/proof/vidy-boxplot-co2-by-continent/render.mjs
//
// This story's own render script — the render ladder's second rung, same shape as
// `chart-video/scripts/render-video.mjs` and the other proof workspaces'
// (`readingsFromCsv`, then still-first, then mp4), its own story constants.
//
// `deriveFurniture` is imported from THIS SKILL's own copy
// (`skills/chart-video/scripts/render-still.mjs`) by a relative path — not the `#shared/…`
// alias, and not `chart-beat`'s original. Same direction
// `video-population-growth-dumbbell/render.mjs` takes, for the same reason: a skill never imports
// another skill, but a story workspace importing INTO a skill's own scripts is fine (the skill's
// scripts are not themselves crossing any boundary).
//
// Usage:  bun proof/vidy-boxplot-co2-by-continent/render.mjs [--still-only] [--size <name>] [--data <csv>] [--out <dir>]

import { quantile } from "d3-array";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveFurniture,
  readPalette,
} from "../../skills/chart-video/scripts/render-still.mjs";
// The VIDEO genre's own size table (landscape floor 30, type scale 2.5), and the type-vs-size
// question, which is craft-neutral and therefore has one copy serving both genres.
import {
  assertDeliveredSize,
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/chart-video/sizes.mjs";
import { assertTypeMayEnter } from "#shared/chart-beat/type-at-size.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const ENTRY = join(HERE, "index.ts");
const BEAT_ID = "vidy-boxplot-co2-by-continent";
/** The chart type, in `references/types/` vocabulary — what `assertTypeMayEnter` is asked about. */
const TYPE = "boxplot";

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
  // The multiple is a HOLE the data fills, not a number typed into a sentence. It used to read
  // "over 4×" as a literal — true against the Americas' own median (4.6× and 4.8×) while the two
  // conclusion labels beside it divided by the 53-country median and printed 3.8× and 3.9×. Two
  // true statements, one artifact, two denominators, and a reader left to reconcile them. Both
  // halves now divide by the subject group's own median — the line drawn inside the box the dots
  // escape from — and `titleGroundedInLabels` below fails the render if they ever drift apart
  // again.
  titleFor: (multiple) =>
    `CO₂ emissions per capita vary widely within every continent — and in the Americas, the US and Canada each emit over ${multiple}× the region's median`,
  source:
    "Source: Global Carbon Budget, via Our World in Data · 2023 data · whiskers = 1.5× IQR (Tukey)",
  axisUnit: "t CO₂ per person per year",
  referenceLabel: "Median across all 53 countries",
  subjectContinent: "Americas",
  year: 2023,
};

/**
 * Which of our four continent groups each ISO-3 code belongs to — the same 53-country list
 * `BRIEF.md` names, chosen by hand (countries Rémy... this session's agent actually knows), not
 * "every country on the continent." Oceania was left out (`BRIEF.md`): too sparse for an honest box.
 */
const CONTINENT_OF = {
  // Europe (15)
  CHE: "Europe",
  DEU: "Europe",
  FRA: "Europe",
  ITA: "Europe",
  ESP: "Europe",
  GBR: "Europe",
  POL: "Europe",
  SWE: "Europe",
  NOR: "Europe",
  AUT: "Europe",
  NLD: "Europe",
  BEL: "Europe",
  PRT: "Europe",
  GRC: "Europe",
  CZE: "Europe",
  // Asia (14)
  CHN: "Asia",
  JPN: "Asia",
  IND: "Asia",
  IDN: "Asia",
  SAU: "Asia",
  KOR: "Asia",
  THA: "Asia",
  VNM: "Asia",
  PAK: "Asia",
  BGD: "Asia",
  IRN: "Asia",
  ISR: "Asia",
  MYS: "Asia",
  PHL: "Asia",
  // Africa (12)
  ZAF: "Africa",
  NGA: "Africa",
  EGY: "Africa",
  KEN: "Africa",
  ETH: "Africa",
  GHA: "Africa",
  MAR: "Africa",
  DZA: "Africa",
  TUN: "Africa",
  CIV: "Africa",
  SEN: "Africa",
  TZA: "Africa",
  // Americas (12)
  USA: "Americas",
  CAN: "Americas",
  BRA: "Americas",
  MEX: "Americas",
  ARG: "Americas",
  COL: "Americas",
  CHL: "Americas",
  PER: "Americas",
  VEN: "Americas",
  CUB: "Americas",
  ECU: "Americas",
  BOL: "Americas",
};

/**
 * Parses OWID's `co-emissions-per-capita` grapher CSV (`Entity,Code,Year,CO₂ emissions per
 * capita`), groups the one target year's readings by continent, and reduces each group to a real
 * five-number summary computed from its own real per-country values — plus Tukey 1.5×IQR outliers,
 * plotted individually rather than absorbed into a stretched whisker (`boxplot.md`). Groups come
 * back sorted by median ascending, so the chart's own arrival order IS the finding's context, not a
 * separate editorial step (the same discipline `video-population-growth-dumbbell/render.mjs`
 * applies via its gap-size sort).
 */
export function readingsFromCsv(csv, { year = BEAT.year } = {}) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const codeAt = columns.indexOf("Code");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.length - 1; // the value column's header carries a non-ASCII subscript
  if (entityAt < 0 || codeAt < 0 || yearAt < 0)
    throw new Error(`csv has no Entity / Code / Year column, got: ${header}`);

  const byContinent = new Map();
  for (const line of rows) {
    const cells = line.split(",");
    if (Number(cells[yearAt]) !== year) continue;
    const code = cells[codeAt];
    const continent = CONTINENT_OF[code];
    if (!continent) continue;
    const value = Number(cells[valueAt]);
    if (!Number.isFinite(value)) continue;
    if (!byContinent.has(continent)) byContinent.set(continent, []);
    byContinent.get(continent).push({ country: cells[entityAt], value });
  }

  const groups = [...byContinent.entries()].map(([continent, readings]) => {
    const sorted = [...readings].sort((a, b) => a.value - b.value);
    const values = sorted.map((r) => r.value);
    const q1 = quantile(values, 0.25);
    const median = quantile(values, 0.5);
    const q3 = quantile(values, 0.75);
    const iqr = q3 - q1;
    const fenceLo = q1 - 1.5 * iqr;
    const fenceHi = q3 + 1.5 * iqr;
    const inFence = sorted.filter((r) => r.value >= fenceLo && r.value <= fenceHi);
    const outliers = sorted.filter((r) => r.value < fenceLo || r.value > fenceHi);
    return {
      continent,
      n: sorted.length,
      min: sorted[0].value,
      q1,
      median,
      q3,
      max: sorted[sorted.length - 1].value,
      whiskerLo: inFence[0].value,
      whiskerHi: inFence[inFence.length - 1].value,
      outliers,
    };
  });

  groups.sort((a, b) => a.median - b.median);
  return groups;
}

/** The 53-country median for the same year — the reference every box is read against. Computed
 *  from ALL readings across every group, not the mean of the four group medians (`BRIEF.md`). */
export function overallMedian(csv, { year = BEAT.year } = {}) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const codeAt = columns.indexOf("Code");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.length - 1;
  const values = [];
  for (const line of rows) {
    const cells = line.split(",");
    if (Number(cells[yearAt]) !== year) continue;
    if (!CONTINENT_OF[cells[codeAt]]) continue;
    const value = Number(cells[valueAt]);
    if (Number.isFinite(value)) values.push(value);
  }
  values.sort((a, b) => a - b);
  return quantile(values, 0.5);
}

/**
 * The claim guard this beat shipped without.
 *
 * The rendered title asserted a multiple; the two conclusion labels beside it printed a multiple;
 * nothing anywhere compared them, and the render's existing throws — four continents, their order,
 * the subject group's presence, exactly two outliers — all passed while the artifact carried "over
 * 4×" above labels reading 3.8× and 3.9×. Structure was guarded and the argument was not.
 *
 * What it asserts, on the SAME numbers `BoxplotVideo.tsx` divides and formats:
 *   1. the headline multiple is the floor of the smallest multiple any label prints, so the word
 *      "over" is true of every outlier and not just the largest;
 *   2. every label's own printed multiple — `en(value / median, 1)`, i.e. one decimal, the exact
 *      string a reader sees — still exceeds the headline after rounding, which is the check that
 *      would have caught the original defect (3.8 is not over 4);
 *   3. the title states exactly one multiple, so an editor who types a second one gets a red
 *      render instead of a second denominator.
 *
 * Returns the title. Deliberately not "returns nothing and throws": the caller cannot use the
 * sentence without going through the check.
 */
export function titleGroundedInLabels(group) {
  const median = group.median;
  if (!Number.isFinite(median) || median <= 0)
    throw new Error(`subject group has no usable median: ${median}`);
  // `en(v, 1)` in BoxplotVideo.tsx — the string the reader actually gets, rounding included.
  const printed = group.outliers.map((o) => ({
    country: o.country,
    multiple: o.value / median,
    label: Math.abs(o.value / median).toFixed(1),
  }));
  if (printed.length === 0)
    throw new Error("subject group has no outliers to state a multiple about");

  const claimed = Math.floor(Math.min(...printed.map((p) => p.multiple)));
  for (const p of printed) {
    if (!(Number(p.label) > claimed))
      throw new Error(
        `the title claims over ${claimed}× the ${group.continent} median, but the label for ` +
          `${p.country} prints ${p.label}× (raw ${p.multiple.toFixed(4)}, median ${median.toFixed(4)}) ` +
          `— the headline and the labels are not reading the same denominator`,
      );
  }

  const title = BEAT.titleFor(claimed);
  const stated = [...title.matchAll(/(\d+(?:\.\d+)?)×/g)].map((m) => m[1]);
  if (stated.length !== 1 || Number(stated[0]) !== claimed)
    throw new Error(
      `the title must state exactly one multiple and it must be ${claimed}, got [${stated.join(", ")}] in: ${title}`,
    );
  return title;
}

function remotion(args) {
  const binary = join(PACKAGE_ROOT, "node_modules/.bin/remotion");
  const started = Date.now();
  const result = spawnSync(binary, args, { cwd: PACKAGE_ROOT, stdio: "inherit" });
  if (result.status !== 0)
    throw new Error(`remotion ${args[0]} exited with ${result.status}`);
  return Math.round((Date.now() - started) / 1000);
}


/**
 * The DELIVERED mp4's own dimensions, read out of the container by `ffprobe`.
 *
 * The video analogue of `readPngSize`, and it exists for the same reason: it is the one reading the
 * code that wrote the file cannot make agree with itself. `Root.tsx` sizes the composition and the
 * component draws into it, both from the same table — so they agree by construction, and an encoder
 * that letterboxed, or a `--scale` left on a command line, would arrive in the newsroom unnoticed.
 */
function mp4Size(path) {
  const probe = spawnSync(
    "ffprobe",
    [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height",
      "-of", "csv=p=0",
      path,
    ],
    { encoding: "utf8" },
  );
  if (probe.status !== 0)
    throw new Error(`ffprobe could not read ${path}: ${probe.stderr}`);
  const [width, height] = probe.stdout.trim().split(",").map(Number);
  if (!Number.isFinite(width) || !Number.isFinite(height))
    throw new Error(`ffprobe returned no dimensions for ${path}: ${probe.stdout}`);
  return { width, height };
}

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

// The story's own frozen series, committed beside it — OWID's raw `co-emissions-per-capita`
// grapher export, `&csvType=filtered&country=~<53 ISO-3 codes>`, verified 53-country
// (`BRIEF.md`). Never re-fetched.
const dataPath = flag("--data", join(HERE, "data.csv"));
// The artifact lands in the beat's own folder by default — where its mp4 is committed and where it
// is audited from. It used to default to a scratch directory, so running this script the obvious way
// — no arguments — produced a fresh video nobody looks at, printed a path, exited zero, and left the
// committed one stale: the presence of a file mistaken for the existence of a result.
const stillOnly = argv.includes("--still-only");

// THE JOURNALIST'S DECISION, READ RATHER THAN RETYPED. Gate 2c pins a size; this beat records it in
// its own `BRIEF.md` front matter; `readPinnedSize` throws naming every path it looked at if it is
// missing. Before this, the size lived as two literals in `Root.tsx` and two more in the component,
// which agreed by construction — so `size: portrait` on the slot produced 1080 x 1080 in silence.
const pinnedSize = await readPinnedSize(HERE, { readFile, dirname, join });
// `--size <name>` renders one of the OTHER two into `sizes/`, so all three can be opened and
// compared. Deliberately NOT a way to change what this beat delivers: the delivered file keeps the
// beat's own name and the pinned size, and an override says so on stdout and writes elsewhere.
const sizeFlag = argv.indexOf("--size");
const size = sizeFlag === -1 ? pinnedSize : argv[sizeFlag + 1];
// The artifact lands in the beat's own folder by default — where its mp4 is committed and where it
// is audited from. It used to default to a scratch directory, so running this script the obvious way
// — no arguments — produced a fresh video nobody looks at, printed a path, exited zero, and left the
// committed one stale: the presence of a file mistaken for the existence of a result.
const outDir = flag("--out", sizeFlag === -1 ? HERE : join(HERE, "sizes"));
const stem = sizeFlag === -1 ? "boxplot" : `boxplot-${size}`;
if (sizeFlag !== -1)
  console.log(`LOOKING at ${size}; the pinned size stays ${pinnedSize} -> ${outDir}`);
// …and whether this TYPE may enter that size at all. A box plot's argument is the SHAPE of each
// group, it has no twin form, and no aspect range has ever been measured for it at a tall or
// square frame, so type-at-size.mjs refuses by default.
const form = assertTypeMayEnter(TYPE, size, { what: BEAT_ID });
const COMPOSITION = `${BEAT_ID}-${size}`;
const { width, height } = sizeFor(size);
console.log(`pinned size: ${size} (${width}x${height}) — ${form.verdict}: ${form.reason}`);

await mkdir(outDir, { recursive: true });

const csv = await readFile(dataPath, "utf8");
const data = readingsFromCsv(csv);
const referenceValue = overallMedian(csv);

if (data.length !== 4)
  throw new Error(`expected four continents, got ${data.length}`);
const expectedOrder = ["Africa", "Americas", "Asia", "Europe"];
const actualOrder = data.map((g) => g.continent);
if (JSON.stringify(actualOrder) !== JSON.stringify(expectedOrder))
  throw new Error(
    `expected groups sorted by median ascending as ${expectedOrder.join(", ")}, got ${actualOrder.join(", ")}`,
  );
if (!data[data.length - 1] || !data.some((g) => g.continent === BEAT.subjectContinent))
  throw new Error(`no group for subject continent ${BEAT.subjectContinent}`);
const americas = data.find((g) => g.continent === BEAT.subjectContinent);
if (americas.outliers.length !== 2)
  throw new Error(
    `expected exactly two Americas outliers (Canada, United States), got ${americas.outliers.length}: ${JSON.stringify(americas.outliers)}`,
  );

const props = {
  data,
  title: titleGroundedInLabels(americas),
  source: BEAT.source,
  axisUnit: BEAT.axisUnit,
  referenceValue,
  referenceLabel: BEAT.referenceLabel,
  subjectContinent: BEAT.subjectContinent,
  size,
  ...deriveFurniture(BEAT.ground),
  ground: BEAT.ground,
  accent: BEAT.accent,
};
const propsPath = join(outDir, `${stem}-props.json`);
await writeFile(propsPath, JSON.stringify(props, null, 2));

// Rung 2a: the last frame, on its own. If the end state is not a complete, readable chart, the
// video is wrong and nothing below is worth waiting for.
const stillPath = join(outDir, `${stem}-final-frame.png`);
const stillSeconds = remotion([
  "still",
  ENTRY,
  COMPOSITION,
  stillPath,
  "--frame=-1",
  `--props=${propsPath}`,
  "--timeout=120000",
]);
// The still, measured from its own IHDR — not from the arguments that drew it.
assertDeliveredSize(readPngSize(await readFile(stillPath)), size, {
  what: stillPath,
});
console.log(`still (--frame=-1) → ${stillPath}  [${stillSeconds}s], verified from the file`);

if (stillOnly) process.exit(0);

// Rung 2b: the mp4. Concurrency 1 keeps the render deterministic and the machine usable.
const videoPath = join(outDir, `${stem}.mp4`);
const videoSeconds = remotion([
  "render",
  ENTRY,
  COMPOSITION,
  videoPath,
  `--props=${propsPath}`,
  "--concurrency=1",
  "--timeout=120000",
]);
// And the DELIVERED mp4, out of the container itself. This is the assertion the whole size
// decision rests on for the video genre: everything upstream of it agrees with itself by
// construction.
assertDeliveredSize(mp4Size(videoPath), size, { what: videoPath });
console.log(`video → ${videoPath}  [${videoSeconds}s], verified from the container`);
