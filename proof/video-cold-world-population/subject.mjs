// THE SUBJECT OF `static-world-population`, LOADED AND ASSERTED — the static beat's claim, re-derived from its frozen rows.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-world-population");
const THRESHOLD = 8e9;

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const csv = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/);
  const header = csv[0].split(",");
  const yearAt = header.indexOf("Year");
  const popAt = header.indexOf("Population");
  const entityAt = header.indexOf("Entity");
  const readings = csv
    .slice(1)
    .map((l) => l.split(","))
    .filter((c) => c[entityAt] === "World")
    .map((c) => ({ year: Number(c[yearAt]), pop: Number(c[popAt]) }))
    .sort((a, b) => a.year - b.year);
  if (readings.length < 2) throw new Error("the frozen series holds fewer than two World readings");
  for (const r of readings) if (!Number.isFinite(r.year) || !(r.pop > 0)) throw new Error(`a reading has no usable year or population: ${JSON.stringify(r)}`);
  for (let i = 1; i < readings.length; i++)
    if (readings[i].year !== readings[i - 1].year + 1) throw new Error(`the series jumps from ${readings[i - 1].year} to ${readings[i].year}; an area drawn over a gap invents the years between`);
  const first = readings[0];
  const last = readings.at(-1);
  const crossedAt = readings.findIndex((r) => r.pop >= THRESHOLD);
  if (crossedAt < 1) throw new Error("the series never passes 8 billion after its first year; the title cannot say it did");
  const crossing = readings[crossedAt];
  if (crossing.year !== 2022) throw new Error(`the title says 8 billion was passed in 2022; the data passes it in ${crossing.year}`);
  const before = readings[crossedAt - 1];
  // The fractional year at which the drawn line (straight between readings) meets 8 billion.
  const crossingYear = before.year + (THRESHOLD - before.pop) / (crossing.pop - before.pop);
  const multiple = last.pop / first.pop;
  if (!(multiple > 8 && multiple < 8.5)) throw new Error(`the video says « more than eight times » the ${first.year} level; the data says ×${multiple.toFixed(2)}`);
  if (!(first.pop < 1e9)) throw new Error(`the ${first.year} level is meant to be under a billion; it is ${first.pop}`);
  return { readings, first, last, crossing, crossingYear, multiple, threshold: THRESHOLD };
}
