// twin/proof/static-income-life-expectancy/render.mjs
//
// Reads the frozen CSV (165 countries, 2021, life expectancy + GDP per capita), and renders the
// scatter. Usage: bun render.mjs

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
import {
  TYPE,
  IncomeLifeExpectancyScatter,
  rungsFor,
} from "./IncomeLifeExpectancyScatter.tsx";

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

  const points = rows.map((r) => ({
    country: r.Entity,
    gdpPerCapita: Number(r["GDP per capita"]),
    lifeExpectancy: Number(r["Life expectancy at birth"]),
  }));
  if (points.length !== 165) throw new Error(`expected 165 countries, got ${points.length}`);

  // Sanity check learned the hard way tonight: 2022 has a Central African Republic reading of
  // 18.8 years, wildly inconsistent with its own neighbouring years (40.3 in 2021, 57.4 in 2023) —
  // a data artefact, not a real one-year collapse. 2021 has no reading below 35 across all 165
  // countries; this beat uses 2021 for exactly that reason.
  const min = Math.min(...points.map((p) => p.lifeExpectancy));
  if (min < 35) throw new Error(`a life expectancy reading under 35 looks like a data artefact, got ${min}`);

  const byGdp = [...points].sort((a, b) => a.gdpPerCapita - b.gdpPerCapita);
  console.log(`lowest GDP: ${byGdp[0].country} $${byGdp[0].gdpPerCapita.toFixed(0)}`);
  console.log(`highest GDP: ${byGdp[byGdp.length - 1].country} $${byGdp[byGdp.length - 1].gdpPerCapita.toFixed(0)}`);

  // The alt text's "$30,000 to $140,000" band and its life-expectancy range were hand-typed — a
  // render audit caught the range wrong ("roughly 76 to 85 years" when the band's own low end,
  // Seychelles at 71.2, sits well below 76). Both the band bounds and the range now come from the
  // same points array the chart plots, not retyped numbers.
  // The title stated the band's low end as its own literal, beside the constant that defines it —
  // move the band and the headline would have kept naming the old figure. Both now read `usd`.
  const HIGH_INCOME_LO = 30000;
  const HIGH_INCOME_HI = 140000;
  const usd = (v) => `$${v.toLocaleString("en-US")}`;
  const highIncome = points.filter(
    (p) => p.gdpPerCapita >= HIGH_INCOME_LO && p.gdpPerCapita <= HIGH_INCOME_HI,
  );
  const highIncomeLifeMin = Math.min(...highIncome.map((p) => p.lifeExpectancy));
  const highIncomeLifeMax = Math.max(...highIncome.map((p) => p.lifeExpectancy));
  console.log(
    `$${HIGH_INCOME_LO}-$${HIGH_INCOME_HI}: ${highIncome.length} countries, life expectancy ${highIncomeLifeMin.toFixed(1)}-${highIncomeLifeMax.toFixed(1)}`,
  );

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
    stopAt: join(HERE, ".."),
  });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);
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
  const name = flag === -1 ? "static-income-life-expectancy-still" : `static-income-life-expectancy-${size}`;
  if (flag !== -1)
    console.log(`LOOKING at ${size}; the pinned size stays ${pinned} -> ${outDir}`);
  // …and whether this TYPE may enter that size at all.
  const form = assertTypeMayEnter(TYPE, size, { what: "static-income-life-expectancy" });
  console.log(`pinned size: ${size} — ${form.verdict}: ${form.reason}`);
  const rungs = rungsFor(size);
  console.log(
    rungs.length
      ? `removal ladder at ${size}: ${rungs.join("; ")}`
      : `removal ladder at ${size}: no rung fires`,
  );

  const { width, height } = sizeFor(size);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(IncomeLifeExpectancyScatter, {
      points,
      title: `Beyond roughly ${usd(HIGH_INCOME_LO)} a person, extra income buys far less extra life expectancy`,
      limits: "165 countries with both measures in 2021. Correlation, not causation — health systems, conflict and disease all move independently of income too.",
      source: "Source: World Bank via Gapminder, UN WPP (2024), via Our World in Data · 2021 data, extracted 8 August 2026",
      alt: `Scatter plot of GDP per capita (log scale) against life expectancy at birth for 165 countries in 2021. Life expectancy rises steeply as income rises from a few hundred to about ten thousand dollars, then the slope flattens: from about ${usd(HIGH_INCOME_LO)} to ${usd(HIGH_INCOME_HI)} a person, life expectancy still varies, but across a narrower band, roughly ${highIncomeLifeMin.toFixed(0)} to ${highIncomeLifeMax.toFixed(0)} years.`,
      ground,
      accent,
      highlighted: [],
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
  assertTypeFloor(svg, size, { what: "static-income-life-expectancy" });
  assertWithinStage(svg, size, { what: "static-income-life-expectancy" });
  console.log(`rendered -> ${pngPath} at ${width}x${height}, verified from the file — now open it and look at it.`);
}

main();
