// beat.mjs for the worked example proof/scrolly-boxplot-france-co2-decades — "The CO2 emissions per
// French person peaked in the 1970s", as a scrolly. Every number in a card is COMPUTED: each
// decade's box, the outlier, the highest year and the widest decade come from render-beat.mjs as
// `r` and are only WORDED here.
import { readTable, series } from "./series.mjs";

const table = readTable(import.meta.dirname);
// The one series, tonnes per person, every year from 1950.
const data = series(table, { x: "Year", y: "CO₂ emissions per capita", from: 1950 });

/** One decimal for a year's value, two for a median (the render asks for each). */
const format = (v, decimals = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export default {
  lang: "fr",
  eyebrow: "Climat · France",
  data,
  unit: "tonnes de CO₂ par personne",
  format,
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    years: (r) => `Les émissions de CO₂ d’un Français moyen, chaque année de ${r.first.year} à ${r.last.year}. Elles montent jusqu’à ${format(r.peakYear.value)} tonnes en ${r.peakYear.year}, puis redescendent.`,
    decades: () => `Rangeons chaque année dans sa décennie.`,
    boxes: (r) =>
      `Chaque décennie devient une boîte : la moitié centrale des années, la médiane en trait, les moustaches jusqu’aux années les plus éloignées. ${r.outlier.year}, à ${format(r.outlier.value)} t, reste un point à part.`,
    medians: (r) =>
      `Les médianes : ${format(r.firstBox.median, 2)} t dans les années ${r.firstBox.decade}, ${format(r.peakBox.median, 2)} t au sommet dans les années ${r.peakBox.decade}, puis plus bas à chaque décennie, jusqu’à ${format(r.lastBox.median, 2)} t.`,
    spread: (r) =>
      `Les années ${r.widest.decade} sont les plus étalées : de ${format(r.widest.min)} à ${format(r.widest.max)} t. La dernière boîte ne compte que ${r.lastBox.n} ans, de ${r.lastBox.decade} à ${r.last.year}.`,
  },
  // The short accent note in the header while each card is read.
  notes: {
    years: (r) => `${r.peakYear.year} : ${format(r.peakYear.value)} t`,
    decades: (r) => `${r.decades} décennies`,
    boxes: (r) => `${r.outlierCount} année aberrante : ${r.outlier.year}`,
    medians: (r) => `médiane : ${format(r.peakBox.median, 2)} puis ${format(r.lastBox.median, 2)} t, −${Math.round(r.drop)} %`,
    spread: (r) => `années ${r.widest.decade} : les plus étalées`,
    reading: (r) => `${r.first.year}–${r.last.year}, par décennie`,
  },
  // The labels on the plot. A decade `b` is { decade, n, q1, median, q3, lo, hi, min, max }.
  labels: {
    decade: (b) => `${b.decade}`,
    median: (b) => `${format(b.median, 2)} t`,
    count: (b) => `${b.n} ans`,
    spread: (b) => `${format(b.min)} à ${format(b.max)} t`,
    peak: (r) => `${r.peakYear.year} : ${format(r.peakYear.value)} t`,
    outlier: (r) => `${r.outlier.year} : ${format(r.outlier.value)} t`,
    rule: () => `moustaches : 1,5 × l’écart interquartile`,
  },
  title: [
    "Les émissions de CO₂ par Français ont culminé dans les années 1970",
    "Le CO₂ par Français, au plus haut dans les années 1970",
    "Le CO₂ par Français, décennie par décennie",
  ],
  // The last card: the accounting the boxes rest on.
  limits:
    "Lecture : chaque boîte couvre la moitié centrale des années de sa décennie ; les moustaches s’arrêtent à 1,5 fois l’écart interquartile, au-delà une année est un point.",
  source: "Source : Global Carbon Budget 2025, via Our World in Data · France",
  alt: (r) =>
    `Boîtes à moustaches : les émissions annuelles de CO₂ par Français, regroupées par décennie de ${r.first.year} à ${r.last.year}. ` +
    `La médiane culmine dans les années ${r.peakBox.decade} à ${format(r.peakBox.median, 2)} tonnes, puis baisse à chaque décennie jusqu’à ${format(r.lastBox.median, 2)} tonnes.`,
  evidenceLevels: 3,
  check(r) {
    if (r.peakBox.decade !== 1970) throw new Error(`the title says the median peaked in the 1970s; it peaked in the ${r.peakBox.decade}s`);
    // Card 4 says lower every decade after the peak; card 5 that only the last box is partial; card 3 names one outlier.
    if (!r.lowerEveryDecadeAfterPeak) throw new Error(`card 4 says every decade after the peak is lower; one is not`);
    if (r.partial.length !== 1 || r.partial[0].decade !== r.lastBox.decade) throw new Error(`card 5 says only the last decade is partial; partial: ${r.partial.map((b) => b.decade).join(", ")}`);
    if (!r.outlier) throw new Error(`card 3 names an outlier; the 1.5 × IQR fence finds none`);
  },
};
