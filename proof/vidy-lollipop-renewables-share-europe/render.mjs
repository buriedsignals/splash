// twin/proof/vidy-lollipop-renewables-share-europe/render.mjs
//
// This story's own render script — the render ladder's second rung, same shape as
// `chart-video/scripts/render-video.mjs` and the other proof workspaces' (`readingsFromCsv`,
// then still-first, then mp4), its own story constants.
//
// `deriveFurniture` is imported from THIS SKILL's own copy
// (`skills/chart-video/scripts/render-still.mjs`) by a relative path — not the `#shared/…`
// alias, and not `chart-beat`'s original. The two files are byte-identical (both are copies of
// the one canonical implementation), so the choice changes nothing about what gets rendered; it is
// a direction, not a different function.
//
// Usage:  bun proof/vidy-lollipop-renewables-share-europe/render.mjs [--still-only] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveFurniture,
  readPalette,
} from "../../skills/chart-video/scripts/render-still.mjs";
// The VIDEO format's own size table (landscape floor 30, type scale 2.5) and the type-vs-size
// question, which is craft-neutral and therefore has one copy for both formats.
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
const BEAT_ID = "vidy-lollipop-renewables-share-europe";
/** The chart type, in `references/types/` vocabulary — what `assertTypeMayEnter` is asked about. */
const TYPE = "lollipop";

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
  title:
    "Switzerland's share of renewable electricity trails Norway's by more than 31 points",
  source:
    "Source: Ember & Energy Institute – Statistical Review of World Energy, via Our World in Data · latest available year, mostly 2025 (Iceland: 2024) · share of electricity generation from renewables",
  subjectCountry: "Switzerland",
  compareCountry: "Norway",
  // The fourteen countries this beat draws — the exact `Entity` spelling the CSV uses. See
  // `BRIEF.md`'s "A sharper version of the known OWID CSV filter trap": the fetch's own
  // `&country=` filter had no effect for this indicator, so filtering happens here, in code,
  // against the full frozen export — never re-fetched.
  countries: [
    "Iceland",
    "Norway",
    "Denmark",
    "Austria",
    "Portugal",
    "Sweden",
    "Switzerland",
    "Germany",
    "Finland",
    "Spain",
    "United Kingdom",
    "Italy",
    "Poland",
    "France",
  ],
};

/**
 * OWID's `electricity-mix` export (`Entity,Code,Year,Renewables,Renewables (Original Year)`), 192
 * rows, one per entity's latest available year — not a time series (`BRIEF.md`'s own note on the
 * indicator's shape). Filters to `BEAT.countries`, then sorts by value descending, so the chart's
 * own row order IS the ranking, not a separate editorial step.
 */
export function readingsFromCsv(csv) {
  const [header, ...rows] = parseCsvRows(csv.trim());
  const columns = header;
  const entityAt = columns.indexOf("Entity");
  const valueAt = columns.indexOf("Renewables");
  if (entityAt < 0 || valueAt < 0)
    throw new Error(`csv has no Entity / Renewables column, got: ${header}`);

  const wanted = new Set(BEAT.countries);
  const byCountry = new Map();
  for (const line of rows) {
    const cells = line;
    const entity = cells[entityAt];
    if (!wanted.has(entity)) continue;
    const value = Number(cells[valueAt]);
    if (!Number.isFinite(value)) continue;
    byCountry.set(entity, value);
  }

  return BEAT.countries.filter((c) => byCountry.has(c))
    .map((country) => ({ country, value: byCountry.get(country) }))
    .sort((a, b) => b.value - a.value);
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

// The story's own frozen series, committed beside it — OWID's raw `electricity-mix` export,
// unfiltered by the fetch (`BRIEF.md`'s trap note), filtered to the fourteen target countries here.
// Never re-fetched.
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
const stem = sizeFlag === -1 ? "lollipop" : `lollipop-${size}`;
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
if (data.length !== BEAT.countries.length)
  throw new Error(
    `expected ${BEAT.countries.length} countries, got ${data.length}`,
  );
if (data[0].value !== 100 || data[0].country !== "Iceland")
  throw new Error(
    `expected Iceland at 100% to lead the ranking, got ${data[0].country} (${data[0].value})`,
  );
const subjectRow = data.find((r) => r.country === BEAT.subjectCountry);
const compareRow = data.find((r) => r.country === BEAT.compareCountry);
if (!subjectRow || !compareRow)
  throw new Error("subject or compare country missing from the filtered data");
if (compareRow.value - subjectRow.value <= 30)
  throw new Error(
    `expected ${BEAT.compareCountry} to lead ${BEAT.subjectCountry} by more than 30 points, got ${(compareRow.value - subjectRow.value).toFixed(1)}`,
  );

const props = { ...BEAT, data, size, ...deriveFurniture(BEAT.ground) };
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
// And the DELIVERED mp4, out of the container itself — the one reading the code that wrote the
// file cannot make agree with itself.
assertDeliveredSize(mp4Size(videoPath), size, { what: videoPath });
console.log(`video → ${videoPath}  [${videoSeconds}s], verified from the container`);
