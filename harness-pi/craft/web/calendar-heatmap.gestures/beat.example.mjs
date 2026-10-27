// beat.mjs for the worked example proof/static-calendar-heatmap-geneva — "Geneva held N days in a row above 20 °C in
// 2024" — written for the WEB gesture kit: the staging is the `gestures` list. Every number on the plate is COMPUTED from
// data.json; the run a trace outlines is found by the kit from the threshold the beat gives, and the beat computes the
// same run for its sentences.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [DATE, VALUE] = [col("date"), col("mean_c")];

// One reading per day of the year (a day the data does not give is left out: the grid draws it as missing).
// One year is drawn: the latest the data holds (the kit narrows to the takeaway's year too, and says so).
const readings = table.rows.filter((r) => Number.isFinite(Number(r[VALUE])) && r[VALUE] !== null).map((r) => ({ date: String(r[DATE]), value: Number(r[VALUE]) }));
const year = Math.max(...readings.map((d) => Number(d.date.slice(0, 4))));
const days = readings.filter((d) => d.date.startsWith(String(year)));

const THRESHOLD = 20;
const UNIT = "°C";
const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
// Written out: « Juin » and « Juillet » both cut to « Jui ».
const MONTHS_SHORT = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];

// The longest run of consecutive days at or above the threshold, in date order.
let best = [];
let cur = [];
for (const d of days) {
  if (d.value >= THRESHOLD) cur.push(d);
  else cur = [];
  if (cur.length > best.length) best = [...cur];
}
const monthOf = (d) => Number(d.date.slice(5, 7)) - 1;
const dayOf = (d) => Number(d.date.slice(8, 10));
const meanOf = (m) => {
  const of = days.filter((d) => monthOf(d) === m);
  return of.reduce((s, d) => s + d.value, 0) / of.length;
};
const warmest = Array.from({ length: 12 }, (_, m) => m).reduce((a, b) => (meanOf(b) > meanOf(a) ? b : a));
// The hottest day of that month.
const hottest = days.filter((d) => monthOf(d) === warmest).reduce((a, b) => (b.value > a.value ? b : a));

const plain = (t) => t.replace(/[   ]/g, " ");
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const asDay = (d) => `${dayOf(d)} ${MONTHS[monthOf(d)].toLowerCase()}`;

export default {
  eyebrow: "Climat · Genève",
  // The words of the option that shows the page as it lands (every control starts on it).
  restLabel: "L’année seule",
  days,
  months: MONTHS,
  monthsShort: MONTHS_SHORT,
  unit: UNIT,
  keyLabel: `moyenne du jour, en ${UNIT}`,
  missingLabel: "date inexistante ou sans relevé",
  format: (v) => plain(v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })),
  // The staging, in story order: the run outlined, the warmest month in the accent, its hottest day named.
  gestures: [
    { do: "trace", value: THRESHOLD, note: `${best.length} jours d’affilée au-dessus de ${THRESHOLD} ${UNIT}, du ${asDay(best[0])} au ${asDay(best.at(-1))}` },
    { do: "highlight", mark: MONTHS[warmest], note: `${MONTHS[warmest]}, mois le plus chaud : ${one(meanOf(warmest))} ${UNIT} en moyenne` },
    { do: "name", mark: hottest.date, note: `${asDay(hottest)} : ${one(hottest.value)} ${UNIT}` },
  ],
  title: [
    `Genève a tenu ${best.length} jours d’affilée au-dessus de ${THRESHOLD} ${UNIT} en ${year}`,
    `${best.length} jours d’affilée au-dessus de ${THRESHOLD} ${UNIT} à Genève`,
  ],
  limits: [
    `Température moyenne de chaque jour de ${year} à Genève, une case par jour ; une seule station, une seule année, et la moyenne du jour lisse les pics de l’après-midi.`,
    `Température moyenne de chaque jour de ${year} à Genève, une case par jour.`,
  ],
  reading: [
    `Lecture : une ligne par mois, une colonne par quantième. Les six classes contiennent à peu près autant de jours chacune ; leur borne est écrite en ${UNIT}.`,
    `Lecture : une ligne par mois, une colonne par quantième.`,
  ],
  source: `Source : Open-Meteo (réanalyse ERA5), moyenne journalière à 2 m, Genève · données ${year}`,
  alt:
    `Calendrier en couleurs : la température moyenne de chacun des ${days.length} jours de ${year} à Genève, une ligne par mois et une colonne par quantième. ` +
    `La série entourée court du ${asDay(best[0])} au ${asDay(best.at(-1))}, ${best.length} jours consécutifs au-dessus de ${THRESHOLD} ${UNIT}.`,
  evidenceLevels: 2,
  check() {
    if (best.length < 7) throw new Error(`the longest run above ${THRESHOLD} ${UNIT} is ${best.length} days — not a run worth a headline`);
  },
};
