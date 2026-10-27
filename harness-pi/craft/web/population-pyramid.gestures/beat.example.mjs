// beat.mjs for the worked example proof/static-swiss-age-pyramid — "Les femmes passent devant les hommes à partir de
// 60-64 ans" — written for the paired gesture kit. series[0] is the left half, series[1] the right; rows go YOUNGEST
// FIRST (the foot of the pyramid) and keep that order.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [BAND, LEFT, RIGHT] = [col("age_band"), col("male"), col("female")];
const rows = table.rows.map((r) => ({ name: String(r[BAND]), values: [Number(r[LEFT]), Number(r[RIGHT])] }));
const crossing = rows.find((r) => r.values[1] > r.values[0])?.name;
const old = rows.slice(rows.findIndex((r) => r.name === "65-69"));
const oldSum = old.reduce((s, r) => s + r.values[0] + r.values[1], 0);
const ch = (v) => Math.round(v).toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ");

export default {
  eyebrow: "Démographie · Suisse",
  series: ["Hommes", "Femmes"],
  rows,
  unit: "personnes",
  gestures: [
    { do: "highlight", mark: "Femmes" },
    { do: "annotate", mark: crossing, note: "les femmes passent devant" },
    { do: "bracket", marks: old.map((r) => r.name), note: `${ch(oldSum)} personnes` },
    { do: "compare", marks: ["80-84 · Femmes", "80-84 · Hommes"], note: `${ch(rows.find((r) => r.name === "80-84").values[1])} contre ${ch(rows.find((r) => r.name === "80-84").values[0])}` },
  ],
  restLabel: "La pyramide",
  format: ch,
  title: "Les femmes passent devant les hommes à partir de 60-64 ans",
  limits: "Population résidente suisse en 2023, par bandes de cinq ans, la plus jeune en bas.",
  source: "Source : ONU, World Population Prospects (2024), via Our World in Data",
  alt: `Pyramide des âges de la Suisse en 2023, hommes à gauche, femmes à droite ; les femmes sont plus nombreuses à partir de ${crossing} ans.`,
  check() {
    if (crossing !== "60-64") throw new Error(`the halves cross at ${crossing}, not 60-64`);
    const lapse = rows.slice(rows.findIndex((r) => r.name === crossing)).find((r) => !(r.values[1] > r.values[0]));
    if (lapse) throw new Error(`women are not ahead at ${lapse.name}`);
  },
};
