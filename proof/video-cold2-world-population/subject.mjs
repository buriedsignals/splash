// THE SUBJECT OF `static-world-population`, READ FROM ITS FROZEN DATA — and, once `assertClaim` is written, ASSERTED: every number
// the title and the gestures state is derived from the rows here, never typed.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { join } from "node:path";

export const STATIC_DIR = join(import.meta.dir, "../static-world-population");
export const DATA_FILE = join(STATIC_DIR, "data.csv");

/** The frozen rows as read: a CSV's rows as objects of strings (no quoted commas), a JSON file parsed. */
export function readRows(path = DATA_FILE) {
  const text = readFileSync(path, "utf8");
  if (!/\.csv$/i.test(path)) return JSON.parse(text);
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const names = header.split(",");
  return lines.map((line) => Object.fromEntries(line.split(",").map((value, i) => [names[i], value])));
}

export function loadSubject() {
  const rows = readRows().filter((r) => r.Entity === "World");
  const readings = rows.map((r) => ({ year: Number(r.Year), pop: Number(r.Population) }));
  if (readings.length < 2) throw new Error("the World series has fewer than two readings");
  readings.forEach((r, i) => {
    if (!(Number.isInteger(r.year) && r.pop > 0)) throw new Error(`reading ${i} is not a year and a population: ${JSON.stringify(rows[i])}`);
    if (i && r.year !== readings[i - 1].year + 1) throw new Error(`the years are not consecutive at ${r.year}: an area would close over the gap`);
  });
  const first = readings[0];
  const last = readings.at(-1);
  const crossing = readings.find((r) => r.pop >= 8e9);
  if (!crossing) throw new Error("the series never reaches 8 billion");
  return { readings, first, last, crossing, times: Math.floor(last.pop / first.pop) };
}

/** The claim, measured: 8 billion first reached in 2022, the last level more than eight times 1800's and under nine. */
export function assertClaim({ first, last, crossing, times }) {
  if (first.year !== 1800) throw new Error(`the series starts in ${first.year}, not 1800`);
  if (crossing.year !== 2022) throw new Error(`8 billion is first reached in ${crossing.year}, not 2022`);
  if (times !== 8) throw new Error(`the last level is ${(last.pop / first.pop).toFixed(2)} times 1800's, not between 8 and 9`);
  if (!(8 * first.pop < last.pop)) throw new Error("eight 1800 levels would not stack under the curve's end");
}
