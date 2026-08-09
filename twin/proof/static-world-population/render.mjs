// twin/proof/static-world-population/render.mjs
//
// Reads the frozen CSV (world population, 1800-2023) and renders the area beat. Usage: bun render.mjs

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/twin-chart-beat/render-still.mjs";
import { WorldPopulationArea } from "./WorldPopulationArea.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

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
  if (rows.length !== 224) throw new Error(`expected 224 years (1800-2023), got ${rows.length}`);

  const data = rows.map((r) => ({ year: Number(r.Year), population: Number(r.Population) }));
  const first = data[0];
  const last = data[data.length - 1];
  const ratio = last.population / first.population;
  console.log(`${first.year}: ${first.population.toLocaleString()} -> ${last.year}: ${last.population.toLocaleString()} (${ratio.toFixed(2)}x)`);
  if (ratio < 8) throw new Error(`expected at least an 8x increase 1800->2023, got ${ratio.toFixed(2)}x`);

  const crossing = data.find((d) => d.population >= 1e9);
  console.log(`crossed 1 billion in ${crossing.year} (${crossing.population.toLocaleString()})`);

  const { pngPath } = await renderStill({
    element: createElement(WorldPopulationArea, {
      data,
      title: "World population passed 8 billion in 2023 — more than eight times its 1800 level",
      limits: "1800-1949 are HYDE/Gapminder historical estimates, not census counts; 1950 onward is the UN's own recorded and revised series.",
      source: "Source: HYDE (2023), Gapminder (2022) & UN World Population Prospects (2024), via Our World in Data · extracted 8 August 2026",
      alt: "Area chart of world population from 1800 to 2023, rising from about 1 billion to about 8.1 billion, with the growth rate visibly steepening through the 20th century.",
      ground: "#FFFFFF",
      accent: "#0B7A75",
      crossing: { year: crossing.year, population: crossing.population, label: `1 billion (${crossing.year})` },
    }),
    width: 900,
    height: 560,
    outDir: HERE,
    name: "static-world-population-still",
  });
  console.log(`rendered -> ${pngPath}`);
}

main();
