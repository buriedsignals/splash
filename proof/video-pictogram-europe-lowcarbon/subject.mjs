// THE SUBJECT OF `static-pictogram-europe-lowcarbon`, LOADED AND ASSERTED — the 40 European countries reporting 2024
// generation (Ukraine has no reading and is not drawn), their low-carbon share computed exactly as the static beat computes
// it, the three blocks cut at 60 and 75 %, every country in one block, the middle under a quarter of the field.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-pictogram-europe-lowcarbon");
export const YEAR = 2024;
export const LOW = 60;
export const HIGH = 75;
/** The static plate's class breaks: a square's fill is its class on one ramp. */
export const BREAKS = [40, 60, 75, 94];
/** One column of the axis per this many points of share; both cuts fall on a column's edge. */
export const STEP = 5;
export const COLUMNS = 100 / STEP;

const CLEAN = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"];

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const lines = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/);
  const header = lines[0].split(",");
  const measured = lines.slice(1).map((line) => {
    const cells = line.split(",");
    const raw = Object.fromEntries(header.map((h, i) => [h, cells[i]]));
    if (Number(raw.year) !== YEAR) throw new Error(`${raw.entity} is not ${YEAR}`);
    const clean = CLEAN.reduce((s, k) => s + Number(raw[k] || 0), 0);
    const total = clean + FOSSIL.reduce((s, k) => s + Number(raw[k] || 0), 0);
    return { code: raw.code, name: raw.entity, share: total > 0 ? (clean / total) * 100 : null };
  });
  const unreported = measured.filter((m) => m.share === null);
  if (unreported.map((m) => m.code).join() !== "UKR") throw new Error(`the static beat leaves out Ukraine alone, the data leaves out ${unreported.map((m) => m.code).join(", ")}`);
  if (LOW % STEP !== 0 || HIGH % STEP !== 0) throw new Error("a cut does not fall on a column's edge");

  const byColumn = Array.from({ length: COLUMNS }, () => []);
  const countries = measured
    .filter((m) => m.share !== null)
    .sort((a, b) => a.share - b.share || a.code.localeCompare(b.code))
    .map((c) => {
      const column = Math.min(COLUMNS - 1, Math.floor(c.share / STEP));
      const row = byColumn[column].length;
      const placed = { ...c, column, row, classIndex: BREAKS.filter((b) => c.share >= b).length, block: c.share >= HIGH ? 2 : c.share >= LOW ? 1 : 0 };
      byColumn[column].push(placed);
      return placed;
    });
  if (countries.length !== 40) throw new Error(`the static beat counts 40 countries, data.csv gives ${countries.length}`);

  const counts = [0, 1, 2].map((b) => countries.filter((c) => c.block === b).length);
  if (counts.reduce((s, n) => s + n, 0) !== countries.length) throw new Error("the three blocks do not account for every country");
  if (counts.join() !== "18,6,16") throw new Error(`the static beat says 18 under ${LOW} %, 6 between and 16 from ${HIGH} %, the data says ${counts.join(", ")}`);
  if (!(counts[1] * 4 < countries.length)) throw new Error(`the headline says only ${counts[1]} in the middle; that is not under a quarter of ${countries.length}`);
  for (const c of countries) if (c.block !== (c.column >= HIGH / STEP ? 2 : c.column >= LOW / STEP ? 1 : 0)) throw new Error(`${c.name}'s column is not in its block`);
  return { countries, counts, tallest: Math.max(...byColumn.map((c) => c.length)), total: countries.length };
}
