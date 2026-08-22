/**
 * Derives this beat's own data.json from the frozen source/data.csv, so the desk can see exactly
 * which rows became which band. Nothing here is typed by hand except the six continent names and
 * the year the series stops at.
 *
 * Three decisions this script makes, each one recorded in BRIEF.md:
 *   1. The six continents are used as a PARTITION of the world. The script asserts that they sum
 *      to the file's own `World` row in every year it keeps, and throws if they do not — a join
 *      that fails loud rather than a chart drawn on an assumption.
 *   2. `European Union (27)` and `Europe (excl. Russia)` are dropped: they overlap `Europe`, and a
 *      stacked area whose bands overlap is drawing the same fires twice.
 *   3. 2026 is dropped. The dataset's own description says the year is incomplete and was last
 *      updated 21 August 2026.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SOURCE = join(import.meta.dirname, "..", "..", "source", "data.csv");
const OUT = join(import.meta.dirname, "data.json");

/** Bottom to top. The order is the argument: the subject takes the flat baseline. */
const BANDS = ["Africa", "Asia", "South America", "Oceania", "North America", "Europe"];
const LAST_COMPLETE_YEAR = 2025;

/**
 * RFC 4180, walked one character at a time. A split on "," reads a quoted entity name carrying its
 * own comma as two fields — and this file's own table holds `Bonaire Sint Eustatius and Saba` and
 * `European Union (27)` beside names that do not. `skills/splash/test/csv-hand-split.test.ts`
 * refuses the naive reading everywhere in this tree, and it is right to: it was a real defect in a
 * real beat before it was a rule.
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

/** The frozen table as rows a caller can use — one object per row, keyed by the header's own names.
 *  A NAMED reader rather than three statements at the top level, because that is what
 *  `skills/splash/test/csv-readers-parse-their-fixtures.test.ts` calls: it walks every inlined
 *  tokeniser in the tree and runs each one against its own frozen CSV, so a reader that quietly
 *  stopped returning rows would be caught. A tokeniser nothing calls is invisible to it. */
function rowsFromCsv(text) {
  const [columns, ...body] = parseCsvRows(text.trim());
  return body.map((cells) => Object.fromEntries(columns.map((name, i) => [name, cells[i]])));
}

const rows = rowsFromCsv(await readFile(SOURCE, "utf8"));

const byEntityYear = new Map();
for (const row of rows) byEntityYear.set(`${row.entity}|${row.year}`, Number(row.events));

const years = [...new Set(rows.map((r) => Number(r.year)))]
  .sort((a, b) => a - b)
  .filter((y) => y <= LAST_COMPLETE_YEAR);

const series = BANDS.map((band) => ({
  name: band,
  values: years.map((year) => {
    const value = byEntityYear.get(`${band}|${year}`);
    if (value === undefined) throw new Error(`no ${band} row for ${year} in the frozen table`);
    return value;
  }),
}));

// The partition check. A stacked area claims its bands ARE the whole; this is where that claim is
// tested against the file rather than assumed from the names.
const world = years.map((year) => {
  const value = byEntityYear.get(`World|${year}`);
  if (value === undefined) throw new Error(`no World row for ${year} in the frozen table`);
  return value;
});
years.forEach((year, i) => {
  const stacked = series.reduce((sum, s) => sum + s.values[i], 0);
  if (stacked !== world[i]) {
    throw new Error(
      `the six continents sum to ${stacked} in ${year} and the file's own World row says ${world[i]} — ` +
        `these bands are not a partition of that total and this beat may not draw them as one`,
    );
  }
});

const dropped = [...new Set(rows.map((r) => r.entity))].filter(
  (e) => !BANDS.includes(e) && (e === "World" || e.startsWith("European Union") || e.startsWith("Europe (")),
);

await writeFile(
  OUT,
  JSON.stringify(
    {
      years,
      series,
      world,
      lastCompleteYear: LAST_COMPLETE_YEAR,
      excludedYear: 2026,
      aggregatesNotDrawn: dropped,
    },
    null,
    2,
  ) + "\n",
);
console.log(`wrote ${OUT}: ${series.length} bands x ${years.length} years, partition verified`);
