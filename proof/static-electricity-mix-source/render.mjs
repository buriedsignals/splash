// twin/proof/static-electricity-mix-source/render.mjs
//
// Reads the frozen CSV (6 countries, 2024 generation by source, TWh), computes each country's
// renewables/nuclear/fossil share of its own total, and hands the shares to ElectricityMixStack.
// Usage: bun render.mjs

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
import { TYPE, ElectricityMixStack, rungsFor } from "./ElectricityMixStack.tsx";

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

const RENEWABLE_COLUMNS = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower"];
const FOSSIL_COLUMNS = ["Gas", "Oil", "Coal"];

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
  if (rows.length !== 6) throw new Error(`expected 6 countries, got ${rows.length}`);

  const countries = rows
    .map((r) => {
      const renewables = RENEWABLE_COLUMNS.reduce((sum, c) => sum + Number(r[c]), 0);
      const fossil = FOSSIL_COLUMNS.reduce((sum, c) => sum + Number(r[c]), 0);
      const nuclear = Number(r.Nuclear);
      const total = renewables + fossil + nuclear;
      return {
        name: r.Entity,
        renewables: (renewables / total) * 100,
        nuclear: (nuclear / total) * 100,
        fossil: (fossil / total) * 100,
      };
    })
    .sort((a, b) => b.renewables - a.renewables);

  console.table(countries.map((c) => ({ country: c.name, renewables: c.renewables.toFixed(1), nuclear: c.nuclear.toFixed(1), fossil: c.fossil.toFixed(1) })));

  // The year is a claim like any other, so it is read off the rows rather than retyped, and the
  // file has to agree with itself before anything is drawn.
  const years = [...new Set(rows.map((r) => r.Year))];
  if (years.length !== 1) throw new Error(`expected a single year in data.csv, got ${years.join(", ")}`);
  const YEAR = years[0];

  // Every share the alt and the title state comes off `countries` — the same array the columns are
  // drawn from — including which country leads on renewables and which on fossil fuel. Typed, they
  // would keep their wording after a row changed and the columns moved underneath them.
  const pct = (v) => `${Math.round(v)}%`;
  const mostRenewable = countries[0];
  const mostFossil = [...countries].sort((a, b) => b.fossil - a.fossil)[0];
  const alt =
    // grounded-by-hand: limits:100 — "100%-stacked" names the chart's construction (every column is
    // normalised to its own total), not a reading from data.csv. The shares themselves are all
    // interpolated below.
    `100%-stacked bar chart of ${countries.length} countries' ${YEAR} electricity generation by ` +
    `renewables, nuclear and fossil fuel: ` +
    countries
      .map((c) => `${c.name} ${pct(c.renewables)} renewable, ${pct(c.nuclear)} nuclear, ${pct(c.fossil)} fossil`)
      .join("; ") +
    `. ${mostRenewable.name} has the highest renewable share of the ${countries.length}, ` +
    `${mostFossil.name} the highest fossil share.`;
  console.log(`alt: ${alt}`);

  const palette = readPalette(HERE, { stopAt: join(HERE, "..") });
  const { ground, accent, origin, source: paletteSource } = palette;
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);
  // One fill per stacked series, in the bottom-to-top order the columns are drawn in — which is
  // the order the accents were recorded.
  const [renewablesFill, nuclearFill, fossilFill] = seriesInks(palette, 3);
  const fills = {
    renewables: renewablesFill,
    nuclear: nuclearFill,
    fossil: fossilFill,
  };
  console.log(
    `segment fills — renewables ${fills.renewables}, nuclear ${fills.nuclear}, fossil ${fills.fossil}`,
  );
  // THE JOURNALIST'S DECISION, READ RATHER THAN RETYPED. Gate 2c pins a size; this beat records it
  // in its own `BRIEF.md` front matter; `readPinnedSize` throws naming every path it looked at if
  // it is missing. Before this the size was two literals below and `renderStill` compared them
  // against each other, so they agreed by construction and the delivered PNG was a size nobody
  // chose.
  const pinned = await readPinnedSize(HERE, { readFile, dirname, join });
  // `--size <name>` renders one of the OTHER two into `sizes/`, so all three can be opened and
  // compared. It is deliberately not a way to change what this beat DELIVERS.
  const flag = process.argv.indexOf("--size");
  const size = flag === -1 ? pinned : process.argv[flag + 1];
  const outDir = flag === -1 ? HERE : join(HERE, "sizes");
  const name = flag === -1 ? "static-electricity-mix-source-still" : `static-electricity-mix-source-${size}`;
  if (flag !== -1)
    console.log(`LOOKING at ${size}; the pinned size stays ${pinned} -> ${outDir}`);
  // …and whether this TYPE may enter that size at all.
  const form = assertTypeMayEnter(TYPE, size, { what: "static-electricity-mix-source" });
  console.log(`pinned size: ${size} — ${form.verdict}: ${form.reason}`);
  const rungs = rungsFor(size);
  console.log(
    rungs.length
      ? `removal ladder at ${size}: ${rungs.join("; ")}`
      : `removal ladder at ${size}: no rung fires`,
  );

  const { width, height } = sizeFor(size);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(ElectricityMixStack, {
      countries,
      title: `${mostRenewable.name} ran its grid on ${pct(mostRenewable.renewables)} renewables in ${YEAR} — ${mostFossil.name} leaned on fossil fuel`,
      // grounded-by-hand: alt:100 — "100% of that country's own generation" states how the columns are
      // normalised; it is the chart's construction, not a value read from data.csv.
      limits: `Each column is 100% of that country's own ${YEAR} electricity generation; totals in TWh differ a lot between them.`,
      source: "Source: Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024 generation, extracted 8 August 2026",
      alt,
      ground,
      fills,
      size,
    }),
    width,
    height,
    // 1:1 — the frame IS the export size, so the PNG on disk measures what gate 2c pinned.
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
  console.log(`ladder in the artifact: ${/data-ladder="([^"]*)"/.exec(svg)?.[1] ?? "(absent)"}`);
  assertTypeFloor(svg, size, { what: "static-electricity-mix-source" });
  assertWithinStage(svg, size, { what: "static-electricity-mix-source" });
  console.log(`rendered -> ${pngPath} at ${width}x${height}, verified from the file — now open it and look at it.`);
}

main();
