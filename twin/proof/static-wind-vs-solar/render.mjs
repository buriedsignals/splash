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

  const LAST_YEAR = String(Math.max(...rows.map((r) => Number(r.Year))));
  const y2024 = rows.filter((r) => r.Year === LAST_YEAR);
  if (y2024.length !== 6) throw new Error(`expected 6 countries for ${LAST_YEAR}, got ${y2024.length}`);

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

  // The whole beat rests on there being exactly ONE country where solar beats wind, and the alt
  // text stated that country's two shares as literals beside the array that computes them. Both
  // the outlier and its figures are now found in the data, and the beat refuses to draw itself if
  // the "only reversal" claim stops holding.
  const reversals = groups.filter((g) => g.solar > g.wind);
  if (reversals.length !== 1)
    throw new Error(`this beat's claim needs exactly one country where solar beats wind, found ${reversals.length}: ${reversals.map((g) => g.name).join(", ")}`);
  const outlier = reversals[0];
  const rest = groups.filter((g) => g !== outlier).map((g) => g.name);
  const restList = `${rest.slice(0, -1).join(", ")} and ${rest[rest.length - 1]}`;
  const alt =
    `Grouped bar chart of wind and solar shares of ${LAST_YEAR} electricity generation for ` +
    `${groups.length} countries. In ${restList}, wind's share is larger than solar's. ` +
    `${outlier.name} is the reverse: solar ${outlier.solar.toFixed(1)}%, wind ${outlier.wind.toFixed(1)}%.`;
  console.log(`alt: ${alt}`);

  const { pngPath } = await renderStill({
    element: createElement(WindVsSolarBar, {
      groups,
      title: `${outlier.name} is the outlier: everywhere else here, wind beats solar`,
      limits: `Share of each country's total electricity generation in ${LAST_YEAR}, from generation by source in terawatt-hours.`,
      source: "Source: Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024 generation, extracted 8 August 2026",
      alt,
      ground: "#FFFFFF",
      calloutSubject: outlier.name,
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
