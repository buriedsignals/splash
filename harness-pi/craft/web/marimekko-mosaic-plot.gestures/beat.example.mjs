// web beat.mjs for the worked example proof/static-marimekko-electricity-mix, written for the gesture kit: "Coal is 12 %
// of these six countries' electricity, and almost all of it — 99.5 % — is generated in Germany and Poland." One column
// per country (its width its generation), one band per source (its height its share of the column), so a cell's AREA
// is its TWh. Every number on the plate is COMPUTED from data.json; only the title's first form is typed.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [COUNTRY, SOURCE, TWH] = [col("country"), col("source"), col("twh")];

// One cell per country and source; columns from the largest generator down, sources in one fixed order.
const totalOf = (c) => data.rows.filter((r) => r[COUNTRY] === c).reduce((s, r) => s + Number(r[TWH]), 0);
const countries = [...new Set(data.rows.map((r) => r[COUNTRY]))].sort((a, b) => totalOf(b) - totalOf(a));
const rows = countries.flatMap((c) => data.rows.filter((r) => r[COUNTRY] === c).map((r) => ({ column: c, segment: r[SOURCE], value: Number(r[TWH]) })));

const all = rows.reduce((s, r) => s + r.value, 0);
const coal = rows.filter((r) => r.segment === "Coal");
const coalSum = coal.reduce((s, r) => s + r.value, 0);
const two = coal.filter((r) => r.column === "Germany" || r.column === "Poland");
const twoShare = (two.reduce((s, r) => s + r.value, 0) / coalSum) * 100;
const others = coal.filter((r) => !two.includes(r)).map((r) => `${r.column} · Coal`);
const one = (v) => v.toLocaleString("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default {
  eyebrow: "Electricity · Europe",
  rows,
  // A mark is written "<column> · <segment>"; a column's name ("Germany") or a segment's ("Coal") names all its cells.
  gestures: [
    { do: "highlight", mark: "Coal" },
    { do: "bracket", mark: "Coal", of: "whole", note: `${one(coalSum)} TWh, ${one((coalSum / all) * 100)} % of all` },
    { do: "bracket", marks: ["Germany · Coal", "Poland · Coal"], of: others, note: `${one(twoShare)} % of the coal` },
  ],
  format: (v) => `${one(v)} TWh`,
  unit: "Electricity generation, 2024",
  restLabel: "other countries",
  // The words of the option that shows the page as it lands (each control's first radio).
  landingLabel: "The whole",
  title: [
    "Coal is 12 % of these six countries' electricity, and almost all of it — 99.5 % — is generated in Germany and Poland.",
    "Coal: 12 % of the six, nearly all of it in Germany and Poland",
  ],
  limits: [
    `One column per country, its width its generation in 2024 (${Math.round(all)} TWh for the six); each band is a source's share of that column, so a cell's area is its TWh. One year (2024); six countries chosen for contrast, not a European total; generation, not consumption.`,
    `Column width: generation; band height: share of the column.`,
  ],
  source: "Source: Ember, Energy Institute — via Our World in Data · 2024",
  alt: () => `Marimekko of six European countries' electricity in 2024. Coal, in colour, is ${one((coalSum / all) * 100)} % of the ${Math.round(all)} TWh, and ${one(twoShare)} % of that coal is generated in Germany and Poland.`,
  check() {
    if (Math.round((coalSum / all) * 100) !== 12) throw new Error(`coal is ${((coalSum / all) * 100).toFixed(1)} %, not 12 %`);
    if (Math.round(twoShare * 10) / 10 !== 99.5) throw new Error(`Germany and Poland hold ${twoShare.toFixed(2)} % of the coal, not 99.5 %`);
  },
};
