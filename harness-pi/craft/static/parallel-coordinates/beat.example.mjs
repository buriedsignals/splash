// beat.mjs for the worked example proof/static-parallel-coordinates-electricity-mix — "2 pays sur 16
// font les deux : plus de 25 % de nucléaire et plus de 20 % d'éolien". Every number on the plate is
// COMPUTED from data.json; render-beat.mjs measures the correlation between the two claim axes.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [CODE, YEAR] = [col("code"), col("year")];

// THE AXIS ORDER IS THE ARGUMENT: nuclear beside wind, because the crossing between them is the
// claim; then low-carbon first, fossil last.
const axes = [
  { key: "nuclear", name: "Nucléaire" },
  { key: "wind", name: "Éolien" },
  { key: "solar", name: "Solaire" },
  { key: "hydro", name: "Hydraulique" },
  { key: "bioenergy", name: "Bioénergie" },
  { key: "gas", name: "Gaz" },
  { key: "coal", name: "Charbon" },
];
// A share is of the country's WHOLE production, so the sources not drawn count in the total.
const allSources = [...axes.map((a) => a.key), "oil", "other_renewables"];
const NAMES = {
  FRA: "France", DEU: "Allemagne", ESP: "Espagne", GBR: "Royaume-Uni", SWE: "Suède", ITA: "Italie", FIN: "Finlande", AUT: "Autriche",
  NLD: "Pays-Bas", BEL: "Belgique", POL: "Pologne", CZE: "Tchéquie", PRT: "Portugal", DNK: "Danemark", GRC: "Grèce", IRL: "Irlande",
};

// One line per country, 2024: each value is the source's share of the country's own production, in %.
const lines = data.rows
  .filter((r) => Number(r[YEAR]) === 2024)
  .map((r) => {
    const total = allSources.reduce((s, k) => s + Number(r[col(k)]), 0);
    return { key: r[CODE], name: NAMES[r[CODE]] ?? r[CODE], values: Object.fromEntries(axes.map((a) => [a.key, (Number(r[col(a.key)]) / total) * 100])) };
  });

const NUCLEAR_FLOOR = 25;
const WIND_FLOOR = 20;
const both = lines.filter((l) => l.values.nuclear >= NUCLEAR_FLOOR && l.values.wind >= WIND_FLOOR);
const nuclearHeavy = lines.filter((l) => l.values.nuclear >= NUCLEAR_FLOOR);
const windHeavy = lines.filter((l) => l.values.wind >= WIND_FLOOR);

const plain = (s) => s.replace(/[   ]/g, " ");
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const names = both.map((l) => l.name).join(" et ");

export default {
  eyebrow: "Énergie · Europe",
  axes,
  lines,
  // The lines drawn in the accent: the countries that clear both floors.
  thread: both.map((l) => l.key),
  // The two neighbouring axes the takeaway relates.
  claimAxes: ["nuclear", "wind"],
  // Each axis's ceiling is printed at its top: "70 %".
  formatCeiling: (v) => `${v} %`,
  unit: "part de la production électrique du pays, en %, 2024",
  threadNote: "En couleur : les pays qui passent les deux premiers seuils.",
  title: [
    "2 pays sur 16 font les deux : plus de 25 % de nucléaire et plus de 20 % d’éolien",
    `Seuls ${names} passent les deux seuils, nucléaire et éolien`,
    "Les mix électriques européens, axe par axe",
  ],
  limits: [
    `Chaque pays est une ligne qui traverse sept axes — sa part de chaque source dans sa propre électricité en 2024. Chaque axe porte sa propre échelle, ajustée à sa propre colonne. ${nuclearHeavy.length} pays dépassent ${NUCLEAR_FLOOR} % de nucléaire, ${windHeavy.length} dépassent ${WIND_FLOOR} % d’éolien, et ${both.length} font les deux — ${names}.`,
    `Chaque pays est une ligne qui traverse sept axes : sa part de chaque source en 2024, chaque axe à sa propre échelle. ${both.length} pays seulement passent les deux premiers seuils.`,
    "Chaque pays est une ligne qui traverse sept axes, chacun à sa propre échelle.",
  ],
  reading: [
    "Lecture : seuls deux axes VOISINS se comparent — un croisement entre eux est une relation, une ligne qui monte trois axes plus loin n’est rien. L’ordre des axes est donc un choix : nucléaire et éolien côte à côte, le fossile au bout.",
    "Lecture : seuls deux axes voisins se comparent. L’ordre des axes est un choix.",
  ],
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: ({ r }) =>
    `Graphique en coordonnées parallèles : ${lines.length} pays européens, chacun une ligne traversant sept axes verticaux, chaque axe à sa propre échelle et portant sa part de la production du pays en 2024. ${nuclearHeavy.length} pays dépassent ${NUCLEAR_FLOOR} % de nucléaire, ${windHeavy.length} dépassent ${WIND_FLOOR} % d’éolien, et seuls ${names} font les deux ; leurs lignes sont en couleur. Corrélation entre les deux parts : ${one(r)}.`,
  evidenceLevels: 4,
  check({ r }) {
    if (both.length !== 2) throw new Error(`${both.length} countries clear both floors, not 2`);
    if (lines.length !== 16) throw new Error(`${lines.length} countries are drawn, not 16`);
    if (!(r < -0.2)) throw new Error(`nuclear and wind shares correlate at ${r.toFixed(2)}: they do not lean against each other`);
  },
};
