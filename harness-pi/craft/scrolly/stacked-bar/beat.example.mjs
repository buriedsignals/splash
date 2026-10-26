// beat.mjs for the worked example proof/scrolly-stacked-bar-lowcarbon-growth — "L’Espagne a ajouté
// plus d’électricité bas-carbone que la France depuis 2000", as a scrolly. Every number in a card is
// COMPUTED: the drawn rows, the pair's levels, additions and totals, the two ratios and the ranks
// come from render-beat.mjs as `r` and are only WORDED here.
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
const [ENTITY, YEAR] = [col("entity"), col("year")];
const FRENCH = {
  Austria: "Autriche", Belgium: "Belgique", Czechia: "Tchéquie", Denmark: "Danemark", Finland: "Finlande", France: "France", Germany: "Allemagne", Greece: "Grèce",
  Ireland: "Irlande", Italy: "Italie", Netherlands: "Pays-Bas", Poland: "Pologne", Portugal: "Portugal", Spain: "Espagne", Sweden: "Suède", "United Kingdom": "Royaume-Uni",
};
const ORDINALS = ["", "première", "deuxième", "troisième", "quatrième", "cinquième", "sixième", "septième", "huitième", "neuvième", "dixième", "onzième", "douzième"];
/** Low-carbon generation (renewables + nuclear), in TWh. */
const clean = (row) => CLEAN.reduce((s, i) => s + Number(row[i] || 0), 0);

const entities = [...new Set(data.rows.map((r) => r[ENTITY]))];
const rows = entities.map((entity) => {
  if (!FRENCH[entity]) throw new Error(`no French name recorded for ${entity}`);
  const a = data.rows.find((r) => r[ENTITY] === entity && Number(r[YEAR]) === FROM);
  const b = data.rows.find((r) => r[ENTITY] === entity && Number(r[YEAR]) === TO);
  if (!a || !b) throw new Error(`${entity} is missing ${FROM} or ${TO}`);
  return { name: FRENCH[entity], level: clean(a), growth: clean(b) - clean(a) };
});

const whole = (v) => Math.round(v).toLocaleString("fr-FR");
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  rows,
  drawCount: 12,
  highlight: ["Espagne", "France"],
  segments: { level: `produit en ${FROM}`, growth: "ajouté depuis" },
  format: whole,
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    level: (r) => `L’électricité bas-carbone produite en ${FROM}, renouvelables et nucléaire, dans les ${r.drawCount} pays qui en ont le plus ajouté depuis, sur ${r.count} étudiés. La France est loin devant : ${whole(r.levelLeader.level)} TWh.`,
    grow: () => `Ajoutons ce que chacun a gagné d’ici ${TO}. Le total de ${TO} s’écrit au bout de chaque barre.`,
    sort: (r) => `Rangeons-les par ce qu’ils ont ajouté. L’Espagne passe en tête ; la France descend à la ${ORDINALS[r.incumbent.growthRank]} place.`,
    detach: (r) => `Les ajouts seuls, sur la même ligne de départ : ${whole(r.adder.growth)} TWh pour l’Espagne, ${whole(r.incumbent.growth)} TWh pour la France.`,
    pair: (r) => `En ${FROM}, la France produisait ${one(r.headStart)} fois plus que l’Espagne. Depuis, l’Espagne a ajouté ${one(r.ratio)} fois plus. La France reste de loin la première, à ${whole(r.incumbent.total)} TWh.`,
  },
  // The short accent note in the header while each card is read.
  notes: {
    level: (r) => `${r.levelLeader.name} : ${whole(r.levelLeader.level)} TWh en ${FROM}`,
    grow: () => `totaux ${TO}, en TWh`,
    sort: () => "rangés par ajout",
    detach: (r) => `${r.adder.name} +${whole(r.adder.growth)} · ${r.incumbent.name} +${whole(r.incumbent.growth)}`,
    pair: (r) => `${r.incumbent.name} : ${whole(r.incumbent.total)} TWh en ${TO}, première`,
    reading: () => "en TWh",
  },
  title: [
    `L’Espagne a ajouté plus d’électricité bas-carbone que la France depuis ${FROM}`,
    `L’Espagne a ajouté plus de bas-carbone que la France`,
    `Le bas-carbone ajouté depuis ${FROM}`,
  ],
  // The last card: how to read the stack.
  limits: `Lecture : chaque barre empile ce qui était produit en ${FROM} et ce qui a été ajouté depuis, en TWh ; le nombre au bout est le total de ${TO}.`,
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: (r) =>
    `Barres empilées : ${r.drawCount} pays européens, chaque barre l’électricité bas-carbone produite en ${FROM} puis ce qui a été ajouté d’ici ${TO}, en TWh. ` +
    `L’Espagne a ajouté ${whole(r.adder.growth)} TWh, la France ${whole(r.incumbent.growth)} ; la France reste la première, à ${whole(r.incumbent.total)} TWh.`,
  evidenceLevels: 3,
  check(r) {
    if (r.growthLeader.name !== "Espagne") throw new Error(`the headline says Spain added the most; ${r.growthLeader.name} did`);
    if (r.adder.name !== "Espagne") throw new Error(`the headline says Spain added more than France`);
    if (!(r.headStart >= 4)) throw new Error(`card 5 says France started several times higher; the ratio is ${r.headStart.toFixed(2)}`);
    if (r.largestTotal.name !== "France") throw new Error(`card 5 says France is still the largest producer; ${r.largestTotal.name} is`);
    if (r.levelLeader.name !== "France") throw new Error(`card 1 says France starts far ahead; ${r.levelLeader.name} does`);
  },
};
