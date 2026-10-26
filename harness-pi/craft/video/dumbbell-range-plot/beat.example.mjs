// beat.mjs for the worked example proof/video-dumbbell-life-expectancy-gains — « La Pologne a gagné 5,0 ans d’espérance de
// vie depuis 2000, les États-Unis 2,5 », told in time. Every number the video draws is COMPUTED from data.json; the gains,
// both orders and the largest and smallest gain are worked out by render-beat.mjs from `rows`, and only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR, VALUE] = [at("Entity"), at("Year"), at("Life expectancy")];
const FROM = 2000;
const TO = 2023;
const NAMES = {
  France: "France", Germany: "Allemagne", Italy: "Italie", Japan: "Japon", Netherlands: "Pays-Bas", Poland: "Pologne",
  Spain: "Espagne", Switzerland: "Suisse", "United Kingdom": "Royaume-Uni", "United States": "États-Unis",
};
const valueAt = (entity, year) => Number(data.rows.find((r) => r[ENTITY] === entity && Number(r[YEAR]) === year)?.[VALUE]);

// One row per country, read at the two states. The render computes each gain (to − from) and ranks by it.
const rows = Object.keys(NAMES).map((key) => ({ key, label: NAMES[key], from: valueAt(key, FROM), to: valueAt(key, TO) }));
const ranked = rows.map((r) => ({ ...r, gain: r.to - r.from })).sort((a, b) => b.gain - a.gain);
const most = ranked[0];
const least = ranked.at(-1);
const one = (v) => v.toFixed(1).replace(".", ",");

export default {
  lang: "fr",
  eyebrow: "Santé · Espérance de vie",
  rows,
  // The row the takeaway is about: the largest gain, ringed.
  subject: most.key,
  fromName: String(FROM),
  toName: String(TO),
  // The unit on the axis's last tick.
  unit: "ans",
  // A row's gain as written at the right of its row (row.gain = to − from).
  gainLabel: (row) => `+${one(row.gain)}`,
  // The counter while the dots travel: n rows landed, every one a rise.
  count: (n) => `${n} en hausse`,
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: [
    "La Pologne a gagné 5,0 ans d’espérance de vie depuis 2000, les États-Unis 2,5",
    `Tous les dix ont gagné des années de vie depuis ${FROM}`,
  ],
  source: ["Source : Nations unies, World Population Prospects (2024), via Our World in Data", "Source : ONU, via Our World in Data"],
  evidenceLevels: 2,
  check() {
    const flat = ranked.filter((r) => r.gain <= 0);
    if (flat.length) throw new Error(`the second title says all ten gained; these did not: ${flat.map((r) => r.key).join(", ")}`);
    if (most.key !== "Poland") throw new Error(`the largest gain is ${most.key}'s, not Poland's`);
    if (least.key !== "United States") throw new Error(`the smallest gain is ${least.key}'s, not the United States'`);
    if (one(most.gain) !== "5,0") throw new Error(`Poland gained ${one(most.gain)} years, not 5,0`);
    if (one(least.gain) !== "2,5") throw new Error(`the United States gained ${one(least.gain)} years, not 2,5`);
  },
};
