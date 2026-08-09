// twin/proof/static-electricity-mix-source/render.mjs
//
// Reads the frozen CSV (6 countries, 2024 generation by source, TWh), computes each country's
// renewables/nuclear/fossil share of its own total, and hands the shares to ElectricityMixStack.
// Usage: bun render.mjs

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/twin-chart-beat/render-still.mjs";
import { ElectricityMixStack } from "./ElectricityMixStack.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

const RENEWABLE_COLUMNS = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower"];
const FOSSIL_COLUMNS = ["Gas", "Oil", "Coal"];

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
  if (rows.length !== 6) throw new Error(`expected 6 countries, got ${rows.length}`);

  const countries = rows
    .map((r) => {
      const renewables = RENEWABLE_COLUMNS.reduce((sum, c) => sum + Number(r[c]), 0);
      const fossil = FOSSIL_COLUMNS.reduce((sum, c) => sum + Number(r[c]), 0);
      const nuclear = Number(r.Nuclear);
      const total = renewables + fossil + nuclear;
      return {
        name: r.Entity,
        renewables: (renewables / total) * 100,
        nuclear: (nuclear / total) * 100,
        fossil: (fossil / total) * 100,
      };
    })
    .sort((a, b) => b.renewables - a.renewables);

  console.table(countries.map((c) => ({ country: c.name, renewables: c.renewables.toFixed(1), nuclear: c.nuclear.toFixed(1), fossil: c.fossil.toFixed(1) })));

  const { pngPath } = await renderStill({
    element: createElement(ElectricityMixStack, {
      countries,
      title: "Norway ran its grid on 99% renewables in 2024 — Poland leaned on fossil fuel",
      limits: "Each column is 100% of that country's own 2024 electricity generation; totals in TWh differ a lot between them.",
      source: "Source: Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024 generation, extracted 8 August 2026",
      alt: "100%-stacked bar chart of six countries' 2024 electricity generation by renewables, nuclear and fossil fuel. Norway is 99% renewable. Sweden and Switzerland are roughly two-thirds renewable with the rest split between nuclear and a small fossil share. Germany is 59% renewable and 41% fossil, with no nuclear. Poland is 69% fossil, the highest fossil share of the six.",
      ground: "#FFFFFF",
    }),
    width: 900,
    height: 560,
    outDir: HERE,
    name: "static-electricity-mix-source-still",
  });
  console.log(`rendered -> ${pngPath}`);
}

main();
