// beat.mjs for the worked example proof/static-connected-scatter-lowcarbon — "all N countries cleaned
// up their electricity — M nonetheless weigh less in Europe's low-carbon output". Every number on the
// plate is COMPUTED from data.json; both shares are computed from the generation columns.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const LOW_CARBON = ["other_renewables_generation__twh", "bioenergy_stacked_generation__twh", "solar_generation__twh", "wind_generation__twh", "hydro_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"];
const [CODE, YEAR] = [col("code"), col("year")];
const FROM = 2000;
const TO = 2024;
const NAMES = {
  FRA: "France", DEU: "Allemagne", ESP: "Espagne", GBR: "Royaume-Uni", SWE: "Suède", ITA: "Italie", FIN: "Finlande", AUT: "Autriche",
  NLD: "Pays-Bas", BEL: "Belgique", POL: "Pologne", CZE: "Tchéquie", PRT: "Portugal", DNK: "Danemark", GRC: "Grèce", IRL: "Irlande",
};

const sum = (r, cols) => cols.reduce((s, c) => s + Number(r[col(c)]), 0);
const reading = (code, year) => {
  const r = table.rows.find((row) => row[CODE] === code && Number(row[YEAR]) === year);
  if (!r) throw new Error(`no ${year} row for ${code}`);
  const lc = sum(r, LOW_CARBON);
  return { lc, total: lc + sum(r, FOSSIL) };
};
const codes = [...new Set(table.rows.map((r) => r[CODE]))];
const groupTotal = (year) => codes.reduce((s, c) => s + reading(c, year).lc, 0);
const [groupFrom, groupTo] = [groupTotal(FROM), groupTotal(TO)];
// x: the entity's share of the group's low-carbon output; y: the low-carbon share of its own mix.
const stateOf = (code, year, group) => {
  const r = reading(code, year);
  return { x: (r.lc / group) * 100, y: (r.lc / r.total) * 100 };
};
const entities = codes.map((code) => ({ name: code, label: NAMES[code] ?? code, code, from: stateOf(code, FROM, groupFrom), to: stateOf(code, TO, groupTo) }));

const cleaner = entities.filter((e) => e.to.y > e.from.y);
const lighter = entities.filter((e) => e.to.x < e.from.x);
const subject = entities.find((e) => e.name === "FRA");
const subjectWeight = subject.to.x - subject.from.x;
const subjectMix = subject.to.y - subject.from.y;

const plain = (s) => s.replace(/[   ]/g, " ");
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

export default {
  eyebrow: "Énergie · Europe",
  entities,
  subject: subject.name,
  from: FROM,
  to: TO,
  xName: `part du bas-carbone des ${entities.length} pays, en %`,
  yName: "part de bas-carbone dans sa propre électricité, en %",
  // Both axes are shares: the y axis runs to 100 %.
  yTicks: [0, 25, 50, 75, 100],
  title: [
    `Les ${entities.length} pays ont tous nettoyé leur électricité — ${lighter.length} pèsent pourtant moins dans le bas-carbone européen`,
    `Tous plus propres chez eux, ${lighter.length} plus légers en Europe`,
    `Plus propres chez eux, plus légers en Europe`,
  ],
  limits: [
    `Chaque pays est dessiné deux fois : le cercle vide est ${FROM}, le cercle plein ${TO}, et l’arc pointillé les relie. ` +
      `En abscisse, sa part du bas-carbone des ${entities.length} pays ; en ordonnée, la part de bas-carbone dans sa propre électricité. ` +
      `La ${subject.label} a gagné ${one(subjectMix)} points chez elle et perdu ${one(-subjectWeight)} points de poids européen — elle a produit plus, les autres ont produit plus vite.`,
    `Le cercle vide est ${FROM}, le plein ${TO}. En abscisse la part du bas-carbone européen, en ordonnée la part de bas-carbone dans sa propre électricité. ` +
      `La ${subject.label} : ${one(subjectMix)} points chez elle, ${one(subjectWeight)} de poids européen.`,
    `Cercle vide ${FROM}, cercle plein ${TO} : part du groupe en abscisse, mix propre en ordonnée.`,
  ],
  reading: [
    `Lecture : monter, c’est se nettoyer chez soi ; aller à droite, c’est peser plus lourd dans le groupe. Les deux sont indépendants, et c’est tout l’intérêt de tracer les deux.`,
    `Lecture : monter, c’est se nettoyer chez soi ; aller à droite, c’est peser plus dans le groupe.`,
  ],
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt:
    `Nuage connecté de ${entities.length} pays européens entre ${FROM} et ${TO}. Chaque pays est un cercle vide (${FROM}) relié par un arc pointillé à un cercle plein (${TO}). ` +
    `Tous les arcs montent : les ${entities.length} pays se sont nettoyés. ${lighter.length} pointent vers la gauche, dont la ${subject.label}, ` +
    `qui perd ${one(-subjectWeight)} points de poids européen tout en gagnant ${one(subjectMix)} points de bas-carbone chez elle.`,
  evidenceLevels: 4,
  check() {
    if (cleaner.length !== entities.length) throw new Error(`${entities.length - cleaner.length} countries' own mix did not get cleaner`);
    if (!(lighter.length >= 4 && lighter.length < entities.length / 2)) throw new Error(`${lighter.length} of ${entities.length} lost weight in the group — not a minority of four or more`);
    if (!(subjectWeight < -5 && subjectMix > 0)) throw new Error(`France moved ${subjectMix.toFixed(1)} points of own mix and ${subjectWeight.toFixed(1)} of group weight`);
  },
};
