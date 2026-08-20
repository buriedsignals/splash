// twin/proof/vidy-pyramid-niger-population/render.mjs
//
// This story's own render script — the render ladder's second rung, same shape as
// `../video-population-growth-dumbbell/render.mjs` and `chart-video/scripts/render-video.mjs`
// (`readingsFromCsv`, then still-first, then mp4), its own story constants.
//
// `deriveFurniture` is imported from `chart-video`'s own copy
// (`skills/chart-video/scripts/render-still.mjs`) by a relative path — the same direction
// `../video-population-growth-dumbbell/render.mjs` uses, not the `#shared/…` alias: a story workspace
// reaches a skill's script by relative path for the render-time-only node helpers, and consumes the
// shared TYPE via `#shared/…` in the composition/timing files instead.
//
// Usage:  bun proof/vidy-pyramid-niger-population/render.mjs [--still-only] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveFurniture,
  readPalette,
  seriesInks,
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
const BEAT_ID = "vidy-pyramid-niger-population";
/** The chart type, in `references/types/` vocabulary — what `assertTypeMayEnter` is asked about. */
const TYPE = "population-pyramid";

// The colours this beat is drawn in come from the recorded decision beside it, never from a hex
// typed here — see `PALETTE.md`. TWO data colours (the two sides of the pyramid), so both come
// through `seriesInks`, which hands back the recorded accents in the order they were recorded and
// throws rather than padding a missing one with the furniture grey.
const palette = readPalette(HERE, { stopAt: resolve(HERE, "..") });
const [male, female] = seriesInks(palette, 2);
console.log(
  `palette read from ${palette.source} — ground ${palette.ground}, male ${male}, female ${female}, chosen by ${palette.origin}`,
);

/** The story's own constants — the journalist's words, from `BRIEF.md`. */
const BEAT = {
  ground: palette.ground,
  male,
  female,
  title: "Niger's youngest age band dwarfs its entire population aged 65 and older",
  note: "Each bar pair is a five-year age band's population by sex, 2023",
  source:
    "Source: UN, World Population Prospects (2024), via Our World in Data · 2023 data",
  referenceLabel: "Both sides share a zero at the centre",
  legendLabels: ["Male", "Female"],
  subjectBand: "0-4",
};

const ELDER_BANDS = new Set([
  "65-69",
  "70-74",
  "75-79",
  "80-84",
  "85-89",
  "90-94",
  "95-99",
  "100+",
]);

/**
 * OWID's grapher CSVs (`male-population-by-age-group.csv` and `female-population-by-age-group.csv`),
 * merged at freeze time into `data.csv`'s `age_band,male,female` shape — the same convention
 * `../static-swiss-age-pyramid/data.csv` uses. Rows are in their DATA-NATURAL order: youngest first
 * ("0-4"), oldest last ("100+"). This function returns them in that same order unchanged —
 * `PyramidVideo.tsx` does the one, documented reversal to display order (oldest at top) itself, so
 * there is exactly one place in the whole pipeline where that reversal happens.
 */
export function readingsFromCsv(csv) {
  const [header, ...rows] = parseCsvRows(csv.trim());
  const columns = header;
  const bandAt = columns.indexOf("age_band");
  const maleAt = columns.indexOf("male");
  const femaleAt = columns.indexOf("female");
  if (bandAt < 0 || maleAt < 0 || femaleAt < 0)
    throw new Error(`csv has no age_band / male / female column, got: ${header}`);

  return rows.map((line) => {
    const cells = line;
    const ageBand = cells[bandAt];
    const male = Number(cells[maleAt]);
    const female = Number(cells[femaleAt]);
    if (!Number.isFinite(male) || !Number.isFinite(female))
      throw new Error(`non-numeric male/female for band ${ageBand}: ${line}`);
    return { ageBand, male, female };
  });
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

// The story's own frozen series, committed beside it — merged from OWID's two raw
// `*-population-by-age-group.csv` grapher exports, `&csvType=filtered&country=~NER`, verified
// single-country, single-year (2023) (`BRIEF.md`). Never re-fetched.
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
const stem = sizeFlag === -1 ? "pyramid" : `pyramid-${size}`;
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
if (data.length !== 21)
  throw new Error(`expected 21 age bands, got ${data.length}`);
if (data[0].ageBand !== BEAT.subjectBand)
  throw new Error(
    `expected the first (youngest) band to be the subject ${BEAT.subjectBand}, got ${data[0].ageBand}`,
  );

// The two facts `conclusion` states, computed from the actual data — not hardcoded — and checked
// here so a bad freeze fails loud before it ever reaches the render.
const subjectRow = data.find((b) => b.ageBand === BEAT.subjectBand);
const subjectTotal = subjectRow.male + subjectRow.female;
const elderTotal = data
  .filter((b) => ELDER_BANDS.has(b.ageBand))
  .reduce((sum, b) => sum + b.male + b.female, 0);
const grandTotal = data.reduce((sum, b) => sum + b.male + b.female, 0);
console.table(
  data.map((b) => ({ band: b.ageBand, male: b.male, female: b.female, total: b.male + b.female })),
);
console.log(`0-4 band total: ${subjectTotal.toLocaleString()}`);
console.log(`65+ population total: ${elderTotal.toLocaleString()}`);
console.log(`ratio: ${(subjectTotal / elderTotal).toFixed(2)}x`);
console.log(`grand total (sum of bands): ${grandTotal.toLocaleString()}`);
if (subjectTotal <= elderTotal)
  throw new Error(
    `expected the 0-4 band (${subjectTotal}) to exceed the 65+ population (${elderTotal}) — the claim does not hold`,
  );
// `data` is in its natural, youngest-first order (0-4 at index 0, 100+ at the last index), so age
// INCREASES with the array index. Every successive (older) band must be no larger than the one
// before it (younger) — the monotonic "youthquake" silhouette the reveal order (oldest first,
// escalating toward the youngest) depends on. If this ever fails on a re-freeze, the reveal order
// this beat chose no longer matches the data it draws.
for (let i = 1; i < data.length; i++) {
  const youngerTotal = data[i - 1].male + data[i - 1].female;
  const olderTotal = data[i].male + data[i].female;
  if (olderTotal > youngerTotal)
    throw new Error(
      `band ${data[i].ageBand} (${olderTotal}) is larger than the younger band ${data[i - 1].ageBand} (${youngerTotal}) — the monotonic escalation this beat's reveal order depends on does not hold`,
    );
}

const props = {
  ...BEAT,
  data,
  elderTotal,
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
// And the DELIVERED mp4, out of the container itself — the one reading the code that wrote the
// file cannot make agree with itself.
assertDeliveredSize(mp4Size(videoPath), size, { what: videoPath });
console.log(`video → ${videoPath}  [${videoSeconds}s], verified from the container`);
