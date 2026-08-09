/**
 * Beat: per-capita CO₂ emissions, eight countries x seven decades (heatmap / matrix), web genre.
 *
 * Written fresh from `references/types/heatmap.md`'s own description — region-by-year is the
 * type sheet's own worked example of what this type is FOR, so this beat draws exactly that shape:
 * one categorical axis (country), one temporal axis (decade), one quantitative value (average
 * annual tonnes CO₂ per capita) encoded as cell colour. Nothing here is imported from the seed
 * (`twin-chart-beat/assets/ChartSeed.tsx`, a line) or from the web genre's own worked example
 * (`proof/co2-suisse/EmissionsWeb.tsx`, also a line, whose `.pt`/`.hit-area`/nearest-by-x
 * interaction model does not fit a grid of already-discrete, non-overlapping cells) — a heatmap's
 * geometry, its ramp, and its interaction are all written new for this beat, per this project's own
 * "write the beat's own component" rule (`twin-chart-beat/SKILL.md`, "When to use").
 *
 * What the web genre adds here, honestly, per `web-discipline.md`'s "What hover reveals": each
 * cell prints its own ROUNDED value unconditionally (`heatmap.md`'s own rule — "if exact numbers
 * matter, put the value inside the cell too" — a coarse 56-cell grid is exactly the case where the
 * numbers ARE the story). Hover/focus adds the one thing the static print can't hold without
 * turning into 56 stacked sentences: a full, exact reading — country, decade, precise value, and
 * how many years the decade's average was built from (5 for the partial 2020s, 10 for every other
 * decade) — printed nowhere by default.
 */

import { scaleLinear } from "d3-scale";
import { contrast } from "#shared/twin-chart-beat/render-still.mjs";

export type Cell = {
  country: string;
  decade: number;
  years: number;
  value: number;
};

export type WebLayout = {
  name: "desktop" | "narrow";
  width: number;
  pad: number;
  title: { fontSize: number; fontWeight: number; lead: number };
  subtitle: { fontSize: number; fontWeight: number; lead: number };
  source: { fontSize: number; fontWeight: number; lead: number };
  axis: { fontSize: number };
  cellValue: { fontSize: number; fontWeight: number };
  legend: { fontSize: number; fontWeight: number };
  cellSize: number;
  cellGap: number;
  rowLabelGutter: number;
};

export const DESKTOP_LAYOUT: WebLayout = {
  name: "desktop",
  width: 900,
  pad: 40,
  title: { fontSize: 24, fontWeight: 700, lead: 30 },
  subtitle: { fontSize: 14, fontWeight: 400, lead: 20 },
  source: { fontSize: 13, fontWeight: 400, lead: 18 },
  axis: { fontSize: 13 },
  cellValue: { fontSize: 13, fontWeight: 600 },
  legend: { fontSize: 12, fontWeight: 400 },
  cellSize: 66,
  cellGap: 4,
  rowLabelGutter: 118,
};

// The task requires checking this layout at 375px — a touch narrower than the web genre's
// established 360px floor (`web-discipline.md`'s CO2 beat), so this beat's own narrow layout is
// sized to fit inside 375px rather than reusing that constant unexamined.
export const NARROW_LAYOUT: WebLayout = {
  name: "narrow",
  width: 375,
  pad: 14,
  title: { fontSize: 16, fontWeight: 700, lead: 21 },
  subtitle: { fontSize: 11, fontWeight: 400, lead: 15 },
  source: { fontSize: 10, fontWeight: 400, lead: 14 },
  axis: { fontSize: 9 },
  cellValue: { fontSize: 9, fontWeight: 600 },
  legend: { fontSize: 10, fontWeight: 400 },
  cellSize: 30,
  cellGap: 2,
  rowLabelGutter: 62,
};

export const LAYOUTS: WebLayout[] = [DESKTOP_LAYOUT, NARROW_LAYOUT];

/** Space between a row header's own right edge and the first cell of its row. */
export const ROW_LABEL_GAP = 10;

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

