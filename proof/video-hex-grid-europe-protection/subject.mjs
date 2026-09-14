// THE SUBJECT OF `static-hex-grid-europe-protection`, LOADED AND ASSERTED — the static beat's grid checked both ways and
// its three assertions.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-hex-grid-europe-protection");
export const ORIGIN = "UKR";
export const SUBJECT = "CZE";
/** The static beat's grid, unchanged: odd rows offset by half a cell. */
export const GRID = [
  ".   ISL .   .   NOR SWE FIN .",
  ".   .   IRL DNK .   EST LVA .",
  ".   .   NLD DEU POL LTU UKR .",
  ".   BEL LUX CHE CZE SVK HUN ROU",
  "PRT ESP FRA LIE AUT SVN HRV BGR",
  ".   .   MLT ITA .   GRC CYP .",
];
export const NAMES = { DEU: "Allemagne", CZE: "Tchéquie" };
/** The static beat's rate bornes, per 1 000 inhabitants. */
export const RATE_BREAKS = [5, 12, 18, 25];
/** The count bornes, in people — the video's own, so the count's ramp has as many classes as the rate's. */
export const COUNT_BREAKS = [30000, 60000, 150000, 500000];

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const read = (name) => {
    const lines = readFileSync(join(dir, name), "utf8").trim().split(/\r?\n/);
    const header = lines[0].split(",");
    return lines.slice(1).map((l) => Object.fromEntries(l.split(",").map((v, i) => [header[i], v])));
  };
  const protection = read("protection.csv");
  const people = Object.fromEntries(protection.map((r) => [r.code, Number(r.people)]));
  const inhabitants = Object.fromEntries(read("population.csv").map((r) => [r.code, Number(r.population_2023)]));
  const hosts = protection.map((r) => r.code);
  for (const code of hosts) {
    if (!(people[code] > 0)) throw new Error(`${code} has no usable count`);
    if (!(inhabitants[code] > 0)) throw new Error(`${code} has no population in the frozen file`);
  }
  const rate = (code) => (people[code] / inhabitants[code]) * 1000;
  const cells = [];
  GRID.forEach((row, r) => row.trim().split(/\s+/).forEach((code, c) => code !== "." && cells.push({ code, row: r, col: c })));
  const laidOut = new Set(cells.map((c) => c.code));
  for (const c of cells) if (c.code !== ORIGIN && !hosts.includes(c.code)) throw new Error(`the layout places ${c.code}, which the protection file does not report`);
  for (const code of hosts) if (!laidOut.has(code)) throw new Error(`${code} is reported and has no cell in the layout`);
  if (!laidOut.has(ORIGIN)) throw new Error(`the origin ${ORIGIN} has no cell`);

  const byRate = [...hosts].sort((a, b) => rate(b) - rate(a));
  const byCount = [...hosts].sort((a, b) => people[b] - people[a]);
  if (byRate[0] !== SUBJECT) throw new Error(`the title says ${SUBJECT} leads per inhabitant; ${byRate[0]} does`);
  if (byCount[0] === byRate[0]) throw new Error(`the ranking does not turn over: ${byRate[0]} leads both`);
  const largestRank = byRate.indexOf(byCount[0]) + 1;
  if (!(largestRank > 5)) throw new Error(`the video says the largest host falls a long way per inhabitant; it is ${largestRank}th`);
  const classOf = (v, breaks) => breaks.filter((b) => v >= b).length;
  return {
    cells: cells.map((c) => ({
      ...c,
      origin: c.code === ORIGIN,
      countClass: c.code === ORIGIN ? null : classOf(people[c.code], COUNT_BREAKS),
      rateClass: c.code === ORIGIN ? null : classOf(rate(c.code), RATE_BREAKS),
    })),
    largest: byCount[0],
    largestPeople: people[byCount[0]],
    largestRate: rate(byCount[0]),
    largestRank,
    leader: byRate[0],
    leaderRate: rate(byRate[0]),
    month: protection[0].month,
    hosts: hosts.length,
  };
}
