/**
 * Beat: Switzerland's 2023 population by age and sex (population pyramid).
 *
 * Written fresh from `ChartSeed.tsx`'s shape for a type that is two back-to-back bar charts
 * sharing one central category axis (`references/types/population-pyramid.md`): both sides grow
 * outward from a shared central zero on ONE mirrored magnitude scale, age bands keep their natural
 * sequence (never sorted by value — that would destroy the silhouette the type exists to show),
 * and both axes read as positive numbers, because the left side is a group, not a negative
 * quantity.
 *
 * The frame is taller than the other beats' 900x560 default — a deliberate per-story choice
 * (`static-discipline.md`'s FRAME is a named tuning knob, not a fixed constant): 21 age bands at
 * the default height would put roughly 18px per band, too tight for a legible bar and its
 * mirrored pair.
 */

import { scaleLinear, scaleBand } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/twin-chart-beat/render-still.mjs";

export type Band = { ageBand: string; male: number; female: number };

const FRAME = { width: 900, height: 820 };
const PAD = 40;
const TITLE = { fontSize: 24, fontWeight: 700, lead: 30 };
const SUBTITLE = { fontSize: 14, fontWeight: 400, lead: 20 };
const SOURCE = { fontSize: 14, fontWeight: 400 };
const AXIS = { fontSize: 12, fontWeight: 400 };
const BAND_LABEL = { fontSize: 11, fontWeight: 400 };
const LEGEND = { fontSize: 13, fontWeight: 600 };
const NOTE = { fontSize: 12, fontWeight: 700 };
/** Two hues a colour-vision-deficient reader can tell apart, checked as a pair — the type's own
 *  accessibility note. The mirrored position already carries the group distinction; colour here
 *  is reinforcing it, not carrying it alone. */
const COLOURS = { male: "#0072B2", female: "#D55E00" };
const BAND_GUTTER = 64;
const X_TICK_HINT = 4;

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

/** Pure geometry: bands to mirrored bar rectangles. Youngest at the bottom, oldest at the top —
 *  the pyramid's own natural order, kept intact, never sorted by value
 *  (`references/types/population-pyramid.md`'s one thing that goes wrong). One shared magnitude
 *  scale, mirrored left and right from a central zero — not two independent scales. */
export function pyramidGeometry(
  bands: Band[],
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
  const centerX = (plot.left + plot.right) / 2;
  const halfWidth = (plot.right - plot.left - BAND_GUTTER) / 2;

  const maxValue = Math.max(...bands.map((b) => Math.max(b.male, b.female)));
  const magnitude = scaleLinear()
    .domain([0, maxValue])
    .nice()
    .range([0, halfWidth]);

  // Youngest band first in the data (index 0 = "0-4"); reverse so it lands at the BOTTOM of the
  // frame — `scaleBand`'s range runs top-to-bottom in SVG y, so the oldest band needs to come
  // first in the domain to end up at the top.
  const order = [...bands].reverse().map((b) => b.ageBand);
  const y = scaleBand()
    .domain(order)
    .range([plot.top, plot.bottom])
    .paddingInner(0.15);

  const bars = bands.map((b) => {
    const rowY = y(b.ageBand)!;
    const maleWidth = magnitude(b.male);
    const femaleWidth = magnitude(b.female);
    return {
      ageBand: b.ageBand,
      male: b.male,
      female: b.female,
      y: rowY,
      height: y.bandwidth(),
      centerLabelY: rowY + y.bandwidth() / 2,
      male_: { x: centerX - BAND_GUTTER / 2 - maleWidth, width: maleWidth },
      female_: { x: centerX + BAND_GUTTER / 2, width: femaleWidth },
    };
  });

  const ticks = magnitude.ticks(X_TICK_HINT).filter((v) => v > 0);
  return {
    plot,
    centerX,
    bars,
    ticksLeft: ticks.map((v) => ({
      value: v,
      x: centerX - BAND_GUTTER / 2 - magnitude(v),
    })),
    ticksRight: ticks.map((v) => ({
      value: v,
      x: centerX + BAND_GUTTER / 2 + magnitude(v),
    })),
  };
}

