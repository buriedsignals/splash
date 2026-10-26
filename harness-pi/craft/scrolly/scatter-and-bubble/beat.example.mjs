// beat.mjs for the worked example proof/scrolly-scatter-income-life-expectancy — "Au-delà de 30 000 $
// par personne, l'espérance de vie tient dans une bande 3 fois plus étroite", as a scrolly. Every
// number in a card is COMPUTED: the counts, each side's extremes and spread and their ratio come from
// render-beat.mjs as `r` and are only WORDED here. The break is declared (editorial).
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = data.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [ENTITY, CODE, YEAR_COL, LIFE, GDP] = [col("Entity"), col("Code"), col("Year"), col("Life expectancy at birth"), col("GDP per capita")];

// The French names of the countries the cards name (the extremes on each side of the break).
const FRENCH = { "Central African Republic": "Centrafrique", Portugal: "Portugal", Seychelles: "Seychelles", "Hong Kong": "Hong Kong" };
// One point per country with both measures; aggregates have no ISO-3 code.
const points = data.rows
  .filter((r) => /^[A-Z]{3}$/.test(r[CODE] ?? ""))
  .map((r) => ({ name: FRENCH[r[ENTITY]] ?? r[ENTITY], x: Number(r[GDP]), y: Number(r[LIFE]) }))
  .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x > 0);
const YEAR = data.rows[0][YEAR_COL];
if (points.some((p) => p.y < 35)) throw new Error("a reading under 35 years is the 2022 data artefact this beat refuses");
const breakAt = 30000;

const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const money = (v) => `${v.toLocaleString("fr-FR")} $`;
/** "3" when the ratio rounds to a whole number within 0.15, else one decimal ("2,6"). */
const times = (r) => (Math.abs(r - Math.round(r)) < 0.15 ? String(Math.round(r)) : r.toFixed(1).replace(".", ","));
// The French preposition before each extreme's name.
const IN = { Centrafrique: "en Centrafrique", Portugal: "au Portugal", Seychelles: "aux Seychelles", "Hong Kong": "à Hong Kong" };
const at = (p) => {
  if (!IN[p.name]) throw new Error(`${p.name} became an extreme and this beat has no French preposition for it`);
  return IN[p.name];
};

export default {
  lang: "fr",
  eyebrow: "Santé · Monde",
  points,
  breakAt,
  xName: "PIB par habitant, en dollars",
  linearQualifier: "(échelle linéaire)",
  xQualifier: "(échelle logarithmique)",
  yName: "espérance de vie à la naissance, en années",
  xTick: (v) => (v >= 1000 ? `${(v / 1000).toLocaleString("fr-FR")} k` : String(v)),
  format: one,
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    linear: (r) => `${r.count} pays en ${YEAR} : le PIB par habitant en abscisse, l’espérance de vie en ordonnée. Sur un axe du revenu ordinaire, plus de la moitié, ${r.firstTenth}, s’entassent dans son premier dixième.`,
    log: () => `Passons le revenu en échelle logarithmique, où chaque graduation multiplie. Le nuage se déplie : l’espérance de vie monte vite, puis plafonne.`,
    break: (r) => `Posons un seuil à ${money(r.breakAt)} par personne : ${r.below.count} pays en dessous, ${r.above.count} au-dessus.`,
    below: (r) => `En dessous, l’espérance de vie va de ${one(r.below.lo.y)} ans ${at(r.below.lo)} à ${one(r.below.hi.y)} ans ${at(r.below.hi)} : ${Math.round(r.below.range)} ans d’écart.`,
    above: (r) => `Au-dessus, elle tient entre ${one(r.above.lo.y)} ans ${at(r.above.lo)} et ${one(r.above.hi.y)} ans ${at(r.above.hi)} : ${Math.round(r.above.range)} ans, une bande ${times(r.ratio)} fois plus étroite.`,
  },
  // The short accent note in the header while cards 2 to 5 are read.
  notes: {
    log: () => "échelle logarithmique",
    break: (r) => `seuil : ${money(r.breakAt)}`,
    below: (r) => `${Math.round(r.below.range)} ans d’écart sous le seuil`,
    above: (r) => `${Math.round(r.above.range)} ans au-dessus, ${times(r.ratio)} fois moins`,
  },
  // The two claims drawn on the plot, on each side of the break.
  belowNote: (r) => `${r.below.count} pays sous ${money(r.breakAt)} · ${Math.round(r.below.range)} ans d’écart`,
  aboveNote: (r) => `${r.above.count} au-dessus · ${Math.round(r.above.range)} ans`,
  title: [
    "Au-delà de 30 000 $ par personne, l’espérance de vie tient dans une bande 3 fois plus étroite",
    "Au-delà de 30 000 $, une espérance de vie 3 fois plus resserrée",
    "Le revenu et l’espérance de vie",
  ],
  // The last card: what the cloud cannot say.
  limits: "Corrélation, pas causalité : les systèmes de santé, les conflits et les maladies évoluent aussi indépendamment du revenu.",
  source: "Source : Banque mondiale via Gapminder, ONU WPP (2024), via Our World in Data",
  alt: (r) =>
    `Nuage de points du PIB par habitant contre l’espérance de vie pour ${r.count} pays en ${YEAR}, en échelle logarithmique. ` +
    `Sous ${r.breakAt} dollars l’espérance de vie s’étend sur ${Math.round(r.below.range)} ans, au-dessus sur ${Math.round(r.above.range)} ans.`,
  evidenceLevels: 3,
  check(r) {
    if (!(r.ratio > 2.5)) throw new Error(`the title says the band over the break is about three times narrower; the ratio is ${r.ratio.toFixed(2)}`);
    if (Math.round(r.ratio) !== 3) throw new Error(`the band above ${r.breakAt} is ${r.ratio.toFixed(2)} times narrower than below, not 3`);
    if (!(r.firstTenth / r.count > 0.5)) throw new Error(`card 1 says more than half the countries sit in the first tenth of a linear axis; ${r.firstTenth} of ${r.count} do`);
  },
};
