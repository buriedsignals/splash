// beat.mjs for the worked example proof/scrolly-heatmap-coal-share-europe — "Coal fell in the twelve
// European countries that depended on it most; only Poland stays above half", as a scrolly. The grid
// is read from data.json here; the order, the counts, the jumps and the falls come from
// render-beat.mjs as `r` and are only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR, VALUE] = [col("Entity"), col("Year"), col("Coal")];
const FROM = 2010;
const TO = 2024;
const LOW = 10;
const JUMP = 3;
const years = [];
for (let y = FROM; y <= TO; y++) years.push(y);

const COUNTRIES = {
  Poland: { name: "Pologne", article: "la Pologne" },
  Czechia: { name: "Tchéquie", article: "la Tchéquie" },
  Greece: { name: "Grèce", article: "la Grèce" },
  Bulgaria: { name: "Bulgarie", article: "la Bulgarie" },
  Denmark: { name: "Danemark", article: "le Danemark" },
  Germany: { name: "Allemagne", article: "l’Allemagne" },
  Romania: { name: "Roumanie", article: "la Roumanie" },
  Slovenia: { name: "Slovénie", article: "la Slovénie" },
  "United Kingdom": { name: "Royaume-Uni", article: "le Royaume-Uni" },
  Netherlands: { name: "Pays-Bas", article: "les Pays-Bas" },
  Finland: { name: "Finlande", article: "la Finlande" },
  Hungary: { name: "Hongrie", article: "la Hongrie" },
};
const entities = [...new Set(data.rows.map((r) => r[ENTITY]))];
const rows = entities.map((entity) => {
  if (!COUNTRIES[entity]) throw new Error(`${entity} is in the data and this beat has no French name for it`);
  const cells = years.map((y) => {
    const row = data.rows.find((r) => r[ENTITY] === entity && Number(r[YEAR]) === y);
    if (!row) throw new Error(`no ${y} reading for ${entity}`);
    return Number(row[VALUE]);
  });
  return { label: COUNTRIES[entity].name, cells };
});
// "la Pologne", from a row's label.
const ARTICLE = Object.fromEntries(Object.values(COUNTRIES).map((c) => [c.name, c.article]));
const the = (g) => ARTICLE[g.label];
const capital = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const SPELLED = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze"];
const list = (group) => (group.length === 1 ? group[0].label : `${group.slice(0, -1).map((g) => g.label).join(", ")} et ${group.at(-1).label}`);

const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct = (v) => `${one(v)} %`;

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  years,
  rows,
  breaks: [LOW, 25, 50, 75],
  breakLabel: (b) => `${b} %`,
  format: one,
  // In a cell's column: one decimal under 10 %, a whole number above, so a narrow column holds it.
  cellFormat: (v) => (v < 10 ? one(v) : String(Math.round(v))),
  fallLabel: (g) => `−${Math.round(g.fallPercent)} %`,
  countYear: 2021,
  crisisYear: 2022,
  jump: JUMP,
  half: 50,
  unit: "part du charbon dans la production d’électricité",
  legend: "part de la production du pays",
  fallHead: "recul",
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    start: (r) => `La part du charbon dans l’électricité des douze pays de l’Union européenne et du Royaume-Uni qui en dépendaient le plus en ${r.first}. En tête, ${the(r.leader)} : ${pct(r.leader.first)}.`,
    years: (r) => `Année après année, la teinte pâlit. En ${r.countYear}, ${SPELLED[r.countUnder.length]} pays sont passés sous ${LOW} % : ${list(r.countUnder)}.`,
    crisis: (r) => `En ${r.crisis.year}, la crise du gaz : ${list(r.crisis.jumped)} reprennent chacune plus de ${r.jump} points, et ${the(r.crisis.backOver[0])} repasse au-dessus de ${LOW} %.`,
    end: (r) => `En ${r.last}, les douze sont sous leur niveau de ${r.first}. ${capital(SPELLED[r.underEnd.length])} sont sous ${LOW} % ; ${the(r.highEnd[0])}, à ${pct(r.highEnd[0].last)}, reste la seule au-dessus de la moitié.`,
    sort: (r) =>
      `Rangés par recul, ${the(r.steepest)} passe en tête : de ${pct(r.steepest.first)} à ${pct(r.steepest.last)}, −${Math.round(r.steepest.fallPercent)} %. ` +
      `${capital(the(r.leader))}, partie de plus haut, a reculé de ${Math.round(r.leader.fallPercent)} %.`,
  },
  // The short accent note in the header while each card is read; the second follows the fill.
  notes: {
    start: (r) => `${r.leader.label} ${r.first} : ${pct(r.leader.first)}`,
    years: () => `{year} : {n} pays sous ${LOW} %`,
    crisis: (r) => `${r.crisis.year} : la crise du gaz`,
    end: (r) => `${r.last} : ${r.underEnd.length} sous ${LOW} %, ${r.highEnd.length} au-dessus de ${r.half} %`,
    sort: (r) => `${r.steepest.label} : −${Math.round(r.steepest.fallPercent)} %`,
    reading: (r) => `${r.first} et ${r.last}`,
  },
  title: [
    "Le charbon a reculé dans les douze pays européens qui en dépendaient le plus ; seule la Pologne reste au-dessus de la moitié",
    "Le charbon recule partout ; seule la Pologne dépasse encore la moitié",
    "Le recul du charbon en Europe",
  ],
  // The last card: the rule that selected the rows.
  limits: `Lecture : ces douze pays sont ceux où le charbon pesait le plus en ${FROM}. Ils racontent le recul du charbon, pas l’électricité de toute l’Europe.`,
  source: `Source : Ember, via Our World in Data · part du charbon dans la production d’électricité, ${FROM}–${TO}`,
  alt: (r) =>
    `Grille : la part du charbon dans l’électricité de douze pays européens, année par année de ${r.first} à ${r.last}. ` +
    `Elle baisse dans les douze ; en ${r.last}, ${r.underEnd.length} sont sous ${LOW} % et ${the(r.highEnd[0])}, à ${one(r.highEnd[0].last)} %, reste la seule au-dessus de la moitié.`,
  check(r) {
    if (r.count !== 12) throw new Error(`the beat draws twelve countries; the data has ${r.count}`);
    if (r.notFallen.length) throw new Error(`the title says coal fell in all twelve; not in ${r.notFallen.map((g) => g.label).join(", ")}`);
    if (!(r.highEnd.length === 1 && r.highEnd[0].label === "Pologne")) throw new Error(`the title says Poland alone stays above half; ${r.highEnd.map((g) => g.label).join(", ") || "none"} do`);
    if (r.leader.label !== "Pologne") throw new Error(`card 1 names Poland the most coal-dependent in ${FROM}; it is ${r.leader.label}`);
    if (!(r.crisis.backOver.length === 1 && r.crisis.jumped.length === 3)) throw new Error(`card 3 names three jumps and one country back over ${LOW} %; the data gives ${r.crisis.jumped.length} and ${r.crisis.backOver.length}`);
    if (r.underEnd.length !== 6) throw new Error(`card 4 says six are under ${LOW} % in ${TO}; ${r.underEnd.length} are`);
  },
};
