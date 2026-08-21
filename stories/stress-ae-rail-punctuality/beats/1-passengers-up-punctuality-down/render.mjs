// stories/stress-ae-rail-punctuality/beats/1-passengers-up-punctuality-down/render.mjs
//
// This beat's own render script — the render ladder's second rung, the same shape as
// `chart-video/scripts/render-video.mjs`: read the frozen CSV, derive the furniture colours in
// node, render the FINAL FRAME as a still first, and only then spend minutes on the mp4.
//
// `deriveFurniture` lives beside the resvg rasteriser and cannot run in a browser, so it runs here
// and its output travels in as props. A second copy of the contrast escalation inside the
// composition is how two formats end up disagreeing about what "muted" means on one ground.
//
// Usage:  bun stories/stress-ae-rail-punctuality/beats/1-passengers-up-punctuality-down/render.mjs
//           [--still-only] [--data <csv>] [--out <dir>] [--size <name>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveFurniture, framingMeasurement, readPalette } from "#shared/chart-beat/render-still.mjs";
import {
  assertDeliveredSize,
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/chart-video/sizes.mjs";

/**
 * A REVEAL STAGGERED ACROSS MARKS THAT CARRY NO ORDER — carried, not imported.
 *
 * This is a byte copy of `skills/chart-video/scripts/detect-reveal-order.mjs`'s
 * `staggerLacksAnOrder`. A story workspace is not a skill and may not import out of one, and
 * `#shared/` — the sanctioned route a story DOES have — carries only `chart-video/sizes.mjs` and
 * `chart-video/timing.ts`. So the only way this guard reaches a real beat is by hand. Recorded in
 * NOTES-FOR-MAINTAINER.md: neither shipped story workspace under `proof/` carries it at all.
 */
function staggerLacksAnOrder(marks) {
  const starts = new Set(marks.map((mark) => mark.start));
  const placed = marks.filter((mark) => mark.at !== null && mark.at !== undefined);
  const positions = new Set(placed.map((mark) => mark.at));
  const reading = { marks: marks.length, starts: starts.size, positions: positions.size };
  if (starts.size <= 1)
    return { ...reading, arbitrary: false, why: "the marks arrive together, so no order is claimed" };
  if (placed.length < marks.length)
    return {
      ...reading,
      arbitrary: true,
      why: `${marks.length - placed.length} of ${marks.length} marks carry no position on any axis this reveal could traverse`,
    };
  if (positions.size < marks.length)
    return {
      ...reading,
      arbitrary: true,
      why: `${marks.length} marks hold ${positions.size} position(s) between them, so the order across them is the producer's and not the data's`,
    };
  if (!placed.every((mark, i) => i === 0 || placed[i - 1].at < mark.at))
    return { ...reading, arbitrary: true, why: "the marks arrive against their own positions" };
  return { ...reading, arbitrary: false, why: "the marks arrive in their own ascending order" };
}

/**
 * RFC 4180 row tokeniser, inlined rather than imported — no cross-skill runtime import, and a story
 * workspace is not a skill either. A naive comma split corrupts a quoted thousands separator or a
 * quoted name carrying its own comma; this walks the text one character at a time instead.
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
const STORY = resolve(HERE, "../..");
const PACKAGE_ROOT = resolve(HERE, "../../../..");
const ENTRY = join(HERE, "index.ts");

const { ground, accent, accents, origin, source: paletteSource } = readPalette(HERE, {
  stopAt: STORY,
});
// The second accent is a RECORDED house colour, read back from PALETTE.md and measured against
// this ground by `parsePalette`'s own `assertLegible` before it gets here. It is never derived and
// never defaulted: a beat with two series and one recorded colour refuses rather than invent one.
const secondAccent = accents.find((hex) => hex !== accent);
if (!secondAccent)
  throw new Error(
    `${paletteSource} records one accent and this beat draws two series. Add the second house ` +
      `colour to its \`accents:\` line — every entry is measured against the ground before it is ` +
      `read back — or ask the journalist which two colours the two panels take.`,
  );
console.log(
  `palette from ${paletteSource} — ground ${ground}, accents ${accent} + ${secondAccent}, chosen by ${origin}`,
);

/** The story's own constants, from the editorial exchange. `credit: unattributed` is the answer
 *  `proposeCredit` recommended and the journalist took; `Source: not stated` is what it prints. */
const BEAT = {
  ground,
  accent,
  secondAccent,
  source: "Source: not stated",
  referenceYear: 2014,
};

/** The frozen table: `year,passengers_millions,punctuality_pct`. */
export function rowsFromCsv(csv) {
  const [header, ...rows] = parseCsvRows(csv.trim());
  const yearAt = header.indexOf("year");
  const passengersAt = header.indexOf("passengers_millions");
  const punctualityAt = header.indexOf("punctuality_pct");
  if (yearAt < 0 || passengersAt < 0 || punctualityAt < 0)
    throw new Error(`csv has no year / passengers_millions / punctuality_pct column, got: ${header}`);
  return rows
    .map((cells) => ({
      year: Number(cells[yearAt]),
      passengers: Number(cells[passengersAt]),
      punctuality: Number(cells[punctualityAt]),
    }))
    .filter((r) => Number.isFinite(r.year) && Number.isFinite(r.passengers) && Number.isFinite(r.punctuality))
    .sort((a, b) => a.year - b.year);
}

/**
 * Everything the title asserts, computed from the series itself.
 *
 * The article's own headline says passengers rose "every year" and trains got later "every year".
 * Both are false about this table — 2020 and 2021 break both series, which is this beat's own
 * subject — so the title states the period change and the break instead, and gets its two figures
 * from here rather than from a typist. `subjectYear` is not typed either: it is the year that is
 * the extreme of BOTH columns at once, and this throws if no such year exists, because then the
 * beat's whole claim about one break has nothing to stand on.
 */
export function claimsFrom(data) {
  const first = data[0];
  const last = data[data.length - 1];
  const lowestPassengers = data.reduce((a, b) => (b.passengers < a.passengers ? b : a));
  const highestPunctuality = data.reduce((a, b) => (b.punctuality > a.punctuality ? b : a));
  if (lowestPassengers.year !== highestPunctuality.year)
    throw new Error(
      `the fewest passengers fall in ${lowestPassengers.year} and the best punctuality in ` +
        `${highestPunctuality.year}. The title claims one year breaks both series; this table ` +
        `does not carry that year.`,
    );
  return {
    subjectYear: lowestPassengers.year,
    firstYear: first.year,
    lastYear: last.year,
    passengersRisePct: ((last.passengers - first.passengers) / first.passengers) * 100,
    punctualityFallPoints: first.punctuality - last.punctuality,
  };
}

function remotion(args) {
  const binary = join(PACKAGE_ROOT, "node_modules/.bin/remotion");
  const started = Date.now();
  const result = spawnSync(binary, args, { cwd: PACKAGE_ROOT, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`remotion ${args[0]} exited with ${result.status}`);
  return Math.round((Date.now() - started) / 1000);
}

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

// The story's own frozen table. Never a copy beside the beat: there is nothing here to drift.
const dataPath = flag("--data", join(STORY, "source/data.csv"));
// Gate 2c's answer, read rather than retyped. `readPinnedSize` throws naming every path it looked
// at if BRIEF.md's front matter has none.
const pinned = await readPinnedSize(HERE, { readFile, dirname, join });
const asked = flag("--size", null);
const size = asked ?? pinned;
const COMPOSITION = `rail-punctuality-${size}`;
const outDir = flag("--out", asked ? join(HERE, "sizes") : join(HERE, "renders"));
const stem = asked ? `rail-punctuality-${size}` : "rail-punctuality";
if (asked) console.log(`LOOKING at ${size}; the pinned size stays ${pinned} -> ${outDir}`);
const stillOnly = argv.includes("--still-only");

await mkdir(outDir, { recursive: true });

const data = rowsFromCsv(await readFile(dataPath, "utf8"));
if (data.length < 2) throw new Error(`need at least two readings, got ${data.length}`);

const claims = claimsFrom(data);

// ── THE REVEAL ORDER, DECIDED BEFORE ANYTHING RENDERS.
//
// Reading 1 — what the reveal actually is: one shared chronological head, one mark per year, each
// at its own position on the visible time axis. This is the case `motion-grammar.md` says a stagger
// EARNS, and it is the positive control for this guard.
const RAIL_TIMING = (await import("./timing-contract.ts")).RAIL_TIMING;
const headStart = (i) =>
  data.length <= 1
    ? RAIL_TIMING.reveal.start
    : RAIL_TIMING.reveal.start + Math.round((i / (data.length - 1)) * RAIL_TIMING.reveal.duration);
const sharedHead = data.map((r, i) => ({ key: String(r.year), start: headStart(i), at: r.year }));
const headReading = staggerLacksAnOrder(sharedHead);
if (headReading.arbitrary)
  throw new Error(
    `the reveal claims an order the data does not carry: ${headReading.why}. ` +
      `${headReading.marks} marks, ${headReading.starts} start(s), ${headReading.positions} position(s). ` +
      "A stagger follows the data's own order or it does not happen — motion-grammar.md.",
  );
console.log(
  `reveal (shared head, ${sharedHead.length} marks): ${headReading.why} — ${headReading.starts} start(s), ${headReading.positions} position(s).`,
);

// Reading 2 — the SAME reveal, enumerated one mark per series per year. Reported, never thrown on:
// it is the same build described a second way, and the two readings disagree. See
// NOTES-FOR-MAINTAINER.md; the guard has no notion of a series, so a two-series chronological
// reveal passes or fails on how the producer chooses to count its marks.
const perSeries = data.flatMap((r, i) => [
  { key: `passengers-${r.year}`, start: headStart(i), at: r.year },
  { key: `punctuality-${r.year}`, start: headStart(i), at: r.year },
]);
const perSeriesReading = staggerLacksAnOrder(perSeries);
console.log(
  `reveal (per series, ${perSeries.length} marks): ${perSeriesReading.arbitrary ? "REFUSED" : "earned"} — ${perSeriesReading.why}`,
);

// ── DOES THE FRAMING SERVE THE POINT? A reading printed before the render, never a refusal.
// Called ONCE PER PANEL, because these are two quantities in two units and one reading over both
// concatenated would be a number about nothing. `detect-framing-is-measured.mjs` says this is
// "called by a beat's own render.mjs"; no render.mjs in this tree calls it. See
// NOTES-FOR-MAINTAINER.md.
for (const [name, values] of [
  ["passengers", data.map((r) => r.passengers)],
  ["punctuality", data.map((r) => r.punctuality)],
]) {
  const m = framingMeasurement(values);
  console.log(
    `framing (${name}): min ${m.min}, median ${m.median}, max ${m.max}, ` +
      `spread against extent ${(m.spreadAgainstExtent * 100).toFixed(1)}%, ` +
      `largest against median ${m.largestAgainstMedian.toFixed(2)}x`,
  );
}

console.log(
  `derived: ${claims.firstYear}-${claims.lastYear}, passengers +${claims.passengersRisePct.toFixed(1)}%, ` +
    `punctuality -${claims.punctualityFallPoints.toFixed(1)} points, both broken in ${claims.subjectYear}.`,
);

const title =
  `Since ${claims.firstYear} rail passengers are up ${claims.passengersRisePct.toFixed(0)} per cent and ` +
  `punctuality is down ${claims.punctualityFallPoints.toFixed(1)} points. ${claims.subjectYear} broke both.`;

const props = {
  ...BEAT,
  subjectYear: claims.subjectYear,
  title,
  data,
  size,
  width: sizeFor(size).width,
  height: sizeFor(size).height,
  ...deriveFurniture(BEAT.ground),
};
// THE PROPS FILE IS NOT A DELIVERABLE, so it does not live in `renders/`.
// `deliver`'s `owned-file` form copies EVERY file in `renders/` into `export/`, and its hand-over
// then lists each one to the journalist with a role read off its extension alone. On the first
// delivery of this beat that put a render INPUT in the newsroom's folder, described as "delivered
// with the beat". Written beside the beat instead. See NOTES-FOR-MAINTAINER.md.
const propsPath = join(HERE, `${stem}-props.json`);
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
// THE DELIVERED FILE, MEASURED FROM ITS OWN BYTES.
assertDeliveredSize(readPngSize(await readFile(stillPath)), size, { what: stillPath });
console.log(`still (--frame=-1) -> ${stillPath}  [${stillSeconds}s], verified from the file`);

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
const probed = spawnSync(
  "ffprobe",
  ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", videoPath],
  { encoding: "utf8" },
);
if (probed.status !== 0) throw new Error(`ffprobe could not read ${videoPath}: ${probed.stderr ?? ""}`);
const [probedWidth, probedHeight] = probed.stdout.trim().split(",").map(Number);
assertDeliveredSize({ width: probedWidth, height: probedHeight }, size, { what: videoPath });
console.log(`video -> ${videoPath}  [${videoSeconds}s], ${probedWidth}x${probedHeight} from ffprobe`);
