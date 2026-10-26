// beat.mjs for the worked example proof/video-line-swiss-co2 — « En 2024, la Suisse a émis moins de CO₂ sur son
// territoire qu'en 1967 », told in time. Every number the video draws is COMPUTED from data.json; the landing of the
// level line (the year the rising line last passed through today's reading before the peak) is found by render-beat.mjs
// and checked here.
import { readTable, series } from "./series.mjs";

const table = readTable(import.meta.dirname);
// One reading per year, in million tonnes (the column is in tonnes).
const data = series(table, { x: "year", y: "co2_tonnes", from: 1950 }).map((d) => ({ year: d.year, value: d.value / 1e6 }));

const peak = data.reduce((a, b) => (b.value > a.value ? b : a));
const last = data[data.length - 1];
// The claim: the last reading is under 1967's, and 1966 is the last year before the peak at or under it.
const level1967 = data.find((d) => d.year === 1967).value;
const lastAtOrUnder = data.filter((d) => d.year < peak.year && d.value <= last.value).at(-1);

export default {
  lang: "fr",
  eyebrow: "Climat · Suisse",
  data,
  unit: "Mt",
  peakLabel: `pic de ${peak.year}`,
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: ["En 2024, la Suisse a émis moins de CO₂ sur son territoire qu’en 1967", "La Suisse repasse sous son niveau de 1967"],
  source: [
    "Source : Global Carbon Budget 2025, via Our World in Data · émissions territoriales",
    "Source : Global Carbon Budget 2025, via Our World in Data",
  ],
  evidenceLevels: 3,
  check() {
    if (last.year !== 2024) throw new Error(`the last reading is ${last.year}, not 2024`);
    if (!(last.value < level1967)) throw new Error(`2024 (${last.value}) is not under the 1967 level (${level1967})`);
    if (lastAtOrUnder?.year !== 1966) throw new Error(`the last year before the peak at or under 2024's reading is ${lastAtOrUnder?.year}, not 1966`);
  },
};
