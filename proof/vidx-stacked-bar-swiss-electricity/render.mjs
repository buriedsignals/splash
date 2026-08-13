// twin/proof/vidx-stacked-bar-swiss-electricity/render.mjs
//
// This story's own render script — the render ladder's second rung, same shape as
// `chart-video/scripts/render-video.mjs` and the other proof workspaces' (read the frozen
// CSV, still-first, then mp4), its own story constants.
//
// Usage:  bun proof/vidx-stacked-bar-swiss-electricity/render.mjs [--still-only] [--size <name>] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveFurniture,
  readPalette,
  seriesInks,
} from "../../skills/chart-video/scripts/render-still.mjs";
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
const BEAT_ID = "vidx-stacked-bar-swiss-electricity";
/** The chart type, in `references/types/` vocabulary — what `assertTypeMayEnter` is asked about. */
const TYPE = "stacked-bar";

// The colours this beat is drawn in come from the recorded decision beside it, never from a hex
// typed here — see `PALETTE.md`. THREE data colours, one per band, so all three come through
// `seriesInks`: it returns the recorded accents first and in the recorded order, and throws rather
// than padding a missing one with the furniture grey. That padding is exactly what this beat used
// to do — two of its three bands were `muted`, and a newsroom changing its accent moved one band
// out of three.
const palette = readPalette(HERE, { stopAt: resolve(HERE, "..") });
const bandInks = seriesInks(palette, 3);
console.log(
  `palette read from ${palette.source} — ground ${palette.ground}, ` +
    `bands ${bandInks.join(", ")}, chosen by ${palette.origin}`,
);

const YEARS = [2000, 2010, 2020, 2024];

/** The story's own constants — the journalist's words, from `BRIEF.md`. The title is NOT among
 *  them: it states solar and wind's share of the subject year, which is arithmetic over the same
 *  CSV this script reads, so it is built after the read (see `title` below) rather than typed
 *  beside constants that cannot move with the file. */
const BEAT = {
  ground: palette.ground,
  accent: palette.accent,
  bandInks,
  source: "Source: Ember & Energy Institute, via Our World in Data · 2000, 2010, 2020 & 2024 data",
  legendLabels: ["Solar & wind", "Hydropower", "Nuclear & other"],
  subjectYear: 2024,
};

/**
 * OWID's grapher CSV (`Entity,Code,Year,Other renewables,Bioenergy,Solar,Wind,Hydropower,Nuclear,
 * Gas,Oil,Coal`), 25 rows, Switzerland only, 2000–2025 (TWh). This beat draws four snapshot years
 * and buckets the nine raw columns into three (`BRIEF.md`'s own convention).
 */
export function readingsFromCsv(csv, years) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const at = (name) => {
    const i = columns.indexOf(name);
    if (i < 0) throw new Error(`csv has no "${name}" column, got: ${header}`);
    return i;
  };
  const yearAt = at("Year");
  const num = (cells, name) => Number(cells[at(name)]);

  const byYear = new Map();
  for (const line of rows) {
    const cells = line.split(",");
    const year = Number(cells[yearAt]);
    if (!years.includes(year)) continue;
    byYear.set(year, {
      year,
      solarWind: num(cells, "Solar") + num(cells, "Wind"),
      hydro: num(cells, "Hydropower"),
      nuclearOther:
        num(cells, "Nuclear") +
        num(cells, "Bioenergy") +
        num(cells, "Other renewables") +
        num(cells, "Gas") +
        num(cells, "Oil") +
        num(cells, "Coal"),
    });
  }

  return years.map((year) => {
    const row = byYear.get(year);
    if (!row) throw new Error(`no row for ${year}`);
    return row;
  });
}

function remotion(args) {
  const binary = join(PACKAGE_ROOT, "node_modules/.bin/remotion");
  const started = Date.now();
  const result = spawnSync(binary, args, { cwd: PACKAGE_ROOT, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`remotion ${args[0]} exited with ${result.status}`);
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
const stem = sizeFlag === -1 ? "stacked-bar" : `stacked-bar-${size}`;
if (sizeFlag !== -1)
  console.log(`LOOKING at ${size}; the pinned size stays ${pinnedSize} -> ${outDir}`);
// …and whether this TYPE may enter that size at all. A stacked bar's category axis is nominal, so
// a tall or square frame asks for its twin FORM (stacked rows), not for a stretched version of
// this drawing — the refusal names the rung and the size that works.
const form = assertTypeMayEnter(TYPE, size, { what: BEAT_ID });
const COMPOSITION = `${BEAT_ID}-${size}`;
const { width, height } = sizeFor(size);
console.log(`pinned size: ${size} (${width}x${height}) — ${form.verdict}: ${form.reason}`);

await mkdir(outDir, { recursive: true });

const data = readingsFromCsv(await readFile(dataPath, "utf8"), YEARS);
if (data.length !== 4) throw new Error(`expected four snapshot years, got ${data.length}`);

const total = (row) => row.solarWind + row.hydro + row.nuclearOther;
const reference = total(data[0]);
if (data[data.length - 1].solarWind <= data[0].solarWind)
  throw new Error(
    `expected solar & wind to have grown by the last year, got ${data[0].solarWind} -> ${data[data.length - 1].solarWind}`,
  );

const referenceLabel = `${data[0].year} total: ${reference.toFixed(1)} TWh`;

// The headline share, read off the same four rows the columns are drawn from. "Almost nothing" is
// pinned too: the first year's share has to round to zero at one decimal for that phrase to hold.
const subject = data[data.length - 1];
const subjectShare = (subject.solarWind / total(subject)) * 100;
const firstShare = (data[0].solarWind / reference) * 100;
console.log(`solar & wind: ${firstShare.toFixed(2)}% in ${data[0].year} -> ${subjectShare.toFixed(2)}% in ${subject.year}`);
if (Math.round(firstShare * 10) / 10 !== 0)
  throw new Error(`the title says "almost nothing" in ${data[0].year}, but the share is ${firstShare.toFixed(2)}%`);
const title = `Solar and wind went from almost nothing to ${Math.round(subjectShare)}% of Switzerland's electricity`;
console.log(`title: ${title}`);

const props = {
  ...BEAT,
  title,
  subjectYear: subject.year,
  data,
  reference,
  referenceLabel,
  size,
  ...deriveFurniture(BEAT.ground),
};
const propsPath = join(outDir, `${stem}-props.json`);
await writeFile(propsPath, JSON.stringify(props, null, 2));

// Rung 2a: the last frame, on its own.
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
// decision rests on for the video format: everything upstream of it agrees with itself by
// construction.
assertDeliveredSize(mp4Size(videoPath), size, { what: videoPath });
console.log(`video → ${videoPath}  [${videoSeconds}s], verified from the container`);
