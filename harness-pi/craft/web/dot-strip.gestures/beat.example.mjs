// beat.mjs for the worked example proof/static-dot-strip-lowcarbon-spread — "Le plancher européen est monté de 30
// points, le plafond de 2" — written for the Position gesture kit. Every number on the plate is COMPUTED from
// data.json; the title's first form is the journalist's takeaway, copied as written.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);
const FROM = 2000;
const TO = 2024;
const LOW = ["other_renewables_generation__twh", "bioenergy_stacked_generation__twh", "solar_generation__twh", "wind_generation__twh", "hydro_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"];
const shareOf = (row) => {
  const lc = LOW.reduce((s, c) => s + row[at(c)], 0);
  const fossil = FOSSIL.reduce((s, c) => s + row[at(c)], 0);
  return (lc / (lc + fossil)) * 100;
};
const byCode = {};
for (const r of data.rows) (byCode[r[at("code")]] ??= { name: r[at("entity")] })[r[at("year")]] = shareOf(r);
// One row per country, its share at both moments; `code` is printed on the plate when a gesture names it.
const rows = Object.entries(byCode).map(([code, v]) => ({ name: v.name, code, from: v[FROM], to: v[TO] }));
const floorOf = (k) => rows.reduce((a, b) => (b[k] < a[k] ? b : a));
const ceilingOf = (k) => rows.reduce((a, b) => (b[k] > a[k] ? b : a));
const floor = floorOf("from");
const ceiling = ceilingOf("to");
const floorRise = floorOf("to").to - floor.from;
const ceilingRise = ceiling.to - ceilingOf("from").from;

const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/[  ]/g, " ");

export default {
  eyebrow: "Énergie · Europe",
  rows,
  moments: [String(FROM), String(TO)],
  domain: [0, 100],
  restLabel: "Le champ seul",
  gestures: [
    { do: "highlight", mark: floor.name },
    { do: "annotate", mark: floor.name, note: `le plancher : ${one(floor.from)} % puis ${one(floorOf("to").to)} %, +${Math.round(floorRise)} points` },
    { do: "compare", marks: [floor.name, ceiling.name], note: `+${Math.round(floor.to - floor.from)} points contre +${Math.round(ceiling.to - ceiling.from)}` },
  ],
  unit: "Part de bas-carbone dans l’électricité du pays, en % — les deux bandes à la même échelle",
  format: (v) => one(v),
  title: [
    "Le plancher européen est monté de 30 points, le plafond de 2",
    `Le plancher est monté de ${Math.round(floorRise)} points, le plafond de ${Math.round(ceilingRise)}`,
  ],
  limits: [
    `Part de bas-carbone dans l’électricité de chaque pays, en ${FROM} et en ${TO}, seize pays européens, à la même échelle. Chaque pays est un point sur chaque bande.`,
    `La part de bas-carbone de chaque pays, en ${FROM} et en ${TO}.`,
  ],
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: (drawn) => `Deux bandes à la même échelle : ${drawn.length} pays européens selon la part de bas-carbone de leur électricité, en ${FROM} en haut et en ${TO} en bas. Le plancher passe de ${one(floor.from)} à ${one(floorOf("to").to)} %, le plafond monte de ${one(ceilingRise)} points.`,
  check() {
    if (Math.round(floorRise) !== 30) throw new Error(`the floor rose ${one(floorRise)} points, not 30`);
    if (Math.round(ceilingRise) !== 2) throw new Error(`the ceiling rose ${one(ceilingRise)} points, not 2`);
  },
};
