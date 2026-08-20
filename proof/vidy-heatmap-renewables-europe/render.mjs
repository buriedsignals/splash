// twin/proof/vidy-heatmap-renewables-europe/render.mjs
//
// This story's own render script — the render ladder's second rung, same shape as
// `chart-video/scripts/render-video.mjs` and the other proof workspaces'
// (`readingsFromCsv`, then still-first, then mp4), its own story constants.
//
// `deriveFurniture` is imported from THIS SKILL's own copy
// (`skills/chart-video/scripts/render-still.mjs`) by a relative path — not the `#shared/*`
// alias, and not `chart-beat`'s original. It supplies the NON-ramp colours (ink/muted/grid);
// the sequential colour ramp itself is this beat's own `rampAnchors`/`rampColor`
// (`HeatmapVideo.tsx`), derived from `ground` and `accent`, never from `deriveFurniture`.
//
// Usage:  bun proof/vidy-heatmap-renewables-europe/render.mjs [--still-only] [--size <name>] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveFurniture,
  readPalette,
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

/**
 * RFC 4180 row tokeniser, inlined here rather than imported — no cross-skill runtime import, and
 * a proof/story workspace is not a skill either. A naive comma split corrupts a quoted thousands
 * separator ("1,234.5") or a quoted name carrying its own comma ("Netherlands, the"); this walks
 * the text one character at a time instead. Returns one array of raw field strings per row
 * (header included), quotes stripped, doubled quotes un-escaped, and a lone CR or CRLF closing a
 * row the same way LF does.
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
const PACKAGE_ROOT = resolve(HERE, "../..");
const ENTRY = join(HERE, "index.ts");
const BEAT_ID = "vidy-heatmap-renewables-europe";
/** The chart type, in `references/types/` vocabulary — what `assertTypeMayEnter` is asked about. */
const TYPE = "heatmap";

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
 * The story's own constants — the journalist's words, from `BRIEF.md`. `accent` is this beat's
 * ramp hue, not a single-mark colour: `rampAnchors(ground, accent)` derives the ramp's pale and
 * deep ends from it at render time, and the same hue draws Iceland's subject outline/wash.
 */
const BEAT = {
  ground,
  accent,
  title:
    "Iceland has run almost entirely on renewable electricity every year since 2016 — most of Europe is still catching up",
  source:
    "Source: Ember & Energy Institute, via Our World in Data · Share of electricity generation from renewables, 2016–2024",
  legendTitle: "Share of electricity from renewables",
  subjectCountry: "Iceland",
  subjectNote:
    "Iceland: 100% renewable electricity in every single year of the period",
};

const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
const COUNTRIES = [
  "Iceland",
  "Norway",
  "Switzerland",
  "Germany",
  "Spain",
  "United Kingdom",
  "Poland",
  "France",
];

/**
 * OWID's grapher CSV (`Entity,Code,Year,Renewables`) — the committed `data.csv` is the raw,
 * unedited fetch for these eight countries, 1920–2025 (`BRIEF.md`'s own convention: freeze the
 * full range, filter to the beat's exact window at render time, never re-fetch). This beat's
 * window is nine chronological years, 2016–2024 — the latest year every one of the eight
 * countries reports (`BRIEF.md`): sort countries by their 2024 value, descending, so the chart's
 * own row order IS the ranking, not a separate editorial step.
 */
export function readingsFromCsv(csv) {
  const [header, ...rows] = parseCsvRows(csv.trim());
  const columns = header;
  const entityAt = columns.indexOf("Entity");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.indexOf("Renewables");
  if (entityAt < 0 || yearAt < 0 || valueAt < 0)
    throw new Error(`csv has no Entity / Year / Renewables column, got: ${header}`);

  const byCountry = new Map();
  for (const line of rows) {
    const cells = line;
    const year = Number(cells[yearAt]);
    if (!YEARS.includes(year)) continue;
    const entity = cells[entityAt];
    if (!COUNTRIES.includes(entity)) continue;
    const value = Number(cells[valueAt]);
    if (!Number.isFinite(value)) continue;
    if (!byCountry.has(entity)) byCountry.set(entity, new Map());
    byCountry.get(entity).set(year, value);
  }

  const rowsOut = COUNTRIES.map((country) => {
    const byYear = byCountry.get(country);
    if (!byYear) throw new Error(`no data at all for ${JSON.stringify(country)}`);
    const values = YEARS.map((year) => {
      const value = byYear.get(year);
      if (!Number.isFinite(value))
        throw new Error(`missing ${country} ${year} — every row needs every year`);
      return value;
    });
    return { country, values };
  });

  return rowsOut.sort((a, b) => b.values[YEARS.length - 1] - a.values[YEARS.length - 1]);
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

// The story's own frozen series, committed beside it — OWID's raw `share-electricity-renewables`
// grapher export forced onto its line-chart tab (`tab=chart`) so the country filter actually
// applies (`BRIEF.md`: the plain map-tab CSV export ignores `country` entirely and always returns
// every reporting country's single latest year — a distinct trap from, but adjacent to, the
// documented `csvType=filtered` one). Never re-fetched.
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
const stem = sizeFlag === -1 ? "heatmap" : `heatmap-${size}`;
if (sizeFlag !== -1)
  console.log(`LOOKING at ${size}; the pinned size stays ${pinnedSize} -> ${outDir}`);
// …and whether this TYPE may enter that size at all. A heatmap is a matrix and both axes are the
// argument, so it has no twin form and no aspect range has ever been measured for it at a tall or
// square frame.
const form = assertTypeMayEnter(TYPE, size, { what: BEAT_ID });
const COMPOSITION = `${BEAT_ID}-${size}`;
const { width, height } = sizeFor(size);
console.log(`pinned size: ${size} (${width}x${height}) — ${form.verdict}: ${form.reason}`);

await mkdir(outDir, { recursive: true });

const data = readingsFromCsv(await readFile(dataPath, "utf8"));
if (data.length !== COUNTRIES.length)
  throw new Error(`expected ${COUNTRIES.length} countries, got ${data.length}`);
if (data[0].country !== BEAT.subjectCountry)
  throw new Error(
    `expected ${BEAT.subjectCountry} to rank first in ${YEARS[YEARS.length - 1]}, got ${data[0].country}`,
  );

// The title said "almost entirely" — a render audit caught that this undersells what the data
// actually shows: Iceland's own row is exactly 100 in every one of these nine years, not merely
// close to it. Checked here (not assumed) so the wording tracks the data if the series ever
// changes, instead of a hand-typed qualifier that quietly stops matching the numbers.
const subjectRow = data.find((row) => row.country === BEAT.subjectCountry);
const subjectAlwaysFull = subjectRow.values.every((v) => v === 100);
const title = BEAT.title.replace(
  "almost entirely",
  subjectAlwaysFull ? "entirely" : "almost entirely",
);

const props = {
  ...BEAT,
  title,
  years: YEARS,
  data,
  size,
  ...deriveFurniture(BEAT.ground),
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
// decision rests on for the video format: everything upstream of it agrees with itself by
// construction.
assertDeliveredSize(mp4Size(videoPath), size, { what: videoPath });
console.log(`video → ${videoPath}  [${videoSeconds}s], verified from the container`);
