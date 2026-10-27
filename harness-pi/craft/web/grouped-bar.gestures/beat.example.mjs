// beat.mjs for the worked example proof/web-grouped-bar-wind-vs-solar — "Dans 5 de ces 6 pays l’éolien devance le
// solaire — la Suisse est l’exception" — written for the paired gesture kit. Every number is COMPUTED from data.json:
// each source's SHARE of the country's own 2024 generation.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);
const NAMES = { France: "France", Germany: "Allemagne", Norway: "Norvège", Poland: "Pologne", Sweden: "Suède", Switzerland: "Suisse" };
const SOURCES = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower", "Nuclear", "Gas", "Oil", "Coal"];

const rows = data.rows
  .filter((r) => NAMES[r[at("Entity")]] && Number(r[at("Year")]) === 2024)
  .map((r) => {
    const total = SOURCES.reduce((s, c) => s + Number(r[at(c)]), 0);
    return { name: NAMES[r[at("Entity")]], values: [(Number(r[at("Wind")]) / total) * 100, (Number(r[at("Solar")]) / total) * 100] };
  })
  .sort((a, b) => b.values[0] - b.values[1] - (a.values[0] - a.values[1]));
const reversals = rows.filter((r) => r.values[1] > r.values[0]);
const swiss = rows.find((r) => r.name === "Suisse");
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default {
  eyebrow: "Énergie · Europe",
  series: ["Éolien", "Solaire"],
  rows,
  unit: "% de la production électrique",
  gestures: [
    { do: "highlight", mark: "Suisse" },
    { do: "annotate", mark: "Suisse", note: "Solaire devant éolien" },
    { do: "compare", marks: ["Suisse · Solaire", "Suisse · Éolien"], note: `${one(swiss.values[1])} % contre ${one(swiss.values[0])} %` },
    { do: "reorder", value: "descending" },
  ],
  restLabel: "Par écart",
  format: one,
  title: "Dans 5 de ces 6 pays l’éolien devance le solaire — la Suisse est l’exception",
  limits: "Part de la production électrique nationale en 2024. Les pays sont classés par l’écart entre les deux.",
  source: "Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data",
  alt: `Barres groupées : part de l’éolien et du solaire dans la production électrique de ${rows.length} pays en 2024 ; le solaire ne devance l’éolien qu’en Suisse.`,
  check() {
    if (rows.length !== 6 || reversals.length !== 1 || reversals[0].name !== "Suisse")
      throw new Error(`the exception is ${reversals.map((r) => r.name).join(", ") || "none"}, not Switzerland alone`);
  },
};
