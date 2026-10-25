// beat.mjs for the worked example proof/static-bar-top-emitters-2024 — "China emitted more CO2 in
// 2024 than the next five countries together". Every number on the plate is COMPUTED from
// data.json; nothing is typed in a sentence that the data could contradict.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [COUNTRY, VALUE] = [col("country"), col("value")];

// The marks: one bar per row, sorted from the largest, labelled in the plate's language.
const FRENCH = { China: "Chine", "United States": "États-Unis", India: "Inde", Russia: "Russie", Japan: "Japon" };
const rows = data.rows
  .map((r) => ({ name: FRENCH[r[COUNTRY]] ?? r[COUNTRY], value: r[VALUE] }))
  .sort((a, b) => b.value - a.value);

// The claim: the subject, and the set it beats once added up.
const subject = rows[0];
const comparison = rows.slice(1, 6);
const comparisonSum = comparison.reduce((s, r) => s + r.value, 0);

const fr = (v, digits = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export default {
  eyebrow: "Climat · Monde",
  rows,
  subject: subject.name,
  comparison: comparison.map((r) => r.name),
  comparisonSum,
  comparisonNote: `Les cinq suivants réunis : ${fr(comparisonSum)}`,
  format: (v) => fr(v, v < 1 ? 2 : 1),
  // The headline in forms, longest first: the renderer takes the longest that fits.
  title: [
    `La Chine a émis plus de CO2 en 2024 que les cinq pays suivants réunis`,
    `La Chine en 2024 : plus de CO2 que les cinq suivants réunis`,
  ],
  // The standfirst in forms, longest first; each shorter form drops a whole reading.
  limits: [
    `CO2 territorial annuel, en milliards de tonnes. La Chine émet ${fr(subject.value / rows[1].value)} fois plus que les États-Unis.`,
    `CO2 territorial annuel, en milliards de tonnes.`,
  ],
  source: "Source : Global Carbon Budget 2025, via Our World in Data · données 2024",
  alt: (drawn) =>
    `Colonnes classant ${drawn.length} pays par émissions de CO2 en 2024. La Chine est en tête avec ${fr(subject.value)} milliards de tonnes, davantage que les cinq suivants réunis (${fr(comparisonSum)}).`,
  // Two levels of evidence: the subject, and the set it is compared to.
  evidenceLevels: 2,
  // The claim checked against the data: if the data moved, the render refuses.
  check() {
    if (subject.name !== "Chine") throw new Error(`the leader is ${subject.name}, not China`);
    if (!(subject.value > comparisonSum)) throw new Error(`China ${subject.value} no longer exceeds the next five ${comparisonSum}`);
  },
};
