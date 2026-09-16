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
 *
 * A line has NO twin form — its x is a continuum, and rotating it would break the convention that
 * time runs left to right (`type-at-size.mjs`, quoting Horak et al. §2.4.2). What it has instead is
 * a MEASURED aspect range, and `assertPlotAspect` holds the plot inside it at any size but the one
 * this corpus was designed at.
 */

import { extent, tickStep } from "d3-array";
import { scaleLinear } from "d3-scale";
import { line as d3Line } from "d3-shape";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/chart-beat/render-still.mjs";
import {
  frameInsetFor,
  sizeFor,
  stageFor,
} from "#shared/chart-beat/sizes.mjs";
import { assertPlotAspect } from "#shared/chart-beat/type-at-size.mjs";

export type Reading = { year: number; value: number };

/**
 * THE 900x560 TUNING, KEPT AS THE BASE, WITH THE SIZE AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more: the frame is `sizeFor(size)`'s, and `size` is the decision
 * gate 2c took, read out of this beat's own `BRIEF.md` by `render.mjs`. Before this the size was
 * stated three times as literals — here and twice in the render script — and `renderStill` compared
 * two of them against each other, so a journalist pinning `portrait` got this beat's own landscape
 * frame back in silence.
 *
 * EVERY SPACING NUMBER GOES THROUGH `sp`, not only the fonts — including the LINE'S OWN STROKE and
 * its end dot. A 2.5px stroke on a 1920px frame is a hairline; the mark that carries the whole
 * claim has to grow with the frame it is read in.
 *
 * `PAD` is the one that does NOT go through it — a frame's margin is proportional to the CANVAS,
 * not to the type (`frameInsetFor`).
 */
const BASE = {
  TITLE: { fontSize: 24, fontWeight: 700, lead: 30 },
  SOURCE: { fontSize: 14, fontWeight: 400, lead: 20 },
  AXIS: { fontSize: 13, fontWeight: 400 },
  END_LABEL: { fontSize: 15, fontWeight: 600 },
  HEADER_TO_PLOT: 34,
  END_LABEL_GAP: 12,
  X_TICK_DROP: 24,
  /** The whole band the x-tick labels occupy under the plot, descender included. */
  X_LABEL_BAND: 30,
  AXIS_TO_SOURCE: 10,
  Y_TICK_INSET: 10,
  Y_TICK_BASELINE_NUDGE: 4,
  END_LABEL_BASELINE_NUDGE: 5,
  /** How far above the end point the label sits when it is set INSIDE the plot — see
   *  `endLabelPlacement`. */
  END_LABEL_RISE: 14,
  STROKE: 2.5,
  END_DOT: 4,
};
const UNIT = "years";
/** The static format's own tick density (`static-discipline.md`, "Axis density") — enough
 *  gridlines that a reader who scrutinises the frame can read a value off either axis directly,
 *  not the sparse 2-3 tick set the motion format keeps for a chart that is being watched draw.
 *  Sparser where the frame is read on a phone: removal-ladder rung R2, the only rung that gives
 *  budget back without removing anything vertical. */
const Y_TICK_HINT = 5;
const X_TICK_HINT = 6;
function yTickHintFor(size: string) {
  return sizeFor(size).minTypePx >= 36 ? 3 : Y_TICK_HINT;
}
function xTickHintFor(size: string) {
  return sizeFor(size).minTypePx >= 36 ? 3 : X_TICK_HINT;
}

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
    AXIS: f(BASE.AXIS) as typeof BASE.AXIS,
    END_LABEL: f(BASE.END_LABEL) as typeof BASE.END_LABEL,
    HEADER_TO_PLOT: sp(BASE.HEADER_TO_PLOT),
    END_LABEL_GAP: sp(BASE.END_LABEL_GAP),
    X_TICK_DROP: sp(BASE.X_TICK_DROP),
    X_LABEL_BAND: sp(BASE.X_LABEL_BAND),
    AXIS_TO_SOURCE: sp(BASE.AXIS_TO_SOURCE),
    Y_TICK_INSET: sp(BASE.Y_TICK_INSET),
    Y_TICK_BASELINE_NUDGE: sp(BASE.Y_TICK_BASELINE_NUDGE),
    END_LABEL_BASELINE_NUDGE: sp(BASE.END_LABEL_BASELINE_NUDGE),
    END_LABEL_RISE: sp(BASE.END_LABEL_RISE),
    STROKE: BASE.STROKE * typeScale,
    END_DOT: sp(BASE.END_DOT),
  };
}

/**
 * WHERE THE DIRECT END LABEL GOES, AND WHY IT IS NOT ALWAYS THE RIGHT GUTTER.
 *
 * `line.md` asks for a direct end label rather than a legend, and at 900x560 that means a gutter to
 * the right of the plot: "Switzerland 84.0 (2023)" is 170px there, 19% of the frame. The same label
 * at a phone's type scale is 520px — 48% of a 1080px frame — and reserving a gutter for it leaves
 * the line drawn in the strip that is left. The label is not the claim; the SLOPE is.
 *
 * So the placement is derived rather than fixed: the gutter is taken only while it costs less than
 * a quarter of the frame's width, and above that the label moves INSIDE the plot, sitting over the
 * last point and right-aligned to the plot's own right edge. The label stays direct either way —
 * this is a placement decision, never a fallback to a legend.
 *
 * A quarter is this corpus's own accepted figure, not a preference: 19% is what the beat shipped and
 * was accepted at, and a quarter is the next round number above it.
 */
