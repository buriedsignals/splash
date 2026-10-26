// beat.mjs for the worked example proof/web-dumbbell-life-expectancy-gains — "all ten gained years of
// life since 2000", as an interactive page whose yardstick stands one country's two levels across
// every row. Every number on the page is COMPUTED from data.json; the ranking, the ranks of level and
// the counts are computed by render-beat.mjs and only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [CODE, YEAR, VALUE] = [col("Code"), col("Year"), col("Life expectancy")];
const FROM = 2000;
const TO = 2023;
const NAMES = {
  POL: "Pologne", KOR: "Corée du Sud", PRT: "Portugal", ESP: "Espagne", ITA: "Italie", FRA: "France", DEU: "Allemagne", GBR: "Royaume-Uni",
  CHE: "Suisse", USA: "États-Unis", JPN: "Japon", SWE: "Suède", NLD: "Pays-Bas", AUT: "Autriche", NOR: "Norvège",
};
const valueAt = (code, year) => Number(table.rows.find((r) => r[CODE] === code && Number(r[YEAR]) === year)?.[VALUE]);
const codes = [...new Set(table.rows.map((r) => r[CODE]))].filter((c) => /^[A-Z]{3}$/.test(c));

// One row per country: its two levels. The render ranks them by change.
const rows = codes.map((code) => {
  const from = valueAt(code, FROM);
  const to = valueAt(code, TO);
  if (!Number.isFinite(from) || !Number.isFinite(to)) throw new Error(`${code} has no reading in ${FROM} or ${TO}`);
  return { key: code, label: NAMES[code] ?? code, from, to };
});
const byGain = [...rows].sort((a, b) => b.to - b.from - (a.to - a.from));
const [most, least] = [byGain[0], byGain.at(-1)];
// The axis: whole years, every second one, from the lowest earlier level to the highest later one.
const lo = Math.floor(Math.min(...rows.map((r) => r.from)));
const hi = Math.ceil(Math.max(...rows.map((r) => r.to)));
const xTicks = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((t) => (t - lo) % 2 === 0);
if (xTicks.at(-1) < hi) xTicks.push(hi);

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const signed = (v) => `${v >= 0 ? "+" : "-"}${fr(Math.abs(v))}`;
// ASCII ordinals: the embedded faces carry no superscript modifier.
const ordinal = (n) => (n === 1 ? "1er" : `${n}e`);
const counted = (n, one, many, none) => (n === 0 ? none : n === 1 ? one : `${n} ${many}`);
const head = (c) => `${ordinal(c.rankFrom)} niveau sur ${c.count} en ${FROM}, ${ordinal(c.rankTo)} en ${TO}`;
const ahead = (c) => counted(c.aheadThen, `un pays vivait déjà en ${FROM}`, `pays vivaient déjà en ${FROM}`, `aucun pays ne vivait en ${FROM}`);
const behind = (c) => counted(c.behindNow, `un est encore en ${TO}`, `sont encore en ${TO}`, `aucun n'est encore en ${TO}`);

export default {
  lang: "fr",
  eyebrow: "Santé · Monde",
  rows,
  subject: most.key,
  fromName: String(FROM),
  toName: String(TO),
  xTicks,
  // A level printed beside its head, and the change printed at the right of its row.
  format: (v) => fr(v),
  gainLabel: (r) => `+${fr(r.gain)}`,
  // What a row's bar answers: never its two levels (they are printed), its rank and its distance from the median change.
  detail: (r) =>
    `${r.label} · +${fr(r.gain)} an${r.gain >= 2 ? "s" : ""} gagnés · ${ordinal(r.gainRank)} gain sur ${r.count} · ` +
    (Math.abs(r.vsMedian) < 0.05 ? `au niveau du gain médian (+${fr(r.medianGain)})` : `${signed(r.vsMedian)} an face au gain médian (+${fr(r.medianGain)})`),
  // The yardstick control.
  levelLabel: "À l'aune de",
  noneLabel: "Aucun repère",
  announce: (c) => `${c.label} — ${head(c)} ; ${ahead(c)} plus longtemps que son niveau de ${TO}`,
  note: (c) => `${c.label} · ${head(c)} · ${ahead(c)} plus longtemps que son niveau de ${TO} · ${behind(c)} sous son niveau de ${FROM}`,
  title: "Les dix ont tous gagné des années de vie depuis 2000 — la Pologne +5,0, les États-Unis +2,5",
  limits:
    `Espérance de vie à la naissance, ${FROM} et ${TO}. La barre entre les deux têtes EST l'écart : un haltère répond à « de combien se sont-ils éloignés », ` +
    `pas à « à quelle distance de zéro » — l'axe est ajusté pour cette raison et ne part pas de zéro.`,
  reading: "Lecture : lignes rangées par gain. Choisissez un pays pour dresser ses deux niveaux sur la plaque ; survolez ou tabulez une ligne pour son rang.",
  source: "Source : UN WPP via Our World in Data",
  alt:
    `Dix haltères horizontaux, un par pays, classés du plus fort au plus faible gain. Chaque barre relie l'espérance de vie de ${FROM} à celle de ${TO}. ` +
    `La ${most.label} gagne le plus, +${fr(most.to - most.from)} ans (${fr(most.from)} puis ${fr(most.to)}) ; les ${least.label} le moins, ` +
    `+${fr(least.to - least.from)} (${fr(least.from)} puis ${fr(least.to)}). Aucune barre ne va vers la gauche. Un choix de pays dresse les deux niveaux de ce pays ` +
    `en références verticales à travers les dix lignes ; aucun des dix n'a changé de rang de niveau entre ${FROM} et ${TO}.`,
  evidenceLevels: 3,
  check() {
    if (rows.length !== 10) throw new Error(`${rows.length} countries, not ten`);
    const losers = rows.filter((r) => r.to <= r.from);
    if (losers.length) throw new Error(`${losers.map((r) => r.label).join(", ")} did not gain years`);
    if (most.key !== "POL" || fr(most.to - most.from) !== fr(5)) throw new Error(`the largest gain is ${most.label} +${fr(most.to - most.from)}, not Poland +5,0`);
    if (least.key !== "USA" || fr(least.to - least.from) !== fr(2.5)) throw new Error(`the smallest gain is ${least.label} +${fr(least.to - least.from)}, not the United States +2,5`);
    // The alt says no country changed its rank of level; the yardstick's sentences rest on it.
    const rank = (f) => [...rows].sort((a, b) => b[f] - a[f]).map((r) => r.key).join();
    if (rank("from") !== rank("to")) throw new Error(`a country changed its rank of level between ${FROM} and ${TO}`);
  },
};
