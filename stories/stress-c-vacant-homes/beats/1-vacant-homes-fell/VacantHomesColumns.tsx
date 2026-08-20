/**
 * Beat: the share of vacant homes, 2019-2022 (four annual columns).
 *
 * Written fresh from `ChartSeed.tsx`'s shape against
 * `references/types/bar-and-column.md` and `references/types/line.md`. Four annual readings with
 * nothing interpolated between them is squarely inside line.md's own "eight or fewer, no real
 * trend between the points" warning — a line here would be "a bar/column comparison wearing a
 * line's clothes" (line.md, "When not to reach for it"). So this draws columns, zero-anchored
 * (bar-and-column.md's non-negotiable: length is the encoding, and a fitted floor on a bar is a
 * false statement about the data dressed as care).
 *
 * Every column carries its own value printed directly above it, so there is no y-axis and no
 * gridline — every point the chart could annotate already is, in its own label, at the mark
 * (`static-discipline.md`, axis-density test). One accent for all four columns: the subject is
 * the four-year series as a whole, not any single year picked out from it.
 *
 * See this beat's own `BRIEF.md` for why the title drawn here is NOT the journalist's own
 * takeaway — the frozen data falls every year and the article's takeaway claims a rise.
 */

import { scaleLinear, scaleBand } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor, stageFor } from "#shared/chart-beat/sizes.mjs";
import { assertTypeMayEnter } from "#shared/chart-beat/type-at-size.mjs";

export type Reading = { year: number; value: number };

/** The type this beat draws, in `references/types/` vocabulary (`bar-and-column.md`). */
export const TYPE = "column";

/** The 900x560 tuning, kept as the base; the size row's `typeScale` is the multiplier. */
const BASE = {
  TITLE: { fontSize: 26, fontWeight: 700, lead: 34 },
  SOURCE: { fontSize: 14, fontWeight: 400, lead: 20 },
  CATEGORY_LABEL: { fontSize: 14, fontWeight: 400 },
  VALUE_LABEL: { fontSize: 16, fontWeight: 600 },
  HEADER_TO_PLOT: 40,
  CATEGORY_DROP: 24,
  AXIS_TO_SOURCE: 10,
  VALUE_LABEL_GAP: 10,
};

const UNIT = "%";

function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  const f = <T extends { fontSize: number; lead?: number }>(tok: T) => ({
    ...tok,
    fontSize: sp(tok.fontSize),
    ...(tok.lead === undefined ? {} : { lead: sp(tok.lead) }),
  });
  return {
    TITLE: f(BASE.TITLE) as typeof BASE.TITLE,
    SOURCE: f(BASE.SOURCE) as typeof BASE.SOURCE,
    CATEGORY_LABEL: f(BASE.CATEGORY_LABEL) as typeof BASE.CATEGORY_LABEL,
    VALUE_LABEL: f(BASE.VALUE_LABEL) as typeof BASE.VALUE_LABEL,
    HEADER_TO_PLOT: sp(BASE.HEADER_TO_PLOT),
    CATEGORY_DROP: sp(BASE.CATEGORY_DROP),
    AXIS_TO_SOURCE: sp(BASE.AXIS_TO_SOURCE),
    VALUE_LABEL_GAP: sp(BASE.VALUE_LABEL_GAP),
  };
}

/**
 * Pure geometry: readings to column rectangles. Knows no colour, no font, no label — the boundary
 * `ChartSeed.tsx`'s `lineGeometry` draws. Zero floor, non-negotiable for a length encoding
 * (`references/types/bar-and-column.md`, "Where it goes wrong").
 */
