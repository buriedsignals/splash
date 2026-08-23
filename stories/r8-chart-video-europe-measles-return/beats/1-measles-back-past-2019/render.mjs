// This beat's own render script — the render ladder's second rung, same shape as
// `chart-video/scripts/render-video.mjs`: derive the series in node, check the reveal's order,
// render the FINAL FRAME first, then the mp4, and read each artifact's own dimensions back off its
// bytes. See that file's doc-comment for why this runs in node (`deriveFurniture` sits beside a
// native rasteriser no browser bundle can load) and why the still comes before the video.
//
// Usage:  bun stories/<slug>/beats/1-measles-back-past-2019/render.mjs [--still-only] [--size <row>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveFurniture,
  readPalette,
  readTypeface,
} from "#shared/chart-beat/render-still.mjs";
import {
  assertDeliveredSize,
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/chart-video/sizes.mjs";
import { staggeredReveal } from "#shared/chart-video/detect-reveal-order.mjs";

/**
 * RFC 4180 row tokeniser, inlined here rather than imported — no cross-skill runtime import, and a
 * story workspace is not a skill either. A naive comma split corrupts a quoted field carrying its
 * own comma, and this table has several: "Netherlands (Kingdom of the)" is safe but
 * "United Kingdom of Great Britain and Northern Ireland" sits beside quoted cells elsewhere in the
 * workbook. This walks the text one character at a time instead.
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
const STORY = resolve(HERE, "..", "..");
const PACKAGE_ROOT = resolve(STORY, "..", "..");
const ENTRY = join(HERE, "index.ts");

const { ground, accent, origin, source: paletteSource } = readPalette(HERE, { stopAt: STORY });
console.log(
  `palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`,
);

// THE RECORDED TYPEFACE, READ AND PASSED IN AS A PROP.
//
// `chart-video/scripts/render-video.mjs` reads `PALETTE.md` and does NOT read `TYPEFACE.md`, and
// every composition in this tree carries `FONT_FAMILY` as a literal instead. That is silent when
// the recorded answer happens to equal the literal, and wrong when it does not. This beat reads
// the answer the journalist actually gave at movement 9 and hands it to the component, which uses
// it both to DRAW and to MEASURE. Recorded in NOTES-FOR-MAINTAINER.md as a gap in the format.
const typeface = readTypeface(HERE, { stopAt: STORY });
console.log(`typeface from ${typeface.source} — ${typeface.family}, chosen by ${typeface.origin}`);

/** The region this beat is about, and the years the publisher has actually observed. */
const BEAT = {
  region: "EUR",
  firstYear: 2011,
  // 2025 is EXCLUDED, and not as a window preference: the workbook's own Read Me says "Future
  // months are reported as 0 and will be updated as data is available", so the 2025 rows are
  // placeholder zeros. Plotting them would draw a collapse to zero that never happened.
  lastYear: 2024,
  unit: "cases",
  credit:
    "Source: WHO Regional Office for Europe and UNICEF, joint news release, 13 March 2025",
};

/**
 * The frozen cross-tab, summed into one annual total per year for one WHO region.
 *
 * A BLANK CELL IS MISSING, NEVER ZERO. 11 651 of this workbook's 34 920 value cells are blank, and
 * treating them as zeros would not change any total (adding zero adds nothing) — but it WOULD
 * change the coverage count this function also returns, which is the number the beat's own caveat
 * is built from. They are counted separately for exactly that reason.
 */
export function annualTotalsFromCsv(csv, { region, firstYear, lastYear }) {
  const [header, ...rows] = parseCsvRows(csv.trim());
  const at = (name) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`csv has no ${name} column, got: ${header.join(", ")}`);
    return i;
  };
  const regionAt = at("Region");
  const yearAt = at("Year");
  const countryAt = at("Country");
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthAt = MONTHS.map(at);

  const byYear = new Map();
  for (const cells of rows) {
    if (cells[regionAt] !== region) continue;
    const year = Number(cells[yearAt]);
    if (!Number.isFinite(year) || year < firstYear || year > lastYear) continue;
    const entry = byYear.get(year) ?? { year, cases: 0, blank: 0, cells: 0, countries: new Set() };
    entry.countries.add(cells[countryAt]);
    for (const m of monthAt) {
      entry.cells += 1;
      const raw = (cells[m] ?? "").trim();
      if (raw === "") { entry.blank += 1; continue; }
      const value = Number(raw);
      if (!Number.isFinite(value))
        throw new Error(
          `${cells[countryAt]} ${year}: month cell ${JSON.stringify(raw)} is not a number — ` +
            "this beat sums a published table and will not guess what a cell meant",
        );
      entry.cases += value;
    }
    byYear.set(year, entry);
  }
  const years = [...byYear.values()].sort((a, b) => a.year - b.year);
  if (years.length === 0) throw new Error(`no rows for region ${region} in ${firstYear}-${lastYear}`);
  return years.map((e) => ({ ...e, countries: e.countries.size }));
}

