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

const text = await readFile(SOURCE, "utf8");
const [header, ...body] = text.trim().split(/\r?\n/);
const columns = header.split(",");
const rows = body.map((line) => {
  const cells = line.split(",");
  return Object.fromEntries(columns.map((name, i) => [name, cells[i]]));
});

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
