// twin/proof/vidy-waterfall-germany-electricity-mix/render.mjs
//
// This story's own render script — the render ladder's second rung, same shape as
// `twin-chart-video/scripts/render-video.mjs` and the other proof workspaces'
// (`readingsFromCsv`, then still-first, then mp4), its own story constants.
//
// `deriveFurniture` is imported from THIS SKILL's own copy
// (`skills/twin-chart-video/scripts/render-still.mjs`) by a relative path — not the `#shared/…`
// alias, and not `twin-chart-beat`'s original. A skill never imports another skill; a story never
// reaches into a skill's `assets/`, only its `scripts/` — same direction
// `../video-population-growth-dumbbell/render.mjs` uses.
//
// Usage:  bun proof/vidy-waterfall-germany-electricity-mix/render.mjs [--still-only] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveFurniture,
  readPalette,
  seriesInks,
} from "../../skills/twin-chart-video/scripts/render-still.mjs";
// The VIDEO genre's own size table (landscape floor 30, type scale 2.5) and the type-vs-size
// question, which is craft-neutral and therefore has one copy for both genres.
import {
  assertDeliveredSize,
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/twin-chart-video/sizes.mjs";
import { assertTypeMayEnter } from "#shared/twin-chart-beat/type-at-size.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const ENTRY = join(HERE, "index.ts");
const BEAT_ID = "vidy-waterfall-germany-electricity-mix";
/** The chart type, in `references/types/` vocabulary — what `assertTypeMayEnter` is asked about. */
const TYPE = "waterfall";

// The colours this beat is drawn in come from the recorded decision beside it, never from a hex
// typed here — see `PALETTE.md`. THREE data colours (the three bar roles), so all three come
// through `seriesInks`, which hands back the recorded accents in the order they were recorded and
// throws rather than padding a missing one with the furniture grey.
const palette = readPalette(HERE, { stopAt: resolve(HERE, "..") });
const [increase, decrease, total] = seriesInks(palette, 3);
console.log(
  `palette read from ${palette.source} — ground ${palette.ground}, increase ${increase}, ` +
    `decrease ${decrease}, total ${total}, chosen by ${palette.origin}`,
);

/** The story's own constants — the journalist's words, from `BRIEF.md`. */
const BEAT = {
  ground: palette.ground,
  increase,
  decrease,
  total,
  title:
    "Germany's electricity generation fell as coal and nuclear losses outpaced renewable growth, 2010–2023",
  source: "Source: Ember & Energy Institute, via Our World in Data · TWh, 2010 vs 2023",
  legendLabels: ["Increase", "Decrease", "Total"],
  unit: "TWh",
};

const ENTITY = "Germany";
const OPEN_YEAR = 2010;
const CLOSE_YEAR = 2023;

/**
 * The story order (never resorted by magnitude): clean sources first, then the fossil/nuclear
 * sources that outweighed them — the CSV's own thematic column grouping, per `BRIEF.md`.
 * `Other renewables` is folded into `Bioenergy` (both are clean-source columns, and 0.16 TWh on
 * its own is too small to read as its own bar at this scale) — the merge arithmetic is verified
 * below, not just asserted.
 */
const STEP_ORDER = [
  { id: "bioenergy", label: "Bioenergy", columns: ["Bioenergy", "Other renewables"] },
  { id: "solar", label: "Solar", columns: ["Solar"] },
  { id: "wind", label: "Wind", columns: ["Wind"] },
  { id: "hydropower", label: "Hydropower", columns: ["Hydropower"] },
  { id: "nuclear", label: "Nuclear", columns: ["Nuclear"] },
  { id: "gas", label: "Gas", columns: ["Gas"] },
  { id: "oil", label: "Oil", columns: ["Oil"] },
  { id: "coal", label: "Coal", columns: ["Coal"] },
];
const ALL_SOURCE_COLUMNS = [
  "Other renewables",
  "Bioenergy",
  "Solar",
  "Wind",
  "Hydropower",
  "Nuclear",
  "Gas",
  "Oil",
  "Coal",
];

/**
 * OWID's `electricity-mix` grapher CSV (`Entity,Code,Year,<source columns...>`), all in TWh,
 * frozen as the raw, unedited fetch (`BRIEF.md`'s own convention — never re-fetched). Builds the
 * ten-bar bridge: an opening total (2010), eight signed steps (2023 minus 2010, per source, in
 * story order), and a closing total (2023). The running total is walked step by step and checked
 * against the independently-summed 2023 total — `waterfall.md`'s explicit warning that a bridge's
 * exactness must be replayed, not eyeballed, made mechanical: this throws if the two disagree.
 */
export function readingsFromCsv(csv) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const yearAt = columns.indexOf("Year");
  if (entityAt < 0 || yearAt < 0)
    throw new Error(`csv has no Entity / Year column, got: ${header}`);
  const sourceAt = new Map(
    ALL_SOURCE_COLUMNS.map((name) => {
      const at = columns.indexOf(name);
      if (at < 0) throw new Error(`csv missing expected source column ${JSON.stringify(name)}, got: ${header}`);
      return [name, at];
    }),
  );

  const byYear = new Map();
  for (const line of rows) {
    if (!line.trim()) continue;
    const cells = line.split(",");
    const year = Number(cells[yearAt]);
    if (year !== OPEN_YEAR && year !== CLOSE_YEAR) continue;
    const entity = cells[entityAt];
    if (entity !== ENTITY)
      throw new Error(`expected only ${JSON.stringify(ENTITY)} rows in this filtered fetch, got ${JSON.stringify(entity)}`);
    const values = {};
    for (const [name, at] of sourceAt) {
      const v = Number(cells[at]);
      if (!Number.isFinite(v)) throw new Error(`non-finite value for ${name} in year ${year}: ${cells[at]}`);
      values[name] = v;
    }
    byYear.set(year, values);
  }
  const open = byYear.get(OPEN_YEAR);
  const close = byYear.get(CLOSE_YEAR);
  if (!open || !close)
    throw new Error(`missing ${OPEN_YEAR} or ${CLOSE_YEAR} row for ${ENTITY}`);

  const sum = (values) => ALL_SOURCE_COLUMNS.reduce((total, name) => total + values[name], 0);
  const openTotal = sum(open);
  const closeTotal = sum(close);

  const steps = STEP_ORDER.map(({ id, label, columns: cols }) => {
    const before = cols.reduce((t, name) => t + open[name], 0);
    const after = cols.reduce((t, name) => t + close[name], 0);
    const delta = after - before;
    return { id, label, kind: delta < 0 ? "decrease" : "increase", value: delta };
  });

  // Replay the arithmetic — the type doctrine's explicit warning, mechanised: walk the running
  // total step by step and confirm it lands exactly (within floating-point noise) on the
  // independently-summed closing total.
  let running = openTotal;
  const bars = [
    { id: "open", label: String(OPEN_YEAR), kind: "total", value: openTotal, runningBefore: 0, runningAfter: openTotal },
  ];
  for (const step of steps) {
    const before = running;
    running += step.value;
    bars.push({ id: step.id, label: step.label, kind: step.kind, value: step.value, runningBefore: before, runningAfter: running });
  }
  if (Math.abs(running - closeTotal) > 1e-6)
    throw new Error(
      `bridge does not close: walked to ${running.toFixed(6)}, but the independently-summed ${CLOSE_YEAR} total is ${closeTotal.toFixed(6)}`,
    );
  bars.push({ id: "close", label: String(CLOSE_YEAR), kind: "total", value: closeTotal, runningBefore: 0, runningAfter: closeTotal });

  return bars;
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
 * The DELIVERED mp4's own dimensions, read out of the container by `ffprobe` — the video analogue
 * of `readPngSize`, and it exists for the same reason: `Root.tsx` sizes the composition and the
 * component draws into it, both from the same table, so they agree by construction.
 */
function mp4Size(path) {
  const probe = spawnSync(
    "ffprobe",
    ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", path],
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

// The story's own frozen series, committed beside it — OWID's raw `electricity-mix` grapher
// export, `&country=~DEU&csvType=filtered` (redirected from the `electricity-prod-source-stacked`
// slug — `BRIEF.md`). Never re-fetched.
const dataPath = flag("--data", join(HERE, "data.csv"));
// The artifact lands in the beat's own folder by default — where its mp4 is committed and where it
// is audited from. It used to default to a scratch directory, so running this script the obvious way
// — no arguments — produced a fresh video nobody looks at, printed a path, exited zero, and left the
// committed one stale: the presence of a file mistaken for the existence of a result.
const stillOnly = argv.includes("--still-only");

// THE JOURNALIST'S DECISION, READ RATHER THAN RETYPED. Gate 2c pins a size; this beat records it in
// its own `BRIEF.md` front matter; `readPinnedSize` throws naming every path it looked at if it is
// missing. Before this the size lived as two literals in `Root.tsx` and two more in the component,
// which agreed by construction, so `size: portrait` on the slot produced 1080 x 1080 in silence.
const pinnedSize = await readPinnedSize(HERE, { readFile, dirname, join });
// `--size <name>` renders one of the OTHER two into `sizes/` so all three can be opened and
// compared. It is deliberately NOT a way to change what this beat DELIVERS.
const sizeFlag = argv.indexOf("--size");
const size = sizeFlag === -1 ? pinnedSize : argv[sizeFlag + 1];
const outDir = flag("--out", sizeFlag === -1 ? HERE : join(HERE, "sizes"));
const stem = sizeFlag === -1 ? "waterfall" : `waterfall-${size}`;
if (sizeFlag !== -1)
  console.log(`LOOKING at ${size}; the pinned size stays ${pinnedSize} -> ${outDir}`);
const form = assertTypeMayEnter(TYPE, size, { what: BEAT_ID });
const COMPOSITION = `${BEAT_ID}-${size}`;
const frameSize = sizeFor(size);
console.log(
  `pinned size: ${size} (${frameSize.width}x${frameSize.height}) — ${form.verdict}: ${form.reason}`,
);

await mkdir(outDir, { recursive: true });

const data = readingsFromCsv(await readFile(dataPath, "utf8"));
if (data.length !== 10)
  throw new Error(`expected ten bars (2 totals + 8 steps), got ${data.length}`);
if (data[0].kind !== "total" || data[data.length - 1].kind !== "total")
  throw new Error("the first and last bars must be the true totals");

const props = { ...BEAT, size, data, ...deriveFurniture(BEAT.ground) };
const propsPath = join(outDir, `${stem}-props.json`);
await writeFile(propsPath, JSON.stringify(props, null, 2));

// Rung 2a: the last frame, on its own. If the end state is not a complete, readable bridge, the
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
// And the DELIVERED mp4, out of the container itself — the one reading the code that wrote the
// file cannot make agree with itself.
assertDeliveredSize(mp4Size(videoPath), size, { what: videoPath });
console.log(`video → ${videoPath}  [${videoSeconds}s], verified from the container`);
