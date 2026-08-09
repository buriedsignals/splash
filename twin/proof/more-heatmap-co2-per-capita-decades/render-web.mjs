// twin/proof/more-heatmap-co2-per-capita-decades/render-web.mjs
//
// This beat's own web runner. It does not call the `twin-chart-web` skill's generic `renderWeb`
// (`skills/twin-chart-web/scripts/render-web.mjs`), because that function hard-codes inlining the
// skill's own `assets/interaction.mjs` — a nearest-point-by-x model built for a line's small
// circles, not a grid of already-discrete cells (see `Co2HeatmapWeb.tsx`'s own doc-comment). This
// file follows the same SHAPE that function establishes (SSR one element per layout, derive
// furniture/measure in node, inline one interaction script, write one self-contained HTML file) —
// it is a legitimate second instance of the render ladder's third rung, not a reinvention of it.
//
// Usage: bun render-web.mjs [outDir]

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  deriveFurniture,
  measureText,
} from "#shared/twin-chart-beat/render-still.mjs";
import {
  Co2HeatmapWeb,
  LAYOUTS,
  checkRampFloor,
} from "./Co2HeatmapWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
// And the OUTPUT defaults beside the beat too — where this beat's html is actually committed. It
// used to default to a scratch directory, so running this script the obvious way produced a fresh
// file nobody looks at, printed a path, exited zero, and left the committed one stale.
const DEFAULT_OUT_DIR = HERE;
const OUTPUT_NAME = "co2-heatmap.html";

const GROUND = "#FFFFFF";
const DECADES = [1960, 1970, 1980, 1990, 2000, 2010, 2020];

function parseCsv(text) {
  const [header, ...rows] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  const eAt = cols.indexOf("Entity");
  const yAt = cols.indexOf("Year");
  const vAt = cols.findIndex((c) => c.startsWith("CO"));
  if (eAt < 0 || yAt < 0 || vAt < 0)
    throw new Error(`csv missing Entity/Year/CO2 column, got: ${header}`);
  return rows.map((row) => {
    const cells = row.split(",");
    return { entity: cells[eAt], year: Number(cells[yAt]), value: Number(cells[vAt]) };
  });
}

/** Average of each country's annual readings within a decade, and how many years the average is
 *  built from — the 2020s decade is a partial one (5 years, 2020-2024) and that partial-n is
 *  carried through to the beat, never silently presented as equivalent to a full decade. */
function decadeAverages(readings, countries, decades) {
  return countries.flatMap((country) =>
    decades.map((decade) => {
      const end = decade === 2020 ? 2024 : decade + 9;
      const inDecade = readings.filter(
        (r) => r.entity === country && r.year >= decade && r.year <= end,
      );
      if (inDecade.length === 0)
        throw new Error(`no readings for ${country} in the ${decade}s`);
      const value = inDecade.reduce((s, r) => s + r.value, 0) / inDecade.length;
      return { country, decade, years: inDecade.length, value };
    }),
  );
}

