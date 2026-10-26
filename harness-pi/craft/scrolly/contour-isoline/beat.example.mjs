// beat.mjs for the worked example proof/scrolly-contour-europe-distance — "La moitié de l'Europe est à
// moins de 132 km de la mer, et aucun point à plus de 682 km", as a scrolly. data.json is the study
// set (one row per country whose land is measured). Every number in a card is COMPUTED: the field, the
// median, the shares and the farthest point come from render-beat.mjs as `r` and are only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const CODE = table.columns.findIndex((c) => c.name === "code");
if (CODE < 0) throw new Error("data.json has no column code");
// Russia is cut by the frame at 45° E: drawn as land outside the measure, never measured.
const study = table.rows.map((r) => r[CODE]).filter((c) => c && c !== "RUS");

const n0 = (v) => Math.round(v).toLocaleString("fr-FR");
const format = (km) => `${n0(km)} km`;
const percent = (v) => `${Math.round(v)} %`;
const ISLANDS = { 1: "un seul îlot", 2: "deux îlots", 3: "trois îlots" };

export default {
  lang: "fr",
  eyebrow: "Géographie · Europe",
  study,
  // The isolines drawn, in km; the median's line is added by the kit, in the accent.
  levels: [100, 200, 300, 400, 500],
  firstStop: 100,
  farStop: 400,
  // The name of the country the farthest point falls in (the kit names which).
  names: { BLR: "Biélorussie", UKR: "Ukraine", HUN: "Hongrie", SVK: "Slovaquie", POL: "Pologne", CZE: "Tchéquie", ROU: "Roumanie" },
  format,
  percent,
  counter: "{p} % des terres à moins de {km} km",
  unit: "distance à la mer, en kilomètres",
  outsideLabel: "terres hors mesure, dont la Russie, que le cadre coupe",
  cards: {
    land: (r) => `Chaque point des terres est à une certaine distance de la mer. Elle est mesurée ici à vol d’oiseau, sur une grille de ${r.cellKm} km, dans les ${r.studyCount} pays du cadre.`,
    first: (r) => `Partons de toutes les côtes à la fois. À ${format(r.firstStop)} à l’intérieur des terres, ${percent(r.firstShare)} de l’Europe est déjà couverte.`,
    median: (r) => `À ${format(r.medianLevel)}, la moitié : la moitié des terres européennes est plus près de la mer que cela.`,
    far: (r) => `À ${format(r.farStop)}, ${percent(r.farShare)}. Il ne reste que ${ISLANDS[r.islands]} loin de toute mer.`,
    last: (r) => `Le dernier point atteint est en ${r.deepestName}, à ${format(r.deepest)} de la mer : le plus continental des ${r.studyCount} pays mesurés.`,
  },
  title: [
    "La moitié de l’Europe est à moins de 132 km de la mer, et aucun point à plus de 682 km",
    "La moitié de l’Europe est à moins de 132 km de la mer",
    "L’Europe, mesurée depuis la mer",
  ],
  limits: "Lecture : entre deux lignes, la distance varie continûment — cette carte ne compte rien, elle mesure partout. Les lignes se resserrent là où la côte avance : le long des mers intérieures.",
  source: "Contours Natural Earth 50 m · champ mesuré sur une grille de 6 km en projection équivalente (LAEA) · fond de carte © MapTiler © OpenStreetMap",
  alt: (r) =>
    `Carte de l’Europe en courbes de niveau : chaque ligne joint les points situés à la même distance de la mer et porte ` +
    `sa valeur en kilomètres. Les lignes forment des anneaux emboîtés autour d’un centre continental situé en ${r.deepestName}. ` +
    `La moitié des terres est à moins de ${n0(r.median)} km de la mer et aucun point à plus de ${n0(r.deepest)} km.`,
  // The claim checked against the measured field (CONTRACT.md).
  check(r) {
    if (r.studyCount < 30) throw new Error(`the study area holds ${r.studyCount} countries`);
    if (Math.round(r.median) !== 132) throw new Error(`the title says half of Europe is within 132 km of the sea; the median is ${r.median.toFixed(0)} km`);
    if (Math.round(r.deepest) !== 682) throw new Error(`the title says no point is farther than 682 km from the sea; the farthest is ${r.deepest.toFixed(0)} km`);
    if (!ISLANDS[r.islands]) throw new Error(`card 4 counts the islands left beyond ${r.farStop} km; there are ${r.islands}`);
  },
};
