// beat.mjs for the worked example proof/static-sankey-electricity-sources — "Le nucléaire de ces six
// pays est français à 84 %". Every number on the plate is COMPUTED from data.json; the title's first
// form is the takeaway, copied as a literal string, and check() holds it to the data.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const YEAR = 2024;
// One row per target (a country), one column per source: keep ONE year so each pair has one flow.
const rows = table.rows.filter((r) => Number(r[col("Year")]) === YEAR);

// The left rail, in an order that means something (renewables, nuclear, fossil), not the CSV's.
const SOURCES = [
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
const french = (e) => {
  if (!FRENCH[e]) throw new Error(`no French name recorded for ${e}`);
  return FRENCH[e];
};

// Every flow the data carries: source column → country row.
const flows = SOURCES.flatMap((s) => rows.map((r) => ({ from: s.key, to: r[col("Entity")], value: Number(r[col(s.key)]) })));
const sumOf = (side, key) => flows.filter((f) => f[side] === key).reduce((s, f) => s + f.value, 0);
const sources = SOURCES.map((s) => ({ ...s, total: sumOf("from", s.key) }));
const targets = rows
  .map((r) => ({ key: r[col("Entity")], label: french(r[col("Entity")]), total: sumOf("to", r[col("Entity")]) }))
  .sort((a, b) => b.total - a.total);
const grand = flows.reduce((s, f) => s + f.value, 0);

// The claim: the largest source, and the one country that holds most of it.
const biggest = [...sources].sort((a, b) => b.total - a.total)[0];
const holder = flows.filter((f) => f.from === biggest.key).sort((a, b) => b.value - a.value)[0];
const share = holder.value / biggest.total;

const plain = (t) => t.replace(/[  ]/g, " ");
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const whole = (v) => plain(v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }));

export default {
  eyebrow: "Énergie · Europe",
  sources,
  targets,
  flows,
  // The one ribbon the takeaway is about, by its source key and target key: drawn in the accent.
  tracked: { from: biggest.key, to: holder.to },
  unit: "TWh",
  format: one,
  title: [
    "Le nucléaire de ces six pays est français à 84 %",
    `Six pays, ${(share * 100).toFixed(0)} % du nucléaire en ${french(holder.to)}`,
  ],
  limits: [
    `Production électrique de six pays européens en ${YEAR}, par source, en TWh. Le nucléaire est la première des ${sources.length} sources (${one(biggest.total)}) et ${one(holder.value)} en sont produits en ${french(holder.to)}. Au total ${whole(grand)} TWh pour les six pays.`,
    `Production électrique de six pays européens en ${YEAR}, par source, en TWh.`,
  ],
  reading: [
    `Lecture : chaque ruban est une source dans un pays ; les ${flows.length} rubans d’un rail se rejoignent exactement au total du nœud, qui est imprimé.`,
  ],
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: `Diagramme de flux : les ${sources.length} sources d’électricité de six pays européens en ${YEAR}, ${whole(grand)} TWh au total. Le ruban le plus large va du nucléaire (${one(biggest.total)}) vers ${french(holder.to)} (${one(holder.value)}), soit ${(share * 100).toFixed(0)} % du nucléaire des six pays.`,
  declaredSequence: "family",
  evidenceLevels: 3,
  check() {
    if (biggest.key !== "Nuclear") throw new Error(`the largest source is ${biggest.label}, not nuclear`);
    if (holder.to !== "France") throw new Error(`the largest nuclear producer is ${holder.to}, not France`);
    if (Math.round(share * 100) !== 84) throw new Error(`France holds ${(share * 100).toFixed(1)} % of the six countries' nuclear, not 84 %`);
  },
};
