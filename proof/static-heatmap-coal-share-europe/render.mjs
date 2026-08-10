// twin/proof/static-heatmap-coal-share-europe/render.mjs
//
// Reads the frozen CSV (coal's share of electricity generation, twelve countries, 2010-2024) and
// renders the heatmap.
// Usage, from `twin/`:  bun proof/static-heatmap-coal-share-europe/render.mjs
//
// Every number in the title, the subtitle and the alt text is COMPUTED here from the frozen file
// and echoed to the console before the render. Nothing is typed.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill, readPalette } from "#shared/chart-beat/render-still.mjs";
import { CoalShareHeatmap, formatCell } from "./CoalShareHeatmap.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIRST_YEAR = 2010;
const LAST_YEAR = 2024;

/**
 * The twelve rows, and the rule that chose them: of the EU-27 plus the United Kingdom, the twelve
 * where coal supplied the largest share of electricity in 2010 — the grid's own first column.
 *
 * The rule is inside the data rather than outside it, which is unusual and has to be said plainly:
 * these are the countries with the most coal to lose, so a grid of them is a grid about the
 * decline of coal, NOT about Europe. The subtitle says so, because a reader who takes it for
 * Europe would conclude that European power is far more coal-heavy than it is. Countries that
 * already burned little coal in 2010 are not here, and their absence is the selection, not a
 * finding.
 */
const EU27_PLUS_UK = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czechia", "Denmark", "Estonia",
  "Finland", "France", "Germany", "Greece", "Hungary", "Ireland", "Italy", "Latvia",
  "Lithuania", "Luxembourg", "Malta", "Netherlands", "Poland", "Portugal", "Romania",
  "Slovakia", "Slovenia", "Spain", "Sweden", "United Kingdom",
];
const ROWS = 12;

function parseCsv(text) {
  const [header, ...rows] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  return rows
    .filter((row) => row.length > 0)
    .map((row) => {
      if (row.includes('"')) throw new Error(`quoted field in frozen data, parser is too simple: ${row}`);
      const cells = row.split(",");
      if (cells.length !== cols.length)
        throw new Error(`row has ${cells.length} cells, header has ${cols.length}: ${row}`);
      const rec = {};
      cols.forEach((c, i) => (rec[c] = cells[i]));
      return rec;
    });
}

