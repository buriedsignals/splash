// beat.mjs for the worked example proof/static-swiss-age-pyramid — "Les femmes passent devant les hommes à partir de
// 60-64 ans" — for the paired gesture kit. Every number is COMPUTED from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [BAND, MEN, WOMEN] = [col("age_band"), col("male"), col("female")];
// The bands YOUNGEST FIRST (the foot of the pyramid): [left half, right half].
const rows = table.rows.map((r) => ({ name: String(r[BAND]), values: [Number(r[MEN]), Number(r[WOMEN])] }));
const crossing = rows.find((r) => r.values[1] > r.values[0])?.name;
const total = (j) => rows.reduce((s, r) => s + r.values[j], 0);
const plain = (s) => s.replace(/[  ]/g, " ");
const people = (v) => plain(Math.round(v).toLocaleString("fr-FR"));

export default {
  eyebrow: "Démographie · Suisse",
  series: ["Hommes", "Femmes"],
  rows,
  unit: "personnes",
  gestures: [
    { do: "highlight", mark: "Femmes" },
    { do: "annotate", mark: crossing, note: "les femmes passent devant" },
  ],
  format: (v) => (v >= 1000 ? `${Math.round(v / 1000)} k` : people(v)),
  title: ["Les femmes passent devant les hommes à partir de 60-64 ans", `Femmes devant dès ${crossing} ans`],
  limits: [
    `Population résidente suisse en 2023, par bandes de cinq ans : ${people(total(0))} hommes, ${people(total(1))} femmes.`,
    "Population résidente suisse en 2023, par bandes de cinq ans.",
  ],
  source: "Source : ONU, World Population Prospects (2024), via Our World in Data",
  alt: () => `Pyramide des âges de la Suisse en 2023, hommes à gauche, femmes à droite, par bandes de cinq ans ; les femmes sont plus nombreuses à partir de ${crossing} ans.`,
  check() {
    if (crossing !== "60-64") throw new Error(`the halves cross at ${crossing}, not 60-64`);
    const after = rows.slice(rows.findIndex((r) => r.name === crossing));
    const lapse = after.find((r) => !(r.values[1] > r.values[0]));
    if (lapse) throw new Error(`women are not ahead at ${lapse.name}`);
  },
};
