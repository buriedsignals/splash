// beat.mjs for the worked example proof/static-stacked-bar-lowcarbon-growth — "Spain added more low-carbon
// electricity than France since 2000" — written for the Stack web gesture kit (resting gestures drawn on landing, every other gesture one reader control): the staging is the `gestures` list.
// Every number on the plate is COMPUTED from data.json; only the title's first form is typed (the takeaway).
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR] = [col("entity"), col("year")];
const CLEAN = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh"].map(col);
const lowCarbon = (r) => CLEAN.reduce((s, i) => s + Number(r[i] || 0), 0);
const [FROM, TO] = [2000, 2024];
const FRENCH = { Austria: "Autriche", Belgium: "Belgique", Czechia: "Tchéquie", Denmark: "Danemark", Finland: "Finlande", France: "France", Germany: "Allemagne", Greece: "Grèce", Ireland: "Irlande", Italy: "Italie", Netherlands: "Pays-Bas", Poland: "Pologne", Portugal: "Portugal", Spain: "Espagne", Sweden: "Suède", "United Kingdom": "Royaume-Uni" };

// The parts, in their locked order from the zero: the earlier level, then what was added on top of it.
const LEVEL = `produit en ${FROM}`;
const ADDED = "ajouté depuis";
const rows = [...new Set(table.rows.map((r) => r[ENTITY]))]
  .map((e) => {
    const a = lowCarbon(table.rows.find((r) => r[ENTITY] === e && Number(r[YEAR]) === FROM));
    const b = lowCarbon(table.rows.find((r) => r[ENTITY] === e && Number(r[YEAR]) === TO));
    return { name: FRENCH[e] ?? e, parts: { [LEVEL]: a, [ADDED]: b - a } };
  })
  .sort((x, y) => y.parts[ADDED] - x.parts[ADDED]);

const spain = rows.find((r) => r.name === "Espagne");
const france = rows.find((r) => r.name === "France");
const fr = (v) => Math.round(v).toLocaleString("fr-FR").replace(/[  ]/g, " ");

export default {
  lang: "fr",
  // The option every control starts on: the page as it lands.
  restLabel: "Le classement seul",
  eyebrow: "Énergie · Europe",
  rows,
  parts: [LEVEL, ADDED],
  unit: "TWh",
  // The staging, in story order: Spain in the accent, its addition laid against France's, and France's whole
  // stack named — the larger total that added less.
  gestures: [
    { do: "highlight", mark: "Espagne" },
    { do: "compare", marks: [`Espagne · ${ADDED}`, `France · ${ADDED}`], label: "Les ajouts comparés", note: `+${fr(spain.parts[ADDED])} TWh contre +${fr(france.parts[ADDED])} pour la France` },
    { do: "annotate", mark: "France", note: `La France part de ${fr(france.parts[LEVEL])} TWh` },
  ],
  format: fr,
  title: [`L’Espagne a ajouté plus d’électricité bas-carbone que la France depuis ${FROM}`, `L’Espagne en a ajouté plus que la France depuis ${FROM}`],
  limits: [
    `Électricité bas-carbone — renouvelables et nucléaire réunis — produite en ${FROM}, et ce que chaque pays y a ajouté d’ici ${TO}, en TWh.`,
    `Électricité bas-carbone en ${FROM} et ajoutée d’ici ${TO}, en TWh.`,
  ],
  scope: (shown, all) => `Les ${shown} pays qui ont le plus ajouté, sur ${all}`,
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: (drawn) => `Barres empilées : pour ${drawn.length} pays européens, l’électricité bas-carbone produite en ${FROM} puis ce qui y a été ajouté d’ici ${TO}. L’Espagne a ajouté ${fr(spain.parts[ADDED])} TWh, la France ${fr(france.parts[ADDED])}.`,
  check() {
    if (!(spain.parts[ADDED] > france.parts[ADDED])) throw new Error(`Spain added ${fr(spain.parts[ADDED])}, not more than France's ${fr(france.parts[ADDED])}`);
  },
};
