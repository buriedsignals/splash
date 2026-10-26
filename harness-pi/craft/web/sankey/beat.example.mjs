// beat.mjs for the worked example proof/web-sankey-electricity-sources — "Le nucléaire est la
// première source d'électricité de ces six pays — et 84 % de ce nucléaire sort de la France", as an
// interactive page. Every node total, every path's arithmetic and what the plate cannot draw are
// COMPUTED by render-beat.mjs and only WORDED here; every other number is computed from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const YEAR = 2024;
const SOURCES = [
  ["Nuclear", "nucléaire"], ["Hydropower", "hydraulique"], ["Wind", "éolien"], ["Gas", "gaz"],
  ["Coal", "charbon"], ["Solar", "solaire"], ["Bioenergy", "biomasse"],
  ["Other renewables", "autres renouv."], ["Oil", "pétrole"],
];
const NAMES = { FRA: "France", DEU: "Allemagne", NOR: "Norvège", POL: "Pologne", SWE: "Suède", CHE: "Suisse" };
// The pill names a source with its article; "le éolien" is not French and no formatter can guess it.
const ARTICLE = {
  Nuclear: "le nucléaire", Hydropower: "l'hydraulique", Wind: "l'éolien", Gas: "le gaz", Coal: "le charbon",
  Solar: "le solaire", Bioenergy: "la biomasse", Oil: "le pétrole", "Other renewables": "les autres renouvelables",
};

// A wide table (one row per country, one column per source) → one flow per source × country, 2024 only.
const rows = data.rows.filter((r) => r[col("Year")] === YEAR && NAMES[r[col("Code")]]);
const flows = SOURCES.flatMap(([key]) => rows.map((r) => ({ from: key, to: r[col("Code")], value: Number(r[col(key)]) })));
const total = (key) => flows.filter((f) => f.from === key).reduce((s, f) => s + f.value, 0);
const grand = flows.reduce((s, f) => s + f.value, 0);
const biggest = SOURCES.map(([k]) => k).reduce((a, b) => (total(b) > total(a) ? b : a));
const holderFlow = flows.filter((f) => f.from === biggest).reduce((a, b) => (b.value > a.value ? b : a));
const holderShare = (holderFlow.value / total(biggest)) * 100;

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const list = (names) => (names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`);
const capital = (s) => `${s[0].toUpperCase()}${s.slice(1)}`;

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  sources: SOURCES.map(([key, label]) => ({ key, label })),
  targets: rows.map((r) => ({ key: r[col("Code")], label: NAMES[r[col("Code")]] })),
  flows,
  subject: biggest,
  unit: "TWh",
  nodeLabel: (n) => `${n.label} · ${fr(n.total, 0)} TWh`,
  // What one ribbon answers when hovered, tapped or tabbed to.
  detail: (r) =>
    `${r.from} vers ${r.to} · ${fr(r.value)} TWh · ${fr(r.shareOfSource)} % de tout le ${r.from} des six · ${fr(r.shareOfTarget)} % de ` +
    `l'électricité ${r.to === "France" ? "française" : `de ${r.to}`}`,
  // The control: follow one source end to end.
  traceTitle: "Suivre une source",
  traceLabel: (s) => ARTICLE[s.key],
  announce: (o) => `Suivre ${o.label} de bout en bout`,
  stated: (o) =>
    o.undrawnTotal > 0
      ? `${fr(o.drawnTotal)} TWh dessinés sur ${fr(o.total)} · ${o.segments.length} pays · ${fr(o.undrawnTotal)} TWh sous le demi-pixel`
      : `${fr(o.total)} TWh · ${o.segments.length} pays · tout est dessiné`,
  atDestination: (seg) => `${fr(seg.shareOfTarget)} % de son électricité`,
  undrawnLabel: (o) => `${fr(o.undrawnTotal)} TWh vers ${list(o.missed.map((m) => m.label))} sous le demi-pixel, non dessinés`,
  note: (o) =>
    `${capital(o.label)} : ${fr(o.total)} TWh quittent la gauche. ` +
    o.segments.map((x) => `${x.label} ${fr(x.value)}`).join(" · ") +
    (o.absent.length ? ` · rien vers ${list(o.absent)}` : "") +
    (o.undrawnTotal > 0 ? ` · ${fr(o.undrawnTotal)} TWh non dessinés (${list(o.missed.map((m) => m.label))})` : " · rien de non dessiné") +
    ` · somme : ${fr(o.drawnTotal)} + ${fr(o.undrawnTotal)} = ${fr(o.total)} TWh, le total du nœud.`,
  // What the plate cannot draw at this scale, said once under the plot. Shorter than the worked example's
  // (same facts): its letters, the only ones set in that italic, measured 0.1 px from the fallback face, so the
  // browser check could not see the face draw, and its length pushed the source line off a phone.
  remainder: (r) =>
    `${r.hidden} liaisons trop fines ne sont pas dessinées : ${fr(r.hiddenTotal)} TWh, ${fr(r.hiddenShare, 2)} % de l'ensemble.` +
    (r.refused.length ? ` ${r.refused.map((s) => `« ${s.label} »`).join(", ")} (${fr(r.refused[0].total)} TWh) n'a aucun ruban dessiné et n'est pas offert au tracé.` : ""),
  title: "Le nucléaire est la première source d'électricité de ces six pays — et 84 % de ce nucléaire sort de la France",
  // The worked example's standfirst, reading line and control sentences ran 433 px past a 375 × 812 screen
  // (its own page fails that check): the standfirst keeps its first two sentences, shortened, the reading line
  // its instruction, and each path's sentence keeps its arithmetic without the per-country percentages, which the
  // page already prints beside each country and in each ribbon's tooltip.
  limits: `${fr(grand, 0)} TWh produits en ${YEAR} par six pays européens, de neuf sources. Chaque nœud porte son total.`,
  reading: `Lecture : choisissez une source à suivre ; survolez, touchez ou tabulez un ruban pour ses deux parts.`,
  source: `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR}`,
  alt: ({ sources, targets, offered }) =>
    `Neuf blocs de sources à gauche, six blocs de pays à droite, reliés par des rubans dont la largeur est une quantité d'électricité. Le bloc du ` +
    `${sources[0].label} est le plus haut à gauche (${fr(sources[0].total, 0)} TWh) et presque tout son ruban part vers ${NAMES[holderFlow.to]} : ` +
    `${fr(holderShare, 0)} %. ${targets[1].label}, deuxième producteur, ne reçoit aucun ruban de ce bloc et son nœud est dessiné creux. Un groupe ` +
    `de ${offered} boutons radio choisit la source suivie : celle qui est choisie s'allume de bout en bout, les autres reculent.`,
  evidenceLevels: 3,
  check({ sources }) {
    if (sources[0].key !== "Nuclear") throw new Error(`the largest source is ${sources[0].label}, not nuclear`);
    if (holderFlow.to !== "FRA" || Math.round(holderShare) !== 84) throw new Error(`${fr(holderShare, 0)} % of nuclear comes from ${NAMES[holderFlow.to]}, not 84 % from France`);
  },
};
