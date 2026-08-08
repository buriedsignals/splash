// The real case this skill is proved against: Swiss territorial CO2 emissions, 1950-2024, with a
// range annotation drawn at the 1967 level — the whole point of shipping range-annotations at all.
// Run with a real token:
//
//   DATAWRAPPER_TOKEN=... bun run scripts/prove-co2.mjs
//
// Data: Our World in Data, `annual-co2-emissions-per-country.csv`, Switzerland only, from 1950,
// tonnes converted to megatonnes.

import { produce } from "./produce.mjs";

const CSV_URL = "https://ourworldindata.org/grapher/annual-co2-emissions-per-country.csv?country=~CHE";

export async function fetchSwissCo2Since1950(fetchFn = fetch) {
  const response = await fetchFn(CSV_URL);
  if (!response.ok) throw new Error(`OWID fetch failed: ${response.status}`);
  const text = await response.text();
  const lines = text.trim().split("\n");
  const header = lines[0].split(",");
  const entityIndex = header.indexOf("Entity");
  const yearIndex = header.indexOf("Year");
  const co2Index = header.indexOf("Annual CO₂ emissions");

  const rows = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(",");
    if (cells[entityIndex] !== "Switzerland") continue;
    const year = Number(cells[yearIndex]);
    if (year < 1950) continue;
    const tonnes = Number(cells[co2Index]);
    if (!Number.isFinite(tonnes)) continue;
    rows.push({ year, co2Mt: Math.round((tonnes / 1_000_000) * 100) / 100 });
  }
  rows.sort((a, b) => a.year - b.year);
  return rows;
}

export function buildCo2Spec(data) {
  return {
    takeaway: "En 2024, la Suisse a émis moins de CO₂ sur son territoire qu'en 1967.",
    limits: "Émissions territoriales uniquement.",
    credit: "Global Carbon Budget 2025, via Our World in Data",
    effectiveDate: "données 2024",
    language: "fr-FR",
    color: "#0B7A75",
    chartType: "d3-lines",
    format: "static",
    data,
    rangeAnnotations: [{ value: 32.5, label: "Niveau de 1967 (32,5 Mt)" }],
  };
}

if (import.meta.main) {
  const data = await fetchSwissCo2Since1950(fetch);
  const spec = buildCo2Spec(data);
  const token = process.env.DATAWRAPPER_TOKEN ?? "";
  const result = await produce(spec, { outDir: "/tmp/dw-beat", name: "co2", token, fetchFn: fetch });
  console.log(JSON.stringify(result, null, 2));
}
