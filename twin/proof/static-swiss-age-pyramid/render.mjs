// twin/proof/static-swiss-age-pyramid/render.mjs
//
// Reads the frozen CSV (Switzerland, 2023, population by age band and sex) and renders the
// pyramid. Usage: bun render.mjs

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/twin-chart-beat/render-still.mjs";
import { SwissAgePyramid } from "./SwissAgePyramid.tsx";

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
  if (rows.length !== 21) throw new Error(`expected 21 age bands, got ${rows.length}`);

  const bands = rows.map((r) => ({ ageBand: r.age_band, male: Number(r.male), female: Number(r.female) }));

  // Find the true peak band by total (male + female) — checked by the script, not guessed, so the
  // callout names the band the data actually supports.
  const withTotal = bands.map((b) => ({ ...b, total: b.male + b.female }));
  const peak = withTotal.reduce((a, b) => (b.total > a.total ? b : a));
  console.table(withTotal.map((b) => ({ band: b.ageBand, male: b.male, female: b.female, total: b.total })));
  console.log(`peak band: ${peak.ageBand} (${peak.total.toLocaleString()})`);
  const youngest = withTotal[0];
  console.log(`youngest band (0-4): ${youngest.total.toLocaleString()} — ${youngest.total < peak.total ? "smaller" : "larger"} than the peak`);

  const totalPop = withTotal.reduce((s, b) => s + b.total, 0);
  console.log(`sum of bands: ${totalPop.toLocaleString()}`);

  const { pngPath } = await renderStill({
    element: createElement(SwissAgePyramid, {
      bands,
      title: `Switzerland's population bulges at ages ${peak.ageBand}, not among the youngest`,
      limits: "Age bands run in their natural sequence, oldest at top — sorting by population size would destroy the shape this chart exists to show.",
      source: "Source: UN, World Population Prospects (2024), via Our World in Data · 2023 data, extracted 8 August 2026",
      alt: `Population pyramid of Switzerland by age and sex, 2023. The widest band is ${peak.ageBand} at ${peak.total.toLocaleString()} people, not the youngest band: 0-4 year-olds total ${youngest.total.toLocaleString()}, well under half the peak band's width. Women outnumber men in every band from the mid-60s upward.`,
      ground: "#FFFFFF",
      peakBand: peak.ageBand,
      peakLabel: `${peak.ageBand}: the widest band (${peak.total.toLocaleString()})`,
    }),
    width: 900,
    height: 820,
    outDir: HERE,
    name: "static-swiss-age-pyramid-still",
  });
  console.log(`rendered -> ${pngPath}`);
}

main();
