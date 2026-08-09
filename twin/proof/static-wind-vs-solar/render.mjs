// twin/proof/static-wind-vs-solar/render.mjs
//
// This beat's own runner: reads the frozen CSV, computes wind/solar share of each country's 2024
// electricity generation, and hands the numbers to WindVsSolarBar. Usage: bun render.mjs

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/twin-chart-beat/render-still.mjs";
import { WindVsSolarBar } from "./WindVsSolarBar.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

const COLUMNS = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower", "Nuclear", "Gas", "Oil", "Coal"];

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

async function main() {
  const csv = await readFile(join(HERE, "data.csv"), "utf8");
  const rows = parseCsv(csv);
  console.log(`read ${rows.length} rows from data.csv`);

  const y2024 = rows.filter((r) => r.Year === "2024");
  if (y2024.length !== 6) throw new Error(`expected 6 countries for 2024, got ${y2024.length}`);

  const groups = y2024
    .map((r) => {
      const total = COLUMNS.reduce((sum, c) => sum + Number(r[c]), 0);
      return {
        name: r.Entity,
        wind: (Number(r.Wind) / total) * 100,
        solar: (Number(r.Solar) / total) * 100,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  console.table(groups.map((g) => ({ country: g.name, wind: g.wind.toFixed(2), solar: g.solar.toFixed(2) })));

  const { pngPath } = await renderStill({
    element: createElement(WindVsSolarBar, {
      groups,
      title: "Switzerland is the outlier: everywhere else here, wind beats solar",
      limits: "Share of each country's total electricity generation in 2024, from generation by source in terawatt-hours.",
      source: "Source: Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024 generation, extracted 8 August 2026",
      alt: "Grouped bar chart of wind and solar shares of 2024 electricity generation for six countries. In France, Germany, Norway, Poland and Sweden, wind's share is larger than solar's. Switzerland is the reverse: solar 7.2%, wind 0.2%.",
      ground: "#FFFFFF",
      calloutSubject: "Switzerland",
      calloutText: "Solar leads wind here — the only reversal in this group",
    }),
    width: 900,
    height: 560,
    outDir: HERE,
    name: "static-wind-vs-solar-still",
  });
  console.log(`rendered -> ${pngPath}`);
}

main();
