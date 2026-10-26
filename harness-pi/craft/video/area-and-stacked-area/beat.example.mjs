// beat.mjs for the worked example proof/video-area-swiss-co2 — « La moitié du CO₂ suisse depuis 1858 a été émise après
// 1986 », told in time. Every number the video draws is COMPUTED from data.json; the midpoint (the first year the running
// total reaches half the stock) is found by render-beat.mjs and checked here.
import { readTable, series } from "./series.mjs";

const table = readTable(import.meta.dirname);
// One reading per year, in million tonnes (the column is in tonnes).
const data = series(table, { x: "year", y: "co2_tonnes" }).map((d) => ({ year: d.year, value: d.value / 1e6 }));
const first = data[0].year;

// The claim: the running total reaches half in 1986, and the years after it carry about half, in far fewer years.
const total = data.reduce((s, d) => s + d.value, 0);
let running = 0;
const midpoint = data.find((d) => (running += d.value) >= total / 2).year;
const after = data.filter((d) => d.year > midpoint);
const shareAfter = (after.reduce((s, d) => s + d.value, 0) / total) * 100;

export default {
  lang: "fr",
  eyebrow: "Climat · Suisse",
  data,
  valueUnit: "Mt",
  // The running stock, in forms, longest first: `n` is the stock already printed in the story's number format.
  stock: [(n) => `${n} Mt depuis ${first}`, (n) => `${n} Mt`],
  // Each half's length, inside its block: `n` is its number of years.
  years: (n) => `${n} ans`,
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: ["La moitié du CO₂ suisse depuis 1858 a été émise après 1986", "Le CO₂ suisse depuis 1858"],
  source: [
    "Source : Global Carbon Budget 2025, via Our World in Data · émissions territoriales",
    "Source : Global Carbon Budget 2025, via Our World in Data",
  ],
  evidenceLevels: 4,
  check() {
    if (first !== 1858) throw new Error(`the series starts in ${first}, not 1858`);
    if (midpoint !== 1986) throw new Error(`the running total reaches half in ${midpoint}, not 1986`);
    if (!(shareAfter > 45 && shareAfter < 50)) throw new Error(`the years after 1986 carry ${shareAfter.toFixed(1)} %, not about half`);
  },
};
