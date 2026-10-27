// beat.mjs for the worked example proof/static-diverging-stacked-electricity — "In France nuclear outweighs fossil
// and renewables put together" — written for the Stack gesture kit: the staging is the `gestures` list. Every
// number on the plate is COMPUTED from data.json; only the title's first form is typed (the takeaway).
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);

// Each side's parts, OUTWARD from the centre (the deepest shade is the extreme); the neutral straddles the axis.
const LEFT = [["Gas", "Gaz"], ["Oil", "Pétrole"], ["Coal", "Charbon"]];
const RIGHT = [["Bioenergy", "Bioénergie"], ["Other renewables", "Autres renouv."], ["Hydropower", "Hydraulique"], ["Solar", "Solaire"], ["Wind", "Éolien"]];
const CENTRE = ["Nuclear", "Nucléaire"];
const NAMES = { France: "France", Germany: "Allemagne", Norway: "Norvège", Poland: "Pologne", Sweden: "Suède", Switzerland: "Suisse" };
const ALL = [...LEFT, ...RIGHT, CENTRE];

// Each part is a SHARE of its own row, so every row adds up to 100.
const rows = data.rows
  .filter((r) => r[at("Year")] === 2024)
  .map((r) => {
    const total = ALL.reduce((s, [c]) => s + r[at(c)], 0);
    return { name: NAMES[r[at("Entity")]] ?? r[at("Entity")], parts: Object.fromEntries(ALL.map(([c, label]) => [label, (r[at(c)] / total) * 100])) };
  });
const fossil = (r) => LEFT.reduce((s, [, l]) => s + r.parts[l], 0);
const renewable = (r) => RIGHT.reduce((s, [, l]) => s + r.parts[l], 0);
rows.sort((a, b) => fossil(b) - fossil(a));
const france = rows.find((r) => r.name === "France");
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const others = [...LEFT, ...RIGHT].map(([, l]) => `France · ${l}`);

export default {
  eyebrow: "Énergie · Europe",
  rows,
  left: LEFT.map(([, l]) => l),
  right: RIGHT.map(([, l]) => l),
  centre: CENTRE[1],
  leftName: "Fossile",
  rightName: "Renouvelable",
  unit: "%",
  // France in the accent, its nuclear share laid against fossil and renewable added up.
  gestures: [
    { do: "highlight", mark: "France" },
    { do: "compare", mark: "France · Nucléaire", of: others, note: `${one(france.parts.Nucléaire)} % de nucléaire contre ${one(fossil(france) + renewable(france))} % pour les deux autres réunis` },
  ],
  format: (v) => (v < 0.05 ? "0" : one(v)),
  title: ["Le nucléaire tient le centre : en France il pèse plus que le fossile et le renouvelable réunis", "En France, le nucléaire pèse plus que les deux autres réunis"],
  limits: [
    "Mix électrique 2024, en parts de la production de chaque pays. À gauche le fossile, à droite le renouvelable, au centre le nucléaire.",
    "Mix électrique 2024, en parts de la production de chaque pays.",
  ],
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: (drawn) => `Barres empilées divergentes : le mix électrique de ${drawn.length} pays européens en 2024, fossile à gauche, renouvelable à droite, nucléaire à cheval sur l’axe. La France porte ${one(france.parts.Nucléaire)} % de nucléaire.`,
  check() {
    if (!(france.parts.Nucléaire > fossil(france) + renewable(france))) throw new Error(`France's nuclear ${one(france.parts.Nucléaire)} % no longer outweighs the other two together`);
  },
};
