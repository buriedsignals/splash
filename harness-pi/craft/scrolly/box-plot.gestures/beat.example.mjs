// beat.mjs for the worked example proof/more-boxplot-france-co2-decades — "Les émissions de CO2 par personne en
// France ont culminé dans les années 1970" — written for the Position gesture kit. Every number on the plate is
// COMPUTED from data.json (the render computes each box from the readings); the title's first form is the
// journalist's takeaway, copied as written.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR, VALUE] = [col("Entity"), col("Year"), col("CO₂ emissions per capita")];
const readings = table.rows
  .filter((r) => r[ENTITY] === "France" && Number(r[YEAR]) >= 1950 && Number.isFinite(Number(r[VALUE])))
  .map((r) => ({ year: Number(r[YEAR]), value: Number(r[VALUE]) }));
// One group per decade, in time order, each holding its years' readings.
const byDecade = new Map();
for (const r of readings) {
  const name = `années ${Math.floor(r.year / 10) * 10}`;
  if (!byDecade.has(name)) byDecade.set(name, []);
  byDecade.get(name).push(r.value);
}
const rows = [...byDecade].map(([name, values]) => ({ name, values }));
const medianOf = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const h = (s.length - 1) / 2;
  return (s[Math.floor(h)] + s[Math.ceil(h)]) / 2;
};
const medians = rows.map((g) => ({ name: g.name, median: medianOf(g.values), n: g.values.length }));
const peak = medians.reduce((a, b) => (b.median > a.median ? b : a));
const last = medians.at(-1);
const two = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default {
  eyebrow: "Climat · France",
  rows,
  gestures: [
    { do: "highlight", mark: peak.name , card: `La médiane des années 1970 est la plus haute : ${two(peak.median)} t par personne.` },
    { do: "compare", marks: [peak.name, last.name], note: `médiane ${two(peak.median)} t contre ${two(last.median)} t` , card: `Dans les années 2020, elle n’est plus que de ${two(last.median)} t.` },
    { do: "annotate", mark: last.name, note: `décennie partielle : ${last.n} années` , card: `Une décennie partielle : ${last.n} années seulement.` },
  ],
  unit: "Tonnes de CO₂ par personne et par an",
  format: (v) => two(v),
  title: [
    `Les émissions de CO2 par personne en France ont culminé dans les années ${peak.name.slice(-4)}`,
    `Le CO2 par personne a culminé dans les années ${peak.name.slice(-4)}`,
  ],
  limits: [
    `Une boîte par décennie de 1950 à 2024 ; la décennie 2020 est partielle, cinq années seulement. La boîte contient la moitié des années, le trait est la médiane, chaque année est un point.`,
    `Une boîte par décennie, chaque année en point à côté de la sienne.`,
  ],
  source: "Source : Global Carbon Budget 2025, via Our World in Data · France, 1950-2024",
  alt: (drawn) => `Boîtes à moustaches : les émissions annuelles de CO2 par personne en France, une boîte par décennie (${drawn.length}). La médiane culmine à ${two(peak.median)} t dans les années 1970 et descend à ${two(last.median)} t dans les années 2020.`,
  check() {
    if (peak.name !== "années 1970") throw new Error(`the peak decade by median is ${peak.name}, not the 1970s`);
    const at = medians.indexOf(peak);
    for (let i = at + 1; i < medians.length; i++)
      if (medians[i].median >= medians[i - 1].median) throw new Error(`${medians[i].name} is not below ${medians[i - 1].name}`);
  },
};
