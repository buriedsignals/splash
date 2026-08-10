// twin/proof/vidx-grouped-bar-co2-per-capita/render.mjs
//
// This story's own render script — the render ladder's second rung, same shape as
// `chart-video/scripts/render-video.mjs` and the other proof workspaces' (read the frozen
// CSV, still-first, then mp4), its own story constants.
//
// Usage:  bun proof/vidx-grouped-bar-co2-per-capita/render.mjs [--still-only] [--size <name>] [--data <csv>] [--out <dir>]

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
const BEAT_ID = "vidx-grouped-bar-co2-per-capita";
/** The chart type, in `references/types/` vocabulary — what `assertTypeMayEnter` is asked about. */
const TYPE = "grouped-bar";

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
  countries: ["United States", "China", "Brazil", "India", "Nigeria"], // sorted by 2023 value, descending
  ground,
  accent,
  title: "China's per-person CO₂ emissions have nearly tripled since 2000, overtaking the world average",
  source: "Source: Global Carbon Budget (2025), via Our World in Data · 2000 & 2023 data, per capita",
  legendLabels: ["2000", "2023"],
  subjectCountry: "China",
};

/**
 * OWID's grapher CSV (`Entity,Code,Year,CO₂ emissions per capita`), 1007 rows across six entities
 * (five countries plus the World aggregate). This beat's window is exactly two years, 2000 and
 * 2023, per country — plus the World entity's 2023 row for the reference level.
 */
export function readingsFromCsv(csv) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.findIndex((c) => c.startsWith("CO"));
  if (entityAt < 0 || yearAt < 0 || valueAt < 0)
    throw new Error(`csv has no Entity / Year / CO2-per-capita column, got: ${header}`);

  const byEntity = new Map();
  for (const line of rows) {
    const cells = line.split(",");
    const year = Number(cells[yearAt]);
    if (year !== 2000 && year !== 2023) continue;
    const entity = cells[entityAt];
    const value = Number(cells[valueAt]);
    if (!Number.isFinite(value)) continue;
    if (!byEntity.has(entity)) byEntity.set(entity, {});
    byEntity.get(entity)[year] = value;
  }

  const worldReference = byEntity.get("World")?.[2023];
  if (!Number.isFinite(worldReference)) throw new Error("no World 2023 reference row found");

  const data = BEAT.countries.map((country) => {
    const byYear = byEntity.get(country);
    if (!byYear || !Number.isFinite(byYear[2000]) || !Number.isFinite(byYear[2023]))
      throw new Error(`missing 2000/2023 data for ${country}`);
    return { country, y2000: byYear[2000], y2023: byYear[2023] };
  });

  return { data, worldReference };
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
const stem = sizeFlag === -1 ? "grouped-bar" : `grouped-bar-${size}`;
if (sizeFlag !== -1)
  console.log(`LOOKING at ${size}; the pinned size stays ${pinnedSize} -> ${outDir}`);
// …and whether this TYPE may enter that size at all. A grouped bar's category axis is nominal, so
// a tall or square frame asks for its twin FORM (rows), not for a stretched version of this
// drawing — the refusal names the rung and the size that works.
const form = assertTypeMayEnter(TYPE, size, { what: BEAT_ID });
const COMPOSITION = `${BEAT_ID}-${size}`;
const { width, height } = sizeFor(size);
console.log(`pinned size: ${size} (${width}x${height}) — ${form.verdict}: ${form.reason}`);

await mkdir(outDir, { recursive: true });

const { data, worldReference } = readingsFromCsv(await readFile(dataPath, "utf8"));
if (data.length !== 5) throw new Error(`expected five countries, got ${data.length}`);
// Sorted by 2023 value, descending — the chart's own row/category order IS the finding
// (`BRIEF.md`), never a separate editorial step.
data.sort((a, b) => b.y2023 - a.y2023);
if (data[0].country !== "United States")
  throw new Error(`expected United States to have the largest 2023 value, got ${data[0].country}`);
if (data[1].country !== BEAT.subjectCountry)
  throw new Error(`expected ${BEAT.subjectCountry} to sort second, got ${data[1].country}`);

const referenceLabel = `World average, 2023: ${worldReference.toFixed(2)} t`;

const props = {
  ...BEAT,
  data,
  reference: worldReference,
  referenceLabel,
  size,
  ...deriveFurniture(BEAT.ground),
};
delete props.countries;
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
