// beat.mjs for the worked example proof/web-stacked-bar-lowcarbon-growth — "Spain added more
// low-carbon electricity than France", as an interactive page. Every number on the page is COMPUTED
// from data.json; the stack, each segment's rank and the pairs the stack misreads are computed by
// render-beat.mjs and only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [CODE, YEAR] = [col("code"), col("year")];
const FROM = 2000;
const TO = 2024;

// FIVE BANDS, in one stacking order, the largest on the baseline. Bioenergy and "other renewables"
// share one band: past five a stack is an unreadable ribbon.
const BANDS = [
  { key: "nuclear", cols: ["nuclear_generation__twh"], name: "nucléaire", label: "le nucléaire" },
  { key: "hydro", cols: ["hydro_generation__twh"], name: "hydraulique", label: "l'hydraulique" },
  { key: "wind", cols: ["wind_generation__twh"], name: "éolien", label: "l'éolien" },
  { key: "solar", cols: ["solar_generation__twh"], name: "solaire", label: "le solaire" },
  { key: "other", cols: ["bioenergy_stacked_generation__twh", "other_renewables_generation__twh"], name: "biomasse et autres", label: "la biomasse et les autres" },
];
const NAMES = {
  FRA: "France", DEU: "Allemagne", ESP: "Espagne", ITA: "Italie", GBR: "Royaume-Uni",
  POL: "Pologne", SWE: "Suède", NOR: "Norvège", CHE: "Suisse", AUT: "Autriche",
  NLD: "Pays-Bas", BEL: "Belgique", FIN: "Finlande", DNK: "Danemark", PRT: "Portugal",
  CZE: "Tchéquie", GRC: "Grèce", IRL: "Irlande",
};

const bandValues = (code, year) => {
  const r = table.rows.find((z) => z[CODE] === code && Number(z[YEAR]) === year);
  return Object.fromEntries(BANDS.map((b) => [b.key, b.cols.reduce((s, c) => s + Number(r[col(c)]), 0)]));
};
const codes = [...new Set(table.rows.map((r) => r[CODE]))];
const rows = codes.map((code) => ({ name: NAMES[code], values: bandValues(code, TO), earlier: bandValues(code, FROM) }));

const total = (o) => Object.values(o).reduce((s, v) => s + v, 0);
const added = (r) => total(r.values) - total(r.earlier);
const leader = rows.reduce((a, b) => (total(b.values) > total(a.values) ? b : a));
const adder = rows.reduce((a, b) => (added(b) > added(a) ? b : a));

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
/** 1er, 2e — never the superscript forms, which no house face carries. */
const ordinal = (n) => (n === 1 ? "1er" : `${n}e`);

export default {
  lang: "fr",
  eyebrow: `Énergie · Europe · ${FROM}-${TO}`,
  bands: BANDS.map(({ key, name, label }) => ({ key, name, label })),
  rows,
  highlight: [adder.name, leader.name],
  unit: "TWh",
  format: (v) => fr(v, 0),
  // Printed at the end of each bar.
  totalLabel: (r) => `${fr(r.total, 0)} TWh · +${fr(r.added, 0)}`,
  // What a segment answers when it is hovered, tapped or tabbed to.
  detail: (s) =>
    `${s.name} · ${s.band} · ${fr(s.value)} TWh en ${TO} · ${ordinal(s.rank)} sur ${s.count} · ` +
    `${fr(s.share)} % de son bas-carbone · ${fr(s.earlier)} TWh en ${FROM} ` +
    `(${s.existed ? `${s.change >= 0 ? "+" : "−"}${fr(Math.abs(s.change))}` : "n'existait pas"})`,
  beforeLabel: `total ${FROM}`,
  // The rebase control: its legend, the untouched plate, and each band's words.
  rebaseLabel: "Mesurer une source depuis zéro",
  noneLabel: "l'empilement seul",
  noneAnnounce: "l'empilement seul — la planche telle qu'elle est publiée, sans rail",
  announce: (o) => `Mesurer ${o.label} depuis zéro — un rail sous chaque barre, de l'origine à la valeur de sa bande`,
  note: (o) =>
    `${o.longer.name} ${fr(o.longer.value)} TWh finit à ${fr(o.longer.end, 0)} sur l'axe, ` +
    `${o.righter.name} ${fr(o.righter.value)} finit à ${fr(o.righter.end, 0)}. ` +
    `${fr(o.inverted, 0)} des ${fr(o.pairs, 0)} paires de pays sont classées à l'envers.`,
  title: "L'Espagne a ajouté plus de bas-carbone que la France",
  limits:
    `Électricité bas-carbone produite en ${TO}, empilée par source, ${rows.length} pays classés par ` +
    `total. Le trait marque le total de ${FROM} : l'ajout est la distance jusqu'au bout. ` +
    `L'${adder.name} partait ${fr(total(leader.earlier) / total(adder.earlier), 0)} fois plus bas.`,
  reading:
    `Lecture : seul le nucléaire part du même zéro pour tous ; toute bande au-dessus commence là où ` +
    `finit la somme de celles du dessous. Choisissez une source : un rail se déploie sous chaque ` +
    `barre, de l'origine à sa valeur. Survolez une bande pour son rang européen.`,
  source: `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${FROM} et ${TO}`,
  alt:
    `Seize barres horizontales empilées par source, classées par total ${TO}. Celle de la ` +
    `${leader.name} est la plus longue (${fr(total(leader.values), 0)} TWh) et presque entièrement ` +
    `nucléaire ; son trait de ${FROM} est déjà loin à droite, donc son ajout est court. Celle ` +
    `de l'${adder.name} est plus courte (${fr(total(adder.values), 0)} TWh) mais son trait de ${FROM} ` +
    `est tout près de l'origine : l'essentiel de la barre a été ajouté depuis. Sous chaque ` +
    `barre, une voie vide où se déploie le rail de la source choisie.`,
  evidenceLevels: 6,
  check() {
    if (adder.name !== "Espagne") throw new Error(`the largest adder is ${adder.name}, not Spain`);
    if (leader.name !== "France") throw new Error(`the largest producer is ${leader.name}, not France`);
    if (!(added(adder) > added(leader))) throw new Error(`Spain added ${added(adder)}, not more than France's ${added(leader)}`);
  },
};
