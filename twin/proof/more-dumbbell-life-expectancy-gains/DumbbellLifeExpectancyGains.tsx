/**
 * Beat: life expectancy gains, 2000 -> 2023, ten countries (dumbbell / range plot).
 *
 * Written fresh from `ChartSeed.tsx`'s shape for a type that is NOT the pyramid's mirrored bars:
 * every row's two values sit on ONE shared linear scale, plotted as two dots joined by a straight
 * connector (`references/types/dumbbell.md`). Position encoding, not length encoding, so the scale
 * is fitted to the data's own extent and NOT anchored at zero — what matters is where each dot
 * sits and how far apart the pair is, not the distance from a floor. Rows are sorted by gap size,
 * descending, so the biggest differences surface at the top. Colour is capped at exactly two hues,
 * one per year, and because there is no positional convention here (unlike a slope chart's
 * left-is-earlier reading) telling a reader which dot is which series, the legend is load-bearing,
 * not decorative — the one deliberate exception to this discipline's usual "direct end labels, not
 * a legend."
 *
 * The category-label gutter is the type sheet's own named failure mode: this file measures the
 * widest country name actually drawn (`measureText`) and reserves exactly that much room, rather
 * than a constant that fits some names and clips others.
 */

import { extent } from "d3-array";
import { scaleLinear, scaleBand } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/twin-chart-beat/render-still.mjs";

export type Row = {
  country: string;
  y2000: number;
  y2023: number;
  gap: number;
};

const FRAME = { width: 900, height: 860 };
const PAD = 40;
const TITLE = { fontSize: 22, fontWeight: 700, lead: 28 };
const SOURCE = { fontSize: 14, fontWeight: 400, lead: 20 };
const LEGEND = { fontSize: 13, fontWeight: 600 };
const AXIS = { fontSize: 12, fontWeight: 400 };
const CATEGORY_LABEL = { fontSize: 14, fontWeight: 600 };
const VALUE_LABEL = { fontSize: 13, fontWeight: 600 };
/** How many labelled value ticks a static frame asks for (`static-discipline.md`'s "Axis
 *  density" — conventional density for a static frame, not the sparse 2-3 tick motion rule). */
const X_TICK_HINT = 5;
const UNIT = "years";

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
  return v.toFixed(1);
}

/**
 * Pure geometry: rows to dot pairs on one shared scale. The scale is fitted to the extent of
 * EVERY value plotted (both years, all countries), `.nice()`d, and NOT anchored at zero — this is
 * a position encoding, exactly like a slope chart's, so the floor is not part of the claim.
 * `rows` must already be sorted (by gap, descending) before this runs: `scaleBand`'s domain order
 * is what puts the biggest gap at the top of the frame.
 */
export function dumbbellGeometry(
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
  const values = rows.flatMap((r) => [r.y2000, r.y2023]);
  const scale = scaleLinear()
    .domain(extent(values) as [number, number])
    .nice()
    .range([plot.left, plot.right]);

  const y = scaleBand()
    .domain(rows.map((r) => r.country))
    .range([plot.top, plot.bottom])
    .paddingInner(0.32);

  const dots = rows.map((r) => ({
    country: r.country,
    gap: r.gap,
    rowY: y(r.country)! + y.bandwidth() / 2,
    x2000: scale(r.y2000),
    x2023: scale(r.y2023),
    y2000: r.y2000,
    y2023: r.y2023,
  }));

  const ticks = scale.ticks(X_TICK_HINT);
  return {
    plot,
    dots,
    ticksX: ticks.map((value) => ({ value, x: scale(value) })),
  };
}

