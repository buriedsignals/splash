// beat.mjs for the worked example proof/static-stacked-bar-lowcarbon-growth — "Spain added more
// low-carbon electricity than France since 2000". Every number on the plate is COMPUTED from data.json.
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
const lowCarbon = (r) => CLEAN.reduce((s, i) => s + Number(r[i] || 0), 0);

const FROM = 2000;
const TO = 2024;
const FRENCH = {
  Austria: "Autriche", Belgium: "Belgique", Czechia: "Tchéquie", Denmark: "Danemark", Finland: "Finlande",
  France: "France", Germany: "Allemagne", Greece: "Grèce", Ireland: "Irlande", Italy: "Italie",
  Netherlands: "Pays-Bas", Poland: "Pologne", Portugal: "Portugal", Spain: "Espagne", Sweden: "Suède",
  "United Kingdom": "Royaume-Uni",
};

// One row per country: the earlier level, and what was added on top of it since.
const entities = [...new Set(table.rows.map((r) => r[ENTITY]))];
const all = entities
  .map((e) => {
    const a = table.rows.find((r) => r[ENTITY] === e && Number(r[YEAR]) === FROM);
    const b = table.rows.find((r) => r[ENTITY] === e && Number(r[YEAR]) === TO);
    const level = lowCarbon(a);
    return { name: FRENCH[e] ?? e, level, growth: lowCarbon(b) - level };
  })
  .sort((x, y) => y.growth - x.growth);

// At most 12 bars fit: the twelve that added most, the quantity the takeaway is about.
const rows = all.slice(0, 12);
const omitted = all.slice(12);
const spain = all.find((r) => r.name === "Espagne");
const france = all.find((r) => r.name === "France");
const total = (r) => r.level + r.growth;
const fr = (v) => Math.round(v).toLocaleString("fr-FR").replace(/[  ]/g, " ");

export default {
  eyebrow: "Énergie · Europe",
  rows,
  // The bar(s) the takeaway names; their labels are drawn in the accent.
  highlight: ["Espagne", "France"],
  segments: { level: `produit en ${FROM}`, growth: "ajouté depuis" },
  order: `growth since ${FROM}`,
  unit: "TWh",
  format: fr,
  title: [
    `L’Espagne a ajouté plus d’électricité bas-carbone que la France depuis ${FROM}`,
    `L’Espagne en a ajouté plus que la France depuis ${FROM}`,
  ],
  limits: [
    `Électricité bas-carbone — renouvelables et nucléaire réunis — produite en ${FROM}, et ce que chaque pays y a ajouté d’ici ${TO}, en TWh. ` +
      `L’Espagne en a ajouté ${fr(spain.growth)}, la France ${fr(france.growth)}. Les ${rows.length} qui ont le plus ajouté sur ${all.length} pays étudiés ; ` +
      `les ${omitted.length} autres (${omitted.map((r) => r.name).join(", ")}) ont aussi progressé.`,
    `Électricité bas-carbone en ${FROM} et ce qui y a été ajouté d’ici ${TO}, en TWh : les ${rows.length} qui ont le plus ajouté sur ${all.length} pays.`,
  ],
  reading: [
    `Lecture : chaque barre est un pays. Le segment pâle est sa production de ${FROM}, le segment plein ce qu’il a ajouté depuis ; le total de ${TO} est écrit au bout.`,
    `Lecture : segment pâle ${FROM}, segment plein ce qui a été ajouté, total de ${TO} au bout.`,
  ],
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt:
    `Barres empilées : pour les ${rows.length} pays européens qui ont le plus ajouté, l’électricité bas-carbone produite en ${FROM} puis ce qui y a été ajouté d’ici ${TO}, en TWh. ` +
    `L’Espagne a ajouté ${fr(spain.growth)} TWh en partant de ${fr(spain.level)} ; la France ${fr(france.growth)} en partant de ${fr(france.level)}, et reste à ${fr(total(france))} TWh.`,
  evidenceLevels: 4,
  check() {
    if (rows[0].name !== "Espagne") throw new Error(`the most added is ${rows[0].name} (+${fr(rows[0].growth)}), not Spain (+${fr(spain.growth)})`);
    if (!(spain.growth > france.growth)) throw new Error(`Spain added ${fr(spain.growth)}, not more than France's ${fr(france.growth)}`);
  },
};
