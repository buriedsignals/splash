// twin/proof/life-expectancy/render.mjs
//
// This story's own render script — the render ladder's second rung, same shape as
// `chart-video/scripts/render-video.mjs` (`readingsFromCsv`, then still-first, then mp4),
// its own story constants. `readingsFromCsv` now reads OWID's own grapher columns
// (`Year,Life expectancy`) rather than a hand-shaped `year,value` — the committed `data.csv` is
// OWID's raw, unedited fetch, and a story folder should not reshape the source data it credits.
// See `render-video.mjs` for the doc-comment on why this runs in node (`deriveFurniture`) and why
// the still is rendered before the mp4.
//
// Usage:  bun proof/life-expectancy/render.mjs [--still-only] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveFurniture,
  readPalette,
} from "#shared/chart-beat/render-still.mjs";
import {
  assertDeliveredSize,
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/chart-video/sizes.mjs";

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

const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
  stopAt: join(HERE, ".."),
});
console.log(
  "palette from " + paletteSource + " — ground " + ground + ", accent " + accent + ", chosen by " + origin,
);

/** The story's own constants — the journalist's words, from the CADRAGE exchange.
 *
 * `source` was corrected 2026-08-09: the beat had credited "Federal Statistical Office" over
 * numbers that lived only in `/tmp` — no committed data reproduced them. The FSO's own published
 * annual life-expectancy table (`lebenserwartung-2000-2024`, opendata.swiss) carries only sex-split
 * series (Hommes/Femmes), not the single combined figure this beat plots; averaging the two by hand
 * would be an invented number wearing a real institution's name, which is the exact defect this
 * fix closes. Our World in Data's `life-expectancy` grapher carries the combined series the FSO
 * table does not, sourced from the UN World Population Prospects (2024 revision) for this range —
 * fetched with `&csvType=filtered&country=~CHE`, verified single-country. The credit now names that
 * source. The narrative survives unchanged: 2019 = 83.8 (reference, matches previously), 2020 dips
 * to 83.06, and 2023 (83.95) is the first year back above the 2019 level — but the real series has
 * no 2024 row yet, so "data 2024" is now "data 2023".
 *
 * `ground` and `accent` are no longer constants here: they are the newsroom's recorded answer, read
 * from `PALETTE.md` beside this file.
 */
const BEAT = {
  ground,
  accent,
  source: "Source: UN World Population Prospects (2024), via Our World in Data · data 2023",
  // The committed CSV is OWID's full series back to 1876 (its raw, unedited fetch) — this beat's
  // own window, same convention `co2-suisse/render-web.mjs` uses for its `firstYear`.
  firstYear: 2000,
};

/** Small integers as words, for a headline that reads like a sentence and still gets its number
 *  from the data. Throws rather than fall back to a digit, so a longer recovery would be caught. */
const WORD = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/**
 * Everything the headline and the reference rule assert, computed from the series itself.
 *
 * This used to be four typed constants, and two of them were wrong in the same way. The reference
 * was the literal `83.8` against a 2019 reading of 83.7804 — a rule sitting 0.02 years above the
 * year it is labelled for. And the title said Covid cost "nearly a year" against a fall of 0.7178
 * years, which rounds 0.72 up to 1 in a reader's ear: an overstatement of about 39%, in the
 * headline. Both are now read out of `data.csv`.
 */
export function claimsFrom(data) {
  let subjectIndex = -1;
  let worstFall = 0;
  for (let i = 1; i < data.length; i++) {
    const fall = data[i - 1].value - data[i].value;
    if (fall > worstFall) {
      worstFall = fall;
      subjectIndex = i;
    }
  }
  if (subjectIndex < 0) throw new Error("no year in this window falls below the one before it");
  const subject = data[subjectIndex];
  const priorYear = data[subjectIndex - 1];
  const recovery = data.find((d) => d.year > subject.year && d.value >= priorYear.value);
  if (!recovery)
    throw new Error(
      `the series never returns to its ${priorYear.year} level of ${priorYear.value} — the title's ` +
        "recovery claim has nothing to stand on",
    );
  const span = recovery.year - subject.year;
  if (!WORD[span]) throw new Error(`no word for a ${span}-year recovery; extend WORD`);
  return {
    reference: priorYear.value,
    referenceLabel: `${priorYear.year} level`,
    subjectYear: subject.year,
    recoveryYear: recovery.year,
    fallYears: priorYear.value - subject.value,
    fallMonths: (priorYear.value - subject.value) * 12,
    recoverySpanWords: WORD[span],
  };
}

