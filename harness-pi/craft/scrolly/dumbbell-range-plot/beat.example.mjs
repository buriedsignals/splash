// beat.mjs for the worked example proof/scrolly-dumbbell-life-expectancy-gains — "La Pologne a gagné 5,0 ans
// d'espérance de vie depuis 2000, les États-Unis 2,5", as a scrolly. Every number in a card is COMPUTED: the
// starts, the step back, the gains and the orders come from render-beat.mjs as `r` and are only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR, VALUE] = [col("Entity"), col("Year"), col("Life expectancy")];
const FROM = 2000;
const DIP_FROM = 2019;
const DIP_TO = 2021;
const TO = 2023;

// The ten the story is about, and the French name each is drawn under.
const COUNTRIES = {
  France: ["France", "la France"], Germany: ["Allemagne", "l’Allemagne"], Italy: ["Italie", "l’Italie"],
  Japan: ["Japon", "le Japon"], Netherlands: ["Pays-Bas", "les Pays-Bas"], Poland: ["Pologne", "la Pologne"],
  Spain: ["Espagne", "l’Espagne"], Switzerland: ["Suisse", "la Suisse"], "United Kingdom": ["Royaume-Uni", "le Royaume-Uni"],
  "United States": ["États-Unis", "les États-Unis"],
};

// One value per year, FROM to TO, per country.
const years = Array.from({ length: TO - FROM + 1 }, (_, i) => FROM + i);
const valueOf = (entity, year) => Number(table.rows.find((r) => r[ENTITY] === entity && Number(r[YEAR]) === year)[VALUE]);
const rows = Object.keys(COUNTRIES).map((entity) => ({ key: entity, label: COUNTRIES[entity][0], series: years.map((y) => valueOf(entity, y)) }));

const the = (row) => COUNTRIES[row.key][1];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// Rounded to tenths first, the way the page writes a value on the stage.
const one = (v) => (Math.round(v * 10) / 10).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const signed = (v) => `${v < 0 ? "−" : "+"}${one(Math.abs(v))}`;

export default {
  lang: "fr",
  eyebrow: "Santé · Europe, Japon et États-Unis",
  rows,
  from: FROM,
  dipFrom: DIP_FROM,
  dipTo: DIP_TO,
  to: TO,
  unit: "espérance de vie à la naissance, en années",
  // The year in the header: the first card's, then the playhead's.
  yearFirst: `en ${FROM}`,
  yearLabel: (year) => `de ${FROM} à ${year}`,
  format: one,
  // The right column: every row's gain, and the loss of the two that lost most in card 3.
  gainLabel: (row) => `${signed(row.gain)} ans`,
  lossLabel: (row) => `${signed(row.dip)} ans`,
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    start: (r) =>
      `L’espérance de vie à la naissance dans ${r.count} pays, en ${r.from}. En tête, ${the(r.highestStart)} : ${one(r.highestStart.start)} ans. Dernière, ${the(r.lowestStart)} : ${one(r.lowestStart.start)} ans.`,
    rise: (r) => `Chaque pays avance, année après année, jusqu’en ${r.dipFrom}. Tous vivent alors plus longtemps qu’en ${r.from}.`,
    dip: (r) =>
      `Puis le Covid : en ${r.dipTo}, ${r.fell.length} pays sur ${r.count} ont reculé. ${cap(the(r.worstDip))} perdent ${one(-r.worstDip.dip)} ans depuis ${r.dipFrom}, ${the(r.secondDip)} ${one(-r.secondDip.dip)}.`,
    gain: (r) => `En ${r.to}, tous ont dépassé leur niveau de ${r.from}. ${cap(the(r.most))} a gagné le plus : ${signed(r.most.gain)} ans.`,
    sort: (r) => `Classés par gain, ${the(r.least)} finissent derniers : ${signed(r.least.gain)} ans, pour ${one(r.least.end)} ans en ${r.to}. Seule ${the(r.most)} vit moins longtemps.`,
  },
  // The short accent note in the header while each card is read.
  notes: {
    start: (r) => `${r.count} pays`,
    rise: (r) => `${r.dipFrom} : tous au-dessus de ${r.from}`,
    dip: (r) => `${r.fell.length} pays sur ${r.count} en recul`,
    gain: (r) => `${r.most.label} : ${signed(r.most.gain)} ans`,
    sort: (r) => `${r.least.label} : ${signed(r.least.gain)} ans`,
    reading: (r) => `${r.count} pays, classés par gain`,
  },
  title: [
    "La Pologne a gagné 5,0 ans d’espérance de vie depuis 2000, les États-Unis 2,5",
    "L’espérance de vie depuis 2000 : +5,0 ans en Pologne, +2,5 aux États-Unis",
    "L’espérance de vie, de 2000 à 2023",
  ],
  // The last card: how to read the dots.
  limits: `Lecture : le point clair marque ${FROM}, le point foncé ${TO} ; à droite, le gain en années.`,
  source: `Source : Our World in Data (UN WPP, HMD), espérance de vie à la naissance · ${FROM}–${TO}`,
  alt: (r) =>
    `Haltères : l’espérance de vie à la naissance en ${r.from} et en ${r.to} dans ${r.count} pays, classés par gain. ` +
    `Tous ont gagné, de ${one(r.least.gain)} ans pour ${the(r.least)} à ${one(r.most.gain)} ans pour ${the(r.most)}.`,
  evidenceLevels: 2,
  check(r) {
    if (r.most.key !== "Poland" || r.least.key !== "United States") throw new Error(`the title names Poland the largest gain and the United States the smallest; they are ${r.most.key} and ${r.least.key}`);
    if (one(r.most.gain) !== "5,0" || one(r.least.gain) !== "2,5") throw new Error(`the title says +5,0 and +2,5; the data says ${one(r.most.gain)} and ${one(r.least.gain)}`);
    if (r.highestStart.key !== "Japan" || r.lowestStart.key !== "Poland") throw new Error(`card 1 names Japan highest and Poland lowest in ${FROM}; they are ${r.highestStart.key} and ${r.lowestStart.key}`);
    if (r.risen.length !== r.count) throw new Error(`card 2 says every country lived longer in ${DIP_FROM} than in ${FROM}`);
    if (!(r.fell.length > r.count / 2)) throw new Error(`card 3 says most fell from ${DIP_FROM} to ${DIP_TO}; ${r.fell.length} of ${r.count} did`);
    if (r.worstDip.key !== "United States" || r.secondDip.key !== "Poland") throw new Error("card 3 names the United States then Poland as the largest losses");
    if (r.gained.length !== r.count) throw new Error(`card 4 says every country gained since ${FROM}`);
    if (r.byEnd[0].key !== "Poland" || r.byEnd[1].key !== "United States") throw new Error(`card 5 says only Poland lives shorter than the United States in ${TO}`);
  },
};
