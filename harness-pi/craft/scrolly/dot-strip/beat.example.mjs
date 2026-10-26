// beat.mjs for the worked example proof/scrolly-dot-strip-lowcarbon-spread — "Le plancher européen est
// monté de 30 points, le plafond de 2", as a scrolly. The shares are computed here from the generation
// columns; the floor, the ceiling, the medians and the spreads come from render-beat.mjs as `r` and are
// only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [CODE, YEAR] = [col("code"), col("year")];
const LOW_CARBON = ["other_renewables_generation__twh", "bioenergy_stacked_generation__twh", "solar_generation__twh", "wind_generation__twh", "hydro_generation__twh", "nuclear_generation__twh"].map(col);
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"].map(col);
const FROM = 2000;
const TO = 2024;
const NAMES = {
  FRA: ["France", "la France"], DEU: ["Allemagne", "l’Allemagne"], ESP: ["Espagne", "l’Espagne"], GBR: ["Royaume-Uni", "le Royaume-Uni"],
  SWE: ["Suède", "la Suède"], ITA: ["Italie", "l’Italie"], FIN: ["Finlande", "la Finlande"], AUT: ["Autriche", "l’Autriche"],
  NLD: ["Pays-Bas", "les Pays-Bas"], BEL: ["Belgique", "la Belgique"], POL: ["Pologne", "la Pologne"], CZE: ["Tchéquie", "la Tchéquie"],
  PRT: ["Portugal", "le Portugal"], DNK: ["Danemark", "le Danemark"], GRC: ["Grèce", "la Grèce"], IRL: ["Irlande", "l’Irlande"],
};

// Low-carbon generation's share of each country's own electricity, in percent.
const sum = (row, cols) => cols.reduce((s, i) => s + Number(row[i]), 0);
const share = (code, year) => {
  const row = table.rows.find((r) => r[CODE] === code && Number(r[YEAR]) === year);
  const lc = sum(row, LOW_CARBON);
  return (lc / (lc + sum(row, FOSSIL))) * 100;
};
const codes = [...new Set(table.rows.map((r) => r[CODE]))];
const marks = codes.map((code) => ({ name: NAMES[code][0], code, before: share(code, FROM), after: share(code, TO) }));
const the = (mark) => NAMES[mark.code][1];

const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct = (v) => `${one(v)} %`;

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  marks,
  subject: "Pologne",
  from: FROM,
  to: TO,
  unit: "part de bas-carbone dans l’électricité du pays, en %",
  // The moving median is written "<medianName> <value> <unitMark>" on the strip.
  unitMark: "%",
  medianName: "médiane",
  format: one,
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    field: (r) => `En ${r.from}, chaque pays est une épingle sur l’axe : la part de bas-carbone dans sa propre électricité. Le champ va de ${pct(r.floorBefore)} à ${pct(r.ceilBefore)}.`,
    travel: (r) => `Jusqu’en ${r.to}, chaque épingle glisse ; un trait reste là où elle était. La médiane passe de ${pct(r.medianBefore)} à ${pct(r.medianAfter)}.`,
    floor: (r) => `Le plancher : ${the(r.subject)}, de ${pct(r.subject.before)} à ${pct(r.subject.after)}. Il est monté de ${Math.round(r.floorRise)} points.`,
    ceil: (r) => `Le plafond : ${the(r.ceiling)}, de ${pct(r.ceiling.before)} à ${pct(r.ceiling.after)}. Il n’est monté que de ${Math.round(r.ceilRise)} points.`,
    spread: (r) => `L’écart entre le plus fossile et le plus propre passe de ${one(r.spreadBefore)} à ${one(r.spreadAfter)} points : il se referme de ${one(r.spreadClosed)} points.`,
  },
  // The large figure over the strip while each card is read: [label, value]; the median's value is the kit's.
  figures: (r) => ({
    range: [`en ${r.from}, le champ va de`, `${one(r.floorBefore)} à ${pct(r.ceilBefore)}`],
    median: "la médiane",
    floor: [`le plancher, ${r.subject.label}`, `+${Math.round(r.floorRise)} points`],
    ceil: [`le plafond, ${r.ceiling.label}`, `+${Math.round(r.ceilRise)} points`],
    spread: ["l’écart plancher–plafond", `${one(r.spreadBefore)} puis ${one(r.spreadAfter)} points`],
  }),
  splitNote: (r) => `${r.from} en haut, ${r.to} en bas, même échelle`,
  floorTrail: (r) => `+${Math.round(r.floorRise)} points`,
  ceilTrail: (r) => `+${Math.round(r.ceilRise)} points`,
  spreadBefore: (r) => `${r.from} : ${one(r.spreadBefore)} points`,
  spreadAfter: (r) => `${r.to} : ${one(r.spreadAfter)} points`,
  title: [
    "Le plancher européen est monté de 30 points, le plafond de 2",
    "Le plancher est monté de 30 points, le plafond de 2",
    "Le bas-carbone des 16 pays, 2000 et 2024",
  ],
  // The last card: how to read the field.
  limits:
    "Lecture : ce n’est pas un pays qu’il faut suivre mais la forme du champ, où il commence, où il finit, où il s’entasse. Les deux bandes portent la même échelle.",
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: (r) =>
    `Seize épingles, une par pays, sur un axe de 0 à 100 % : la part de bas-carbone dans l’électricité de chaque pays, en ${r.from} puis en ${r.to}. ` +
    `Le plancher passe de ${one(r.floorBefore)} à ${one(r.floorAfter)} % (${the(r.subject)}), le plafond de ${one(r.ceilBefore)} à ${one(r.ceilAfter)} % (${the(r.ceiling)}) ; ` +
    `l’écart se referme de ${one(r.spreadClosed)} points.`,
  evidenceLevels: 3,
  check(r) {
    if (Math.round(r.floorRise) !== 30) throw new Error(`the title says the floor rose 30 points; it rose ${r.floorRise.toFixed(1)}`);
    if (Math.round(r.ceilRise) !== 2) throw new Error(`the title says the ceiling rose 2 points; it rose ${r.ceilRise.toFixed(1)}`);
    if (!(r.spreadAfter < r.spreadBefore * 0.8)) throw new Error(`card 5 says the spread closed by more than a fifth; ${r.spreadBefore.toFixed(1)} to ${r.spreadAfter.toFixed(1)}`);
  },
};