export const END_LABEL_GUTTER_SHARE = 0.25;
export function endLabelPlacement(
  labelWidth: number,
  frameWidth: number,
): "gutter" | "over-the-point" {
  return labelWidth <= frameWidth * END_LABEL_GUTTER_SHARE
    ? "gutter"
    : "over-the-point";
}

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
    yTickHint = Y_TICK_HINT,
    xTickHint = X_TICK_HINT,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    /** Travel with the call, so the drawn gridlines and the measured labels are one list. */
    yTickHint?: number;
    xTickHint?: number;
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

  const yTicks = y.ticks(yTickHint);
  const xStep = tickStep(firstYear, lastYear, xTickHint);
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
  size,
}: {
  readings: Reading[];
  title: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  endLabel: string;
  /** The size gate 2c pinned, read from this beat's own `BRIEF.md`. Not a default. */
  size: string;
}) {
  if (readings.length < 2)
    throw new Error(
      "a line beat needs at least two readings, got " + readings.length,
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height, typeScale } = sizeFor(size);
  // The band this beat may draw in. At portrait the platform reserves 14% at the top and 35% at the
  // foot; content there is at RISK OF BEING COVERED, which no clipping counter can see.
  const stage = stageFor(size);
  const PAD = frameInsetFor(size);
  const {
    TITLE,
    SOURCE,
    AXIS,
    END_LABEL,
    HEADER_TO_PLOT,
    END_LABEL_GAP,
    X_TICK_DROP,
    X_LABEL_BAND,
    AXIS_TO_SOURCE,
    Y_TICK_INSET,
    Y_TICK_BASELINE_NUDGE,
    END_LABEL_BASELINE_NUDGE,
    END_LABEL_RISE,
    STROKE,
    END_DOT,
  } = tokens(typeScale);
  const contentTop = stage.reserved ? stage.top : PAD;
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = contentTop + TITLE.fontSize;
  // THE SOURCE SITS ON THE BOTTOM OF THE BAND — the LAST line lands there, the same edge the title
  // hangs off at the top, on the same x. See chart-beat/references/static-discipline.md,
  // "The source on the frame's bottom margin." At portrait that bottom is the STAGE's, not the
  // frame's: below 1248 is the platform's caption and progress bar, and a covered credit is an
  // attribution failure rather than a cosmetic one. It also WRAPS now — at a phone's type scale
  // this credit is three lines wide, and one unwrapped line ran off the frame.
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  const sourceBaseline = sourceBottom - (sourceLines.length - 1) * SOURCE.lead;

  // Both gutters are measured from the widest string that will actually be drawn in them, never
  // a constant (`static-discipline.md`, "Gutters are measured, never fixed").
  const provisionalTicks = scaleLinear()
    .domain(extent(readings.map((r) => r.value)) as [number, number])
    .nice()
    .ticks(yTickHintFor(size));
  const yTickLabels = provisionalTicks.map((v, i, all) =>
    i === all.length - 1 ? `${v} ${UNIT}` : `${v}`,
  );
  const endLabelWidth = measureText(endLabel, END_LABEL);
  const placement = endLabelPlacement(endLabelWidth, width);
  const padding = {
    top: titleBaseline + (titleLines.length - 1) * TITLE.lead + HEADER_TO_PLOT,
    right:
      placement === "gutter"
        ? PAD + END_LABEL_GAP + endLabelWidth
        : PAD + END_LABEL_GAP,
    // Derived from where the credit now sits, not from a constant: the x-tick band under the
    // plot's floor has to end above the credit's first line of ink.
    bottom:
      height -
      (sourceBaseline - SOURCE.fontSize - AXIS_TO_SOURCE) +
      X_LABEL_BAND,
    left:
      PAD +
      Y_TICK_INSET +
      Math.max(...yTickLabels.map((label) => measureText(label, AXIS))),
  };

  const { plot, path, end, ticksY, ticksX, zeroY } = lineGeometry(readings, {
    width,
    height,
    padding,
    yTickHint: yTickHintFor(size),
    xTickHint: xTickHintFor(size),
  });
  // THE PLOT'S OWN SHAPE, refused before anything is drawn. A line's argument IS its slope, so an
  // aspect nobody measured is a slope nobody chose — and the portrait probe proved that no clipping
  // or collision counter in this project can tell the difference (zero clipped, zero collisions,
  // and a destroyed distribution). Landscape is exempt because it is the frame this corpus was
  // designed and accepted at; `formForSize` answers `as-is` there and this returns without looking.
  assertPlotAspect(plot, "line", size, {
    what: "more-line-swiss-life-expectancy",
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
            x={plot.left - Y_TICK_INSET}
            y={tick.y + Y_TICK_BASELINE_NUDGE}
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
          y={plot.bottom + X_TICK_DROP}
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
        strokeWidth={STROKE}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={end.x} cy={end.y} r={END_DOT} fill={accent} />
      {/* Direct end label either way — in the right gutter where that costs less than a quarter of
          the frame, and over the last point where it does not. `line.md` asks for a direct label
          and not a legend; where it SITS is a placement decision this frame takes, and at a phone's
          type scale reserving a gutter for a 520px label leaves the line drawn in what is left. */}
      {placement === "gutter" ? (
        <text
          x={plot.right + END_LABEL_GAP}
          y={end.y + END_LABEL_BASELINE_NUDGE}
          fill={accent}
          fontSize={END_LABEL.fontSize}
          fontWeight={END_LABEL.fontWeight}
        >
          {endLabel}
        </text>
      ) : (
        <text
          x={plot.right}
          y={end.y - END_LABEL_RISE}
          fill={accent}
          fontSize={END_LABEL.fontSize}
          fontWeight={END_LABEL.fontWeight}
          textAnchor="end"
        >
          {endLabel}
        </text>
      )}
    </svg>
  );
}
