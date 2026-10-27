// beat.mjs for the worked example proof/static-diverging-bar-eu-per-capita — "La Croatie est le seul pays de l’UE à
// émettre plus de CO2 par personne qu’en 1990" — for the paired gesture kit. Every number is COMPUTED from data.json;
// "the only" is the fragile kind of claim, so check() asserts it.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR, VALUE] = [col("Entity"), col("Year"), col("CO₂ emissions per capita")];
const FROM = 1990;
const TO = 2024;
const valueAt = (e, y) => table.rows.find((r) => r[ENTITY] === e && r[YEAR] === y)?.[VALUE];
const FRENCH = {
  Austria: "Autriche", Belgium: "Belgique", Bulgaria: "Bulgarie", Croatia: "Croatie", Cyprus: "Chypre", Czechia: "Tchéquie", Denmark: "Danemark",
  Estonia: "Estonie", Finland: "Finlande", France: "France", Germany: "Allemagne", Greece: "Grèce", Hungary: "Hongrie", Ireland: "Irlande",
  Italy: "Italie", Latvia: "Lettonie", Lithuania: "Lituanie", Luxembourg: "Luxembourg", Malta: "Malte", Netherlands: "Pays-Bas", Poland: "Pologne",
  Portugal: "Portugal", Romania: "Roumanie", Slovakia: "Slovaquie", Slovenia: "Slovénie", Spain: "Espagne", Sweden: "Suède",
};
// One row per country with a reading in both years: its change, signed, sorted from the largest rise.
const changes = [...new Set(table.rows.map((r) => r[ENTITY]))]
  .map((e) => ({ name: FRENCH[e] ?? e, from: valueAt(e, FROM), to: valueAt(e, TO) }))
  .filter((d) => Number.isFinite(d.from) && Number.isFinite(d.to))
  .map((d) => ({ ...d, change: d.to - d.from }))
  .sort((a, b) => b.change - a.change);
const rose = changes.filter((d) => d.change > 0);
const subject = rose[0];
const plain = (s) => s.replace(/[  ]/g, " ");
const two = (v) => plain(Math.abs(v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const signed = (v) => `${v > 0 ? "+" : "−"}${two(v)}`;

export default {
  eyebrow: "Climat · Union européenne",
  series: [`variation ${FROM}-${TO}`],
  rows: changes.map((d) => ({ name: d.name, value: d.change })),
  unit: "t de CO2 par personne",
  gestures: [
    { do: "highlight", mark: subject.name },
    { do: "annotate", mark: subject.name, note: `${signed(subject.change)} t : la seule hausse` },
  ],
  format: signed,
  title: [
    "La Croatie est le seul pays de l’UE à émettre plus de CO2 par personne qu’en 1990",
    "La Croatie est le seul pays de l’UE à émettre plus qu’en 1990",
  ],
  limits: [
    `Combustibles fossiles et industrie uniquement ; variation par personne entre ${FROM} et ${TO}, en tonnes, dans les ${changes.length} États membres.`,
    "Combustibles fossiles et industrie uniquement ; variation par personne entre 1990 et 2024, en tonnes.",
  ],
  source: "Source : Global Carbon Budget (2025), traitement Our World in Data",
  alt: (drawn) => `Barres divergentes : la variation des émissions de CO2 par personne entre ${FROM} et ${TO} dans ${drawn.length} des ${changes.length} pays de l’UE. La Croatie est la seule en hausse (${signed(subject.change)} t).`,
  scope: (shown, all) => `${shown} des ${all} États membres : la hausse et les plus fortes baisses.`,
  check() {
    if (rose.length !== 1 || subject.name !== "Croatie") throw new Error(`the rises are ${rose.map((d) => d.name).join(", ")}, not Croatia alone`);
  },
};
