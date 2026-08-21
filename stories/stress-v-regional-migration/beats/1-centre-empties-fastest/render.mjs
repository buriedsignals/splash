// stories/stress-v-regional-migration/beats/1-centre-empties-fastest/render.mjs
//
// This beat's own render script — the render ladder's second rung: read the frozen CSV, derive
// every claim from it, measure the framing, render the final frame FIRST, then the mp4.
//
// Usage:
//   bun render.mjs --still-only              the last frame at the PINNED size (portrait)
//   bun render.mjs                           still + mp4 at the pinned size
//   bun render.mjs --size square             the second form the journalist asked for
//   bun render.mjs --out <dir> --data <csv>

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveFurniture,
  framingMeasurement,
  readPalette,
  readTypeface,
} from "../../../../skills/chart-video/scripts/render-still.mjs";
import {
  assertDeliveredSize,
  assertTypeFloor,
  assertWithinStage,
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/chart-video/sizes.mjs";
import { creditLine, parseStoryboard } from "../../../../skills/storyboard/scripts/storyboard.mjs";
import { layoutFor, textRunsMarkup } from "./RegionalMigrationVideo.tsx";

/**
 * RFC 4180 row tokeniser, inlined here rather than imported — no cross-skill runtime import for a
 * thing this small, and a story workspace is not a skill either.
 */
function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i += 1; continue;
      }
      field += char; i += 1; continue;
    }
    if (char === '"') { quoted = true; i += 1; continue; }
    if (char === ",") { row.push(field); field = ""; i += 1; continue; }
    if (char === "\r") { row.push(field); rows.push(row); row = []; field = ""; i += (text[i + 1] === "\n") ? 2 : 1; continue; }
    if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; i += 1; continue; }
    field += char; i += 1;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = resolve(HERE, "../..");
const PACKAGE_ROOT = resolve(HERE, "../../../..");
const ENTRY = join(HERE, "index.ts");

/**
 * Reads `region,net_migration_2025,population` and returns the rows sorted by net migration,
 * descending — largest gain first, largest loss last. Sorting is this script's job, never the
 * component's.
 */
export function regionsFromCsv(csv) {
  const [header, ...rows] = parseCsvRows(csv.trim());
  const regionAt = header.indexOf("region");
  const netAt = header.indexOf("net_migration_2025");
  const popAt = header.indexOf("population");
  if (regionAt < 0 || netAt < 0 || popAt < 0)
    throw new Error(`csv has no region / net_migration_2025 / population column, got: ${header}`);
  return rows
    .filter((cells) => cells.length > 1 || cells[0] !== "")
    .map((cells) => ({
      region: cells[regionAt],
      net: Number(cells[netAt]),
      population: Number(cells[popAt]),
    }))
    .filter((r) => r.region && Number.isFinite(r.net) && Number.isFinite(r.population))
    .sort((a, b) => b.net - a.net);
}

