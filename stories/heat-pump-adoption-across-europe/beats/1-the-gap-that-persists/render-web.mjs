// Runner for the heat-pump slope chart web beat.
// Reads the frozen CSV, builds props, calls the format's generic renderWeb.

import { readFile } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { renderWeb as renderWebFunc } from "/Users/tomvaillant/.agents/skills/chart-web/scripts/render-web.mjs";
import { SlopeWeb, FRAME, parseSlopeData } from "./SlopeWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY_DIR = resolve(HERE, "../..");

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",");
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
