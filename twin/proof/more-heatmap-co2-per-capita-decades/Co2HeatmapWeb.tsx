/**
 * Beat: per-capita CO₂ emissions, eight countries × seven decades (heatmap / matrix), web genre.
 *
 * Written fresh from `references/types/heatmap.md`'s own description — region-by-year is the
 * type sheet's own worked example of what this type is FOR, so this beat draws exactly that shape:
 * one categorical axis (country), one temporal axis (decade), one quantitative value (average
 * annual tonnes CO₂ per capita) encoded as cell colour.
 *
 * What the web genre adds here, honestly, per `web-discipline.md`'s "What hover reveals": each
 * cell prints its own ROUNDED value unconditionally wherever the cell has room for it (`heatmap.md`'s
 * own rule — "if exact numbers matter, put the value inside the cell too" — a coarse 56-cell grid
 * is exactly the case where the numbers ARE the story). Hover/focus adds the one thing the static
 * print can't hold without turning into 56 stacked sentences: a full, exact reading — country,
 * decade, precise value, and how many years the decade's average was built from (5 for the partial
 * 2020s, 10 for every other decade).
 *
 * MIGRATED TO THE FLUID FRAME, and this beat was the last one that had not been. It used to ship
 * TWO pre-rendered rungs — a 900px `DESKTOP_LAYOUT` and a 375px `NARROW_LAYOUT`, everything drawn as
 * `<text>` inside one scaled SVG — swapped by a `@media` query, under a `.chart-figure` capped at
 * `max-width: 900px`. The owner's report is the one sentence that kills that whole shape: **the
 * visual must take the full available width.** A rung is a cap by construction (an SVG whose words
 * are inside it cannot be widened without magnifying its type), so the repair is not moving the cap
 * — it is the seed's separation: the `<svg>` carries GEOMETRY ONLY (56 rects and one outline, no
 * `<text>` at all) under `preserveAspectRatio="none"`, and every word — title, caveat, source,
 * legend, the eight row headers, the seven column headers and the 56 in-cell values — is HTML at a
 * FIXED CSS pixel size, positioned in `%` over the same grid cell. Geometry stretches; type does
 * not. Both rungs, the media query and the cap are gone, and this file now renders ONCE.
 *
 * The long note the old file carried about "the step in type size across the seam" retires with the
 * seam: there is no boundary left to place, because nothing type-related scales with the column any
 * more. Its own closing sentence said so — *"the real answer is the fluid seed … retrofitting is a
 * known open item, not a seam repair."* This is that retrofit.
 *
 * THE ONE DECISION A HEATMAP FORCES THAT THE SEED DOES NOT FACE. An in-cell value is a fixed-size
 * word inside a stretching box, so below some plot width the word is wider than the cell that holds
 * it. That width is DERIVED here from the widest value string this beat actually prints, and the
 * values are hidden below it by one `@container` rule — the same mechanism `BumpWeb.tsx` uses for
 * its year ticks, and for the same reason: a de-collision decision belongs at the width it is taken
 * at, never baked once. Where the values go, the reading does not: every cell is still `tabIndex=0`
 * with its own `aria-label` and `data-detail`, so the exact figure is a Tab or a pointer away, and
 * the alt text carries the claim in full.
 *
 * `deriveFurniture`/`measureText` are not called here — `renderWeb` derives them once in node and
 * threads them in as props (`ink`/`muted`/`grid`/`measure`).
 */

import { scaleLinear } from "d3-scale";
import { contrast } from "#shared/twin-chart-beat/render-still.mjs";

export type Cell = {
  country: string;
  decade: number;
  years: number;
  value: number;
};

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

/** This genre's single fluid frame, in this beat's own shape. Declared here rather than imported
 *  from the skill's seed for the reason that file's own doc-comment gives: a compile-time-only type
 *  has no `#shared/*` vendoring path, and a relative import across the skill boundary hard-codes
 *  this dev repository's own directory layout. Duplicate, do not link. */
