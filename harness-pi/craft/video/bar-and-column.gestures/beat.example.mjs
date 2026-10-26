// beat.mjs for the worked example proof/video-bar-top-emitters-2024 — « La Chine a émis plus de CO₂ que les cinq pays
// suivants réunis » — written for the gesture kit: the staging is the `gestures` list, three gestures, told in time.
// Every number the video draws is COMPUTED from data.json; nothing is typed in a note that the data could contradict.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [COUNTRY, CODE, VALUE] = [col("country"), col("code"), col("co2_tonnes")];

// Every country of the ranking (OWID aggregates have no ISO-3 code), in billions of tonnes; the largest named in French.
// The frame draws as many as it has room for and states the rest.
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
  eyebrow: "Climat · Monde, 2024",
  rows,
  // The staging, in story order: China in the accent (reveal); the next five bracketed, their sum climbing
  // (subject); their sum laid as a copy against China's own bar (conclusion, the whole chart).
  gestures: [
    { do: "highlight", mark: leader.name },
    { do: "bracket", marks: five.map((r) => r.name), note: `Les cinq suivants réunis : ${fr(fiveSum)}` },
    { do: "compare", marks: [leader.name, ...five.map((r) => r.name)], note: `${fr(leader.value)} contre ${fr(fiveSum)}` },
  ],
  unit: "Gt",
  // The title card: the journalist's takeaway, copied as written.
  title: "La Chine a émis plus de CO₂ que les cinq pays suivants réunis",
  scope: (shown, all) => `Les ${shown} premiers de ${all} pays`,
  source: ["Source : Global Carbon Budget 2025, via Our World in Data"],
  evidenceLevels: 2,
  check() {
    if (leader.name !== "Chine") throw new Error(`the leader is ${leader.name}, not China`);
    if (!(leader.value > fiveSum)) throw new Error(`China ${leader.value} no longer exceeds the next five ${fiveSum}`);
  },
};
