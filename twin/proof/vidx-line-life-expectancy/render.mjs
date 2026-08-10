// twin/proof/vidx-line-life-expectancy/render.mjs
//
// This story's own render script — the render ladder's second rung, same shape as
// `chart-video/scripts/render-video.mjs` and the other proof workspaces' (read the frozen
// CSV, still-first, then mp4), its own story constants.
//
// Usage:  bun proof/vidx-line-life-expectancy/render.mjs [--still-only] [--size <name>] [--data <csv>] [--out <dir>]

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
const BEAT_ID = "vidx-line-life-expectancy";
/** The chart type, in `references/types/` vocabulary — what `assertTypeMayEnter` is asked about. */
const TYPE = "line";

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
  firstYear: 1990,
  reference: 80,
  ground,
  accent,
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
const stem = sizeFlag === -1 ? "line" : `line-${size}`;
if (sizeFlag !== -1)
  console.log(`LOOKING at ${size}; the pinned size stays ${pinnedSize} -> ${outDir}`);
// …and whether this TYPE may enter that size at all. A line's x axis is time, so it has no twin
// form; what it has is a MEASURED aspect range, and assertPlotAspect inside the component refuses
// a plot outside it.
const form = assertTypeMayEnter(TYPE, size, { what: BEAT_ID });
const COMPOSITION = `${BEAT_ID}-${size}`;
const { width, height } = sizeFor(size);
console.log(`pinned size: ${size} (${width}x${height}) — ${form.verdict}: ${form.reason}`);

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

const props = { ...BEAT, che, fra, size, ...deriveFurniture(BEAT.ground) };
delete props.firstYear;
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
// decision rests on for the video genre: everything upstream of it agrees with itself by
// construction.
assertDeliveredSize(mp4Size(videoPath), size, { what: videoPath });
console.log(`video → ${videoPath}  [${videoSeconds}s], verified from the container`);
