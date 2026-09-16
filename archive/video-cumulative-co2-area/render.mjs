// twin/proof/video-cumulative-co2-area/render.mjs
//
// Fourth beat through the render ladder's second rung — same shape as
// `chart-video/scripts/render-video.mjs`, `../life-expectancy/render.mjs` and
// `../migration/render.mjs` (`readingsFromCsv`, then still-first, then mp4), its own story
// constants. See `render-video.mjs` for the doc-comment on why this runs in node
// (`deriveFurniture`) and why the still is rendered before the mp4.
//
// Usage:  bun proof/video-cumulative-co2-area/render.mjs [--still-only] [--size <name>] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveFurniture, readPalette } from "#shared/chart-beat/render-still.mjs";
// The VIDEO format's own size table (landscape floor 30, type scale 2.5), and the type-vs-size
// question, which is craft-neutral and therefore has one copy serving both formats.
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
const BEAT_ID = "cumulative-co2-area";
/** The chart type, in `references/types/` vocabulary — what `assertTypeMayEnter` is asked about. */
const TYPE = "area";

// The two colours this beat is drawn in come from the recorded decision beside it, never from a
// hex typed here — see `PALETTE.md`. The search stops at `proof/`, so a palette recorded once at a
// story root would serve every beat under it.
const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
  stopAt: resolve(HERE, ".."),
});
console.log(
  `palette read from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`,
);

/**
 * The story's own constants — the journalist's words, from BRIEF.md. `reference` and
 * `subjectYear` are NOT hand-typed: `reference` is derived below from the frozen data's own last
 * reading (half of the all-time total), and `subjectYear` is the first year the running total
 * reaches it, asserted against BRIEF.md's verified value rather than duplicated by hand — the
 * exact defect `life-expectancy`'s and `migration`'s source-correction fixes closed (a number
 * living only in a prompt, never checked against the committed CSV).
 */
const BEAT = {
  ground,
  accent,
  title:
    "More than half of Switzerland's all-time CO₂ has been emitted since 1986.",
  source:
    "Source: Global Carbon Budget (2025), via Our World in Data · data through 2024",
  // Not "half of the all-time total (1,579 Mt)" — the y axis already states that number on the
  // tick this rule sits on, so printing it again here would be `anti-patterns.md`'s "repeated
  // years or values". Wording matches BRIEF.md's own anti-pattern note: state what "half" means
  // in words, not a bare number.
  referenceLabel: "Half of Switzerland's all-time total",
};

/**
 * OWID's `cumulative-co-emissions` grapher CSV: `Entity,Code,Year,Cumulative CO₂ emissions`,
 * tonnes to megatonnes (this beat's own unit — see CumulativeCo2AreaVideo.tsx). The whole range,
 * 1858 → 2024: the claim is about the all-time total, so there is no window to trim the way
 * `co2-suisse`'s `firstYear` or `life-expectancy`'s do.
 */
export function readingsFromCsv(csv) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.findIndex((c) => c.startsWith("Cumulative CO"));
  if (yearAt < 0 || valueAt < 0)
    throw new Error(
      `csv has no Year / Cumulative CO₂ emissions column, got: ${header}`,
    );

  return rows
    .map((row) => row.split(","))
    .map((cells) => ({
      year: Number(cells[yearAt]),
      mt: Number(cells[valueAt]) / 1e6,
    }))
    .filter((r) => Number.isFinite(r.year) && Number.isFinite(r.mt))
    .sort((a, b) => a.year - b.year);
}

/** The first year the running total reaches or passes `half` — computed from the data, never
 *  hand-typed, so a re-fetch that shifts the series shifts this beat's subject year with it. */
export function firstYearAtOrAbove(data, half) {
  const reading = data.find((r) => r.mt >= half);
  if (!reading)
    throw new Error(`no reading in the series reaches half the all-time total (${half})`);
  return reading.year;
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

// The story's own frozen series, committed beside it — OWID's raw `cumulative-co-emissions`
// grapher export for Switzerland, `&csvType=filtered&country=~CHE`, verified single-country
// (BRIEF.md). No longer `/tmp`.
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
const outDir = flag("--out", sizeFlag === -1 ? HERE : join(HERE, "sizes"));
const stem = sizeFlag === -1 ? BEAT_ID : `${BEAT_ID}-${size}`;
if (sizeFlag !== -1)
  console.log(`LOOKING at ${size}; the pinned size stays ${pinnedSize} -> ${outDir}`);
// …and whether this TYPE may enter that size at all. An area's x axis is a continuum, so it has no
// twin form to transpose into and no measured aspect range at a tall or square frame; the refusal
// names the measurement that is missing rather than drawing a shape no counter can fault.
const form = assertTypeMayEnter(TYPE, size, { what: BEAT_ID });
const COMPOSITION = `${BEAT_ID}-${size}`;
const { width, height } = sizeFor(size);
console.log(`pinned size: ${size} (${width}x${height}) — ${form.verdict}: ${form.reason}`);

await mkdir(outDir, { recursive: true });

const data = readingsFromCsv(await readFile(dataPath, "utf8"));
if (data.length < 2) throw new Error(`need at least two readings, got ${data.length}`);

const lastMt = data[data.length - 1].mt;
const reference = lastMt / 2;
const subjectYear = firstYearAtOrAbove(data, reference);
// BRIEF.md's exact verified crossing year — the tripwire, not a duplicate of the computation
// above: if a re-fetch ever moves the crossing, this beat must not silently keep drawing an
// on-screen claim ("since 1986") the frozen data no longer supports.
if (subjectYear !== 1986)
  throw new Error(
    `BRIEF.md claims the crossing year is 1986, but the frozen data crosses in ${subjectYear}`,
  );

const props = { ...BEAT, data, reference, subjectYear, size, ...deriveFurniture(BEAT.ground) };
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
// And the DELIVERED mp4, out of the container itself. This is the assertion the whole size decision
// rests on for the video format: everything upstream of it agrees with itself by construction.
assertDeliveredSize(mp4Size(videoPath), size, { what: videoPath });
console.log(`video → ${videoPath}  [${videoSeconds}s], verified from the container`);
