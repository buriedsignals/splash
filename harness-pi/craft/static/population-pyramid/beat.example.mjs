// beat.mjs for the worked example proof/static-swiss-age-pyramid — "Les femmes passent devant les
// hommes à partir de 60-64 ans". Every number on the plate is COMPUTED from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [BAND, LEFT, RIGHT] = [col("age_band"), col("male"), col("female")];

// The bands, YOUNGEST FIRST (the foot of the pyramid): left half and right half.
const bands = table.rows.map((r) => ({ band: String(r[BAND]), left: Number(r[LEFT]), right: Number(r[RIGHT]) }));

// The crossing: the first band where the right half overtakes the left one.
const crossing = bands.find((b) => b.right > b.left)?.band ?? null;
const totalLeft = bands.reduce((t, b) => t + b.left, 0);
const totalRight = bands.reduce((t, b) => t + b.right, 0);
const ch = (v) => v.toLocaleString("fr-CH");

export default {
  eyebrow: "Démographie · Suisse",
  entity: "Suisse",
  bands,
  leftName: "Hommes",
  rightName: "Femmes",
  crossing,
  // The words drawn on the crossing band, in the story's language.
  crossingLabel: (name, band) => `${name} devant dès ${band}`,
  // How an axis tick is printed: 300000 -> "300k".
  tickFormat: (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v))),
  // The headline in forms, longest first.
  title: [
    "Les femmes passent devant les hommes à partir de 60-64 ans",
    `Les femmes passent devant dès ${crossing} ans`,
    `Femmes devant dès ${crossing} ans`,
  ],
  // The standfirst in forms, longest first.
  limits: [
    `Population résidente suisse en 2023 : ${ch(totalLeft)} hommes, ${ch(totalRight)} femmes. Les bandes d’âge suivent leur ordre naturel, la plus jeune en bas.`,
    `Population résidente suisse en 2023 : ${ch(totalLeft)} hommes, ${ch(totalRight)} femmes.`,
    "Population résidente suisse en 2023, par bandes de cinq ans.",
  ],
  source: "Source : ONU, World Population Prospects (2024), via Our World in Data",
  alt: `Pyramide des âges de la Suisse en 2023, hommes à gauche, femmes à droite, par bandes de cinq ans ; les femmes sont plus nombreuses à partir de ${crossing} ans.`,
  evidenceLevels: 3,
  check() {
    if (crossing !== "60-64") throw new Error(`the halves cross at ${crossing}, not 60-64`);
    const after = bands.slice(bands.findIndex((b) => b.band === crossing));
    const lapse = after.find((b) => !(b.right > b.left));
    if (lapse) throw new Error(`women are not ahead at ${lapse.band} (${lapse.right} against ${lapse.left})`);
  },
};
