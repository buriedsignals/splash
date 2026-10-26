// beat.mjs for the worked example proof/web-waterfall-germany-bridge — Germany's electricity
// between 2015 and 2024 as a bridge, as an interactive page. Every number on the page is COMPUTED
// from data.json; conservation, each step's share of the movement and every counterfactual closing
// level are computed by render-beat.mjs and only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const FROM = 2015;
const TO = 2024;
const row = (year) => table.rows.find((r) => r[col("Code")] === "DEU" && Number(r[col("Year")]) === year);
const sum = (r, columns) => columns.reduce((s, c) => s + Number(r[col(c)]), 0);

// The groups of sources, each with the words its sentences need — French agreement is not a string
// operation: "les renouvelables restent dessinées", "le fossile reste dessiné".
const GROUPS = [
  { name: "fossile", the: "le fossile", hollow: "le fossile reste dessiné en creux", columns: ["Coal", "Gas", "Oil"] },
  { name: "nucléaire", the: "le nucléaire", hollow: "le nucléaire reste dessiné en creux", columns: ["Nuclear"] },
  { name: "renouvelables", the: "les renouvelables", hollow: "les renouvelables restent dessinées en creux", columns: ["Wind", "Solar", "Hydropower", "Bioenergy", "Other renewables"] },
];
const words = new Map(GROUPS.map((g) => [g.name, g]));
const ALL = GROUPS.flatMap((g) => g.columns);
const [before, after] = [row(FROM), row(TO)];
const opening = sum(before, ALL);
const closing = sum(after, ALL);

// The bridge in story order: the two falls, then the rise.
const steps = [
  { label: String(FROM), value: opening, kind: "total" },
  ...GROUPS.map((g) => ({ label: g.name, value: sum(after, g.columns) - sum(before, g.columns) })).map((s) => ({ ...s, kind: s.value >= 0 ? "increase" : "decrease" })),
  { label: String(TO), value: closing, kind: "total" },
];
const moves = steps.slice(1, -1);
const net = closing - opening;

const fr = (v, d = 0) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const signed = (v) => `${v >= 0 ? "+" : "−"}${fr(Math.abs(v))}`;

export default {
  lang: "fr",
  eyebrow: "Énergie · Allemagne",
  steps,
  unit: "TWh",
  format: (v) => fr(v),
  // What a step answers — only what no withdrawal can change.
  detail: (s) =>
    `${s.label} · ${s.signedValue} TWh entre ${s.first} et ${s.last} · ` +
    `${fr(s.share)} % de l'ensemble des mouvements · ` +
    `retirez-la du pont et ${s.last} arrive à ${fr(s.without)} TWh au lieu de ${fr(s.closing)}`,
  // What the opening and closing bars answer.
  levelDetail: (l) =>
    l.isOpening
      ? `${l.label} · niveau de départ · ${fr(l.value)} TWh produits`
      : `${l.label} · niveau d'arrivée · ${fr(l.value)} TWh produits, soit ${l.signedNet} depuis ${l.first} · retirez une marche et cette barre se recalcule`,
  // The withdraw control: its legend, its untouched option, and each step's words.
  withdrawLabel: "Retirer une marche",
  noneLabel: "Aucune",
  announce: (o) => `Sans ${words.get(o.label).the} : ${o.last} arrive à ${fr(o.without)} TWh au lieu de ${fr(o.closing)}`,
  note: (o) =>
    `Sans ${words.get(o.label).the} (${o.signedValue} TWh), ${o.last} arrive à ${fr(o.without)} TWh — ` +
    `${signed(o.netWithout)} depuis ${o.first} au lieu de ${signed(o.net)}. ` +
    (o.following > 0
      ? `${o.following === 1 ? "La marche suivante repart" : `Les ${o.following} marches suivantes repartent`} du nouveau niveau ; ${words.get(o.label).hollow}.`
      : `C'était la dernière marche : seul le niveau d'arrivée change ; ${words.get(o.label).hollow}.`),
  title: "L'électricité allemande a perdu 143 TWh entre 2015 et 2024 : nucléaire −92, fossile −154 contre renouvelables +103",
  limits:
    `Un pont entre DEUX NIVEAUX NOMMÉS : la production totale de ${FROM} à gauche, celle de ${TO} à ` +
    `droite, les mouvements par groupe de sources entre les deux. Le SENS d'une marche porte le ` +
    `signe ; la couleur le répète. Les marches se somment exactement à l'écart entre les niveaux — ` +
    `vérifié pour les quatre ponts de cette page.`,
  reading:
    `Lecture : retirez une marche, le pont se recalcule. Survolez ou tabulez une marche pour sa ` +
    `valeur et le total qu'elle laisserait.`,
  source: `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · Allemagne, ${FROM} et ${TO}`,
  alt:
    `Un pont : une barre pleine à ${fr(opening)} TWh pour ${FROM}, puis trois marches — ` +
    moves.map((m) => `${m.label} ${signed(m.value)}`).join(", ") +
    ` — et une barre pleine à ${fr(closing)} TWh pour ${TO}. Les marches descendantes sont ` +
    `plus longues que la montante, et le pont arrive ${fr(Math.abs(net))} TWh plus bas qu'il ` +
    `n'était parti. Un choix au-dessus du graphique retire une des trois marches : elle se ` +
    `vide, les suivantes repartent du nouveau niveau et la barre de ${TO} se redessine.`,
  evidenceLevels: 3,
  check() {
    if (Math.round(-net) !== 143) throw new Error(`the total moved ${signed(net)} TWh, not −143`);
    const [fossil, nuclear, renewables] = moves.map((m) => Math.round(m.value));
    if (fossil !== -154 || nuclear !== -92 || renewables !== 103)
      throw new Error(`the moves are fossile ${fossil}, nucléaire ${nuclear}, renouvelables ${renewables}, not −154, −92, +103`);
  },
};
