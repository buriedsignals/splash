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

/**
 * RFC 4180 row tokeniser, inlined here rather than imported — no cross-skill runtime import, and
 * a proof/story workspace is not a skill either. A naive comma split corrupts a quoted thousands
 * separator ("1,234.5") or a quoted name carrying its own comma ("Netherlands, the"); this walks
 * the text one character at a time instead. Returns one array of raw field strings per row
 * (header included), quotes stripped, doubled quotes un-escaped, and a lone CR or CRLF closing a
 * row the same way LF does.
 */
function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i += 1; continue;
      }
      field += char; i += 1; continue;
    }
    if (char === '"') { quoted = true; i += 1; continue; }
    if (char === ",") { row.push(field); field = ""; i += 1; continue; }
    if (char === "\r") { row.push(field); rows.push(row); row = []; field = ""; i += (text[i + 1] === "\n") ? 2 : 1; continue; }
    if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; i += 1; continue; }
    field += char; i += 1;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

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
const [header, ...rows] = parseCsvRows(text.trim());
const columns = header;
const codeAt = columns.indexOf("Code");
const yearAt = columns.indexOf("Year");
if (codeAt < 0 || yearAt < 0) throw new Error(`source csv has no Code/Year column: ${header}`);

const kept = [];
const foundCodes = new Set();
for (const row of rows) {
  const cells = row;
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
