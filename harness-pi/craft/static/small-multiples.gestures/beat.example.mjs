// beat.mjs for the worked example proof/static-small-multiples-lowcarbon — "Les seize ont tous progressé — et ceux qui
// partaient de plus bas ont le plus avancé" — written for the gesture kit: the staging is the `gestures` list. One panel
// per country, two bars (2000, 2024) on one shared scale. Every number is COMPUTED from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR] = [col("entity"), col("year")];
const CLEAN = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh"].map(col);
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"].map(col);
const FROM = 2000;
const TO = 2024;

// The measure the takeaway is about: the low-carbon SHARE of generation, in %.
const shareOf = (row) => {
  const sum = (idx) => idx.reduce((s, i) => s + Number(row[i] || 0), 0);
  return (sum(CLEAN) / (sum(CLEAN) + sum(FOSSIL))) * 100;
};
const FRENCH = {
  Austria: "Autriche", Belgium: "Belgique", Czechia: "Tchéquie", Denmark: "Danemark", Finland: "Finlande", France: "France",
  Germany: "Allemagne", Greece: "Grèce", Ireland: "Irlande", Italy: "Italie", Netherlands: "Pays-Bas", Poland: "Pologne",
  Portugal: "Portugal", Spain: "Espagne", Sweden: "Suède", "United Kingdom": "Royaume-Uni",
};
const entities = [...new Set(table.rows.map((r) => r[ENTITY]))];
// One panel per country, two bars, sorted by the gain.
const panels = entities
  .map((e) => {
    const at = (y) => table.rows.find((r) => r[ENTITY] === e && Number(r[YEAR]) === y);
    return { name: FRENCH[e] ?? e, bars: [{ name: String(FROM), value: shareOf(at(FROM)) }, { name: String(TO), value: shareOf(at(TO)) }] };
  })
  .sort((a, b) => b.bars[1].value - b.bars[0].value - (a.bars[1].value - a.bars[0].value));
const gain = (p) => p.bars[1].value - p.bars[0].value;
const biggest = panels[0];
const smallest = panels.at(-1);
const pts = (v) => `${v >= 0 ? "+" : "−"}${Math.round(Math.abs(v))}`;

export default {
  eyebrow: "Énergie · Europe",
  panels,
  // The one shared scale: every panel runs 0 to 100 %.
  ceiling: 100,
  // The staging, in story order: the largest gain in the accent with its points, the smallest named on its last bar.
  gestures: [
    { do: "highlight", mark: biggest.name, note: `${pts(gain(biggest))} points, le plus fort gain` },
    { do: "annotate", mark: `${smallest.name} · ${TO}`, note: `${pts(gain(smallest))} points` },
  ],
  format: (v) => `${Math.round(v)}`,
  title: "Les seize ont tous progressé — et ceux qui partaient de plus bas ont le plus avancé",
  limits: [
    `Part de l’électricité bas-carbone — renouvelables et nucléaire réunis — en ${FROM} et en ${TO}, en %, un panneau par pays, tous à la même échelle.`,
    `Part de l’électricité bas-carbone en ${FROM} et en ${TO}, en %, même échelle.`,
  ],
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: `${panels.length} petits panneaux, un par pays européen : part de l’électricité bas-carbone en ${FROM} et en ${TO}. ${biggest.name} gagne le plus, ${pts(gain(biggest))} points ; ${smallest.name} le moins, ${pts(gain(smallest))}.`,
  check() {
    const fell = panels.filter((p) => gain(p) <= 0);
    if (fell.length) throw new Error(`the title says all rose; ${fell.map((p) => p.name).join(", ")} did not`);
    if (panels.length !== 16) throw new Error(`the title says sixteen; data.json holds ${panels.length}`);
  },
};
