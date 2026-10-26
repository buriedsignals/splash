// beat.mjs for the worked example proof/scrolly-carbon-footprint-spread — "6 countries in 10 emit
// less than 4 tonnes of CO₂ per person", as a scrolly. The observations are read from data.json
// here; the bins, the count under the cut, the median and the tail come from render-beat.mjs as `r`
// and are only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [ENTITY, CODE, YEAR_COL, VALUE] = [col("Entity"), col("Code"), col("Year"), col("CO2 emissions per capita")];
const YEAR = 2023;
const BIN_WIDTH = 4;
const BIN_COUNT = 10;
const THRESHOLD = 4;
const TAIL_FROM = 16;
// The far tail is named on card 5, in French.
const TAIL_NAMES = { SXM: "Sint-Maarten", NCL: "Nouvelle-Calédonie", ARE: "Émirats arabes unis", SAU: "Arabie saoudite", TTO: "Trinité-et-Tobago", BHR: "Bahreïn", KWT: "Koweït", BRN: "Brunei", QAT: "Qatar" };
const ARTICLE = { Qatar: "le Qatar" };

// Countries only (ISO-3 codes; OWID aggregates have none), one reading each.
const countries = data.rows.filter((r) => /^[A-Z]{3}$/.test(r[CODE]) && Number.isFinite(Number(r[VALUE])));
for (const r of countries) if (Number(r[YEAR_COL]) !== YEAR) throw new Error(`${r[ENTITY]} is not ${YEAR}`);
const observations = countries.map((r) => ({ name: TAIL_NAMES[r[CODE]] ?? r[ENTITY], value: Number(r[VALUE]) }));

const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const the = (o) => ARTICLE[o.name] ?? o.name;

export default {
  lang: "fr",
  eyebrow: "Climat · Monde",
  observations,
  binStart: 0,
  binWidth: BIN_WIDTH,
  binCount: BIN_COUNT,
  threshold: THRESHOLD,
  tailFrom: TAIL_FROM,
  unit: `tonnes de CO₂ par personne, ${YEAR}`,
  format: one,
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    dots: (r) => `Les ${r.count} pays du monde en ${YEAR}, chacun un point placé à ses tonnes de CO₂ par personne. La plupart sont serrés à gauche ; ${the(r.furthest)} est seul tout à droite, à ${one(r.furthest.value)} t.`,
    bins: (r) => `Faisons tomber les points par tranche de ${r.binWidth} tonnes. Chaque pays compte pour un, sans pondération par la population.`,
    cut: (r) => `Sous ${r.threshold} tonnes : ${r.under} pays sur ${r.count}, six sur dix.`,
    median: (r) => `La moitié des pays émet moins de ${one(r.median)} t par personne : c’est la médiane.`,
    tail: (r) => `À l’autre bout, ${r.tail.length} pays dépassent ${r.tailFrom} tonnes, surtout des producteurs de pétrole et de gaz.`,
  },
  // The short accent note in the header while each card is read.
  notes: {
    dots: (r) => `${r.count} pays, un point chacun`,
    bins: (r) => `par tranche de ${r.binWidth} t`,
    cut: (r) => `${r.under} pays sur ${r.count} sous ${r.threshold} t`,
    median: (r) => `médiane : ${one(r.median)} t`,
    tail: (r) => `${r.tail.length} pays au-delà de ${r.tailFrom} t`,
    reading: () => "chaque pays compte pour un",
  },
  cutLabel: (r) => `${r.under} pays sous ${r.threshold} t`,
  medianLabel: (r) => `médiane ${one(r.median)} t`,
  title: [
    "6 pays sur 10 émettent moins de 4 tonnes de CO₂ par personne",
    "6 pays sur 10 sous 4 tonnes de CO₂ par personne",
    "Le CO₂ par personne, pays par pays",
  ],
  // The last card: how the bars count.
  limits: `Lecture : chaque barre compte les pays d’une tranche de ${BIN_WIDTH} tonnes par personne ; la dernière réunit tous ceux au-delà de ${(BIN_COUNT - 1) * BIN_WIDTH}.`,
  source: "Source : Global Carbon Budget (2025), via Our World in Data",
  alt: (r) =>
    `Histogramme : ${r.count} pays répartis selon leurs émissions de CO₂ par personne en ${YEAR}, par tranches de ${r.binWidth} tonnes. ` +
    `${r.under} pays sur ${r.count} émettent moins de ${r.threshold} tonnes ; la médiane est de ${one(r.median)} tonnes ; ${the(r.furthest)} est à ${one(r.furthest.value)} tonnes.`,
  evidenceLevels: 3,
  check(r) {
    const tenths = Math.round((r.under / r.count) * 10);
    if (tenths !== 6) throw new Error(`the headline says six countries in ten emit under ${THRESHOLD} t; ${r.under} of ${r.count} is ${r.underShare.toFixed(0)} %`);
    if (!(r.median < THRESHOLD)) throw new Error(`card 4 says the median sits under the cut; it is ${r.median.toFixed(2)}`);
    if (r.furthest.name !== "Qatar") throw new Error(`card 1 names Qatar as the furthest out; it is ${r.furthest.name}`);
  },
};
