// beat.mjs for the worked example proof/static-diverging-bar-eu-per-capita, as a PAIRED gesture video — "La Croatie
// est le seul pays de l’UE à émettre plus de CO2 par personne qu’en 1990". One signed value per country; three
// gestures, in story order: reveal, subject, conclusion. Every number is COMPUTED from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR, VALUE] = [col("Entity"), col("Year"), col("CO₂ emissions per capita")];
const FRENCH = {
  Austria: "Autriche", Belgium: "Belgique", Bulgaria: "Bulgarie", Croatia: "Croatie", Cyprus: "Chypre", Czechia: "Tchéquie",
  Denmark: "Danemark", Estonia: "Estonie", Finland: "Finlande", France: "France", Germany: "Allemagne", Greece: "Grèce",
  Hungary: "Hongrie", Ireland: "Irlande", Italy: "Italie", Latvia: "Lettonie", Lithuania: "Lituanie", Luxembourg: "Luxembourg",
  Malta: "Malte", Netherlands: "Pays-Bas", Poland: "Pologne", Portugal: "Portugal", Romania: "Roumanie", Slovakia: "Slovaquie",
  Slovenia: "Slovénie", Spain: "Espagne", Sweden: "Suède",
};
const at = (e, y) => table.rows.find((r) => r[ENTITY] === e && r[YEAR] === y)?.[VALUE];
// One row per member state with a reading in both years: the change 2024 minus 1990, largest rise first.
const rows = Object.keys(FRENCH)
  .map((e) => ({ name: FRENCH[e], from: at(e, 1990), to: at(e, 2024) }))
  .filter((d) => Number.isFinite(d.from) && Number.isFinite(d.to))
  .map((d) => ({ name: d.name, value: d.to - d.from }))
  .sort((a, b) => b.value - a.value);
const rose = rows.filter((r) => r.value > 0);
const largest = rows.at(-1);
const two = (v) => `${v < 0 ? "−" : "+"}${Math.abs(v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default {
  eyebrow: "Climat · Union européenne",
  series: ["Variation 1990-2024"],
  rows,
  unit: "t de CO₂ par personne, 2024 contre 1990",
  gestures: [
    { do: "highlight", mark: "Croatie" },
    { do: "annotate", mark: "Croatie", note: `${two(rose[0].value)} t, la seule hausse` },
    { do: "compare", marks: ["Croatie", largest.name] },
  ],
  title: "La Croatie est le seul pays de l’UE à émettre plus de CO2 par personne qu’en 1990",
  source: ["Source : Global Carbon Budget (2025), traitement Our World in Data", "Global Carbon Budget 2025, via OWID"],
  scope: (shown, all) => `${shown} des ${all} États membres : les deux bouts du classement`,
  check() {
    if (rows.length !== 27) throw new Error(`expected the 27 member states, got ${rows.length}`);
    if (rose.length !== 1 || rose[0].name !== "Croatie") throw new Error(`the rises are ${rose.map((r) => r.name).join(", ")}, not Croatia alone`);
  },
};
