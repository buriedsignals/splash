/**
 * Beat: world population, 1800-2023 (area).
 *
 * Written fresh from `ChartSeed.tsx`'s shape for a type whose fill is a CLAIM, not decoration
 * (`references/types/area.md`): population is exactly the "stock, accumulated" case the sheet
 * names as the right use of a fill — a level, not a rate — so the value axis includes zero (the
 * same non-negotiable rule as any length-encoded mark, restated for a filled area's AREA rather
 * than a bar's height) and the fitted-scale-with-honest-ticks treatment `ChartSeed.tsx` uses for a
 * line does NOT apply here; this is the bar family's zero rule, not the line family's fitted one.
 */

import { extent, tickStep } from "d3-array";
import { scaleLinear } from "d3-scale";
import { area, line } from "d3-shape";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/chart-beat/render-still.mjs";

export type Reading = { year: number; population: number };

const FRAME = { width: 900, height: 560 };
const PAD = 40;
const TITLE = { fontSize: 26, fontWeight: 700, lead: 34 };
const SUBTITLE = { fontSize: 14, fontWeight: 400, lead: 20 };
const SOURCE = { fontSize: 14, fontWeight: 400 };
const AXIS = { fontSize: 13, fontWeight: 400 };
const LABEL = { fontSize: 15, fontWeight: 600 };
const NOTE = { fontSize: 13, fontWeight: 400 };
const Y_TICK_HINT = 5;
const X_TICK_HINT = 6;

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

/** Pure geometry. X is the readings' own first-to-last span, never nicened outward (the same
 *  reasoning `ChartSeed.tsx`'s `lineGeometry` uses). Y is `.nice()`d from a zero floor — the
 *  bar-family rule, because the fill's AREA is what a reader measures here. */
export function areaGeometry(
  data: Reading[],
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
  const years = data.map((d) => d.year);
  const [first, last] = [Math.min(...years), Math.max(...years)];
  const x = scaleLinear().domain([first, last]).range([plot.left, plot.right]);
  const y = scaleLinear()
    .domain([0, extent(data.map((d) => d.population))[1] as number])
    .nice()
    .range([plot.bottom, plot.top]);

  const points = data.map((d) => ({
    year: d.year,
    population: d.population,
    x: x(d.year),
    y: y(d.population),
  }));

  const areaPath = area<(typeof points)[number]>()
    .x((p) => p.x)
    .y0(y(0))
    .y1((p) => p.y)(points)!;
  const linePath = line<(typeof points)[number]>()
    .x((p) => p.x)
    .y((p) => p.y)(points)!;

  const step = tickStep(first, last, X_TICK_HINT);
  const ticksX: number[] = [];
  for (let year = Math.ceil(first / step) * step; year <= last; year += step)
    ticksX.push(year);

  return {
    plot,
    points,
    areaPath,
    linePath,
    end: points[points.length - 1],
    zeroY: y(0),
    ticksY: y.ticks(Y_TICK_HINT).map((v) => ({ value: v, y: y(v) })),
    ticksX: ticksX.map((year) => ({ year, x: x(year) })),
  };
}

function billions(v: number): string {
  return (v / 1e9).toFixed(1);
}

export function WorldPopulationArea({
  data,
  title,
  limits,
  source,
  alt,
  ground,
  accent,
  crossing,
}: {
  data: Reading[];
  title: string;
  limits: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  crossing: { year: number; population: number; label: string };
}) {
  if (data.length < 2)
    throw new Error(
      "an area beat needs at least two readings, got " + data.length,
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height } = FRAME;

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const limitsLines = wrap(limits, width - PAD * 2, SUBTITLE);
  const limitsBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 30;
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN — the LAST line lands on `height - PAD`, the
  // same inset the title hangs off at the top, on the same x. See
  // chart-beat/references/static-discipline.md, "The source on the frame's bottom margin".
  const sourceBaseline =
    height - PAD - (sourceLines.length - 1) * SUBTITLE.lead;

  const last = data[data.length - 1];
  const endLabel = `${last.year} · ${billions(last.population)} billion`;

  const rawTicks = scaleLinear()
    .domain([0, extent(data.map((d) => d.population))[1] as number])
    .nice()
    .ticks(Y_TICK_HINT);
  const tickLabels = rawTicks.map((v, i, all) =>
    i === all.length - 1 ? `${billions(v)} B` : billions(v),
  );

  const padding = {
    // The plot starts below the LAST HEADER line, never below the source.
    top: limitsBaseline + (limitsLines.length - 1) * SUBTITLE.lead + 34,
    right: PAD + 12 + measureText(endLabel, LABEL),
    // Grown by the source block's own height plus clear air: the credit now sits on the frame's
    // bottom margin, so the band beneath the plot has to end above its ink.
    bottom:
      PAD +
      24 +
      (sourceLines.length - 1) * SUBTITLE.lead +
      SOURCE.fontSize +
      10,
    left: PAD + 10 + Math.max(...tickLabels.map((l) => measureText(l, AXIS))),
  };

  const { plot, areaPath, linePath, end, zeroY, ticksY, ticksX, points } =
    areaGeometry(data, { width, height, padding });
  const crossingPoint = points.find((p) => p.year === crossing.year);

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
            {tickLabels[i]}
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

      {/* The fill IS the claim for this type: a level accumulated over time, read as an area, not
          a rate sampled at points (`references/types/area.md`). */}
      <path d={areaPath} fill={accent} fillOpacity={0.18} />
      <path
        d={linePath}
        fill="none"
        stroke={accent}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {crossingPoint && (
        <g>
          <circle
            cx={crossingPoint.x}
            cy={crossingPoint.y}
            r={3}
            fill={muted}
          />
          <text
            x={crossingPoint.x}
            y={crossingPoint.y - 12}
            fill={muted}
            fontSize={NOTE.fontSize}
            textAnchor="middle"
          >
            {crossing.label}
          </text>
        </g>
      )}

      <circle cx={end.x} cy={end.y} r={4} fill={accent} />
      <text
        x={plot.right + 10}
        y={end.y + 5}
        fill={accent}
        fontSize={LABEL.fontSize}
        fontWeight={LABEL.fontWeight}
      >
        {endLabel}
      </text>
    </svg>
  );
}