export function DumbbellLifeExpectancyGains({
  rows,
  title,
  source,
  alt,
  ground,
  startInk,
  endInk,
}: {
  rows: Row[];
  title: string;
  source: string;
  alt: string;
  ground: string;
  /** The earlier year's dot colour, and the later year's. Two CVD-safe hues, capped at exactly two
   *  per `references/types/dumbbell.md`, each reused consistently across every row so a reader
   *  learns "which dot is which series" once and applies it to the whole chart. They arrive as
   *  props because they are the newsroom's recorded answer, read from `PALETTE.md` by the runner —
   *  naming them here would put the answer back in the source, where no recorded choice reaches
   *  it. */
  startInk: string;
  endInk: string;
}) {
  if (rows.length < 2)
    throw new Error(
      "a dumbbell beat needs at least two rows, got " + rows.length,
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height } = FRAME;

  // Header laid out first; the plot starts where the header stops.
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN — the LAST line lands on `height - PAD`, the
  // same inset the title hangs off at the top, on the same x, so a wrapped credit grows upward
  // into the frame rather than downward out of it. See
  // twin-chart-beat/references/static-discipline.md, "The source on the frame's bottom margin."
  const sourceBaseline = height - PAD - (sourceLines.length - 1) * SOURCE.lead;
  // The legend keeps the air it always had above it, measured from the LAST HEADER line rather
  // than from the source, which is no longer in the header.
  const legendBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 30;

  // The category gutter is measured from the widest name actually drawn — the type sheet's own
  // named failure mode (`references/types/dumbbell.md`, "The one thing that goes wrong"): this
  // chart has, in production, shipped with zero reserved space for this column before.
  const categoryGutter = Math.max(
    ...rows.map((r) => measureText(r.country, CATEGORY_LABEL)),
  );
  // Value labels sit on the OUTER side of each dot, so both the left and right frame edges need
  // room reserved for the widest label that could land there — measured, not guessed, same
  // discipline as the category gutter.
  const leftLabelGutter = Math.max(
    ...rows.map((r) => measureText(formatValue(r.y2000), VALUE_LABEL)),
  );
  const rightLabelGutter = Math.max(
    ...rows.map((r) => measureText(formatValue(r.y2023), VALUE_LABEL)),
  );

  const padding = {
    top: legendBaseline + 26,
    right: PAD + 10 + rightLabelGutter,
    // Grown by the source block's own height plus clear air: the credit now sits on the frame's
    // bottom margin, so the axis band beneath the plot has to end above its ink.
    bottom:
      PAD + 34 + (sourceLines.length - 1) * SOURCE.lead + SOURCE.fontSize + 10,
    left: PAD + categoryGutter + 18 + 10 + leftLabelGutter,
  };

  const { plot, dots, ticksX } = dumbbellGeometry(rows, {
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
      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={sourceBaseline + i * SOURCE.lead}
          fill={muted}
          fontSize={SOURCE.fontSize}
        >
          {line}
        </text>
      ))}

      {/* Load-bearing legend, not decorative: with no time-axis convention telling left from
          right, the two dot colours are the ONLY thing naming which series is which, on every
          single row (`references/types/dumbbell.md`, "The accessibility trap"). */}
      <circle cx={PAD + 6} cy={legendBaseline - 4} r={6} fill={startInk} />
      <text
        x={PAD + 18}
        y={legendBaseline}
        fill={ink}
        fontSize={LEGEND.fontSize}
        fontWeight={LEGEND.fontWeight}
      >
        2000
      </text>
      <circle
        cx={PAD + 90}
        cy={legendBaseline - 4}
        r={6}
        fill={endInk}
      />
      <text
        x={PAD + 102}
        y={legendBaseline}
        fill={ink}
        fontSize={LEGEND.fontSize}
        fontWeight={LEGEND.fontWeight}
      >
        2023
      </text>

      {/* Vertical gridlines on the shared value scale — decoration, not a competing mark. The
          unit is stated once, on the rightmost tick actually drawn. */}
      {ticksX.map((tick, i) => (
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
            y={plot.bottom + 22}
            fill={muted}
            fontSize={AXIS.fontSize}
            textAnchor="middle"
          >
            {i === ticksX.length - 1 ? `${tick.value} ${UNIT}` : tick.value}
          </text>
        </g>
      ))}

      {dots.map((d) => (
        <g key={d.country}>
          {/* Category label, left-aligned in its own measured column. */}
          <text
            x={PAD}
            y={d.rowY + 5}
            fill={ink}
            fontSize={CATEGORY_LABEL.fontSize}
            fontWeight={CATEGORY_LABEL.fontWeight}
          >
            {d.country}
          </text>

          {/* The connector reads as neutral scaffolding, not a third mark competing with the
              two dots — its whole job is to make the gap visible as a length. */}
          <line
            x1={d.x2000}
            x2={d.x2023}
            y1={d.rowY}
            y2={d.rowY}
            stroke={muted}
            strokeWidth={2}
            strokeLinecap="round"
          />

          <circle cx={d.x2000} cy={d.rowY} r={6} fill={startInk} />
          <circle cx={d.x2023} cy={d.rowY} r={6} fill={endInk} />

          {/* Value labels on the OUTER side of each dot, in ink — never in either dot's own
              accent colour, which has previously failed WCAG contrast here
              (`references/types/dumbbell.md`, "The accessibility trap"). */}
          <text
            x={d.x2000 - 10}
            y={d.rowY + 5}
            fill={ink}
            fontSize={VALUE_LABEL.fontSize}
            fontWeight={VALUE_LABEL.fontWeight}
            textAnchor="end"
          >
            {formatValue(d.y2000)}
          </text>
          <text
            x={d.x2023 + 10}
            y={d.rowY + 5}
            fill={ink}
            fontSize={VALUE_LABEL.fontSize}
            fontWeight={VALUE_LABEL.fontWeight}
            textAnchor="start"
          >
            {formatValue(d.y2023)}
          </text>
        </g>
      ))}
    </svg>
  );
}
