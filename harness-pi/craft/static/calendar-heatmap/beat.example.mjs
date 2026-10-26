// beat.mjs for the worked example proof/static-calendar-heatmap-geneva — "Geneva held N days in a row
// above 20 °C in 2024". Every number on the plate is COMPUTED from data.json; the run, the bins and
// the monthly means come from calendar.mjs, the same functions the render draws with.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { toDays, longestRun, monthlyMeans } from "./calendar.mjs";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [DATE, VALUE] = [col("date"), col("mean_c")];

// One reading per day of the year.
const readings = table.rows.map((r) => ({ date: String(r[DATE]), value: Number(r[VALUE]) }));
const { year, days } = toDays(readings);

const THRESHOLD = 20;
const UNIT = "°C";
const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
// Written out: « Juin » and « Juillet » both cut to « Jui ».
const MONTHS_SHORT = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];

const best = longestRun(days, THRESHOLD);
const hottest = days.reduce((a, b) => (b.value > a.value ? b : a));
const coldest = days.reduce((a, b) => (b.value < a.value ? b : a));
const means = monthlyMeans(days);
const warmest = means.reduce((a, b) => (b.mean > a.mean ? b : a));
const july = means[6];

const plain = (t) => t.replace(/[   ]/g, " ");
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const asDay = (d) => `${d.day} ${MONTHS[d.month].toLowerCase()}`;

export default {
  eyebrow: "Climat · Genève",
  days: readings,
  threshold: THRESHOLD,
  months: MONTHS,
  monthsShort: MONTHS_SHORT,
  unit: UNIT,
  keyLabel: `moyenne du jour, en ${UNIT}`,
  missingLabel: "date qui n’existe pas",
  format: (v) => plain(v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })),
  title: [
    `Genève a tenu ${best.length} jours d’affilée au-dessus de ${THRESHOLD} ${UNIT} en ${year}`,
    `${best.length} jours d’affilée au-dessus de ${THRESHOLD} ${UNIT} à Genève`,
    `Genève, jour par jour, en ${year}`,
  ],
  limits: [
    `Température moyenne de chaque jour de ${year} à Genève, une case par jour. La série la plus longue au-dessus de ${THRESHOLD} ${UNIT} court du ${asDay(best.from)} au ${asDay(best.to)}. ` +
      `Le mois le plus chaud est ${MONTHS[warmest.month].toLowerCase()} (${one(warmest.mean)}) et non juillet (${one(july.mean)}) ; ` +
      `le jour le plus chaud est le ${asDay(hottest)} (${one(hottest.value)}), le plus froid le ${asDay(coldest)} (${one(coldest.value)}).`,
    `Température moyenne de chaque jour de ${year} à Genève, une case par jour. La série la plus longue au-dessus de ${THRESHOLD} ${UNIT} court du ${asDay(best.from)} au ${asDay(best.to)}.`,
    `Température moyenne de chaque jour de ${year} à Genève, une case par jour.`,
  ],
  reading: [
    `Lecture : une ligne par mois, une colonne par quantième. Les six classes contiennent à peu près autant de jours chacune et leur borne est écrite en ${UNIT}. ` +
      `Le trait accent entoure la série du titre ; les cases pâles sans valeur sont des dates qui n’existent pas.`,
    `Lecture : une ligne par mois, une colonne par quantième. Les six classes contiennent à peu près autant de jours chacune et leur borne est écrite en ${UNIT}.`,
    `Lecture : une ligne par mois, une colonne par quantième.`,
  ],
  source: `Source : Open-Meteo (réanalyse ERA5), moyenne journalière à 2 m, Genève · données ${year}, gelées le 9 septembre 2026`,
  alt:
    `Calendrier en couleurs : la température moyenne de chacun des ${days.length} jours de ${year} à Genève, une ligne par mois et une colonne par quantième. ` +
    `Le bloc entouré court du ${asDay(best.from)} au ${asDay(best.to)}, ${best.length} jours consécutifs au-dessus de ${THRESHOLD} ${UNIT}. ` +
    `Le jour le plus chaud est le ${asDay(hottest)} (${one(hottest.value)}) et le plus froid le ${asDay(coldest)} (${one(coldest.value)}).`,
  evidenceLevels: 2,
  check() {
    if (best.length < 7) throw new Error(`the longest run above ${THRESHOLD} ${UNIT} is ${best.length} days — not a run worth a headline`);
    if (warmest.month === 6) throw new Error(`the warmest month is July; the standfirst says it is not`);
  },
};
