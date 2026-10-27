// beat.mjs for the worked example proof/static-contour-europe-distance — "Half of Europe is less
// than 132 km from the sea, and no point is more than 682 km" — written for the gesture kit: the staging
// is the `gestures` list. A line is named by its label (levelLabel(level)), the summit by summitLabel; a
// reference draws one more true isoline of the field at its value. The field is measured by field.mjs;
// every number in a sentence other than the title's first form is COMPUTED from it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { measureSeaDistance } from "./field.mjs";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [NAME, CODE] = [col("entity"), col("code")];

// The study area: the ISO-3 codes of data.json, minus Russia, which the frame cuts.
const study = table.rows.map((r) => r[CODE]).filter((code) => code !== "RUS");
const field = measureSeaDistance(import.meta.dirname, { study });

// The deepest point's country, named from data.json in the plate's language.
const FRENCH = { BLR: "Biélorussie", UKR: "Ukraine", HUN: "Hongrie", POL: "Pologne" };
const deepestName = FRENCH[field.deepestIso] ?? table.rows.find((r) => r[CODE] === field.deepestIso)?.[NAME];

// Whole kilometres with an ordinary space (fr-FR's narrow no-break space is in no face).
const km = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

export default {
  eyebrow: "Géographie · Europe",
  field,
  unit: "distance à la mer, en kilomètres",
  limitNote: "La Russie n’est pas mesurée : le cadre coupe son territoire.",
  levelLabel: (level) => `${level} km`,
  summitLabel: `${km(field.deepest)} km`,
  // The staging, in story order: the median drawn as its own line in the accent, then the summit named.
  gestures: [
    { do: "reference", value: Math.round(field.median), note: `En deçà de ${km(field.median)} km : la moitié des terres` },
    { do: "name", mark: `${km(field.deepest)} km` },
  ],
  // The FIRST form is the journalist's takeaway, copied literally; shorter forms may follow.
  title: [
    "La moitié de l’Europe est à moins de 132 km de la mer, et aucun point à plus de 682 km",
    `La moitié de l’Europe est à moins de ${km(field.median)} km de la mer`,
    "L’Europe, mesurée depuis la mer",
  ],
  limits: [
    `Chaque ligne joint les points situés à la même distance de la mer, mesurée à vol d’oiseau sur une grille de ${field.cellKm} km en projection équivalente. ` +
      `Le point le plus continental des ${field.study.length} pays mesurés est en ${deepestName}, à ${km(field.deepest)} km ; ` +
      `la moitié des terres est en deçà de ${km(field.median)} km, et ${Math.round(field.within(400))} % en deçà de 400.`,
    `Chaque ligne joint les points à la même distance de la mer. Le plus continental des ${field.study.length} pays mesurés est en ${deepestName}, à ${km(field.deepest)} km.`,
    "Chaque ligne joint les points à la même distance de la mer.",
  ],
  reading: [
    "Lecture : entre deux lignes, la distance varie continûment — cette carte ne compte rien, elle mesure partout.",
    "Lecture : entre deux lignes, la distance varie continûment.",
  ],
  source: `Fond de carte MapTiler · champ mesuré sur une grille de ${field.cellKm} km en projection équivalente (LAEA)`,
  alt:
    `Carte de l’Europe en courbes de niveau : chaque ligne joint les points situés à la même distance de la mer et porte sa valeur en kilomètres. ` +
    `Les lignes forment des anneaux emboîtés autour d’un centre continental situé en ${deepestName}. ` +
    `La moitié des terres est à moins de ${km(field.median)} km de la mer et aucun point à plus de ${km(field.deepest)} km.`,
  evidenceLevels: 3,
  // The claim checked at the takeaway's precision: if the study area changes, the render refuses.
  check() {
    if (Math.round(field.median) !== 132) throw new Error(`the median distance is ${Math.round(field.median)} km, not 132`);
    if (Math.round(field.deepest) > 682) throw new Error(`the farthest point is ${Math.round(field.deepest)} km from the sea, more than 682`);
  },
};
