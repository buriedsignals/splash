/**
 * Beat: 2024 per-capita CO2 emissions across 15 European countries, ranked (lollipop).
 *
 * Written fresh from `ChartSeed.tsx`'s shape for a type that is "a bar, minus the fill"
 * (`references/types/lollipop.md`): one category band axis (country) crossed with one linear
 * value axis running from zero to the data's own max — a stem per row, capped with a dot, never
 * a mirrored two-sided chart. The value axis keeps the bar family's non-negotiable zero floor
 * (`static-discipline.md`'s "Honest scale" — length encoding, the opposite of the line rule this
 * doctrine also carries) even though the mark is thin enough to tempt otherwise.
 *
 * Orientation is horizontal — category names read left-to-right without rotation, and the stem's
 * rightward length is the thing a reader measures, same posture as the population pyramid's
 * horizontal bars but single-sided.
 */

import { scaleLinear, scaleBand } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/twin-chart-beat/render-still.mjs";

export type Row = { country: string; value: number };

const FRAME = { width: 900, height: 800 };
const PAD = 40;
const TITLE = { fontSize: 24, fontWeight: 700, lead: 30 };
const SOURCE = { fontSize: 14, fontWeight: 400 };
const CATEGORY_LABEL = { fontSize: 14, fontWeight: 400 };
const VALUE_LABEL = { fontSize: 14, fontWeight: 600 };
const AXIS = { fontSize: 12, fontWeight: 400 };
const UNIT = "t";
/** How many labelled gridlines the value axis asks for — the static genre's conventional
 *  density, same hint `ChartSeed.tsx` uses for its own linear axis (`static-discipline.md`,
 *  "Axis density"), not the sparse 2-3 tick axis the motion genre reaches for. */
const VALUE_TICK_HINT = 5;
const DOT_RADIUS = 5;
const STEM_WIDTH = 2.5;

/** Pure geometry: rows (already sorted by the caller) to stem/dot coordinates. Knows no colour,
 *  no font, no label — the same boundary `ChartSeed.tsx`'s `lineGeometry` draws. */
export function lollipopGeometry(
  rows: Row[],
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

  // The value axis is a length encoding, so it is fitted from zero — not from the data's own
  // minimum, which is the line-chart rule this type explicitly does not inherit
  // (`references/types/lollipop.md`, "The one thing that goes wrong").
  const maxValue = Math.max(...rows.map((r) => r.value));
  const x = scaleLinear()
    .domain([0, maxValue])
    .nice()
    .range([plot.left, plot.right]);

  // Band padding wide enough that a row of thin stems reads as separated rows, not a solid mass
  // — the reason this type exists as distinct from a bar in the first place.
  const y = scaleBand()
    .domain(rows.map((r) => r.country))
    .range([plot.top, plot.bottom])
    .paddingInner(0.45)
    .paddingOuter(0.3);

  const points = rows.map((r) => {
    const rowY = y(r.country)! + y.bandwidth() / 2;
    return { country: r.country, value: r.value, rowY, dotX: x(r.value) };
  });

  const ticks = x.ticks(VALUE_TICK_HINT);
  return {
    plot,
    zeroX: x(0),
    points,
    ticks: ticks.map((v) => ({ value: v, x: x(v) })),
  };
}

/** Wrap on the measured width of the real string, never on a character count. */
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

function formatValue(v: number): string {
  return `${v.toFixed(1)} ${UNIT}`;
}

/** A regular value-axis gridline that would pass straight through a row's own value label is
 *  dropped for that row's band only — not thinned, removed — the same "remove the competing
 *  line" fix `static-discipline.md` states for a hand-placed reference line, generalised here
 *  because with 15 rows any tick can land under any row's label, not just one chosen annotation.
 *  Returns the visible [y1, y2] segments of one vertical gridline once its collisions are cut
 *  out. */
function verticalSegments(
  top: number,
  bottom: number,
  gaps: [number, number][],
): [number, number][] {
  const sorted = [...gaps].sort((a, b) => a[0] - b[0]);
  const segments: [number, number][] = [];
  let cursor = top;
  for (const [gapStart, gapEnd] of sorted) {
    const start = Math.max(cursor, top);
    const end = Math.min(gapStart, bottom);
    if (end > start) segments.push([start, end]);
    cursor = Math.max(cursor, gapEnd);
  }
  if (cursor < bottom) segments.push([cursor, bottom]);
  return segments;
}