export function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
  measure: Measure,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const trial = line ? `${line} ${word}` : word;
    if (line && measure(trial, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...lines, line] : lines;
}

/** Sequential ramp, single-hue (`heatmap.md`'s own rule against a multi-hue "lively" gradient):
 *  channel-wise linear interpolation between a pale tint and a deep pole of the house teal, so
 *  luminance moves in exactly one direction, start to finish — checked by the caller, not assumed,
 *  via `rampContrastFloor` below. */
// The obvious pale-tint low end (`#E3F2F0`) measured 1.15:1 against a white ground — it nearly
// vanished, caught by `checkRampFloor` at build time before it was ever looked at. `#4A9C8F` is
// the palest stop on this single hue that still clears the 3:1 shape floor against white.
const RAMP_LOW = "#4A9C8F"; // pale pole, 3.3:1 against white — the low end
const RAMP_HIGH = "#04241E"; // deep pole — the high end

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

export function rampColour(t: number): string {
  return mixHex(RAMP_LOW, RAMP_HIGH, Math.max(0, Math.min(1, t)));
}

/** Every stop this beat actually draws must clear 3:1 against the page ground (the non-text
 *  contrast floor for a shape, `heatmap.md`'s accessibility trap) — checked at build time, not
 *  assumed, because a ramp "checked on paper" and never re-measured against the real ground is
 *  exactly how this type has shipped an invisible low end before. Throws loud rather than
 *  rendering a cell nobody could see against the ground. */
export function checkRampFloor(ground: string, steps = 9): void {
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const c = contrast(rampColour(t), ground);
    if (c < 3) {
      throw new Error(
        `heatmap ramp stop at t=${t.toFixed(2)} (${rampColour(t)}) measures ${c.toFixed(2)}:1 against ground ${ground}, under the 3:1 shape floor`,
      );
    }
  }
}

/** Pure geometry: cells to rects on a country x decade grid. `countries` is the row order the
 *  caller already chose (`render-web.mjs`'s own comment explains the ordering rule); `decades` is
 *  the column order, always chronological. */
export function heatmapGeometry(
  cells: Cell[],
  countries: string[],
  decades: number[],
  layout: WebLayout,
  originX: number,
  originY: number,
) {
  const byKey = new Map(cells.map((c) => [`${c.country}|${c.decade}`, c]));
  const values = cells.map((c) => c.value);
  const domain = [Math.min(...values), Math.max(...values)] as [number, number];
  const t = scaleLinear().domain(domain).range([0, 1]);

  const grid = countries.flatMap((country, row) =>
    decades.map((decade, col) => {
      const cell = byKey.get(`${country}|${decade}`);
      if (!cell) throw new Error(`missing cell for ${country} / ${decade}s`);
      const x = originX + col * (layout.cellSize + layout.cellGap);
      const y = originY + row * (layout.cellSize + layout.cellGap);
      return { ...cell, row, col, x, y, fill: rampColour(t(cell.value)) };
    }),
  );

  return { grid, domain };
}

