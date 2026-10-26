// beat.mjs for the worked example proof/more-boxplot-france-co2-decades — "France's CO2 per person
// peaked in the 1970s". Every number on the plate is COMPUTED from data.json; the quartiles and
// whiskers are computed by summarizeDecade, the same function the render draws with.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { summarizeDecade } from "./DecadeBoxplot.tsx";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR, VALUE] = [col("Entity"), col("Year"), col("CO₂ emissions per capita")];

// One reading per year from 1950, for the one entity drawn.
const readings = table.rows
  .filter((r) => r[ENTITY] === "France")
  .map((r) => ({ year: Number(r[YEAR]), value: Number(r[VALUE]) }))
  .filter((r) => r.year >= 1950 && Number.isFinite(r.value));

// The groups: one per decade, in order, each holding its years' readings.
const byDecade = new Map();
for (const r of readings) {
  const label = `${Math.floor(r.year / 10) * 10}s`;
  if (!byDecade.has(label)) byDecade.set(label, []);
  byDecade.get(label).push(r.value);
}
const groups = [...byDecade].map(([label, values]) => ({ label, values }));

// The summaries, for the sentences only (the render recomputes them for the marks).
const summaries = groups.map((g) => summarizeDecade(g.label, g.values));
const peak = summaries.reduce((a, b) => (b.median > a.median ? b : a));
const last = summaries[summaries.length - 1];
const partial = summaries.filter((s) => s.n < 10);
const decade = (s) => s.label.replace("s", "");
const two = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const WHISKER_RULE = "1,5 × IQR";

export default {
  eyebrow: "Climat · France",
  groups,
  subject: peak.label,
  unit: "t",
  whiskerRule: WHISKER_RULE,
  format: one,
  reading:
    `Lecture : la boîte contient 50 % des années de la décennie, le trait est la médiane, ` +
    `les moustaches vont jusqu’à ${WHISKER_RULE} et les points isolés sont les années qui les dépassent.`,
  title: [
    `Les émissions de CO2 par personne en France ont culminé dans les années ${decade(peak)}`,
    `Le CO2 par personne a culminé dans les années ${decade(peak)}`,
    `Le pic du CO2 : les années ${decade(peak)}`,
  ],
  limits: [
    `Une boîte par décennie : la médiane, l’intervalle qui contient la moitié des années, et les moustaches à ${WHISKER_RULE}. ` +
      `Chaque année est dessinée à côté de sa propre boîte. Médiane ${two(peak.median)} t dans les années ${decade(peak)}, ` +
      `${two(last.median)} t dans les années ${decade(last)}` +
      (partial.length ? ` — décennie partielle, ${partial[0].n} années seulement.` : "."),
    `Une boîte par décennie, chaque année en point à côté de la sienne. Médiane ${two(peak.median)} t dans les années ${decade(peak)}, ` +
      `${two(last.median)} t dans les années ${decade(last)}.`,
    `Médiane ${two(peak.median)} t dans les années ${decade(peak)}, ${two(last.median)} t dans les années ${decade(last)}.`,
  ],
  source: "Source : Global Carbon Budget 2025, via Our World in Data · France, 1950-2024, extraites le 8 août 2026",
  alt:
    `Boîtes à moustaches : la répartition des émissions annuelles de CO2 par personne en France, une boîte par décennie de 1950 à 2024, ` +
    `chaque année dessinée en points à côté de sa boîte. La médiane culmine à ${two(peak.median)} t dans les années ${decade(peak)} puis ` +
    `baisse à chaque décennie jusqu’à ${two(last.median)} t dans les années ${decade(last)}, une décennie partielle de ${last.n} années.`,
  evidenceLevels: 3,
  check() {
    if (peak.label !== "1970s") throw new Error(`the peak decade by median is ${peak.label}, not the 1970s`);
    const at = summaries.indexOf(peak);
    for (let i = at + 1; i < summaries.length; i++)
      if (summaries[i].median >= summaries[i - 1].median)
        throw new Error(`${summaries[i].label} (${summaries[i].median.toFixed(2)}) is not below ${summaries[i - 1].label} (${summaries[i - 1].median.toFixed(2)})`);
  },
};