export function LollipopCo2({
  rows,
  title,
  source,
  alt,
  ground,
  accent,
  subject,
}: {
  /** Already sorted descending by value by the caller — this component draws rows in the order
   *  given rather than re-sorting, so the deliberate ranking read is a decision made once, at the
   *  data layer, not silently redone here. */
  rows: Row[];
  title: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  subject: string;
}) {
  if (rows.length < 3)
    throw new Error(
      "a lollipop beat needs at least three rows, got " + rows.length,
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height } = FRAME;

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const sourceBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 26;

  // Both gutters are measured from the widest string that will actually be drawn in them — a
  // fixed constant here is exactly the failure class `references/types/lollipop.md` names for
  // this type ("has previously truncated category labels because a fixed gutter was too
  // narrow"). The value-label gutter takes the max over every row's formatted label, not just
  // the row with the largest number, because digit count does not always track magnitude.
  const widestCategory = Math.max(
    ...rows.map((r) => measureText(r.country, CATEGORY_LABEL)),
  );
  const widestValueLabel = Math.max(
    ...rows.map((r) => measureText(formatValue(r.value), VALUE_LABEL)),
  );

  const padding = {
    top: sourceBaseline + 30,
    right: PAD + 14 + widestValueLabel,
    bottom: PAD + 30,
    left: PAD + 10 + widestCategory,
  };

  const { plot, zeroX, points, ticks } = lollipopGeometry(rows, {
    width,
    height,
    padding,
  });
  const tickLabels = ticks.map((t, i, all) =>
    i === all.length - 1 ? `${t.value} ${UNIT}` : `${t.value}`,
  );

  // Each row's own value-label span, measured — the same box the collision check below tests a
  // gridline against, not an estimate.
  const labelSpans = points.map((p) => {
    const start = p.dotX + DOT_RADIUS + 8;
    const width = measureText(formatValue(p.value), VALUE_LABEL);
    return { rowY: p.rowY, start, end: start + width };
  });

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
          y={titleBaseline + i * TITLE.lead}
          fill={ink}
          fontSize={TITLE.fontSize}
          fontWeight={TITLE.fontWeight}
        >
          {line}
        </text>
      ))}
      <text x={PAD} y={sourceBaseline} fill={muted} fontSize={SOURCE.fontSize}>
        {source}
      </text>

      {/* Value-axis gridlines, vertical because the value axis runs left-to-right here. Each one
          is cut into segments that skip any row whose own value label sits at this x — a
          gridline is decoration, a value label is the fact, and the two never share a pixel. */}
      {ticks.map((tick, i) => {
        const gaps: [number, number][] = labelSpans
          .filter((span) => tick.x >= span.start - 2 && tick.x <= span.end + 2)
          .map((span) => [span.rowY - 11, span.rowY + 11]);
        const segments = verticalSegments(plot.top, plot.bottom, gaps);
        return (
          <g key={tick.value}>
            {segments.map(([y1, y2]) => (
              <line
                key={y1}
                x1={tick.x}
                x2={tick.x}
                y1={y1}
                y2={y2}
                stroke={grid}
                strokeWidth={1}
              />
            ))}
            <text
              x={tick.x}
              y={plot.bottom + 22}
              fill={muted}
              fontSize={AXIS.fontSize}
              textAnchor="middle"
            >
              {tickLabels[i]}
            </text>
          </g>
        );
      })}
      {/* The zero baseline every stem starts from — the length-encoding floor this type inherits
          from bars and is not allowed to relax. */}
      <line
        x1={zeroX}
        x2={zeroX}
        y1={plot.top}
        y2={plot.bottom}
        stroke={muted}
        strokeWidth={1}
      />

      {points.map((p) => {
        const isSubject = p.country === subject;
        const markColour = isSubject ? accent : muted;
        return (
          <g key={p.country}>
            <text
              x={plot.left - 10}
              y={p.rowY + 5}
              fill={ink}
              fontSize={CATEGORY_LABEL.fontSize}
              fontWeight={CATEGORY_LABEL.fontWeight}
              textAnchor="end"
            >
              {p.country}
            </text>
            <line
              x1={zeroX}
              x2={p.dotX}
              y1={p.rowY}
              y2={p.rowY}
              stroke={markColour}
              strokeWidth={STEM_WIDTH}
              strokeLinecap="round"
            />
            <circle cx={p.dotX} cy={p.rowY} r={DOT_RADIUS} fill={markColour} />
            {/* The label carries the value, the mark carries the hue — never the same colour,
                even on the subject's own row (`references/types/lollipop.md`, "The accessibility
                trap": an accent hue that reads fine on a thin stem has previously measured under
                WCAG's 4.5:1 floor as running text). */}
            <text
              x={p.dotX + DOT_RADIUS + 8}
              y={p.rowY + 5}
              fill={ink}
              fontSize={VALUE_LABEL.fontSize}
              fontWeight={VALUE_LABEL.fontWeight}
            >
              {formatValue(p.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
