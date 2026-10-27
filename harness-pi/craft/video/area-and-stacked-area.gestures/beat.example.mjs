// The VIDEO beat.mjs (exactly three gestures: reveal, subject, conclusion) for the worked example proof/static-area-swiss-co2 — "La moitié du CO₂ suisse depuis 1858 a été émise
// après 1986". The area is the stock; the cut year is COMPUTED (the year the running total passes half), and the
// bracket over the years after it prints their share of the whole surface.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [YEAR, VALUE] = [col("Year"), col("Annual CO₂ emissions")];

// One reading per year, in millions of tonnes.
const points = table.rows.map((r) => ({ series: "CO₂", t: Number(r[YEAR]), value: Number(r[VALUE]) / 1e6 })).sort((a, b) => a.t - b.t);
const total = points.reduce((s, p) => s + p.value, 0);
let running = 0;
const cut = points.find((p) => (running += p.value) >= total / 2).t;
const after = points.filter((p) => p.t > cut);
const shareAfter = (after.reduce((s, p) => s + p.value, 0) / total) * 100;
const peak = points.reduce((a, b) => (b.value > a.value ? b : a));
const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/[  ]/g, " ");

export default {
  eyebrow: "Climat · Suisse",
  points,
  unit: "millions de tonnes de CO₂ par an",
  format: (v) => fr(v),
  title: "La moitié du CO₂ suisse depuis 1858 a été émise après 1986",
  limits: [
    `Émissions territoriales. L’aire sous la courbe est le stock : ${fr(total, 0)} Mt cumulées depuis ${points[0].t}.`,
    `${fr(total, 0)} Mt cumulées depuis ${points[0].t}.`,
  ],
  source: "Source : Global Carbon Budget 2025, via Our World in Data",
  alt: `Aire des émissions annuelles de CO₂ de la Suisse de ${points[0].t} à ${points.at(-1).t}, base à zéro : les ${after.length} années après ${cut} portent ${fr(shareAfter)} % du stock.`,
  gestures: [
    { do: "trace", mark: "CO₂" },
    { do: "name", mark: String(peak.t), note: `pic de ${peak.t} : ${fr(peak.value)} Mt` },
    { do: "bracket", marks: after.map((p) => String(p.t)), of: "whole", note: `${after.length} ans après ${cut} : ${fr(shareAfter)} % du total` },
  ],
  check() {
    if (!(shareAfter > 45 && shareAfter < 50)) throw new Error(`the years after ${cut} carry ${shareAfter.toFixed(1)} %, not about half`);
  },
};
