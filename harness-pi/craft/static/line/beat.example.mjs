// beat.mjs for the worked example proof/co2-suisse — "In 2024 Switzerland emitted less CO2 on its
// territory than in 1967". Every number on the plate is COMPUTED from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [YEAR, VALUE] = [col("year"), col("mt")];

// The series: one { year, value } per year, in year order.
const data = table.rows
  .map((r) => ({ year: Number(r[YEAR]), value: Number(r[VALUE]) }))
  .filter((d) => d.year >= 1950)
  .sort((a, b) => a.year - b.year);

const reference = data.find((d) => d.year === 1967).value;
const last = data[data.length - 1];
const fr = (v, decimals = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export default {
  eyebrow: "Climat · Suisse",
  entity: "Switzerland",
  data,
  unit: "Mt",
  format: fr,
  // A horizontal line the reader compares the curve to, and its label.
  reference,
  referenceLabel: "Niveau de 1967",
  // The label on the series' highest point.
  peakLabel: "pic de 1973",
  // Optional dated periods drawn as bands: [{ from, to, label }].
  eras: [
    { from: 1973, to: 1975, label: "choc pétrolier" },
    { from: 1979, to: 1981, label: "second choc" },
  ],
  title: `En ${last.year}, la Suisse a émis moins de CO2 sur son territoire qu'en 1967.`,
  limits: "Émissions territoriales seulement, hors biens importés et aviation internationale.",
  source: "Source : Global Carbon Budget 2025, via Our World in Data · données 2024",
  alt: `Courbe des émissions territoriales suisses de CO2, 1950 à ${last.year} : un pic en 1973, puis une baisse qui repasse sous le niveau de 1967 (${fr(reference)} Mt).`,
  evidenceLevels: 4,
  check() {
    if (!(last.value < reference)) throw new Error(`${last.year} (${last.value}) is not below the 1967 level (${reference})`);
  },
};
