// beat.mjs for the worked example proof/static-bullet-low-carbon-share, as a PAIRED gesture video — "Pologne : +17,3
// points de bas-carbone depuis 2015, et toujours la seule des six sous la moitié". Three gestures, in story order:
// reveal, subject, conclusion. Every number is COMPUTED from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR] = [col("Entity"), col("Year")];
const SOURCES = table.columns.slice(3).map((c) => c.name);
const LOW_CARBON = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower", "Nuclear"];
const shareFor = (entity, year) => {
  const row = table.rows.find((r) => r[ENTITY] === entity && Number(r[YEAR]) === year);
  if (!row) return null; // a missing year is a gap, drawn as n/a
  const total = SOURCES.reduce((s, c) => s + Number(row[col(c)]), 0);
  return (LOW_CARBON.reduce((s, c) => s + Number(row[col(c)]), 0) / total) * 100;
};
const FRENCH = { France: "France", Germany: "Allemagne", Norway: "Norvège", Poland: "Pologne", Sweden: "Suède", Switzerland: "Suisse" };
// One row per country: the comparative state (2015) then the measure (2024), sorted by the change.
const rows = [...new Set(table.rows.map((r) => r[ENTITY]))]
  .map((e) => ({ name: FRENCH[e] ?? e, values: [shareFor(e, 2015), shareFor(e, 2024)] }))
  .sort((a, b) => b.values[1] - b.values[0] - (a.values[1] - a.values[0]));
const moved = rows[0];
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default {
  eyebrow: "Énergie · Europe",
  series: ["2015", "2024"],
  rows,
  unit: "% de bas-carbone dans l’électricité",
  ceiling: 100,
  gestures: [
    { do: "reveal" },
    { do: "highlight", mark: "Pologne" },
    { do: "annotate", mark: "Pologne", note: `+${one(moved.values[1] - moved.values[0])} points depuis 2015` },
  ],
  title: "La Pologne a gagné 17,3 points de bas-carbone depuis 2015, et reste la seule des six sous la moitié",
  source: ["Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data", "Ember, Energy Institute, via OWID"],
  check() {
    if (moved.name !== "Pologne") throw new Error(`the country that moved furthest is ${moved.name}, not Poland`);
    const under = rows.filter((r) => r.values[1] < 50);
    if (under.length !== 1 || under[0] !== moved) throw new Error("Poland is not the only one under half");
  },
};