export function columnGeometry(
  readings: Reading[],
  {
    width,
    height,
    padding,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const max = Math.max(...readings.map((r) => r.value));
  const band = scaleBand()
    .domain(readings.map((r) => String(r.year)))
    .range([plot.left, plot.right])
    .paddingInner(0.32)
    .paddingOuter(0.16);
  const value = scaleLinear().domain([0, max]).range([plot.bottom, plot.top]);

  const columns = readings.map((r) => ({
    year: r.year,
    value: r.value,
    x: band(String(r.year))!,
    width: band.bandwidth(),
    y: value(r.value),
    height: plot.bottom - value(r.value),
  }));

  return { plot, columns, step: band.step() };
}

function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const trial = line ? `${line} ${word}` : word;
    if (line && measureText(trial, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...lines, line] : lines;
}

export function formatValue(v: number): string {
  return `${v.toFixed(1)}${UNIT}`;
}

export function VacantHomesColumns({
  readings,
  title,
  source,
  alt,
  ground,
  accent,
  size,
}: {
  readings: Reading[];
  title: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  /** The size gate 2c pinned, read from this beat's own `BRIEF.md`. Not a default. */
  size: string;
}) {
  if (readings.length < 2)
    throw new Error(
      `a column beat needs at least two readings, got ${readings.length}`,
    );

  const { ink, muted } = deriveFurniture(ground);
  const { width, height, typeScale, minTypePx } = sizeFor(size);
  const stage = stageFor(size);
  const PAD = frameInsetFor(size);
  const T = tokens(typeScale);
  const contentTop = stage.reserved ? stage.top : PAD;
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;

  // Landscape only — `assertTypeMayEnter` throws naming the reachable sizes at anything else,
  // the same guard `render.mjs` calls before drawing at all.
  assertTypeMayEnter(TYPE, size, { what: "vacant-homes-fell" });

  const titleLines = wrap(title, width - PAD * 2, T.TITLE);
  const titleBaseline = contentTop + T.TITLE.fontSize;
  const sourceLines = wrap(source, width - PAD * 2, T.SOURCE);
  const sourceBaseline = sourceBottom - (sourceLines.length - 1) * T.SOURCE.lead;

  const plotTop =
    titleBaseline + (titleLines.length - 1) * T.TITLE.lead + T.HEADER_TO_PLOT;

  const padding = {
    top: plotTop,
    right: PAD,
    bottom:
      height -
      (sourceBaseline - T.SOURCE.fontSize - T.AXIS_TO_SOURCE) +
      T.CATEGORY_DROP,
    left: PAD,
  };

  const { plot, columns, step } = columnGeometry(readings, {
    width,
    height,
    padding,
  });

  // The floor a band-scale layout can still miss even with a zero-anchored axis and no gridlines:
  // a band pitch thinner than one line of its own category type is columns touching or a category
  // label with nowhere to sit. No clipping or collision counter in this project sees that.
  if (step < minTypePx)
    throw new Error(
      `vacant-homes-fell: at ${size} the ${readings.length} columns get ${step.toFixed(1)}px of ` +
        `band each, under the ${minTypePx}px type floor for this size.`,
    );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      fontFamily={FONT_FAMILY}
    >
      <desc>{alt}</desc>
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {titleLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={titleBaseline + i * T.TITLE.lead}
          fill={ink}
          fontSize={T.TITLE.fontSize}
          fontWeight={T.TITLE.fontWeight}
        >
          {line}
        </text>
      ))}
      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={sourceBaseline + i * T.SOURCE.lead}
          fill={muted}
          fontSize={T.SOURCE.fontSize}
        >
          {line}
        </text>
      ))}

      {columns.map((c) => (
        <g key={c.year}>
          <rect x={c.x} y={c.y} width={c.width} height={c.height} fill={accent} />
          {/* The value sits OUTSIDE the mark, in ink — never inside the coloured fill, where
              `bar-and-column.md`'s own contrast trap lives. */}
          <text
            x={c.x + c.width / 2}
            y={c.y - T.VALUE_LABEL_GAP}
            fill={ink}
            fontSize={T.VALUE_LABEL.fontSize}
            fontWeight={T.VALUE_LABEL.fontWeight}
            textAnchor="middle"
          >
            {formatValue(c.value)}
          </text>
          <text
            x={c.x + c.width / 2}
            y={plot.bottom + T.CATEGORY_DROP}
            fill={muted}
            fontSize={T.CATEGORY_LABEL.fontSize}
            textAnchor="middle"
          >
            {c.year}
          </text>
        </g>
      ))}

      {/* Zero baseline — the floor every column is measured from. */}
      <line
        x1={plot.left}
        x2={plot.right}
        y1={plot.bottom}
        y2={plot.bottom}
        stroke={ink}
        strokeWidth={1}
      />
    </svg>
  );
}
