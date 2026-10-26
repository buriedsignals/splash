// beat.mjs for the worked example proof/scrolly-bar-top-emitters-2024 — « La Chine a émis plus de CO₂ en 2024 que les
// cinq pays suivants réunis » — written for the gesture kit: the staging is the `gestures` list, one card per
// gesture, each carrying its card's prose. Every number on the page is COMPUTED from data.json; nothing is typed in a
// card or a note that the data could contradict.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [COUNTRY, CODE, VALUE] = [col("Entity"), col("Code"), col("Annual CO₂ emissions")];

// Every country of the ranking (OWID aggregates have no ISO-3 code), in billions of tonnes; the largest named in
// French. The page draws as many as it has room for and states the rest.
const FRENCH = {
  China: "Chine", "United States": "États-Unis", India: "Inde", Russia: "Russie", Japan: "Japon", Indonesia: "Indonésie", Iran: "Iran",
  "Saudi Arabia": "Arabie saoudite", "South Korea": "Corée du Sud", Germany: "Allemagne",
};
const rows = data.rows
  .filter((r) => /^[A-Z]{3}$/.test(r[CODE]))
  .map((r) => ({ name: FRENCH[r[COUNTRY]] ?? r[COUNTRY], value: Number(r[VALUE]) / 1e9 }))
  .sort((a, b) => b.value - a.value);

// The claim: the leader, and the five after it, added up.
const [leader, ...rest] = rows;
const five = rest.slice(0, 5);
const fiveSum = five.reduce((s, r) => s + r.value, 0);
const fr = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default {
  lang: "fr",
  eyebrow: "Climat · Monde",
  rows,
  // The staging, in story order, one card each: China in the accent; the next five bracketed, their sum climbing;
  // their sum laid as a copy inside China's own bar.
  gestures: [
    {
      do: "highlight",
      mark: leader.name,
      card: `En 2024, la Chine a émis ${fr(leader.value)} milliards de tonnes de CO₂ : la plus longue barre du classement.`,
    },
    {
      do: "bracket",
      marks: five.map((r) => r.name),
      note: `Les cinq suivants réunis : ${fr(fiveSum)}`,
      card: `Les États-Unis, l’Inde, la Russie, le Japon et l’Indonésie réunis : ${fr(fiveSum)} milliards de tonnes.`,
    },
    {
      do: "compare",
      marks: [leader.name, ...five.map((r) => r.name)],
      note: `${fr(leader.value)} contre ${fr(fiveSum)}`,
      card: `Posés dans la barre de la Chine, ces ${fr(fiveSum)} milliards de tonnes restent en deçà de ses ${fr(leader.value)}.`,
    },
  ],
  unit: "milliards de tonnes de CO₂, 2024",
  format: (v) => fr(v),
  title: [
    "La Chine a émis plus de CO₂ en 2024 que les cinq pays suivants réunis",
    "La Chine, plus que les cinq suivants réunis",
  ],
  scope: (shown, all) => `Les ${shown} premiers de ${all} pays`,
  // The closing card: the accounting the ranking rests on.
  limits:
    "Lecture : CO₂ territorial, combustibles fossiles et industrie. Les émissions contenues dans les biens importés sont comptées là où les biens sont produits.",
  source: "Source : Global Carbon Budget 2025, via Our World in Data · données 2024",
  alt: (drawn) =>
    `Barres classant ${drawn.length} pays par émissions de CO₂ en 2024. La Chine est en tête avec ${fr(leader.value)} milliards de tonnes, davantage que les cinq suivants réunis (${fr(fiveSum)}).`,
  evidenceLevels: 2,
  check() {
    if (leader.name !== "Chine") throw new Error(`the leader is ${leader.name}, not China`);
    if (!(leader.value > fiveSum)) throw new Error(`China ${leader.value} no longer exceeds the next five ${fiveSum}`);
  },
};
