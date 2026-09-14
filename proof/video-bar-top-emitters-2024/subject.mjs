// THE SUBJECT OF `static-bar-top-emitters-2024`, LOADED AND ASSERTED — the ten largest CO₂ emitters of 2024 and the search
// behind the headline, "the next N put together": the static beat's own derivation (`render-directions.mjs` there runs it
// inline and exports nothing), read from its frozen file.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-bar-top-emitters-2024");
export const TOP_N = 10;
const VALUE = "Annual CO₂ emissions";
export const FRENCH = {
  China: "Chine", "United States": "États-Unis", India: "Inde", Russia: "Russie", Japan: "Japon", Indonesia: "Indonésie", Iran: "Iran",
  "Saudi Arabia": "Arabie saoudite", "South Korea": "Corée du Sud", Germany: "Allemagne",
};

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const [headerLine, ...lines] = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/);
  const cols = headerLine.split(",");
  const records = lines.map((row) => {
    if (row.includes('"')) throw new Error(`quoted field in frozen data, parser is too simple: ${row}`);
    const cells = row.split(",");
    if (cells.length !== cols.length) throw new Error(`row has ${cells.length} cells, header has ${cols.length}: ${row}`);
    return Object.fromEntries(cols.map((c, i) => [c, cells[i]]));
  });
  const ranked = records
    .filter((r) => /^[A-Z]{3}$/.test(r.Code))
    .map((r) => ({ country: r.Entity, value: Number(r[VALUE]) / 1e9 }))
    .sort((a, b) => b.value - a.value);
  const top = ranked.slice(0, TOP_N);
  for (const r of top) {
    if (!Number.isFinite(r.value)) throw new Error(`${r.country} has a non-numeric value`);
    if (!FRENCH[r.country]) throw new Error(`${r.country} reached the top ten and has no French name filed`);
  }
  const [first, ...rest] = top;
  let combined = 0;
  let beaten = 0;
  for (const row of rest) {
    if (combined + row.value > first.value) break;
    combined += row.value;
    beaten += 1;
  }
  if (beaten !== 5) throw new Error(`the title says the next five together; the search stops at ${beaten}`);
  return { top: top.map((r) => ({ ...r, name: FRENCH[r.country] })), beaten, combined };
}
