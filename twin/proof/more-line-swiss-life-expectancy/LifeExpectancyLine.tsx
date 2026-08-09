/**
 * Beat: Switzerland's life expectancy at birth, 1950-2023 (a single trend line).
 *
 * Written fresh from `references/types/line.md`'s description of what a line needs, not from
 * `ChartSeed.tsx` (that file is a worked example to read and throw away, not a base to import):
 * one continuous stroke over an ordered year axis, a y-scale FITTED to the readings' own extent
 * (never anchored at zero — a line reads by slope, and this series sits 69-84, nowhere near
 * zero), a direct end-label at the last point in the one accent colour instead of a legend (there
 * is only one series here, so the "two series collide" trap in line.md's last section does not
 * apply), and x-axis density derived from the series' own 74-year span via `tickStep`, not a
 * fixed first/middle/last set.
 */

import { extent, tickStep } from "d3-array";
import { scaleLinear } from "d3-scale";
import { line as d3Line } from "d3-shape";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/twin-chart-beat/render-still.mjs";

export type Reading = { year: number; value: number };

const FRAME = { width: 900, height: 560 };
const PAD = 40;
const TITLE = { fontSize: 24, fontWeight: 700, lead: 30 };
const SOURCE = { fontSize: 14, fontWeight: 400, lead: 20 };
const AXIS = { fontSize: 13, fontWeight: 400 };
const END_LABEL = { fontSize: 15, fontWeight: 600 };
const UNIT = "years";
/** The static genre's own tick density (`static-discipline.md`, "Axis density") — enough
 *  gridlines that a reader who scrutinises the frame can read a value off either axis directly,
 *  not the sparse 2-3 tick set the motion genre keeps for a chart that is being watched draw. */
const Y_TICK_HINT = 5;
const X_TICK_HINT = 6;

function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const trial = current ? `${current} ${word}` : word;
    if (current && measureText(trial, font) > maxWidth) {
      lines.push(current);
      current = word;
    } else current = trial;
  }
  return current ? [...lines, current] : lines;
}

/**
 * Data to coordinates only — no colour, no font, no string. The y-scale is fitted to the
 * readings' own extent and `.nice()`d outward to round numbers; it is never anchored at zero,
 * because zero is a rule about a mark's LENGTH (bars, columns, areas) and this line's value is
 * carried by slope. Anchoring 69-84 at zero would put four-fifths of the frame under the actual
 * readings, flattening the 15-year climb the beat exists to show (`references/types/line.md`,
 * "Where it goes wrong").
 */
export function lineGeometry(
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
  const years = readings.map((r) => r.year);
  const [firstYear, lastYear] = [Math.min(...years), Math.max(...years)];
  const x = scaleLinear()
    .domain([firstYear, lastYear])
    .range([plot.left, plot.right]);

  const values = readings.map((r) => r.value);
  const y = scaleLinear()
    .domain(extent(values) as [number, number])
    .nice()
    .range([plot.bottom, plot.top]);
  const [floor, ceiling] = y.domain();

  const points = readings.map((r) => ({
    year: r.year,
    value: r.value,
    x: x(r.year),
    y: y(r.value),
  }));

  const path =
    d3Line<(typeof points)[number]>()
      .x((p) => p.x)
      .y((p) => p.y)
      .digits(1)(points) ?? "";

  const yTicks = y.ticks(Y_TICK_HINT);
  const xStep = tickStep(firstYear, lastYear, X_TICK_HINT);
  const xTicks: number[] = [];
  for (
    let year = Math.ceil(firstYear / xStep) * xStep;
    year <= lastYear;
    year += xStep
  ) {
    xTicks.push(year);
  }

  return {
    plot,
    points,
    path,
    end: points[points.length - 1],
    domain: [floor, ceiling] as [number, number],
    // A series of positive values already sits above zero once `.nice()`d outward from a
    // positive extent, so `zeroY` only ever draws when the fitted domain actually crosses zero
    // — this series never does, but the check stays in the geometry rather than being asserted
    // away, because a line type that DID cross zero needs it (`references/types/line.md`).
    zeroY: floor < 0 && ceiling > 0 ? y(0) : null,
    ticksY: yTicks.map((value) => ({ value, y: y(value) })),
    ticksX: xTicks.map((year) => ({ year, x: x(year) })),
  };
}

export function LifeExpectancyLine({
  readings,
  title,
  source,
  alt,
  ground,
  accent,
  endLabel,
}: {
  readings: Reading[];
  title: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  endLabel: string;
}) {
  if (readings.length < 2)
    throw new Error(
      "a line beat needs at least two readings, got " + readings.length,
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height } = FRAME;

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const sourceBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 26;

  // Both gutters are measured from the widest string that will actually be drawn in them, never
  // a constant (`static-discipline.md`, "Gutters are measured, never fixed").
  const provisionalTicks = scaleLinear()
    .domain(extent(readings.map((r) => r.value)) as [number, number])
    .nice()
    .ticks(Y_TICK_HINT);
  const yTickLabels = provisionalTicks.map((v, i, all) =>
    i === all.length - 1 ? `${v} ${UNIT}` : `${v}`,
  );
  const padding = {
    top: sourceBaseline + 34,
    right: PAD + 12 + measureText(endLabel, END_LABEL),
    bottom: PAD + 24,
    left:
      PAD +
      10 +
      Math.max(...yTickLabels.map((label) => measureText(label, AXIS))),
  };

  const { plot, path, end, ticksY, ticksX, zeroY } = lineGeometry(readings, {
    width,
    height,
    padding,
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

      {ticksY.map((tick, i) => (
        <g key={tick.value}>
          <line
            x1={plot.left}
            x2={plot.right}
            y1={tick.y}
            y2={tick.y}
            stroke={tick.value === 0 ? muted : grid}
            strokeWidth={1}
          />
          <text
            x={plot.left - 10}
            y={tick.y + 4}
            fill={muted}
            fontSize={AXIS.fontSize}
            textAnchor="end"
          >
            {yTickLabels[i]}
          </text>
        </g>
      ))}
      {ticksX.map((tick) => (
        <text
          key={tick.year}
          x={tick.x}
          y={plot.bottom + 24}
          fill={muted}
          fontSize={AXIS.fontSize}
          textAnchor="middle"
        >
          {tick.year}
        </text>
      ))}

      {zeroY === null ? null : (
        <line
          x1={plot.left}
          x2={plot.right}
          y1={zeroY}
          y2={zeroY}
          stroke={muted}
          strokeWidth={1}
        />
      )}

      {/* One continuous stroke — no fill under it (nothing here names a second quantity for a
          fill to carry), no marker dot at every point (`references/types/line.md`, "What the
          drawing needs"). */}
      <path
        d={path}
        fill="none"
        stroke={accent}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={end.x} cy={end.y} r={4} fill={accent} />
      <text
        x={plot.right + 10}
        y={end.y + 5}
        fill={accent}
        fontSize={END_LABEL.fontSize}
        fontWeight={END_LABEL.fontWeight}
      >
        {endLabel}
      </text>
    </svg>
  );
}
