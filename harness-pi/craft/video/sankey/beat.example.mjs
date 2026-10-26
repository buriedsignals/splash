// beat.mjs for the worked example proof/video-sankey-electricity-sources — « Le nucléaire de ces six pays est français à
// 84 % », told in time. Every number the video draws is COMPUTED from data.json; the nodes' totals and the tracked
// flow's share of its source are computed by render-beat.mjs and checked here the same way.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR] = [col("Entity"), col("Year")];
const rows = data.rows.filter((r) => Number(r[YEAR]) === 2024);

// The left rail top to bottom: renewables, then nuclear, then fossil.
const sources = [
  { key: "Wind", label: "Éolien" },
  { key: "Solar", label: "Solaire" },
  { key: "Hydropower", label: "Hydraulique" },
  { key: "Bioenergy", label: "Bioénergie" },
  { key: "Other renewables", label: "Autres renouv." },
  { key: "Nuclear", label: "Nucléaire" },
  { key: "Gas", label: "Gaz" },
  { key: "Coal", label: "Charbon" },
  { key: "Oil", label: "Pétrole" },
];
const FRENCH = { France: "France", Germany: "Allemagne", Norway: "Norvège", Poland: "Pologne", Sweden: "Suède", Switzerland: "Suisse" };

// One flow per source × country, 2024.
const flows = sources.flatMap((s) => rows.map((r) => ({ from: s.key, to: r[ENTITY], value: Number(r[col(s.key)]) })));
const sum = (list) => list.reduce((t, f) => t + f.value, 0);
// The right rail: the countries, largest generation first.
const targets = rows.map((r) => ({ key: r[ENTITY], label: FRENCH[r[ENTITY]] ?? r[ENTITY], total: sum(flows.filter((f) => f.to === r[ENTITY])) })).sort((a, b) => b.total - a.total);

const nuclear = sum(flows.filter((f) => f.from === "Nuclear"));
const french = flows.find((f) => f.from === "Nuclear" && f.to === "France").value;

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  sources,
  targets,
  flows,
  // The ONE flow the takeaway is about: drawn in the accent, the copy of its source's bar laid against its target.
  tracked: { from: "Nuclear", to: "France" },
  unit: "TWh",
  // A node's total: one decimal, French.
  format: (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/[  ]/g, " "),
  percent: (v) => `${v} %`,
  // A narrow frame (square, portrait) groups the left rail, the tracked source first; the credit says so.
  narrowRail: [
    { at: "Nuclear", keys: ["Nuclear"], label: "Nucléaire" },
    { at: "Wind", keys: ["Wind"], label: "Éolien" },
    { at: "Solar", keys: ["Solar"], label: "Solaire" },
    { at: "Hydropower", keys: ["Hydropower"], label: "Hydraulique" },
    { at: "Bioenergy", keys: ["Bioenergy", "Other renewables"], label: "Autres" },
    { at: "Gas", keys: ["Gas", "Coal", "Oil"], label: "Fossiles" },
  ],
  narrowSource: [
    "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data · les neuf sources sont réunies en six",
    "Source : Ember, Energy Institute – Statistical Review of World Energy, via Our World in Data · les neuf sources sont réunies en six",
    "Source : Ember, Energy Institute, via Our World in Data · les neuf sources sont réunies en six",
    "Ember, via Our World in Data · neuf sources réunies en six",
  ],
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: ["Le nucléaire de ces six pays est français à 84 %"],
  source: [
    "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
    "Source : Ember, Energy Institute – Statistical Review of World Energy, via Our World in Data",
    "Source : Ember, Energy Institute, via Our World in Data",
  ],
  evidenceLevels: 3,
  check() {
    const largest = sources.map((s) => ({ key: s.key, total: sum(flows.filter((f) => f.from === s.key)) })).sort((a, b) => b.total - a.total)[0];
    if (largest.key !== "Nuclear") throw new Error(`the title is about nuclear as these countries' main source; the largest is ${largest.key}`);
    if (Math.round((french / nuclear) * 100) !== 84) throw new Error(`the title says 84 %; France holds ${((french / nuclear) * 100).toFixed(1)} % of the nuclear`);
  },
};