// English-language beat throughout (title, source, alt) — a decimal COMMA here would be a language
// leak in the furniture, `static-discipline.md`'s own named defect class ("a language leak in the
// furniture is a defect even when every number is right"). Plain decimal point.
function fr1(v: number): string {
  return v.toFixed(1);
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
  layout,
  measure,
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
  layout: WebLayout;
  measure: Measure;
}) {
  if (cells.length !== countries.length * decades.length)
    throw new Error(
      `expected ${countries.length * decades.length} cells, got ${cells.length}`,
    );

  const { width, pad } = layout;

  const titleLines = wrap(title, width - pad * 2, layout.title, measure);
  const titleBaseline = pad + layout.title.fontSize;
  const limitsLines = wrap(limits, width - pad * 2, layout.subtitle, measure);
  const limitsBaseline =
    titleBaseline +
    (titleLines.length - 1) * layout.title.lead +
    Math.round(layout.title.lead * 0.9);
  const sourceLines = wrap(source, width - pad * 2, layout.source, measure);
  const sourceBaseline =
    limitsBaseline +
    (limitsLines.length - 1) * layout.subtitle.lead +
    Math.round(layout.subtitle.lead * 1.1);

  const legendBaseline =
    sourceBaseline +
    (sourceLines.length - 1) * layout.source.lead +
    Math.round(layout.title.lead * 0.9);

  // The legend's own bottom edge (its min/max labels, drawn BELOW the swatch) — column headers
  // start clear of this, never guessed close enough to collide. A first render put the min/max
  // labels almost on top of the "1970s"/"1980s" column headers (7px apart) — caught by looking,
  // fixed by deriving the gap from the legend's own type size instead of a fixed offset.
  const legendBottom = legendBaseline + layout.legend.fontSize + 4;
  const originY = legendBottom + Math.round(layout.axis.fontSize * 2.4);
  // The row-header gutter is a MINIMUM (it also decides how much of the frame the grid gets), never
  // the whole answer: the labels that live in it are right-anchored, so a gutter narrower than the
  // widest of them pushes that one label out of the frame's left pad. Measured at 375: the narrow
  // layout's literal 62 against a widest row label ("United Kingdom") of 64.05 put that label's left
  // edge at x 1.95, where every other element in the frame sits at the 14px pad. The widest label is
  // measured in the font it will be drawn in, and the gutter is raised to hold it whenever the
  // literal is too small — the desktop layout's own 118 is already wider than its labels need and is
  // left exactly as it was.
  const widestRowLabel = Math.max(
    ...countries.map((country) => measure(country, layout.axis)),
  );
  const rowLabelGutter = Math.max(
    layout.rowLabelGutter,
    widestRowLabel + ROW_LABEL_GAP,
  );
  const originX = pad + rowLabelGutter;

  const { grid, domain } = heatmapGeometry(
    cells,
    countries,
    decades,
    layout,
    originX,
    originY,
  );

  const plotWidth =
    decades.length * (layout.cellSize + layout.cellGap) - layout.cellGap;
  const plotHeight =
    countries.length * (layout.cellSize + layout.cellGap) - layout.cellGap;
  const height = originY + plotHeight + layout.axis.fontSize * 2 + pad;

  // Legend swatch: a small horizontal gradient strip built from the same ramp, min/max labelled —
  // "colour without a key is not decoded, it's just admired" (`heatmap.md`).
  const legendSteps = 24;
  const legendCaption = `t CO2/capita, decade average`;
  // The swatch's own x offset, MEASURED from the caption text it sits beside, not a fixed
  // "190 desktop / 95 narrow" guess — at the narrow layout's smaller font the caption still
  // measured past 95px, so the gradient strip started mid-word and ghosted over "decade average",
  // caught by looking at the rendered 375px page. A fixed gap after the caption's own real width
  // holds at any layout's own font size, and the swatch's own width is capped by what is actually
  // left of the frame after that offset, never assumed to fit a budget guessed before it existed.
  const legendSwatchX = pad + measure(legendCaption, layout.legend) + 14;
  const legendWidth = Math.min(220, width - pad - legendSwatchX);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="chart"
      data-layout={layout.name}
      fontFamily="Helvetica, Arial, sans-serif"
    >
      {/* No `role="img"` on the root — same departure the web genre's own doctrine takes for its
          line beat, and for the identical reason: every cell below stays individually focusable
          and individually named, which `role="img"` would flatten away
          (`web-discipline.md`, "One deliberate departure"). */}
      <desc>{alt}</desc>
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {titleLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={titleBaseline + i * layout.title.lead}
          fill={ink}
          fontSize={layout.title.fontSize}
          fontWeight={layout.title.fontWeight}
        >
          {line}
        </text>
      ))}
      {limitsLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={limitsBaseline + i * layout.subtitle.lead}
          fill={muted}
          fontSize={layout.subtitle.fontSize}
        >
          {line}
        </text>
      ))}
      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={sourceBaseline + i * layout.source.lead}
          fill={muted}
          fontSize={layout.source.fontSize}
        >
          {line}
        </text>
      ))}

      {/* Legend: one shared key for the whole grid, per `heatmap.md` and the small-multiples
          sibling rule against repeating shared context per unit — here it is stated once, at the
          level of the whole grid, never once per cell. */}
      <text
        x={pad}
        y={legendBaseline}
        fill={muted}
        fontSize={layout.legend.fontSize}
      >
        {legendCaption}
      </text>
      {Array.from({ length: legendSteps }).map((_, i) => (
        <rect
          key={i}
          x={legendSwatchX + (i * legendWidth) / legendSteps}
          y={legendBaseline - layout.legend.fontSize}
          width={legendWidth / legendSteps + 0.5}
          height={layout.legend.fontSize}
          fill={rampColour(i / (legendSteps - 1))}
        />
      ))}
      <text
        x={legendSwatchX}
        y={legendBaseline + layout.legend.fontSize + 2}
        fill={muted}
        fontSize={layout.legend.fontSize}
      >
        {fr1(domain[0])}
      </text>
      <text
        x={legendSwatchX + legendWidth}
        y={legendBaseline + layout.legend.fontSize + 2}
        fill={muted}
        fontSize={layout.legend.fontSize}
        textAnchor="end"
      >
        {fr1(domain[1])}
      </text>

      {/* Column headers — decades, chronological, stated once each above the grid. */}
      {decades.map((decade, col) => (
        <text
          key={decade}
          x={
            originX +
            col * (layout.cellSize + layout.cellGap) +
            layout.cellSize / 2
          }
          y={originY - 8}
          fill={muted}
          fontSize={layout.axis.fontSize}
          textAnchor="middle"
        >
          {`${decade}s`}
        </text>
      ))}

      {/* Row headers — countries, in the deliberate order the caller chose. */}
      {countries.map((country, row) => (
        <text
          key={country}
          x={originX - ROW_LABEL_GAP}
          y={
            originY +
            row * (layout.cellSize + layout.cellGap) +
            layout.cellSize / 2 +
            4
          }
          fill={ink}
          fontSize={layout.axis.fontSize}
          textAnchor="end"
        >
          {country}
        </text>
      ))}

      {/* Cells: square-ish with a thin ground-coloured separator (the gap itself, via cellGap),
          each one an independently focusable/hoverable target — no hit-area/nearest-x needed,
          because unlike points on a line, cells are already discrete, non-overlapping regions. */}
      {grid.map((c) => {
        const labelInk =
          contrast("#000000", c.fill) >= contrast("#FFFFFF", c.fill)
            ? "#000000"
            : "#FFFFFF";
        const yearsNote = c.years < 10 ? ` (${c.years} yrs)` : "";
        return (
          <g key={`${c.country}-${c.decade}`}>
            <rect
              className="cell"
              x={c.x}
              y={c.y}
              width={layout.cellSize}
              height={layout.cellSize}
              fill={c.fill}
              tabIndex={0}
              role="img"
              aria-label={`${c.country}, ${c.decade}s${yearsNote}: ${fr1(c.value)} tonnes per capita`}
              data-detail={`${c.country} · ${c.decade}s${yearsNote}: ${fr1(c.value)} t CO2 per capita`}
            />
            <text
              x={c.x + layout.cellSize / 2}
              y={c.y + layout.cellSize / 2 + layout.cellValue.fontSize * 0.35}
              fill={labelInk}
              fontSize={layout.cellValue.fontSize}
              fontWeight={layout.cellValue.fontWeight}
              textAnchor="middle"
              pointerEvents="none"
            >
              {fr1(c.value)}
            </text>
          </g>
        );
      })}
      {/* Outline around the grid gives the "no-data" convention and the thin cell separators
          `gridColour` a job — a hairline frame, not a decorative box. */}
      <rect
        x={originX}
        y={originY}
        width={plotWidth}
        height={plotHeight}
        fill="none"
        stroke={gridColour}
        strokeWidth={1}
      />
    </svg>
  );
}
