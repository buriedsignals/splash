// twin/proof/more-dumbbell-life-expectancy-gains/render.mjs
//
// Reads the frozen CSV (life expectancy, ten countries, Our World in Data), filters to 2000 and
// 2023 IN CODE, computes each country's gap, verifies every gap is positive, and renders the
// dumbbell. Usage: bun render.mjs

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import {
  renderStill,
  readPalette,
  seriesInks,
} from "#shared/twin-chart-beat/render-still.mjs";
import { DumbbellLifeExpectancyGains } from "./DumbbellLifeExpectancyGains.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const EXPECTED_COUNTRIES = [
  "France",
  "Germany",
  "Italy",
  "Japan",
  "Netherlands",
  "Poland",
  "Spain",
  "Switzerland",
  "United Kingdom",
  "United States",
];

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

  // The OWID grapher CSV endpoint silently returns the ENTIRE global dataset with HTTP 200
  // unless csvType=filtered is on the URL (twin-intake's ourworldindata-csv-filter-trap.md).
  // Verify by eye rather than trust the parameter worked: count the distinct entities.
  const distinctEntities = [...new Set(rows.map((r) => r.Entity))].sort();
  console.log(`distinct entities (${distinctEntities.length}): ${distinctEntities.join(", ")}`);
  const expectedSorted = [...EXPECTED_COUNTRIES].sort();
  if (JSON.stringify(distinctEntities) !== JSON.stringify(expectedSorted)) {
    throw new Error(
      `expected exactly these 10 countries: ${expectedSorted.join(", ")} — got: ${distinctEntities.join(", ")}`,
    );
  }

  // Filtering to 2000 and 2023 happens HERE, in code, not by hand-editing the CSV.
  const filtered = rows.filter((r) => r.Year === "2000" || r.Year === "2023");
  console.log(`${filtered.length} rows after filtering to Year 2000 or 2023 (expect 20)`);
  if (filtered.length !== 20) {
    throw new Error(`expected 20 rows (10 countries x 2 years), got ${filtered.length}`);
  }

  const byCountry = new Map();
  for (const r of filtered) {
    const entry = byCountry.get(r.Entity) ?? {};
    entry[r.Year] = Number(r["Life expectancy"]);
    byCountry.set(r.Entity, entry);
  }

  const dataRows = EXPECTED_COUNTRIES.map((country) => {
    const entry = byCountry.get(country);
    if (!entry || entry["2000"] === undefined || entry["2023"] === undefined) {
      throw new Error(`missing 2000 or 2023 reading for ${country}`);
    }
    const y2000 = entry["2000"];
    const y2023 = entry["2023"];
    const gap = y2023 - y2000;
    return { country, y2000, y2023, gap };
  });

  console.table(
    dataRows.map((r) => ({
      country: r.country,
      "2000": r.y2000,
      "2023": r.y2023,
      gap: r.gap.toFixed(2),
    })),
  );

  // Every one of the 10 countries must genuinely have risen — checked here, not assumed, before
  // any claim gets written that says so.
  const nonPositive = dataRows.filter((r) => r.gap <= 0);
  if (nonPositive.length > 0) {
    throw new Error(
      `expected every country to have gained life expectancy, but these did not: ${nonPositive
        .map((r) => `${r.country} (${r.gap.toFixed(2)})`)
        .join(", ")}`,
    );
  }

  // Sort by gap size, descending — the type's own rule (`references/types/dumbbell.md`) — so the
  // rendered rows put the biggest difference at the top, and this is also the order the claim's
  // "gained the most / gained the least" reads off of.
  const sorted = [...dataRows].sort((a, b) => b.gap - a.gap);
  const most = sorted[0];
  const least = sorted[sorted.length - 1];
  console.log(
    `most gained: ${most.country} (+${most.gap.toFixed(1)} years) — least gained: ${least.country} (+${least.gap.toFixed(1)} years)`,
  );

  const title =
    `Every one of these ten countries added years of life expectancy between 2000 and 2023 — ` +
    `${most.country} gained the most, +${most.gap.toFixed(1)} years; ${least.country} gained the least, +${least.gap.toFixed(1)} years`;

  const alt =
    `Dumbbell chart of life expectancy at birth in 2000 (blue) and 2023 (vermillion) for ten ` +
    `countries, sorted by the size of the gain, largest first. Every country's 2023 dot sits to ` +
    `the right of its 2000 dot. ${most.country} rose from ${most.y2000.toFixed(1)} to ` +
    `${most.y2023.toFixed(1)} years, the largest gain (+${most.gap.toFixed(1)}); ${least.country} ` +
    `rose from ${least.y2000.toFixed(1)} to ${least.y2023.toFixed(1)} years, the smallest gain ` +
    `(+${least.gap.toFixed(1)}).`;

  const palette = readPalette(HERE, { stopAt: join(HERE, "..") });
  const { ground, accent, origin, source: paletteSource } = palette;
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);
  // One ink per year: the recorded accents in the order they were recorded, earlier year first.
  const [startInk, endInk] = seriesInks(palette, 2);
  console.log(`dot inks — 2000 ${startInk}, 2023 ${endInk}`);

  const { pngPath } = await renderStill({
    element: createElement(DumbbellLifeExpectancyGains, {
      rows: sorted,
      title,
      source:
        "Source: UN, World Population Prospects (2024), via Our World in Data · 2000 and 2023, extracted 8 August 2026",
      alt,
      ground,
      startInk,
      endInk,
    }),
    width: 900,
    height: 860,
    outDir: HERE,
    name: "more-dumbbell-life-expectancy-gains-still",
  });
  console.log(`rendered -> ${pngPath}`);
}

main();
