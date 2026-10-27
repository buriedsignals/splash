// beat.mjs for the worked example proof/web-grouped-bar-wind-vs-solar, as a PAIRED gesture video — "Dans 5 de ces 6
// pays l’éolien devance le solaire — la Suisse est l’exception". Three gestures, in story order: reveal, subject,
// conclusion. Every number is COMPUTED from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const NAMES = { France: "France", Germany: "Allemagne", Norway: "Norvège", Poland: "Pologne", Sweden: "Suède", Switzerland: "Suisse" };
const SOURCES = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower", "Nuclear", "Gas", "Oil", "Coal"];

// The measure the takeaway speaks of: each source's SHARE of the country's own generation in 2024, in %.
const rows = data.rows
  .filter((r) => NAMES[r[col("Entity")]] && r[col("Year")] === 2024)
  .map((r) => {
    const total = SOURCES.reduce((s, c) => s + r[col(c)], 0);
    return { name: NAMES[r[col("Entity")]], values: [(r[col("Wind")] / total) * 100, (r[col("Solar")] / total) * 100] };
  })
  // ordered by the gap between the two, so the exception sits at the end
  .sort((a, b) => b.values[0] - b.values[1] - (a.values[0] - a.values[1]));
const leads = rows.filter((r) => r.values[0] > r.values[1]);
const swiss = rows.find((r) => r.name === "Suisse");
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default {
  eyebrow: "Énergie · Europe",
  series: ["Éolien", "Solaire"],
  rows,
  unit: "% de la production d’électricité, 2024",
  gestures: [
    { do: "highlight", mark: "Éolien", note: `L’éolien devance le solaire dans ${leads.length} des ${rows.length} pays` },
    { do: "compare", marks: ["Suisse · Solaire", "Suisse · Éolien"], note: `solaire ${one(swiss.values[1])} %, éolien ${one(swiss.values[0])} %` },
    { do: "pull-back" },
  ],
  title: "Dans 5 de ces 6 pays l’éolien devance le solaire — la Suisse est l’exception",
  source: ["Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data", "Ember, Energy Institute, via OWID"],
  check() {
    if (leads.length !== 5 || rows.length !== 6) throw new Error(`wind leads solar in ${leads.length} of ${rows.length} countries, not 5 of 6`);
    if (!swiss || swiss.values[1] <= swiss.values[0]) throw new Error("Switzerland is not the exception");
  },
};
