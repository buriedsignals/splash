// beat.mjs for the worked example proof/static-carbon-footprint-spread — "6 pays sur 10 émettent
// moins de 4 tonnes de CO₂ par personne". The readings come from data.json; render-beat.mjs counts
// the bins and the share under the threshold, and hands them to check() and alt().
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [COUNTRY, CODE, VALUE] = [col("country"), col("code"), col("co2_per_capita")];

// The readings: one per country (three-letter codes only — aggregates like "World" are not countries).
const observations = data.rows
  .filter((r) => /^[A-Z]{3}$/.test(String(r[CODE])))
  .map((r) => ({ name: r[COUNTRY], value: Number(r[VALUE]) }));

export default {
  eyebrow: "Climat · Monde",
  observations,
  // Ten bins four tonnes wide from 0; the last one is open (36 and above).
  binStart: 0,
  binWidth: 4,
  binCount: 10,
  unit: "tonnes de CO₂ par personne, 2023",
  // The editorial cut the takeaway counts against.
  threshold: 4,
  // The callout's words: "127 pays sur 213 sous 4 tonnes …".
  words: { entity: "pays", of: "sur", below: "sous" },
  title: "6 pays sur 10 émettent moins de 4 tonnes de CO₂ par personne",
  limits: `Répartition des ${observations.length} pays en 2023 — chacun compte pour un, sans pondération par la population. Quelques producteurs de pétrole et de gaz sont loin sur la droite.`,
  source: "Source : Global Carbon Budget (2025), via Our World in Data",
  alt: ({ total }) => `Histogramme des émissions de CO₂ par personne des ${total} pays en 2023, par tranches de 4 tonnes.`,
  evidenceLevels: 3,
  // Given the counted share: if the data moved, the render refuses.
  check({ share }) {
    if (Math.round(share * 10) !== 6) throw new Error(`${Math.round(share * 100)} % of countries are under 4 t, not six in ten`);
  },
};