/**
 * Everything the headline, the reference rule and the conclusion assert, computed from the series
 * itself rather than typed. Every one of these was a candidate for a hand-typed literal, and a
 * hand-typed literal is how a rule ends up drawn 0.02 units away from the year it is labelled for.
 */
export function claimsFrom(series) {
  const subject = series[series.length - 1];
  const floor = series.reduce((a, b) => (b.cases < a.cases ? b : a));
  const before = series.filter((d) => d.year < floor.year);
  if (before.length === 0)
    throw new Error(`the floor is the first reading (${floor.year}) — there is no level before it`);
  const reference = before.reduce((a, b) => (b.cases > a.cases ? b : a));
  if (subject.cases <= reference.cases)
    throw new Error(
      `${subject.year} (${subject.cases}) is not above the ${reference.year} level ` +
        `(${reference.cases}) — the headline's crossing has nothing to stand on`,
    );
  return {
    reference: reference.cases,
    referenceYear: reference.year,
    // The unit travels with this label: the y axis prints only its zero, so this is the one place
    // on the frame that says what is being counted.
    referenceLabel: `${reference.year} level · ${en(reference.cases)} cases`,
    subjectYear: subject.year,
    floorYear: floor.year,
    floorCases: floor.cases,
    excess: subject.cases - reference.cases,
    excessLabel: `${en(subject.cases - reference.cases)} above ${reference.year}`,
    subjectBlank: subject.blank,
    subjectCells: subject.cells,
    countries: subject.countries,
  };
}