async function main() {
  const csv = await readFile(join(HERE, "data.csv"), "utf8");
  const raw = parseCsv(csv);
  console.log(`read ${raw.length} rows from data.csv`);

  const entities = [...new Set(raw.map((r) => r.Entity))].sort();
  console.log(`distinct Entity values (${entities.length}): ${entities.join(", ")}`);
  const strays = entities.filter((e) => !EU27_PLUS_UK.includes(e));
  if (strays.length) throw new Error(`frozen data holds entities outside the candidate set: ${strays.join(", ")}`);
  if (entities.length !== ROWS)
    throw new Error(`frozen data holds ${entities.length} countries, the grid draws ${ROWS}`);

  const years = [];
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) years.push(y);

  const rows = entities.map((country) => {
    const readings = raw
      .filter((r) => r.Entity === country)
      .map((r) => ({ year: Number(r.Year), value: Number(r.Coal) }))
      .sort((a, b) => a.year - b.year);
    // A heatmap has no way to draw a hole honestly at this density — a missing cell reads as a
    // low value. So a gap is a stop here, not a note, and the grid is never drawn ragged.
    if (readings.length !== years.length)
      throw new Error(`${country} has ${readings.length} readings, the grid needs ${years.length}`);
    readings.forEach((r, i) => {
      if (r.year !== years[i]) throw new Error(`${country} is missing ${years[i]}`);
      if (!Number.isFinite(r.value)) throw new Error(`${country} ${r.year} is not a number`);
      if (r.value < 0 || r.value > 100)
        throw new Error(`${country} ${r.year} is ${r.value}, which is not a share of a whole`);
    });
    return { country, readings };
  });

  const at = (row, year) => row.readings.find((r) => r.year === year).value;

  // Row order: by the FIRST year's value, descending. `heatmap.md` asks for rows ordered
  // deliberately so clusters read as blocks; ordering by the selection year keeps the rule that
  // chose the twelve visible in the grid itself, and lets the decline read left-to-right down a
  // sorted first column.
  const ordered = [...rows].sort((a, b) => at(b, FIRST_YEAR) - at(a, FIRST_YEAR));
  console.table(
    ordered.map((r) => ({
      country: r.country,
      [FIRST_YEAR]: at(r, FIRST_YEAR).toFixed(1),
      [LAST_YEAR]: at(r, LAST_YEAR).toFixed(1),
      "fell by": `${(((at(r, FIRST_YEAR) - at(r, LAST_YEAR)) / at(r, FIRST_YEAR)) * 100).toFixed(0)}%`,
    })),
  );

  const fellEverywhere = ordered.every((r) => at(r, LAST_YEAR) < at(r, FIRST_YEAR));
  console.log(`fell in every row: ${fellEverywhere}`);
  if (!fellEverywhere) throw new Error("the headline says all twelve fell — the data no longer says so");

  const relativeFall = (r) => (at(r, FIRST_YEAR) - at(r, LAST_YEAR)) / at(r, FIRST_YEAR);
  const steepest = [...ordered].sort((a, b) => relativeFall(b) - relativeFall(a))[0];
  const stillHighest = ordered[0];
  const stillOverHalf = ordered.filter((r) => at(r, LAST_YEAR) > 50);
  const nowUnderTen = ordered.filter((r) => at(r, LAST_YEAR) < 10);
  const maxValue = Math.max(...ordered.flatMap((r) => r.readings.map((x) => x.value)));
  const maxCell = ordered
    .flatMap((r) => r.readings.map((x) => ({ country: r.country, ...x })))
    .find((c) => c.value === maxValue);

  console.log(
    `steepest relative fall: ${steepest.country}, ${(relativeFall(steepest) * 100).toFixed(0)}% ` +
      `(${at(steepest, FIRST_YEAR).toFixed(1)} -> ${at(steepest, LAST_YEAR).toFixed(1)})`,
  );
  console.log(
    `still above half in ${LAST_YEAR}: ${stillOverHalf.map((r) => `${r.country} ${at(r, LAST_YEAR).toFixed(1)}`).join(", ") || "none"}`,
  );
  console.log(
    `now under 10%: ${nowUnderTen.length} (${nowUnderTen.map((r) => r.country).join(", ")})`,
  );
  console.log(`darkest cell: ${maxCell.country} ${maxCell.year} at ${maxValue.toFixed(1)}%`);
  if (stillOverHalf.length !== 1)
    throw new Error(
      `the headline names one country still above half; the data says ${stillOverHalf.length}`,
    );

  const spelled = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve"];
  const title =
    `Coal's share of electricity fell in all twelve of Europe's most coal-dependent countries ` +
    `between ${FIRST_YEAR} and ${LAST_YEAR} — ${stillHighest.country} still burns it for more ` +
    `than half`;
  const subtitle =
    `Coal's share of each country's own electricity generation, %. The twelve shown are the ` +
    `EU-27-plus-UK countries where coal supplied the largest share in ${FIRST_YEAR}, ranked by ` +
    `that year — not a picture of Europe, which uses far less coal than this grid alone would ` +
    `suggest. Colour is scaled by the square root of the share, so the small shares most of this ` +
    `grid holds stay distinguishable; the legend's own uneven tick spacing shows it. Only ` +
    `${FIRST_YEAR} and ${LAST_YEAR} carry printed values.`;
  // English furniture: "United Kingdom fades furthest" reads as machine output.
  // `static-discipline.md` counts a language leak in the furniture as a defect even when every
  // number is right.
  const NEEDS_THE = new Set(["United Kingdom", "Netherlands", "Czechia"]);
  const named = (c) => (NEEDS_THE.has(c) ? `the ${c}` : c);
  /** Sentence-initial. "the United Kingdom fades furthest" is a real defect at the start of a
   *  sentence, and the alt text is read aloud. */
  const opening = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const alt =
    `Heatmap grid, twelve countries by fifteen years, ${FIRST_YEAR} to ${LAST_YEAR}, shaded from ` +
    `mid-grey for a small share of electricity to near-black for a large one. Rows are ranked by ` +
    `their ${FIRST_YEAR} share. The dark band is concentrated at the left and thins to the right ` +
    `in every row: coal's share fell in all twelve. The darkest cell is ${named(maxCell.country)} in ` +
    `${maxCell.year} at ${formatCell(maxValue)}%. ${named(stillHighest.country)} is still the darkest row ` +
    `in ${LAST_YEAR} at ${formatCell(at(stillHighest, LAST_YEAR))}%, the only one above half. ` +
    `${opening(named(steepest.country))} fades furthest, from ${formatCell(at(steepest, FIRST_YEAR))}% to ` +
    `${formatCell(at(steepest, LAST_YEAR))}%, and ${spelled[nowUnderTen.length]} of the twelve are ` +
    `now under 10%.`;
  console.log(`title:    ${title}`);
  console.log(`subtitle: ${subtitle}`);
  console.log(`alt:      ${alt}`);

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
    stopAt: join(HERE, "..", ".."),
  });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);

  const { pngPath } = await renderStill({
    element: createElement(CoalShareHeatmap, {
      rows: ordered,
      title,
      subtitle,
      source:
        "Source: Ember, via Our World in Data · annual data to 2024, extracted 9 August 2026",
      alt,
      ground,
      accent,
      unit: "%",
    }),
    width: 900,
    height: 760,
    outDir: HERE,
    name: "static-heatmap-coal-share-europe-still",
  });
  console.log(`rendered -> ${pngPath} — now open it and look at it.`);
}

main();
