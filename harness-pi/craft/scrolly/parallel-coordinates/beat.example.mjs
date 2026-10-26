// beat.mjs for the worked example proof/scrolly-parallel-coordinates-electricity-mix — "Deux pays sur
// 16 font les deux : plus de 25 % de nucléaire et plus de 20 % d’éolien", as a scrolly. Every number
// in a card is COMPUTED: the two groups, the lines clearing both floors and the correlation come from
// render-beat.mjs as `r` and are only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);

const YEAR = 2024;
// THE AXIS ORDER IS THE ARGUMENT: the takeaway's two measures first, side by side; the rest of the
// mix low-carbon first, fossil last.
const axes = [
  { key: "nuclear_generation__twh", name: "Nucléaire" },
  { key: "wind_generation__twh", name: "Éolien" },
  { key: "solar_generation__twh", name: "Solaire" },
  { key: "hydro_generation__twh", name: "Hydraulique" },
  { key: "bioenergy_stacked_generation__twh", name: "Bioénergie" },
  { key: "gas_generation__twh", name: "Gaz" },
  { key: "coal_generation__twh", name: "Charbon" },
];
// Every source the country generates, drawn or not: a share is of the whole.
const ALL = [...axes.map((a) => a.key), "oil_generation__twh", "other_renewables_generation__twh"];
const NAMES = {
  FRA: ["France", "la France"], DEU: ["Allemagne", "l’Allemagne"], ESP: ["Espagne", "l’Espagne"], GBR: ["Royaume-Uni", "le Royaume-Uni"],
  SWE: ["Suède", "la Suède"], ITA: ["Italie", "l’Italie"], FIN: ["Finlande", "la Finlande"], AUT: ["Autriche", "l’Autriche"],
  NLD: ["Pays-Bas", "les Pays-Bas"], BEL: ["Belgique", "la Belgique"], POL: ["Pologne", "la Pologne"], CZE: ["Tchéquie", "la Tchéquie"],
  PRT: ["Portugal", "le Portugal"], DNK: ["Danemark", "le Danemark"], GRC: ["Grèce", "la Grèce"], IRL: ["Irlande", "l’Irlande"],
};

// One line per country in 2024: each value is that source's SHARE of the country's generation, in %.
const lines = data.rows
  .filter((r) => Number(r[at("year")]) === YEAR)
  .map((r) => {
    const code = r[at("code")];
    if (!NAMES[code]) throw new Error(`${code} has no French name filed in this beat`);
    const total = ALL.reduce((s, k) => s + Number(r[at(k)]), 0);
    return { key: code, name: NAMES[code][0], values: Object.fromEntries(axes.map((a) => [a.key, (Number(r[at(a.key)]) / total) * 100])) };
  });
const NUCLEAR_FLOOR = 25;
const WIND_FLOOR = 20;
const FOSSIL_CEILING = 2;

// French words: the article for a named country, a count spelled out, a list joined with « et ».
const ARTICLE = Object.fromEntries(Object.values(NAMES));
const the = (l) => ARTICLE[l.name];
const listOf = (xs) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(", ")} et ${xs[xs.length - 1]}`);
const WORDS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const signed = (v) => (v < 0 ? `−${one(-v)}` : one(v));

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  axes,
  lines,
  claimAxes: ["nuclear_generation__twh", "wind_generation__twh"],
  floors: [NUCLEAR_FLOOR, WIND_FLOOR],
  thread: ["FIN", "SWE"],
  // Card 5 says the two keep gas and coal under 2 % each; hydro and bioenergy complete their mix.
  bounds: [
    { axes: ["gas_generation__twh", "coal_generation__twh"], below: FOSSIL_CEILING },
    { axes: ["hydro_generation__twh", "bioenergy_stacked_generation__twh"], sum: true, atLeast: 20 },
  ],
  unit: `part de la production électrique du pays, en %, ${YEAR}`,
  // How each followed line's value is written on its axis.
  format: (v) => `${Math.round(v)} %`,
  cards: {
    first: (r) => `${cap(WORDS[r.count])} pays européens, et la part du nucléaire dans leur électricité en ${YEAR}. ${cap(WORDS[r.first.count])} dépassent ${r.first.floor} % : ${listOf(r.first.lines.map(the))}.`,
    second: (r) => `À côté, l’éolien. Chaque pays tire une ligne de l’un à l’autre. ${cap(WORDS[r.second.count])} dépassent ${r.second.floor} % d’éolien.`,
    crossing: (r) => `Les lignes se croisent : plus un pays a de nucléaire, moins il a d’éolien, avec une corrélation de ${signed(r.corr)}. ${cap(WORDS[r.bothCount])} seulement passent les deux seuils : ${listOf(r.both.map(the))}.`,
    unfold: () => `Déplions le reste du mix : solaire, hydraulique, bioénergie, gaz, charbon. Chaque axe garde sa propre échelle.`,
    follow: (r) => `Suivons ${listOf(r.both.map(the))} : l’hydraulique et la bioénergie complètent leur mix, le gaz et le charbon y restent chacun sous ${FOSSIL_CEILING} %.`,
  },
  // The short accent note in the header while each card is read.
  notes: {
    first: (r) => `${r.first.count} pays à ${r.first.floor} % de nucléaire ou plus`,
    second: (r) => `${r.second.count} pays à ${r.second.floor} % d’éolien ou plus`,
    crossing: (r) => `corrélation : ${signed(r.corr)} · ${r.bothCount} pays passent les deux`,
    unfold: (r) => `${r.axisCount} axes, chacun à sa propre échelle`,
    follow: () => `gaz et charbon : moins de ${FOSSIL_CEILING} % chacun`,
    reading: () => `en couleur : les pays qui passent les deux seuils`,
  },
  title: [
    "Deux pays sur 16 font les deux : plus de 25 % de nucléaire et plus de 20 % d’éolien",
    "La Finlande et la Suède sont les seuls pays à passer les deux seuils, nucléaire et éolien",
    "Les mix électriques européens, axe par axe",
  ],
  // The last card: how the plate reads, and what it leaves out.
  limits:
    "Lecture : seuls deux axes voisins se comparent ; un croisement entre eux est une relation. L’ordre des axes est donc un choix : nucléaire et éolien côte à côte, le fossile au bout.",
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: (r) =>
    `Coordonnées parallèles : ${r.count} pays européens, chacun une ligne traversant sept axes — nucléaire, éolien, solaire, hydraulique, bioénergie, gaz, charbon — ` +
    `chaque axe à sa propre échelle. ${r.first.count} pays dépassent ${r.first.floor} % de nucléaire, ${r.second.count} dépassent ${r.second.floor} % d’éolien, ` +
    `et seuls ${WORDS[r.bothCount]} font les deux, ${listOf(r.both.map(the))} ; leurs lignes sont en couleur.`,
  evidenceLevels: 3,
  check(r) {
    if (r.count !== 16) throw new Error(`the title says 16 countries; the data holds ${r.count}`);
    if (r.bothCount !== 2) throw new Error(`the title says two countries clear both floors; ${r.bothCount} do`);
    if (!(r.first.count >= 3 && r.second.count >= 5)) throw new Error(`each floor needs a real group behind it; ${r.first.count} nuclear, ${r.second.count} wind`);
    if (!(r.corr < -0.2)) throw new Error(`card 3 says the two lean against each other; their correlation is ${r.corr.toFixed(2)}`);
  },
};
