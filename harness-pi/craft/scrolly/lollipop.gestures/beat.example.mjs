// beat.mjs for the worked example proof/static-lollipop-co2-per-person — « La Chine a triplé son CO₂ par personne
// depuis 2000 ; l’Américain moyen n’en émet plus que 1,7 fois plus » — written for the paired gesture kit (scrolly):
// two stems per country from zero, 2000 pale and 2023 full; one card per gesture. Every number is COMPUTED from
// data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, CODE, BEFORE, AFTER, PEOPLE] = [col("entity"), col("code"), col("t_per_person_2000"), col("t_per_person_2023"), col("population_2023")];

// The six are a computed rule: the largest TOTAL emitters in 2023 (per person × population).
const FRENCH = { CHN: "Chine", USA: "États-Unis", IND: "Inde", RUS: "Russie", JPN: "Japon", IRN: "Iran", IDN: "Indonésie", SAU: "Arabie saoudite" };
const chosen = data.rows
  .filter((r) => /^[A-Z]{3}$/.test(r[CODE]))
  .map((r) => ({ code: r[CODE], name: FRENCH[r[CODE]] ?? r[NAME], before: Number(r[BEFORE]), after: Number(r[AFTER]), total: Number(r[AFTER]) * Number(r[PEOPLE]) }))
  .sort((a, b) => b.total - a.total)
  .slice(0, 6)
  .sort((a, b) => b.after - a.after);
const china = chosen.find((c) => c.code === "CHN");
const usa = chosen.find((c) => c.code === "USA");

const plain = (s) => s.replace(/[  ]/g, " ");
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

export default {
  eyebrow: "Climat · Monde",
  // The two values every row carries, in order: the earlier state (pale), the later (full).
  series: ["2000", "2023"],
  rows: chosen.map((c) => ({ name: c.name, values: [c.before, c.after] })),
  unit: "t de CO₂ par personne",
  format: one,
  gestures: [
    { do: "highlight", mark: "Chine", card: `En 2000, un Chinois émettait ${one(china.before)} t de CO₂ ; en 2023, ${one(china.after)} t.` },
    {
      do: "compare",
      marks: ["Chine · 2023", "Chine · 2000"],
      note: `× ${one(china.after / china.before)}`,
      card: `Posée sur sa tige de 2000, celle de 2023 la triple : ${one(china.after)} t contre ${one(china.before)} t.`,
    },
    {
      do: "compare",
      marks: ["États-Unis · 2023", "Chine · 2023"],
      note: `${one(usa.after / china.after)} fois plus`,
      card: `L’Américain moyen émet encore ${one(usa.after)} t, ${one(usa.after / china.after)} fois le Chinois moyen.`,
    },
  ],
  title: [
    "La Chine a triplé son CO₂ par personne depuis 2000 ; l’Américain moyen n’en émet plus que 1,7 fois plus",
    "La Chine a triplé son CO₂ par personne depuis 2000",
  ],
  limits: "Les six pays au plus fort total d’émissions en 2023. CO₂ territorial par personne : les émissions des biens importés comptent là où ils sont produits.",
  source: "Sources : Global Carbon Budget 2025 · population (2023), via Our World in Data",
  alt: `Paires de sucettes, une par pays : le CO₂ par personne en 2000 (pâle) et en 2023 (plein). La Chine passe de ${one(china.before)} à ${one(china.after)} t, les États-Unis de ${one(usa.before)} à ${one(usa.after)} t.`,
  check() {
    if (!china || !usa) throw new Error("China and the United States are not both among the six largest emitters");
    const grew = china.after / china.before;
    if (!(grew > 2.5 && grew < 3.5)) throw new Error(`China multiplied by ${grew.toFixed(2)}, not roughly three`);
    if (one(usa.after / china.after) !== "1,7") throw new Error(`the US/China ratio is ${one(usa.after / china.after)}, not 1,7`);
  },
};
