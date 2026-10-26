// beat.mjs for the worked example proof/scrolly-calendar-heatmap-geneva — "Genève a tenu 31 jours
// d'affilée au-dessus de 20 °C en 2024", as a scrolly. Every number in a card is COMPUTED: the run, the
// warm days, the bins, the monthly means and the extremes come from render-beat.mjs as `r` and are only
// WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [DATE, MEAN] = [col("date"), col("mean_c")];

// Every day of the year, its daily mean drawn.
const days = table.rows.map((r) => ({ date: String(r[DATE]), value: Number(r[MEAN]) }));

const UNIT = "°C";
const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const asDay = (d) => `${d.day} ${d.monthName.toLowerCase()}`;

export default {
  lang: "fr",
  eyebrow: "Climat · Genève",
  days,
  threshold: 20,
  months: MONTHS,
  unit: UNIT,
  // A break of the key, and a day's value (in a cell, a monthly mean, an extreme).
  format: (v) => v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }),
  formatValue: one,
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    calendar: (r) => `Température moyenne de chaque jour de ${r.year} à Genève, une case par jour, une ligne par mois.`,
    bins: () => `Six classes, qui contiennent à peu près autant de jours chacune ; leur borne est écrite en ${UNIT}.`,
    warm: (r) => `${r.warmDays} jours de ${r.year} ont dépassé ${r.threshold} ${UNIT} en moyenne.`,
    run: (r) => `La série la plus longue court du ${asDay(r.run.from)} au ${asDay(r.run.to)} : ${r.run.length} jours d’affilée.`,
    month: (r) => `Le mois le plus chaud est ${r.warmest.name.toLowerCase()} (${one(r.warmest.mean)}), et non juillet (${one(r.means[6].mean)}).`,
    extremes: (r) => `Le jour le plus chaud est le ${asDay(r.hottest)} (${one(r.hottest.value)}), le plus froid le ${asDay(r.coldest)} (${one(r.coldest.value)}).`,
  },
  counterSuffix: (r) => `jours au-dessus de ${r.threshold} ${UNIT}`,
  meansLabel: "moyenne",
  extremeLabel: (d) => `${asDay(d)} · ${one(d.value)} ${UNIT}`,
  keyLabel: `moyenne du jour, en ${UNIT}`,
  missingLabel: "date qui n’existe pas",
  title: [
    "Genève a tenu 31 jours d’affilée au-dessus de 20 °C en 2024",
    "31 jours d’affilée au-dessus de 20 °C à Genève",
    "31 jours au-dessus de 20 °C",
  ],
  // Closes card 6, after the extremes: what the plate leaves out.
  limits: "Les cases pâles sans valeur sont des dates qui n’existent pas.",
  source: "Source : Open-Meteo (réanalyse ERA5), moyenne journalière à 2 m, Genève · données 2024, gelées le 9 septembre 2026",
  alt: (r) =>
    `Calendrier en couleurs : la température moyenne de chacun des ${r.count} jours de ${r.year} à Genève, une ligne par ` +
    `mois et une colonne par quantième. Le bloc entouré court du ${asDay(r.run.from)} au ${asDay(r.run.to)}, ${r.run.length} jours ` +
    `consécutifs au-dessus de ${r.threshold} ${UNIT}. Le jour le plus chaud est le ${asDay(r.hottest)} (${one(r.hottest.value)}) et le ` +
    `plus froid le ${asDay(r.coldest)} (${one(r.coldest.value)}).`,
  evidenceLevels: 2,
  check(r) {
    if (r.run.length !== 31) throw new Error(`the longest run at or above ${r.threshold} °C is ${r.run.length} days, not 31`);
    if (r.warmest.month === 6) throw new Error("card 5 says the warmest month is not July; on this data it is");
  },
};
