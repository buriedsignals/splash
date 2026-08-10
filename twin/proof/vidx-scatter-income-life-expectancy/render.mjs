// twin/proof/vidx-scatter-income-life-expectancy/render.mjs
//
// This story's own render script — the render ladder's second rung, same shape as
// `twin-chart-video/scripts/render-video.mjs` and the other proof workspaces' (read the frozen
// CSV, still-first, then mp4), its own story constants.
//
// The frozen `data.csv` is the RAW, UNFILTERED fetch — the `country` query param has no effect on
// this particular OWID grapher (`BRIEF.md`), so all 165 countries in its one available year (2022)
// are on disk. This script selects the twenty-country peer set from within that file.
//
// Usage:  bun proof/vidx-scatter-income-life-expectancy/render.mjs [--still-only] [--size <name>] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveFurniture,
  readPalette,
} from "../../skills/twin-chart-video/scripts/render-still.mjs";
// The VIDEO genre's own size table (landscape floor 30, type scale 2.5), and the type-vs-size
// question, which is craft-neutral and therefore has one copy serving both genres.
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
const BEAT_ID = "vidx-scatter-income-life-expectancy";
/** The chart type, in `references/types/` vocabulary — what `assertTypeMayEnter` is asked about. */
const TYPE = "scatter";

const PEERS = [
  "United States", "Switzerland", "Germany", "France", "United Kingdom", "Japan", "Canada",
  "Australia", "Sweden", "Norway", "Netherlands", "Italy", "Spain", "South Korea", "Ireland",
  "Denmark", "Finland", "Belgium", "Austria", "Singapore",
];

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
  title: "Among twenty wealthy countries, the United States has the lowest life expectancy",
  source: "Source: World Bank via Gapminder, UN World Population Prospects (2024), via Our World in Data · 2022 data",
  subjectCountry: "United States",
  xAxisLabel: "GDP per capita ($)",
  yAxisLabel: "Life expectancy at birth (years)",
};

/**
 * OWID's grapher CSV (`Entity,Code,Year,Life expectancy at birth,GDP per capita,Population,World
 * region according to OWID`), 165 rows, all one year (2022), 165 distinct countries. Selects the
 * twenty-country peer set from within it — the country filter had no effect at fetch time
 * (`BRIEF.md`), so this is where the beat's own selection actually happens.
 */
export function readingsFromCsv(csv, peers) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const lifeAt = columns.indexOf("Life expectancy at birth");
  const gdpAt = columns.indexOf("GDP per capita");
  if (entityAt < 0 || lifeAt < 0 || gdpAt < 0)
    throw new Error(`csv has no Entity / Life expectancy / GDP per capita column, got: ${header}`);

  const byCountry = new Map();
  for (const line of rows) {
    const cells = line.split(",");
    const country = cells[entityAt];
    const lifeExpectancy = Number(cells[lifeAt]);
    const gdp = Number(cells[gdpAt]);
    if (Number.isFinite(lifeExpectancy) && Number.isFinite(gdp)) byCountry.set(country, { gdp, lifeExpectancy });
  }

  return peers.map((country) => {
    const row = byCountry.get(country);
    if (!row) throw new Error(`no complete row for ${country}`);
    return { country, ...row };
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
const stem = sizeFlag === -1 ? "scatter" : `scatter-${size}`;
if (sizeFlag !== -1)
  console.log(`LOOKING at ${size}; the pinned size stays ${pinnedSize} -> ${outDir}`);
// …and whether this TYPE may enter that size at all. A scatter has a NAMED refusal, not merely an
// unmeasured one: rotating it violates conventions of reading direction, so it has no twin form,
// and what a phone frame runs out of budget on is its density.
const form = assertTypeMayEnter(TYPE, size, { what: BEAT_ID });
const COMPOSITION = `${BEAT_ID}-${size}`;
const { width, height } = sizeFor(size);
console.log(`pinned size: ${size} (${width}x${height}) — ${form.verdict}: ${form.reason}`);

await mkdir(outDir, { recursive: true });

const rows = readingsFromCsv(await readFile(dataPath, "utf8"), PEERS);
if (rows.length !== 20) throw new Error(`expected twenty countries, got ${rows.length}`);

// Sorted by GDP, ascending — the x-axis's own order, and the reveal's own order (`BRIEF.md`).
rows.sort((a, b) => a.gdp - b.gdp);

const subject = rows.find((r) => r.country === BEAT.subjectCountry);
const others = rows.filter((r) => r.country !== BEAT.subjectCountry);
if (!others.every((r) => r.lifeExpectancy > subject.lifeExpectancy))
  throw new Error(`expected ${BEAT.subjectCountry} to have the lowest life expectancy of the twenty`);

const peerMedian = (() => {
  const sorted = [...others].map((r) => r.lifeExpectancy).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
})();

const referenceLabel = `Peer median: ${peerMedian.toFixed(1)} years`;

const props = {
  ...BEAT,
  data: rows,
  reference: peerMedian,
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
// decision rests on for the video genre: everything upstream of it agrees with itself by
// construction.
assertDeliveredSize(mp4Size(videoPath), size, { what: videoPath });
console.log(`video → ${videoPath}  [${videoSeconds}s], verified from the container`);
