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

  const biggestMover = [...series].sort((a, b) => b.end - b.start - (a.end - a.start))[0];
  console.log(`biggest riser: ${biggestMover.name} (+${(biggestMover.end - biggestMover.start).toFixed(1)}pp)`);

  const { pngPath } = await renderStill({
    element: createElement(RenewablesShiftSlope, {
      series,
      title: "Germany's renewable electricity share nearly doubled in nine years",
      limits: "Share of each country's own total generation. Norway was already near-total renewable in 2015, so it had almost no room left to climb.",
      source: "Source: Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · extracted 8 August 2026",
      alt: "Slope chart of six countries' renewable share of electricity generation, 2015 versus 2024. Germany rises from 29% to 59%, the steepest climb. Norway stays flat near the top, from 98% to 99%. Poland rises from 14% to 31%, France from 16% to 27%. Sweden and Switzerland both rise a few points, staying in the mid-60s.",
      ground: "#FFFFFF",
      accent: "#0B7A75",
      highlighted: "Germany",
      startLabel: "2015",
      endLabel: "2024",
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
