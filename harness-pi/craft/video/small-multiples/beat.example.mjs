// beat.mjs for the worked example proof/video-small-multiples-lowcarbon — « Électricité bas-carbone : les seize ont tous
// progressé, les plus bas le plus vite », told in time. Every number the video draws is COMPUTED from data.json; the
// correlation, the two orders and the two ringed panels are derived by render-beat.mjs, and check() tests the claim on
// the same data.
import { members, readTable, series } from "./series.mjs";

const table = readTable(import.meta.dirname);
const FROM = 2000;
const TO = 2024;
const CLEAN = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"];
// The low-carbon share of one row's generation, in percent (times 100, as the unit prints "%"): y is a function of the
// row read by column name, summing only the generation columns the measure names — never every column.
const sum = (r, keys) => keys.reduce((s, k) => s + (Number(r[k]) || 0), 0);
const share = (r) => (100 * sum(r, CLEAN)) / (sum(r, CLEAN) + sum(r, FOSSIL));
// One panel per country: members() gives each entity once, already named in the page's language (data.json's
// entity_fr when the story is French) with the where that selects its rows — no names table to write.
const panels = members(table).map((m) => {
  const points = series(table, { x: "year", y: share, where: m.where, from: FROM, to: TO });
  const at = (year) => points.find((p) => p.year === year).value;
  return { name: m.name, from: at(FROM), to: at(TO) };
});
const largest = Math.max(...panels.flatMap((p) => [p.from, p.to]));
const ceiling = Math.ceil(largest / 25) * 25;

// "The lowest starters rose the most": the correlation between the 2000 share and the gain.
const mean = (xs) => xs.reduce((s, v) => s + v, 0) / xs.length;
const xs = panels.map((p) => p.from);
const ys = panels.map((p) => p.to - p.from);
const [mx, my] = [mean(xs), mean(ys)];
const r =
  xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) /
  Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0) * ys.reduce((s, y) => s + (y - my) ** 2, 0));

const NB = " ";

export default {
  lang: "fr",
  eyebrow: `Énergie${NB}· Europe`,
  panels,
  states: { from: String(FROM), to: String(TO) },
  ceiling,
  // The scale's line in forms, longest first: the frame takes the first one that leaves room for the key.
  unit: [`part bas-carbone, 0–${ceiling}${NB}%`, `bas-carbone, 0–${ceiling}${NB}%`, `0–${ceiling}${NB}%`],
  foldNote: (drawn, all) => [
    `${drawn} des ${all} pays, pris régulièrement du plus bas au plus haut départ`,
    `${drawn} des ${all} pays, du plus bas au plus haut départ`,
    `${drawn} des ${all} pays`,
  ],
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: [`Électricité bas-carbone${NB}: les seize ont tous progressé, les plus bas le plus vite`, `Bas-carbone${NB}: tous ont progressé, les plus bas le plus vite`],
  source: ["Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data", "Source : Ember, Energy Institute, via Our World in Data"],
  evidenceLevels: 4,
  check() {
    if (panels.length !== 16) throw new Error(`the title says sixteen; data.json holds ${panels.length}`);
    const fell = panels.filter((p) => !(p.to > p.from));
    if (fell.length) throw new Error(`the title says all rose; ${fell.map((p) => p.name).join(", ")} did not`);
    if (!(r < -0.5)) throw new Error(`the title says the lowest starters rose fastest; the correlation between start and gain is ${r.toFixed(2)}`);
  },
};
