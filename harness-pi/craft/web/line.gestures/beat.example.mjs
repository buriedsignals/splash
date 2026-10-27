// beat.mjs (web) for the worked example proof/co2-suisse — "En 2024, la Suisse a émis moins de CO₂ sur son territoire
// qu'en 1967." Every number on the plate is COMPUTED from data.json; the staging is the gestures below.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR, VALUE] = [col("Entity"), col("Year"), col("Annual CO₂ emissions")];

// One reading per year, in millions of tonnes, from 1950.
const points = table.rows
  .filter((r) => r[ENTITY] === "Switzerland" && Number(r[YEAR]) >= 1950)
  .map((r) => ({ series: "Suisse", t: Number(r[YEAR]), value: Number(r[VALUE]) / 1e6 }));
const at = (year) => points.find((p) => p.t === year).value;
const last = points.at(-1);
const peak = points.reduce((a, b) => (b.value > a.value ? b : a));
const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/[  ]/g, " ");

export default {
  eyebrow: "Climat · Suisse",
  points,
  unit: "Mt de CO₂ par an",
  format: (v) => fr(v),
  title: "En 2024, la Suisse a émis moins de CO₂ sur son territoire qu'en 1967.",
  limits: "Émissions territoriales seulement, hors biens importés et aviation internationale.",
  source: "Source : Global Carbon Budget 2025, via Our World in Data",
  alt: `Courbe des émissions territoriales suisses de CO₂ de 1950 à ${last.t} : un pic en ${peak.t}, puis une baisse jusqu'à ${fr(last.value)} Mt, sous les ${fr(at(1967))} Mt de 1967.`,
  // The words of the option that shows the page as it lands.
  restLabel: "La courbe entière",
  gestures: [
    { do: "highlight", mark: "Suisse" },
    { do: "name", mark: String(peak.t), note: `pic de ${peak.t} : ${fr(peak.value)} Mt` },
    { do: "compare", marks: [String(last.t), "1967"], label: "Contre 1967", note: `${last.t} : ${fr(last.value)} Mt, sous les ${fr(at(1967))} Mt de 1967` },
  ],
  check() {
    if (!(last.value < at(1967))) throw new Error(`${last.t} (${last.value}) is not below the 1967 level (${at(1967)})`);
  },
};
