// beat.mjs for the worked example proof/scrolly-diverging-stacked-electricity — "Le nucléaire tient le
// centre : en France il pèse plus que le fossile et le renouvelable réunis", as a scrolly. The shares are
// computed here from the generation columns; each row's totals, who leans furthest and the subject's two
// sides together come from render-beat.mjs as `r` and are only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR_COL] = [col("Entity"), col("Year")];
const YEAR = 2024;

// Ordered OUTWARD from the centre, which is what each ramp encodes.
const FOSSIL = [["Gas", "gaz"], ["Oil", "pétrole"], ["Coal", "charbon"]];
const RENEWABLE = [["Bioenergy", "bioénergie"], ["Other renewables", "autres"], ["Hydropower", "hydraulique"], ["Solar", "solaire"], ["Wind", "éolien"]];
const CENTRE = ["Nuclear", "nucléaire"];
const FRENCH = {
  France: ["France", "la France"], Germany: ["Allemagne", "l’Allemagne"], Norway: ["Norvège", "la Norvège"],
  Poland: ["Pologne", "la Pologne"], Sweden: ["Suède", "la Suède"], Switzerland: ["Suisse", "la Suisse"],
};

// Each level's share of the row's total generation, in percent.
const SOURCES = [...FOSSIL, CENTRE, ...RENEWABLE].map(([column]) => column);
const rows = table.rows
  .filter((r) => Number(r[YEAR_COL]) === YEAR)
  .map((r) => {
    const total = SOURCES.reduce((s, c) => s + Number(r[col(c)]), 0);
    const level = ([column, label]) => ({ key: column, label, value: (Number(r[col(column)]) / total) * 100 });
    return { key: r[ENTITY], label: FRENCH[r[ENTITY]][0], left: FOSSIL.map(level), centre: level(CENTRE), right: RENEWABLE.map(level) };
  });

const the = (row) => FRENCH[row.key][1];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const SPELLED = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze"];
const pct = (v) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  rows,
  subject: "France",
  leftName: "Fossile",
  rightName: "Renouvelable",
  centreName: "nucléaire",
  unitLine: `part de la production d’électricité en ${YEAR}, en %`,
  // A share, with its sign.
  format: pct,
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    hundred: (r) => `Le mix électrique de ${SPELLED[r.count]} pays européens en ${YEAR}. Chaque rang fait 100 % : le fossile, le nucléaire, puis le renouvelable.`,
    centre: () => `Posons le nucléaire à cheval sur l’axe : il n’est ni fossile ni renouvelable. Chaque pays penche alors vers son camp le plus lourd.`,
    left: (r) => `À gauche, le fossile : gaz, pétrole, charbon. ${cap(the(r.leaningLeft))} penche le plus de ce côté, avec ${pct(r.leaningLeft.left)} de sa production.`,
    right: (r) => `À droite, le renouvelable. ${cap(the(r.leaningRight))} y met ${pct(r.leaningRight.right)} de sa production, sans aucun nucléaire.`,
    compare: (r) =>
      `En ${r.subject.label}, le nucléaire fait ${pct(r.subject.centre)} : plus que le fossile (${pct(r.subject.left)}) et le renouvelable (${pct(r.subject.right)}) mis bout à bout, ${pct(r.subject.sides)}.`,
  },
  // The header note of cards 3, 4 and 5.
  leftNote: (r) => `${r.leaningLeft.label} : ${pct(r.leaningLeft.left)} de fossile`,
  rightNote: (r) => `${r.leaningRight.label} : ${pct(r.leaningRight.right)} de renouvelable`,
  compareNote: (r) => `${r.subject.label} : ${pct(r.subject.centre)} de nucléaire contre ${pct(r.subject.sides)}`,
  title: [
    "Le nucléaire tient le centre : en France il pèse plus que le fossile et le renouvelable réunis",
    "En France, le nucléaire pèse plus que le fossile et le renouvelable réunis",
    "Le nucléaire tient le centre",
  ],
  // The last card: how to read the lean.
  limits:
    "Lecture : chaque rang fait 100 %. La masse nucléaire est posée à cheval sur l’axe, moitié de chaque côté, donc elle ne fait pencher ni l’un ni l’autre : le penchant se lit au côté le plus long.",
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: (r) =>
    `Barres empilées divergentes : le mix électrique de ${SPELLED[r.count]} pays européens en ${YEAR}, fossile à gauche, renouvelable à droite, ` +
    `nucléaire à cheval sur l’axe. ${cap(the(r.subject))} porte ${pct(r.subject.centre)} de nucléaire, plus que ses ${pct(r.subject.left)} de fossile ` +
    `et ses ${pct(r.subject.right)} de renouvelable réunis ; ${the(r.leaningLeft)} penche à gauche avec ${pct(r.leaningLeft.left)} de fossile et ` +
    `${the(r.leaningRight)} à droite avec ${pct(r.leaningRight.right)}.`,
  evidenceLevels: 3,
  check(r) {
    if (r.count !== 6) throw new Error(`the cards speak of six countries; the data has ${r.count} for ${YEAR}`);
    const most = r.rows.reduce((a, b) => (b.centre > a.centre ? b : a));
    if (most.key !== "France") throw new Error(`the title is about France's nuclear; ${most.key} has the largest share`);
    if (!(r.subject.centre > r.subject.sides)) throw new Error(`the title says nuclear outweighs fossil and renewables together in France; ${r.subject.centre.toFixed(1)} against ${r.subject.sides.toFixed(1)}`);
    if (r.leaningRight.centre !== 0) throw new Error(`card 4 says ${r.leaningRight.key} has no nuclear at all; it has ${r.leaningRight.centre.toFixed(2)} %`);
  },
};
