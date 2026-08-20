// The real case this skill is proved against: Swiss territorial CO2 emissions, 1950-2024, with a
// range annotation drawn at the 1967 level — the whole point of shipping range-annotations at all.
// Run with a real token:
//
//   DATAWRAPPER_TOKEN=... bun run scripts/prove-co2.mjs
//
// Data: Our World in Data, `annual-co2-emissions-per-country.csv`, Switzerland only, from 1950,
// tonnes converted to megatonnes.

import { produce } from "./produce.mjs";

/**
 * RFC 4180 row tokeniser, inlined here rather than imported — no cross-skill runtime import, and
 * a proof/story workspace is not a skill either. A naive comma split corrupts a quoted thousands
 * separator ("1,234.5") or a quoted name carrying its own comma ("Netherlands, the"); this walks
 * the text one character at a time instead. Returns one array of raw field strings per row
 * (header included), quotes stripped, doubled quotes un-escaped, and a lone CR or CRLF closing a
 * row the same way LF does.
 */
function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i += 1; continue;
      }
      field += char; i += 1; continue;
    }
    if (char === '"') { quoted = true; i += 1; continue; }
    if (char === ",") { row.push(field); field = ""; i += 1; continue; }
    if (char === "\r") { row.push(field); rows.push(row); row = []; field = ""; i += (text[i + 1] === "\n") ? 2 : 1; continue; }
    if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; i += 1; continue; }
    field += char; i += 1;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const CSV_URL = "https://ourworldindata.org/grapher/annual-co2-emissions-per-country.csv?country=~CHE";

export async function fetchSwissCo2Since1950(fetchFn = fetch) {
  const response = await fetchFn(CSV_URL);
  if (!response.ok) throw new Error(`OWID fetch failed: ${response.status}`);
  const text = await response.text();
  const lines = parseCsvRows(text.trim());
  const header = lines[0];
  const entityIndex = header.indexOf("Entity");
  const yearIndex = header.indexOf("Year");
  const co2Index = header.indexOf("Annual CO₂ emissions");

  const rows = [];
  for (const line of lines.slice(1)) {
    const cells = line;
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
    seriesLabel: "Émissions de CO₂ (Mt)",
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