function thousands(v: number): string {
  return Math.round(v / 1000).toLocaleString("en-US") + "k";
}

export function SwissAgePyramid({
  bands,
  title,
  limits,
  source,
  alt,
  ground,
  peakBand,
  peakLabel,
}: {
  bands: Band[];
  title: string;
  limits: string;
  source: string;
  alt: string;
  ground: string;
  peakBand: string;
  peakLabel: string;
}) {
  if (bands.length < 3)
    throw new Error(
      "a population pyramid beat needs at least three age bands, got " +
        bands.length,
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
  const legendBaseline =
    sourceBaseline + (sourceLines.length - 1) * SUBTITLE.lead + 26;

  const padding = {
    top: legendBaseline + 22,
    right: PAD + 8,
    bottom: PAD + 24,
    left: PAD + 8,
  };
  const { plot, centerX, bars, ticksLeft, ticksRight } = pyramidGeometry(
    bands,
    { width, height, padding },
  );

  const peak = bars.find((b) => b.ageBand === peakBand);

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

      <rect
        x={centerX - 220}
        y={legendBaseline - 10}
        width={12}
        height={12}
        fill={COLOURS.male}
      />
      <text
        x={centerX - 202}
        y={legendBaseline}
        fill={ink}
        fontSize={LEGEND.fontSize}
        fontWeight={LEGEND.fontWeight}
      >
        Men
      </text>
      <rect
        x={centerX + 40}
        y={legendBaseline - 10}
        width={12}
        height={12}
        fill={COLOURS.female}
      />
      <text
        x={centerX + 58}
        y={legendBaseline}
        fill={ink}
        fontSize={LEGEND.fontSize}
        fontWeight={LEGEND.fontWeight}
      >
        Women
      </text>

      {/* Tick labels on BOTH magnitude axes read as positive numbers — the left side is a group,
          not a negative quantity (`references/types/population-pyramid.md`). */}
      {ticksLeft.map((t) => (
        <g key={`l-${t.value}`}>
          <line
            x1={t.x}
            x2={t.x}
            y1={plot.top}
            y2={plot.bottom}
            stroke={grid}
            strokeWidth={1}
          />
          <text
            x={t.x}
            y={plot.bottom + 18}
            fill={muted}
            fontSize={AXIS.fontSize}
            textAnchor="middle"
          >
            {thousands(t.value)}
          </text>
        </g>
      ))}
      {ticksRight.map((t) => (
        <g key={`r-${t.value}`}>
          <line
            x1={t.x}
            x2={t.x}
            y1={plot.top}
            y2={plot.bottom}
            stroke={grid}
            strokeWidth={1}
          />
          <text
            x={t.x}
            y={plot.bottom + 18}
            fill={muted}
            fontSize={AXIS.fontSize}
            textAnchor="middle"
          >
            {thousands(t.value)}
          </text>
        </g>
      ))}
      <line
        x1={centerX}
        x2={centerX}
        y1={plot.top}
        y2={plot.bottom}
        stroke={muted}
        strokeWidth={1}
      />

      {bars.map((b) => (
        <g key={b.ageBand}>
          <rect
            x={b.male_.x}
            y={b.y}
            width={b.male_.width}
            height={b.height}
            fill={COLOURS.male}
          />
          <rect
            x={b.female_.x}
            y={b.y}
            width={b.female_.width}
            height={b.height}
            fill={COLOURS.female}
          />
          {/* The age band label sits in the reserved central gutter, never printed over a bar. */}
          <text
            x={centerX}
            y={b.centerLabelY + 4}
            fill={muted}
            fontSize={BAND_LABEL.fontSize}
            textAnchor="middle"
          >
            {b.ageBand}
          </text>
        </g>
      ))}

      {peak && (
        <g>
          <line
            x1={plot.left}
            x2={peak.male_.x}
            y1={peak.centerLabelY}
            y2={peak.centerLabelY}
            stroke={ink}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <text
            x={plot.left}
            y={peak.centerLabelY - 8}
            fill={ink}
            fontSize={NOTE.fontSize}
            fontWeight={NOTE.fontWeight}
          >
            {peakLabel}
          </text>
        </g>
      )}
    </svg>
  );
}