/** People per thousand residents, the denominator reading this beat declares but does not draw. */
export function perThousand(row) {
  return (row.net / row.population) * 1000;
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
// `renders/` is where a beat's rendered draft lives — `renderDigest` (deliver's own
// `output-review.mjs`) hashes that directory and nothing else, so an approval bound to a render
// sitting in the beat root would bind an empty tree and throw.
const outDir = flag("--out", join(HERE, "renders"));
const stillOnly = argv.includes("--still-only");

const pinned = await readPinnedSize(HERE, { readFile, dirname, join });
const size = flag("--size", pinned);
sizeFor(size); // throws, naming the three, on anything else
if (size !== pinned)
  console.log(
    `size ${size} is NOT this beat's pinned size (${pinned}); rendering the second form the ` +
      `journalist asked for. The pinned size is what gate 2c recorded and what delivery ships first.`,
  );

await mkdir(outDir, { recursive: true });

const rows = regionsFromCsv(await readFile(dataPath, "utf8"));
if (rows.length !== 7) throw new Error(`expected 7 regions, got ${rows.length}`);

// ── The facts this beat's argument rests on, asserted from the frozen data, never typed by hand.
const losers = rows.filter((r) => r.net < 0);
const gainers = rows.filter((r) => r.net > 0);
if (losers.length !== 4 || gainers.length !== 3)
  throw new Error(
    `expected four losing and three gaining regions; got ${losers.length} and ${gainers.length} — ` +
      `the title says "four regions" and the diverging treatment was chosen for a domain that ` +
      `crosses zero. Re-check the takeaway before rendering.`,
  );
const national = rows.reduce((sum, r) => sum + r.net, 0);
const worst = rows[rows.length - 1];
const smallest = [...rows].sort((a, b) => Math.abs(a.net) - Math.abs(b.net))[0];
if (worst.region !== "Centre")
  throw new Error(`expected Centre to be the largest loss, got ${worst.region}`);

// ── FRAMING (`framing-serves-the-point`). Printed, never a refusal and never a treatment choice.
const signed = framingMeasurement(rows.map((r) => r.net));
const magnitudes = framingMeasurement(rows.map((r) => Math.abs(r.net)));
const smallestAgainstLargest = Math.abs(smallest.net) / Math.abs(worst.net);
console.log(
  `framing (signed values): spreadAgainstExtent ${signed.spreadAgainstExtent.toFixed(3)}, ` +
    `largestAgainstMedian ${signed.largestAgainstMedian} ` +
    `[median ${signed.median} — a series that crosses zero has a negative median, so this reading ` +
    `is null and the outlier question has to be asked of the MAGNITUDES instead]`,
);
console.log(
  `framing (magnitudes): spreadAgainstExtent ${magnitudes.spreadAgainstExtent.toFixed(3)}, ` +
    `largestAgainstMedian ${magnitudes.largestAgainstMedian.toFixed(2)}x ` +
    `[max ${magnitudes.max}, median ${magnitudes.median}, min ${magnitudes.min}]`,
);
console.log(
  `smallest against largest: ${smallest.region} ${smallest.net} is ` +
    `${(smallestAgainstLargest * 100).toFixed(1)}% of ${worst.region} ${worst.net} — kept at the ` +
    `same scale, its number outside the bar`,
);

// ── The denominator, named by the profiler and by grounding. Reported, never divided into a verdict.
const byRate = [...rows].sort((a, b) => perThousand(b) - perThousand(a));
console.log(
  `denominator "population" sits beside "net_migration_2025". Per 1000 residents: ` +
    byRate.map((r) => `${r.region} ${perThousand(r).toFixed(1)}`).join(", "),
);
console.log(
  `raw top gainer ${gainers[0].region} (${gainers[0].net}); per-1000 top gainer ` +
    `${byRate[0].region} (${perThousand(byRate[0]).toFixed(1)}) — the two readings DISAGREE at the ` +
    `top of the gaining half, and the caveat says so on the artefact.`,
);

// ── Colour, type, and the credit — every one read from a recorded answer, never a literal.
const { ground, accent, origin, source: paletteSource } = readPalette(HERE, { stopAt: STORY });
console.log(`palette read from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);
const typeface = readTypeface(HERE, { stopAt: STORY });
console.log(`typeface read from ${typeface.source} — ${typeface.family}, origin ${typeface.origin}`);

const { meta } = parseStoryboard(await readFile(join(STORY, "STORYBOARD.md"), "utf8"));
const credit = creditLine(meta.credit);
console.log(`credit recorded as ${JSON.stringify(meta.credit)} — the artefact prints ${JSON.stringify(credit)}`);

const title = "Four regions emptied in 2025 — and one of them did most of it";
const axisTitle = "Net migration, 2025, people";
const caveat =
  `Net balance only: births and deaths are not in this table. Per 1000 residents ` +
  `${byRate[0].region}, not ${gainers[0].region}, gained most.`;
const conclusion =
  `Across all seven regions the balance is a net loss of ` +
  `${Math.abs(national).toLocaleString("en-GB").replace(/,/g, " ")} people.`;
const sourceLine = credit;

const alt =
  `A diverging bar chart of net migration in 2025 for seven regions, ordered from the largest gain ` +
  `to the largest loss, every bar growing from one vertical zero line at the same scale. Three ` +
  `bars run right: ` +
  gainers.map((r) => `${r.region} gained ${r.net}`).join(", ") +
  `. Four run left: ` +
  losers.map((r) => `${r.region} lost ${Math.abs(r.net)}`).join(", ") +
  `. ${worst.region}'s bar is by far the longest and is the one the chart is about, drawn in the ` +
  `accent colour with its whole row shaded; ${smallest.region}'s is a sliver ` +
  `${(smallestAgainstLargest * 100).toFixed(1)} per cent of its length, with its number set ` +
  `outside the bar rather than inside. A closing line states the national balance, a net loss of ` +
  `${Math.abs(national)} people across all seven regions.`;

console.log(`title: ${title}`);
console.log(`conclusion: ${conclusion}`);

const props = {
  data: rows.map(({ region, net }) => ({ region, net })),
  size,
  title,
  source: sourceLine,
  caveat,
  axisTitle,
  subjectRegion: worst.region,
  conclusion,
  fontFamily: typeface.family,
  ground,
  accent,
  ...deriveFurniture(ground),
};
// The props file is BUILD INPUT, not a deliverable, and it is written OUTSIDE `renders/` for a
// reason found by delivering this beat once: the `owned-file` form is `copyTree(renders -> export)`
// with no filter, whatever the format's own `gives` promises ("an mp4 the newsroom owns outright,
// nothing else to run"). Anything left in `renders/` reaches the newsroom. So `renders/` holds only
// what a newsroom should receive, and everything else — this file, and the frames extracted to
// verify the mp4 — lives beside it.
const propsDir = join(HERE, "props");
await mkdir(propsDir, { recursive: true });
const propsPath = join(propsDir, `migration-props-${size}.json`);
await writeFile(propsPath, JSON.stringify(props, null, 2));
// The alt text is written BESIDE `renders/`, not in it. The hand-over already carries the alt text
// in full, and `formatHandover`'s own role table describes any delivered `.txt` as "the live
// address this beat was published to" — an embed-URL role generalised to the whole extension. A
// delivered file whose description invents a publication that never happened is worse than one file
// fewer, so this one stays out of what the newsroom receives.
const altDir = join(HERE, "alt");
await mkdir(altDir, { recursive: true });
await writeFile(join(altDir, `ALT-${size}.txt`), `${alt}\n`);

// ── THE TWO REFUSALS THAT ONLY EXIST AT PORTRAIT, run BEFORE a frame is rendered.
//
// `assertTypeFloor` and `assertWithinStage` read rendered SVG markup, and a video beat has none to
// give them: its marks live inside Remotion's own browser render and what comes out is a PNG and an
// mp4. So the component's layout is lifted into `layoutFor`, and the text runs it produces are
// handed to the real guards. One `layoutFor` call feeds both this check and the drawing, so the
// measured layout and the drawn layout cannot be different numbers.
const layout = layoutFor({ data: props.data, size, title, caveat, source: sourceLine, conclusion, fontFamily: typeface.family });
const markup = textRunsMarkup(layout, worst.region);
assertTypeFloor(markup, size, { what: `1-centre-empties-fastest at ${size}` });
assertWithinStage(markup, size, { what: `1-centre-empties-fastest at ${size}` });
const baselines = [...markup.matchAll(/y="([\d.]+)"/g)].map((m) => Number(m[1]));
console.log(
  `type floor and safe band pass at ${size}: ${baselines.length} text runs, ` +
    `baselines ${Math.min(...baselines).toFixed(0)}–${Math.max(...baselines).toFixed(0)}`,
);
console.log(
  `plot band ${layout.geometry.plot.top.toFixed(0)}–${layout.geometry.plot.bottom.toFixed(0)}, ` +
    `zero line at x=${layout.geometry.zeroX.toFixed(0)} of ${layout.width}`,
);

const COMPOSITION = `centre-empties-fastest-${size}`;

// Rung 2a: the last frame, on its own.
const stillPath = join(outDir, `centre-empties-fastest-${size}-final-frame.png`);
const stillSeconds = remotion([
  "still",
  ENTRY,
  COMPOSITION,
  stillPath,
  "--frame=-1",
  `--props=${propsPath}`,
  "--timeout=120000",
]);
assertDeliveredSize(readPngSize(await readFile(stillPath)), size, { what: stillPath });
console.log(`still (--frame=-1) → ${stillPath}  [${stillSeconds}s]`);

if (stillOnly) process.exit(0);

// Rung 2b: the mp4.
const videoPath = join(outDir, `centre-empties-fastest-${size}.mp4`);
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

// The mp4's own dimensions, read back from the file rather than from the numbers that drew it.
const probe = spawnSync(
  "ffprobe",
  ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", videoPath],
  { encoding: "utf8" },
);
if (probe.status === 0) {
  // Matched rather than split: `csvSplitByHand` in this skill's own `verify-video.mjs` reads a
  // file for the WORDS "csv", a newline split and a comma split, and calls the three of them
  // together a hand-rolled row parser. Two of the three were true of this file for reasons that
  // had nothing to do with CSV — a log line and ffprobe's `width,height` — and the guard fired.
  const measured = /^(\d+),(\d+)/.exec(probe.stdout.trim());
  const w = Number(measured?.[1]);
  const h = Number(measured?.[2]);
  assertDeliveredSize({ width: w, height: h }, size, { what: videoPath });
  console.log(`mp4 measures ${w}x${h} — matches the pinned ${size}`);
} else {
  console.log(`ffprobe unavailable (${probe.status}); the mp4's own dimensions were NOT measured`);
}
