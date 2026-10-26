// beat.mjs for the worked example proof/web-bar-top-emitters-2024 — "China emitted more CO2 in 2024 than the next
// five countries together" — written for the web gesture kit: the staging is the `gestures` list. The gestures that
// rest (highlight, name, annotate, reference, count, reveal, pull-back) are drawn on the page the reader lands on;
// every other gesture becomes one control the reader turns on. Every number on the page is COMPUTED from data.json;
// nothing is typed in a note that the data could contradict.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [COUNTRY, VALUE] = [col("country"), col("value")];

// The marks: one bar per row, sorted from the largest, labelled in the page's language.
const FRENCH = { China: "Chine", "United States": "États-Unis", India: "Inde", Russia: "Russie", Japan: "Japon", Indonesia: "Indonésie" };
const rows = data.rows
  .map((r) => ({ name: FRENCH[r[COUNTRY]] ?? r[COUNTRY], value: r[VALUE] }))
  .sort((a, b) => b.value - a.value);

// The claim: the subject, and the set it beats once added up.
const subject = rows[0];
const five = rows.slice(1, 6);
const fiveSum = five.reduce((s, r) => s + r.value, 0);

const fr = (v, digits = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export default {
  lang: "fr",
  eyebrow: "Climat · Monde",
  rows,
  // The staging, in story order. China in the accent rests on the page; the reader then turns on the next five
  // stacked into one bar with their sum, and that sum laid as a copy against China's own bar.
  gestures: [
    { do: "highlight", mark: subject.name },
    { do: "bracket", marks: five.map((r) => r.name), label: "Les cinq suivants réunis", note: `Les cinq suivants réunis : ${fr(fiveSum)}` },
    { do: "compare", marks: [subject.name, ...five.map((r) => r.name)], label: "La Chine contre les cinq", note: `${fr(subject.value)} contre ${fr(fiveSum)}` },
  ],
  unit: "milliards de tonnes de CO₂, 2024",
  format: (v) => fr(v),
  // The option every control starts on: the page as it lands.
  restLabel: "Le classement seul",
  title: "La Chine a émis plus de CO₂ en 2024 que les cinq pays suivants réunis",
  limits: "CO₂ territorial annuel, en milliards de tonnes. Combustibles fossiles et industrie.",
  source: "Source : Global Carbon Budget 2025, via Our World in Data · données 2024",
  alt: (drawn) =>
    `Barres classant ${drawn.length} pays par émissions de CO₂ en 2024. La Chine est en tête avec ${fr(subject.value)} milliards de tonnes, davantage que les cinq suivants réunis (${fr(fiveSum)}).`,
  // Optional: what a bar answers when it is hovered, tapped or tabbed to, after its name and value.
  detail: (r) => `${fr(r.share)} % du total · rang ${r.rank} sur ${r.count}`,
  // The claim checked against the data: if the data moved, the render refuses.
  check() {
    if (subject.name !== "Chine") throw new Error(`the leader is ${subject.name}, not China`);
    if (!(subject.value > fiveSum)) throw new Error(`China ${subject.value} no longer exceeds the next five ${fiveSum}`);
  },
};
