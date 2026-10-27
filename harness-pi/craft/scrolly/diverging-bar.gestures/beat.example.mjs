// beat.mjs for the worked example proof/static-diverging-bar-eu-per-capita — « La Croatie est le seul pays de l’UE à
// émettre plus de CO2 par personne qu’en 1990 » — written for the paired gesture kit (scrolly): one signed bar per
// country from a mid zero; one card per gesture. Every number is COMPUTED from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR, VALUE] = [col("Entity"), col("Year"), col("CO₂ emissions per capita")];
const FRENCH = {
  Austria: "Autriche", Belgium: "Belgique", Bulgaria: "Bulgarie", Croatia: "Croatie", Cyprus: "Chypre", Czechia: "Tchéquie", Denmark: "Danemark",
  Estonia: "Estonie", Finland: "Finlande", France: "France", Germany: "Allemagne", Greece: "Grèce", Hungary: "Hongrie", Ireland: "Irlande",
  Italy: "Italie", Latvia: "Lettonie", Lithuania: "Lituanie", Luxembourg: "Luxembourg", Malta: "Malte", Netherlands: "Pays-Bas", Poland: "Pologne",
  Portugal: "Portugal", Romania: "Roumanie", Slovakia: "Slovaquie", Slovenia: "Slovénie", Spain: "Espagne", Sweden: "Suède",
};
const FROM = 1990;
const TO = 2024;
const valueAt = (entity, year) => table.rows.find((r) => r[ENTITY] === entity && r[YEAR] === year)?.[VALUE];
const changes = [...new Set(table.rows.map((r) => r[ENTITY]))]
  .map((name) => ({ name: FRENCH[name] ?? name, from: valueAt(name, FROM), to: valueAt(name, TO) }))
  .filter((d) => Number.isFinite(d.from) && Number.isFinite(d.to))
  .map((d) => ({ ...d, change: d.to - d.from }))
  .sort((a, b) => b.change - a.change);
const rose = changes.filter((d) => d.change > 0);
const fell = changes.filter((d) => d.change < 0);
const subject = rose[0];
const two = (v) => Math.abs(v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default {
  eyebrow: "Climat · Union européenne",
  series: ["variation"],
  rows: changes.map((d) => ({ name: d.name, value: d.change })),
  unit: `t de CO2 par personne, ${FROM}-${TO}`,
  format: (v) => `${v > 0 ? "+" : "−"}${two(v)}`,
  gestures: [
    { do: "reveal", card: `Les ${changes.length} États membres, de la plus forte hausse à la plus forte baisse.` },
    { do: "highlight", mark: "Croatie", card: `La Croatie émet ${two(subject.change)} t de CO2 par personne de plus qu’en ${FROM}.` },
    { do: "filter", mark: "Croatie", card: `C’est la seule hausse : les ${fell.length} autres pays baissent.` },
  ],
  title: "La Croatie est le seul pays de l’UE à émettre plus de CO2 par personne qu’en 1990",
  limits: `Variation des émissions de CO2 par personne entre ${FROM} et ${TO}, en tonnes, dans les ${changes.length} États membres. Combustibles fossiles et industrie uniquement.`,
  source: "Source : Global Carbon Budget (2025), traitement Our World in Data",
  scope: (shown, all) => `${shown} des ${all} États membres : les deux extrémités du classement.`,
  alt: (drawn) => `Barres divergentes : la variation des émissions de CO2 par personne entre ${FROM} et ${TO} dans ${drawn.length} des ${changes.length} pays de l’UE. La Croatie est la seule en hausse.`,
  check() {
    if (rose.length !== 1 || subject.name !== "Croatie") throw new Error(`the rises are ${rose.map((d) => d.name).join(", ")}, not Croatia alone`);
  },
};
