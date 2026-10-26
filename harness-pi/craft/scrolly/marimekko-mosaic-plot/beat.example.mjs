// beat.mjs for the worked example proof/scrolly-marimekko-electricity-mix — "Coal is 12 % of these six
// countries' electricity, and it fits in two columns", as a scrolly. The columns are read from
// data.json here; the totals, the coal total and share, and who holds it come from render-beat.mjs as
// `r` and are only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [ENTITY, CODE, YEAR_COL] = [col("Entity"), col("Code"), col("Year")];
const YEAR = 2024;
/** Stacked bottom to top in family order: fossil, nuclear, renewables — the order is the encoding. */
const SOURCES = [
  { key: "Coal", label: "charbon" },
  { key: "Oil", label: "pétrole" },
  { key: "Gas", label: "gaz" },
  { key: "Nuclear", label: "nucléaire" },
  { key: "Bioenergy", label: "bioénergie" },
  { key: "Other renewables", label: "autres renouv." },
  { key: "Hydropower", label: "hydraulique" },
  { key: "Solar", label: "solaire" },
  { key: "Wind", label: "éolien" },
];
const unstacked = data.columns.slice(3).map((c) => c.name).filter((n) => !SOURCES.some((s) => s.key === n));
if (unstacked.length) throw new Error(`unstacked source(s): ${unstacked.join(", ")}`);
const FRENCH = { France: ["France", "la France"], Germany: ["Allemagne", "l’Allemagne"], Norway: ["Norvège", "la Norvège"], Poland: ["Pologne", "la Pologne"], Sweden: ["Suède", "la Suède"], Switzerland: ["Suisse", "la Suisse"] };
const columns = data.rows
  .filter((r) => Number(r[YEAR_COL]) === YEAR)
  .map((r) => {
    if (!FRENCH[r[ENTITY]]) throw new Error(`no French name recorded for ${r[ENTITY]}`);
    return { key: r[CODE], label: FRENCH[r[ENTITY]][0], values: Object.fromEntries(SOURCES.map((s) => [s.key, Number(r[col(s.key)])])) };
  });
// "la Pologne", from a column's label.
const ARTICLE = Object.fromEntries(Object.values(FRENCH));
const cap = (s) => s[0].toUpperCase() + s.slice(1);

const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const whole = (v) => Math.round(v).toLocaleString("fr-FR");

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  columns,
  bandOrder: SOURCES,
  tracked: "Coal",
  unit: "TWh",
  heightName: "part de la production du pays",
  widthName: "largeur : production totale, en TWh",
  format: whole,
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    mix: (r) => `La production électrique de six pays européens en ${YEAR}, par source : du ${r.bands[0].label}, en bas, à l’${r.bands.at(-1).label}, en haut. Chaque colonne fait 100 %.`,
    width: (r) => `Donnons à chaque colonne la largeur de sa production, de ${whole(r.largest.total)} TWh en ${r.largest.label} à ${whole(r.smallest.total)} TWh en ${r.smallest.label}. L’aire d’une bande devient une quantité.`,
    tracked: (r) => `Le ${r.trackedBand.label} seul : ${one(r.trackedTotal)} TWh, ${Math.round(r.trackedPercent)} % de l’électricité des six.`,
    stack: (r) => `Rassemblons-le en une colonne. ${cap(ARTICLE[r.holders[0].label])} et ${ARTICLE[r.holders[1].label]} en produisent ${one(r.topTwoShare)} %.`,
    bands: () => `Toutes les sources reprennent leur place, dans le même ordre dans chaque colonne.`,
  },
  // The header notes: card 2's whole, card 3's tracked band, card 4's two holders.
  notes: {
    grand: (r) => `${whole(r.grand)} TWh au total`,
    tracked: (r) => `${r.trackedBand.label} : ${one(r.trackedTotal)} TWh, ${Math.round(r.trackedPercent)} %`,
    stack: (r) => `${r.holders[0].label} + ${r.holders[1].label} : ${one(r.topTwoShare)} %`,
  },
  stackLabel: (r) => `${r.trackedBand.label} ${Math.round(r.trackedPercent)} %`,
  title: [
    "Le charbon fait 12 % de l’électricité de ces six pays, et il tient dans deux colonnes",
    "Le charbon de six pays tient dans deux colonnes",
    `Six mix électriques, ${YEAR}`,
  ],
  // The last card: what a width and a height are.
  limits: "Lecture : la largeur d’une colonne est la production du pays, sa hauteur son mix. Les parts sous 0,5 % sont dessinées mais pas chiffrées.",
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: (r) =>
    `Marimekko : six colonnes, une par pays, larges comme leur production électrique de ${YEAR} et découpées par source. ` +
    `Le charbon fait ${one(r.trackedPercent)} % du total, dont ${one(r.topTwoShare)} % en ${r.holders[0].label} et en ${r.holders[1].label}.`,
  evidenceLevels: 3,
  check(r) {
    if (r.topTwoShare < 95) throw new Error(`the headline says two countries hold nearly all of the coal; they hold ${r.topTwoShare.toFixed(1)} %`);
    if (Math.round(r.trackedPercent) !== 12) throw new Error(`the headline says coal is 12 % of the six; it is ${r.trackedPercent.toFixed(1)} %`);
  },
};
