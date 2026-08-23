/**
 * Derives this beat's own data.json from the frozen source/data.csv, so the desk can see exactly
 * which rows and which columns became which line. Nothing here is typed by hand except the two
 * column names, the row the beat reads, and the year the series can start.
 *
 * Three things this script REFUSES to guess, each one recorded in BRIEF.md:
 *   1. The rows. The frozen table is a panel keyed on `Ortschaft` — inside built-up areas, outside
 *      built-up areas, and both together — and the third row is the SUM of the first two. The beat
 *      reads only the "both together" row, and the script asserts the identity holds in every year
 *      it keeps, so a file that stopped being a sum would stop this beat rather than halve it.
 *   2. The series break. The publisher writes a hyphen where a column does not apply to a year.
 *      This script asserts that the two `_ab_2014` columns are hyphens for every year before 2014
 *      and numbers from 2014 on, and that `Getoetete_Fahrraeder_bis_2013` is the mirror image. If
 *      the file ever changes under it, the beat stops instead of drawing across a definition change.
 *   3. The blank rows. The published sheet carries 186 all-blank rows after the data. They are
 *      skipped by an explicit test on the year cell, never by a row count.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SOURCE = join(import.meta.dirname, "..", "..", "source", "data.csv");
const OUT = join(import.meta.dirname, "data.json");

/** The one row of the panel this beat reads: inside AND outside built-up areas. */
const BOTH = "Innerhalb und außerhalb von Ortschaften";
const INSIDE = "Innerhalb von Ortschaften";
const OUTSIDE = "Außerhalb von Ortschaften";
/** The year both `_ab_2014` columns begin, as the publisher's own column names state it. */
const SERIES_BEGINS = 2014;
/** The publisher's marker for "this column does not apply to this year". Not a zero, not a blank. */
const NOT_APPLICABLE = "-";

const PEDELEC = "Getoetete_Pedelecs_ab_2014";
const BICYCLE = "Getoetete_Fahrraeder_ohne_Elektroantrieb_ab_2014";
const BICYCLE_BEFORE = "Getoetete_Fahrraeder_bis_2013";
const TOTAL = "Getoetete_Insgesamt";

/**
 * RFC 4180, walked one character at a time. A split on "," reads a quoted field carrying its own
 * comma as two fields, and `skills/splash/test/csv-hand-split.test.ts` refuses the naive reading
 * everywhere in this tree.
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

/** The frozen table as one object per row, keyed by the header's own names. A NAMED reader, because
 *  `skills/splash/test/csv-readers-parse-their-fixtures.test.ts` walks every inlined tokeniser in
 *  this tree and runs it against its own frozen CSV. */
function rowsFromCsv(text) {
  const [columns, ...body] = parseCsvRows(text);
  return body.map((cells) => Object.fromEntries(columns.map((name, i) => [name, (cells[i] ?? "").trim()])));
}

/** A count, or a throw naming the cell. Never `Number()` on its own: `Number("")` is 0 and
 *  `Number("-")` is NaN, and both would reach the geometry as a reading nobody published. */
function count(cell, where) {
  if (!/^\d+$/.test(cell)) throw new Error(`${where}: expected a whole count, the file holds ${JSON.stringify(cell)}`);
  return Number(cell);
}

const rows = rowsFromCsv(await readFile(SOURCE, "utf8"))
  // The 186 all-blank trailing rows of the published sheet. Skipped by testing the year cell, never
  // by trusting a row count.
  .filter((row) => /^\d{4}$/.test(row.Jahr ?? ""));

const byPlaceYear = new Map();
for (const row of rows) byPlaceYear.set(`${row.Ortschaft}|${row.Jahr}`, row);

const allYears = [...new Set(rows.map((r) => Number(r.Jahr)))].sort((a, b) => a - b);

// 1. THE ROW. The panel's third entity is the sum of the other two, and the beat reads only that
// third row. Asserted rather than assumed, in every year the file holds.
for (const year of allYears) {
  const both = byPlaceYear.get(`${BOTH}|${year}`);
  const inside = byPlaceYear.get(`${INSIDE}|${year}`);
  const outside = byPlaceYear.get(`${OUTSIDE}|${year}`);
  if (!both || !inside || !outside) throw new Error(`${year}: the panel is missing one of its three Ortschaft rows`);
  const sum = count(inside[TOTAL], `${INSIDE} ${year}`) + count(outside[TOTAL], `${OUTSIDE} ${year}`);
  const stated = count(both[TOTAL], `${BOTH} ${year}`);
  if (sum !== stated) {
    throw new Error(
      `${year}: "${BOTH}" states ${stated} road deaths and its own two parts sum to ${sum} — this ` +
        `beat reads the total row on the understanding that it IS the total, and it no longer is`,
    );
  }
}

// 2. THE SERIES BREAK. The column names say where each column applies; this asserts the cells agree.
for (const year of allYears) {
  const row = byPlaceYear.get(`${BOTH}|${year}`);
  const after = year >= SERIES_BEGINS;
  for (const column of [PEDELEC, BICYCLE]) {
    const cell = row[column];
    const applies = cell !== NOT_APPLICABLE;
    if (applies !== after) {
      throw new Error(
        `${column} in ${year} reads ${JSON.stringify(cell)}; the column's own name says it applies ` +
          `${after ? "from" : "only from"} ${SERIES_BEGINS}, so this beat cannot say where its series starts`,
      );
    }
  }
  const before = row[BICYCLE_BEFORE];
  if ((before !== NOT_APPLICABLE) !== !after) {
    throw new Error(
      `${BICYCLE_BEFORE} in ${year} reads ${JSON.stringify(before)}; the column's own name says it ` +
        `applies only up to ${SERIES_BEGINS - 1}, and the two bicycle definitions must not overlap`,
    );
  }
}

const years = allYears.filter((y) => y >= SERIES_BEGINS);
const read = (column) =>
  years.map((year) => count(byPlaceYear.get(`${BOTH}|${year}`)[column], `${BOTH} ${year} ${column}`));

const pedelec = read(PEDELEC);
const bicycle = read(BICYCLE);
const allDeaths = read(TOTAL);

await writeFile(
  OUT,
  JSON.stringify(
    {
      years,
      seriesBeginsIn: SERIES_BEGINS,
      pedelec,
      bicycle,
      allRoadDeaths: allDeaths,
      row: BOTH,
      columns: { pedelec: PEDELEC, bicycle: BICYCLE, retired: BICYCLE_BEFORE, total: TOTAL },
      lastYearOfTheRetiredColumn: SERIES_BEGINS - 1,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `wrote ${OUT}: ${years.length} years (${years[0]}-${years[years.length - 1]}), two series, ` +
    `the total-row identity verified in all ${allYears.length} years the file holds, and both ` +
    `column breaks verified against the column names`,
);
