// beat.mjs for the worked example proof/static-bullet-low-carbon-share — "La Pologne a gagné 17,3 points de
// bas-carbone depuis 2015, et reste la seule des six sous la moitié" — for the paired gesture kit. Every number is
// COMPUTED from data.json; the share is computed from the source columns.
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
// One row per country: [the comparative state 2015, the measure 2024], sorted by the change.
const rows = [...new Set(table.rows.map((r) => r[ENTITY]))]
  .map((e) => ({ name: FRENCH[e] ?? e, values: [shareFor(e, 2015), shareFor(e, 2024)] }))
  .sort((a, b) => b.values[1] - b.values[0] - (a.values[1] - a.values[0]));
const moved = rows[0];
const underHalf = rows.filter((r) => r.values[1] < 50);
const plain = (s) => s.replace(/[  ]/g, " ");
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

export default {
  eyebrow: "Énergie · Europe",
  series: ["2015", "2024"],
  rows,
  unit: "%",
  ceiling: 100,
  gestures: [
    { do: "highlight", mark: moved.name },
    { do: "annotate", mark: moved.name, note: `+${one(moved.values[1] - moved.values[0])} points depuis 2015` },
    { do: "reference", value: 50, mark: moved.name, note: "La ligne marque la moitié de la production." },
  ],
  format: one,
  title: "La Pologne a gagné 17,3 points de bas-carbone depuis 2015, et reste la seule des six sous la moitié",
  limits: [
    "Nucléaire et renouvelables, en part de la production électrique de chaque pays, 2015 et 2024 ; six pays seulement. Barre épaisse et pâle : 2015 ; fine et pleine : 2024 ; la piste va jusqu’à 100 %.",
    "Nucléaire et renouvelables, en part de la production électrique de chaque pays, 2015 et 2024 ; six pays seulement.",
  ],
  source: "Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data",
  alt: (drawn) => `Graphique à puces : part du bas-carbone dans l’électricité de ${drawn.length} pays, 2015 contre 2024, sur une piste allant jusqu’à 100 %. ${moved.name} passe de ${one(moved.values[0])} % à ${one(moved.values[1])} %.`,
  check() {
    if (underHalf.length !== 1 || underHalf[0].name !== moved.name) throw new Error(`the country that moved furthest (${moved.name}) is not the only one under half`);
    if (one(moved.values[1] - moved.values[0]) !== "17,3") throw new Error(`the gain is ${one(moved.values[1] - moved.values[0])}, not 17,3`);
  },
};
