// twin/proof/more-boxplot-france-co2-decades/render.mjs
//
// Reads the frozen CSV (France, annual per-capita CO2 emissions, Our World in Data) and renders
// the decade box plot. Usage: bun render.mjs

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/twin-chart-beat/render-still.mjs";
import { DecadeBoxplot, summarizeDecade } from "./DecadeBoxplot.tsx";

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
  console.log(`read ${rows.length} raw rows from data.csv (full series, all years)`);

  // The OWID grapher CSV endpoint silently returns the entire global dataset with HTTP 200 unless
  // `csvType=filtered` is on the URL (`twin-intake/references/ourworldindata-csv-filter-trap.md`).
  // The fetch URL already carries it; this is the second, independent check on the data itself.
  const entities = new Set(rows.map((r) => r.Entity));
  if (entities.size !== 1 || !entities.has("France"))
    throw new Error(
      `expected the Entity column to contain only "France", got: ${[...entities].join(", ")}`,
    );

  const readings = rows
    .map((r) => ({ year: Number(r.Year), value: Number(r["CO₂ emissions per capita"]) }))
    .filter((r) => r.year >= 1950);
  console.log(`${readings.length} readings from 1950 onward (France has annual coverage 1950-2024)`);
  if (readings.length !== 75)
    throw new Error(`expected 75 annual readings (1950-2024 inclusive), got ${readings.length}`);

  // Bucket into decades. 2020s is a partial decade (2020-2024, 5 readings) — every other decade
  // is a full 10.
  const byDecade = new Map();
  for (const r of readings) {
    const decade = Math.floor(r.year / 10) * 10;
    const label = `${decade}s`;
    if (!byDecade.has(label)) byDecade.set(label, []);
    byDecade.get(label).push(r.value);
  }
  const decades = [...byDecade.entries()].map(([label, values]) => ({ label, values }));
  console.log(`${decades.length} decades: ${decades.map((d) => `${d.label} (n=${d.values.length})`).join(", ")}`);

  // Sanity check the readings themselves before trusting them: France's per-capita CO2 should
  // climb from under 5 in the 1950s to a peak above 10 around 1973, then decline toward roughly 4
  // by the 2020s.
  const first = readings[0];
  const last = readings[readings.length - 1];
  const peakYear = readings.reduce((a, b) => (b.value > a.value ? b : a));
  console.log(
    `${first.year}: ${first.value.toFixed(2)}  |  peak year ${peakYear.year}: ${peakYear.value.toFixed(2)}  |  ${last.year}: ${last.value.toFixed(2)}`,
  );
  if (first.value >= 5 || peakYear.value <= 10 || last.value >= 5) {
    throw new Error(
      "readings do not match the expected physical shape (starts under 5, peaks above 10, ends near 4) — stop and inspect before drawing",
    );
  }

  // Compute the actual five-number summary per decade — the claim is verified against these
  // numbers, not asserted from memory.
  const summaries = decades.map((d) => summarizeDecade(d.label, d.values));
  console.table(
    summaries.map((s) => ({
      decade: s.label,
      n: s.n,
      q1: s.q1.toFixed(2),
      median: s.median.toFixed(2),
      q3: s.q3.toFixed(2),
      whiskerLo: s.whiskerLo.toFixed(2),
      whiskerHi: s.whiskerHi.toFixed(2),
      outliers: s.outliers.map((v) => v.toFixed(2)).join(", ") || "-",
    })),
  );

  const peakDecade = summaries.reduce((a, b) => (b.median > a.median ? b : a));
  console.log(`peak decade by median: ${peakDecade.label} (${peakDecade.median.toFixed(2)} ${"t CO₂ per capita"})`);

  // Verify the claim is monotonically true from the peak decade onward, on the real computed
  // medians — not assumed.
  const peakIndex = summaries.findIndex((s) => s.label === peakDecade.label);
  for (let i = peakIndex + 1; i < summaries.length; i++) {
    if (summaries[i].median >= summaries[i - 1].median) {
      throw new Error(
        `claim does not hold: ${summaries[i].label} median (${summaries[i].median.toFixed(2)}) is not lower than ${summaries[i - 1].label}'s (${summaries[i - 1].median.toFixed(2)})`,
      );
    }
  }
  console.log("confirmed: median falls in every decade after the peak, through the 2020s");

  const outlierCount = summaries.reduce((sum, s) => sum + s.outliers.length, 0);
  console.log(`${outlierCount} Tukey outlier(s) across all decades`);

  const decadeFrom = summaries[0].label;
  const decadeTo = summaries[summaries.length - 1].label;
  const lastFull = summaries.find((s) => s.n < 10);

  const { pngPath } = await renderStill({
    element: createElement(DecadeBoxplot, {
      decades,
      title: `France's per-capita CO₂ emissions peaked in the ${peakDecade.label} and have fallen in every decade since`,
      source:
        "Source: Global Carbon Budget 2025, via Our World in Data · France, 1950–2024, extracted 8 August 2026",
      alt: `Box plot of France's annual per-capita CO2 emissions by decade, ${decadeFrom} to ${decadeTo}, in tonnes per capita. The median rises from ${summaries[0].median.toFixed(2)} in the ${summaries[0].label} to a peak of ${peakDecade.median.toFixed(2)} in the ${peakDecade.label}, then falls every decade after that to ${summaries[summaries.length - 1].median.toFixed(2)} in the ${summaries[summaries.length - 1].label} (n=${summaries[summaries.length - 1].n}, a partial decade covering 2020-2024 only; every other decade shown is a full n=10). ${outlierCount === 0 ? "No decade produced a Tukey outlier." : summaries.filter((s) => s.outliers.length > 0).map((s) => `${s.label} has ${s.outliers.length} outlier reading${s.outliers.length > 1 ? "s" : ""} beyond the whisker: ${s.outliers.map((v) => v.toFixed(1)).join(", ")}, from the tail end of the prior decade's higher emissions.`).join(" ")}`,
      ground: "#FFFFFF",
      accent: "#0072B2",
    }),
    width: 900,
    height: 560,
    outDir: HERE,
    name: "more-boxplot-france-co2-decades-still",
  });
  console.log(`rendered -> ${pngPath}`);
  if (lastFull) console.log(`partial decade in the data: ${lastFull.label} (n=${lastFull.n})`);
}

main();
