// beat.mjs for the worked example proof/video-pictogram-europe-lowcarbon — « L’Europe électrique est aux deux bouts : 6
// pays seulement au milieu », told in time. Every number the video draws is COMPUTED from data.json; each block's count
// is computed by render-beat.mjs from the cuts and handed to check().
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [ENTITY, CODE, YEAR] = [col("entity"), col("code"), col("year")];
const CLEAN = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"];

// One square per country reporting 2024 generation: its low-carbon share of its own production, in %. A country with no
// reading (Ukraine) is left out.
const units = data.rows
  .filter((r) => Number(r[YEAR]) === 2024)
  .map((r) => {
    const clean = CLEAN.reduce((s, k) => s + Number(r[col(k)] || 0), 0);
    const total = clean + FOSSIL.reduce((s, k) => s + Number(r[col(k)] || 0), 0);
    return { key: r[CODE], label: r[ENTITY], value: total > 0 ? (clean / total) * 100 : null };
  })
  .filter((u) => u.value !== null);

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  units,
  // The two thresholds the takeaway is about: the middle block lies between them.
  cuts: [60, 75],
  // The static plate's five shade classes.
  breaks: [40, 60, 75, 94],
  percent: (v) => `${v} %`,
  count: (n) => `${n} pays`,
  axisName: "bas-carbone",
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: ["L’Europe électrique est aux deux bouts : 6 pays seulement au milieu", "Aux deux bouts, 6 pays au milieu"],
  source: [
    "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
    "Source : Ember, Energy Institute, via Our World in Data",
  ],
  evidenceLevels: 5,
  check({ counts, total }) {
    if (counts[1] !== 6) throw new Error(`the title says 6 countries in the middle; ${counts[1]} lie from 60 to 75 %`);
    if (!(counts[1] * 4 < total)) throw new Error(`the title says « only » ${counts[1]} in the middle; that is not under a quarter of ${total}`);
    if (!(counts[0] > counts[1] && counts[2] > counts[1])) throw new Error(`the title says Europe is at the two ends; the blocks are ${counts.join(", ")}`);
  },
};
