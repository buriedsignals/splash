// beat.mjs for the worked example proof/scrolly-radar-electricity-mix — "La France et l’Allemagne
// produisent presque autant d’électricité, avec des mix opposés", as a scrolly. Every number in a card
// is COMPUTED: the totals, the shares, the family sums and the ceilings come from render-beat.mjs as
// `r` and are only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);

const YEAR = 2024;
// THE SPOKE ORDER IS AN EDITORIAL DECISION: renewables, nuclear, fossil, clockwise from twelve o'clock.
const FAMILIES = ["renouvelables", "nucléaire", "fossiles"];
const SPOKES = [
  { column: "Wind", label: "Éolien", family: 0 },
  { column: "Solar", label: "Solaire", family: 0 },
  { column: "Hydropower", label: "Hydraulique", family: 0 },
  { column: "Bioenergy", label: "Bioénergie", family: 0 },
  { column: "Other renewables", label: "Autres renouv.", family: 0 },
  { column: "Nuclear", label: "Nucléaire", family: 1 },
  { column: "Gas", label: "Gaz", family: 2 },
  { column: "Coal", label: "Charbon", family: 2 },
  { column: "Oil", label: "Pétrole", family: 2 },
];
// The subject first: it is traced first, in the accent.
const ITEMS = [
  { entity: "France", name: "France", the: "la France" },
  { entity: "Germany", name: "Allemagne", the: "l’Allemagne" },
];

// Each item's total generation, and each source's SHARE of it, in %.
const rows = ITEMS.map((item) => {
  const row = data.rows.find((r) => r[at("Entity")] === item.entity && Number(r[at("Year")]) === YEAR);
  if (!row) throw new Error(`no ${YEAR} row for ${item.entity}`);
  const total = SPOKES.reduce((s, sp) => s + Number(row[at(sp.column)]), 0);
  return { total, shares: SPOKES.map((sp) => (Number(row[at(sp.column)]) / total) * 100) };
});
const spokes = SPOKES.map((sp, i) => ({ key: sp.column, label: sp.label, family: sp.family, shares: rows.map((r) => r.shares[i]) }));

const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const [FR, DE] = [0, 1];
const sum = (r, k, ...keys) => keys.reduce((s, key) => s + r.shares[key][k], 0);

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  items: ITEMS.map((i) => i.name),
  subject: "France",
  totals: rows.map((r) => r.total),
  spokes,
  families: FAMILIES,
  // The ring card 5 tightens to, so the small shares open.
  tightCeiling: 30,
  format: one,
  formatTotal: (v) => `${one(v)} TWh`,
  formatCeiling: (v) => `${v} %`,
  cards: {
    totals: (r) => `En ${YEAR}, la France a produit ${one(r.totals[FR])} TWh d’électricité, l’Allemagne ${one(r.totals[DE])} TWh : presque autant.`,
    subject: (r) => `Chaque rayon est une source, en part de la production du pays. Le mix français, rayon par rayon : le nucléaire en fait ${one(r.shares.Nuclear[FR])} %.`,
    other: (r) =>
      `Le mix allemand par-dessus : pas de nucléaire, ${one(r.shares.Wind[DE])} % d’éolien, ${one(r.shares.Coal[DE])} % de charbon. L’éolien et le solaire réunis y font ${one(sum(r, DE, "Wind", "Solar"))} %, contre ${one(sum(r, FR, "Wind", "Solar"))} % en France.`,
    families: (r) =>
      `Regroupons les neuf rayons en trois familles. Renouvelables : ${one(r.families[0].shares[FR])} % en France, ${one(r.families[0].shares[DE])} % en Allemagne. Fossiles : ${one(r.families[2].shares[FR])} % contre ${one(r.families[2].shares[DE])} %.`,
    scale: (r) => `Resserrons l’échelle à ${r.tight} % : les petites parts s’ouvrent ; seul le nucléaire français dépasse le cercle.`,
  },
  // The short accent note in the header while each card is read.
  notes: {
    totals: (r) => `France ${one(r.totals[FR])} TWh · Allemagne ${one(r.totals[DE])} TWh`,
    subject: (r) => `France : nucléaire ${one(r.shares.Nuclear[FR])} %`,
    other: (r) => `Allemagne : éolien + solaire ${one(sum(r, DE, "Wind", "Solar"))} %`,
    families: (r) => `fossiles : ${one(r.families[2].shares[FR])} % · ${one(r.families[2].shares[DE])} %`,
    scale: (r) => `cercle extérieur : ${r.tight} %`,
    reading: (r) => `cercle extérieur : ${r.ceiling} %`,
  },
  title: [
    "La France et l’Allemagne produisent presque autant d’électricité, avec des mix opposés",
    "Presque autant d’électricité, des mix opposés",
    "France, Allemagne : deux mix électriques",
  ],
  // The last card: how the wheel reads.
  limits: "Lecture : chaque rayon est une part de la production du pays lui-même, les neuf parts d’un polygone font 100 %. Rayons rangés par famille dans le sens horaire : renouvelables, nucléaire, fossiles.",
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: (r) =>
    `Radar à neuf rayons comparant la part de chaque source dans la production électrique de la France et de l’Allemagne en ${YEAR}. ` +
    `Le polygone français est étiré vers le nucléaire (${one(r.shares.Nuclear[FR])} %), celui de l’Allemagne vers l’éolien et le solaire ` +
    `(${one(sum(r, DE, "Wind", "Solar"))} %) et le charbon (${one(r.shares.Coal[DE])} %).`,
  evidenceLevels: 3,
  check(r) {
    if (r.ratio > 1.25) throw new Error(`the title says the two make nearly the same electricity; they are ${r.ratio.toFixed(2)}x apart`);
    if (r.shares.Nuclear[DE] !== 0) throw new Error(`card 3 says Germany has no nuclear; it has ${r.shares.Nuclear[DE]} %`);
    if (r.shares.Nuclear[FR] < 50) throw new Error(`the title rests on nuclear being most of France's mix; it is ${r.shares.Nuclear[FR].toFixed(1)} %`);
    if (!(r.families[1].longestFor.includes(FR) && r.families[0].longestFor.includes(DE))) throw new Error("card 4 says France leans on nuclear and Germany on renewables");
    if (!(r.families[2].shares[DE] > r.families[2].shares[FR] * 4)) throw new Error(`card 4 says Germany burns several times France's fossil share`);
    if (r.overTight.map((o) => o.key).join() !== "Nuclear") throw new Error(`card 5 says only nuclear passes ${r.tight} %; ${r.overTight.map((o) => o.key).join(", ")} do`);
  },
};
