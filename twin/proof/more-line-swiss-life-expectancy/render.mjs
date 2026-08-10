// twin/proof/more-line-swiss-life-expectancy/render.mjs
//
// Reads the frozen CSV (Switzerland, life expectancy at birth, full history as fetched from Our
// World in Data) and renders the 1950-2023 line. Usage: bun render.mjs

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill, readPalette } from "#shared/twin-chart-beat/render-still.mjs";
import { LifeExpectancyLine } from "./LifeExpectancyLine.tsx";

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
  console.log(`fetched: ${rows.length} rows from data.csv`);

  // The OWID grapher CSV endpoint silently returns the entire global dataset unless
  // `csvType=filtered` is on the URL (`twin-intake/references/ourworldindata-csv-filter-trap.md`)
  // — checked here, not assumed, by looking at the actual distinct values the fetch returned.
  const entities = [...new Set(rows.map((r) => r.Entity))];
  if (entities.length !== 1 || entities[0] !== "Switzerland") {
    throw new Error(
      `expected every row's Entity to read "Switzerland" and nothing else, got: ${entities.join(", ")}`,
    );
  }
  console.log(`entity check: every row is "${entities[0]}"`);

  // Filtered here, in the script, on the fetched CSV — not by hand-editing data.csv, which stays
  // the full fetch.
  const readings = rows
    .map((r) => ({ year: Number(r.Year), value: Number(r["Life expectancy"]) }))
    .filter((r) => r.year >= 1950)
    .sort((a, b) => a.year - b.year);
  console.log(`filtered to year >= 1950: ${readings.length} readings`);
  if (readings.length !== 74)
    throw new Error(`expected 74 readings (1950-2023), got ${readings.length}`);

  const first = readings[0];
  const last = readings[readings.length - 1];
  if (first.year !== 1950 || last.year !== 2023)
    throw new Error(`expected span 1950-2023, got ${first.year}-${last.year}`);

  const delta = last.value - first.value;
  console.log(
    `${first.year}: ${first.value} ${last.year > first.year ? "->" : ""} ${last.year}: ${last.value} (delta ${delta.toFixed(1)} years)`,
  );

  // Sanity check the two COVID-era dips the brief expects — real data, not excluded, but worth
  // printing so a defect would be visible in the console rather than silent in the render.
  const byYear = new Map(readings.map((r) => [r.year, r.value]));
  for (const dipYear of [2020, 2022]) {
    const before = byYear.get(dipYear - 1);
    const at = byYear.get(dipYear);
    console.log(
      `dip check ${dipYear}: ${before} -> ${at} (${at < before ? "dip" : "no dip"})`,
    );
  }

  // The year life expectancy first reaches 80, found by the script, not asserted from memory.
  const crossing = readings.find((r) => r.value >= 80);
  if (!crossing) throw new Error("readings never reach 80 — claim would be false");
  console.log(`first year >= 80: ${crossing.year} (${crossing.value})`);

  const claim = `Life expectancy in Switzerland rose by ${delta.toFixed(1)} years between ${first.year} and ${last.year}, from ${first.value.toFixed(1)} to ${last.value.toFixed(1)}, crossing 80 in ${crossing.year}.`;
  console.log(`claim: ${claim}`);

  const endLabel = `Switzerland ${last.value.toFixed(1)} (${last.year})`;

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
    stopAt: join(HERE, ".."),
  });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);

  const { pngPath } = await renderStill({
    element: createElement(LifeExpectancyLine, {
      readings,
      title: claim,
      source:
        "Source: UN, World Population Prospects (2024), via Our World in Data · Switzerland, 1950–2023, extracted 8 August 2026",
      alt: `Line chart of life expectancy at birth in Switzerland, 1950 to 2023. The line rises from ${first.value.toFixed(1)} years in ${first.year} to ${last.value.toFixed(1)} years in ${last.year}, a gain of ${delta.toFixed(1)} years, first crossing 80 years in ${crossing.year}. Two small real dips interrupt the climb around 2020 and 2022, the COVID-19 era.`,
      ground,
      accent,
      endLabel,
    }),
    width: 900,
    height: 560,
    outDir: HERE,
    name: "more-line-swiss-life-expectancy-still",
  });
  console.log(`rendered -> ${pngPath}`);
}

main();
