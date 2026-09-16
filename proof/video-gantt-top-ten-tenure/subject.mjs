// THE SUBJECT OF `static-gantt-top-ten-tenure`, LOADED AND ASSERTED — who held a place in the world's ten largest CO₂
// emitters each year from 1990 to 2024, each country's runs of consecutive years, and how many of the 1990 ten had never
// left by each year: the static beat's own derivation (`render-directions.mjs` there runs it inline and exports nothing),
// read from its frozen file.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-gantt-top-ten-tenure");
export const FIRST = 1990;
export const LAST = 2024;
export const SLOTS = 10;
export const FRENCH = {
  China: "Chine", "United States": "États-Unis", India: "Inde", Russia: "Russie", Japan: "Japon", Germany: "Allemagne", Canada: "Canada",
  "United Kingdom": "Royaume-Uni", Italy: "Italie", Ukraine: "Ukraine", Kuwait: "Koweït", "South Korea": "Corée du Sud", France: "France",
  Iran: "Iran", "Saudi Arabia": "Arabie saoudite", Indonesia: "Indonésie",
};

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const readings = readFileSync(join(dir, "data.csv"), "utf8")
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((l) => l.split(","))
    .map((c) => ({ entity: c[0], code: c[1], year: Number(c[2]), value: Number(c[3]) }))
    .filter((r) => /^[A-Z]{3}$/.test(r.code) && Number.isFinite(r.value) && r.year >= FIRST && r.year <= LAST);
  const years = [...new Set(readings.map((r) => r.year))].sort((a, b) => a - b);
  if (years.length !== LAST - FIRST + 1) throw new Error(`expected every year from ${FIRST} to ${LAST}, got ${years.length}`);

  const top = new Map(years.map((y) => [y, readings.filter((r) => r.year === y).sort((a, b) => b.value - a.value).slice(0, SLOTS).map((r) => r.entity)]));
  const held = new Map();
  for (const y of years) for (const e of top.get(y)) held.set(e, [...(held.get(e) ?? []), y]);
  const rows = [...held.entries()]
    .map(([entity, ys]) => {
      if (!FRENCH[entity]) throw new Error(`${entity} reached the top ${SLOTS} and has no French name filed`);
      const runs = [];
      let from = ys[0];
      let prev = ys[0];
      for (const y of ys.slice(1)) {
        if (y !== prev + 1) {
          runs.push({ from, to: prev });
          from = y;
        }
        prev = y;
      }
      runs.push({ from, to: prev });
      return { entity, name: FRENCH[entity], runs, years: ys.length, throughout: ys.length === years.length, firstYear: ys[0] };
    })
    .sort((a, b) => a.firstYear - b.firstYear || b.years - a.years);

  // THE CLAIM, ASSERTED — the static beat's counts.
  const throughout = rows.filter((r) => r.throughout);
  if (throughout.length !== 6) throw new Error(`the title says six countries never left; ${throughout.length} did not`);
  if (rows.length !== 16) throw new Error(`sixteen countries held a place at least once; ${rows.length} did`);
  const interrupted = rows.filter((r) => r.runs.length > 1).map((r) => r.entity).sort();
  if (interrupted.join() !== "Italy,South Korea") throw new Error(`Italy and South Korea are the interrupted rows; the data interrupts ${interrupted.join(", ")}`);
  if (throughout.some((r, i) => rows[i] !== r)) throw new Error("the six who never left are the first six rows");

  /** How many of the first year's ten have held every year up to and including `year`. */
  const members = top.get(FIRST);
  const neverLeft = years.map((y) => members.filter((e) => years.filter((yy) => yy <= y).every((yy) => top.get(yy).includes(e))).length);
  if (neverLeft[0] !== SLOTS || neverLeft.at(-1) !== throughout.length) throw new Error(`the count runs from ${SLOTS} to ${throughout.length}; it runs from ${neverLeft[0]} to ${neverLeft.at(-1)}`);
  return { years, rows, throughout: throughout.length, neverLeft };
}
