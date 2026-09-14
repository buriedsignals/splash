// THE SUBJECT OF `static-wind-vs-solar`, LOADED AND ASSERTED — wind's and solar's shares of six countries' own electricity
// in 2024, ordered by the gap between them: the static beat's own derivation (`render-directions.mjs` there runs it inline
// and exports nothing), read from its frozen file.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-wind-vs-solar");
export const YEAR = 2024;
export const SUBJECT = "Suisse";
const FR = { France: "France", Germany: "Allemagne", Norway: "Norvège", Poland: "Pologne", Sweden: "Suède", Switzerland: "Suisse" };
const SOURCES = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower", "Nuclear", "Gas", "Oil", "Coal"];

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const rows = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/);
  const head = rows[0].split(",");
  const at = (cells, name) => {
    const v = Number(cells[head.indexOf(name)]);
    if (!Number.isFinite(v)) throw new Error(`${cells[0]} has no ${name} reading`);
    return v;
  };
  const groups = rows
    .slice(1)
    .map((l) => l.split(","))
    .filter((c) => FR[c[0]] && Number(c[head.indexOf("Year")]) === YEAR)
    .map((c) => {
      const total = SOURCES.reduce((t, name) => t + at(c, name), 0);
      return { name: FR[c[0]], wind: (at(c, "Wind") / total) * 100, solar: (at(c, "Solar") / total) * 100 };
    })
    // The static plate's own order: the gap between the two, wind's lead first.
    .sort((a, b) => b.wind - b.solar - (a.wind - a.solar));
  if (groups.length !== 6) throw new Error(`six countries in ${YEAR}; the file gives ${groups.length}`);
  const reversals = groups.filter((g) => g.solar > g.wind);
  if (reversals.length !== 1 || reversals[0].name !== SUBJECT) throw new Error(`the title says ${SUBJECT} is the one exception; solar leads in ${reversals.map((g) => g.name).join(", ") || "none"}`);
  return { groups, lead: groups.length - reversals.length };
}
