// beat.mjs for the worked example proof/web-lollipop-co2-per-person — "China tripled its CO₂ per person
// since 2000; the average American now emits only 1.7 times more", as an interactive page. Every
// number on the page is COMPUTED from data.json; each pair's level ranks, multiples and in-betweens
// are computed by render-beat.mjs and only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [ENTITY, CODE, BEFORE, AFTER, PEOPLE] = [col("entity"), col("code"), col("t_per_person_2000"), col("t_per_person_2023"), col("population_2023")];

const FROM = 2000;
const TO = 2023;
const HOW_MANY = 6;
const NAMES = {
  CHN: "Chine", USA: "États-Unis", IND: "Inde", RUS: "Russie", JPN: "Japon", IRN: "Iran",
  IDN: "Indonésie", SAU: "Arabie saoudite", DEU: "Allemagne", KOR: "Corée du Sud", BRA: "Brésil",
};
// The same names inside a sentence ("aujourd'hui, le Japon est entre…").
const IN_PROSE = {
  CHN: "la Chine", USA: "les États-Unis", IND: "l'Inde", RUS: "la Russie", JPN: "le Japon",
  IRN: "l'Iran", IDN: "l'Indonésie", SAU: "l'Arabie saoudite", DEU: "l'Allemagne",
  KOR: "la Corée du Sud", BRA: "le Brésil",
};

// Every country with its 2023 TOTAL (per person × population): the six drawn are the largest totals.
const all = data.rows.map((r) => {
  const after = Number(r[AFTER]);
  const people = Number(r[PEOPLE]);
  return { key: r[CODE], entity: r[ENTITY], before: Number(r[BEFORE]), after, people, total: (after * people) / 1e9 };
});
const worldTotal = all.reduce((s, c) => s + c.total, 0);
const chosen = [...all].sort((a, b) => b.total - a.total).slice(0, HOW_MANY);
const chosenShare = (chosen.reduce((s, c) => s + c.total, 0) / worldTotal) * 100;
const pairs = chosen.map((c) => ({ ...c, name: NAMES[c.key] ?? c.entity, prose: IN_PROSE[c.key] ?? c.entity }));

const subject = pairs.find((p) => p.key === "CHN");
const usa = pairs.find((p) => p.key === "USA");
const ratioBefore = usa.before / subject.before;
const ratioAfter = usa.after / subject.after;

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const ordinal = (n) => (n === 1 ? "1er" : `${n}e`);
const listOf = (names) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`);
const head = (p) => `${ordinal(p.beforeRank)} niveau sur ${p.count} en ${FROM}, ${ordinal(p.afterRank)} en ${TO}`;
const spread = (p) =>
  p.isTopBoth
    ? `c'est lui le plus haut niveau des ${p.count} pays aux deux dates`
    : `le plus haut niveau des ${p.count} pays valait ${fr(p.timesTopBefore)} fois le sien en ${FROM}, ${fr(p.timesTopAfter)} fois en ${TO}`;
const inside = (p) =>
  p.between.length === 0
    ? `aucun des ${p.count - 1} autres n'est aujourd'hui entre ses deux niveaux`
    : `aujourd'hui, ${listOf(p.between.map((o) => o.prose))} ${p.between.length > 1 ? "sont" : "est"} entre son niveau de ${FROM} et celui de ${TO}`;

export default {
  lang: "fr",
  eyebrow: "Climat · Monde",
  pairs,
  subject: "CHN",
  from: FROM,
  to: TO,
  unit: "tonnes de CO₂ par personne",
  rule: `Sélection : les ${HOW_MANY} pays au plus fort total ${TO} — par personne × population — soit ${fr(chosenShare)} % du CO₂ mondial.`,
  format: (v) => fr(v),
  formatChange: (v) => `${v >= 0 ? "+" : "−"}${fr(Math.abs(v), 0)} %`,
  // What a pair answers when it is hovered, tapped or tabbed to: the WEIGHT behind the ratio.
  detail: (p) =>
    `${p.name} · ${fr(p.before)} t par personne en ${FROM}, puis ${fr(p.after)} t en ${TO} ` +
    `(${p.change >= 0 ? "+" : "−"}${fr(Math.abs(p.change), 0)} %) · ${fr(p.people / 1e6, 0)} millions d'habitants · ` +
    `${fr(p.total, 2)} Gt au total en ${TO}, soit ${fr((p.total / worldTotal) * 100)} % du monde`,
  // The "against" control: its legend, its untouched option, and each option's words.
  levelLabel: "À l'aune de",
  noneLabel: "Aucun repère",
  announce: (p) => `${p.name} — ${head(p)} ; ${spread(p)}`,
  note: (p) => `${p.name} · ${head(p)} · ${spread(p)} · ${inside(p)}`,
  title: "La Chine a triplé son CO₂ par personne depuis 2000 ; l'Américain moyen n'en émet plus que 1,7 fois plus",
  limits:
    // Shorter than the proof's own standfirst: the proof's page overflows a 375 × 812 phone by 39 px.
    `${FROM} en teinte claire, ${TO} en plein, chaque niveau mesuré DEPUIS ZÉRO ; chaque chiffre est écrit au-dessus de sa propre tête.`,
  reading:
    `Lecture : rangés par total, pas par niveau. Choisissez un pays pour coucher ses deux ` +
    `niveaux ; survolez une paire pour la POPULATION derrière le ratio.`,
  source: `Source : Global Carbon Budget 2025 · population ${TO}, via Our World in Data`,
  alt:
    `Six paires de sucettes, une par pays, mesurant les tonnes de CO₂ par personne en ${FROM} ` +
    `(teinte claire) et en ${TO} (plein), chaque tige partant de zéro. La ${subject.name} ` +
    `monte de ${fr(subject.before)} à ${fr(subject.after)} tonnes, les États-Unis descendent ` +
    `de ${fr(usa.before)} à ${fr(usa.after)} : le rapport entre les deux passe de ` +
    `${fr(ratioBefore)} à ${fr(ratioAfter)}. Sous chaque paire, le nom du pays et son ` +
    `pourcentage d'évolution. Les six sont rangés par émissions totales, pas par niveau ; ` +
    `choisir un pays couche ses deux niveaux en références horizontales sur les six paires.`,
  evidenceLevels: 4,
  check() {
    const grew = subject.after / subject.before;
    if (Math.round(grew) !== 3) throw new Error(`China multiplied its CO₂ per person by ${fr(grew, 2)} since ${FROM}, not about three`);
    if (fr(ratioAfter) !== "1,7") throw new Error(`the average American now emits ${fr(ratioAfter)} times China's per-person level, not 1,7`);
  },
};
