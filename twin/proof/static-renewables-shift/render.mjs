// twin/proof/static-renewables-shift/render.mjs
//
// Reads the frozen CSV (6 countries, 2015 and 2024 electricity generation by source, TWh),
// computes each country's renewables share of its own total in both years, and hands the pairs to
// RenewablesShiftSlope. Usage: bun render.mjs

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/twin-chart-beat/render-still.mjs";
import { RenewablesShiftSlope } from "./RenewablesShiftSlope.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

const RENEWABLE_COLUMNS = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower"];
const ALL_COLUMNS = [...RENEWABLE_COLUMNS, "Nuclear", "Gas", "Oil", "Coal"];

function parseCsv(text) {
  const [header, ...rows] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  return rows.map((row) => {
    const cells = row.split(",");
    const rec = {};
    cols.forEach((c, i) => (rec[c] = cells[i]));
    return rec;
  });
}

function renewableShare(row) {
  const total = ALL_COLUMNS.reduce((sum, c) => sum + Number(row[c]), 0);
  const renewables = RENEWABLE_COLUMNS.reduce((sum, c) => sum + Number(row[c]), 0);
  return (renewables / total) * 100;
}

async function main() {
  const csv = await readFile(join(HERE, "data.csv"), "utf8");
  const rows = parseCsv(csv);
  console.log(`read ${rows.length} rows from data.csv`);
  if (rows.length !== 12) throw new Error(`expected 12 rows (6 countries x 2 years), got ${rows.length}`);

  const byCountry = new Map();
  for (const r of rows) {
    if (!byCountry.has(r.Entity)) byCountry.set(r.Entity, {});
    byCountry.get(r.Entity)[r.Year] = renewableShare(r);
  }

  const series = [...byCountry.entries()]
    .map(([name, years]) => ({ name, start: years["2015"], end: years["2024"] }))
    .sort((a, b) => b.end - a.end);

  console.table(series.map((s) => ({ country: s.name, "2015": s.start.toFixed(1), "2024": s.end.toFixed(1), "change (pp)": (s.end - s.start).toFixed(1) })));

  const byClimb = [...series].sort((a, b) => b.end - b.start - (a.end - a.start));
  const biggestMover = byClimb[0];
  const flattest = byClimb[byClimb.length - 1];
  console.log(`biggest riser: ${biggestMover.name} (+${(biggestMover.end - biggestMover.start).toFixed(1)}pp)`);
  console.log(`flattest: ${flattest.name} (+${(flattest.end - flattest.start).toFixed(1)}pp)`);

  // Every figure the alt text states is read off `series` — the same array the chart plots. The
  // hand-typed version said Sweden and Switzerland stayed "in the mid-60s"; Sweden ends at 69.4%,
  // so the sentence disagreed with the label drawn beside it. Naming each country's own endpoints
  // makes that impossible: change a row in data.csv and the sentence moves with the chart.
  const START_YEAR = "2015";
  const END_YEAR = "2024";
  const pct = (v) => `${Math.round(v)}%`;
  const rest = series.filter((s) => s !== biggestMover && s !== flattest);
  const alt =
    `Slope chart of ${series.length} countries' renewable share of electricity generation, ` +
    `${START_YEAR} versus ${END_YEAR}. ` +
    `${biggestMover.name} rises from ${pct(biggestMover.start)} to ${pct(biggestMover.end)}, the ` +
    `steepest climb at ${(biggestMover.end - biggestMover.start).toFixed(0)} percentage points. ` +
    `${flattest.name} moves least, from ${pct(flattest.start)} to ${pct(flattest.end)}, already near ` +
    `the top of the scale. The others: ` +
    rest.map((s) => `${s.name} ${pct(s.start)} to ${pct(s.end)}`).join(", ") +
    `.`;
  console.log(`alt: ${alt}`);

  // The title's two remaining words-as-claims, pinned against the data rather than trusted:
  // "nearly doubled" (a ratio just under two) and "nine years" (the span the axis labels state).
  const ratio = biggestMover.end / biggestMover.start;
  console.log(`${biggestMover.name} ${START_YEAR}->${END_YEAR} ratio: ${ratio.toFixed(2)}x`);
  if (ratio < 1.8 || ratio >= 2) throw new Error(`"nearly doubled" needs a ratio in [1.8, 2), got ${ratio.toFixed(2)}`);
  if (Number(END_YEAR) - Number(START_YEAR) !== 9) throw new Error(`"nine years" needs a nine-year span, got ${Number(END_YEAR) - Number(START_YEAR)}`);

  const { pngPath } = await renderStill({
    element: createElement(RenewablesShiftSlope, {
      series,
      title: `${biggestMover.name}'s renewable electricity share nearly doubled in nine years`,
      limits: `Share of each country's own total generation. ${flattest.name} was already near-total renewable in ${START_YEAR}, so it had almost no room left to climb.`,
      source: "Source: Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · extracted 8 August 2026",
      alt,
      ground: "#FFFFFF",
      accent: "#0B7A75",
      highlighted: biggestMover.name,
      startLabel: START_YEAR,
      endLabel: END_YEAR,
      unit: "%",
    }),
    width: 900,
    height: 560,
    outDir: HERE,
    name: "static-renewables-shift-still",
  });
  console.log(`rendered -> ${pngPath}`);
}

main();
