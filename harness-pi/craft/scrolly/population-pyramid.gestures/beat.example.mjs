// beat.mjs for the worked example proof/static-swiss-age-pyramid — « Les femmes passent devant les hommes à partir de
// 60-64 ans » — written for the paired gesture kit (scrolly): men left of the spine, women right, bands youngest at
// the foot, both halves on one scale; one card per gesture. Every number is COMPUTED from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [BAND, MEN, WOMEN] = [col("age_band"), col("male"), col("female")];

// The bands, YOUNGEST FIRST (the foot of the pyramid).
const bands = table.rows.map((r) => ({ name: String(r[BAND]), men: Number(r[MEN]), women: Number(r[WOMEN]) }));
const crossing = bands.findIndex((b) => b.women > b.men);
const after = bands.slice(crossing);
const ahead = bands.filter((b) => b.women > b.men).length;
const older = bands.slice(crossing + 1);
const olderSum = older.reduce((s, b) => s + b.men + b.women, 0);
const ch = (v) => Math.round(v).toLocaleString("fr-FR").replace(/[  ]/g, " ");

export default {
  eyebrow: "Démographie · Suisse",
  series: ["Hommes", "Femmes"],
  rows: bands.map((b) => ({ name: b.name, values: [b.men, b.women] })),
  unit: "personnes par tranche de cinq ans, 2023",
  format: ch,
  gestures: [
    { do: "highlight", mark: "Femmes", card: `Les femmes sont plus nombreuses que les hommes dans ${ahead} des ${bands.length} tranches d’âge.` },
    { do: "name", mark: bands[crossing].name, card: `Elles passent devant ici : ${ch(bands[crossing].women)} femmes contre ${ch(bands[crossing].men)} hommes.` },
    { do: "bracket", marks: older.map((b) => b.name), note: `${ch(olderSum)} au-delà`, card: `Au-delà, ${ch(olderSum)} personnes, et les femmes devant dans chaque tranche.` },
  ],
  title: "Les femmes passent devant les hommes à partir de 60-64 ans",
  limits: "Population résidente suisse en 2023, par tranches de cinq ans. Les tranches suivent leur ordre naturel, la plus jeune en bas.",
  source: "Source : ONU, World Population Prospects (2024), via Our World in Data",
  alt: `Pyramide des âges de la Suisse en 2023, hommes à gauche, femmes à droite ; les femmes sont plus nombreuses à partir de la tranche ${bands[crossing].name}.`,
  check() {
    if (bands[crossing]?.name !== "60-64") throw new Error(`the halves cross at ${bands[crossing]?.name}, not 60-64`);
    const lapse = after.find((b) => !(b.women > b.men));
    if (lapse) throw new Error(`women are not ahead at ${lapse.name}`);
  },
};
