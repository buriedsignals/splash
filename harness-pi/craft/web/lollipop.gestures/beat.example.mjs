// beat.mjs for the worked example proof/static-lollipop-co2-per-person — "La Chine a triplé son CO₂ par personne
// depuis 2000 ; l’Américain moyen n’en émet plus que 1,7 fois plus" — written for the paired gesture kit: the staging
// is the `gestures` list. Every number on the page is COMPUTED from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, CODE, BEFORE, AFTER, PEOPLE] = [col("entity"), col("code"), col("t_per_person_2000"), col("t_per_person_2023"), col("population_2023")];

// The six are a computed rule: the largest TOTAL emitters in 2023 (per person × population), sorted by 2023.
const FRENCH = { CHN: "Chine", USA: "États-Unis", IND: "Inde", RUS: "Russie", JPN: "Japon", IRN: "Iran", IDN: "Indonésie", SAU: "Arabie saoudite" };
const six = data.rows
  .filter((r) => /^[A-Z]{3}$/.test(String(r[CODE])) && r[BEFORE] !== null && r[AFTER] !== null)
  .map((r) => ({ name: FRENCH[r[CODE]] ?? r[NAME], values: [Number(r[BEFORE]), Number(r[AFTER])], total: Number(r[AFTER]) * Number(r[PEOPLE]) }))
  .sort((a, b) => b.total - a.total)
  .slice(0, 6)
  .sort((a, b) => b.values[1] - a.values[1]);
const rows = six.map(({ name, values }) => ({ name, values }));
const china = rows.find((r) => r.name === "Chine");
const usa = rows.find((r) => r.name === "États-Unis");

const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/[  ]/g, " ");

export default {
  eyebrow: "Climat · Monde",
  series: ["2000", "2023"],
  rows,
  unit: "t de CO₂ par personne",
  gestures: [
    { do: "highlight", mark: "Chine" },
    { do: "annotate", mark: "Chine", note: `+${one(china.values[1] - china.values[0])} t depuis 2000` },
    { do: "compare", marks: ["Chine · 2023", "Chine · 2000"], note: `${one(china.values[1] / china.values[0])} fois son niveau de 2000` },
    { do: "compare", marks: ["États-Unis · 2023", "Chine · 2023"], note: `${one(usa.values[1] / china.values[1])} fois plus que la Chine` },
  ],
  restLabel: "Les deux années",
  format: one,
  title: "La Chine a triplé son CO₂ par personne depuis 2000 ; l’Américain moyen n’en émet plus que 1,7 fois plus",
  limits: [`Les 6 pays au plus fort total d’émissions en 2023, en tonnes de CO₂ par personne. La teinte claire est 2000, le plein 2023, chaque tige depuis zéro.`],
  source: "Sources : Global Carbon Budget 2025 · population (2023), via Our World in Data",
  alt: `Six paires de sucettes, une par pays, le CO₂ par personne en 2000 et en 2023. La Chine passe de ${one(china.values[0])} à ${one(china.values[1])} t, les États-Unis de ${one(usa.values[0])} à ${one(usa.values[1])} t.`,
  check() {
    if (!china || !usa) throw new Error("China and the United States are not both among the six largest emitters");
    const grew = china.values[1] / china.values[0];
    if (!(grew > 2.5 && grew < 3.5)) throw new Error(`China multiplied by ${grew.toFixed(2)}, not roughly three`);
    if (one(usa.values[1] / china.values[1]) !== "1,7") throw new Error(`the US/China ratio is ${one(usa.values[1] / china.values[1])}, not 1,7`);
  },
};
