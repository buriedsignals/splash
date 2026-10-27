// beat.mjs for the worked example proof/static-lollipop-co2-per-person — "La Chine a triplé son CO₂ par personne
// depuis 2000 ; l’Américain moyen n’en émet plus que 1,7 fois plus" — written for the paired gesture kit: the staging
// is the `gestures` list. Every number on the plate is COMPUTED from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, CODE, BEFORE, AFTER, PEOPLE] = [col("entity"), col("code"), col("t_per_person_2000"), col("t_per_person_2023"), col("population_2023")];

// The six largest TOTAL emitters of 2023 (per person × population): a computed rule, not a pick. Countries only.
const countries = data.rows.filter((r) => /^[A-Z]{3}$/.test(String(r[CODE])));
const chosen = countries
  .map((r) => ({ code: r[CODE], name: r[NAME], before: Number(r[BEFORE]), after: Number(r[AFTER]), total: Number(r[AFTER]) * Number(r[PEOPLE]) }))
  .sort((a, b) => b.total - a.total)
  .slice(0, 6);
const FRENCH = { CHN: "Chine", USA: "États-Unis", IND: "Inde", RUS: "Russie", JPN: "Japon", IRN: "Iran", IDN: "Indonésie", SAU: "Arabie saoudite" };
const name = (c) => FRENCH[c.code] ?? c.name;
// One row per country, its two states in series order, sorted by the later state.
const rows = chosen.map((c) => ({ name: name(c), values: [c.before, c.after] })).sort((a, b) => b.values[1] - a.values[1]);
const china = chosen.find((c) => c.code === "CHN");
const usa = chosen.find((c) => c.code === "USA");
const plain = (s) => s.replace(/[  ]/g, " ");
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

export default {
  eyebrow: "Climat · Monde",
  series: ["2000", "2023"],
  rows,
  unit: "t de CO₂ par personne",
  // The staging, in story order: China in the accent; its 2000 length laid against its 2023 stem (it tripled); then
  // China's 2023 length laid against the American's (1,7 times).
  gestures: [
    { do: "highlight", mark: "Chine" },
    { do: "compare", marks: ["Chine · 2023", "Chine · 2000"], note: `a triplé : ${one(china.before)} → ${one(china.after)} t` },
    { do: "compare", marks: ["États-Unis · 2023", "Chine · 2023"], note: `${one(usa.after / china.after)} fois plus que la Chine` },
  ],
  format: one,
  title: [
    "La Chine a triplé son CO₂ par personne depuis 2000 ; l’Américain moyen n’en émet plus que 1,7 fois plus",
    "La Chine a triplé son CO₂ par personne depuis 2000",
  ],
  limits: [
    "Six pays seulement, les plus gros émetteurs en 2023. CO₂ territorial, hors émissions importées. Tonnes par personne ; 2000 en teinte claire, 2023 en plein, chaque tige depuis zéro.",
    "Six pays seulement, les plus gros émetteurs en 2023. CO₂ territorial, hors émissions importées.",
  ],
  source: "Sources : Global Carbon Budget 2025 · population (2023), via Our World in Data",
  alt: (drawn) =>
    `${drawn.length} paires de sucettes, une par pays, mesurant les tonnes de CO₂ par personne en 2000 et en 2023. La Chine passe de ${one(china.before)} à ${one(china.after)} tonnes, les États-Unis de ${one(usa.before)} à ${one(usa.after)}.`,
  check() {
    if (!china || !usa) throw new Error("China and the United States are not both among the six largest emitters");
    const grew = china.after / china.before;
    if (!(grew > 2.5 && grew < 3.5)) throw new Error(`China multiplied by ${grew.toFixed(2)}, not roughly three`);
    if (one(usa.after / china.after) !== "1,7") throw new Error(`the US/China ratio is ${one(usa.after / china.after)}, not 1,7`);
  },
};
