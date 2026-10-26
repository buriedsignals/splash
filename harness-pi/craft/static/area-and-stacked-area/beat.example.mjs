// beat.mjs for the worked example proof/static-area-swiss-co2 — "Half of Switzerland's CO2 since
// 1858 was emitted after 1986, in 38 years out of 167". Every number on the plate is COMPUTED from
// data.json; the cut year itself is computed (the year the running total passes half).
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [YEAR, VALUE] = [col("Year"), col("Annual CO₂ emissions")];

// The series: one { year, value } per year, in year order, in millions of tonnes.
const data = table.rows
  .map((r) => ({ year: Number(r[YEAR]), value: Number(r[VALUE]) / 1e6 }))
  .sort((a, b) => a.year - b.year);
const first = data[0];
const last = data[data.length - 1];

// The area is the stock: the cut is the year the running total reaches half of it.
const total = data.reduce((s, d) => s + d.value, 0);
let running = 0;
const cut = data.find((d) => (running += d.value) >= total / 2).year;
const before = data.filter((d) => d.year <= cut);
const after = data.filter((d) => d.year > cut);
const shareAfter = (after.reduce((s, d) => s + d.value, 0) / total) * 100;
const peak = data.reduce((a, b) => (b.value > a.value ? b : a));

const plain = (s) => s.replace(/[   ]/g, " ");
const fr = (v, decimals = 1) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }));

export default {
  eyebrow: "Climat · Suisse",
  entity: "CO₂",
  data,
  // The year the surface is cut at: two states of one stock, one hue at two chromas.
  cut,
  // The axis noun (written once above the plot) and the short unit after the last reading.
  unit: "millions de tonnes de CO₂ par an",
  valueUnit: "Mt",
  format: fr,
  // The headline in forms, longest first: the renderer takes the longest that fits.
  title: [
    `La moitié du CO₂ suisse depuis ${first.year} a été émise après ${cut} — en ${after.length} ans sur ${data.length}`,
    `La moitié du CO₂ suisse depuis ${first.year} a été émise après ${cut}`,
    `Le CO₂ suisse depuis ${first.year}`,
  ],
  limits: [
    `L’aire sous la courbe est le stock : ${fr(total, 0)} Mt cumulées depuis ${first.year}. Les ${after.length} années qui ` +
      `suivent ${cut} en portent ${fr(shareAfter)} %, les ${before.length} précédentes ${fr(100 - shareAfter)} %. La hauteur, ` +
      `elle, ne dit que le débit d’une année : ${fr(peak.value)} Mt au pic de ${peak.year}, ${fr(last.value)} Mt en ${last.year}.`,
    `L’aire sous la courbe est le stock : ${fr(total, 0)} Mt depuis ${first.year}. Les ${after.length} ans après ${cut} pèsent autant que les ${before.length} d’avant.`,
    `${fr(total, 0)} Mt cumulées depuis ${first.year} ; les deux surfaces sont de même taille.`,
  ],
  reading: [
    `Lecture : la hauteur est le débit d’une année, l’aire est le stock accumulé. C’est tout ce qu’une aire dit de plus qu’une courbe — et elle ne le dit que si la base est à zéro.`,
    `Lecture : la hauteur est le débit d’une année, l’aire est le stock. La base est à zéro.`,
  ],
  source: "Source : Global Carbon Budget 2025, via Our World in Data · émissions territoriales",
  alt:
    `Aire remplie des émissions annuelles de CO₂ de la Suisse de ${first.year} à ${last.year}, base à zéro. La courbe monte ` +
    `jusqu’à un pic de ${fr(peak.value)} Mt en ${peak.year} puis redescend à ${fr(last.value)} Mt. Un trait vertical marque ` +
    `${cut}, l’année où le cumul atteint la moitié des ${fr(total, 0)} Mt émises depuis ${first.year}.`,
  // Four levels: the later surface, the earlier surface, the cut, the last reading.
  evidenceLevels: 4,
  check() {
    if (!(shareAfter > 45 && shareAfter < 50)) throw new Error(`the years after ${cut} carry ${shareAfter.toFixed(1)} %, not about half`);
    if (!(after.length * 3 < before.length)) throw new Error(`the recent half is ${after.length} years against ${before.length}, not far shorter`);
  },
};
