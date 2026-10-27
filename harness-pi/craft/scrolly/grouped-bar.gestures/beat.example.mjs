// beat.mjs for the worked example proof/web-grouped-bar-wind-vs-solar — « Dans 5 de ces 6 pays l’éolien devance le
// solaire — la Suisse est l’exception » — written for the paired gesture kit (scrolly): two bars per country from
// zero, wind full and solar pale; one card per gesture. Every number is COMPUTED from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);
const NAMES = { France: "France", Germany: "Allemagne", Norway: "Norvège", Poland: "Pologne", Sweden: "Suède", Switzerland: "Suisse" };
const SOURCES = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower", "Nuclear", "Gas", "Oil", "Coal"];

// The measure the takeaway speaks of: each source's SHARE of the country's own generation in 2024.
const groups = data.rows
  .filter((r) => NAMES[r[at("Entity")]] && r[at("Year")] === 2024)
  .map((r) => {
    const total = SOURCES.reduce((s, c) => s + r[at(c)], 0);
    return { name: NAMES[r[at("Entity")]], wind: (r[at("Wind")] / total) * 100, solar: (r[at("Solar")] / total) * 100 };
  })
  .sort((a, b) => b.wind - b.solar - (a.wind - a.solar));
const lead = groups.filter((g) => g.wind > g.solar).length;
const swiss = groups.find((g) => g.name === "Suisse");
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default {
  eyebrow: "Énergie · Europe",
  series: ["Éolien", "Solaire"],
  rows: groups.map((g) => ({ name: g.name, values: [g.wind, g.solar] })),
  unit: "% de la production électrique, 2024",
  format: one,
  gestures: [
    { do: "highlight", mark: "Éolien", card: `L’éolien est la plus longue des deux barres dans ${lead} des ${groups.length} pays.` },
    { do: "highlight", mark: "Suisse", card: `Sauf en Suisse : ${one(swiss.solar)} % de solaire contre ${one(swiss.wind)} % d’éolien.` },
    {
      do: "compare",
      marks: ["Suisse · Solaire", "Suisse · Éolien"],
      note: `${Math.round(swiss.solar / swiss.wind)} fois l’éolien`,
      card: `Posé sur l’éolien suisse, le solaire est ${Math.round(swiss.solar / swiss.wind)} fois plus long.`,
    },
  ],
  title: "Dans 5 de ces 6 pays l’éolien devance le solaire — la Suisse est l’exception",
  limits: "Part de la production électrique nationale en 2024. Les pays sont classés par l’écart entre les deux.",
  source: "Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data",
  alt: `Barres groupées : part de l’éolien et du solaire dans la production électrique de ${groups.length} pays européens en 2024. L’éolien devance le solaire dans ${lead} pays ; en Suisse, le solaire devance l’éolien.`,
  check() {
    if (lead !== 5 || groups.length !== 6) throw new Error(`wind leads solar in ${lead} of ${groups.length} countries, not 5 of 6`);
    if (!(swiss.solar > swiss.wind)) throw new Error("solar no longer leads wind in Switzerland");
  },
};