/** OWID's grapher CSV: `Entity,Code,Year,Life expectancy`, one country once filtered. */
export function readingsFromCsv(csv, firstYear = -Infinity) {
  const [header, ...rows] = parseCsvRows(csv.trim());
  const columns = header;
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.indexOf("Life expectancy");
  if (yearAt < 0 || valueAt < 0)
    throw new Error(`csv has no Year / Life expectancy column, got: ${header}`);

  return rows
    .map((row) => row)
    .map((cells) => ({ year: Number(cells[yearAt]), value: Number(cells[valueAt]) }))
    .filter(
      (r) => Number.isFinite(r.year) && Number.isFinite(r.value) && r.year >= firstYear,
    )
    .sort((a, b) => a.year - b.year);
}

function remotion(args) {
  const binary = join(PACKAGE_ROOT, "node_modules/.bin/remotion");
  const started = Date.now();
  const result = spawnSync(binary, args, { cwd: PACKAGE_ROOT, stdio: "inherit" });
  if (result.status !== 0)
    throw new Error(`remotion ${args[0]} exited with ${result.status}`);
  return Math.round((Date.now() - started) / 1000);
}

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

// The story's own frozen series, committed beside it — OWID's raw `life-expectancy` grapher
// export for Switzerland, `&csvType=filtered&country=~CHE`, verified single-country before being
// trusted. No longer `/tmp`.
const dataPath = flag("--data", join(HERE, "data.csv"));
// Defaults BESIDE THE BEAT, not to /tmp. It used to default to a scratch directory, so running
// this script the obvious way produced a fresh artifact nobody looks at, printed a path, exited
// zero, and left the committed mp4 stale. An explicit --out still overrides.
// THE JOURNALIST'S DECISION, READ RATHER THAN RETYPED. Gate 2c pins a size; this beat records it in
// its own `BRIEF.md` front matter; `readPinnedSize` throws naming every path it looked at if it is
// missing. Before this the size lived in `Root.tsx` and in the component, as the same two literals,
// and nothing downstream of the gate read what the journalist chose.
const pinned = await readPinnedSize(HERE, { readFile, dirname, join });
// `--size <name>` renders one of the OTHER two, into `sizes/`, so all three can be opened and
// compared. It is deliberately not a way to change what this beat DELIVERS: the delivered files
// keep the beat's own names and the pinned size, and an override says so and writes somewhere else.
const asked = flag("--size", null);
const size = asked ?? pinned;
const COMPOSITION = `life-expectancy-${size}`;
const outDir = flag("--out", asked ? join(HERE, "sizes") : HERE);
const stem = asked ? `life-expectancy-${size}` : "life-expectancy";
if (asked) console.log(`LOOKING at ${size}; the pinned size stays ${pinned} -> ${outDir}`);
const stillOnly = argv.includes("--still-only");

await mkdir(outDir, { recursive: true });

const data = readingsFromCsv(await readFile(dataPath, "utf8"), BEAT.firstYear);
if (data.length < 2) throw new Error(`need at least two readings, got ${data.length}`);

const claims = claimsFrom(data);
console.log(
  `derived: ${claims.subjectYear} falls ${claims.fallYears.toFixed(4)} years ` +
    `(${claims.fallMonths.toFixed(1)} months) from the ${claims.referenceLabel} of ` +
    `${claims.reference}, back above it in ${claims.recoveryYear} — ${claims.recoverySpanWords} years.`,
);
const title =
  `Covid cost Switzerland ${claims.fallMonths.toFixed(1)} months of life expectancy — and it took ` +
  `${claims.recoverySpanWords} years to win it back.`;

// `size` travels with the props so the composition and the component agree on which row this is;
// `width`/`height` travel with it so anything replaying these props OUTSIDE Remotion — the suites
// that server-render a beat at a chosen frame — sees the frame it was rendered at rather than
// falling back to a default. The component still reads the frame from `useVideoConfig`.
const props = {
  ...BEAT,
  ...claims,
  title,
  data,
  size,
  width: sizeFor(size).width,
  height: sizeFor(size).height,
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
// THE DELIVERED FILE, MEASURED FROM ITS OWN BYTES — the one reading the code that wrote it cannot
// make agree with itself. A composition registered at the wrong dimensions, or a Remotion scale
// flag, arrives here rather than in the newsroom.
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
// THE MP4'S OWN DIMENSIONS, out of the container rather than out of the arguments. This is the
// video path's `assertDeliveredSize`, and it holds for ALL THREE sizes — the original Splash
// exempts landscape from its own equivalent, which is the mistake being avoided here, not the model
// being copied.
const probed = spawnSync(
  "ffprobe",
  [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height",
    "-of", "csv=p=0",
    videoPath,
  ],
  { encoding: "utf8" },
);
if (probed.status !== 0)
  throw new Error(`ffprobe could not read ${videoPath}: ${probed.stderr ?? ""}`);
const [probedWidth, probedHeight] = probed.stdout.trim().split(",").map(Number);
assertDeliveredSize({ width: probedWidth, height: probedHeight }, size, {
  what: videoPath,
});
console.log(`video → ${videoPath}  [${videoSeconds}s], ${probedWidth}x${probedHeight} from ffprobe`);
