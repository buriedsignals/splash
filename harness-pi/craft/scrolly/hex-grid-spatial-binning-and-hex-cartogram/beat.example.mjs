// beat.mjs for the worked example proof/scrolly-hex-grid-europe-protection — "Par habitant, ce n'est
// pas l'Allemagne : la Tchéquie accueille 36,1 Ukrainiens pour 1 000 habitants", as a scrolly. data.json
// holds each host's count and population (and the origin's row, with no count). Every number in a card
// is COMPUTED: the rates and the ranks come from render-beat.mjs as `r` and are only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [CODE, MONTH, PEOPLE, POPULATION] = [col("code"), col("month"), col("people"), col("population")];
const ORIGIN = "UKR";
const month = table.rows[0][MONTH];

// The French names (and articles) the cards print.
const NAMES = {
  DEU: ["Allemagne", "l’Allemagne"], POL: ["Pologne", "la Pologne"], CZE: ["Tchéquie", "la Tchéquie"], ESP: ["Espagne"], ROU: ["Roumanie"],
  SVK: ["Slovaquie"], NLD: ["Pays-Bas"], IRL: ["Irlande"], BEL: ["Belgique"], AUT: ["Autriche"], NOR: ["Norvège"], BGR: ["Bulgarie"],
  CHE: ["Suisse"], FIN: ["Finlande"], PRT: ["Portugal"], FRA: ["France", "la France"], DNK: ["Danemark"], LTU: ["Lituanie"], HUN: ["Hongrie"],
  SWE: ["Suède"], GRC: ["Grèce"], ITA: ["Italie"], LVA: ["Lettonie"], EST: ["Estonie"], HRV: ["Croatie"], CYP: ["Chypre"], SVN: ["Slovénie"],
  ISL: ["Islande"], LUX: ["Luxembourg"], MLT: ["Malte"], LIE: ["Liechtenstein"], UKR: ["Ukraine", "l’Ukraine"],
};
const named = (iso) => {
  if (!NAMES[iso]) throw new Error(`${iso} has no French name in this beat`);
  return NAMES[iso];
};
const article = (iso) => {
  if (!named(iso)[1]) throw new Error(`${iso} is named with its article by a card and this beat has none for it`);
  return named(iso)[1];
};
const rows = table.rows
  .filter((r) => r[CODE] !== ORIGIN)
  .map((r) => ({ iso: r[CODE], name: named(r[CODE])[0], count: Number(r[PEOPLE]), population: Number(r[POPULATION]) }));

const number = (v, d) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const n0 = (v) => number(v, 0);
const one = (v) => number(v, 1);
const cap = (s) => s[0].toUpperCase() + s.slice(1);

export default {
  lang: "fr",
  eyebrow: "Migrations · Europe",
  // The country the people counted come from: on the grid, greyed, outside the count.
  origin: { iso: ORIGIN, name: "Ukraine" },
  rows,
  countBreaks: [50000, 100000, 250000, 500000],
  rateBreaks: [5, 12, 18, 25],
  number,
  countUnit: "Ukrainiens sous protection temporaire",
  rateUnit: "Ukrainiens sous protection temporaire pour 1 000 habitants",
  countNote: (r) => `${r.largestCount.name} : ${n0(r.largestCount.count)} personnes`,
  rateNote: (r) => `${r.topRate.name} : ${one(r.topRate.rate)} pour 1 000`,
  rankNote: (r) => `${r.largestCount.name} ${r.largestCount.rateRank}e sur ${r.count}`,
  pairNote: (r) => `${one(r.topRate.rate)} contre ${one(r.largestCount.rate)} pour 1 000`,
  originNote: () => "L’Ukraine est sur la grille et hors du compte : c’est d’elle que viennent les personnes que les autres cases comptent.",
  cards: {
    grid: (r) => `Un hexagone par pays européen, tous de même taille, rangés à peu près comme la carte. ${cap(article(r.origin.iso))}, d’où viennent les personnes comptées, est grisée.`,
    count: (r) =>
      `Coloriée selon le nombre d’Ukrainiens sous protection temporaire, la grille met ${article(r.largestCount.iso)} en tête (${n0(r.largestCount.count)}), puis ${article(r.secondCount.iso)} (${n0(r.secondCount.count)}).`,
    rate: (r) => `Rapportons ce nombre à la population. La ${r.topRate.name}, ${r.topRate.countRank}e en nombre, devient la plus foncée : ${one(r.topRate.rate)} pour 1 000 habitants.`,
    rank: (r) =>
      `Rangés par taux, les pays se réordonnent : ${article(r.topRate.iso)} en tête, ${article(r.largestCount.iso)} ${r.largestCount.rateRank}e, ${article(r.lastRate.iso)} dernière à ${one(r.lastRate.rate)}.`,
    pair: (r) => `${cap(article(r.topRate.iso))} accueille ${one(r.topRate.rate)} Ukrainiens pour 1 000 habitants, ${article(r.largestCount.iso)} ${one(r.largestCount.rate)}.`,
  },
  title: [
    "Par habitant, ce n’est pas l’Allemagne : la Tchéquie accueille 36,1 Ukrainiens pour 1 000 habitants",
    "Par habitant, la Tchéquie accueille 36,1 Ukrainiens pour 1 000 habitants",
    "La protection temporaire, par habitant",
  ],
  limits: "Lecture : chaque pays pèse une case, quelle que soit sa taille. La disposition est dessinée à la main, pas mesurée.",
  source: `Sources : Eurostat (migr_asytpsm), ${month} · population 2023, via Our World in Data`,
  alt: (r) =>
    `Grille d’hexagones, un par pays européen. Par nombre, ${article(r.largestCount.iso)} accueille le plus d’Ukrainiens sous protection temporaire ; ` +
    `pour 1 000 habitants, ${article(r.topRate.iso)} est en tête avec ${one(r.topRate.rate)}, ${article(r.largestCount.iso)} est ${r.largestCount.rateRank}e avec ${one(r.largestCount.rate)}.`,
  // The claim checked against the drawn data (CONTRACT.md).
  check(r) {
    if (r.topRate.iso !== "CZE" || Math.round(r.topRate.rate * 10) !== 361) throw new Error(`the title says Czechia leads with 36,1 per 1 000; ${r.topRate.iso} leads with ${r.topRate.rate.toFixed(1)}`);
    if (r.largestCount.iso !== "DEU") throw new Error(`the title says it is not Germany, the largest host by count; the largest is ${r.largestCount.iso}`);
    if (!(r.largestCount.rateRank > 5)) throw new Error(`a card says the largest host falls a long way per inhabitant; it is ${r.largestCount.rateRank}th`);
    const topClass = r.byCount.filter((c) => c.count >= 500000).map((c) => c.iso);
    if (topClass.join() !== [r.largestCount.iso, r.secondCount.iso].join()) throw new Error("card 2 says the two largest counts are the darkest cells; the top count class holds other countries");
  },
};
