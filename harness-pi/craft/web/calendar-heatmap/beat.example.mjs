// beat.mjs for the worked example proof/web-calendar-heatmap-geneva — "Genève a tenu 31 jours d'affilée
// à 20 °C ou plus en 2024", as an interactive page. Every number on the page is COMPUTED from data.json;
// the longest run at each threshold, the bins and each day's rank are computed by render-beat.mjs and
// only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [DATE, MEAN, MAX] = [col("date"), col("mean_c"), col("max_c")];

// Every day of the year, its daily mean drawn; the daily maximum is only told in the tooltip.
const days = table.rows.map((r) => ({ date: r[DATE], value: Number(r[MEAN]) }));
const maxOf = Object.fromEntries(table.rows.map((r) => [r[DATE], Number(r[MAX])]));

const THRESHOLD = 20;
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const dayName = (d) => `${d.day} ${d.monthName}`;

// For check() and the alt: the longest run at the claim's threshold (the render finds the same).
let longest = 0;
let run = 0;
for (const d of days) {
  run = d.value >= THRESHOLD ? run + 1 : 0;
  longest = Math.max(longest, run);
}
const monthMeans = MONTHS.map((_, i) => {
  const inMonth = days.filter((d) => Number(d.date.slice(5, 7)) === i + 1);
  return inMonth.reduce((s, d) => s + d.value, 0) / inMonth.length;
});
const warmest = monthMeans.indexOf(Math.max(...monthMeans));
const hottest = days.reduce((a, b) => (b.value > a.value ? b : a));
const hottestName = `${Number(hottest.date.slice(8, 10))} ${MONTHS[Number(hottest.date.slice(5, 7)) - 1]}`;
const year = days[0].date.slice(0, 4);

export default {
  lang: "fr",
  eyebrow: "Climat · Genève",
  days,
  // The claim's threshold, and the others the reader can move the line to.
  threshold: THRESHOLD,
  thresholds: [16, 18, 22, 24],
  breaks: [5, 10, 15, 20],
  months: MONTHS,
  monthsShort: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
  unit: "°C",
  format: (v) => fr(v, 0),
  // What one day answers when hovered, tapped or tabbed to.
  detail: (d) =>
    `${dayName(d)} · moyenne ${fr(d.value)} °C · maximum ${fr(maxOf[d.date])} °C · palier ${d.binLabel} · ` +
    `rang ${d.rank} sur ${d.count} jours, du plus chaud au plus froid`,
  // The note on the outlined run.
  streakNote: (r) => `${r.length} jours à ${r.threshold} °C ou plus`,
  // The control.
  cutoffLabel: "Le seuil de la série :",
  claimAnnounce: (r) => `${r.threshold} °C — le seuil du titre : ${r.length} jours d'affilée, du ${dayName(r.from)} au ${dayName(r.to)}`,
  announce: (r) => `${r.threshold} °C — la plus longue série tombe à ${r.length} jours, du ${dayName(r.from)} au ${dayName(r.to)}`,
  note: (r) => `Seuil ${r.threshold} °C · ${r.length} jours d'affilée, du ${dayName(r.from)} au ${dayName(r.to)} · ${r.days} jours dans l'année passent cette ligne`,
  title: "Genève a tenu 31 jours d'affilée à 20 °C ou plus en 2024",
  limits:
    `Une case par jour, ${days.length} cases : la température moyenne quotidienne. Les paliers sont bornés en °C dans la légende — une case ` +
    `colorée ne se lit pas au degré près, et la légende dit de combien. Les cinq cases impossibles (31 février et ses sœurs) sont dessinées vides.`,
  reading: (f) =>
    `Lecture : déplacez le seuil — la plus longue série est retracée à la ligne choisie, avec sa longueur, ses dates et le nombre de jours qui ` +
    `la passent. De ${f.anchor.low} à ${f.anchor.high} °C elle se termine toujours le ${dayName(f.anchor.end)} : son début glisse du ` +
    `${dayName(f.anchor.startLow)} au ${dayName(f.anchor.startHigh)}, sa fin ne bouge pas. Survolez ou tabulez une case pour lire sa date, sa ` +
    `moyenne, son maximum, son palier et son rang sur l'année.`,
  source: `Source : Open-Meteo (réanalyse ERA5), moyenne et maximum quotidiens à 2 m, Genève (46,20 N · 6,14 E), ${year}`,
  alt:
    `Une grille de ${days.length} cases, douze lignes de mois sur trente et un jours, chaque case teintée selon la température moyenne du jour ` +
    `à Genève en ${year}. Le bloc le plus foncé est la plus longue série : ${longest} jours consécutifs à ${THRESHOLD} °C ou plus, entourés d'un ` +
    `trait que le lecteur peut retracer à un autre seuil. Le mois le plus chaud est ${MONTHS[warmest]} (${fr(monthMeans[warmest])} °C de moyenne), ` +
    `le jour le plus chaud le ${hottestName} à ${fr(hottest.value)} °C.`,
  evidenceLevels: 2,
  check() {
    if (longest !== 31) throw new Error(`the longest run at or above ${THRESHOLD} °C is ${longest} days, not 31`);
  },
};
