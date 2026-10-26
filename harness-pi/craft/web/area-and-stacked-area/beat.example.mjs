// beat.mjs for the worked example proof/web-area-swiss-co2 — "La moitié du CO₂ suisse depuis 1858 a
// été émise après 1986", as an interactive page. Every number on the page is COMPUTED from data.json;
// the cut is the year the running total crosses half, and each reading the interaction gives (a year's
// share of the total behind it, a cut's years and share on each side) is computed by render-beat.mjs
// and only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [YEAR, VALUE] = [col("Year"), col("Annual CO₂ emissions")];

// The series: one { year, value } per year, consecutive, in million tonnes.
const data = table.rows
  .map((r) => ({ year: Number(r[YEAR]), value: Number(r[VALUE]) / 1e6 }))
  .sort((a, b) => a.year - b.year);
const first = data[0];
const last = data[data.length - 1];

// The cut is FOUND: the first year whose running total reaches half of the whole.
const total = data.reduce((s, d) => s + d.value, 0);
let running = 0;
const cut = data.find((d) => (running += d.value) >= total / 2).year;
const from = data.filter((d) => d.year >= cut);
const shareFrom = (from.reduce((s, d) => s + d.value, 0) / total) * 100;
const yearsFrom = last.year - cut + 1;
const yearsBefore = cut - first.year;
const peak = data.reduce((a, b) => (b.value > a.value ? b : a));

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

export default {
  lang: "fr",
  eyebrow: "Climat · Suisse",
  data,
  // The plate's own cut: the year the surface is split into its two chromas.
  cut,
  valueUnit: "Mt CO₂",
  format: (v, d = 1) => fr(v, d),
  // Written on the cut rule.
  cutNote: `${cut} : la moitié du total est derrière`,
  // What one year answers when hovered, tapped or tabbed to; markLabel is its accessible name.
  detail: (r) => `${r.year} · ${fr(r.value)} Mt CO₂ · ${fr(r.sharePct)} % du total émis à cette date`,
  markLabel: (r) => `${r.year} : ${fr(r.value)} Mt CO₂, ${fr(r.sharePct)} % du total cumulé`,
  // The years the reader can cut the surface at, and the control's words.
  cutYears: [1950, 1965, 1980, 1995, 2005],
  levelLabel: "Depuis ma naissance en",
  noneLabel: `La moitié, en ${cut}`,
  announce: (c) =>
    `${c.year} — ${c.yearsFrom} des ${c.count} années de la série, soit ${fr(c.shareOfYears, 0)} % du temps, et ` +
    `${fr(c.shareOfTotal)} % de tout ce que la Suisse a émis depuis ${c.firstYear}`,
  note: (c) =>
    `Naissance en ${c.year} : ${c.yearsFrom} des ${c.count} années, ${fr(c.shareOfYears, 0)} % du temps — et ` +
    `${fr(c.sumFrom, 0)} Mt émis depuis, soit ${fr(c.shareOfTotal)} % de tout ce que la Suisse a émis depuis ${c.firstYear}. ` +
    `${fr(c.meanFrom)} Mt par an en moyenne pendant ces ${c.yearsFrom} ans, contre ${fr(c.meanBefore)} Mt par an sur les ${c.yearsBefore} précédentes.`,
  // The line under the source.
  total: (t) => `Total ${t.firstYear}–${t.lastYear} : ${fr(t.total, 0)} Mt. ${fr(t.shareFromCut)} % de ce total a été émis à partir de ${t.cut}.`,
  title: "La moitié du CO₂ suisse depuis 1858 a été émise après 1986",
  limits: `${data.length} années consécutives, sans trou : la surface est une quantité, et une aire qui enjambe une année manquante en invente une.`,
  reading:
    `Lecture : la hauteur est le débit d'une année, la surface est le stock qu'il accumule. Choisissez votre année de naissance pour ` +
    `recouper la surface dessus et lire ce qui a été émis pendant votre vie. Survolez, touchez ou tabulez n'importe quelle année pour ` +
    `son chiffre et la part du total déjà émise à cette date — les ${data.length} lectures que l'image fixe ne pouvait pas écrire.`,
  source: `Source : Global Carbon Budget 2025, via Our World in Data · ${first.year}-${last.year}`,
  alt:
    `Une aire remplie : les émissions annuelles de CO₂ de la Suisse de ${first.year} à ${last.year}, en millions de tonnes. ` +
    `La surface monte jusqu'à un pic de ${fr(peak.value)} Mt en ${peak.year} puis redescend à ${fr(last.value)} Mt en ${last.year}. ` +
    `Un trait vertical marque ${cut}, l'année où le cumul franchit la moitié du total de ${fr(total, 0)} Mt ; la moitié droite de la ` +
    `surface, plus courte de ${yearsFrom} ans, pèse autant que la gauche qui en compte ${yearsBefore}.`,
  evidenceLevels: 2,
  check() {
    if (cut !== 1986) throw new Error(`the running total now crosses half in ${cut}, not 1986`);
    if (!(shareFrom > 48 && shareFrom < 55)) throw new Error(`the years from ${cut} carry ${shareFrom.toFixed(1)} %, not about half`);
    if (!(yearsFrom < yearsBefore / 2)) throw new Error(`the recent half is ${yearsFrom} years against ${yearsBefore}, not far the shorter`);
  },
};