const GROUPED = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
function en(value) {
  return GROUPED.format(value);
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

// The STORY'S OWN FROZEN TABLE, not a copy beside the beat. Intake froze it and refuses a second
// freeze; a beat that kept its own copy would be a second version of the record.
const dataPath = flag("--data", join(STORY, "source", "data.csv"));

// Gate 2c pinned a size; this beat records it in its own BRIEF.md front matter; `readPinnedSize`
// throws naming every path it looked at if it is missing.
const pinned = await readPinnedSize(HERE, { readFile, dirname, join });
const asked = flag("--size", null);
const size = asked ?? pinned;
const COMPOSITION = `measles-return-${size}`;
const outDir = flag("--out", asked ? join(HERE, "sizes") : join(HERE, "renders"));
const stem = asked ? `measles-return-${size}` : "measles-return";
if (asked) console.log(`LOOKING at ${size}; the pinned size stays ${pinned} -> ${outDir}`);
const stillOnly = argv.includes("--still-only");

await mkdir(outDir, { recursive: true });

const series = annualTotalsFromCsv(await readFile(dataPath, "utf8"), BEAT);
if (series.length < 2) throw new Error(`need at least two readings, got ${series.length}`);
const data = series.map(({ year, cases }) => ({ year, cases }));

const claims = claimsFrom(series);
console.log(
  `derived: ${claims.floorYear} floor ${en(claims.floorCases)}, ` +
    `${claims.referenceYear} level ${en(claims.reference)}, ` +
    `${claims.subjectYear} ${en(data[data.length - 1].cases)} — ${en(claims.excess)} above; ` +
    `${claims.subjectBlank} of ${claims.subjectCells} country-months of ${claims.subjectYear} unreported.`,
);

// ── The reveal's own order, decided before a frame is drawn ────────────────────────────────────
// `drawnSoFar` walks the line's points linearly across `reveal`, so each point's arrival begins at
// its own share of that window and each carries its own year — the position it holds on the axis
// the reveal traverses, which the frame prints (2011 / 2018 / 2024). Distinct, ascending, one per
// mark. The same call on a set of categories with no shared axis reddens, which is the point.
const { reading: revealReading } = staggeredReveal(
  data,
  (await import("./timing-contract.ts")).MEASLES_TIMING.reveal,
  { keyOf: (r) => r.year, positionOf: (r) => r.year, where: "the reveal" },
);
console.log(`reveal: ${revealReading.why} (${revealReading.marks} marks, ${revealReading.starts} start(s)).`);

// THE WORDING IS A LAYOUT DECISION TAKEN AT THE PIXELS, TWICE. The first version ("… fell to 150
// cases in 2021 — by 2024 it was back above 2019.") wrapped to four lines of 66 px type and left
// the plot 200 px tall on a 1080 px frame: a strip, not a chart. Shortening it to a colon clause
// recovered the plot but broke the wrap at "2024." — a one-word last line, which on a feed post is
// the first thing a reader's eye catches. "then" is four characters bought back to balance the
// four lines. Every number in it is still derived; only the grammar was ever touched.
const title =
  `Measles in Europe and central Asia: ${en(claims.floorCases)} cases in ${claims.floorYear}, ` +
  `then back above ${claims.referenceYear} by ${claims.subjectYear}.`;
// The credit is the RECORDED one, verbatim, with the scope and the year's own incompleteness added
// after it. The incompleteness is measured from the table, never asserted.
// The recorded credit VERBATIM, then the one caveat a reader must have to read the last mark
// honestly. The region's scope used to be repeated here and is not any more: the title names it,
// and a fourth line of credit cost the plot 50 px it needed more.
const source =
  `${BEAT.credit} · ${claims.subjectYear} incomplete: ` +
  `${claims.subjectBlank} of ${claims.subjectCells} country-months unreported`;

const props = {
  data,
  title,
  source,
  ground,
  accent,
  reference: claims.reference,
  referenceLabel: claims.referenceLabel,
  subjectYear: claims.subjectYear,
  floorYear: claims.floorYear,
  excessLabel: claims.excessLabel,
  unit: BEAT.unit,
  fontFamily: typeface.family,
  size,
  width: sizeFor(size).width,
  height: sizeFor(size).height,
  ...deriveFurniture(ground),
};
const propsPath = join(outDir, `${stem}-props.json`);
await writeFile(propsPath, JSON.stringify(props, null, 2));

// Rung 2a: the last frame, on its own. If the end state is not a complete, readable chart, the
// video is wrong and nothing below is worth waiting for.
const stillPath = join(outDir, `${stem}-final-frame.png`);
const stillSeconds = remotion([
  "still", ENTRY, COMPOSITION, stillPath, "--frame=-1", `--props=${propsPath}`, "--timeout=180000",
]);
// THE DELIVERED FILE, MEASURED FROM ITS OWN BYTES — the one reading the code that wrote it cannot
// make agree with itself.
assertDeliveredSize(readPngSize(await readFile(stillPath)), size, { what: stillPath });
console.log(`still (--frame=-1) → ${stillPath}  [${stillSeconds}s], verified from the file`);

if (stillOnly) process.exit(0);

// Rung 2b: the mp4. Concurrency 1 keeps the render deterministic and the machine usable.
const videoPath = join(outDir, `${stem}.mp4`);
const videoSeconds = remotion([
  "render", ENTRY, COMPOSITION, videoPath, `--props=${propsPath}`, "--concurrency=1", "--timeout=180000",
]);
const probed = spawnSync(
  "ffprobe",
  ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", videoPath],
  { encoding: "utf8" },
);
if (probed.status !== 0) throw new Error(`ffprobe could not read ${videoPath}: ${probed.stderr ?? ""}`);
const [probedWidth, probedHeight] = probed.stdout.trim().split(",").map(Number);
assertDeliveredSize({ width: probedWidth, height: probedHeight }, size, { what: videoPath });
console.log(`video → ${videoPath}  [${videoSeconds}s], ${probedWidth}x${probedHeight} from ffprobe`);
