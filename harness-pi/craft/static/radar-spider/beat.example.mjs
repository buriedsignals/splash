// beat.mjs for the worked example proof/static-radar-electricity-mix — "France and Germany make
// nearly the same electricity, from opposite mixes". Every number on the plate is COMPUTED from
// data.json; nothing is typed in a sentence that the data could contradict.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const YEAR = 2024;

// The spokes, in editorial order: family by family, clockwise from twelve.
const SPOKES = [
  { column: "Wind", label: "Éolien", family: "renouvelable" },
  { column: "Solar", label: "Solaire", family: "renouvelable" },
  { column: "Hydropower", label: "Hydraulique", family: "renouvelable" },
  { column: "Bioenergy", label: "Bioénergie", family: "renouvelable" },
  { column: "Other renewables", label: "Autres renouv.", family: "renouvelable" },
  { column: "Nuclear", label: "Nucléaire", family: "nucléaire" },
  { column: "Gas", label: "Gaz", family: "fossile" },
  { column: "Coal", label: "Charbon", family: "fossile" },
  { column: "Oil", label: "Pétrole", family: "fossile" },
];

// One row per item; each spoke is a share of THAT item's own total (one denominator).
const rowFor = (entity) => {
  const row = table.rows.find((r) => r[col("Entity")] === entity && Number(r[col("Year")]) === YEAR);
  if (!row) throw new Error(`no ${YEAR} row for ${entity}`);
  return row;
};
const ITEMS = [
  { entity: "France", name: "France" },
  { entity: "Germany", name: "Allemagne" },
];
const perItem = ITEMS.map(({ entity, name }) => {
  const row = rowFor(entity);
  const values = SPOKES.map((s) => Number(row[col(s.column)]));
  const total = values.reduce((a, b) => a + b, 0);
  return { name, total, share: Object.fromEntries(SPOKES.map((s, i) => [s.column, (values[i] / total) * 100])) };
});
const [fr, de] = perItem;
const shareOf = (item, ...columns) => columns.reduce((sum, c) => sum + item.share[c], 0);

const spokes = SPOKES.map((s) => ({
  key: s.column,
  label: s.label,
  family: s.family,
  shares: perItem.map((p) => p.share[s.column]),
}));

const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ratio = Math.max(fr.total, de.total) / Math.min(fr.total, de.total);

export default {
  eyebrow: "Énergie · Europe",
  items: perItem.map((p) => p.name),
  subject: fr.name,
  spokes,
  format: one,
  title: [
    `La France et l’Allemagne produisent presque autant d’électricité, avec des mix opposés`,
    `Deux mix opposés pour presque la même électricité`,
    `France et Allemagne : deux mix opposés`,
  ],
  limits: [
    `Part de chaque source dans la production électrique du pays, en ${YEAR}. ` +
      `France ${one(fr.total)} TWh, Allemagne ${one(de.total)} TWh. ` +
      `Le nucléaire fait ${one(shareOf(fr, "Nuclear"))} % du mix français et ${one(shareOf(de, "Nuclear"))} % du mix allemand ; ` +
      `l’éolien et le solaire réunis, ${one(shareOf(de, "Wind", "Solar"))} % en Allemagne contre ${one(shareOf(fr, "Wind", "Solar"))} % en France.`,
    `Part de chaque source dans la production électrique du pays, en ${YEAR}. ` +
      `France ${one(fr.total)} TWh, Allemagne ${one(de.total)} TWh.`,
    `Part de chaque source dans la production électrique du pays, en ${YEAR}.`,
  ],
  // The reading line in forms, longest first; it receives the outer ring's label, computed by the render.
  reading: (ceilingLabel) => [
    `Lecture : chaque rayon est une part de la production du pays lui-même — les neuf parts d’un ` +
      `polygone font 100 %. Rayons rangés par famille dans le sens horaire : renouvelables, nucléaire, ` +
      `fossiles. Cercle extérieur ${ceilingLabel} ; chaque nombre est une part, en %.`,
    `Lecture : part de la production du pays lui-même, en %. Rayons par famille, sens horaire. Cercle extérieur ${ceilingLabel}.`,
    `Lecture : part de la production du pays lui-même, en %.`,
  ],
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt:
    `Radar à neuf rayons comparant la part de chaque source dans la production électrique de la France et de ` +
    `l’Allemagne en ${YEAR}. Le polygone français est étiré vers le nucléaire (${one(shareOf(fr, "Nuclear"))} %), ` +
    `celui de l’Allemagne vers l’éolien et le solaire (${one(shareOf(de, "Wind", "Solar"))} % à eux deux) et le ` +
    `charbon (${one(shareOf(de, "Coal"))} %).`,
  evidenceLevels: 3,
  check() {
    if (ratio > 1.25) throw new Error(`the two totals are ${ratio.toFixed(2)}x apart, not "nearly the same"`);
    if (shareOf(de, "Nuclear") !== 0) throw new Error(`Germany has ${one(shareOf(de, "Nuclear"))} % nuclear, not none`);
    if (shareOf(fr, "Nuclear") < 50) throw new Error(`nuclear is ${one(shareOf(fr, "Nuclear"))} % of France's mix, not most of it`);
    if (shareOf(de, "Wind", "Solar") <= shareOf(fr, "Wind", "Solar")) throw new Error(`Germany no longer draws more from wind and solar than France`);
  },
};
