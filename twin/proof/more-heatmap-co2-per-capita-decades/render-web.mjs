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
  DESKTOP_LAYOUT,
  LAYOUTS,
  NARROW_LAYOUT,
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

/** Every type size a layout declares, in one list — so a role added later is measured too. */
function declaredTypeSizes(layout) {
  return Object.values(layout)
    .filter((v) => v && typeof v === "object" && typeof v.fontSize === "number")
    .map((v) => v.fontSize);
}

/**
 * THE RUNG BOUNDARY IS DERIVED, NOT PICKED — and the step in type size across it is a property of
 * the two-rung pattern, not a defect in where the boundary sits. Both halves matter; read them
 * together before moving anything here.
 *
 * THE BOUNDARY. Both rungs are ONE SVG scaled to the column, so every type size in a rung is
 * multiplied by (column width / that rung's own design width), and a rung shown below its own
 * legibility floor prints type nobody can read. The floor is 9px — the smallest size the narrow
 * layout declares at its own design width. The desktop rung's smallest declared type is 12px, so it
 * may be scaled to 9/12 = 0.75 and no further: 900 x 0.75 = 675px of column. At the 480px this file
 * used to carry, the desktop rung was still on screen at scale 0.5344 — measured in Chrome at a
 * 481px viewport: title 12.83px, source 6.95px, legend 6.41px, all below the floor and the smallest
 * barely half. That move was right and is not in question.
 *
 * THE STEP ACROSS THE SEAM, and why moving the boundary can never close it. A rung's rendered type
 * is a FIXED FRACTION of the column: the smallest role is 9/375 = 0.0240 narrow against 12/900 =
 * 0.0133 desktop, the title 16/375 = 0.0427 against 24/900 = 0.0267. Those fractions do not depend
 * on the column, so the step at the seam is their RATIO — 1.80x for the floor role, 1.60x for the
 * title — **at every possible boundary**. Moving the boundary moves both sides together and leaves
 * the ratio untouched. Measured in Chrome on both files rather than argued: pre-repair, seam at
 * 480/481, title 20.48 -> 12.83 (1.596x); post-repair, seam at 675/676, title 28.80 -> 18.03
 * (1.597x). The same step, in the same direction, before and after. What the move changed is the
 * absolute sizes — nothing now renders under 9px, where 6.41px used to.
 *
 * A THIRD RUNG DOES NOT HELP, for the same arithmetic. Two rungs meet without a step only if they
 * declare the same type-to-width fraction; a rung with the desktop rung's fraction hits the 9px
 * floor at exactly the same column width the desktop rung does, so it can cover nothing new. To
 * live below 675 a rung MUST carry a larger fraction — which is the step. The boundary exists
 * precisely because the fraction has to change; a seam without a step is a contradiction in terms
 * in this pattern.
 *
 * THE FIX THAT WAS TRIED AND REJECTED, so nobody spends the afternoon on it again. Capping the
 * narrow rung at its own design width (`max-width: 375px`, the symmetry the desktop rung already
 * has at 900) does close the seam almost exactly — measured: title 16.00 -> 18.03, +12.7% and
 * upward as the window widens, floor role 9.00 -> 9.01, 0 collisions and no horizontal scroll at
 * 375/430/480/600/674/675/676/700/800/900/1200. It was reverted after LOOKING at it: from 375px to
 * 675px the graphic then sits in a 375px column with up to 300px of the window empty beside it,
 * which is a permanent layout defect on every tablet and every half-width desktop window, traded
 * for a jolt a reader only ever sees while dragging a window edge. `web-discipline.md` names that
 * empty space as its own failure mode. The real answer is the fluid seed — words as HTML at a fixed
 * px size over a geometry-only SVG, where nothing type-related scales with the column — and
 * retrofitting the eleven web chart beats onto it is a known open item, not a seam repair.
 */
function rungBoundary(desktop, narrow) {
  const floorPx = Math.min(...declaredTypeSizes(narrow));
  const desktopFloorScale = floorPx / Math.min(...declaredTypeSizes(desktop));
  if (desktopFloorScale >= 1)
    throw new Error(
      `the desktop rung is already at or below the ${floorPx}px floor at its own design width`,
    );
  return {
    breakpointPx: Math.round(desktop.width * desktopFloorScale),
    desktopCapPx: desktop.width,
  };
}

function buildCss({ ink, muted, grid }) {
  const { breakpointPx, desktopCapPx } = rungBoundary(DESKTOP_LAYOUT, NARROW_LAYOUT);
  return `
:root { --ink: ${ink}; --muted: ${muted}; --grid: ${grid}; }
* { box-sizing: border-box; }
body { margin: 0; background: #FFFFFF; font-family: Helvetica, Arial, sans-serif; }
.chart-figure { margin: 0; max-width: ${desktopCapPx}px; }
svg.chart { display: block; width: 100%; height: auto; }
svg.chart[data-layout="narrow"] { display: none; }
/* The boundary is derived from the two rungs' own declared type — see rungBoundary() in
   render-web.mjs for the arithmetic, and for why the step in type size across this line is a
   property of the two-rung pattern that moving the line cannot close. */
@media (max-width: ${breakpointPx}px) {
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
