// beat.mjs for the worked example proof/scrolly-swiss-age-pyramid — "Les femmes passent devant les
// hommes à partir de 60-64 ans", as a scrolly. Every number in a card is COMPUTED: the totals, the
// crossing band and the ratios of the oldest bands come from render-beat.mjs as `r` and are only
// WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);

const YEAR = 2023;
// One row per five-year band, youngest first: men on the left (the accent), women on the right.
const bands = data.rows
  .filter((r) => Number(r[at("year")]) === YEAR)
  .map((r) => ({ band: String(r[at("age_band")]), left: Number(r[at("male")]), right: Number(r[at("female")]) }));

const whole = (v) => Math.round(v).toLocaleString("fr-FR");
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default {
  lang: "fr",
  eyebrow: "Démographie · Suisse",
  bands,
  leftName: "Hommes",
  rightName: "Femmes",
  // The names over each half once every band is its difference.
  surplus: { left: "plus d’hommes", right: "plus de femmes" },
  unit: `population résidente, ${YEAR}`,
  format: whole,
  formatRatio: one,
  oldestCount: 3,
  crossingLabel: (r) => `femmes devant dès ${r.crossing.band} ans`,
  cards: {
    left: (r) => `La population résidente suisse en ${YEAR}, par bandes d’âge de cinq ans, la plus jeune en bas. D’abord les hommes : ${whole(r.totalLeft)}.`,
    right: (r) => `Puis les femmes, en miroir : ${whole(r.totalRight)}.`,
    diff: () => `Gardons seulement l’écart dans chaque bande. À gauche, les bandes où les hommes sont plus nombreux ; à droite, celles où ce sont les femmes.`,
    crossing: (r) => `Le basculement se fait à ${r.crossing.band} ans : ${whole(r.crossing.right)} femmes pour ${whole(r.crossing.left)} hommes. Au-dessus, les femmes sont plus nombreuses dans chaque bande.`,
    oldest: (r) => `Chez les plus âgés, l’écart devient un multiple : ${r.oldest.map((o) => `${one(o.ratio)} femmes pour un homme à ${o.band} ans`).join(", ")}.`,
  },
  // The short accent note in the header while each card is read.
  notes: {
    left: (r) => `${whole(r.totalLeft)} hommes`,
    right: (r) => `${whole(r.totalRight)} femmes`,
    diff: () => "femmes moins hommes, par bande",
    crossing: (r) => `femmes devant dès ${r.crossing.band} ans`,
    oldest: (r) => `${r.oldest[r.oldest.length - 1].band} : ${one(r.oldest[r.oldest.length - 1].ratio)} femmes pour un homme`,
  },
  title: ["Les femmes passent devant les hommes à partir de 60-64 ans", "Plus de femmes que d’hommes dès 60-64 ans", "La pyramide des âges suisse"],
  // The last card: how the plate reads.
  limits: "Lecture : chaque barre est une bande de cinq ans, hommes à gauche, femmes à droite, sur la même échelle.",
  source: "Source : ONU, World Population Prospects (2024), via Our World in Data",
  alt: (r) =>
    `Pyramide des âges de la Suisse en ${YEAR}, hommes à gauche, femmes à droite, par bandes de cinq ans. ` +
    `Les hommes sont plus nombreux jusqu’à ${r.below.band} ans, les femmes à partir de ${r.crossing.band} ; à ${r.oldest[r.oldest.length - 1].band} ans, ${one(r.oldest[r.oldest.length - 1].ratio)} femmes pour un homme.`,
  evidenceLevels: 3,
  check(r) {
    if (r.crossing.band !== "60-64") throw new Error(`the title says women pass men from 60-64; the tipping band is ${r.crossing.band}`);
    const ratios = r.oldest.map((o) => o.ratio);
    if (!ratios.every((v, i) => i === 0 || v > ratios[i - 1])) throw new Error(`card 5 says the ratio climbs with age; ${ratios.map((v) => v.toFixed(2)).join(", ")}`);
    if (!(ratios[ratios.length - 1] > 4)) throw new Error(`card 5 says four women for one man at the oldest band; ${ratios[ratios.length - 1].toFixed(2)}`);
  },
};
