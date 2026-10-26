// beat.mjs for the worked example proof/static-diverging-bar-eu-per-capita — "Croatia is the only
// EU country emitting more CO2 per person than in 1990". Every number on the plate is COMPUTED from
// data.json; "the only" is the fragile kind of claim, so check() asserts it.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR, VALUE] = [col("Entity"), col("Year"), col("CO₂ emissions per capita")];

const FROM = 1990;
const TO = 2024;
const valueAt = (entity, year) => table.rows.find((r) => r[ENTITY] === entity && r[YEAR] === year)?.[VALUE];

// One row per country with a reading in both years: { name, change }, change = TO minus FROM.
const countries = [...new Set(table.rows.map((r) => r[ENTITY]))];
const changes = countries
  .map((name) => ({ name, from: valueAt(name, FROM), to: valueAt(name, TO) }))
  .filter((d) => Number.isFinite(d.from) && Number.isFinite(d.to))
  .map((d) => ({ ...d, change: d.to - d.from }))
  .sort((a, b) => b.change - a.change);
const rose = changes.filter((d) => d.change > 0);
const fell = changes.filter((d) => d.change < 0);
const subject = rose[0];
const averageOfFalls = fell.reduce((s, d) => s + d.change, 0) / fell.length;
const largest = fell.reduce((a, b) => (b.change < a.change ? b : a));

const plain = (s) => s.replace(/[   ]/g, " ");
const two = (v) => plain(Math.abs(v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const signed = (v) => `${v > 0 ? "+" : "−"}${two(v)}`;

export default {
  eyebrow: "Climat · Union européenne",
  rows: changes.map((d) => ({ name: d.name, change: d.change })),
  // The row the takeaway is about: drawn in the accent, washed, bold, with its own note.
  subject: subject.name,
  subjectNote: `la seule hausse depuis ${FROM}`,
  // The counter line over the plot: what the other rows add up to.
  note: `Moyenne des ${fell.length} baisses : ${signed(averageOfFalls)}`,
  format: signed,
  unitMark: "t",
  // The headline in forms, longest first.
  title: [
    `La Croatie est le seul pays de l’UE à émettre plus de CO2 par personne qu’en ${FROM}`,
    `La Croatie est le seul pays de l’UE à émettre plus qu’en ${FROM}`,
    `Le seul pays de l’UE en hausse depuis ${FROM}`,
  ],
  // ONE string of sentences separated by ". ": a tight frame keeps only the first sentence.
  limits:
    `Variation des émissions de CO2 par personne entre ${FROM} et ${TO}, en tonnes, dans les ${changes.length} États membres. ` +
    `La hausse croate est de ${two(subject.change)} t sur une base de ${two(subject.from)} t. ` +
    `Les ${fell.length} autres baissent, de ${two(averageOfFalls)} t en moyenne, et ${largest.name} de ${two(largest.change)} t.`,
  source:
    "Source : Global Carbon Budget (2025) ; population d’après diverses sources (2024), traitement Our World in Data · combustibles fossiles et industrie uniquement",
  // The alt text for the rows actually drawn (a tight frame may draw fewer).
  alt: (drawn) =>
    `Barres divergentes : la variation des émissions de CO2 par personne entre ${FROM} et ${TO} dans ` +
    `${drawn.length === changes.length ? `les ${changes.length} pays de l’UE` : `${drawn.length} des ${changes.length} pays de l’UE`}. ` +
    `La Croatie est la seule en hausse (+${two(subject.change)} t) ; les ${fell.length} autres baissent, de ${two(largest.change)} t pour ${largest.name}, la plus forte baisse.`,
  // The sentence a tight frame prints when it draws fewer rows, with the count it actually took.
  scope: (drawn, all) => `${drawn} des ${all} États membres : la hausse et les ${drawn - 1} plus fortes baisses.`,
  // Two levels of evidence: the subject, and the field it stands out from.
  evidenceLevels: 2,
  check() {
    if (changes.length !== 27) throw new Error(`expected the 27 member states in both ${FROM} and ${TO}, got ${changes.length}`);
    if (rose.length !== 1) throw new Error(`the title says one country rose; ${rose.length} did (${rose.map((d) => d.name).join(", ")})`);
    if (subject.name !== "Croatia") throw new Error(`the one rise is ${subject.name}, not Croatia`);
    if (fell.length !== changes.length - 1) throw new Error(`${changes.length - 1 - fell.length} countries are exactly flat`);
  },
};
