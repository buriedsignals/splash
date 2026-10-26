// beat.mjs for the worked example proof/video-histogram-carbon-footprint-spread — « 6 pays sur 10 émettent moins de
// 4 tonnes de CO₂ par personne », told in time. The readings come from data.json; render-beat.mjs bins them, counts the
// readings under the threshold and their share, and hands them to check().
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [COUNTRY, CODE, VALUE] = [col("Entity"), col("Code"), col("CO2 emissions per capita")];

// The readings: one per country (three-letter codes only — aggregates like "World" are not countries).
const observations = data.rows
  .filter((r) => /^[A-Z]{3}$/.test(String(r[CODE])) && Number.isFinite(Number(r[VALUE])))
  .map((r) => ({ name: r[COUNTRY], value: Number(r[VALUE]) }));

export default {
  lang: "fr",
  eyebrow: "Climat · Monde",
  observations,
  // Ten bins four tonnes wide from 0; the last one is open (36 and above).
  binStart: 0,
  binWidth: 4,
  binCount: 10,
  // The cut the takeaway counts against: the edge between the first two bins.
  threshold: 4,
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: ["6 pays sur 10 émettent moins de 4 tonnes de CO₂ par personne", "6 pays sur 10 sous 4 tonnes de CO₂ par personne"],
  source: ["Source : Global Carbon Budget (2025), via Our World in Data", "Source : Global Carbon Budget, via Our World in Data"],
  evidenceLevels: 2,
  // Given what the video counts: if the data moved, the render refuses.
  check({ share }) {
    if (Math.round(share * 10) !== 6) throw new Error(`${Math.round(share * 100)} % of countries are under 4 t, not six in ten`);
  },
};
