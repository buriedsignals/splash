// beat.mjs for the worked example proof/scrolly-world-population — "World population passed 8
// billion in 2022", as a scrolly. Every number in a card is COMPUTED: each billion's crossing year,
// the years it took, the growth rate's peak and last value come from render-beat.mjs as `r` and are
// only WORDED here.
import { readTable, series } from "./series.mjs";

const table = readTable(import.meta.dirname);
// The one series, in billions (the drive's level scale runs 0 to 9 units, every whole unit a milestone).
const data = series(table, { x: "Year", y: "Population" }).map((d) => ({ year: d.year, value: d.value / 1e9 }));

const fr = (v, digits) => v.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const format = (v) => fr(v, 2);
const formatRate = (v) => fr(v, 1);
const listOf = (xs) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(", ")} et ${xs[xs.length - 1]}`);

export default {
  lang: "fr",
  eyebrow: "Démographie · Monde",
  data,
  unit: "population mondiale, en milliards",
  gapUnit: "années pour chaque milliard",
  rateUnit: "croissance annuelle, en %",
  format,
  formatRate,
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    first: (r) => `En ${r.first.year}, la Terre compte ${format(r.first.value)} milliard d’habitants. Le premier milliard est atteint en ${r.firstCrossing.year}.`,
    second: (r) => `Le deuxième arrive en ${r.second.year}, ${r.second.gap} ans plus tard.`,
    all: (r) => `Puis tout s’accélère : ${listOf(r.crossings.slice(2).map((k) => `${k.level} milliards en ${k.year}`))}. En ${r.last.year}, ${format(r.last.value)} milliards.`,
    gaps: (r) => `Le temps qu’a pris chaque milliard : ${r.second.gap} ans pour le deuxième, ${r.third.gap} pour le troisième, puis ${listOf(r.crossings.slice(3).map((k) => String(k.gap)))} ans.`,
    rate: (r) => `La croissance, elle, ralentit. Elle a culminé à ${formatRate(r.peakRate.value)} % par an en ${r.peakRate.year} ; en ${r.last.year}, ${formatRate(r.lastRate.value)} %. La population monte encore, mais moins vite.`,
  },
  // The short accent note in the header while each card is read.
  notes: {
    first: (r) => `${r.firstCrossing.year} : 1 milliard`,
    second: (r) => `${r.second.year} : 2 milliards`,
    all: (r) => `${r.latest.year} : ${r.latest.level} milliards`,
    gaps: (r) => `${r.second.gap} ans, puis ${r.latest.gap}`,
    rate: (r) => `pic : ${formatRate(r.peakRate.value)} % en ${r.peakRate.year}`,
    reading: (r) => `${format(r.last.value)} milliards en ${r.last.year}`,
  },
  // The labels on the plot. A crossing `k` is { level, year, gap } (gap: years since the previous).
  labels: {
    crossing: (k) => `${k.level} Md · ${k.year}`,
    gapName: (k) => `${k.level - 1} à ${k.level} Md`,
    gapText: (k) => `${k.gap} ans`,
    peak: (r) => `${formatRate(r.peakRate.value)} % · ${r.peakRate.year}`,
    last: (r) => `${format(r.last.value)} Md`,
    rateLast: (r) => `${formatRate(r.lastRate.value)} %`,
  },
  title: ["La population mondiale a dépassé 8 milliards en 2022", "8 milliards d’humains depuis 2022", "La population mondiale depuis 1800"],
  // The last card: the accounting the series rests on.
  limits: `Lecture : la surface est la population mondiale, de ${data[0].year} à ${data[data.length - 1].year}, en milliards.`,
  source: "Source : HYDE (2023), Gapminder (2022) et ONU, World Population Prospects (2024), via Our World in Data",
  alt: (r) =>
    `Aire : la population mondiale de ${r.first.year} à ${r.last.year}, de ${format(r.first.value)} à ${format(r.last.value)} milliards. ` +
    `Le premier milliard est atteint en ${r.firstCrossing.year}, le deuxième en ${r.second.year}, le huitième en ${r.latest.year} ; la croissance annuelle a culminé en ${r.peakRate.year}.`,
  evidenceLevels: 3,
  check(r) {
    if (r.latest.level !== 8 || r.latest.year !== 2022) throw new Error(`the title says the world passed 8 billion in 2022; the series last crosses ${r.latest.level} billion in ${r.latest.year}`);
    // Card 4 says the second billion took over a century and each of the last five 15 years or less.
    const recent = r.crossings.slice(3);
    if (!(r.second.gap > 100 && recent.every((k) => k.gap <= 15))) throw new Error(`card 4 says the second billion took over a century and each of the last five 15 years or less; ${r.crossings.map((k) => k.gap).join(", ")}`);
    // Card 5 says growth peaked in the 1960s, has more than halved since, and is still positive.
    if (!(r.peakRate.year >= 1960 && r.peakRate.year <= 1970 && r.lastRate.value < r.peakRate.value / 2)) throw new Error(`card 5 says growth peaked in the 1960s and has more than halved since; peak ${r.peakRate.year} ${r.peakRate.value.toFixed(2)}, last ${r.lastRate.value.toFixed(2)}`);
    if (!(r.lastRate.value > 0)) throw new Error("card 5 says the population is still rising");
  },
};
