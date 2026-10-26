// beat.mjs for the worked example proof/video-stacked-bar-lowcarbon-growth — « L’Espagne a ajouté plus d’électricité
// bas-carbone que la France depuis 2000 », told in time. Every number the video draws is COMPUTED from data.json; the
// orders and the copies of Spain's 2000 level along France's are derived by render-beat.mjs, and check() tests the claim
// on the same data.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const FROM = 2000;
const TO = 2024;
const CLEAN = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh"];
const FRENCH = {
  Austria: "Autriche", Belgium: "Belgique", Czechia: "Tchéquie", Denmark: "Danemark", Finland: "Finlande", France: "France", Germany: "Allemagne",
  Greece: "Grèce", Ireland: "Irlande", Italy: "Italie", Netherlands: "Pays-Bas", Poland: "Pologne", Portugal: "Portugal", Spain: "Espagne", Sweden: "Suède",
  "United Kingdom": "Royaume-Uni",
};
const ENTITY = col("entity");
const YEAR = col("year");
// Low-carbon generation of a country in one year, in TWh.
const twh = (entity, year) => {
  const r = data.rows.find((z) => z[ENTITY] === entity && Number(z[YEAR]) === year);
  return CLEAN.reduce((s, k) => s + Number(r[col(k)] || 0), 0);
};
const rows = [...new Set(data.rows.map((r) => r[ENTITY]))].map((entity) => {
  const level = twh(entity, FROM);
  return { name: FRENCH[entity] ?? entity, level, growth: twh(entity, TO) - level };
});
const spain = rows.find((r) => r.name === "Espagne");
const france = rows.find((r) => r.name === "France");

const NB = " ";

export default {
  lang: "fr",
  eyebrow: `Énergie${NB}· Europe`,
  rows,
  drawCount: 12,
  adder: "Espagne",
  incumbent: "France",
  unit: "électricité bas-carbone, en TWh",
  segments: { level: String(FROM), growth: `ajouté d’ici ${TO}` },
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: ["L’Espagne a ajouté plus d’électricité bas-carbone que la France depuis 2000", "L’Espagne a ajouté plus de bas-carbone que la France depuis 2000"],
  source: ["Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data", "Source : Ember, Energy Institute, via Our World in Data"],
  evidenceLevels: 4,
  check() {
    if (!(spain.growth > france.growth)) throw new Error(`the title says Spain added more than France; Spain added ${spain.growth.toFixed(1)}, France ${france.growth.toFixed(1)}`);
  },
};
