// One-off, run-once generator: reads the REAL frozen OWID source csv this project already ships
// (`proof/static-carbon-footprint-spread/data.csv` — "Global Carbon Budget 2025, via Our World in
// Data") and writes this beat's own frozen csv, filtered to Year 2023 and this beat's declared
// 41-country study set. Never hand-typed: every number below comes out of the source file, not a
// keyboard.
//
// Kosovo is excluded from the study set entirely (not joined, not aliased) — a beat's study set is
// its own declared claim, and leaving a contested code out of the declaration is honest in a way
// that joining it through an alias table is not.
//
// Usage: bun proof/mapgen-choropleth-video/build-data.mjs

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(HERE, "../static-carbon-footprint-spread/data.csv");
const OUT = join(HERE, "co2-per-capita-2023.csv");

const STUDY = [
  "ALB", "AND", "AUT", "BEL", "BGR", "BIH", "BLR", "CHE", "CZE", "DEU",
  "DNK", "ESP", "EST", "FIN", "FRA", "FRO", "GBR", "GRC", "HRV", "HUN",
  "IRL", "ISL", "ITA", "LIE", "LTU", "LUX", "LVA", "MDA", "MKD", "MLT",
  "MNE", "NLD", "NOR", "POL", "PRT", "ROU", "SRB", "SVK", "SVN", "SWE",
  "UKR",
];

const text = await readFile(SOURCE, "utf8");
const [header, ...rows] = text.trim().split(/\r?\n/);
const columns = header.split(",");
const codeAt = columns.indexOf("Code");
const yearAt = columns.indexOf("Year");
if (codeAt < 0 || yearAt < 0) throw new Error(`source csv has no Code/Year column: ${header}`);

const kept = [];
const foundCodes = new Set();
for (const row of rows) {
  const cells = row.split(",");
  if (Number(cells[yearAt]) !== 2023) continue;
  if (!STUDY.includes(cells[codeAt])) continue;
  kept.push(row);
  foundCodes.add(cells[codeAt]);
}

const missing = STUDY.filter((code) => !foundCodes.has(code));
if (missing.length > 0)
  throw new Error(`${missing.length} declared codes found no 2023 row in the source: ${missing.join(", ")}`);
if (kept.length !== STUDY.length)
  throw new Error(`expected exactly ${STUDY.length} rows, got ${kept.length}`);

await writeFile(OUT, [header, ...kept].join("\n") + "\n");
console.log(`wrote ${OUT}\n${kept.length} rows, all ${STUDY.length} declared codes found, 0 missing.`);
