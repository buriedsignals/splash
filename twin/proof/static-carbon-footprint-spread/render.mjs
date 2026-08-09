// twin/proof/static-carbon-footprint-spread/render.mjs
//
// Reads the frozen CSV (213 countries, 2023 CO2 emissions per capita), bins it into 4-tonne-wide
// bins, and renders the histogram. Usage: bun render.mjs

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/twin-chart-beat/render-still.mjs";
import { CarbonFootprintHistogram } from "./CarbonFootprintHistogram.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN_WIDTH = 4;
const BIN_COUNT = 10;

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

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function main() {
  const csv = await readFile(join(HERE, "data.csv"), "utf8");
  const rows = parseCsv(csv);
  console.log(`read ${rows.length} rows from data.csv`);
  if (rows.length !== 213) throw new Error(`expected 213 countries, got ${rows.length}`);

  const values = rows.map((r) => Number(r["CO2 emissions per capita"]));

  const bins = [];
  for (let i = 0; i < BIN_COUNT; i++) {
    const lo = i * BIN_WIDTH;
    const hi = lo + BIN_WIDTH;
    const count = values.filter((v) => (i === BIN_COUNT - 1 ? v >= lo : v >= lo && v < hi)).length;
    bins.push({ lo, hi, count });
  }
  console.table(bins.map((b) => ({ range: `${b.lo}-${b.hi}`, count: b.count })));
  const total = bins.reduce((s, b) => s + b.count, 0);
  if (total !== values.length) throw new Error(`bins account for ${total} countries, expected ${values.length} — a value fell outside the bin range`);

  const med = median(values);
  const under4 = values.filter((v) => v < 4).length;
  console.log(`median: ${med.toFixed(2)} t/capita, ${under4}/${values.length} countries under 4 t/capita (${((under4 / values.length) * 100).toFixed(0)}%)`);
  const max = Math.max(...values);
  console.log(`max: ${max.toFixed(1)} t/capita, ${(max / med).toFixed(1)}x the median`);

  // The tail is not monotonically decreasing (a render audit caught the alt text claiming it was:
  // the 24-28 bin holds 3 countries, more than the 20-24 bin's 2, and the 36-40 bin holds 1 country
  // against two empty bins below it) — so the description names the actual top occupied bin and its
  // country/countries, derived from `bins`/`rows`, instead of asserting a shape the data doesn't have.
  const topBin = [...bins].reverse().find((b) => b.count > 0);
  const topBinCountries = rows
    .filter((r) => Number(r["CO2 emissions per capita"]) >= topBin.lo)
    .map((r) => r.Entity);

  const { pngPath } = await renderStill({
    element: createElement(CarbonFootprintHistogram, {
      bins,
      title: "Six in ten countries emit under 4 tonnes of CO2 per person a year",
      limits: "Per-country distribution for 2023 — each of the 213 countries counts equally here, not weighted by population. A few oil and gas producers sit far out on the right.",
      source: "Source: Global Carbon Budget (2025), via Our World in Data · 2023 data, extracted 8 August 2026",
      alt: `Histogram of CO2 emissions per capita across 213 countries in 2023, in 4-tonne bins from 0 to 40. The distribution is heavily right-skewed: ${bins[0].count} countries sit in the 0-4 tonne bin, more than any other bin; the rest thin out into a long tail, topped by ${topBinCountries.join(" and ")} alone in the ${topBin.lo}-${topBin.hi} tonne bin. A dashed median line sits at ${med.toFixed(1)} tonnes.`,
      ground: "#FFFFFF",
      accent: "#0B7A75",
      median: med,
      medianLabel: `Median: ${med.toFixed(1)} t`,
    }),
    width: 900,
    height: 560,
    outDir: HERE,
    name: "static-carbon-footprint-spread-still",
  });
  console.log(`rendered -> ${pngPath}`);
}

main();
