// twin/proof/more-heatmap-co2-per-capita-decades/render-web.mjs
//
// This beat's own WEB runner — the shape every other beat in this format uses: the story's own
// constants, the story's own CSV reader, the story's own component, handed to the skill's generic
// `renderWeb` (`skills/chart-web/scripts/render-web.mjs`).
//
// IT USED TO BE A SECOND COPY OF THAT FUNCTION, and that is the whole of B6.2. This file carried
// its own `buildCss` — with `.chart-figure { max-width: 900px }` and a `@media` rung boundary —
// because the component it drove was a two-rung, words-inside-the-SVG build that could not be
// widened without magnifying its own type. `Co2HeatmapWeb.tsx` is now on the format's fluid frame
// (geometry-only SVG, every word HTML at a fixed pixel size), so the second stylesheet, the second
// SSR loop, the cap and the media query all retire together and this runner is 100 lines shorter.
// The format's shared `buildCss` is the one that ships, which is what makes "fills its container"
// a property of the format rather than of this beat.
//
// After the skill's `renderWeb` writes the self-contained HTML, this runner does two story-owned
// repairs in place, the same two the bump beat's runner owns:
//
//   1. Appends this beat's OWN interaction script (`./interaction.mjs`) as a second inline
//      `<script>` — a grid of already-discrete cells needs no nearest-point-by-x resolution, and
//      the skill's own script (which runs first, finds no `.pt` circles, and is a harmless no-op)
//      is built for points strung along one line.
//   2. Appends this beat's own CSS: the column-header row ABOVE the plot (the format's shared
//      `.chart-plot` puts its axis row below), the legend row, and the in-cell value's own type.
//
// `renderWeb` hard-codes `<html lang="fr">`; this beat's words are English, so the runner patches
// it — a per-story fix, not a change to the skill, which takes no `lang` parameter.
//
// Usage: bun proof/more-heatmap-co2-per-capita-decades/render-web.mjs [outDir]

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readPalette,
  seriesInks,
} from "#shared/chart-beat/render-still.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { Co2HeatmapWeb, FRAME, checkRampFloor } from "./Co2HeatmapWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
// And the OUTPUT defaults beside the beat too — where this beat's html is actually committed. It
// used to default to a scratch directory, so running this script the obvious way produced a fresh
// file nobody looks at, printed a path, exited zero, and left the committed one stale.
const DEFAULT_OUT_DIR = HERE;
const OUTPUT_NAME = "co2-heatmap.html";

const PALETTE = readPalette(HERE, { stopAt: join(HERE, "..") });
console.log(
  "palette from " + PALETTE.source + " — ground " + PALETTE.ground +
    ", accent " + PALETTE.accent + ", chosen by " + PALETTE.origin,
);
const GROUND = PALETTE.ground;
/** The two poles of this beat's sequential ramp, in the order they were recorded: the pale end
 *  first, the deep end second. `seriesInks` hands back the recorded accents in written order, so
 *  the ramp a reader sees is the one the newsroom answered with. */
const [RAMP_LOW, RAMP_HIGH] = seriesInks(PALETTE, 2);
const RAMP = { low: RAMP_LOW, high: RAMP_HIGH };
console.log("ramp poles — pale " + RAMP.low + ", deep " + RAMP.high);
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

  checkRampFloor(GROUND, RAMP);

  const { outPath } = await renderWeb({
    component: Co2HeatmapWeb,
    props: {
      cells,
      countries,
      decades: DECADES,
      title: TITLE,
      source: SOURCE,
      limits: LIMITS,
      alt: ALT,
      ground: GROUND,
      frame: FRAME,
      ramp: RAMP,
    },
    outDir,
    name,
  });

  await repair(outPath);

  return { outPath, cells: cells.length, countries: countries.length };
}

/** The two in-place repairs this runner owns — see this file's header for why each is a story-level
 *  fix rather than a change to the skill's generic `renderWeb`. */
async function repair(outPath) {
  let html = await readFile(outPath, "utf8");

  html = html.replace('<html lang="fr">', '<html lang="en">');

  const interactionSource = await readFile(join(HERE, "interaction.mjs"), "utf8");
  if (!html.includes("</body>")) throw new Error("renderWeb output has no </body> to repair");
  html = html.replace("</body>", `<script>\n${interactionSource.replace(/^export /gm, "")}\n</script>\n</body>`);

  // This beat's own rules, after the format's shared stylesheet.
  //
  // THE COLUMN HEADERS SIT ABOVE THE GRID, which is the one structural departure a heatmap forces:
  // the format's shared `.chart-plot` is `grid-template-rows: 1fr var(--x-axis-h)` — an axis row
  // BELOW the geometry — and a matrix names its columns above them. The three track assignments
  // below re-point the same four children (`.y-axis`, `svg.chart`, `.overlay`, `.x-axis`) at the
  // flipped rows; nothing else about the shared grid changes, and the `%` positions the component
  // writes are unaffected because they are positions inside those children, not inside the grid.
  //
  // THE IN-CELL VALUE IS FURNITURE, so it does not stretch: a fixed pixel size, centred on its own
  // cell by the same `%` the geometry put the cell at. Whether there is room for it at a given
  // width is decided by the `@container` rule the component itself emits (see `cellValueFloorPx`),
  // never by anything written here.
  const ownCss = `
.heatmap-figure .chart-legend {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0 10px;
  font-size: var(--legend-size);
  color: var(--muted);
}
.heatmap-figure .legend-swatch { display: block; border: 1px solid var(--grid); }
.chart-plot.heatmap-plot {
  grid-template-columns: var(--y-gutter) 1fr;
  grid-template-rows: var(--x-axis-h) 1fr;
  min-height: var(--min-plot-h);
}
.heatmap-plot .x-axis { grid-column: 2; grid-row: 1; }
.heatmap-plot .y-axis { grid-column: 1; grid-row: 2; }
.heatmap-plot svg.chart { grid-column: 2; grid-row: 2; }
.heatmap-plot .overlay { grid-column: 2; grid-row: 2; }
/* The shared rule anchors an x label 6px BELOW its row; this one hangs from the row's bottom edge,
   because the row is above the grid it names. */
.heatmap-plot .axis-label.x { top: auto; bottom: 4px; transform: translateX(-50%); }
.heatmap-plot .axis-label.y { right: 10px; transform: translateY(-50%); }
.cell { cursor: pointer; }
.cell:hover, .cell:focus, .cell-active { outline: 2px solid var(--ink); outline-offset: -2px; }
.cell:focus-visible { outline: 2px solid var(--ink); outline-offset: -2px; }
.cell-value {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: var(--cell-value-size);
  font-weight: var(--cell-value-weight);
  white-space: nowrap;
}
`;
  if (!html.includes("</style>")) throw new Error("renderWeb output has no </style> to repair");
  html = html.replace("</style>", `${ownCss}</style>`);

  await writeFile(outPath, html);
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const positional = argv.find((a) => !a.startsWith("--"));
  const outDir = resolve(positional ?? DEFAULT_OUT_DIR);
  const dataPath = join(HERE, "data.csv");
  const { outPath, cells, countries } = await render({ dataPath, outDir });
  console.log(`web beat -> ${outPath}  [${cells} cells, ${countries} countries]`);
}
