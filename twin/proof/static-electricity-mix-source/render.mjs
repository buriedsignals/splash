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

  // The year is a claim like any other, so it is read off the rows rather than retyped, and the
  // file has to agree with itself before anything is drawn.
  const years = [...new Set(rows.map((r) => r.Year))];
  if (years.length !== 1) throw new Error(`expected a single year in data.csv, got ${years.join(", ")}`);
  const YEAR = years[0];

  // Every share the alt and the title state comes off `countries` — the same array the columns are
  // drawn from — including which country leads on renewables and which on fossil fuel. Typed, they
  // would keep their wording after a row changed and the columns moved underneath them.
  const pct = (v) => `${Math.round(v)}%`;
  const mostRenewable = countries[0];
  const mostFossil = [...countries].sort((a, b) => b.fossil - a.fossil)[0];
  const alt =
    // grounded-by-hand: limits:100 — "100%-stacked" names the chart's construction (every column is
    // normalised to its own total), not a reading from data.csv. The shares themselves are all
    // interpolated below.
    `100%-stacked bar chart of ${countries.length} countries' ${YEAR} electricity generation by ` +
    `renewables, nuclear and fossil fuel: ` +
    countries
      .map((c) => `${c.name} ${pct(c.renewables)} renewable, ${pct(c.nuclear)} nuclear, ${pct(c.fossil)} fossil`)
      .join("; ") +
    `. ${mostRenewable.name} has the highest renewable share of the ${countries.length}, ` +
    `${mostFossil.name} the highest fossil share.`;
  console.log(`alt: ${alt}`);

  const { pngPath } = await renderStill({
    element: createElement(ElectricityMixStack, {
      countries,
      title: `${mostRenewable.name} ran its grid on ${pct(mostRenewable.renewables)} renewables in ${YEAR} — ${mostFossil.name} leaned on fossil fuel`,
      // grounded-by-hand: alt:100 — "100% of that country's own generation" states how the columns are
      // normalised; it is the chart's construction, not a value read from data.csv.
      limits: `Each column is 100% of that country's own ${YEAR} electricity generation; totals in TWh differ a lot between them.`,
      source: "Source: Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024 generation, extracted 8 August 2026",
      alt,
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
