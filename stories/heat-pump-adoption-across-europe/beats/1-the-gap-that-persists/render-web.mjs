// Runner for the heat-pump slope chart web beat.
// Reads the frozen CSV, builds props, calls the format's generic renderWeb.

import { readFile } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { renderWeb as renderWebFunc } from "#shared/chart-web/scripts/render-web.mjs";
import { SlopeWeb, FRAME, parseSlopeData } from "./SlopeWeb.tsx";

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

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY_DIR = resolve(HERE, "../..");

function parseCsv(text) {
  const lines = parseCsvRows(text.trim());
  const headers = lines[0];
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i];
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      const h = headers[j];
      const v = cells[j];
      if (h === "year") {
        row[h] = parseInt(v, 10);
      } else if (h === "households_with_heat_pump_pct") {
        row["value"] = parseInt(v, 10);
      } else {
        row[h] = v;
      }
    }
    rows.push(row);
  }
  return rows;
}

async function main() {
  const csvPath = join(STORY_DIR, "source", "data.csv");
  const csvText = await readFile(csvPath, "utf8");
  const rows = parseCsv(csvText);
  const slopes = parseSlopeData(rows);

  const { outPath } = await renderWebFunc({
    component: SlopeWeb,
    props: {
      slopes,
      title: "Europe's heat-pump gap is narrowing, but the Nordics still lead",
      source: "Source: Splash Test Desk synthetic dataset",
      alt: "Slope chart showing heat-pump adoption percentages for 10 European countries from 2021 to 2025. All countries increased, but the gap between Nordic leaders and the lowest values remains wide.",
      ground: "#16191B",
      accent: "#D4A853",
      frame: FRAME,
    },
    outDir: join(HERE, "renders"),
    name: "slope.html",
  });

  console.log("web beat -> " + outPath + "  [" + slopes.length + " countries]");
}

main().catch(console.error);
