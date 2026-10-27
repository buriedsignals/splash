// beat.mjs for the worked example proof/web-grouped-bar-wind-vs-solar — "Dans 5 de ces 6 pays l’éolien devance le
// solaire — la Suisse est l’exception" — written for the paired gesture kit. Every number is COMPUTED from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);
const NAMES = { France: "France", Germany: "Allemagne", Norway: "Norvège", Poland: "Pologne", Sweden: "Suède", Switzerland: "Suisse" };
const SOURCES = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower", "Nuclear", "Gas", "Oil", "Coal"];

// The measure the takeaway speaks of: each source's SHARE of the country's own generation in 2024, in %.
const rows = data.rows
  .filter((r) => NAMES[r[at("Entity")]] && r[at("Year")] === 2024)
  .map((r) => {
    const total = SOURCES.reduce((s, c) => s + r[at(c)], 0);
    return { name: NAMES[r[at("Entity")]], values: [(r[at("Wind")] / total) * 100, (r[at("Solar")] / total) * 100] };
  })
  // ordered by the gap between the two series, wind's lead first
  .sort((a, b) => b.values[0] - b.values[1] - (a.values[0] - a.values[1]));
const swiss = rows.find((r) => r.name === "Suisse");
const reversals = rows.filter((r) => r.values[1] > r.values[0]);
const plain = (s) => s.replace(/[  ]/g, " ");
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

export default {
  eyebrow: "Énergie · Europe",
  series: ["Éolien", "Solaire"],
  rows,
  unit: "%",
  gestures: [
    { do: "highlight", mark: "Suisse" },
    { do: "compare", marks: ["Suisse · Solaire", "Suisse · Éolien"], note: `solaire ${one(swiss.values[1])} % contre éolien ${one(swiss.values[0])} %` },
  ],
  format: one,
  title: "Dans 5 de ces 6 pays l’éolien devance le solaire — la Suisse est l’exception",
  limits: [
    "Part de la production électrique nationale en 2024 ; six pays européens seulement. En %, pays classés par l’avance de l’éolien.",
    "Part de la production électrique nationale en 2024 ; six pays européens seulement.",
  ],
  source: "Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data",
  alt: (drawn) => `Barres groupées : part de l’éolien et du solaire dans la production électrique de ${drawn.length} pays européens en 2024. L’éolien devance le solaire partout sauf en ${reversals.map((r) => r.name).join(", ")}.`,
  check() {
    if (rows.length !== 6 || reversals.length !== 1 || reversals[0].name !== "Suisse")
      throw new Error(`the exception is ${reversals.map((r) => r.name).join(", ") || "none"}, not Switzerland alone`);
  },
};
