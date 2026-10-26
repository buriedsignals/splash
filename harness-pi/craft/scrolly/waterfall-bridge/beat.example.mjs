// beat.mjs for the worked example proof/scrolly-germany-electricity-bridge — "L’Allemagne a produit
// 143 TWh d’électricité de moins en 2024 qu’en 2015", as a scrolly. Every step is COMPUTED as (later
// minus earlier) from the same columns as the totals, so the bridge balances by construction; every
// number in a card comes from render-beat.mjs as `r` and is only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = data.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const FIRST = 2015;
const LAST = 2024;
const RENEWABLE = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower"];
/** Ordered as the fossil step unfolds: the largest change first. */
const FOSSIL = [
  { column: "Coal", label: "charbon", short: "charb." },
  { column: "Gas", label: "gaz", short: "gaz" },
  { column: "Oil", label: "pétrole", short: "pétr." },
];
const ALL = [...RENEWABLE, ...FOSSIL.map((f) => f.column), "Nuclear"];
const at = (year) => {
  const row = data.rows.find((r) => Number(r[col("Year")]) === year);
  if (!row) throw new Error(`the bridge reads ${year} and data.json has no row for it`);
  return row;
};
const value = (row, k) => Number(row[col(k)] ?? 0);
const sum = (row, keys) => keys.reduce((t, k) => t + value(row, k), 0);
const [first, last] = [at(FIRST), at(LAST)];
const change = (keys) => sum(last, keys) - sum(first, keys);

const one = (v) => Math.abs(v).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const signed = (v) => `${v >= 0 ? "+" : "−"}${one(v)}`;
const twh = (v) => `${one(v)} TWh`;

export default {
  lang: "fr",
  eyebrow: "Énergie · Allemagne",
  steps: [
    { label: String(FIRST), value: sum(first, ALL), kind: "total" },
    { label: "renouvelables", short: "renouv.", value: change(RENEWABLE), kind: "increase", detail: { wind: change(["Wind"]), solar: change(["Solar"]) } },
    { label: "nucléaire", short: "nucl.", value: change(["Nuclear"]), kind: "decrease" },
    {
      label: "fossile",
      short: "fossile",
      value: change(FOSSIL.map((f) => f.column)),
      kind: "decrease",
      parts: FOSSIL.map((f) => ({ label: f.label, short: f.short, value: change([f.column]) })),
    },
    { label: String(LAST), value: sum(last, ALL), kind: "total" },
  ],
  unit: "TWh",
  unitLine: "production d’électricité, en TWh",
  running: "total : {v} TWh",
  format: one,
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    opening: (r) => `En ${FIRST}, l’Allemagne produit ${twh(r.opening)} d’électricité.`,
    step1: (r) => `Les renouvelables en ajoutent ${twh(r.steps[0].value)} : l’éolien ${signed(r.steps[0].detail.wind)}, le solaire ${signed(r.steps[0].detail.solar)}.`,
    step2: (r) => `La sortie du nucléaire en retire ${twh(r.steps[1].value)}. À eux deux, les deux mouvements ne font que ${signed(r.firstTwo)} TWh.`,
    step3: (r) => `Le fossile recule de ${twh(r.steps[2].value)}. Et presque tout vient du charbon : ${signed(r.parts[0].value)} TWh, plus que la baisse totale ; le gaz, lui, monte de ${one(r.parts[1].value)}.`,
    closing: (r) => `En ${LAST}, la production tombe à ${twh(r.closing)} : ${twh(r.net)} de moins qu’en ${FIRST}.`,
  },
  // The short accent note in the header while cards 2 to 5 are read (card 1 shows the running total).
  notes: {
    step1: (r) => `éolien ${signed(r.steps[0].detail.wind)} · solaire ${signed(r.steps[0].detail.solar)}`,
    step2: (r) => `renouvelables + nucléaire : ${signed(r.firstTwo)} TWh`,
    step3: (r) => `charbon ${signed(r.parts[0].value)} TWh`,
    closing: (r) => `de ${FIRST} à ${LAST} : ${signed(r.net)} TWh`,
  },
  title: [
    `L’Allemagne a produit 143 TWh d’électricité de moins en 2024 qu’en 2015`,
    `143 TWh d’électricité de moins en Allemagne`,
    `L’électricité allemande, ${FIRST}–${LAST}`,
  ],
  // The last card: how to read the bridge.
  limits: `Lecture : chaque marche part du total atteint par la précédente. Les deux barres pleines partent de zéro ; ce qui les sépare est la somme des marches.`,
  source: "Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data",
  alt: (r) =>
    `Diagramme en cascade de la production électrique allemande, ${FIRST} à ${LAST}, en TWh : ${one(r.opening)} en ${FIRST}, ${signed(r.steps[0].value)} de renouvelables, ` +
    `${signed(r.steps[1].value)} de nucléaire, ${signed(r.steps[2].value)} de fossile dont ${signed(r.parts[0].value)} de charbon, ${one(r.closing)} en ${LAST}.`,
  evidenceLevels: 3,
  check(r) {
    if (Math.round(-r.net) !== 143) throw new Error(`the title says 143 TWh less; the bridge falls by ${(-r.net).toFixed(1)}`);
    const [ren, nuc, fos] = r.steps.map((s) => s.value);
    if (!(ren > 0 && nuc < 0 && fos < 0)) throw new Error("the cards say renewables rose while nuclear and fossil fell");
    if (!(Math.abs(ren + nuc) < 0.2 * ren)) throw new Error(`card 3 says nuclear cancels almost all of the renewables step; together they move ${(ren + nuc).toFixed(1)}`);
    if (!(r.parts[0].value < r.net)) throw new Error(`card 4 says coal alone fell by more than the whole bridge; coal ${r.parts[0].value.toFixed(1)}, bridge ${r.net.toFixed(1)}`);
    const { wind, solar } = r.steps[0].detail;
    if (!(wind > solar && wind + solar > 0.9 * ren)) throw new Error("card 2 says wind and solar make the renewables step");
  },
};
