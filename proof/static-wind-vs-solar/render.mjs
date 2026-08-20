// twin/proof/static-wind-vs-solar/render.mjs
//
// This beat's own runner: reads the frozen CSV, computes wind/solar share of each country's 2024
// electricity generation, and hands the numbers to WindVsSolarBar. Usage: bun render.mjs

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import {
  renderStill,
  readPalette,
  seriesInks,
} from "#shared/chart-beat/render-still.mjs";
import {
  assertDeliveredSize,
  assertTypeFloor,
  assertWithinStage,
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/chart-beat/sizes.mjs";
import { assertTypeMayEnter } from "#shared/chart-beat/type-at-size.mjs";
import { TYPE, WindVsSolarBar, rungsFor } from "./WindVsSolarBar.tsx";

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

const COLUMNS = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower", "Nuclear", "Gas", "Oil", "Coal"];

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

  const LAST_YEAR = String(Math.max(...rows.map((r) => Number(r.Year))));
  const y2024 = rows.filter((r) => r.Year === LAST_YEAR);
  if (y2024.length !== 6) throw new Error(`expected 6 countries for ${LAST_YEAR}, got ${y2024.length}`);

  const groups = y2024
    .map((r) => {
      const total = COLUMNS.reduce((sum, c) => sum + Number(r[c]), 0);
      return {
        name: r.Entity,
        wind: (Number(r.Wind) / total) * 100,
        solar: (Number(r.Solar) / total) * 100,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  console.table(groups.map((g) => ({ country: g.name, wind: g.wind.toFixed(2), solar: g.solar.toFixed(2) })));

  // The whole beat rests on there being exactly ONE country where solar beats wind, and the alt
  // text stated that country's two shares as literals beside the array that computes them. Both
  // the outlier and its figures are now found in the data, and the beat refuses to draw itself if
  // the "only reversal" claim stops holding.
  const reversals = groups.filter((g) => g.solar > g.wind);
  if (reversals.length !== 1)
    throw new Error(`this beat's claim needs exactly one country where solar beats wind, found ${reversals.length}: ${reversals.map((g) => g.name).join(", ")}`);
  const outlier = reversals[0];
  const rest = groups.filter((g) => g !== outlier).map((g) => g.name);
  const restList = `${rest.slice(0, -1).join(", ")} and ${rest[rest.length - 1]}`;
  const alt =
    `Grouped bar chart of wind and solar shares of ${LAST_YEAR} electricity generation for ` +
    `${groups.length} countries. In ${restList}, wind's share is larger than solar's. ` +
    `${outlier.name} is the reverse: solar ${outlier.solar.toFixed(1)}%, wind ${outlier.wind.toFixed(1)}%.`;
  console.log(`alt: ${alt}`);

  const palette = readPalette(HERE, { stopAt: join(HERE, "..") });
  const { ground, accent, origin, source: paletteSource } = palette;
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);
  // One ink per series, in the order the accents were recorded: wind first, solar second.
  const [windInk, solarInk] = seriesInks(palette, 2);
  console.log(`bar inks — wind ${windInk}, solar ${solarInk}`);

  // THE JOURNALIST'S DECISION, READ RATHER THAN RETYPED. Gate 2c pins a size; this beat records it
  // in its own `BRIEF.md` front matter; `readPinnedSize` throws naming every path it looked at if
  // it is missing. Before this, the size was two literals below and `renderStill` compared them
  // against each other — so `size: portrait` on the slot produced an 1800x1120 PNG in silence.
  const pinned = await readPinnedSize(HERE, { readFile, dirname, join });
  // `--size <name>` renders one of the OTHER two, into `sizes/`, so all three can be opened and
  // compared. It is deliberately not a way to change what this beat DELIVERS.
  const flag = process.argv.indexOf("--size");
  const size = flag === -1 ? pinned : process.argv[flag + 1];
  const outDir = flag === -1 ? HERE : join(HERE, "sizes");
  const name =
    flag === -1 ? "static-wind-vs-solar-still" : `static-wind-vs-solar-${size}`;
  if (flag !== -1)
    console.log(`LOOKING at ${size}; the pinned size stays ${pinned} -> ${outDir}`);
  // …and whether this TYPE may enter that size at all. A grouped bar's category axis is NOMINAL, so
  // it has a twin FORM rather than an aspect range: rows running down the frame, every country name
  // horizontal on one line (`proof/portrait-aspect-probe/PORTRAIT-VERDICT.md`, arm C).
  const form = assertTypeMayEnter(TYPE, size, { what: "static-wind-vs-solar" });
  console.log(`pinned size: ${size} — ${form.verdict}: ${form.reason}`);
  const rungs = rungsFor(size);
  console.log(
    rungs.length
      ? `removal ladder at ${size}: ${rungs.join("; ")}`
      : `removal ladder at ${size}: no rung fires`,
  );

  const { width, height } = sizeFor(size);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(WindVsSolarBar, {
      groups,
      title: `${outlier.name} is the outlier: everywhere else here, wind beats solar`,
      limits: `Share of each country's total electricity generation in ${LAST_YEAR}, from generation by source in terawatt-hours.`,
      source: "Source: Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024 generation, extracted 8 August 2026",
      alt,
      ground,
      windInk,
      solarInk,
      calloutSubject: outlier.name,
      calloutText: "Solar leads wind here — the only reversal in this group",
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
  assertTypeFloor(svg, size, { what: "static-wind-vs-solar" });
  assertWithinStage(svg, size, { what: "static-wind-vs-solar" });
  console.log(`rendered -> ${pngPath} at ${width}x${height}, verified from the file`);
}

main();
