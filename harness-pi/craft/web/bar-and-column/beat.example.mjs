// beat.mjs for the worked example proof/web-bar-top-emitters-2024 — "China emitted more CO2 in
// 2024 than the next five countries together", as an interactive page. Every number on the page
// is COMPUTED from data.json; the reader's readings (share, followers, the stacked sums) are
// computed by render-beat.mjs and only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [COUNTRY, CODE, VALUE] = [col("country"), col("code"), col("co2_tonnes")];

// The whole ranking, every country (not only the ten drawn): "how many below it" is asked of all
// of them. OWID aggregates (World, continents, income groups) have no ISO-3 code and are left out.
const FRENCH = {
  CHN: "Chine", USA: "États-Unis", IND: "Inde", RUS: "Russie", JPN: "Japon",
  IDN: "Indonésie", IRN: "Iran", SAU: "Arabie s.", KOR: "Corée du S.", DEU: "Allemagne",
};
const countries = data.rows.filter((r) => /^[A-Z]{3}$/.test(r[CODE]));
const rows = countries
  .map((r) => ({ name: FRENCH[r[CODE]] ?? r[COUNTRY], value: Number(r[VALUE]) / 1e9 }))
  .sort((a, b) => b.value - a.value);
const world = Number(data.rows.find((r) => r[CODE] === "OWID_WRL")[VALUE]) / 1e9;

// The claim: the leader, and the run of countries below it that still falls short of it.
const subject = rows[0];
const nextFive = rows.slice(1, 6).reduce((s, r) => s + r.value, 0);
const topShare = (rows.slice(0, 10).reduce((s, r) => s + r.value, 0) / world) * 100;

const fr = (v, digits = 2) => v.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export default {
  lang: "fr",
  eyebrow: "Climat · Monde",
  rows,
  drawCount: 10,
  subject: subject.name,
  whole: world,
  unit: "Gt CO₂",
  format: (v) => fr(v),
  // What a column answers when it is hovered, tapped or tabbed to.
  detail: (c) => `${fr(c.share, 1)} % du total mondial · il faut additionner les ${c.followers} pays suivants du classement pour l'égaler`,
  // The "stack against" control: its legend, its untouched option, and each option's words.
  stackLabel: "Empiler contre",
  noneLabel: "Le classement seul",
  announce: (o) => `${o.name} — empiler les ${o.followers} pays suivants du classement, ${fr(o.followersSum)} Gt contre ${fr(o.value)} Gt`,
  note: (o) => `Les ${o.followers} pays suivants du classement · ${fr(o.followersSum)} Gt réunis · ${o.name} : ${fr(o.value)} Gt`,
  total: (o) => `= ${fr(o.followersSum)}`,
  title: "La Chine a émis plus de CO₂ en 2024 que les 5 pays suivants réunis",
  limits:
    `Émissions annuelles de CO₂ en 2024, en milliards de tonnes. Les 10 premiers pays du classement mondial — ${fr(topShare, 1)} % du total. ` +
    `Chaque colonne porte son chiffre : la page ne dessine pas d'axe des valeurs, seulement son zéro.`,
  reading:
    `Lecture : survolez, touchez ou tabulez une colonne pour lire sa part du total mondial. Dans « Empiler contre », choisissez un pays : ` +
    `les colonnes du dessous s'empilent à côté de lui jusqu'à l'atteindre. La pile doit l'atteindre, pas rester dessous : elle compte donc un pays de plus que le titre.`,
  source: `Source : Global Carbon Budget 2025, via Our World in Data · 2024 · ${rows.length} pays classés`,
  alt:
    `Dix colonnes, une par pays, mesurant les émissions de CO₂ de 2024 en milliards de tonnes. Celle de la Chine, ${fr(subject.value)} Gt, ` +
    `dépasse à elle seule la somme des 5 suivantes (${fr(nextFive)} Gt). Les États-Unis suivent à ${fr(rows[1].value)} Gt, l'Inde à ${fr(rows[2].value)} Gt.`,
  evidenceLevels: 2,
  check() {
    if (subject.name !== "Chine") throw new Error(`the leader is ${subject.name}, not China`);
    if (!(subject.value > nextFive)) throw new Error(`China ${subject.value} no longer exceeds the next five ${nextFive}`);
  },
};
