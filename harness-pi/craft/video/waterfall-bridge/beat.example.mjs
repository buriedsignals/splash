// beat.mjs for the worked example proof/video-waterfall-germany-electricity-bridge — « L’Allemagne a produit 143 TWh
// d’électricité de moins en 2024 qu’en 2015 », told in time. Every number the video draws is COMPUTED from data.json;
// the running total, the steps and the net change are derived by render-beat.mjs, and check() tests the claim on the
// same data.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const FROM = 2015;
const TO = 2024;
// The groups, in the order the bridge walks them.
const GROUPS = [
  { name: "Renouvelables", columns: ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower"] },
  { name: "Nucléaire", columns: ["Nuclear"] },
  { name: "Fossile", columns: ["Gas", "Oil", "Coal"] },
];
const rowOf = (year) => data.rows.find((r) => Number(r[col("Year")]) === year);
const sum = (row, columns) => columns.reduce((t, c) => t + Number(row[col(c)]), 0);
const members = GROUPS.map((g) => ({ name: g.name, from: sum(rowOf(FROM), g.columns), to: sum(rowOf(TO), g.columns) }));
const net = members.reduce((t, m) => t + m.to - m.from, 0);

const NB = " ";

export default {
  lang: "fr",
  eyebrow: `Énergie${NB}· Allemagne`,
  members,
  states: { from: String(FROM), to: String(TO) },
  unit: "TWh",
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: [`L’Allemagne a produit 143${NB}TWh d’électricité de moins en 2024 qu’en 2015`, `L’Allemagne, 143${NB}TWh d’électricité de moins qu’en 2015`],
  source: ["Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data", "Source : Ember, Energy Institute, via Our World in Data"],
  evidenceLevels: 3,
  check() {
    if (Math.round(-net) !== 143) throw new Error(`the title says 143 TWh fewer; the data says ${(-net).toFixed(1)}`);
  },
};
