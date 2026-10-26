// beat.mjs for the worked example proof/scrolly-line-swiss-co2 — "In 2024 Switzerland emitted less
// CO2 on its territory than in 1967", as a scrolly. Every number in a card is COMPUTED: the
// reference, the peak, the plateau's floor, the crossing and the gaps come from render-beat.mjs as
// `r` and are only WORDED here.
import { readTable, series } from "./series.mjs";

const table = readTable(import.meta.dirname);
// The one series, in million tonnes, from 1950: every year present.
const data = series(table, { x: "Year", y: "Annual CO₂ emissions", from: 1950 }).map((d) => ({ year: d.year, value: d.value / 1e6 }));

// Rounded to tenths first, so every sentence and every label round a reading the same way.
const format = (v) => (Math.round(v * 10) / 10).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const two = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const mt = (v) => `${format(v)} Mt`;
const SPELLED = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"];

export default {
  lang: "fr",
  eyebrow: "Climat · Suisse",
  data,
  unit: "millions de tonnes de CO₂ (Mt)",
  format,
  // The three years that place the gestures: the rule (card 1), the plateau's end (card 3), the
  // close-up's first year (card 5).
  referenceYear: 1967,
  plateauTo: 2010,
  zoomFrom: 2015,
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    rise: (r) => `Le CO₂ émis sur le territoire suisse, année après année. De ${r.first.year} à ${r.reference.year}, il triple : de ${mt(r.first.value)} à ${mt(r.reference.value)}. Gardons ce niveau de ${r.reference.year} en repère.`,
    peak: (r) => `La montée continue ${SPELLED[r.yearsToPeak]} ans de plus, jusqu’à ${mt(r.peak.value)} en ${r.peak.year} : le plus haut de toute la série.`,
    plateau: (r) => `Puis un long plateau. De ${r.plateau.from} à ${r.plateau.to}, jamais sous ${mt(r.plateau.floor.value)} ; en ${r.runnerUp.year}, ${mt(r.runnerUp.value)}, à ${two(r.peakGap)} Mt du pic.`,
    cross: (r) => `Après ${r.plateau.to}, la courbe descend. En ${r.cross.year}, elle passe sous le niveau de ${r.reference.year}, pour la première fois.`,
    zoom: (r) => `De près : ${mt(r.cross.value)} en ${r.cross.year}, ${mt(r.last.value)} en ${r.last.year}. Une légère remontée, mais toujours ${mt(r.gap)} sous ${r.reference.year}.`,
  },
  // The short accent note in the header while each card is read.
  notes: {
    rise: (r) => `${r.reference.year} : ${mt(r.reference.value)}`,
    peak: (r) => `${r.peak.year} : ${mt(r.peak.value)}`,
    plateau: (r) => `${r.peak.year}–${r.plateau.to} : le plateau`,
    cross: (r) => `${r.cross.year} : ${mt(r.cross.value)}, sous ${r.reference.year}`,
    zoom: (r) => `${r.zoomFrom}–${r.last.year}, de près`,
    reading: (r) => `${r.last.year} : ${mt(r.last.value)}`,
  },
  // The labels on the plot. Some directions set the annotation register in capitals, where "Mt"
  // would read as another unit: the furniture labels carry numbers only, the unit stands in the header.
  labels: {
    reference: (r) => `niveau de ${r.reference.year} : ${format(r.reference.value)}`,
    peak: (r) => `${r.peak.year} : ${format(r.peak.value)}`,
    runnerUp: (r) => `${r.runnerUp.year} : ${format(r.runnerUp.value)}`,
    plateau: (r) => `${r.peak.year}–${r.plateau.to} : jamais sous ${format(r.plateau.floor.value)}`,
    cross: (r) => `${r.cross.year} : ${mt(r.cross.value)}`,
    end: (r) => `${r.last.year} : ${mt(r.last.value)}`,
  },
  title: [
    "En 2024, la Suisse a émis moins de CO₂ sur son territoire qu’en 1967",
    "Le CO₂ émis en Suisse, repassé sous son niveau de 1967",
    "Le CO₂ émis en Suisse, 1950–2024",
  ],
  // The last card: the accounting the series rests on.
  limits: "Lecture : émissions sur le territoire suisse seulement, hors biens importés et aviation internationale.",
  source: `Source : Global Carbon Budget 2025, via Our World in Data · données ${data[data.length - 1].year}`,
  alt: (r) =>
    `Courbe des émissions territoriales suisses de CO₂, ${r.first.year} à ${r.last.year} : une montée jusqu’à un pic en ${r.peak.year}, ` +
    `un plateau jusqu’en ${r.plateau.to}, puis une baisse qui repasse sous le niveau de ${r.reference.year} en ${r.cross.year} et y reste en ${r.last.year}.`,
  evidenceLevels: 3,
  check(r) {
    if (r.last.year !== 2024 || r.reference.year !== 1967) throw new Error(`the title compares 2024 with 1967; the series ends in ${r.last.year} against ${r.reference.year}`);
    if (!(r.last.value < r.reference.value)) throw new Error(`the title says ${r.last.year} is under the ${r.reference.year} level; it is not (${r.last.value} against ${r.reference.value})`);
    // Card 1 says "il triple"; card 4 says the curve comes down after the plateau; card 5 says a slight rise.
    if (!(r.ratio >= 3 && r.ratio < 3.5)) throw new Error(`card 1 says emissions tripled from ${r.first.year} to ${r.reference.year}; the ratio is ${r.ratio.toFixed(2)}`);
    if (!(r.highestAfterPlateau.value < r.plateauEnd.value)) throw new Error(`card 4 says the curve came down after ${r.plateau.to}; ${r.highestAfterPlateau.year} is higher`);
    if (!(r.last.value > r.cross.value)) throw new Error(`card 5 says ${r.last.year} rose a little from ${r.cross.year}; it did not`);
  },
};
