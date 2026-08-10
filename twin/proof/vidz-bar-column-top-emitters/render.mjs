// twin/proof/vidz-bar-column-top-emitters/render.mjs
//
// This story's own render script — the render ladder's second rung, same shape as
// `chart-video/scripts/render-video.mjs` and the other proof workspaces' (read the frozen CSV,
// derive every claim from it, render the final frame FIRST, then the mp4).
//
// EVERY NUMBER AND EVERY WORD OF THE TITLE IS COMPUTED HERE. Nothing about the ranking, the count
// of columns the conclusion sums, the word for that count, or the summed total is typed. The
// project has measured what typing them costs: twelve beats in fifty-five carried a false claim,
// every one of them a value typed by hand instead of computed from the data.
//
// `deriveFurniture` and `readPalette` are imported from THIS SKILL's own copy
// (`skills/chart-video/scripts/render-still.mjs`) by a relative path — not the `#shared/*`
// alias, and not `chart-beat`'s original.
//
// Usage:  bun proof/vidz-bar-column-top-emitters/render.mjs [--still-only] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveFurniture,
  readPalette,
} from "../../skills/chart-video/scripts/render-still.mjs";
// The VIDEO genre's own size table (landscape floor 30, type scale 2.5) and the type-vs-size
// question, which is craft-neutral and therefore has one copy for both genres.
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
const BEAT_ID = "vidz-bar-column-top-emitters";
/** The chart type, in `references/types/` vocabulary — what `assertTypeMayEnter` is asked about. */
const TYPE = "column";

/** How many columns the ranking draws. The conclusion sums a subset of them, computed below. */
const RANK_COUNT = 10;
const YEAR = 2024;

/** The story's own constants — the journalist's framing, from `BRIEF.md`. Not one number here. */
const BEAT = {
  year: YEAR,
  axisTitle: `Billion tonnes of CO₂, ${YEAR}`,
  unit: "billion tonnes",
  source:
    "Source: Global Carbon Budget (2025) – with major processing by Our World in Data · " +
    "fossil fuels and industry only; land-use change is not included",
};

/** English number words, index = the number. Only ever indexed by a COMPUTED count. */
const WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
];

/**
 * OWID's `annual-co2-emissions-per-country` export, every entity, one year.
 *
 * Aggregates are dropped by the same test OWID's own downloads make possible: a row with no `Code`
 * is a region OWID assembled ("Asia", "High-income countries"), and a `Code` beginning `OWID_` is
 * an OWID-defined entity ("OWID_WRL" is the world). Everything left is a country with an ISO code,
 * which is what a ranking of countries has to be built from — filtering by a hand-written list of
 * names instead would be exactly the "typed instead of computed" failure this file exists to avoid.
 */
export function countriesInYear(csv, year) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const codeAt = columns.indexOf("Code");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.findIndex((c) => c.startsWith("Annual CO"));
  if (entityAt < 0 || codeAt < 0 || yearAt < 0 || valueAt < 0)
    throw new Error(`csv has no Entity / Code / Year / Annual CO₂ column, got: ${header}`);

  return rows
    .map((row) => row.split(","))
    .filter((cells) => Number(cells[yearAt]) === year)
    .filter((cells) => cells[codeAt] && !cells[codeAt].startsWith("OWID"))
    .map((cells) => ({ country: cells[entityAt], gt: Number(cells[valueAt]) / 1e9 }))
    .filter((r) => Number.isFinite(r.gt))
    .sort((a, b) => b.gt - a.gt);
}

/**
 * The largest k for which the leader still out-emits the k countries directly behind it, added
 * together — and it is an error if k+1 would ALSO hold, because then the headline understates the
 * data. This is the whole claim, as arithmetic; the sentence is written from its answer.
 */
