// twin/proof/more-line-swiss-life-expectancy/render.mjs
//
// Reads the frozen CSV (Switzerland, life expectancy at birth, full history as fetched from Our
// World in Data) and renders the 1950-2023 line. Usage: bun render.mjs

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
import { LifeExpectancyLine } from "./LifeExpectancyLine.tsx";

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
  console.log(`fetched: ${rows.length} rows from data.csv`);

  // The OWID grapher CSV endpoint silently returns the entire global dataset unless
  // `csvType=filtered` is on the URL (`intake/references/ourworldindata-csv-filter-trap.md`)
  // — checked here, not assumed, by looking at the actual distinct values the fetch returned.
  const entities = [...new Set(rows.map((r) => r.Entity))];
  if (entities.length !== 1 || entities[0] !== "Switzerland") {
    throw new Error(
      `expected every row's Entity to read "Switzerland" and nothing else, got: ${entities.join(", ")}`,
    );
  }
  console.log(`entity check: every row is "${entities[0]}"`);

  // Filtered here, in the script, on the fetched CSV — not by hand-editing data.csv, which stays
  // the full fetch.
  const readings = rows
    .map((r) => ({ year: Number(r.Year), value: Number(r["Life expectancy"]) }))
    .filter((r) => r.year >= 1950)
    .sort((a, b) => a.year - b.year);
  console.log(`filtered to year >= 1950: ${readings.length} readings`);
  if (readings.length !== 74)
    throw new Error(`expected 74 readings (1950-2023), got ${readings.length}`);

  const first = readings[0];
  const last = readings[readings.length - 1];
  if (first.year !== 1950 || last.year !== 2023)
    throw new Error(`expected span 1950-2023, got ${first.year}-${last.year}`);

  const delta = last.value - first.value;
  console.log(
    `${first.year}: ${first.value} ${last.year > first.year ? "->" : ""} ${last.year}: ${last.value} (delta ${delta.toFixed(1)} years)`,
  );

  // Sanity check the two COVID-era dips the brief expects — real data, not excluded, but worth
  // printing so a defect would be visible in the console rather than silent in the render.
  const byYear = new Map(readings.map((r) => [r.year, r.value]));
  for (const dipYear of [2020, 2022]) {
    const before = byYear.get(dipYear - 1);
    const at = byYear.get(dipYear);
    console.log(
      `dip check ${dipYear}: ${before} -> ${at} (${at < before ? "dip" : "no dip"})`,
    );
  }

  // The year life expectancy first reaches 80, found by the script, not asserted from memory.
  const crossing = readings.find((r) => r.value >= 80);
  if (!crossing) throw new Error("readings never reach 80 — claim would be false");
  console.log(`first year >= 80: ${crossing.year} (${crossing.value})`);

  const claim = `Life expectancy in Switzerland rose by ${delta.toFixed(1)} years between ${first.year} and ${last.year}, from ${first.value.toFixed(1)} to ${last.value.toFixed(1)}, crossing 80 in ${crossing.year}.`;
  console.log(`claim: ${claim}`);

  const endLabel = `Switzerland ${last.value.toFixed(1)} (${last.year})`;

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
    stopAt: join(HERE, ".."),
  });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);

  // THE JOURNALIST'S DECISION, READ RATHER THAN RETYPED. Gate 2c pins a size; this beat records it
  // in its own `BRIEF.md` front matter; `readPinnedSize` throws naming every path it looked at if
  // it is missing.
  const pinned = await readPinnedSize(HERE, { readFile, dirname, join });
  // `--size <name>` renders one of the OTHER two, into `sizes/`, so all three can be opened and
  // compared. It is deliberately not a way to change what this beat DELIVERS.
  const flag = process.argv.indexOf("--size");
  const size = flag === -1 ? pinned : process.argv[flag + 1];
  const outDir = flag === -1 ? HERE : join(HERE, "sizes");
  const name =
    flag === -1
      ? "more-line-swiss-life-expectancy-still"
      : `more-line-swiss-life-expectancy-${size}`;
  if (flag !== -1)
    console.log(`LOOKING at ${size}; the pinned size stays ${pinned} -> ${outDir}`);
  // …and whether this TYPE may enter that size at all. A line's x is a CONTINUUM, so it has no twin
  // form to transpose into — rotating it would break the convention that time runs left to right.
  // What it has is a measured aspect range, and the component holds the plot inside it.
  const form = assertTypeMayEnter("line", size, {
    what: "more-line-swiss-life-expectancy",
  });
  console.log(`pinned size: ${size} — ${form.verdict}: ${form.reason}`);

  const { width, height } = sizeFor(size);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(LifeExpectancyLine, {
      readings,
      title: claim,
      source:
        "Source: UN, World Population Prospects (2024), via Our World in Data · Switzerland, 1950–2023, extracted 8 August 2026",
      alt: `Line chart of life expectancy at birth in Switzerland, 1950 to 2023. The line rises from ${first.value.toFixed(1)} years in ${first.year} to ${last.value.toFixed(1)} years in ${last.year}, a gain of ${delta.toFixed(1)} years, first crossing 80 years in ${crossing.year}. Two small real dips interrupt the climb around 2020 and 2022, the COVID-19 era.`,
      ground,
      accent,
      endLabel,
      size,
    }),
    width,
    height,
    // 1:1 — the frame IS the export size, so the PNG on disk measures what gate 2c pinned.
    scale: 1,
    outDir,
    name,
  });

  // THE DELIVERED FILE, MEASURED FROM ITS OWN BYTES. Not the element, not the arguments.
  assertDeliveredSize(readPngSize(await readFile(pngPath)), size, {
    what: `${pngPath}`,
  });
  const svg = await readFile(svgPath, "utf8");
  assertTypeFloor(svg, size, { what: "more-line-swiss-life-expectancy" });
  assertWithinStage(svg, size, { what: "more-line-swiss-life-expectancy" });
  console.log(`rendered -> ${pngPath} at ${width}x${height}, verified from the file`);
}

main();
