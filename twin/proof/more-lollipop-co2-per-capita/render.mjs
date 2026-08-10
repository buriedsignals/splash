// twin/proof/more-lollipop-co2-per-capita/render.mjs
//
// Reads the frozen CSV (15 European countries, 2024, CO2 emissions per capita) and renders the
// lollipop. Usage: bun render.mjs

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill, readPalette } from "#shared/twin-chart-beat/render-still.mjs";
import { LollipopCo2 } from "./LollipopCo2.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

const EXPECTED_COUNTRIES = [
  "Austria",
  "Belgium",
  "Denmark",
  "France",
  "Germany",
  "Greece",
  "Italy",
  "Netherlands",
  "Norway",
  "Poland",
  "Portugal",
  "Spain",
  "Sweden",
  "Switzerland",
  "United Kingdom",
];

function parseCsv(text) {
  const [header, ...rows] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  return rows
    .filter((row) => row.length > 0)
    .map((row) => {
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
  // unless `&csvType=filtered` is present — verify the fetch actually filtered, by eye, rather
  // than trusting the URL parameter did what it looked like it did
  // (`twin-intake/references/ourworldindata-csv-filter-trap.md`).
  const distinctCountries = [...new Set(rows.map((r) => r.Entity))].sort();
  console.log(`distinct Entity values (${distinctCountries.length}): ${distinctCountries.join(", ")}`);
  const expectedSorted = [...EXPECTED_COUNTRIES].sort();
  if (JSON.stringify(distinctCountries) !== JSON.stringify(expectedSorted)) {
    throw new Error(
      `expected exactly the 15 requested countries, got ${distinctCountries.length}: ${distinctCountries.join(", ")}`,
    );
  }

  // 2024 is the year every one of these 15 countries actually carries in this dataset — verified
  // per-country below, rather than assumed and silently backfilled with an earlier year for
  // whichever country happened to be missing it.
  const rows2024 = rows.filter((r) => r.Year === "2024");
  console.log(`2024 rows: ${rows2024.length}`);
  const missing2024 = EXPECTED_COUNTRIES.filter(
    (c) => !rows2024.some((r) => r.Entity === c),
  );
  if (missing2024.length > 0) {
    throw new Error(`missing a 2024 reading for: ${missing2024.join(", ")}`);
  }

  const data = rows2024.map((r) => ({
    country: r.Entity,
    value: Number(r["CO₂ emissions per capita"]),
  }));

  // Sanity check every 2024 reading against its own country's nearby years — a number that jumps
  // implausibly against its own recent history is a parsing bug, not a fact about the world.
  for (const d of data) {
    const history = rows
      .filter((r) => r.Entity === d.country && Number(r.Year) >= 2018 && Number(r.Year) <= 2023)
      .map((r) => Number(r["CO₂ emissions per capita"]))
      .sort((a, b) => a - b);
    const nearMin = history[0];
    const nearMax = history[history.length - 1];
    // A generous band: 2024 should not be less than half the recent minimum nor more than double
    // the recent maximum — real per-capita emissions do not move that fast year over year.
    if (d.value < nearMin * 0.5 || d.value > nearMax * 2) {
      throw new Error(
        `${d.country} 2024 value ${d.value} looks implausible against 2018-2023 range ${nearMin}-${nearMax}`,
      );
    }
  }
  console.log("all 15 2024 readings passed the nearby-years sanity check");

  // The actual 2024 ranking, computed here — not assumed — and the sort a lollipop's default
  // reading order asks for (`references/types/lollipop.md`, "What the drawing actually needs").
  const sorted = [...data].sort((a, b) => b.value - a.value);
  console.table(sorted.map((d) => ({ country: d.country, value: d.value.toFixed(4) })));

  const subject = "Switzerland";
  const subjectRank = sorted.findIndex((d) => d.country === subject) + 1;
  const subjectRow = sorted[subjectRank - 1];
  const rankFromBottom = sorted.length - subjectRank + 1;
  const highest = sorted[0];
  console.log(
    `${subject}: rank ${subjectRank} of ${sorted.length} (${rankFromBottom}${ordinalSuffix(rankFromBottom)}-lowest), ${subjectRow.value.toFixed(4)} t`,
  );
  console.log(`highest: ${highest.country}, ${highest.value.toFixed(4)} t`);
  console.log(
    `${subject} is ${(subjectRow.value / highest.value * 100).toFixed(1)}% of ${highest.country}'s value (less than half: ${subjectRow.value < highest.value / 2})`,
  );

  const claim = `Switzerland's 2024 per-capita CO₂ emissions were the ${rankFromBottom}${ordinalSuffix(rankFromBottom)}-lowest of these 15 European countries, at ${subjectRow.value.toFixed(1)} tonnes — less than half of ${highest.country}'s ${highest.value.toFixed(1)} tonnes.`;
  console.log(`claim: ${claim}`);

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
    stopAt: join(HERE, ".."),
  });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);

  const { pngPath } = await renderStill({
    element: createElement(LollipopCo2, {
      rows: sorted,
      title: claim,
      source:
        "Source: Global Carbon Budget 2025, via Our World in Data · 2024 data, extracted 8 August 2026",
      alt: `Lollipop chart ranking 2024 per-capita CO2 emissions across 15 European countries, highest to lowest. ${highest.country} is highest at ${highest.value.toFixed(1)} tonnes per capita. Switzerland, highlighted, is ${rankFromBottom}${ordinalSuffix(rankFromBottom)}-lowest at ${subjectRow.value.toFixed(1)} tonnes.`,
      ground,
      accent,
      subject,
    }),
    width: 900,
    height: 800,
    outDir: HERE,
    name: "more-lollipop-co2-per-capita-still",
  });
  console.log(`rendered -> ${pngPath}`);
}

function ordinalSuffix(n) {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

main();
