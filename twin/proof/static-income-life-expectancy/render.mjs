// twin/proof/static-income-life-expectancy/render.mjs
//
// Reads the frozen CSV (165 countries, 2021, life expectancy + GDP per capita), and renders the
// scatter. Usage: bun render.mjs

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/twin-chart-beat/render-still.mjs";
import { IncomeLifeExpectancyScatter } from "./IncomeLifeExpectancyScatter.tsx";

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

  const points = rows.map((r) => ({
    country: r.Entity,
    gdpPerCapita: Number(r["GDP per capita"]),
    lifeExpectancy: Number(r["Life expectancy at birth"]),
  }));
  if (points.length !== 165) throw new Error(`expected 165 countries, got ${points.length}`);

  // Sanity check learned the hard way tonight: 2022 has a Central African Republic reading of
  // 18.8 years, wildly inconsistent with its own neighbouring years (40.3 in 2021, 57.4 in 2023) —
  // a data artefact, not a real one-year collapse. 2021 has no reading below 35 across all 165
  // countries; this beat uses 2021 for exactly that reason.
  const min = Math.min(...points.map((p) => p.lifeExpectancy));
  if (min < 35) throw new Error(`a life expectancy reading under 35 looks like a data artefact, got ${min}`);

  const byGdp = [...points].sort((a, b) => a.gdpPerCapita - b.gdpPerCapita);
  console.log(`lowest GDP: ${byGdp[0].country} $${byGdp[0].gdpPerCapita.toFixed(0)}`);
  console.log(`highest GDP: ${byGdp[byGdp.length - 1].country} $${byGdp[byGdp.length - 1].gdpPerCapita.toFixed(0)}`);

  // The alt text's "$30,000 to $140,000" band and its life-expectancy range were hand-typed — a
  // render audit caught the range wrong ("roughly 76 to 85 years" when the band's own low end,
  // Seychelles at 71.2, sits well below 76). Both the band bounds and the range now come from the
  // same points array the chart plots, not retyped numbers.
  // The title stated the band's low end as its own literal, beside the constant that defines it —
  // move the band and the headline would have kept naming the old figure. Both now read `usd`.
  const HIGH_INCOME_LO = 30000;
  const HIGH_INCOME_HI = 140000;
  const usd = (v) => `$${v.toLocaleString("en-US")}`;
  const highIncome = points.filter(
    (p) => p.gdpPerCapita >= HIGH_INCOME_LO && p.gdpPerCapita <= HIGH_INCOME_HI,
  );
  const highIncomeLifeMin = Math.min(...highIncome.map((p) => p.lifeExpectancy));
  const highIncomeLifeMax = Math.max(...highIncome.map((p) => p.lifeExpectancy));
  console.log(
    `$${HIGH_INCOME_LO}-$${HIGH_INCOME_HI}: ${highIncome.length} countries, life expectancy ${highIncomeLifeMin.toFixed(1)}-${highIncomeLifeMax.toFixed(1)}`,
  );

  const { pngPath } = await renderStill({
    element: createElement(IncomeLifeExpectancyScatter, {
      points,
      title: `Beyond roughly ${usd(HIGH_INCOME_LO)} a person, extra income buys far less extra life expectancy`,
      limits: "165 countries with both measures in 2021. Correlation, not causation — health systems, conflict and disease all move independently of income too.",
      source: "Source: World Bank via Gapminder, UN WPP (2024), via Our World in Data · 2021 data, extracted 8 August 2026",
      alt: `Scatter plot of GDP per capita (log scale) against life expectancy at birth for 165 countries in 2021. Life expectancy rises steeply as income rises from a few hundred to about ten thousand dollars, then the slope flattens: from about ${usd(HIGH_INCOME_LO)} to ${usd(HIGH_INCOME_HI)} a person, life expectancy still varies, but across a narrower band, roughly ${highIncomeLifeMin.toFixed(0)} to ${highIncomeLifeMax.toFixed(0)} years.`,
      ground: "#FFFFFF",
      accent: "#0B7A75",
      highlighted: [],
    }),
    width: 900,
    height: 560,
    outDir: HERE,
    name: "static-income-life-expectancy-still",
  });
  console.log(`rendered -> ${pngPath}`);
}

main();
