// beat.mjs for the worked example proof/video-bullet-low-carbon-share — « Pologne : +17,3 points de bas-carbone depuis
// 2015, toujours la seule sous la moitié », told in time. Every number the video draws is COMPUTED from data.json; the
// gains, the row that gained most and the re-sorting are found by render-beat.mjs and checked here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const LOW_CARBON = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower", "Nuclear"];
const ALL = [...LOW_CARBON, "Gas", "Oil", "Coal"];
const FRENCH = { France: "France", Germany: "Allemagne", Norway: "Norvège", Poland: "Pologne", Sweden: "Suède", Switzerland: "Suisse" };

// The low-carbon share of one country's electricity in one year, in percent.
const shareOf = (entity, year) => {
  const row = table.rows.find((r) => r[col("Entity")] === entity && Number(r[col("Year")]) === year);
  const sum = (cols) => cols.reduce((s, c) => s + Number(row[col(c)]), 0);
  return (sum(LOW_CARBON) / sum(ALL)) * 100;
};
const entities = [...new Set(table.rows.map((r) => r[col("Entity")]))];
const rows = entities.map((e) => ({ name: e, label: FRENCH[e] ?? e, marker: shareOf(e, 2015), measure: shareOf(e, 2024) }));

// The claim: Poland gained most, by 17,3 points, and is the only one still under half.
const byGain = [...rows].sort((a, b) => b.measure - b.marker - (a.measure - a.marker));
const top = byGain[0];
const under = rows.filter((r) => r.measure < 50);

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  rows,
  threshold: 50,
  markerName: "2015",
  measureName: "2024",
  restName: "fossile",
  axisName: "part du bas-carbone dans l’électricité",
  gainUnit: "pts",
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: [
    "Pologne : +17,3 points de bas-carbone depuis 2015, toujours la seule sous la moitié",
    "Pologne : +17,3 points de bas-carbone depuis 2015",
  ],
  source: [
    "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
    "Source : Ember, Energy Institute, via Our World in Data",
  ],
  evidenceLevels: 3,
  check() {
    if (top.name !== "Poland") throw new Error(`the row that gained most is ${top.name}, not Poland`);
    if (Math.round((top.measure - top.marker) * 10) / 10 !== 17.3) throw new Error(`Poland gained ${(top.measure - top.marker).toFixed(2)} points, not 17,3`);
    if (under.length !== 1 || under[0] !== top) throw new Error(`${under.length} rows are under half in 2024`);
  },
};
