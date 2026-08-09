// twin/proof/webx-world-population/render-web.mjs
//
// This beat's own WEB runner. `data.csv` is the frozen OWID export (copied from
// `proof/static-world-population/data.csv`, the already-verified static sibling) — 225 rows, World
// only, 1800-2023; re-verified here (entity, row count, span) rather than trusted on sight.
//
// The skill's own `assets/interaction.mjs` is reused UNCHANGED — an area's continuous x-axis is
// exactly the shape it was built for. Only the `lang` repair this beat's own English words need is
// patched in after `renderWeb` writes the file.
//
// SECOND BUILD: migrated to the genre's FLUID FRAME. `renderWeb` no longer takes a `layouts` array
// (the two-rung design was overturned — see `WorldPopulationWeb.tsx`'s own doc-comment); this
// runner hands it one component and one `frame`.
//
// Usage:  bun proof/webx-world-population/render-web.mjs [outDir] [--data <csv>]

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderWeb } from "../../skills/twin-chart-web/scripts/render-web.mjs";
import { WorldPopulationWeb, FRAME } from "./WorldPopulationWeb.tsx";
// The beat's own formatters, taking their locale from the language the page declares — the same
// ones the component labels every reading with, so the prose and the axis cannot disagree.
import { billions, formatNumber } from "./population-geometry.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

export const BEAT = {
  ground: "#FFFFFF",
  accent: "#0B7A75",
  source:
    "Source: HYDE (2023), Gapminder (2022) & UN World Population Prospects (2024), via Our World in Data · World, 1800–2023, extracted 8 August 2026",
};

const DEFAULT_DATA_PATH = join(HERE, "data.csv");
// And the OUTPUT defaults beside the beat too — where this beat's html is actually committed. It
// used to default to a scratch directory, so running this script the obvious way produced a fresh
// file nobody looks at, printed a path, exited zero, and left the committed one stale.
const DEFAULT_OUT_DIR = HERE;
const OUTPUT_NAME = "world-population.html";

export function readingsFromCsv(csv) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.indexOf("Population");
  if (entityAt < 0 || yearAt < 0 || valueAt < 0)
    throw new Error(`csv has no Entity / Year / Population column, got: ${header}`);

  const records = rows.map((row) => row.split(","));
  const entities = [...new Set(records.map((r) => r[entityAt]))];
  if (entities.length !== 1 || entities[0] !== "World")
    throw new Error(`expected every row's Entity to read "World", got: ${entities.join(", ")}`);

  const readings = records
    .map((r) => ({ year: Number(r[yearAt]), population: Number(r[valueAt]) }))
    .sort((a, b) => a.year - b.year);
  if (readings.length !== 224)
    throw new Error(`expected 224 readings (1800-2023), got ${readings.length}`);
  return readings;
}

export async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const csv = await readFile(dataPath, "utf8");
  const data = readingsFromCsv(csv);

  const first = data[0];
  const last = data[data.length - 1];
  const multiple = last.population / first.population;

  const crossingRow = data.find((d) => d.population >= 1e9);
  if (!crossingRow) throw new Error("population never reaches 1 billion — claim would be false");

  // The headline's own crossing year, found from the data — NOT assumed to be `last.year`. A
  // previous draft of this beat asserted "passed 8 billion in 2023" (the last row's own year)
  // without checking when the series actually first reached 8 billion; the frozen CSV shows that
  // happened in 2022 (8,021,407,196), a full year earlier — caught by a render audit re-checking
  // the claim against this exact file, not by looking at the chart. Computed here so the title can
  // never drift from the CSV again.
  const eightBillionRow = data.find((d) => d.population >= 8e9);
  if (!eightBillionRow) throw new Error("population never reaches 8 billion — claim would be false");

  const title = `World population passed 8 billion in ${eightBillionRow.year}`;
  const limits = `${last.year}: ${billions(last.population, 2)} billion — more than ${formatNumber(multiple)}x its ${first.year} level of about ${billions(first.population, 2)} billion.`;
  const alt = `Filled area chart of world population, ${first.year} to ${last.year}. Population rises from about ${billions(first.population, 2)} billion in ${first.year} to ${billions(last.population, 2)} billion in ${last.year} (the latest year in this data), first crossing 1 billion in ${crossingRow.year} and 8 billion in ${eightBillionRow.year}. Every one of the ${data.length} annual readings has its own exact value on hover, tap or keyboard focus.`;

  const { outPath } = await renderWeb({
    component: WorldPopulationWeb,
    props: {
      data,
      title,
      limits,
      source: BEAT.source,
      alt,
      ground: BEAT.ground,
      accent: BEAT.accent,
      crossing: { year: crossingRow.year, label: `passed 1 billion in ${crossingRow.year}` },
      frame: FRAME,
    },
    outDir,
    name,
  });

  await repair(outPath);

  return { outPath, readings: data.length, crossingYear: crossingRow.year };
}

async function repair(outPath) {
  let html = await readFile(outPath, "utf8");
  html = html.replace('<html lang="fr">', '<html lang="en">');
  await writeFile(outPath, html);
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flag = (name, fallback) => {
    const at = argv.indexOf(name);
    return at >= 0 ? argv[at + 1] : fallback;
  };
  const positional = argv.find((a) => !a.startsWith("--"));
  const dataPath = resolve(flag("--data", DEFAULT_DATA_PATH));
  const outDir = resolve(positional ?? flag("--out", DEFAULT_OUT_DIR));

  const { outPath, readings, crossingYear } = await render({ dataPath, outDir });
  console.log(`web beat → ${outPath}  [${readings} readings, crossed 1B in ${crossingYear}]`);
}
