// beat.mjs for the worked example proof/static-lollipop-co2-per-person — "La Chine a triplé son CO₂
// par personne depuis 2000 ; l'Américain moyen n'en émet plus que 1,7 fois plus". Every number on the
// plate is COMPUTED from data.json; render-beat.mjs computes each pair's change.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, CODE, BEFORE, AFTER, PEOPLE] = [col("entity"), col("code"), col("value_2000"), col("value_2023"), col("population_2023")];

// The six are a computed rule, not a pick: the largest TOTAL emitters in 2023 (per person x population).
const all = data.rows.map((r) => ({ code: r[CODE], name: r[NAME], before: Number(r[BEFORE]), after: Number(r[AFTER]), total: (Number(r[AFTER]) * Number(r[PEOPLE])) / 1e9 }));
const worldTotal = all.reduce((s, c) => s + c.total, 0);
const chosen = [...all].sort((a, b) => b.total - a.total).slice(0, 6);
const share = (chosen.reduce((s, c) => s + c.total, 0) / worldTotal) * 100;

const FRENCH = { CHN: "Chine", USA: "États-Unis", IND: "Inde", RUS: "Russie", JPN: "Japon", IRN: "Iran", IDN: "Indonésie", SAU: "Arabie saoudite" };
const pairs = chosen.map((c) => ({ key: c.code, name: FRENCH[c.code] ?? c.name, before: c.before, after: c.after }));
const china = chosen.find((c) => c.code === "CHN");
const usa = chosen.find((c) => c.code === "USA");

const plain = (s) => s.replace(/[   ]/g, " ");
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

export default {
  eyebrow: "Climat · Monde",
  pairs,
  subject: "CHN",
  // The two states, printed under each pair's stems.
  from: 2000,
  to: 2023,
  unit: "tonnes de CO₂ par personne",
  // The selection rule, printed under the plate.
  rule: "Sélection : les 6 pays au plus fort total 2023 — par personne x population.",
  format: one,
  formatChange: (v) => `${v > 0 ? "+" : "−"}${Math.abs(Math.round(v))} %`,
  title: [
    "La Chine a triplé son CO₂ par personne depuis 2000 ; l’Américain moyen n’en émet plus que 1,7 fois plus",
    `Le rapport entre l’Américain et le Chinois moyens est passé de ${one(usa.before / china.before)} à ${one(usa.after / china.after)}`,
    "Le CO₂ par personne des six plus gros émetteurs",
    "Le CO₂ par personne, 2000 et 2023",
  ],
  limits: [
    `Les 6 pays qui émettent le plus de CO₂ — ${one(share)} % du total mondial en 2023. Chaque paire porte le niveau de 2000 en teinte claire et celui de 2023 en plein, chacun mesuré depuis zéro. La Chine passe de ${one(china.before)} à ${one(china.after)} t, les États-Unis de ${one(usa.before)} à ${one(usa.after)}.`,
    `Les 6 pays qui émettent le plus de CO₂ — ${one(share)} % du total mondial. La teinte claire est 2000, le plein 2023, chacun mesuré depuis zéro.`,
    "Les 6 plus gros émetteurs : 2000 en teinte claire, 2023 en plein.",
  ],
  reading: [
    "Lecture : chaque tige part de zéro, donc la hauteur est le niveau et l’écart entre les deux têtes est le changement. Le triangle donne le sens avant le chiffre.",
    "Lecture : chaque tige part de zéro. Le triangle donne le sens avant le chiffre.",
  ],
  source: "Sources : Global Carbon Budget 2025 · population (2023), via Our World in Data",
  alt: `Six paires de sucettes, une par pays, mesurant les tonnes de CO₂ par personne en 2000 (teinte claire) et en 2023 (plein), chaque tige partant de zéro. La Chine monte de ${one(china.before)} à ${one(china.after)} tonnes, les États-Unis descendent de ${one(usa.before)} à ${one(usa.after)} : le rapport entre les deux passe de ${one(usa.before / china.before)} à ${one(usa.after / china.after)}.`,
  evidenceLevels: 4,
  check() {
    if (!china || !usa) throw new Error(`the six largest emitters are ${chosen.map((c) => c.code).join(", ")}: China and the United States are not both among them`);
    const grew = china.after / china.before;
    if (!(grew > 2.5 && grew < 3.5)) throw new Error(`China multiplied by ${grew.toFixed(2)}, not roughly three`);
    if (one(usa.after / china.after) !== "1,7") throw new Error(`the US/China ratio is ${one(usa.after / china.after)}, not 1,7`);
  },
};