export function combinedSpan(ranked) {
  const leader = ranked[0].gt;
  let k = 0;
  let total = 0;
  while (k + 1 < ranked.length && total + ranked[k + 1].gt < leader) {
    total += ranked[k + 1].gt;
    k += 1;
  }
  return { count: k, total, leader };
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
 * The video analogue of `readPngSize`, and it exists for the same reason: the only reading the code
 * that wrote the file cannot make agree with itself. `Root.tsx` sizes the composition and the
 * component draws into it, both from the same table — so they agree by construction, and an encoder
 * that letterboxed or a `--scale` left on a command line would arrive in the newsroom unnoticed.
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

// The story's own frozen series, committed beside it. Never re-fetched, and never read from /tmp:
// a render that reads its data from outside its own folder cannot be audited at all.
const dataPath = flag("--data", join(HERE, "data.csv"));
const stillOnly = argv.includes("--still-only");

// THE JOURNALIST'S DECISION, READ RATHER THAN RETYPED. Gate 2c pins a size; this beat records it in
// its own `BRIEF.md` front matter; `readPinnedSize` throws naming every path it looked at if it is
// missing. Before this the size lived as two literals in `Root.tsx` and two more in the component,
// which agreed by construction, so `size: portrait` on the slot produced 1080 x 1080 in silence.
const pinnedSize = await readPinnedSize(HERE, { readFile, dirname, join });
// `--size <name>` renders one of the OTHER two into `sizes/`, so all three can be opened and
// compared. Deliberately NOT a way to change what this beat delivers: the delivered file keeps the
// beat's own name and the pinned size, and an override says so on stdout and writes elsewhere.
const sizeFlag = argv.indexOf("--size");
const size = sizeFlag === -1 ? pinnedSize : argv[sizeFlag + 1];
// The artifact lands in the beat's own folder by default, which is where it is audited from.
const outDir = flag("--out", sizeFlag === -1 ? HERE : join(HERE, "sizes"));
const stem = sizeFlag === -1 ? "column-ranking" : `column-ranking-${size}`;
if (sizeFlag !== -1)
  console.log(`LOOKING at ${size}; the pinned size stays ${pinnedSize} -> ${outDir}`);
// …and whether this TYPE may enter that size at all. A column's category axis is nominal, so a tall
// frame asks for its twin FORM (rows), not for a stretched version of this drawing — the refusal
// names the rung and the size that works rather than drawing something no counter can fault.
const form = assertTypeMayEnter(TYPE, size, { what: BEAT_ID });
const COMPOSITION = `${BEAT_ID}-${size}`;
const { width, height } = sizeFor(size);
console.log(`pinned size: ${size} (${width}x${height}) — ${form.verdict}: ${form.reason}`);

await mkdir(outDir, { recursive: true });

const all = countriesInYear(await readFile(dataPath, "utf8"), BEAT.year);
if (all.length < 100)
  throw new Error(
    `expected the frozen file to hold every country for ${BEAT.year}, got ${all.length} — ` +
      `a ranking claim needs the whole field, not a pre-filtered subset`,
  );
const data = all.slice(0, RANK_COUNT);

const { count, total, leader } = combinedSpan(all);
if (count < 1)
  throw new Error(
    `the leader does not out-emit even the country directly behind it — this beat has no claim`,
  );
if (count + 1 >= RANK_COUNT)
  throw new Error(
    `the summed span reaches rank ${count + 1}, at or past the ${RANK_COUNT} columns drawn`,
  );
// The claim is maximal by construction (combinedSpan stops at the first k that would break it);
// this re-states it as an assertion so a future data refresh that changes the answer fails loudly
// instead of shipping an understated headline.
if (count + 1 >= all.length || total + all[count + 1].gt < leader)
  throw new Error(
    `the next ${count} combined (${total.toFixed(3)}) leave room for one more — the headline understates the data`,
  );

const combinedLabel = `The next ${WORDS[count]} combined`;
const title = `${data[0].country} emits more CO₂ than the next ${WORDS[count]} biggest emitters combined`;
const alt = `A column chart of the ${RANK_COUNT} countries with the highest CO₂ emissions in ${BEAT.year}. ${data[0].country}'s column, in the accent colour, reaches ${leader.toFixed(2)} billion tonnes. A dashed rule crosses the chart at ${total.toFixed(2)} billion tonnes, the combined total of the next ${WORDS[count]} columns (${data.slice(1, 1 + count).map((c) => c.country).join(", ")}), and ${data[0].country}'s column stands above it.`;

console.log(`ranking ${BEAT.year}: ${data.map((d, i) => `${i + 1}. ${d.country} ${d.gt.toFixed(2)}`).join(" | ")}`);
console.log(`leader ${leader.toFixed(4)} vs next ${count} combined ${total.toFixed(4)}`);
console.log(`title: ${title}`);

const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
  stopAt: resolve(HERE, ".."),
});
console.log(`palette read from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);

const props = {
  ...BEAT,
  data,
  title,
  subjectCountry: data[0].country,
  combinedCount: count,
  combinedTotal: total,
  combinedLabel,
  ground,
  accent,
  size,
  ...deriveFurniture(ground),
};
const propsPath = join(outDir, `${stem}-props.json`);
await writeFile(propsPath, JSON.stringify(props, null, 2));
await writeFile(join(outDir, "ALT.txt"), `${alt}\n`);

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
// And the DELIVERED mp4, out of the container itself. This is the assertion the whole size decision
// rests on for the video genre: everything upstream of it agrees with itself by construction.
assertDeliveredSize(mp4Size(videoPath), size, { what: videoPath });
console.log(`video → ${videoPath}  [${videoSeconds}s], verified from the container`);
