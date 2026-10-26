// beat.mjs for the worked example proof/web-contour-europe-distance — "La moitié de l'Europe est à
// moins de 133 km de la mer". The field is measured by field.mjs; every number in a sentence other
// than the title is COMPUTED from it or taken from the reading a word function receives. The bands,
// the lines, the step control, the camera and the colours are the kit's.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { measureSeaDistance } from "./field.mjs";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const CODE = col("code");

// The study area: the ISO-3 codes of data.json, minus Russia, which the frame cuts.
const study = table.rows.map((r) => r[CODE]).filter((code) => code !== "RUS");
const field = measureSeaDistance(import.meta.dirname, { study });

// The page is French: the names a pointer answers with.
const names = {
  ALB: "Albanie", AUT: "Autriche", BLR: "Biélorussie", BEL: "Belgique", BIH: "Bosnie-Herzégovine",
  BGR: "Bulgarie", HRV: "Croatie", CYP: "Chypre", CZE: "Tchéquie", DNK: "Danemark",
  EST: "Estonie", FIN: "Finlande", FRA: "France", DEU: "Allemagne", GRC: "Grèce",
  HUN: "Hongrie", ISL: "Islande", IRL: "Irlande", ITA: "Italie", LVA: "Lettonie",
  LTU: "Lituanie", LUX: "Luxembourg", MLT: "Malte", MDA: "Moldavie", MNE: "Monténégro",
  NLD: "Pays-Bas", MKD: "Macédoine du Nord", NOR: "Norvège", POL: "Pologne", PRT: "Portugal",
  ROU: "Roumanie", SRB: "Serbie", SVK: "Slovaquie", SVN: "Slovénie", ESP: "Espagne",
  SWE: "Suède", CHE: "Suisse", TUR: "Turquie", UKR: "Ukraine", GBR: "Royaume-Uni",
};
const fr = (v, d = 0) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const deepestName = names[field.deepestIso];

export default {
  lang: "fr",
  eyebrow: "Géographie · Europe",
  field,
  names,
  stepLabel: (km) => `${km} km`,
  stepAnnounce: (km) => `Intervalle de ${km} km entre deux courbes`,
  stepNote: (s) =>
    s.finest
      ? `${s.classes} bandes, ${s.drawn} courbes : à ±${fr(s.half)} km près, sous les ±${fr(s.errorKm)} km d'erreur d'échelle du cadre — ce pas dessine plus de détail que le champ n'en porte.`
      : s.coarsest
        ? `${s.classes} bandes, ${s.drawn} courbe : la médiane de ${fr(s.median)} km et les ${fr(s.withinStep)} % à moins de ${s.km} km tombent dans la première — ce pas ne distingue plus rien de ce que le titre affirme.`
        : `${s.classes} bandes, ${s.drawn} courbes : un point reste indéterminé à ±${fr(s.half)} km dans sa bande, contre ±${fr(s.errorKm)} km d'erreur de mesure — pas et mesure du même ordre.`,
  bandDetail: ({ lower, upper, step }) => `la bande ${lower}–${upper} km au pas de ${step} km`,
  binDetail: ({ lower, upper }) => `à ${fr(lower)}–${fr(upper)} km de la mer`,
  levelDetail: (l) => `${l.level} km : ${fr(l.areaKm2)} km² de terres sont plus loin de la mer que cette courbe, et elle n'est tracée qu'aux pas de ${l.drawnBy.join(", ")} km.`,
  percent: (v) => `${fr(v, 1)} %`,
  stepLegend: "Pas entre deux courbes",
  nearLabel: "la mer",
  farLabel: (top) => `${fr(top)} km`,
  tableCaption: ({ levels }) => `Les ${levels} courbes traçables, et celles que le pas choisi laisse tomber`,
  columns: ["Courbe (km)", "Terres au-delà"],
  claimNote: `Médiane ${fr(field.median)} km · ${fr(field.within(400))} % des terres à moins de 400 km · point le plus éloigné ${fr(field.deepest)} km, en ${deepestName}.`,
  limitNote:
    `Aire d'étude : les ${field.study.length} pays des cartes voisines, MOINS la Russie — le cadre coupe le territoire russe, et une distance mesurée jusqu'à une côte qui s'arrête au bord du papier n'est pas une distance. ` +
    `Maille de ${fr(field.cellKm, 1)} km en projection équivalente (LAEA) : c'est ce qui MESURE, et l'erreur d'échelle y reste sous ${field.scaleErrorPc} % sur le cadre. ` +
    `Le champ est rangé une fois pour toutes en paliers de ${field.binKm} km, dont chaque pas proposé est un multiple : changer de pas recoupe le même champ, ça ne le remesure pas.`,
  // Which countries the Mercator sentence names (the worked example's four; leave out and the kit
  // names the four it inflates most).
  inflated: ["NOR", "SWE", "FIN", "ISL"],
  mercator: (m) =>
    `Dessinée en Web Mercator, qui étire le nord : ${m.names.slice(0, -1).join(", ")} et ${m.names[m.names.length - 1]} occupent ${fr(m.pageShare, 1)} % de la terre dessinée pour ${fr(m.trueShare, 1)} % de la terre réelle. Les distances, elles, sont mesurées sur une grille équivalente.`,
  reading:
    "Lecture : le pas entre deux courbes est le seul choix de cette carte que le lecteur ne voit jamais. Choisissez-le, puis survolez la terre : la bande entière qu'il donne à ce point s'allume, et la réponse garde la distance mesurée à côté d'elle.",
  hint:
    "La carte est vivante : molette ou boutons pour zoomer, glisser pour déplacer, flèches du clavier une fois la carte au focus. Survolez la terre pour la distance mesurée, le pays et la bande que le pas choisi lui donne.",
  smallestLabel: "une maille peinte",
  title: "La moitié de l'Europe est à moins de 133 km de la mer",
  limits:
    "Chaque courbe relie les points également distants de la CÔTE — pas d'un réseau de stations : un champ fait d'enregistrements n'est continu que si les enregistrements sont complets, et rien ne manque à un polygone.",
  source:
    "Source : distance calculée sur les mêmes formes que les cartes voisines, transformée en distance euclidienne exacte · fond de carte MapTiler (dataviz), teinté par la direction",
  alt:
    `Une carte d'Europe sur fond MapTiler où la terre est teintée par bandes selon sa distance à la mer, du plus clair au bord des côtes au plus foncé au cœur du continent, ` +
    `et traversée de courbes de niveau dont chacune porte son propre chiffre. Les bandes claires enveloppent tout le pourtour ; les plus foncées forment une tache unique en ` +
    `Europe de l'Est, dont le point le plus éloigné, en ${deepestName}, est à ${fr(field.deepest)} km de la mer. Une commande à ${field.steps.length} positions recoupe le ` +
    `même champ mesuré en ${field.steps.map((s) => field.topKm / s).join(", ").replace(/, (\d+)$/, " ou $1")} bandes, et la carte elle-même se zoome et se déplace avec les contrôles de MapTiler.`,
  evidenceLevels: 3,
  // The claim checked at the takeaway's precision: if the study area changes, the render refuses.
  check(f) {
    if (Math.round(f.median) !== 133) throw new Error(`the median distance is ${Math.round(f.median)} km, not 133`);
  },
};
