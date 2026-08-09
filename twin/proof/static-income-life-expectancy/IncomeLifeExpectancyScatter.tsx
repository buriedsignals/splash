/**
 * Beat: income vs. life expectancy, 165 countries, 2021 (scatter).
 *
 * Written fresh from `ChartSeed.tsx`'s shape for a type that spends BOTH axes on a measured value
 * (`references/types/scatter.md`) — the opposite of every bar-family type in this set, where one
 * axis is always category. Position is the entire encoding: no bubble, no third variable, so the
 * "radius should scale by area not by value" trap that sheet names does not apply here at all.
 *
 * GDP per capita spans two and a half orders of magnitude (roughly $600 to $150,000), so the x
 * axis is a LOG scale — the honest choice for this variable, not a stylistic one: on a linear
 * axis, 150 of these 165 countries would sit crushed into the first tenth of the frame, which
 * would hide the exact shape (steep gains at the bottom, flattening at the top) the chart exists
 * to show. The scale is named as log in the subtitle, because a reader who doesn't know an axis is
 * log-transformed will misjudge every distance on it.
 */

import { extent } from "d3-array";
import { scaleLinear, scaleLog } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/twin-chart-beat/render-still.mjs";

export type Point = {
  country: string;
  gdpPerCapita: number;
  lifeExpectancy: number;
};

const FRAME = { width: 900, height: 560 };
const PAD = 40;
const TITLE = { fontSize: 25, fontWeight: 700, lead: 32 };
const SUBTITLE = { fontSize: 14, fontWeight: 400, lead: 20 };
const SOURCE = { fontSize: 14, fontWeight: 400 };
const AXIS = { fontSize: 13, fontWeight: 400 };
const AXIS_TITLE = { fontSize: 13, fontWeight: 600 };
const POINT_LABEL = { fontSize: 12, fontWeight: 600 };
const Y_TICK_HINT = 5;
/** The conventional 1-2-5 sequence within each decade — the log-scale analogue of the linear
 *  `tickStep` the doctrine already trusts, not a per-story hand pick. */
