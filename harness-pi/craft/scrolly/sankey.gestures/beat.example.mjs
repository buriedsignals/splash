// beat.mjs for the worked example proof/static-sankey-electricity-sources — "Le nucléaire de ces six pays est
// français à 84 %" — written for the gesture kit: the staging is the `gestures` list. Every number is COMPUTED from
// data.json; the title's first form is the takeaway, copied as a literal string, and check() holds it to the data.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const YEAR = 2024;
// One row per country, one column per source: keep ONE year so each pair has one flow.
const rows = table.rows.filter((r) => Number(r[col("Year")]) === YEAR);
// The left rail, in an order that means something (renewables, nuclear, fossil), not the CSV's.
const SOURCES = [
  ["Wind", "Éolien"], ["Solar", "Solaire"], ["Hydropower", "Hydraulique"], ["Bioenergy", "Bioénergie"],
  ["Other renewables", "Autres renouv."], ["Nuclear", "Nucléaire"], ["Gas", "Gaz"], ["Coal", "Charbon"], ["Oil", "Pétrole"],
];
const FRENCH = { France: "France", Germany: "Allemagne", Norway: "Norvège", Poland: "Pologne", Sweden: "Suède", Switzerland: "Suisse" };
// Every flow the data carries: source column → country row, by the names the plate prints.
const flows = SOURCES.flatMap(([key, label]) => rows.map((r) => ({ from: label, to: FRENCH[r[col("Entity")]], value: Number(r[col(key)]) })));
const total = (side, name) => flows.filter((f) => f[side] === name).reduce((s, f) => s + f.value, 0);
const nuclear = total("from", "Nucléaire");
const french = flows.find((f) => f.from === "Nucléaire" && f.to === "France").value;
const share = (french / nuclear) * 100;
// The other countries that generate any nuclear at all.
const abroad = flows.filter((f) => f.from === "Nucléaire" && f.to !== "France" && f.value > 0);
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/[  ]/g, " ");

export default {
  eyebrow: "Énergie · Europe",
  flows,
  // Targets ordered by their total, largest first.
  targets: Object.values(FRENCH).sort((a, b) => total("to", b) - total("to", a)),
  // Each gesture carries its card: the sentence the reader reads while it plays, stating the figure its picture shows.
  gestures: [
    { do: "bracket", mark: "Nucléaire", note: `${one(nuclear)} TWh`, card: `Le nucléaire est la première source des six pays : ${one(nuclear)} TWh en ${YEAR}.` },
    { do: "highlight", mark: "Nucléaire – France", note: `${Math.round(share)} % du nucléaire`, card: `${one(french)} TWh de ce nucléaire sont produits en France, soit ${Math.round(share)} %.` },
    { do: "filter", mark: "Nucléaire", card: `Hors de France, seuls ${abroad.map((f) => `${f.to} (${one(f.value)} TWh)`).join(" et ")} en produisent.` },
  ],
  format: one,
  title: "Le nucléaire de ces six pays est français à 84 %",
  limits: [
    `Production électrique de six pays européens en ${YEAR}, par source, en TWh.`,
  ],
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: `Diagramme de flux : les sources d’électricité de six pays européens en ${YEAR}. Le ruban le plus large va du nucléaire (${one(nuclear)} TWh) vers la France (${one(french)} TWh), soit ${Math.round(share)} % du nucléaire des six pays.`,
  check() {
    if (Math.round(share) !== 84) throw new Error(`France holds ${share.toFixed(1)} % of the six countries' nuclear, not 84 %`);
  },
};
