// beat.mjs for the worked example proof/web-line-swiss-co2 — "Swiss CO2 is back under its 1967
// level — 57 years erased", as an interactive page. Every number on the page is COMPUTED from
// data.json; each year's own reading (distance under the peak, how far back it winds the series,
// the last reading against it) is computed by render-beat.mjs and only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [YEAR, VALUE] = [col("year"), col("co2_tonnes")];

// The series: one { year, value } per year, in million tonnes.
const data = table.rows
  .map((r) => ({ year: Number(r[YEAR]), value: Number(r[VALUE]) / 1e6 }))
  .sort((a, b) => a.year - b.year);

const last = data[data.length - 1];
const peak = data.reduce((a, b) => (b.value > a.value ? b : a));
// The reference year is FOUND: the year after the last pre-peak year still at or below today.
const lastAtOrBelow = [...data].reverse().find((d) => d.year < peak.year && d.value <= last.value);
const referenceYear = lastAtOrBelow.year + 1;
const reference = data.find((d) => d.year === referenceYear);

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

export default {
  lang: "fr",
  eyebrow: "Climat · Suisse",
  data,
  unit: "Mt",
  format: (v) => fr(v),
  // The horizontal rule the curve is compared to: that year's value, and its name on the rule.
  referenceYear,
  referenceLabel: `niveau de ${referenceYear} : ${fr(reference.value)} Mt`,
  peakLabel: `pic ${peak.year} · ${fr(peak.value)} Mt`,
  // What one year answers when it is hovered, tapped or tabbed to.
  detail: (r) =>
    [
      `${r.year} · ${fr(r.value)} Mt de CO₂`,
      r.isPeak ? "pic de la série" : `${fr(r.belowPeakPct)} % sous le pic de ${r.peakYear}`,
      r.backTo === null ? null : `sous le niveau de ${r.backTo} — ${r.yearsBack} an${r.yearsBack > 1 ? "s" : ""} effacé${r.yearsBack > 1 ? "s" : ""}`,
      r.isLast
        ? null
        : Math.abs(r.vsLastPct) < 100
          ? `aujourd'hui ${fr(Math.abs(r.vsLastPct))} % plus ${r.vsLastPct < 0 ? "bas" : "haut"}`
          : `aujourd'hui ${fr(r.lastTimes, r.lastTimes >= 10 ? 0 : 1)} fois plus`,
    ]
      .filter(Boolean)
      .join(" · "),
  title: "Le CO₂ suisse est repassé sous son niveau de 1967 — 57 ans effacés",
  limits:
    `Émissions annuelles de CO₂ de la Suisse, ${data.length} années consécutives. Une ligne porte un DÉBIT : c'est la pente qui se lit, ` +
    `pas la surface, et rien ici n'est mesuré par sa longueur depuis une base.`,
  reading:
    `Lecture : le titre ne compare qu'à une seule année. Survolez, touchez ou tabulez n'importe laquelle des ${data.length} pour choisir la vôtre — ` +
    `sa valeur, son écart au pic, jusqu'où elle ramène la série, et de combien ${last.year} s'en écarte.`,
  source: `Source : Global Carbon Budget 2025, via Our World in Data · ${data[0].year}-${last.year}`,
  alt:
    `Une ligne des émissions annuelles de CO₂ de la Suisse de ${data[0].year} à ${last.year}, en millions de tonnes. Elle monte jusqu'à un pic de ` +
    `${fr(peak.value)} Mt en ${peak.year}, puis redescend à ${fr(last.value)} Mt en ${last.year} — sous le trait horizontal marquant le niveau de ` +
    `${referenceYear} (${fr(reference.value)} Mt).`,
  evidenceLevels: 3,
  check() {
    if (referenceYear !== 1967) throw new Error(`the last reading (${fr(last.value)}) now winds the series back to ${referenceYear}, not 1967`);
    if (last.year - referenceYear !== 57) throw new Error(`${last.year} - ${referenceYear} is ${last.year - referenceYear} years, not 57`);
  },
};
