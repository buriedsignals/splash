// beat.mjs for the worked example proof/video-radar-electricity-mix — « La France et l’Allemagne produisent presque autant
// d’électricité, avec des mix opposés », told in time. Every number the video draws is COMPUTED from data.json; each
// spoke's shares of its item's own whole are computed by render-beat.mjs.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR] = [col("Entity"), col("Year")];

// The spokes clockwise from twelve o'clock, by family: renewables, nuclear, fossil.
const SPOKES = [
  { key: "Wind", label: "Éolien" },
  { key: "Solar", label: "Solaire" },
  { key: "Hydropower", label: "Hydraulique", shortLabel: "Hydro." },
  { key: "Bioenergy", label: "Bioénergie", shortLabel: "Bio." },
  { key: "Other renewables", label: "Autres renouv.", shortLabel: "Autres" },
  { key: "Nuclear", label: "Nucléaire", shortLabel: "Nucl." },
  { key: "Gas", label: "Gaz" },
  { key: "Coal", label: "Charbon" },
  { key: "Oil", label: "Pétrole" },
];
const ITEMS = [
  { entity: "France", name: "France" },
  { entity: "Germany", name: "Allemagne" },
];
const rowOf = (entity) => data.rows.find((r) => r[ENTITY] === entity && Number(r[YEAR]) === 2024);
// Each spoke's TWh in 2024 for both countries, in the order of items.
const spokes = SPOKES.map((s) => ({ ...s, values: ITEMS.map((it) => Number(rowOf(it.entity)[col(s.key)])) }));

const totals = ITEMS.map((_, i) => spokes.reduce((t, s) => t + s.values[i], 0));
const share = (i, ...keys) => (keys.reduce((t, k) => t + spokes.find((s) => s.key === k).values[i], 0) / totals[i]) * 100;
const fr = (v, digits = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace(/[   ]/g, " ");

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  items: ITEMS.map((it) => it.name),
  subject: "France",
  spokes,
  // The spoke the takeaway turns on: its two shares are ringed at the end.
  named: "Nuclear",
  format: (v) => fr(v),
  formatTotal: (v) => `${fr(v)} TWh`,
  percent: (v) => `${fr(v, 0)} %`,
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: [
    "La France et l’Allemagne produisent presque autant d’électricité, avec des mix opposés",
    "France et Allemagne : autant d’électricité, des mix opposés",
  ],
  source: [
    "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
    "Source : Ember, Energy Institute – Statistical Review of World Energy, via Our World in Data",
    "Source : Ember, Energy Institute, via Our World in Data",
  ],
  evidenceLevels: 3,
  check() {
    const ratio = Math.max(...totals) / Math.min(...totals);
    if (ratio > 1.25) throw new Error(`the title says the two make nearly the same electricity; they are ${ratio.toFixed(2)} times apart`);
    if (share(1, "Nuclear") !== 0) throw new Error(`the title's opposite mixes rest on Germany having no nuclear; it has ${fr(share(1, "Nuclear"))} %`);
    if (share(0, "Nuclear") < 50) throw new Error(`the title's opposite mixes rest on nuclear being most of France's mix; it is ${fr(share(0, "Nuclear"))} %`);
    if (!(share(1, "Wind", "Solar") > share(0, "Wind", "Solar"))) throw new Error("Germany should draw more of its power from wind and solar than France");
  },
};
