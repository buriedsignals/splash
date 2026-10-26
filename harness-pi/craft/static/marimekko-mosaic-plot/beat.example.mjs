// beat.mjs for the worked example proof/static-marimekko-electricity-mix — "Le charbon fait 6 % de
// l'électricité de ces six pays, et il tient dans deux colonnes". render-beat.mjs computes every
// column's total, the whole, and the tracked band's total and holders, and passes them to check().
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR] = [col("entity"), col("year")];

// The stack, bottom to top: fossil, then nuclear, then the renewables. The order IS the encoding —
// one ramp of the accent runs along it — so it must mean something, not repeat the table's order.
const bandOrder = [
  { key: "coal", label: "Charbon", family: "fossile" },
  { key: "oil", label: "Pétrole", family: "fossile" },
  { key: "gas", label: "Gaz", family: "fossile" },
  { key: "nuclear", label: "Nucléaire", family: "nucléaire" },
  { key: "bioenergy", label: "Bioénergie", family: "renouvelable" },
  { key: "other_renewables", label: "Autres renouv.", family: "renouvelable" },
  { key: "hydropower", label: "Hydraulique", family: "renouvelable" },
  { key: "solar", label: "Solaire", family: "renouvelable" },
  { key: "wind", label: "Éolien", family: "renouvelable" },
];
const FRENCH = { France: "France", Germany: "Allemagne", Norway: "Norvège", Poland: "Pologne", Sweden: "Suède", Switzerland: "Suisse" };

// One column per country, 2024 only: { key, label, values: { band key: value } }.
const columns = data.rows
  .filter((r) => Number(r[YEAR]) === 2024)
  .map((r) => ({
    key: r[ENTITY],
    label: FRENCH[r[ENTITY]] ?? r[ENTITY],
    values: Object.fromEntries(bandOrder.map((b) => [b.key, Number(r[col(b.key)])])),
  }));

const plain = (s) => s.replace(/[   ]/g, " ");
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const whole = (v) => plain(v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }));

// The figures the standfirst states, computed the same way render-beat.mjs computes them.
const totalOf = (c) => bandOrder.reduce((s, b) => s + c.values[b.key], 0);
const grand = columns.reduce((s, c) => s + totalOf(c), 0);
const coal = columns.map((c) => ({ label: c.label, value: c.values.coal })).sort((a, b) => b.value - a.value);
const coalTotal = coal.reduce((s, c) => s + c.value, 0);
const topTwo = (coal[0].value + coal[1].value) / coalTotal;

export default {
  eyebrow: "Énergie · Europe",
  columns,
  bandOrder,
  // The band the takeaway is about: drawn at the foot of every column, its shares set in bold.
  tracked: "coal",
  unit: "TWh",
  widthName: "Largeur : production totale, en TWh",
  format: whole,
  percent: (share) => (share >= 0.095 ? `${Math.round(share * 100)} %` : share >= 0.005 ? `${plain((share * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 }))} %` : ""),
  title: [
    "Le charbon fait 12 % de l’électricité de ces six pays, et il tient dans deux colonnes",
    "Le charbon de ces six pays tient dans deux colonnes",
    "Le charbon tient dans deux colonnes",
  ],
  limits: [
    `Production électrique 2024, par source. La LARGEUR de chaque colonne est la production du pays en TWh, sa hauteur son mix : l’aire d’une bande est donc une quantité. ${one(coalTotal)} TWh de charbon sur ${whole(grand)} au total, dont ${one(topTwo * 100)} % en ${coal[0].label} et en ${coal[1].label}.`,
    "Production électrique 2024, par source. La LARGEUR d’une colonne est la production du pays en TWh, sa hauteur son mix : l’aire d’une bande est une quantité.",
    "Production électrique 2024 : la largeur d’une colonne est la production, sa hauteur son mix.",
  ],
  reading: [
    "Lecture : chaque colonne fait 100 % de haut ; les parts sous 0,5 % ne sont pas chiffrées mais restent dessinées. Les sources sont nommées une fois, à droite, dans l’ordre où elles s’empilent dans toutes les colonnes.",
    "Lecture : chaque colonne fait 100 % de haut ; les sources sont nommées à droite.",
    "Lecture : chaque colonne fait 100 % de haut.",
  ],
  // Off landscape the two narrowest columns share one; this sentence heads the reading line then.
  mergeNote: (a, b) => `${a} et ${b} partagent une colonne : leurs deux mixes y sont additionnés.`,
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: ({ grand, trackedShare, holders }) =>
    `Marimekko : six pays européens en 2024, chaque colonne aussi large que sa production (${whole(grand)} TWh au total) et haute de 100 % de son mix. La bande charbon fait ${Math.round(trackedShare * 100)} % de l’ensemble et n’est visible que dans les colonnes ${holders[0].label} et ${holders[1].label}.`,
  evidenceLevels: 3,
  check({ trackedShare, trackedTotal, holders }) {
    if (Math.round(trackedShare * 100) !== 12) throw new Error(`coal is ${(trackedShare * 100).toFixed(1)} % of the six, not 12 %`);
    const share = (holders[0].value + holders[1].value) / trackedTotal;
    if (share < 0.95) throw new Error(`the two largest coal columns hold ${(share * 100).toFixed(1)} % of the coal, not nearly all of it`);
  },
};
