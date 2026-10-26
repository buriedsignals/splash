// beat.mjs for the worked example proof/scrolly-small-multiples-lowcarbon — "Tous ont progressé, et
// les plus bas le plus vite", as a scrolly. Every number in a card is COMPUTED: the first state's ends,
// the correlation and the extremes of the gain come from render-beat.mjs as `r` and are only WORDED
// here; the shares themselves are computed below from the generation columns.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = data.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const FROM = 2000;
const TO = 2024;
const CLEAN = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh"].map(col);
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"].map(col);
const [ENTITY, YEAR] = [col("entity"), col("year")];
const FRENCH = {
  Austria: ["Autriche", "l’Autriche"], Belgium: ["Belgique", "la Belgique"], Czechia: ["Tchéquie", "la Tchéquie"], Denmark: ["Danemark", "le Danemark"],
  Finland: ["Finlande", "la Finlande"], France: ["France", "la France"], Germany: ["Allemagne", "l’Allemagne"], Greece: ["Grèce", "la Grèce"],
  Ireland: ["Irlande", "l’Irlande"], Italy: ["Italie", "l’Italie"], Netherlands: ["Pays-Bas", "les Pays-Bas"], Poland: ["Pologne", "la Pologne"],
  Portugal: ["Portugal", "le Portugal"], Spain: ["Espagne", "l’Espagne"], Sweden: ["Suède", "la Suède"], "United Kingdom": ["Royaume-Uni", "le Royaume-Uni"],
};
const sum = (row, cols) => cols.reduce((s, i) => s + Number(row[i] || 0), 0);
/** The low-carbon share (renewables + nuclear) of all generation, in percent. */
const share = (row) => (sum(row, CLEAN) / (sum(row, CLEAN) + sum(row, FOSSIL))) * 100;

const entities = [...new Set(data.rows.map((r) => r[ENTITY]))];
const panels = entities.map((entity) => {
  if (!FRENCH[entity]) throw new Error(`no French name recorded for ${entity}`);
  const a = data.rows.find((r) => r[ENTITY] === entity && Number(r[YEAR]) === FROM);
  const b = data.rows.find((r) => r[ENTITY] === entity && Number(r[YEAR]) === TO);
  if (!a || !b) throw new Error(`${entity} is missing ${FROM} or ${TO}`);
  return { name: FRENCH[entity][0], from: share(a), to: share(b) };
});
const ARTICLE = Object.fromEntries(Object.values(FRENCH).map(([name, withArticle]) => [name, withArticle]));

const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const signedR = (v) => `−${Math.abs(v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const cap = (s) => s[0].toUpperCase() + s.slice(1);

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  panels,
  states: { from: String(FROM), to: String(TO) },
  xName: `part bas-carbone en ${FROM}, en %`,
  yName: `gain ${FROM}–${TO}, en points`,
  format: one,
  formatDelta: (v) => `+${Math.round(v)}`,
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    start: (r) => `Seize pays européens, un panneau chacun, par ordre alphabétique. La barre claire est la part de l’électricité bas-carbone en ${FROM}, de ${one(r.lowest.from)} % en ${r.lowest.name} à ${one(r.highestStart.from)} % en ${r.highestStart.name}. Tous les panneaux ont la même échelle.`,
    rise: () => `La barre foncée, ${TO}. Toutes montent : seize sur seize.`,
    byFrom: () => `Rangeons les panneaux du plus bas au plus haut en ${FROM}. Les gains diminuent le long de la grille.`,
    scatter: (r) => `Chaque panneau devient un point : son niveau de ${FROM} en largeur, son gain en hauteur. Plus un pays partait bas, plus il a gagné : corrélation de ${signedR(r.correlation)}.`,
    byGain: (r) => `Rangés par gain : ${cap(ARTICLE[r.biggest.name])}, +${Math.round(r.biggest.delta)} points, en tête ; ${ARTICLE[r.smallest.name]}, qui partait de ${one(r.smallest.from)} %, +${Math.round(r.smallest.delta)}.`,
  },
  // The short accent note in the header while each card is read.
  notes: {
    start: (r) => `${FROM} : de ${one(r.lowest.from)} à ${one(r.highestStart.from)} %`,
    rise: (r) => `${r.count} sur ${r.count} en hausse`,
    byFrom: () => `rangés par niveau de ${FROM}`,
    scatter: (r) => `corrélation : ${signedR(r.correlation)}`,
    byGain: (r) => `${r.biggest.name} +${Math.round(r.biggest.delta)} · ${r.smallest.name} +${Math.round(r.smallest.delta)}`,
    reading: () => `même échelle, 0–100 %`,
  },
  title: [`Tous ont progressé, et les plus bas le plus vite`, `Tous en hausse, les plus bas le plus vite`, `Le bas-carbone, pays par pays`],
  // The last card: how to read the grid.
  limits: `Lecture : un panneau par pays, tous à la même échelle, de 0 à 100 %. Le nombre sous chaque panneau est le gain, en points.`,
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: (r) =>
    `Petits multiples : seize panneaux, un par pays européen, chacun deux barres à la même échelle — la part d’électricité bas-carbone en ${FROM} et en ${TO}. ` +
    `Toutes montent ; ${r.biggest.name} gagne ${Math.round(r.biggest.delta)} points, ${r.smallest.name} ${Math.round(r.smallest.delta)}. Plus un pays partait bas, plus il a gagné.`,
  evidenceLevels: 3,
  check(r) {
    if (r.risers !== r.count) throw new Error(`the title says all rose; ${r.count - r.risers} of ${r.count} did not`);
    if (!(r.correlation < -0.5)) throw new Error(`the title says the lowest starters gained most; the correlation is ${r.correlation.toFixed(2)}`);
    if (r.smallest.name !== r.highestStart.name) throw new Error(`card 5 says the smallest gain belongs to the highest starter; ${r.smallest.name} against ${r.highestStart.name}`);
  },
};
