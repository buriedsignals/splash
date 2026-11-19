// beat.mjs for the worked example proof/static-bullet-low-carbon-share — "Pologne : +17,3 points de bas-carbone
// depuis 2015, et toujours la seule des six sous la moitié" — written for the paired gesture kit. The share is
// computed from the source columns: nuclear and every renewable over the country's own generation.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
// A column by its name; an index already looked up passes through ([col("a"), col("b")].map(col) is harmless).
const col = (name) => {
  if (Number.isInteger(name)) return name;
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${JSON.stringify(name)}; its columns are ${table.columns.map((c) => c.name).join(", ")}`);
  return i;
};
const [ENTITY, YEAR] = [col("Entity"), col("Year")];
// The source columns by type, not by position: a text column after them (Entity_fr) would make every share NaN.
const SOURCES = table.columns.filter((c) => c.type === "number" && c.name !== "Year").map((c) => c.name);
const LOW_CARBON = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower", "Nuclear"];
const shareFor = (entity, year) => {
  const row = table.rows.find((r) => r[ENTITY] === entity && Number(r[YEAR]) === year);
  if (!row) return null;
  const total = SOURCES.reduce((s, c) => s + Number(row[col(c)]), 0);
  return (LOW_CARBON.reduce((s, c) => s + Number(row[col(c)]), 0) / total) * 100;
};
const FRENCH = { France: "France", Germany: "Allemagne", Norway: "Norvège", Poland: "Pologne", Sweden: "Suède", Switzerland: "Suisse" };
const rows = [...new Set(table.rows.map((r) => r[ENTITY]))]
  .map((e) => ({ name: FRENCH[e] ?? e, values: [shareFor(e, 2015), shareFor(e, 2024)] }))
  .sort((a, b) => b.values[1] - b.values[0] - (a.values[1] - a.values[0]));
const moved = rows[0];
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default {
  eyebrow: "Énergie · Europe",
  // series[0] the comparative state (thick, pale), series[1] the measure (thin, saturated).
  series: ["2015", "2024"],
  rows,
  unit: "% de la production électrique",
  ceiling: 100,
  gestures: [
    { do: "highlight", mark: moved.name },
    { do: "annotate", mark: moved.name, note: "seule des six sous la moitié" },
    { do: "compare", marks: [`${moved.name} · 2024`, `${moved.name} · 2015`], note: `+${one(moved.values[1] - moved.values[0])} points` },
    { do: "filter", marks: rows.filter((r) => r.values[1] < 60).map((r) => r.name) },
  ],
  restLabel: "Les six pays",
  format: one,
  title: "La Pologne a gagné 17,3 points de bas-carbone depuis 2015, et reste la seule des six sous la moitié",
  limits: "Part du bas-carbone — nucléaire et renouvelables — dans la production électrique de chaque pays, en 2015 et en 2024.",
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: `Graphique à puces : la part du bas-carbone dans l’électricité de six pays, 2015 contre 2024, sur une piste allant jusqu’à 100 %. ${moved.name} progresse de ${one(moved.values[0])} % à ${one(moved.values[1])} %.`,
  check() {
    const under = rows.filter((r) => r.values[1] < 50);
    if (under.length !== 1 || under[0].name !== moved.name) throw new Error(`the top gainer (${moved.name}) is not the only one under half`);
    if (one(moved.values[1] - moved.values[0]) !== "17,3") throw new Error(`Poland gained ${one(moved.values[1] - moved.values[0])} points, not 17,3`);
  },
};
