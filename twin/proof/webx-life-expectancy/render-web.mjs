// twin/proof/webx-life-expectancy/render-web.mjs
//
// This beat's own WEB runner — same shape as `proof/web-co2-ranking/render-web.mjs`: the story's
// own constants, its own CSV reader, its own component, handed to the genre's generic `renderWeb`.
// `data.csv` is the frozen OWID export (copied from `proof/more-line-swiss-life-expectancy/data.csv`,
// the beat's already-verified static sibling) — 148 rows, Switzerland only, 1876-2023; re-verified
// here (entity, row count, span) rather than trusted on sight.
//
// The skill's own `assets/interaction.mjs` is reused UNCHANGED — a line is exactly the shape it was
// built for (one continuous axis, hover/tap/keyboard resolve by nearest x). Only the `lang` repair
// this beat's own words need (English throughout) is patched in after `renderWeb` writes the file.
//
// Usage:  bun proof/webx-life-expectancy/render-web.mjs [outDir] [--data <csv>]

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderWeb } from "../../skills/twin-chart-web/scripts/render-web.mjs";
import { LifeExpectancyWeb, LAYOUTS } from "./LifeExpectancyWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

export const BEAT = {
  subject: "Switzerland",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  source:
    "Source: UN, World Population Prospects (2024), via Our World in Data · Switzerland, 1950–2023, extracted 8 August 2026",
};

const DEFAULT_DATA_PATH = join(HERE, "data.csv");
const DEFAULT_OUT_DIR = "/tmp/webx-life-expectancy";
const OUTPUT_NAME = "life-expectancy.html";

/** Parses the frozen CSV, verifies the entity/row-count/span it expects, and filters to the
 *  1950-2023 span the beat's own claim is about — the same checks
 *  `proof/more-line-swiss-life-expectancy/render.mjs` runs on this exact file. */
export function readingsFromCsv(csv) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.indexOf("Life expectancy");
  if (entityAt < 0 || yearAt < 0 || valueAt < 0)
    throw new Error(`csv has no Entity / Year / Life expectancy column, got: ${header}`);

  const records = rows.map((row) => row.split(","));
  const entities = [...new Set(records.map((r) => r[entityAt]))];
  if (entities.length !== 1 || entities[0] !== "Switzerland")
    throw new Error(`expected every row's Entity to read "Switzerland", got: ${entities.join(", ")}`);

  const readings = records
    .map((r) => ({ year: Number(r[yearAt]), value: Number(r[valueAt]) }))
    .filter((r) => r.year >= 1950)
    .sort((a, b) => a.year - b.year);
  if (readings.length !== 74)
    throw new Error(`expected 74 readings (1950-2023), got ${readings.length}`);
  const first = readings[0];
  const last = readings[readings.length - 1];
  if (first.year !== 1950 || last.year !== 2023)
    throw new Error(`expected span 1950-2023, got ${first.year}-${last.year}`);
  return readings;
}

export async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const csv = await readFile(dataPath, "utf8");
  const readings = readingsFromCsv(csv);

  const first = readings[0];
  const last = readings[readings.length - 1];
  const delta = last.value - first.value;
  const crossing = readings.find((r) => r.value >= 80);
  if (!crossing) throw new Error("readings never reach 80 — claim would be false");

  const title = `Life expectancy in Switzerland rose ${delta.toFixed(1)} years between ${first.year} and ${last.year}`;
  const alt = `Line chart of life expectancy at birth in Switzerland, 1950 to 2023. The line rises from ${first.value.toFixed(1)} years in ${first.year} to ${last.value.toFixed(1)} years in ${last.year}, a gain of ${delta.toFixed(1)} years, first crossing 80 years in ${crossing.year}. Every one of the 74 annual readings, including two real dips around 2020 and 2022, has its own exact value on hover, tap or keyboard focus.`;

  const { outPath } = await renderWeb({
    component: LifeExpectancyWeb,
    layouts: LAYOUTS,
    props: {
      data: readings,
      title,
      source: BEAT.source,
      alt,
      subject: BEAT.subject,
      ground: BEAT.ground,
      accent: BEAT.accent,
      referenceYear: first.year,
      crossingYear: crossing.year,
    },
    outDir,
    name,
  });

  await repair(outPath);

  return { outPath, readings: readings.length, delta, crossingYear: crossing.year };
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

  const { outPath, readings, delta, crossingYear } = await render({ dataPath, outDir });
  console.log(
    `web beat → ${outPath}  [${readings} readings, +${delta.toFixed(1)} years, crossed 80 in ${crossingYear}]`,
  );
}
