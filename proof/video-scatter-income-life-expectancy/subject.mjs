// THE SUBJECT OF `static-income-life-expectancy`, LOADED AND ASSERTED — 165 countries' GDP per capita and life expectancy
// in 2021; the static beat's own checks (its render scripts run them inline and export nothing): 165 countries with both
// measures, no reading under 35 years (a data artefact), and the spread each side of the declared break at 30 000 $ — the
// band above it narrower by a ratio the title rounds to 3.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-income-life-expectancy");
export const BREAK = 30000;
export const HOW_MANY = 165;
export const TIMES = 3;

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const csv = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/);
  const header = csv[0].split(",");
  const at = (name) => header.indexOf(name);
  const countries = csv
    .slice(1)
    .map((l) => l.split(","))
    .map((c) => ({ code: c[at("Code")], entity: c[at("Entity")], age: Number(c[at("Life expectancy at birth")]), income: Number(c[at("GDP per capita")]) }))
    .filter((c) => /^[A-Z]{3}$/.test(c.code) && Number.isFinite(c.age) && Number.isFinite(c.income) && c.income > 0);

  if (countries.length !== HOW_MANY) throw new Error(`expected ${HOW_MANY} countries with both measures, got ${countries.length}`);
  const min = Math.min(...countries.map((c) => c.age));
  if (min < 35) throw new Error(`a life expectancy reading under 35 looks like a data artefact, got ${min}`);

  const side = (keep) => {
    const ages = countries.filter(keep).map((c) => c.age);
    const lo = Math.min(...ages);
    const hi = Math.max(...ages);
    return { count: ages.length, lo, hi, range: hi - lo };
  };
  const below = side((c) => c.income < BREAK);
  const above = side((c) => c.income >= BREAK);
  const ratio = below.range / above.range;
  if (!(Math.abs(ratio - TIMES) < 0.15)) throw new Error(`the title says the band above ${BREAK} is ${TIMES} times narrower; it is ${ratio.toFixed(2)} times`);

  return { countries, below, above, ratio };
}