export async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const csv = await readFile(dataPath, "utf8");
  const readings = parseCsv(csv);

  const countriesInData = [...new Set(readings.map((r) => r.entity))].sort();
  if (countriesInData.length !== 8)
    throw new Error(
      `expected exactly 8 countries in the frozen CSV, got ${countriesInData.length}: ${countriesInData.join(", ")}`,
    );

  const cells = decadeAverages(readings, countriesInData, DECADES);

  // Row order: by the LATEST decade's value, ascending — lowest 2020s emitters at the top, so the
  // cluster of low emitters and the cluster of higher ones each read as a block
  // (`heatmap.md`: "ordered deliberately ... so real clusters read as blocks").
  const latest = new Map(
    cells.filter((c) => c.decade === 2020).map((c) => [c.country, c.value]),
  );
  const countries = [...countriesInData].sort(
    (a, b) => latest.get(a) - latest.get(b),
  );

  // Verify, don't assume: every country's 2020s reading is below its own historical peak decade —
  // this is what the beat's claim asserts, checked against the data actually parsed.
  for (const country of countries) {
    const rows = cells.filter((c) => c.country === country);
    const peak = rows.reduce((a, b) => (b.value > a.value ? b : a));
    const nowRow = rows.find((r) => r.decade === 2020);
    if (nowRow.value >= peak.value)
      throw new Error(
        `${country}: 2020s (${nowRow.value.toFixed(2)}) is not below its own peak decade ${peak.decade}s (${peak.value.toFixed(2)}) — claim would be false`,
      );
  }
  const under8 = cells.filter((c) => c.decade === 2020 && c.value >= 8);
  if (under8.length > 0)
    throw new Error(
      `claim says all eight countries are under 8t/capita in the 2020s, but ${under8.map((c) => c.country).join(", ")} are not`,
    );
  const highest2020s = cells
    .filter((c) => c.decade === 2020)
    .reduce((a, b) => (b.value > a.value ? b : a));
  const secondHighest2020s = cells
    .filter((c) => c.decade === 2020 && c.country !== highest2020s.country)
    .reduce((a, b) => (b.value > a.value ? b : a));
  console.log(
    `highest 2020s emitter: ${highest2020s.country} (${highest2020s.value.toFixed(2)}), next: ${secondHighest2020s.country} (${secondHighest2020s.value.toFixed(2)})`,
  );
  const lowestTwo = [...cells.filter((c) => c.decade === 2020)].sort(
    (a, b) => a.value - b.value,
  ).slice(0, 2);
  console.log(
    `lowest 2020s: ${lowestTwo.map((c) => `${c.country} ${c.value.toFixed(2)}`).join(", ")}`,
  );

  const TITLE =
    `Poland now emits more CO2 per person than Germany — every one of these eight countries has fallen from its own historical peak`;
  const SOURCE =
    "Source: Global Carbon Budget 2025, via Our World in Data · 1960-2024, extracted 8 August 2026";
  const LIMITS =
    "Decade averages of annual territorial emissions; the 2020s column averages 5 years (2020-2024), not 10 like every other column.";
  const ALT =
    `A heatmap of average per-capita CO2 emissions, eight European countries by decade, 1960s to 2020s. Every country is lower in the 2020s than at its own peak decade. Poland (7.8 t) and Germany (7.5 t) are the highest 2020s emitters; Sweden (3.6 t) and Switzerland (3.8 t) are the lowest.`;

  checkRampFloor(GROUND);

  const furniture = deriveFurniture(GROUND);
  const svgs = LAYOUTS.map((layout) =>
    renderToStaticMarkup(
      createElement(Co2HeatmapWeb, {
        cells,
        countries,
        decades: DECADES,
        title: TITLE,
        source: SOURCE,
        limits: LIMITS,
        alt: ALT,
        ground: GROUND,
        ...furniture,
        measure: measureText,
        layout,
      }),
    ),
  );

  const interactionSource = await readFile(join(HERE, "interaction.mjs"), "utf8");
  const inlineScript = interactionSource.replace(/^export /gm, "");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${TITLE}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${buildCss(furniture)}
</style>
</head>
<body>
<figure class="chart-figure">
${svgs.join("\n")}
</figure>
<div id="tooltip" role="status" aria-live="polite" hidden></div>
<script>
${inlineScript}
</script>
</body>
</html>
`;

  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, name);
  await writeFile(outPath, html);
  return { outPath, cells: cells.length, countries: countries.length };
}

function buildCss({ ink, muted, grid }) {
  return `
:root { --ink: ${ink}; --muted: ${muted}; --grid: ${grid}; }
* { box-sizing: border-box; }
body { margin: 0; background: #FFFFFF; font-family: Helvetica, Arial, sans-serif; }
.chart-figure { margin: 0; max-width: 900px; }
svg.chart { display: block; width: 100%; height: auto; }
svg.chart[data-layout="narrow"] { display: none; }
@media (max-width: 480px) {
  svg.chart[data-layout="desktop"] { display: none; }
  svg.chart[data-layout="narrow"] { display: block; }
}
.cell { cursor: pointer; }
.cell:hover, .cell:focus, .cell-active { outline: 2px solid var(--ink); outline-offset: -2px; }
.cell:focus-visible { outline: 2px solid var(--ink); outline-offset: -2px; }
#tooltip {
  position: fixed; max-width: 240px; padding: 6px 10px; font-size: 13px; line-height: 1.3;
  background: #FFFFFF; color: var(--ink); border: 1px solid var(--muted); border-radius: 3px;
  pointer-events: none; z-index: 10;
}
#tooltip[hidden] { display: none; }
`.trim();
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const positional = argv.find((a) => !a.startsWith("--"));
  const outDir = resolve(positional ?? DEFAULT_OUT_DIR);
  const dataPath = join(HERE, "data.csv");
  const { outPath, cells, countries } = await render({ dataPath, outDir });
  console.log(`web beat -> ${outPath}  [${cells} cells, ${countries} countries]`);
}
