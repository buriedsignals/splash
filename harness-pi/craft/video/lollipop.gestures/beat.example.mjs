// beat.mjs for the worked example proof/static-lollipop-co2-per-person, as a PAIRED gesture video — "La Chine a triplé
// son CO₂ par personne depuis 2000 ; l’Américain moyen n’en émet plus que 1,7 fois plus". Three gestures, in story
// order: they fill the video's reveal, subject and conclusion. Every number is COMPUTED from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [CODE, BEFORE, AFTER, PEOPLE] = [col("code"), col("t_per_person_2000"), col("t_per_person_2023"), col("population_2023")];

// The six largest TOTAL emitters of 2023 (per person × population), countries only (a three-letter code).
const FRENCH = { CHN: "Chine", USA: "États-Unis", IND: "Inde", RUS: "Russie", JPN: "Japon", IRN: "Iran", IDN: "Indonésie", SAU: "Arabie saoudite" };
const six = data.rows
  .filter((r) => /^[A-Z]{3}$/.test(String(r[CODE])) && Number.isFinite(r[AFTER]) && Number.isFinite(r[PEOPLE]))
  .sort((a, b) => b[AFTER] * b[PEOPLE] - a[AFTER] * a[PEOPLE])
  .slice(0, 6);
// One row per country: its two values, in the order `series` names them.
const rows = six.map((r) => ({ name: FRENCH[r[CODE]] ?? r[CODE], values: [r[BEFORE], r[AFTER]] }));
const china = rows.find((r) => r.name === "Chine");
const usa = rows.find((r) => r.name === "États-Unis");
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default {
  eyebrow: "Climat · Monde",
  series: ["2000", "2023"],
  rows,
  unit: "t de CO₂ par personne",
  gestures: [
    { do: "highlight", mark: "Chine" },
    { do: "compare", marks: ["Chine · 2023", "Chine · 2000"], note: `×${one(china.values[1] / china.values[0])} depuis 2000` },
    { do: "compare", marks: ["États-Unis · 2023", "Chine · 2023"], note: `${one(usa.values[1] / china.values[1])} fois le Chinois moyen en 2023` },
  ],
  title: "La Chine a triplé son CO₂ par personne depuis 2000 ; l’Américain moyen n’en émet plus que 1,7 fois plus",
  source: ["Sources : Global Carbon Budget 2025 · population (2023), via Our World in Data", "Global Carbon Budget 2025, via OWID"],
  check() {
    if (!china || !usa) throw new Error("China and the United States are not both among the six largest emitters");
    const grew = china.values[1] / china.values[0];
    if (!(grew > 2.5 && grew < 3.5)) throw new Error(`China multiplied by ${grew.toFixed(2)}, not roughly three`);
    if (one(usa.values[1] / china.values[1]) !== "1,7") throw new Error(`the US/China ratio is ${one(usa.values[1] / china.values[1])}, not 1,7`);
  },
};
