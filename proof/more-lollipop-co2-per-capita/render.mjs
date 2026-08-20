// twin/proof/more-lollipop-co2-per-capita/render.mjs
//
// Reads the frozen CSV (15 European countries, 2024, CO2 emissions per capita) and renders the
// lollipop. Usage: bun render.mjs

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill, readPalette } from "#shared/chart-beat/render-still.mjs";
import {
  assertDeliveredSize,
  assertTypeFloor,
  assertWithinStage,
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/chart-beat/sizes.mjs";
import { assertTypeMayEnter } from "#shared/chart-beat/type-at-size.mjs";
import { LollipopCo2 } from "./LollipopCo2.tsx";

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

const EXPECTED_COUNTRIES = [
  "Austria",
  "Belgium",
  "Denmark",
  "France",
  "Germany",
  "Greece",
  "Italy",
  "Netherlands",
  "Norway",
  "Poland",
  "Portugal",
  "Spain",
  "Sweden",
  "Switzerland",
  "United Kingdom",
];

function parseCsv(text) {
  const [header, ...rows] = parseCsvRows(text.trim());
  const cols = header;
  return rows
    .filter((row) => row.length > 0)
    .map((row) => {
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

  // The OWID grapher CSV endpoint silently returns the ENTIRE global dataset with HTTP 200
  // unless `&csvType=filtered` is present — verify the fetch actually filtered, by eye, rather
  // than trusting the URL parameter did what it looked like it did
  // (`intake/references/ourworldindata-csv-filter-trap.md`).
  const distinctCountries = [...new Set(rows.map((r) => r.Entity))].sort();
  console.log(`distinct Entity values (${distinctCountries.length}): ${distinctCountries.join(", ")}`);
  const expectedSorted = [...EXPECTED_COUNTRIES].sort();
  if (JSON.stringify(distinctCountries) !== JSON.stringify(expectedSorted)) {
    throw new Error(
      `expected exactly the 15 requested countries, got ${distinctCountries.length}: ${distinctCountries.join(", ")}`,
    );
  }

  // 2024 is the year every one of these 15 countries actually carries in this dataset — verified
  // per-country below, rather than assumed and silently backfilled with an earlier year for
  // whichever country happened to be missing it.
  const rows2024 = rows.filter((r) => r.Year === "2024");
  console.log(`2024 rows: ${rows2024.length}`);
  const missing2024 = EXPECTED_COUNTRIES.filter(
    (c) => !rows2024.some((r) => r.Entity === c),
  );
  if (missing2024.length > 0) {
    throw new Error(`missing a 2024 reading for: ${missing2024.join(", ")}`);
  }

  const data = rows2024.map((r) => ({
    country: r.Entity,
    value: Number(r["CO₂ emissions per capita"]),
  }));

  // Sanity check every 2024 reading against its own country's nearby years — a number that jumps
  // implausibly against its own recent history is a parsing bug, not a fact about the world.
  for (const d of data) {
    const history = rows
      .filter((r) => r.Entity === d.country && Number(r.Year) >= 2018 && Number(r.Year) <= 2023)
      .map((r) => Number(r["CO₂ emissions per capita"]))
      .sort((a, b) => a - b);
    const nearMin = history[0];
    const nearMax = history[history.length - 1];
    // A generous band: 2024 should not be less than half the recent minimum nor more than double
    // the recent maximum — real per-capita emissions do not move that fast year over year.
    if (d.value < nearMin * 0.5 || d.value > nearMax * 2) {
      throw new Error(
        `${d.country} 2024 value ${d.value} looks implausible against 2018-2023 range ${nearMin}-${nearMax}`,
      );
    }
  }
  console.log("all 15 2024 readings passed the nearby-years sanity check");

  // The actual 2024 ranking, computed here — not assumed — and the sort a lollipop's default
  // reading order asks for (`references/types/lollipop.md`, "What the drawing actually needs").
  const sorted = [...data].sort((a, b) => b.value - a.value);
  console.table(sorted.map((d) => ({ country: d.country, value: d.value.toFixed(4) })));

  const subject = "Switzerland";
  const subjectRank = sorted.findIndex((d) => d.country === subject) + 1;
  const subjectRow = sorted[subjectRank - 1];
  const rankFromBottom = sorted.length - subjectRank + 1;
  const highest = sorted[0];
  console.log(
    `${subject}: rank ${subjectRank} of ${sorted.length} (${rankFromBottom}${ordinalSuffix(rankFromBottom)}-lowest), ${subjectRow.value.toFixed(4)} t`,
  );
  console.log(`highest: ${highest.country}, ${highest.value.toFixed(4)} t`);
  console.log(
    `${subject} is ${(subjectRow.value / highest.value * 100).toFixed(1)}% of ${highest.country}'s value (less than half: ${subjectRow.value < highest.value / 2})`,
  );

  const claim = `Switzerland's 2024 per-capita CO₂ emissions were the ${rankFromBottom}${ordinalSuffix(rankFromBottom)}-lowest of these 15 European countries, at ${subjectRow.value.toFixed(1)} tonnes — less than half of ${highest.country}'s ${highest.value.toFixed(1)} tonnes.`;
  console.log(`claim: ${claim}`);

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
    stopAt: join(HERE, ".."),
  });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);

  // THE JOURNALIST'S DECISION, READ RATHER THAN RETYPED. Gate 2c pins a size; this beat records it
  // in its own `BRIEF.md` front matter; `readPinnedSize` throws naming every path it looked at if
  // it is missing. Before this, the size was two literals below and one more inside the component,
  // and `renderStill` compared two of them against each other — so `size: portrait` on the slot
  // produced this beat's own 900x800 landscape frame, rasterised to 1800x1600, in silence.
  const pinned = await readPinnedSize(HERE, { readFile, dirname, join });
  // `--size <name>` renders one of the OTHER two, into `sizes/`, so all three can be opened and
  // compared. It is deliberately not a way to change what this beat DELIVERS.
  const flag = process.argv.indexOf("--size");
  const size = flag === -1 ? pinned : process.argv[flag + 1];
  const outDir = flag === -1 ? HERE : join(HERE, "sizes");
  const name =
    flag === -1
      ? "more-lollipop-co2-per-capita-still"
      : `more-lollipop-co2-per-capita-${size}`;
  if (flag !== -1)
    console.log(`LOOKING at ${size}; the pinned size stays ${pinned} -> ${outDir}`);
  // …and whether this TYPE may enter that size at all. A lollipop's category axis is NOMINAL, so it
  // is a band-scale type with a twin form — and this beat is already drawn in it, rows running down
  // the frame with every country name horizontal on one line. Rung R0 therefore costs it nothing,
  // and no aspect clamp applies. What a tall frame costs it is ROWS, which the component refuses.
  const form = assertTypeMayEnter("lollipop", size, {
    what: "more-lollipop-co2-per-capita",
  });
  console.log(`pinned size: ${size} — ${form.verdict}: ${form.reason}`);

  const { width, height } = sizeFor(size);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(LollipopCo2, {
      rows: sorted,
      title: claim,
      source:
        "Source: Global Carbon Budget 2025, via Our World in Data · 2024 data, extracted 8 August 2026",
      alt: `Lollipop chart ranking 2024 per-capita CO2 emissions across 15 European countries, highest to lowest. ${highest.country} is highest at ${highest.value.toFixed(1)} tonnes per capita. Switzerland, highlighted, is ${rankFromBottom}${ordinalSuffix(rankFromBottom)}-lowest at ${subjectRow.value.toFixed(1)} tonnes.`,
      ground,
      accent,
      subject,
      size,
    }),
    width,
    height,
    // 1:1 — the frame IS the export size, so the PNG on disk measures what gate 2c pinned. The
    // default 2 belongs to the frames that have not moved to the table yet.
    scale: 1,
    outDir,
    name,
  });

  // THE DELIVERED FILE, MEASURED FROM ITS OWN BYTES. Not the element, not the arguments — the PNG
  // on disk. It is the one reading the code that wrote it cannot make agree with itself.
  assertDeliveredSize(readPngSize(await readFile(pngPath)), size, {
    what: `${pngPath}`,
  });
  const svg = await readFile(svgPath, "utf8");
  assertTypeFloor(svg, size, { what: "more-lollipop-co2-per-capita" });
  assertWithinStage(svg, size, { what: "more-lollipop-co2-per-capita" });
  console.log(`rendered -> ${pngPath} at ${width}x${height}, verified from the file`);
}

function ordinalSuffix(n) {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

main();