export type HeatmapFrame = {
  /** One cell's side in canonical SVG user units — proportions only, never a rendered pixel size
   *  and never a cap. */
  cellSize: number;
  /** The ground-coloured separation between two cells, in CSS PIXELS, drawn as a non-scaling stroke
   *  on each cell rather than as a gap in the geometry. The distinction is not cosmetic: a gap is
   *  geometry, and geometry stretches — under `preserveAspectRatio="none"` at 3440px a 4-unit gap
   *  rendered 27px wide horizontally against 5px vertically, so the grid read as seven columns with
   *  white alleys between them. Measured in the ultrawide render, then moved into the stroke, which
   *  `vectorEffect="non-scaling-stroke"` holds at the same pixel width in both axes at every
   *  stretch. */
  cellSeparatorPx: number;
  /** Fixed CSS pixel row ABOVE the plot, for the decade headers — a margin, not part of the
   *  viewBox. A heatmap's column headers sit above its grid, which is the one place this beat's own
   *  stylesheet departs from the genre's shared `.chart-plot` (whose axis row is below). */
  xAxisRowPx: number;
  /** Air between a row header and the first cell of its row. */
  gap: number;
  title: { fontSize: number; fontWeight: number };
  subtitle: { fontSize: number };
  source: { fontSize: number };
  axis: { fontSize: number };
  /** The value printed inside a cell. Its own measured width is what decides the plot width below
   *  which the values are dropped — see `cellValueFloorPx`. */
  cellValue: { fontSize: number; fontWeight: number };
  legend: { fontSize: number };
  /** The legend swatch's own fixed size in CSS pixels — furniture, so it does not stretch. */
  legendSwatch: { width: number; height: number };
  /** One row's own floor in CSS pixels: the plot's `min-height` is this times the number of
   *  countries, so eight rows never squeeze below a legible cell however short the window gets. */
  minRowPx: number;
};

export const FRAME: HeatmapFrame = {
  cellSize: 66,
  cellSeparatorPx: 2,
  xAxisRowPx: 22,
  gap: 10,
  title: { fontSize: 24, fontWeight: 700 },
  subtitle: { fontSize: 14 },
  source: { fontSize: 13 },
  axis: { fontSize: 13 },
  // 11px, not the 13px the desktop rung used and not the 9px the narrow rung used. Measured against
  // this beat's own widest value string at the narrowest plot this genre verifies at: at 13px the
  // values are wider than the cell that holds them on a phone and would be dropped there entirely;
  // at 11px they clear it with air to spare, and 11px is the floor this project's own mobile-first
  // probe settled on. Nothing in between was picked by eye.
  cellValue: { fontSize: 11, fontWeight: 600 },
  legend: { fontSize: 12 },
  legendSwatch: { width: 200, height: 12 },
  minRowPx: 20,
};

/** Sequential ramp, single-hue (`heatmap.md`'s own rule against a multi-hue "lively" gradient):
 *  channel-wise linear interpolation between a pale pole and a deep pole of ONE hue, so luminance
 *  moves in exactly one direction, start to finish — checked by the caller, not assumed, via
 *  `checkRampFloor` below.
 *
 *  Both poles arrive from the caller because they are the newsroom's recorded answer, read from
 *  `PALETTE.md` by the runner. Naming them here would put the answer back in the source, where no
 *  recorded choice reaches it — and this beat's whole quantitative channel is the ramp, so a colour
 *  named here is a chart that ignores the newsroom entirely.
 *
 *  The floor is why the pale pole is not a pale TINT: the obvious one (`#E3F2F0`) measured 1.15:1
 *  against a white ground and nearly vanished, caught by `checkRampFloor` at build time before it
 *  was ever looked at. The pale pole a caller records has to be the palest stop on its hue that
 *  still clears the 3:1 shape floor against the real ground. */
export type Ramp = { low: string; high: string };

