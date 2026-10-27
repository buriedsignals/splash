// beat.mjs for the worked example proof/static-diverging-bar-eu-per-capita — "La Croatie est le seul pays de l’UE à
// émettre plus de CO2 par personne qu’en 1990" — written for the paired gesture kit (one signed value per key).
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR, VALUE] = [col("Entity"), col("Year"), col("CO₂ emissions per capita")];
const FROM = 1990;
const TO = 2024;
const FRENCH = { Austria: "Autriche", Belgium: "Belgique", Bulgaria: "Bulgarie", Croatia: "Croatie", Cyprus: "Chypre", Czechia: "Tchéquie", Denmark: "Danemark", Estonia: "Estonie", Finland: "Finlande", France: "France", Germany: "Allemagne", Greece: "Grèce", Hungary: "Hongrie", Ireland: "Irlande", Italy: "Italie", Latvia: "Lettonie", Lithuania: "Lituanie", Luxembourg: "Luxembourg", Malta: "Malte", Netherlands: "Pays-Bas", Poland: "Pologne", Portugal: "Portugal", Romania: "Roumanie", Slovakia: "Slovaquie", Slovenia: "Slovénie", Spain: "Espagne", Sweden: "Suède" };
const valueAt = (e, y) => table.rows.find((r) => r[ENTITY] === e && Number(r[YEAR]) === y)?.[VALUE];
const rows = [...new Set(table.rows.map((r) => r[ENTITY]))]
  .map((e) => ({ e, from: valueAt(e, FROM), to: valueAt(e, TO) }))
  .filter((d) => Number.isFinite(d.from) && Number.isFinite(d.to))
  .map((d) => ({ name: FRENCH[d.e] ?? d.e, value: d.to - d.from }))
  .sort((a, b) => b.value - a.value);
const rose = rows.filter((r) => r.value > 0);
const subject = rose[0];
const two = (v) => `${v > 0 ? "+" : v < 0 ? "-" : ""}${Math.abs(v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default {
  eyebrow: "Climat · Union européenne",
  series: [`Variation ${FROM}-${TO}`],
  rows,
  unit: "t de CO2 par personne",
  gestures: [
    { do: "highlight", mark: subject.name },
    { do: "annotate", mark: subject.name, note: `${two(subject.value)} t, la seule hausse` },
    { do: "filter", marks: [subject.name] },
    { do: "reorder", value: "ascending" },
  ],
  restLabel: "Les 27",
  format: two,
  title: "La Croatie est le seul pays de l’UE à émettre plus de CO2 par personne qu’en 1990",
  limits: `Variation des émissions de CO2 par personne entre ${FROM} et ${TO}, en tonnes, dans les ${rows.length} États membres.`,
  source: "Source : Global Carbon Budget (2025), traitement Our World in Data",
  alt: `Barres divergentes : la variation des émissions de CO2 par personne entre ${FROM} et ${TO} dans les ${rows.length} pays de l’UE ; seule la Croatie est en hausse.`,
  check() {
    if (rose.length !== 1 || subject.name !== "Croatie") throw new Error(`the rises are ${rose.map((r) => r.name).join(", ") || "none"}, not Croatia alone`);
  },
};
