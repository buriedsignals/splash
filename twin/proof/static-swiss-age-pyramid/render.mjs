// twin/proof/static-swiss-age-pyramid/render.mjs
//
// Reads the frozen CSV (Switzerland, 2023, population by age band and sex) and renders the
// pyramid. Usage: bun render.mjs

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import {
  renderStill,
  readPalette,
  seriesInks,
} from "#shared/twin-chart-beat/render-still.mjs";
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

  // The reference year was typed into the alt text while the file itself said nothing about which
  // year it holds — nothing could have contradicted it. It is now a column in data.csv (every row
  // is a 2023 reading), read here and stated only from what the file says.
  const years = [...new Set(rows.map((r) => r.year))];
  if (years.length !== 1) throw new Error(`expected every row to carry one reference year, got ${years.join(", ")}`);
  const YEAR = years[0];

  // Find the true peak band by total (male + female) — checked by the script, not guessed, so the
  // callout names the band the data actually supports.
  const withTotal = bands.map((b) => ({ ...b, total: b.male + b.female }));
  const peak = withTotal.reduce((a, b) => (b.total > a.total ? b : a));
  console.table(withTotal.map((b) => ({ band: b.ageBand, male: b.male, female: b.female, total: b.total })));
  console.log(`peak band: ${peak.ageBand} (${peak.total.toLocaleString()})`);
  const youngest = withTotal[0];
  console.log(`youngest band (0-4): ${youngest.total.toLocaleString()} — ${youngest.total < peak.total ? "smaller" : "larger"} than the peak`);
  const youngestSharePct = Math.round((youngest.total / peak.total) * 100);

  const totalPop = withTotal.reduce((s, b) => s + b.total, 0);
  console.log(`sum of bands: ${totalPop.toLocaleString()}`);

  // "Well under half" and "the mid-60s" were both hand-typed — a render audit caught the first as
  // false (0-4 is ~65% of the peak band's width, not under half) and the second as imprecise (the
  // real female>male crossover is the 60-64 band, not the mid-60s). Both are now found by scanning
  // `withTotal` for the youngest band from which every older band has female > male, and by the
  // share percentage computed above, instead of retyped.
  let crossover = withTotal[withTotal.length - 1];
  for (let i = withTotal.length - 1; i >= 0; i--) {
    if (withTotal[i].female <= withTotal[i].male) break;
    crossover = withTotal[i];
  }
  console.log(`female > male from ${crossover.ageBand} upward`);

  const palette = readPalette(HERE, { stopAt: join(HERE, "..") });
  const { ground, accent, origin, source: paletteSource } = palette;
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);
  // One ink per side of the spine, in the order the accents were recorded.
  const [maleInk, femaleInk] = seriesInks(palette, 2);
  console.log(`side inks — male ${maleInk}, female ${femaleInk}`);

  const { pngPath } = await renderStill({
    element: createElement(SwissAgePyramid, {
      bands,
      title: `Switzerland's population bulges at ages ${peak.ageBand}, not among the youngest`,
      limits: "Age bands run in their natural sequence, oldest at top — sorting by population size would destroy the shape this chart exists to show.",
      source: "Source: UN, World Population Prospects (2024), via Our World in Data · 2023 data, extracted 8 August 2026",
      alt: `Population pyramid of Switzerland by age and sex, ${YEAR}. The widest band is ${peak.ageBand} at ${peak.total.toLocaleString()} people, not the youngest band: 0-4 year-olds total ${youngest.total.toLocaleString()}, about ${youngestSharePct}% of the peak band's width. Women outnumber men in every band from ${crossover.ageBand} upward.`,
      ground,
      peakBand: peak.ageBand,
      peakLabel: `${peak.ageBand}: the widest band (${peak.total.toLocaleString()})`,
      maleInk,
      femaleInk,
    }),
    width: 900,
    height: 820,
    outDir: HERE,
    name: "static-swiss-age-pyramid-still",
  });
  console.log(`rendered -> ${pngPath}`);
}

main();
