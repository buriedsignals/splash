// beat.mjs for the worked example proof/video-calendar-heatmap-geneva — « 31 jours d’affilée au-dessus de 20 °C à Genève
// en 2024 », told in time. Every number the video draws is COMPUTED from data.json; the bins, the warm days and the
// longest run at or above the threshold are found by render-beat.mjs and checked here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [DATE, MEAN] = [col("date"), col("mean_c")];

// One value a day: the daily mean temperature.
const days = table.rows.map((r) => ({ date: r[DATE], value: Number(r[MEAN]) }));

// The claim: the longest run of days at or above 20 °C is 31 days.
const THRESHOLD = 20;
let longest = 0;
let run = 0;
for (const d of days) {
  run = d.value >= THRESHOLD ? run + 1 : 0;
  longest = Math.max(longest, run);
}
const jours = (n) => `${n} jour${n > 1 ? "s" : ""}`;

export default {
  lang: "fr",
  eyebrow: "Climat · Genève",
  days,
  threshold: THRESHOLD,
  months: ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"],
  unit: "°C",
  // The two counters: the days at or above the threshold as the curve draws, then the run as its outline runs.
  warm: (n) => `${jours(n)} au-dessus de 20 °C`,
  run: (n) => `${jours(n)} d’affilée`,
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: ["31 jours d’affilée au-dessus de 20 °C à Genève en 2024", "31 jours d’affilée au-dessus de 20 °C à Genève"],
  source: ["Source : Open-Meteo (réanalyse ERA5), moyenne journalière à 2 m, Genève", "Source : Open-Meteo (réanalyse ERA5), Genève"],
  evidenceLevels: 2,
  check() {
    if (longest !== 31) throw new Error(`the longest run at or above ${THRESHOLD} °C is ${longest} days, not 31`);
  },
};