function hexChannels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function mixHex(a: string, b: string, t: number): string {
  const ca = hexChannels(a);
  const cb = hexChannels(b);
  return (
    "#" +
    ca
      .map((v, i) =>
        Math.round(v + (cb[i] - v) * t)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

export function rampColour(t: number, ramp: Ramp): string {
  return mixHex(ramp.low, ramp.high, Math.max(0, Math.min(1, t)));
}

/** Every stop this beat actually draws must clear 3:1 against the page ground (the non-text
 *  contrast floor for a shape, `heatmap.md`'s accessibility trap) — checked at build time, not
 *  assumed, because a ramp "checked on paper" and never re-measured against the real ground is
 *  exactly how this type has shipped an invisible low end before. Throws loud rather than
 *  rendering a cell nobody could see against the ground. */
export function checkRampFloor(ground: string, ramp: Ramp, steps = 9): void {
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const c = contrast(rampColour(t, ramp), ground);
    if (c < 3) {
      throw new Error(
        `heatmap ramp stop at t=${t.toFixed(2)} (${rampColour(t, ramp)}) measures ${c.toFixed(2)}:1 against ground ${ground}, under the 3:1 shape floor`,
      );
    }
  }
}

/** Pure geometry: cells to rects on a country × decade grid, in canonical SVG user units whose
 *  origin is the grid's own top-left. The row-header gutter and the column-header row are CSS grid
 *  tracks around this rectangle, never padding baked into the `viewBox`. */
export function heatmapGeometry(
  cells: Cell[],
  countries: string[],
  decades: number[],
  frame: HeatmapFrame,
  ramp: Ramp,
) {
  const byKey = new Map(cells.map((c) => [`${c.country}|${c.decade}`, c]));
  const values = cells.map((c) => c.value);
  const domain = [Math.min(...values), Math.max(...values)] as [number, number];
  const t = scaleLinear().domain(domain).range([0, 1]);

  const grid = countries.flatMap((country, row) =>
    decades.map((decade, col) => {
      const cell = byKey.get(`${country}|${decade}`);
      if (!cell) throw new Error(`missing cell for ${country} / ${decade}s`);
      return {
        ...cell,
        row,
        col,
        x: col * frame.cellSize,
        y: row * frame.cellSize,
        fill: rampColour(t(cell.value), ramp),
      };
    }),
  );

  return {
    grid,
    domain,
    width: decades.length * frame.cellSize,
    height: countries.length * frame.cellSize,
  };
}

// English-language beat throughout (title, source, alt) — a decimal COMMA here would be a language
// leak in the furniture, `static-discipline.md`'s own named defect class ("a language leak in the
// furniture is a defect even when every number is right"). Plain decimal point.
function fr1(v: number): string {
  return v.toFixed(1);
}

/** A coordinate as a percentage of the box it was drawn in — what lets an HTML label sit exactly
 *  where the geometry put the cell it names, at any container width. */
function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

/**
 * THE PLOT WIDTH BELOW WHICH A FIXED-SIZE WORD IS WIDER THAN THE STRETCHING COLUMN IT SITS IN.
 *
 * A column's rendered width is `cellSize / gridWidth` of the plot's own width, because the geometry
 * stretches and nothing else in this component does. The word printed over it does NOT stretch, so
 * the two cross at exactly one width, and that width is arithmetic rather than judgement: the
 * widest string of that role, plus the air it needs either side, scaled back out to the plot.
 * Two roles use it — the in-cell value and the decade header — and both are decided by CSS at the
 * width it is true at, never baked once the way the pre-fluid build baked a whole rung.
 */
export function columnFloorPx(
  widestWordPx: number,
  airPx: number,
  gridWidth: number,
  frame: HeatmapFrame,
): number {
  return Math.ceil(((widestWordPx + airPx * 2) * gridWidth) / frame.cellSize);
}

/** The two container names the floors above are written against — declared on the two children that
 *  occupy the plot's own grid track (`.overlay` and `.x-axis`), so a query on either is a query on
 *  the exact width the arithmetic is expressed in. */
const CELL_CONTAINER = "heatmap-plot-area";
const HEADER_CONTAINER = "heatmap-header-row";

/**
 * Below `valueFloorPx` the in-cell values go: the reading is still one Tab or one pointer away on
 * every cell, and the alt text carries the claim, so what is lost is a convenience and not the
 * argument. Below `headerFloorPx` the decade headers SHORTEN rather than disappear — `1960s` becomes
 * `60s` — because a matrix whose columns are unnamed is not a matrix a reader can use, and both
 * forms are emitted server-side so the swap is a CSS `display` and never a script.
 */
export function fluidWordCss(
  valueFloorPx: number,
  headerFloorPx: number,
): string {
  return [
    `.heatmap-plot .overlay { container-type: inline-size; container-name: ${CELL_CONTAINER}; }`,
    `.heatmap-plot .x-axis { container-type: inline-size; container-name: ${HEADER_CONTAINER}; }`,
    `.heatmap-plot .axis-label.x .short { display: none; }`,
    `@container ${CELL_CONTAINER} (max-width: ${valueFloorPx}px) {`,
    `  .heatmap-plot .cell-value { display: none; }`,
    `}`,
    `@container ${HEADER_CONTAINER} (max-width: ${headerFloorPx}px) {`,
    `  .heatmap-plot .axis-label.x .long { display: none; }`,
    `  .heatmap-plot .axis-label.x .short { display: inline; }`,
    `}`,
  ].join("\n");
}

export function Co2HeatmapWeb({
  cells,
  countries,
  decades,
  title,
  source,
  alt,
  limits,
  ground,
  ink,
  muted,
  grid: gridColour,
  frame,
  measure,
  ramp,
}: {
  cells: Cell[];
  countries: string[];
  decades: number[];
  title: string;
  source: string;
  alt: string;
  limits: string;
  ground: string;
  ink: string;
  muted: string;
  grid: string;
  frame: HeatmapFrame;
  measure: Measure;
  ramp: Ramp;
}) {
  if (cells.length !== countries.length * decades.length)
    throw new Error(
      `expected ${countries.length * decades.length} cells, got ${cells.length}`,
    );

  const {
    grid,
    domain,
    width: gridWidth,
    height: gridHeight,
  } = heatmapGeometry(cells, countries, decades, frame, ramp);

  // The row-header gutter, measured from the real strings at their own FIXED type size — never a
  // guessed constant. The old build carried a literal (118 desktop / 62 narrow) and had to raise it
  // at render time when "United Kingdom" measured past it; here the measurement IS the gutter.
  const rowGutterPx =
    Math.ceil(Math.max(...countries.map((c) => measure(c, frame.axis)))) +
    frame.gap;

  // Both floors, from the real strings this beat prints — never a constant.
  const valueFloorPx = columnFloorPx(
    Math.max(...grid.map((c) => measure(fr1(c.value), frame.cellValue))),
    4,
    gridWidth,
    frame,
  );
  const headerFloorPx = columnFloorPx(
    Math.max(...decades.map((d) => measure(`${d}s`, frame.axis))),
    3,
    gridWidth,
    frame,
  );
  const minPlotHeightPx = countries.length * frame.minRowPx + frame.xAxisRowPx;
  const legendCaption = "t CO₂/capita, decade average";
  const rampStops = Array.from({ length: 12 }, (_, i) =>
    rampColour(i / 11, ramp),
  ).join(", ");

  return (
    <figure
      className="chart-figure heatmap-figure"
      style={{
        ["--ground" as string]: ground,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--grid" as string]: gridColour,
        ["--title-size" as string]: `${frame.title.fontSize}px`,
        ["--title-weight" as string]: frame.title.fontWeight,
        ["--subtitle-size" as string]: `${frame.subtitle.fontSize}px`,
        ["--source-size" as string]: `${frame.source.fontSize}px`,
        ["--axis-size" as string]: `${frame.axis.fontSize}px`,
        ["--legend-size" as string]: `${frame.legend.fontSize}px`,
        ["--cell-value-size" as string]: `${frame.cellValue.fontSize}px`,
        ["--cell-value-weight" as string]: frame.cellValue.fontWeight,
      }}
    >
      {/* The one rule a static stylesheet cannot hold: the width below which a fixed-size value is
          wider than the stretching cell around it, derived above from the real strings.
          `dangerouslySet` because React escapes text children of `<style>`; the content is this
          component's own arithmetic, never a caller's string. */}
      <style
        dangerouslySetInnerHTML={{
          __html: fluidWordCss(valueFloorPx, headerFloorPx),
        }}
      />

      <div className="chart-header">
        <h2 className="chart-title">{title}</h2>
        <p className="chart-caveat">{limits}</p>
      </div>

      {/* The key, stated ONCE for the whole grid — `heatmap.md`'s own rule, and the sibling rule
          against repeating shared context per unit. Plain HTML: the swatch is a CSS gradient built
          from the same `rampColour` the cells are filled from, so the key and the grid can never
          disagree about what a colour means. */}
      <div className="chart-legend">
        <span className="legend-caption">{legendCaption}</span>
        <span className="legend-min">{fr1(domain[0])}</span>
        <span
          className="legend-swatch"
          style={{
            width: `${frame.legendSwatch.width}px`,
            height: `${frame.legendSwatch.height}px`,
            background: `linear-gradient(to right, ${rampStops})`,
          }}
        />
        <span className="legend-max">{fr1(domain[1])}</span>
      </div>

      <div
        className="chart-plot heatmap-plot"
        style={{
          ["--y-gutter" as string]: `${rowGutterPx}px`,
          ["--x-axis-h" as string]: `${frame.xAxisRowPx}px`,
          ["--min-plot-h" as string]: `${minPlotHeightPx}px`,
          aspectRatio: `${rowGutterPx + gridWidth} / ${gridHeight + frame.xAxisRowPx}`,
        }}
      >
        {/* Column headers — decades, chronological, above the grid. HTML at a fixed size, in `%`
            over the same track the geometry is drawn in. */}
        <div className="x-axis">
          {decades.map((decade, col) => (
            <span
              key={decade}
              className="axis-label x"
              style={{
                left: `${pct(col * frame.cellSize + frame.cellSize / 2, gridWidth)}%`,
                color: muted,
              }}
            >
              {/* Both forms, server-side; which one shows is the container's decision, never a
                  script's. `60s` is unambiguous under a caveat and a source line that both name
                  the window, and the full decade is in every cell's own reading. */}
              <span className="long">{`${decade}s`}</span>
              <span className="short">{`${String(decade).slice(2)}s`}</span>
            </span>
          ))}
        </div>

        {/* Row headers — countries, in the deliberate order the caller chose. */}
        <div className="y-axis">
          {countries.map((country, row) => (
            <span
              key={country}
              className="axis-label y"
              style={{
                top: `${pct(row * frame.cellSize + frame.cellSize / 2, gridHeight)}%`,
                color: ink,
              }}
            >
              {country}
            </span>
          ))}
        </div>

        {/* GEOMETRY ONLY below — not one `<text>` element. The cells are rects, and a rect under a
            non-uniform scale is still a rect, which is exactly why this type survives
            `preserveAspectRatio="none"` where a circle would not. */}
        <svg
          // Named `group`, not `img` — the ruling `SlopeWeb.tsx` records: `img` raises the ARIA
          // children-presentational question for the 56 focusable cells below, `group` names the
          // graphic without raising it. `<desc>` still carries the alt text.
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${gridWidth} ${gridHeight}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect
            x={0}
            y={0}
            width={gridWidth}
            height={gridHeight}
            fill={ground}
          />

          {grid.map((c) => {
            const yearsNote = c.years < 10 ? ` (${c.years} yrs)` : "";
            return (
              <rect
                key={`${c.country}-${c.decade}`}
                className="cell"
                x={c.x}
                y={c.y}
                width={frame.cellSize}
                height={frame.cellSize}
                fill={c.fill}
                stroke={ground}
                strokeWidth={frame.cellSeparatorPx}
                vectorEffect="non-scaling-stroke"
                tabIndex={0}
                role="img"
                aria-label={`${c.country}, ${c.decade}s${yearsNote}: ${fr1(c.value)} tonnes per capita`}
                data-detail={`${c.country} · ${c.decade}s${yearsNote}: ${fr1(c.value)} t CO2 per capita`}
              />
            );
          })}

          {/* Outline around the grid gives the "no-data" convention and the thin cell separators
              `gridColour` a job — a hairline frame, not a decorative box. */}
          <rect
            x={0}
            y={0}
            width={gridWidth}
            height={gridHeight}
            fill="none"
            stroke={gridColour}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* The 56 in-cell values, HTML at a fixed size over the same grid cell as the `<svg>`.
            `pointer-events: none` is inherited from `.overlay` (the shared stylesheet), which is
            load-bearing: a value sitting on its own cell must not intercept the pointer the cell
            beneath it answers. Each carries the ink its own fill demands, computed against that
            fill and nothing else. */}
        <div className="overlay" aria-hidden="true">
          {grid.map((c) => (
            <span
              key={`v-${c.country}-${c.decade}`}
              className="cell-value"
              style={{
                left: `${pct(c.x + frame.cellSize / 2, gridWidth)}%`,
                top: `${pct(c.y + frame.cellSize / 2, gridHeight)}%`,
                color:
                  contrast("#000000", c.fill) >= contrast("#FFFFFF", c.fill)
                    ? "#000000"
                    : "#FFFFFF",
              }}
            >
              {fr1(c.value)}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-source">{source}</p>
    </figure>
  );
}
