// THE SUBJECT OF `static-beeswarm-co2-per-person`, LOADED AND ASSERTED — 213 countries' CO₂ per person in 2023 and their
// population; the static beat's own checks (its `render-directions.mjs` runs them inline and exports nothing): the six
// countries above 20 t hold under 1 % of humanity, the population-weighted world average sits above what more than 60 %
// of people emit, and the largest circle sits below the country median.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-beeswarm-co2-per-person");
export const HIGH = 20;
export const HOW_MANY_HIGH = 6;
export const NAMED = { IND: "Inde", CHN: "Chine" };

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const csv = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/);
  const header = csv[0].split(",");
  const at = (name) => header.indexOf(name);
  const countries = csv.slice(1).map((l) => {
    const c = l.split(",");
    return { code: c[at("code")], entity: c[at("entity")], tonnes: Number(c[at("co2_t_per_person")]), people: Number(c[at("population")]) };
  });
  for (const c of countries)
    if (!c.code || !Number.isFinite(c.tonnes) || !Number.isFinite(c.people) || !(c.people > 0)) throw new Error(`a country has no usable reading: ${JSON.stringify(c)}`);

  const world = countries.reduce((s, c) => s + c.people, 0);
  const mean = countries.reduce((s, c) => s + c.tonnes * c.people, 0) / world;
  const high = countries.filter((c) => c.tonnes > HIGH);
  const highPeople = high.reduce((s, c) => s + c.people, 0);
  const share = (highPeople / world) * 100;
  const belowMean = (countries.filter((c) => c.tonnes <= mean).reduce((s, c) => s + c.people, 0) / world) * 100;
  const ranked = [...countries].sort((a, b) => a.tonnes - b.tonnes);
  const median = ranked[Math.floor(ranked.length / 2)].tonnes;
  const biggest = countries.reduce((a, b) => (b.people > a.people ? b : a));

  if (high.length !== HOW_MANY_HIGH) throw new Error(`the title says ${HOW_MANY_HIGH} countries are above ${HIGH} t; ${high.length} are`);
  if (!(share < 1)) throw new Error(`the title says the countries over ${HIGH} t hold under 1 % of humanity; they hold ${share.toFixed(2)} %`);
  if (!(belowMean > 60)) throw new Error(`the world average should sit above what most people emit; it sits above ${belowMean.toFixed(1)} %`);
  if (!(biggest.tonnes < median)) throw new Error(`the largest circle should sit below the median country; ${biggest.entity} is at ${biggest.tonnes.toFixed(1)} against ${median.toFixed(1)}`);
  for (const code of Object.keys(NAMED)) if (!countries.some((c) => c.code === code)) throw new Error(`${code} is named and missing from the frozen data`);

  return { countries, world, mean, high: high.map((c) => c.code), highPeople, share, belowMean, median, biggest: biggest.code };
}
