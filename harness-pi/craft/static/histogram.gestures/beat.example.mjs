// beat.mjs for the worked example proof/static-carbon-footprint-spread — "6 pays sur 10 émettent moins de 4 tonnes
// de CO₂ par personne" — written for the Units gesture kit: the readings and the bins are the beat's, the staging is
// the `gestures` list. render-beat.mjs counts the bins; every number on the plate is computed from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [COUNTRY, CODE, VALUE] = [col("entity"), col("code"), col("co2_emissions_per_capita")];

// One reading per country (three-letter codes only: "World" or "Africa" is not one more country).
const units = data.rows.filter((r) => /^[A-Z]{3}$/.test(String(r[CODE]))).map((r) => ({ name: r[COUNTRY], value: Number(r[VALUE]) }));
const below = units.filter((u) => u.value < 4).length;

export default {
  eyebrow: "Climat · Monde",
  units,
  // Ten bins four tonnes wide from 0; the last one is open (36 and above).
  binStart: 0,
  binWidth: 4,
  binCount: 10,
  unit: "tonnes de CO₂ par personne, 2023 · un pays compte pour un",
  // The staging, in story order: the bin under 4 tonnes in the accent, the rule at 4 with the count on its left,
  // and that bin bracketed against every country.
  gestures: [
    { do: "highlight", mark: "0–4" },
    { do: "reference", value: 4, note: `${below} pays sur ${units.length} sous 4 tonnes` },
    { do: "bracket", mark: "0–4", of: "whole", note: `${Math.round((below / units.length) * 10)} pays sur 10` },
  ],
  title: "6 pays sur 10 émettent moins de 4 tonnes de CO₂ par personne",
  limits: [
    `Répartition des ${units.length} pays en 2023, par tranches de 4 tonnes — chacun compte pour un, sans pondération par la population.`,
    `Les ${units.length} pays en 2023, par tranches de 4 tonnes.`,
  ],
  source: "Source : Global Carbon Budget (2025), via Our World in Data",
  alt: ({ groups, total }) => `Histogramme des émissions de CO₂ par personne des ${total} pays en 2023, en ${groups.length} tranches de 4 tonnes ; ${groups[0].count} pays sous 4 tonnes.`,
  // Given the counted groups: if the data moved, the render refuses.
  check({ counts, total }) {
    if (Math.round((counts["0-4"] / total) * 10) !== 6) throw new Error(`${counts["0-4"]} of ${total} countries are under 4 t, not six in ten`);
  },
};
