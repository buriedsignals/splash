// beat.mjs for the worked example proof/static-radar-electricity-mix — "La France et l’Allemagne produisent presque
// autant d’électricité, avec des mix opposés" — written for the gesture kit: the staging is the `gestures` list. Each
// spoke is a share of the country's own production; every number is COMPUTED from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const YEAR = 2024;
// The spokes, in editorial order: renewables, nuclear, fossil, clockwise from twelve.
const SPOKES = [
  ["Wind", "Éolien"], ["Solar", "Solaire"], ["Hydropower", "Hydraulique"], ["Bioenergy", "Bioénergie"],
  ["Other renewables", "Autres renouv."], ["Nuclear", "Nucléaire"], ["Gas", "Gaz"], ["Coal", "Charbon"], ["Oil", "Pétrole"],
];
const ITEMS = [["France", "France"], ["Germany", "Allemagne"]];
const entities = ITEMS.map(([entity, name]) => {
  const row = table.rows.find((r) => r[col("Entity")] === entity && Number(r[col("Year")]) === YEAR);
  const values = SPOKES.map(([c]) => Number(row[col(c)]));
  const total = values.reduce((a, b) => a + b, 0);
  return { name, total, values: Object.fromEntries(SPOKES.map(([, label], i) => [label, (values[i] / total) * 100])) };
});
const [fr, de] = entities;
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/[  ]/g, " ");

export default {
  eyebrow: "Énergie · Europe",
  axes: SPOKES.map(([, label]) => label),
  entities,
  // The one radial scale: every spoke runs 0 to 80 %.
  ceiling: 80,
  // A video takes exactly three gestures: France in the accent with its nuclear, Germany ringed, their wind compared.
  gestures: [
    { do: "highlight", mark: "France", note: `${one(fr.values["Nucléaire"])} % de nucléaire` },
    { do: "highlight", mark: "Allemagne" },
    { do: "compare", marks: ["Allemagne · Éolien", "France · Éolien"], note: `${one(de.values["Éolien"])} % contre ${one(fr.values["Éolien"])} %` },
  ],
  format: (v) => `${Math.round(v)} %`,
  title: "La France et l’Allemagne produisent presque autant d’électricité, avec des mix opposés",
  limits: [
    `Part de chaque source dans la production électrique du pays, en ${YEAR}. France ${one(fr.total)} TWh, Allemagne ${one(de.total)} TWh.`,
    `Part de chaque source dans la production électrique du pays, en ${YEAR}.`,
  ],
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: `Radar à neuf rayons : la part de chaque source dans la production électrique de la France et de l’Allemagne en ${YEAR}. Le polygone français est étiré vers le nucléaire (${one(fr.values["Nucléaire"])} %), celui de l’Allemagne vers l’éolien (${one(de.values["Éolien"])} %).`,
  check() {
    if (!(Math.max(fr.total, de.total) / Math.min(fr.total, de.total) < 1.15)) throw new Error("France and Germany no longer generate nearly the same total");
    if (!(fr.values["Nucléaire"] > 50 && de.values["Nucléaire"] < 1)) throw new Error("the two mixes are no longer opposite on nuclear");
  },
};