function logTicks(domain: [number, number]): number[] {
  const [lo, hi] = domain;
  const ticks: number[] = [];
  let power = Math.floor(Math.log10(lo));
  while (10 ** power <= hi) {
    for (const m of [1, 2, 5]) {
      const v = m * 10 ** power;
      if (v >= lo && v <= hi) ticks.push(v);
    }
    power++;
  }
  return ticks;
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

/** Pure geometry: points to coordinates. Both axes fitted to the data's own extent — a scatter is
 *  a position chart, the opposite of a bar's length encoding, so neither axis is forced to zero
 *  (`static-discipline.md`'s zero rule is explicitly scoped to length-encoded marks). */
export function scatterGeometry(
  points: Point[],
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
  const gdpExtent = extent(points.map((p) => p.gdpPerCapita)) as [
    number,
    number,
  ];
  const xDomain: [number, number] = [gdpExtent[0] / 1.25, gdpExtent[1] * 1.25];
  const x = scaleLog().domain(xDomain).range([plot.left, plot.right]);
  const y = scaleLinear()
    .domain(extent(points.map((p) => p.lifeExpectancy)) as [number, number])
    .nice()
    .range([plot.bottom, plot.top]);

  const placed = points.map((p) => ({
    ...p,
    x: x(p.gdpPerCapita),
    y: y(p.lifeExpectancy),
  }));
  return {
    plot,
    points: placed,
    ticksX: logTicks(xDomain).map((v) => ({ value: v, x: x(v) })),
    ticksY: y.ticks(Y_TICK_HINT).map((v) => ({ value: v, y: y(v) })),
  };
}

function formatGdp(v: number): string {
  if (v >= 1000) return `$${Math.round(v / 1000)}k`;
  return `$${Math.round(v)}`;
}

export function IncomeLifeExpectancyScatter({
  points,
  title,
  limits,
  source,
  alt,
  ground,
  accent,
  highlighted,
}: {
  points: Point[];
  title: string;
  limits: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  /** The few points the chart names directly, per the sheet's "name only the story's own points"
   *  rule — everything else reads as the shape of the cloud, not as individuals. */
  highlighted: {
    country: string;
    dx: number;
    dy: number;
    anchor: "start" | "end";
  }[];
}) {
  if (points.length < 10)
    throw new Error(
      "a scatter beat needs a cloud with a shape, got " +
        points.length +
        " points",
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height } = FRAME;

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const limitsLines = wrap(limits, width - PAD * 2, SUBTITLE);
  const limitsBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 28;
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  const sourceBaseline =
    limitsBaseline + (limitsLines.length - 1) * SUBTITLE.lead + 22;
  const plotTop =
    sourceBaseline + (sourceLines.length - 1) * SUBTITLE.lead + 30;

  // A scatter needs an axis label on both axes — unlike a bar's shared baseline, a bare number
  // here carries no cue for what a position means (the sheet's own accessibility note). Reserve a
  // strip at the bottom and the left for those, outside the plot itself, so neither collides with
  // the marks the way a corner-set label could occlude a point underneath it.
  const yAxisTitleWidth = AXIS_TITLE.fontSize + 4;
  const padding = {
    top: plotTop,
    right: PAD + 8,
    bottom: PAD + 24 + AXIS_TITLE.fontSize + 6,
    left: PAD + yAxisTitleWidth + 10 + measureText("90", AXIS),
  };

  const {
    plot,
    points: placed,
    ticksX,
    ticksY,
  } = scatterGeometry(points, { width, height, padding });

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
      {limitsLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={limitsBaseline + i * SUBTITLE.lead}
          fill={muted}
          fontSize={SUBTITLE.fontSize}
        >
          {line}
        </text>
      ))}
      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={sourceBaseline + i * SUBTITLE.lead}
          fill={muted}
          fontSize={SOURCE.fontSize}
        >
          {line}
        </text>
      ))}

      {ticksY.map((tick) => (
        <g key={tick.value}>
          <line
            x1={plot.left}
            x2={plot.right}
            y1={tick.y}
            y2={tick.y}
            stroke={grid}
            strokeWidth={1}
          />
          <text
            x={plot.left - 10}
            y={tick.y + 4}
            fill={muted}
            fontSize={AXIS.fontSize}
            textAnchor="end"
          >
            {tick.value}
          </text>
        </g>
      ))}
      {ticksX.map((tick) => (
        <g key={tick.value}>
          <line
            x1={tick.x}
            x2={tick.x}
            y1={plot.top}
            y2={plot.bottom}
            stroke={grid}
            strokeWidth={1}
          />
          <text
            x={tick.x}
            y={plot.bottom + 20}
            fill={muted}
            fontSize={AXIS.fontSize}
            textAnchor="middle"
          >
            {formatGdp(tick.value)}
          </text>
        </g>
      ))}

      <text
        transform={`translate(${PAD + AXIS_TITLE.fontSize - 4}, ${(plot.top + plot.bottom) / 2}) rotate(-90)`}
        fill={muted}
        fontSize={AXIS_TITLE.fontSize}
        fontWeight={AXIS_TITLE.fontWeight}
        textAnchor="middle"
      >
        Life expectancy at birth (years)
      </text>
      <text
        x={(plot.left + plot.right) / 2}
        y={height - PAD}
        fill={muted}
        fontSize={AXIS_TITLE.fontSize}
        fontWeight={AXIS_TITLE.fontWeight}
        textAnchor="middle"
      >
        GDP per capita (log scale)
      </text>

      {placed.map((p) => {
        const isHighlighted = highlighted.some((h) => h.country === p.country);
        return (
          <circle
            key={p.country}
            cx={p.x}
            cy={p.y}
            r={isHighlighted ? 4.5 : 3.5}
            fill={isHighlighted ? accent : muted}
            fillOpacity={isHighlighted ? 1 : 0.55}
          />
        );
      })}

      {/* Named points get a leader line back to the dot (the sheet's own rule for a point sitting
          in a crowd) and their label in ink, never in the accent — a label's contrast is checked
          against the page, not against the mark it names (`visual-system.md`). */}
      {highlighted.map((h) => {
        const p = placed.find((pt) => pt.country === h.country);
        if (!p) return null;
        const labelX = p.x + h.dx;
        const labelY = p.y + h.dy;
        return (
          <g key={h.country}>
            <line
              x1={p.x}
              y1={p.y}
              x2={labelX}
              y2={labelY}
              stroke={muted}
              strokeWidth={1}
            />
            <text
              x={labelX + (h.anchor === "end" ? -5 : 5)}
              y={labelY + 4}
              fill={ink}
              fontSize={POINT_LABEL.fontSize}
              fontWeight={POINT_LABEL.fontWeight}
              textAnchor={h.anchor}
            >
              {h.country}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
