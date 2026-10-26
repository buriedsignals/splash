// beat.mjs for the worked example proof/static-small-multiples-lowcarbon — "the sixteen all rose, and
// those that started lowest moved most". One panel per country, 2000 against 2024. Every number on
// the plate is COMPUTED from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
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
  Austria: "Autriche", Belgium: "Belgique", Czechia: "Tchéquie", Denmark: "Danemark",
  Finland: "Finlande", France: "France", Germany: "Allemagne", Greece: "Grèce",
  Ireland: "Irlande", Italy: "Italie", Netherlands: "Pays-Bas", Poland: "Pologne",
  Portugal: "Portugal", Spain: "Espagne", Sweden: "Suède", "United Kingdom": "Royaume-Uni",
};
const entities = [...new Set(table.rows.map((r) => r[ENTITY]))].sort();
// One panel per entity: { name, from, to }, sorted by the gain.
const panels = entities
  .map((e) => {
    const at = (y) => table.rows.find((r) => r[ENTITY] === e && Number(r[YEAR]) === y);
    return { name: FRENCH[e] ?? e, from: shareOf(at(FROM)), to: shareOf(at(TO)) };
  })
  .sort((a, b) => b.to - b.from - (a.to - a.from));

const gain = (p) => p.to - p.from;
const biggest = panels[0];
const smallest = panels[panels.length - 1];
// The one shared scale: the next round 25 above the largest value anywhere.
const ceiling = Math.ceil(Math.max(...panels.flatMap((p) => [p.from, p.to])) / 25) * 25;
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const formatDelta = (v) => `${v >= 0 ? "+" : "−"}${Math.round(Math.abs(v))}`;

// Pearson correlation between start and gain: the "lowest moved most" half of the claim.
const n = panels.length;
const mean = (xs) => xs.reduce((s, v) => s + v, 0) / n;
const mx = mean(panels.map((p) => p.from));
const my = mean(panels.map(gain));
const r =
  panels.reduce((s, p) => s + (p.from - mx) * (gain(p) - my), 0) /
  Math.sqrt(panels.reduce((s, p) => s + (p.from - mx) ** 2, 0) * panels.reduce((s, p) => s + (gain(p) - my) ** 2, 0));

export default {
  eyebrow: "Énergie · Europe",
  panels,
  states: { from: String(FROM), to: String(TO) },
  ceiling,
  // The panels drawn in the accent: the largest and the smallest gain.
  thread: [biggest.name, smallest.name],
  format: (v) => `${Math.round(v)}`,
  formatDelta,
  unit: `part bas-carbone, 0–${ceiling} %`,
  title: [
    `Les seize ont tous progressé — et ceux qui partaient de plus bas ont le plus avancé`,
    `Tous ont progressé, et les plus bas le plus vite`,
  ],
  limits: [
    `Part de l’électricité bas-carbone — renouvelables et nucléaire réunis — en ${FROM} et en ${TO}, un panneau par pays, tous à la même échelle. ${biggest.name} gagne le plus, ${formatDelta(gain(biggest))} points depuis ${one(biggest.from)} % ; ${smallest.name} le moins, ${formatDelta(gain(smallest))}, en partant de ${one(smallest.from)} %.`,
    `Part de l’électricité bas-carbone en ${FROM} et en ${TO}, un panneau par pays, même échelle.`,
  ],
  reading: [
    `Lecture : chaque panneau est un pays, dessiné sur la même échelle de 0 à ${ceiling} % que les autres. Le nombre sous chaque paire est l’écart, en points.`,
    `Lecture : même échelle 0–${ceiling} % ; le nombre sous chaque paire est l’écart.`,
  ],
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: `${n} petits panneaux, un par pays européen : part de l’électricité bas-carbone en ${FROM} et en ${TO}, sur la même échelle de 0 à ${ceiling} %. ${biggest.name} gagne le plus, ${formatDelta(gain(biggest))} points ; ${smallest.name} le moins, ${formatDelta(gain(smallest))}.`,
  foldNote: (drawn, all) => `${drawn} des ${all} pays`,
  evidenceLevels: 4,
  check() {
    const fell = panels.filter((p) => gain(p) <= 0);
    if (fell.length) throw new Error(`the title says all rose; ${fell.map((p) => p.name).join(", ")} did not`);
    if (n !== 16) throw new Error(`the title says sixteen; data.json holds ${n}`);
    if (!(r < -0.5)) throw new Error(`the title says the lowest starters gained most; the start/gain correlation is ${r.toFixed(2)}`);
  },
};
