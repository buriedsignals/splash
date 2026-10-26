// beat.mjs for the worked example proof/web-scatter-income-life-expectancy — "Au-delà de 30 000 $
// par personne, le revenu n'achète presque plus d'années de vie", as an interactive page. The band,
// the case set (the most populous country of each region), every rank and count are COMPUTED by
// render-beat.mjs and only WORDED here; every other number is computed from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);

// One point per country with both readings (aggregates have no three-letter code).
const points = data.rows
  .map((r) => ({
    key: r[col("Code")],
    label: r[col("Entity")],
    x: Number(r[col("GDP per capita")]),
    y: Number(r[col("Life expectancy at birth")]),
    group: r[col("World region")],
    weight: Number(r[col("Population")]),
    year: r[col("Year")],
  }))
  .filter((p) => /^[A-Z]{3}$/.test(p.key ?? "") && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x > 0);
const year = points[0].year;
const THRESHOLD = 30000;

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const dollars = (v) => `${Math.round(v).toLocaleString("fr-FR")} $`;

export default {
  lang: "fr",
  eyebrow: "Santé · Monde",
  points,
  breakAt: THRESHOLD,
  yUnit: "années",
  format: (v) => fr(v),
  xTick: (v) => dollars(v),
  thresholdLabel: (v) => `${dollars(v)} par personne`,
  bandNote: (b) => `Au-dessus : ${b.above} pays, de ${fr(b.low)} à ${fr(b.high)} ans — ${fr(b.spread)} ans d'écart. En dessous : ${fr(b.belowSpread)}.`,
  // What one point answers when hovered, tapped or tabbed to.
  detail: (p) =>
    `${p.label} · ${fr(p.y)} ans d'espérance de vie · ${dollars(p.x)} par personne et par an · ${p.group || "région non renseignée"} · ` +
    `${fr(p.weight / 1e6, 1)} millions d'habitants`,
  // The control: measure the cloud against one case (the most populous country of each region).
  levelLabel: "À l'aune de",
  noneLabel: "Le nuage entier",
  announce: (c) => `${c.label} — ${dollars(c.x)} par personne, ${fr(c.y)} ans ; ${c.xRank}e revenu et ${c.yRank}e espérance de vie sur ${c.of}`,
  note: (c) =>
    `${c.label} · ${dollars(c.x)} par personne · ${fr(c.y)} ans · ${c.xRank}e revenu et ${c.yRank}e espérance de vie sur ${c.of} · ` +
    `${c.higherX} pays sont plus riches, dont ${c.higherXLowerY} vivent moins longtemps · ${c.lowerX} sont plus pauvres, dont ` +
    `${c.lowerXHigherY} vivent plus longtemps`,
  title: "Au-delà de 30 000 $ par personne, le revenu n'achète presque plus d'années de vie",
  limits:
    `${points.length} pays en ${year} : le revenu par personne en abscisse, l'espérance de vie à la naissance en ordonnée. L'axe des revenus ` +
    `est logarithmique — chaque graduation vaut environ trois fois la précédente, le mensonge silencieux le plus courant de cette famille.`,
  reading:
    "Lecture : choisissez un pays pour mesurer le nuage à son aune — combien de pays plus riches vivent moins longtemps que lui. Survolez ou " +
    "tabulez un point pour son nom et ses valeurs.",
  source: `Source : Our World in Data · espérance de vie et PIB par habitant (dollars internationaux constants), ${year}`,
  alt: ({ band }) =>
    `Un nuage de ${band.total} points de taille identique, un par pays : le revenu par personne en abscisse sur une échelle logarithmique, ` +
    `l'espérance de vie en ordonnée. La courbe du nuage monte très vite jusqu'à environ ${dollars(THRESHOLD)}, puis s'aplatit : au-delà du ` +
    `trait vertical, les ${band.above} pays tiennent dans une bande de ${fr(band.spread)} ans (${fr(band.low)} à ${fr(band.high)}), là où les ` +
    `${band.below} pays en dessous s'étalent sur ${fr(band.belowSpread)} ans.`,
  evidenceLevels: 2,
  check({ band }) {
    if (!(band.spread < band.belowSpread * 0.75))
      throw new Error(`above ${THRESHOLD} the band spans ${fr(band.spread)} years against ${fr(band.belowSpread)} below: not much narrower`);
  },
};
