// beat.mjs for the worked example proof/video-lollipop-co2-per-person — « La Chine a triplé son CO₂ par personne,
// l'écart avec les États-Unis est passé de 7,5 à 1,7 », told in time. Every number the video draws is COMPUTED from
// data.json; the stack (how many copies of China's stem reach the American head) is run by render-beat.mjs and
// checked here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [ENTITY, CODE, BEFORE, AFTER, PEOPLE] = [col("entity"), col("code"), col("t_per_person_2000"), col("t_per_person_2023"), col("population_2023")];

const FROM = 2000;
const TO = 2023;
const HOW_MANY = 6;
const NAMES = {
  CHN: "Chine", USA: "États-Unis", IND: "Inde", RUS: "Russie", JPN: "Japon", IRN: "Iran",
  IDN: "Indonésie", SAU: "Arabie saoudite", DEU: "Allemagne", KOR: "Corée du Sud", BRA: "Brésil",
};

// The six drawn are the largest 2023 TOTALS (per person × population), in that order.
const pairs = data.rows
  .map((r) => ({ key: r[CODE], name: NAMES[r[CODE]] ?? r[ENTITY], before: Number(r[BEFORE]), after: Number(r[AFTER]), total: Number(r[AFTER]) * Number(r[PEOPLE]) }))
  .sort((a, b) => b.total - a.total)
  .slice(0, HOW_MANY);

const china = pairs.find((p) => p.key === "CHN");
const usa = pairs.find((p) => p.key === "USA");
const fr = (v) => v.toFixed(1).replace(".", ",");

export default {
  lang: "fr",
  eyebrow: "Climat\u00A0· Monde",
  pairs,
  subject: "CHN",
  other: "USA",
  from: FROM,
  to: TO,
  unit: "tonnes de CO₂ par personne",
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: [
    "La Chine a triplé son CO₂ par personne, l’écart avec les États-Unis est passé de 7,5 à 1,7",
    "La Chine a triplé son CO₂ par personne depuis 2000",
  ],
  source: [`Source : Global Carbon Budget 2025, population (${TO}), via Our World in Data`, "Source : Global Carbon Budget 2025, via Our World in Data"],
  evidenceLevels: 4,
  check() {
    if (!china || !usa) throw new Error(`the title names China and the United States; the six are ${pairs.map((p) => p.key).join(", ")}`);
    const grew = china.after / china.before;
    if (Math.round(grew) !== 3) throw new Error(`China multiplied its CO₂ per person by ${grew.toFixed(2)} since ${FROM}, not about three`);
    if (fr(usa.before / china.before) !== "7,5") throw new Error(`in ${FROM} an American emitted ${fr(usa.before / china.before)} times a Chinese, not 7,5`);
    if (fr(usa.after / china.after) !== "1,7") throw new Error(`in ${TO} an American emits ${fr(usa.after / china.after)} times a Chinese, not 1,7`);
  },
};
