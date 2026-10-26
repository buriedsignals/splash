// beat.mjs for the worked example proof/scrolly-connected-scatter-lowcarbon — "Les 16 pays ont tous
// nettoyé leur électricité — 5 pèsent pourtant moins dans le bas-carbone européen", as a scrolly. The two
// shares are computed here from the generation columns; every move, count and close-up figure comes from
// render-beat.mjs as `r` and is only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [CODE, YEAR] = [col("code"), col("year")];
const LOW_CARBON = ["other_renewables_generation__twh", "bioenergy_stacked_generation__twh", "solar_generation__twh", "wind_generation__twh", "hydro_generation__twh", "nuclear_generation__twh"].map(col);
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"].map(col);
const FROM = 2000;
const TO = 2024;
const NAMES = {
  FRA: "France", DEU: "Allemagne", ESP: "Espagne", GBR: "Royaume-Uni", SWE: "Suède",
  ITA: "Italie", FIN: "Finlande", AUT: "Autriche", NLD: "Pays-Bas", BEL: "Belgique",
  POL: "Pologne", CZE: "Tchéquie", PRT: "Portugal", DNK: "Danemark", GRC: "Grèce", IRL: "Irlande",
};

// Low-carbon and total generation, per country and year.
const sum = (row, cols) => cols.reduce((s, i) => s + Number(row[i]), 0);
const gen = (code, year) => {
  const row = table.rows.find((r) => r[CODE] === code && Number(r[YEAR]) === year);
  const lc = sum(row, LOW_CARBON);
  return { lc, total: lc + sum(row, FOSSIL) };
};
const codes = [...new Set(table.rows.map((r) => r[CODE]))];
const groupLc = (year) => codes.reduce((s, c) => s + gen(c, year).lc, 0);
// x: the country's share of the group's low-carbon generation; y: low-carbon's share of its own mix.
const state = (code, year) => ({ x: (gen(code, year).lc / groupLc(year)) * 100, y: (gen(code, year).lc / gen(code, year).total) * 100 });
const entities = codes.map((code) => ({ name: NAMES[code], code, from: state(code, FROM), to: state(code, TO) }));
const subjectProducedMore = gen("FRA", TO).lc > gen("FRA", FROM).lc;

const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const listOf = (names) => `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  entities,
  subject: "France",
  from: FROM,
  to: TO,
  xName: (r) => `part du bas-carbone des ${r.count} pays, en %`,
  yName: "part de bas-carbone dans sa propre électricité, en %",
  format: one,
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    start: (r) =>
      `En ${r.from}, chaque pays est un cercle vide. En abscisse, sa part du bas-carbone des ${r.count} pays ; en ordonnée, la part de bas-carbone dans sa propre électricité. La ${r.subject.label}, seule à droite, en fournit ${one(r.subject.from.x)} %.`,
    travel: (r) => `Jusqu’en ${r.to}, chacun glisse le long de son arc vers un cercle plein. Les ${r.up.length} arcs montent : tous se sont nettoyés chez eux.`,
    left: (r) => `Mais ${r.left.length} pointent vers la gauche. ${listOf(r.left.map((e) => e.label))} pèsent moins dans le bas-carbone européen qu’en ${r.from}.`,
    subject: (r) =>
      `La ${r.subject.label} a gagné ${one(r.subject.dy)} points chez elle et perdu ${one(-r.subject.dx)} points de poids européen. Elle a produit plus ; les autres ont produit plus vite.`,
    zoom: (r) => `Resserré sur 0–${r.zoomMax} %, l’axe ouvre le paquet tassé près de l’origine : ${r.crowdRight.length} des ${r.crowd.length} pays restants pèsent plus lourd qu’en ${r.from}.`,
  },
  // Card 2's counter: it climbs to the number it states.
  upCount: (r) => `${r.up.length} pays sur ${r.count} plus propres chez eux`,
  // Written at the subject's arc in card 4.
  subjectCounts: (r) => `${r.subject.label} : +${one(r.subject.dy)} pts chez elle · −${one(-r.subject.dx)} pts de poids européen`,
  title: [
    "Les 16 pays ont tous nettoyé leur électricité — 5 pèsent pourtant moins dans le bas-carbone européen",
    "Tous plus propres chez eux, 5 plus légers en Europe",
    "Plus propres chez eux, plus légers en Europe",
  ],
  // The last card: how to read the two axes.
  limits:
    "Lecture : monter, c’est se nettoyer chez soi ; aller à droite, c’est peser plus lourd dans le groupe. Les deux sont indépendants, et c’est tout l’intérêt de tracer les deux.",
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: (r) =>
    `Nuage connecté de ${r.count} pays européens entre ${r.from} et ${r.to}. Chaque pays est un cercle vide ` +
    `(${r.from}) relié par un arc pointillé à un cercle plein (${r.to}). L’abscisse est sa part du bas-carbone des ` +
    `${r.count} pays, l’ordonnée la part de bas-carbone dans sa propre électricité. Tous les arcs montent. ` +
    `${r.left.length} pointent vers la gauche, dont la ${r.subject.label}, qui perd ${one(-r.subject.dx)} points de ` +
    `poids européen tout en gagnant ${one(r.subject.dy)} points de bas-carbone chez elle.`,
  evidenceLevels: 4,
  check(r) {
    if (r.up.length !== r.count) throw new Error(`the title says every country got cleaner at home; ${r.count - r.up.length} did not`);
    if (r.left.length !== 5) throw new Error(`the title says 5 weigh less in the group; ${r.left.length} do`);
    if (r.heaviest.name !== "France") throw new Error(`card 1 says France stands alone on the right in ${r.from}; ${r.heaviest.name} does`);
    if (!(r.subject.dx < -5 && r.subject.dy > 0)) throw new Error(`card 4 says France got cleaner at home and lighter in the group`);
    if (!subjectProducedMore) throw new Error("card 4 says France produced more; it produced less");
  },
};
