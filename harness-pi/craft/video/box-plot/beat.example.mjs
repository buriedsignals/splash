// beat.mjs for the worked example proof/video-box-plot-france-co2-decades — « Les émissions de CO2 par personne en France
// ont culminé dans les années 1970 », told in time. Every number the video draws is COMPUTED from data.json; the decades,
// their boxes and the decade with the highest median are found by render-beat.mjs and checked here.
import { readTable, series } from "./series.mjs";

const table = readTable(import.meta.dirname);
// One reading per year, tonnes of CO2 per person, from 1950.
const data = series(table, { x: "year", y: "co2_t_per_person", from: 1950 });

// The claim: the median of the 1970s is the highest of the decades.
const median = (vs) => {
  const s = [...vs].sort((a, b) => a - b);
  const m = (s.length - 1) / 2;
  return (s[Math.floor(m)] + s[Math.ceil(m)]) / 2;
};
const starts = [...new Set(data.map((d) => Math.floor(d.year / 10) * 10))];
const medians = starts.map((start) => ({ start, median: median(data.filter((d) => Math.floor(d.year / 10) * 10 === start).map((d) => d.value)) }));
const peak = medians.reduce((a, b) => (b.median > a.median ? b : a));

export default {
  lang: "fr",
  eyebrow: "Climat · France",
  data,
  unit: "t",
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: ["Les émissions de CO2 par personne en France ont culminé dans les années 1970", "Le CO2 par personne en France a culminé dans les années 1970"],
  source: [`Source : Global Carbon Budget 2025, via Our World in Data · France, ${data[0].year}-${data.at(-1).year}`, "Source : Global Carbon Budget 2025, via Our World in Data"],
  evidenceLevels: 3,
  check() {
    if (peak.start !== 1970) throw new Error(`the highest decade median is the ${peak.start}s, not the 1970s`);
  },
};
