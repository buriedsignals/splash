// beat.mjs for the worked example proof/more-dumbbell-life-expectancy-gains — "Poland gained 5.0
// years of life expectancy since 2000, the United States 2.5". Every number on the plate is COMPUTED
// from data.json; the title's first form is the journalist's takeaway, copied as written.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR, VALUE] = [at("Entity"), at("Year"), at("Life expectancy")];

const FROM = 2000;
const TO = 2023;
const NAMES = {
  France: ["France", "la France"], Germany: ["Allemagne", "l’Allemagne"], Italy: ["Italie", "l’Italie"],
  Japan: ["Japon", "le Japon"], Netherlands: ["Pays-Bas", "les Pays-Bas"], Poland: ["Pologne", "la Pologne"],
  Spain: ["Espagne", "l’Espagne"], Switzerland: ["Suisse", "la Suisse"],
  "United Kingdom": ["Royaume-Uni", "le Royaume-Uni"], "United States": ["États-Unis", "les États-Unis"],
};
const valueAt = (entity, year) => data.rows.find((r) => r[ENTITY] === entity && r[YEAR] === year)?.[VALUE];

// One row per entity, read at the two states. The render computes each gain (to - from) and ranks by it.
const rows = Object.keys(NAMES).map((key) => ({ key, label: NAMES[key][0], from: valueAt(key, FROM), to: valueAt(key, TO) }));
const ranked = rows.map((r) => ({ ...r, gain: r.to - r.from })).sort((a, b) => b.gain - a.gain);
const most = ranked[0];
const least = ranked[ranked.length - 1];
const article = (key) => NAMES[key][1];

const plain = (t) => t.replace(/[  ]/g, " ");
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

export default {
  eyebrow: "Santé · Europe et Japon",
  rows,
  subject: most.key,
  // R8 may drop rows at a small frame; the two the headline names are kept.
  keep: [least.key],
  scope: (drawn, all) => `${drawn} des ${all} pays : les ${drawn - 1} plus forts gains et le plus faible.`,
  fromName: String(FROM),
  toName: String(TO),
  unit: "ans",
  format: (v) => plain(v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })),
  gainLabel: (row) => `${row.gain < 0 ? "−" : "+"}${one(Math.abs(row.gain))}`,
  title: [
    "La Pologne a gagné 5,0 ans d’espérance de vie depuis 2000, les États-Unis 2,5",
    `${article(most.key).replace(/^l/, "L")} a gagné ${one(most.gain)} ans, ${article(least.key)} ${one(least.gain)}`,
  ],
  limits: [
    `Espérance de vie à la naissance en ${FROM} et en ${TO}, dans ${rows.length} pays. Tous ont gagné des années : de ${one(least.gain)} pour ${article(least.key)} à ${one(most.gain)} pour ${article(most.key)}. Les rangs sont classés par le gain, pas par le niveau.`,
    `Espérance de vie à la naissance en ${FROM} et en ${TO}, ${rows.length} pays classés par le gain.`,
  ],
  reading: [
    `Lecture : le point pâle est ${FROM}, le point plein ${TO}. La barre entre les deux est le gain, écrit à droite.`,
    `Lecture : point pâle ${FROM}, point plein ${TO}.`,
  ],
  source: "Source : Our World in Data (UN WPP, HMD), espérance de vie à la naissance · données 2023",
  alt: `Graphique haltère : l’espérance de vie de ${rows.length} pays en ${FROM} et en ${TO}, une ligne par pays, classées par le gain. ${article(most.key).replace(/^l/, "L")} gagne le plus (+${one(most.gain)} ans, de ${one(most.from)} à ${one(most.to)}) et ${article(least.key)} le moins (+${one(least.gain)}).`,
  evidenceLevels: 3,
  check() {
    // The standfirst says every one of them gained: the premise is checked, not assumed.
    const flat = ranked.filter((r) => r.gain <= 0);
    if (flat.length) throw new Error(`the standfirst says all gained; these did not: ${flat.map((r) => r.key).join(", ")}`);
    if (most.key !== "Poland") throw new Error(`the largest gain is ${most.key}'s, not Poland's`);
    if (least.key !== "United States") throw new Error(`the smallest gain is ${least.key}'s, not the United States'`);
    if (one(most.gain) !== "5,0") throw new Error(`Poland gained ${one(most.gain)} years, not 5,0`);
    if (one(least.gain) !== "2,5") throw new Error(`the United States gained ${one(least.gain)} years, not 2,5`);
  },
};
