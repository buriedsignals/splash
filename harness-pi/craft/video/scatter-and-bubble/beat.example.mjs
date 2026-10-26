// beat.mjs for the worked example proof/video-scatter-income-life-expectancy — « Au-delà de 30 000 $ par personne,
// l’espérance de vie tient dans une bande 3 fois plus étroite », told in time. Every number the video draws is COMPUTED:
// the points from data.json, the two spans, the counts and the copies by render-beat.mjs (the labels below only word the
// numbers they are handed). check() tests the claim on the same data.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [CODE, NAME, Y, X] = [col("Code"), col("Entity"), col("Life expectancy at birth"), col("GDP per capita")];

// One point per country with both measures (aggregates have no three-letter code).
const points = data.rows
  .map((r) => ({ label: r[NAME], code: r[CODE], x: Number(r[X]), y: Number(r[Y]) }))
  .filter((p) => /^[A-Z]{3}$/.test(p.code ?? "") && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x > 0)
  .map(({ label, x, y }) => ({ label, x, y }));

const BREAK = 30000;
const NB = " ";
const money = (v) => `${Math.round(v).toLocaleString("fr-FR").replace(/[   ]/g, NB)}${NB}$`;
const spread = (keep) => {
  const ys = points.filter(keep).map((p) => p.y);
  return Math.max(...ys) - Math.min(...ys);
};
const ratio = spread((p) => p.x < BREAK) / spread((p) => p.x >= BREAK);

export default {
  lang: "fr",
  eyebrow: `Santé${NB}· Monde`,
  points,
  breakAt: BREAK,
  xLog: true,
  xTicks: [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000],
  yTicks: [40, 50, 60, 70, 80, 90],
  xName: "PIB par habitant",
  yName: [`Espérance de vie, en${NB}ans`, "Espérance de vie"],
  xTick: (v) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`),
  thresholdLabel: (v) => money(v),
  countLabel: (n) => `${n}${NB}pays`,
  spanLabel: (years) => `${Math.round(years)}${NB}ans`,
  timesLabel: (n) => `${n}${NB}fois`,
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: [
    `Au-delà de 30${NB}000${NB}$ par personne, l’espérance de vie tient dans une bande 3${NB}fois plus étroite`,
    `Au-delà de 30${NB}000${NB}$, l’espérance de vie tient dans une bande 3${NB}fois plus étroite`,
  ],
  source: [
    "Source : Banque mondiale via Gapminder, ONU WPP (2024), via Our World in Data",
    "Source : Banque mondiale, ONU WPP, via Our World in Data",
    "Source : Our World in Data",
  ],
  evidenceLevels: 4,
  check() {
    if (Math.round(ratio) !== 3) throw new Error(`the title says a band 3 times narrower above ${BREAK}; it is ${ratio.toFixed(2)} times`);
  },
};
