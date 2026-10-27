// beat.mjs for the worked example proof/more-dumbbell-life-expectancy-gains — "La Pologne a gagné 5,0 ans
// d’espérance de vie depuis 2000, les États-Unis 2,5" — written for the Position gesture kit: the staging is the
// `gestures` list. Every number on the plate is COMPUTED from data.json; the title's first form is the journalist's
// takeaway, copied as written.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR, VALUE] = [col("Entity"), col("Year"), col("Life expectancy")];
const FROM = 2000;
const TO = 2023;
const FRENCH = {
  France: "France", Germany: "Allemagne", Italy: "Italie", Japan: "Japon", Netherlands: "Pays-Bas", Poland: "Pologne",
  Spain: "Espagne", Switzerland: "Suisse", "United Kingdom": "Royaume-Uni", "United States": "États-Unis",
};
const valueAt = (entity, year) => data.rows.find((r) => r[ENTITY] === entity && r[YEAR] === year)?.[VALUE];

// One row per country, read at the two moments, ranked by the gain (the row order the plate draws).
const rows = Object.keys(FRENCH)
  .map((key) => ({ name: FRENCH[key], from: valueAt(key, FROM), to: valueAt(key, TO) }))
  .sort((a, b) => b.to - b.from - (a.to - a.from));
const most = rows[0];
const least = rows.at(-1);

const plain = (t) => t.replace(/[  ]/g, " ");
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

export default {
  eyebrow: "Santé · Europe et Japon",
  rows,
  moments: [String(FROM), String(TO)],
  // The staging, in story order: Poland in the accent, its gain laid against the United States', the smallest gain named.
  gestures: [
    { do: "highlight", mark: most.name },
    { do: "compare", marks: [most.name, least.name], note: `+${one(most.to - most.from)} ans contre +${one(least.to - least.from)}` },
    { do: "name", mark: least.name, note: `le moins de gain : +${one(least.to - least.from)} ans` },
  ],
  unit: "Espérance de vie à la naissance, en années",
  format: (v) => one(v),
  title: [
    "La Pologne a gagné 5,0 ans d’espérance de vie depuis 2000, les États-Unis 2,5",
    `La Pologne a gagné ${one(most.to - most.from)} ans, les États-Unis ${one(least.to - least.from)}`,
  ],
  limits: [
    `Espérance de vie à la naissance en ${FROM} et en ${TO}, dans dix pays. Les rangs sont classés par le gain, pas par le niveau. Tous ont gagné des années.`,
    `Espérance de vie à la naissance en ${FROM} et en ${TO}, dix pays classés par le gain.`,
  ],
  source: "Source : Our World in Data (UN WPP, HMD), espérance de vie à la naissance · données 2023",
  alt: (drawn) => `Graphique haltère : l’espérance de vie de ${drawn.length} pays en ${FROM} et en ${TO}, une ligne par pays, classées par le gain. La Pologne gagne le plus (+${one(most.to - most.from)} ans), les États-Unis le moins (+${one(least.to - least.from)}).`,
  check() {
    if (most.name !== "Pologne") throw new Error(`the largest gain is ${most.name}'s, not Poland's`);
    if (least.name !== "États-Unis") throw new Error(`the smallest gain is ${least.name}'s, not the United States'`);
    if (one(most.to - most.from) !== "5,0") throw new Error(`Poland gained ${one(most.to - most.from)} years, not 5,0`);
    if (one(least.to - least.from) !== "2,5") throw new Error(`the United States gained ${one(least.to - least.from)} years, not 2,5`);
  },
};
