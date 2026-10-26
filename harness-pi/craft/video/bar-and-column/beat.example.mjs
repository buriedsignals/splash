// beat.mjs for the worked example proof/video-bar-top-emitters-2024 — « La Chine a émis plus de CO₂ que les cinq pays
// suivants réunis », told in time. Every number the video draws is COMPUTED from data.json; the search behind the
// headline (how many after the leader stay under it) is run by render-beat.mjs and checked here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [COUNTRY, CODE, VALUE] = [col("country"), col("code"), col("co2_tonnes")];

// Every country of the ranking (OWID aggregates have no ISO-3 code); the ten drawn are named in French.
const FRENCH = {
  China: "Chine", "United States": "États-Unis", India: "Inde", Russia: "Russie", Japan: "Japon", Indonesia: "Indonésie", Iran: "Iran",
  "Saudi Arabia": "Arabie saoudite", "South Korea": "Corée du Sud", Germany: "Allemagne",
};
const rows = data.rows
  .filter((r) => /^[A-Z]{3}$/.test(r[CODE]))
  .map((r) => ({ name: FRENCH[r[COUNTRY]] ?? r[COUNTRY], value: Number(r[VALUE]) / 1e9 }))
  .sort((a, b) => b.value - a.value);
// The whole the ranking is cut from: the video opens on it as one bar.
const world = Number(data.rows.find((r) => r[CODE] === "OWID_WRL")[VALUE]) / 1e9;

// The claim: the leader, and how many after it stay under it once added up.
const [leader, ...rest] = rows;
let sum = 0;
let beaten = 0;
for (const r of rest) {
  if (sum + r.value > leader.value) break;
  sum += r.value;
  beaten += 1;
}

export default {
  lang: "fr",
  eyebrow: "Climat · Monde, 2024",
  rows,
  drawCount: 10,
  subject: leader.name,
  whole: world,
  wholeName: "Monde",
  unit: "Gt",
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: [
    "La Chine a émis plus de CO₂ que les cinq pays suivants réunis",
    "La Chine, plus que les cinq suivants réunis",
  ],
  source: ["Source : Global Carbon Budget 2025, via Our World in Data", "Source : Global Carbon Budget 2025"],
  evidenceLevels: 2,
  check() {
    if (leader.name !== "Chine") throw new Error(`the leader is ${leader.name}, not China`);
    if (beaten !== 5) throw new Error(`the title says the next five together; the search stops at ${beaten}`);
  },
};
