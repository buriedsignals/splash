// beat.mjs for the worked example proof/web-streamgraph-swiss-electricity — Swiss solar, from a
// thread to the country's third source of electricity since 2016, as an interactive page. Every
// number on the page is COMPUTED from data.json; the rank and the year it is reached, the shears and
// the axes the floor control earns are computed by render-beat.mjs and only WORDED here.
//
// One departure from the worked example, on purpose: its page drew 2025, which the file holds
// PARTIAL (65 TWh against 79 in 2024) — drawn, it reads as a collapse. The static sibling leaves it
// out and says so; so does this beat, and the title's last figure is 2024's.
import { readTable, series } from "./series.mjs";

const table = readTable(import.meta.dirname);
const FIRST = 2000;
const LAST = 2024;

// The stacking order, bottom first: the two large sources, then the one the title is about.
const keys = ["Hydropower", "Nuclear", "Solar", "Bioenergy", "Wind", "Gas", "Oil", "Coal", "Other renewables"];
const labels = {
  Hydropower: "hydraulique", Nuclear: "nucléaire", Solar: "solaire", Bioenergy: "biomasse", Wind: "éolien",
  Gas: "gaz", Oil: "pétrole", Coal: "charbon", "Other renewables": "autres renouv.",
};
const byKey = Object.fromEntries(
  keys.map((k) => [k, new Map(series(table, { x: "Year", y: k, where: { Code: "CHE" }, from: FIRST, to: LAST }).map((p) => [p.year, p.value]))]),
);
const years = [...byKey[keys[0]].keys()];
const readings = years.map((year) => ({ year, ...Object.fromEntries(keys.map((k) => [k, byKey[k].get(year)])) }));

const TRACKED = "Solar";
const RANK = 3;
const rankIn = (r) => keys.map((k) => ({ k, v: r[k] })).sort((a, b) => b.v - a.v).findIndex((e) => e.k === TRACKED) + 1;
const reachedIn = readings.find((r) => rankIn(r) <= RANK).year;
const first = readings[0];
const last = readings[readings.length - 1];

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
/** "le solaire", "l'hydraulique" — the article the sentences need. */
const article = (name) => (/^[aeiouéèêh]/i.test(name) ? `l'${name}` : `le ${name}`);

export default {
  lang: "fr",
  eyebrow: "Énergie · Suisse",
  keys,
  labels,
  tracked: TRACKED,
  readings,
  rank: RANK,
  reachedIn,
  unit: "TWh",
  format: (v) => fr(v, 2),
  formatTick: (v) => fr(v, 0),
  formatTotal: (v) => fr(v, 1),
  // What a year answers when it is hovered, tapped or tabbed to.
  detail: (y) => `${y.year} · ${fr(y.total)} TWh au total · par rang : ${y.ranked.map((s) => `${s.name} ${fr(s.value, 2)}`).join(" · ")} TWh`,
  // The words beside the ring, at the year the tracked layer reaches its rank.
  crossingLabel: (c) => `${c.year} : le ${c.name} passe troisième`,
  // The floor control: its legend, the untouched stream, and each layer's words.
  floorLabel: "Au sol",
  noneLabel: "Silhouette",
  announce: (o) => `${o.label} au sol — ${noteOf(o)}`,
  note: (o) => noteOf(o),
  title: "Le solaire suisse est passé de 0,01 à 5,66 TWh — troisième source du pays depuis 2016",
  limits:
    `Production d'électricité suisse par source, ${years[0]}-${years[years.length - 1]}. Aucune des ` +
    `neuf bandes ne repose sur une droite ; sept déplacent leur sol plus que leur épaisseur ne varie.`,
  reading: `Lecture : survolez ou tabulez une année pour ses neuf sources par rang.`,
  source: `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data`,
  alt:
    `Un flux de neuf bandes empilées sur une ligne de base flottante, de ${years[0]} à ` +
    `${years[years.length - 1]}. Les deux bandes les plus épaisses, l'hydraulique et le ` +
    `nucléaire, tiennent presque toute la hauteur. Une bande fine, le solaire, part d'un filet ` +
    `invisible et s'épaissit régulièrement jusqu'à ${fr(last[TRACKED], 2)} TWh ; elle passe ` +
    `troisième en ${reachedIn} et le reste. Un bouton pose au sol la bande de votre ` +
    `choix : le flux se cisaille jusqu'à ce que son bord inférieur soit droit, et un axe en ` +
    `TWh s'ouvre pour elle seule.`,
  evidenceLevels: 3,
  check() {
    if (reachedIn !== 2016) throw new Error(`solar first reaches third place in ${reachedIn}, not 2016`);
    if (fr(first[TRACKED], 2) !== "0,01") throw new Error(`solar starts at ${fr(first[TRACKED], 2)} TWh, not 0,01`);
    if (fr(last[TRACKED], 2) !== "5,66") throw new Error(`solar ends at ${fr(last[TRACKED], 2)} TWh, not 5,66`);
  },
};

/** The sentence a layer laid flat owes the reader: its two ends, a peak or trough between, the move. */
function noteOf(o) {
  const parts = [`${fr(o.first.value, 2)} TWh en ${o.first.year}`];
  if (o.peak) parts.push(`sommet à ${fr(o.peak.value, 2)} en ${o.peak.year}`);
  if (o.trough) parts.push(`creux à ${fr(o.trough.value, 2)} en ${o.trough.year}`);
  parts.push(`${fr(o.last.value, 2)} en ${o.last.year}`);
  return (
    `${article(o.name)} sur son propre zéro : ${parts.join(", ")} — ` +
    `${o.move >= 0 ? "+" : "−"}${fr(Math.abs(o.move), 2)} TWh d'un bout à l'autre, ` +
    `soit ${fr(o.share)} % du total ${o.last.year}. L'axe ne mesure que cette bande.`
  );
}
