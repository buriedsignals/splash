// twin/proof/static-germany-electricity-bridge/render.mjs
//
// Reads the frozen CSV (Germany's 2015 and 2024 electricity generation by source, TWh), computes
// the three-step bridge (renewables, nuclear, fossil fuel change), REPLAYS the arithmetic before
// rendering — the waterfall sheet's own rule — and renders. Usage: bun render.mjs

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/twin-chart-beat/render-still.mjs";
import { ElectricityBridgeWaterfall } from "./ElectricityBridgeWaterfall.tsx";

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

function totals(row) {
  const renewables = RENEWABLE_COLUMNS.reduce((sum, c) => sum + Number(row[c]), 0);
  const fossil = FOSSIL_COLUMNS.reduce((sum, c) => sum + Number(row[c]), 0);
  const nuclear = Number(row.Nuclear);
  return { renewables, nuclear, fossil, total: renewables + nuclear + fossil };
}

async function main() {
  const csv = await readFile(join(HERE, "data.csv"), "utf8");
  const rows = parseCsv(csv);
  console.log(`read ${rows.length} rows from data.csv`);
  if (rows.length !== 2) throw new Error(`expected 2 rows (Germany 2015 and 2024), got ${rows.length}`);

  const y2015 = totals(rows.find((r) => r.Year === "2015"));
  const y2024 = totals(rows.find((r) => r.Year === "2024"));

  const steps = [
    { label: "2015 total generation", value: Math.round(y2015.total * 10) / 10, kind: "total" },
    { label: "Renewables", value: Math.round((y2024.renewables - y2015.renewables) * 10) / 10, kind: "increase" },
    { label: "Nuclear", value: Math.round((y2024.nuclear - y2015.nuclear) * 10) / 10, kind: "decrease" },
    { label: "Fossil fuel", value: Math.round((y2024.fossil - y2015.fossil) * 10) / 10, kind: "decrease" },
    { label: "2024 total generation", value: Math.round(y2024.total * 10) / 10, kind: "total" },
  ];
  console.table(steps);

  // Replay the arithmetic: the waterfall sheet's one non-negotiable check. Rounding each step to
  // one decimal (TWh) before summing, so the check matches exactly what the chart draws.
  let running = steps[0].value;
  for (const s of steps.slice(1, -1)) running += s.value;
  running = Math.round(running * 10) / 10;
  const closing = steps[steps.length - 1].value;
  console.log(`opening ${steps[0].value} + steps = ${running}, closing total states ${closing}`);
  if (Math.abs(running - closing) > 0.05) throw new Error(`bridge does not balance: computed ${running}, closing total says ${closing}`);
  console.log("bridge balances exactly.");

  const netChange = closing - steps[0].value;
  console.log(`net change 2015->2024: ${netChange.toFixed(1)} TWh`);

  const { pngPath } = await renderStill({
    element: createElement(ElectricityBridgeWaterfall, {
      steps,
      title: "Germany generated 143 fewer terawatt-hours of electricity in 2024 than in 2015",
      limits: "The nuclear phase-out and a falling fossil share together outweighed the renewables build-out — renewables alone grew, but not enough to offset the other two.",
      source: "Source: Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · extracted 8 August 2026",
      alt: "Waterfall chart of Germany's electricity generation, 2015 to 2024, in terawatt-hours: 639 TWh in 2015, plus 103 TWh from renewables growth, minus 92 TWh from the nuclear phase-out, minus 154 TWh from a falling fossil share, arriving at 496 TWh in 2024 — a net drop of 143 TWh.",
      ground: "#FFFFFF",
    }),
    width: 900,
    height: 560,
    outDir: HERE,
    name: "static-germany-electricity-bridge-still",
  });
  console.log(`rendered -> ${pngPath}`);
}

main();
