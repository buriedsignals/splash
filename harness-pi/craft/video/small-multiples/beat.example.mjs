// beat.mjs for the worked example proof/video-small-multiples-lowcarbon — « Électricité bas-carbone : les seize ont tous
// progressé, les plus bas le plus vite », told in time. Every number the video draws is COMPUTED from data.json; the
// correlation, the two orders and the two ringed panels are derived by render-beat.mjs, and check() tests the claim on
// the same data.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const FROM = 2000;
const TO = 2024;
const CLEAN = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"];
const FRENCH = {
  Austria: "Autriche", Belgium: "Belgique", Czechia: "Tchéquie", Denmark: "Danemark", Finland: "Finlande", France: "France", Germany: "Allemagne",
  Greece: "Grèce", Ireland: "Irlande", Italy: "Italie", Netherlands: "Pays-Bas", Poland: "Pologne", Portugal: "Portugal", Spain: "Espagne", Sweden: "Suède",
  "United Kingdom": "Royaume-Uni",
};
const ENTITY = col("entity");
const YEAR = col("year");
// The low-carbon share of a country's generation in one year, in percent.
const shareOf = (entity, year) => {
  const r = data.rows.find((z) => z[ENTITY] === entity && Number(z[YEAR]) === year);
  const sum = (keys) => keys.reduce((s, k) => s + Number(r[col(k)] || 0), 0);
  return (sum(CLEAN) / (sum(CLEAN) + sum(FOSSIL))) * 100;
};
const panels = [...new Set(data.rows.map((r) => r[ENTITY]))].map((entity) => ({ name: FRENCH[entity] ?? entity, from: shareOf(entity, FROM), to: shareOf(entity, TO) }));
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
