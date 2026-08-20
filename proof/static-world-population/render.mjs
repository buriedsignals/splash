// twin/proof/static-world-population/render.mjs
//
// Reads the frozen CSV (world population, 1800-2023) and renders the area beat. Usage: bun render.mjs

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill, readPalette } from "#shared/chart-beat/render-still.mjs";
import { WorldPopulationArea } from "./WorldPopulationArea.tsx";

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

function parseCsv(text) {
  const [header, ...rows] = parseCsvRows(text.trim());
  const cols = header;
  return rows.map((row) => {
    const cells = row;
    const rec = {};
    cols.forEach((c, i) => (rec[c] = cells[i]));
    return rec;
  });
}

async function main() {
  const csv = await readFile(join(HERE, "data.csv"), "utf8");
  const rows = parseCsv(csv);
  console.log(`read ${rows.length} rows from data.csv`);
  if (rows.length !== 224) throw new Error(`expected 224 years (1800-2023), got ${rows.length}`);

  const data = rows.map((r) => ({ year: Number(r.Year), population: Number(r.Population) }));
  const first = data[0];
  const last = data[data.length - 1];
  const ratio = last.population / first.population;
  console.log(`${first.year}: ${first.population.toLocaleString()} -> ${last.year}: ${last.population.toLocaleString()} (${ratio.toFixed(2)}x)`);
  if (ratio < 8) throw new Error(`expected at least an 8x increase 1800->2023, got ${ratio.toFixed(2)}x`);

  const crossing = data.find((d) => d.population >= 1e9);
  console.log(`crossed 1 billion in ${crossing.year} (${crossing.population.toLocaleString()})`);

  // The headline claims 8 billion by name — derive WHICH year that happened from the data itself,
  // the same way the 1-billion marker already does, rather than typing a year by hand. The final
  // row of the series (2023) is not necessarily the crossing row: 2022 (8,021,407,196) already
  // cleared 8 billion here, so a hand-typed "2023" states the wrong year even though 2023 IS the
  // last year in the frozen series — the exact "final year != crossing year" mistake this fix closes.
  const eightBillion = data.find((d) => d.population >= 8e9);
  if (!eightBillion) throw new Error(`series never reaches 8 billion — got up to ${last.population.toLocaleString()}`);
  console.log(`crossed 8 billion in ${eightBillion.year} (${eightBillion.population.toLocaleString()})`);

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
    stopAt: join(HERE, ".."),
  });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);

  const { pngPath } = await renderStill({
    element: createElement(WorldPopulationArea, {
      data,
      title: `World population passed 8 billion in ${eightBillion.year} — more than eight times its 1800 level`,
      limits: "1800-1949 are HYDE/Gapminder historical estimates, not census counts; 1950 onward is the UN's own recorded and revised series.",
      source: "Source: HYDE (2023), Gapminder (2022) & UN World Population Prospects (2024), via Our World in Data · extracted 8 August 2026",
      alt: `Area chart of world population from 1800 to 2023, rising from about 1 billion to about 8.1 billion, passing 8 billion in ${eightBillion.year}, with the growth rate visibly steepening through the 20th century.`,
      ground,
      accent,
      crossing: { year: crossing.year, population: crossing.population, label: `1 billion (${crossing.year})` },
    }),
    width: 900,
    height: 560,
    outDir: HERE,
    name: "static-world-population-still",
  });
  console.log(`rendered -> ${pngPath}`);
}

main();
