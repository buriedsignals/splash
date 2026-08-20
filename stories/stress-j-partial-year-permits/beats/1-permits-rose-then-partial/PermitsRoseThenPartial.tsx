/**
 * PermitsRoseThenPartial — the six complete years (2020-2025) drawn as one continuous line, fitted
 * to their own range; 2026 named at its own x position as a text annotation with NO plotted mark
 * and no line segment reaching it, because a 3-month reading has no honest y-coordinate on an axis
 * built from six 12-month totals. See BRIEF.md, "The decision, taken explicitly."
 *
 * Written from the shape of chart-beat's ChartSeed.tsx (pure geometry -> furniture from the ground
 * -> direct annotation -> one accent) — not imported from it.
 */
import { extent, tickStep } from "d3-array";
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor, stageFor } from "#shared/chart-beat/sizes.mjs";

type Reading = { year: number; value: number; monthsCovered: number };

const BASE = {
  PAD: 40,
  TITLE: { fontSize: 26, fontWeight: 700, lead: 34 },
  SUBTITLE: { fontSize: 16, fontWeight: 400, lead: 22 },
  SOURCE: { fontSize: 14, fontWeight: 400, lead: 18 },
  AXIS: { fontSize: 13, fontWeight: 400 },
  LABEL: { fontSize: 15, fontWeight: 600 },
  NOTE: { fontSize: 14, fontWeight: 400, lead: 18 },
  X_TICK_DROP: 24,
  X_AXIS_TO_SOURCE_GAP: 8,
  HEADER_TO_PLOT: 34,
  END_LABEL_GUTTER: 12,
  END_LABEL_AIR: 10,
  Y_TICK_INSET: 10,
  Y_TICK_BASELINE_NUDGE: 4,
  MARK_BASELINE_NUDGE: 5,
};

function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  return {
    sp,
    PAD: sp(BASE.PAD),
    TITLE: {
      ...BASE.TITLE,
      fontSize: sp(BASE.TITLE.fontSize),
      lead: sp(BASE.TITLE.lead),
    },
    SUBTITLE: {
      ...BASE.SUBTITLE,
      fontSize: sp(BASE.SUBTITLE.fontSize),
      lead: sp(BASE.SUBTITLE.lead),
    },
    SOURCE: {
      ...BASE.SOURCE,
      fontSize: sp(BASE.SOURCE.fontSize),
      lead: sp(BASE.SOURCE.lead),
    },
    AXIS: { ...BASE.AXIS, fontSize: sp(BASE.AXIS.fontSize) },
    LABEL: { ...BASE.LABEL, fontSize: sp(BASE.LABEL.fontSize) },
    NOTE: {
      ...BASE.NOTE,
      fontSize: sp(BASE.NOTE.fontSize),
      lead: sp(BASE.NOTE.lead),
    },
    X_TICK_DROP: sp(BASE.X_TICK_DROP),
    X_AXIS_TO_SOURCE_GAP: sp(BASE.X_AXIS_TO_SOURCE_GAP),
    HEADER_TO_PLOT: sp(BASE.HEADER_TO_PLOT),
    END_LABEL_GUTTER: sp(BASE.END_LABEL_GUTTER),
    END_LABEL_AIR: sp(BASE.END_LABEL_AIR),
    Y_TICK_INSET: sp(BASE.Y_TICK_INSET),
    Y_TICK_BASELINE_NUDGE: sp(BASE.Y_TICK_BASELINE_NUDGE),
    MARK_BASELINE_NUDGE: sp(BASE.MARK_BASELINE_NUDGE),
  };
}

const UNIT = "permits";
const Y_TICK_HINT = 5;
const X_TICK_HINT = 6;

/** Wrap on the measured width of the real string, never a character count. */
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

export function PermitsRoseThenPartial({
  complete,
  partial,
  title,
  subtitle,
  source,
  alt,
  ground,
  accent,
  size,
}: {
  complete: Reading[];
  partial: Reading;
  title: string;
  subtitle: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  size: string;
}) {
  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height, typeScale } = sizeFor(size);
  const stage = stageFor(size);
  const {
    TITLE,
    SUBTITLE,
    SOURCE,
    AXIS,
    LABEL,
    NOTE,
    X_TICK_DROP,
    X_AXIS_TO_SOURCE_GAP,
    HEADER_TO_PLOT,
    END_LABEL_GUTTER,
    END_LABEL_AIR,
    Y_TICK_INSET,
    Y_TICK_BASELINE_NUDGE,
    MARK_BASELINE_NUDGE,
  } = tokens(typeScale);
  const INSET = frameInsetFor(size);
  const contentTop = stage.reserved ? stage.top : INSET;
  const sourceBottom = stage.reserved ? stage.bottom : height - INSET;

  const titleLines = wrap(title, width - INSET * 2, TITLE);
  const titleBaseline = contentTop + TITLE.fontSize;
  const subtitleLines = wrap(subtitle, width - INSET * 2, SUBTITLE);
  const subtitleTop =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + TITLE.lead * 0.5;

  const sourceBaseline = sourceBottom;
  const sourceLines = wrap(source, width - INSET * 2, SOURCE);

  if (complete.length < 2)
    throw new Error(
      "a line beat needs at least two complete readings, got " +
        complete.length,
    );
  const last = complete[complete.length - 1];
  const endLabel = `${last.value.toLocaleString("en-US")} ${UNIT} (${last.year}, full year)`;

  const values = complete.map((d) => d.value);
  const y = scaleLinear()
    .domain(extent(values) as [number, number])
    .nice();
  const [floor, ceiling] = y.domain();
  const tickLabels = y
    .ticks(Y_TICK_HINT)
    .map((v, i, all) =>
      i === all.length - 1
        ? `${v.toLocaleString("en-US")} ${UNIT}`
        : v.toLocaleString("en-US"),
    );

  const allYears = [...complete.map((d) => d.year), partial.year];
  const [firstYear, lastYear] = [Math.min(...allYears), Math.max(...allYears)];

  // THE NOTE, measured before layout: three short lines, stacked below the end label in the same
  // right gutter — never centred over the plot, which is what put it on top of the line itself in
  // the first draft of this file (found by rendering and looking, exactly the discipline this
  // skill asks for).
  const noteLines = [
    `${partial.year}: ${partial.value.toLocaleString("en-US")} ${UNIT}`,
    `(Jan–Mar, ${partial.monthsCovered} of 12 months —`,
    `not a full year, not plotted)`,
  ];

  const padding = {
    top:
      titleBaseline +
      (titleLines.length - 1) * TITLE.lead +
      subtitleLines.length * SUBTITLE.lead +
      HEADER_TO_PLOT,
    right:
      INSET +
      END_LABEL_GUTTER +
      Math.max(
        measureText(endLabel, LABEL),
        ...noteLines.map((l) => measureText(l, NOTE)),
      ),
    bottom:
      height -
      sourceBaseline +
      SOURCE.fontSize +
      (sourceLines.length - 1) * SOURCE.lead +
      X_TICK_DROP +
      X_AXIS_TO_SOURCE_GAP,
    left:
      INSET +
      Y_TICK_INSET +
      Math.max(...tickLabels.map((label) => measureText(label, AXIS))),
  };

  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };

  const x = scaleLinear()
    .domain([firstYear, lastYear])
    .range([plot.left, plot.right]);
  const yScale = y.range([plot.bottom, plot.top]);

  const points = complete.map((d) => ({
    year: d.year,
    value: d.value,
    x: x(d.year),
    y: yScale(d.value),
  }));
  const path =
    line<(typeof points)[number]>()
      .x((p) => p.x)
      .y((p) => p.y)
      .digits(1)(points) ?? "";

  const step = tickStep(firstYear, lastYear, X_TICK_HINT);
  const ticksX: { year: number; x: number }[] = [];
  for (
    let yr = Math.ceil(firstYear / step) * step;
    yr <= lastYear;
    yr += step
  ) {
    ticksX.push({ year: yr, x: x(yr) });
  }
  // The partial year's own x position stays locatable even when it does not land on a round
  // tick, the same way an annotated-but-untocked year stays locatable against a regular grid
  // (`static-discipline.md`, "Axis density").
  if (!ticksX.some((t) => t.year === partial.year))
    ticksX.push({ year: partial.year, x: x(partial.year) });

  const ticksY = y
    .ticks(Y_TICK_HINT)
    .map((value) => ({ value, y: yScale(value) }));

  // THE PARTIAL YEAR'S NOTE. No mark, no line segment reaching it — see BRIEF.md. Anchored LEFT
  // at the same x as the end label, stacked below it in the same right gutter — never centred
  // over the plot: the first draft did that, anchored on the partial year's own x position with
  // the text centred, and rendering it showed the note's left half overlapping the accent line
  // and the dashed boundary. Found by looking, not by a test.
  const noteX = plot.right + END_LABEL_AIR;
  const noteTop =
    points[points.length - 1].y +
    MARK_BASELINE_NUDGE +
    LABEL.fontSize * 0.6 +
    NOTE.lead;

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
          key={`t${i}`}
          x={INSET}
          y={titleBaseline + i * TITLE.lead}
          fill={ink}
          fontSize={TITLE.fontSize}
          fontWeight={TITLE.fontWeight}
        >
          {line}
        </text>
      ))}
      {subtitleLines.map((line, i) => (
        <text
          key={`s${i}`}
          x={INSET}
          y={subtitleTop + i * SUBTITLE.lead}
          fill={muted}
          fontSize={SUBTITLE.fontSize}
        >
          {line}
        </text>
      ))}
      {sourceLines.map((line, i) => (
        <text
          key={`src${i}`}
          x={INSET}
          y={sourceBaseline - (sourceLines.length - 1 - i) * SOURCE.lead}
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
            stroke={grid}
            strokeWidth={1}
          />
          <text
            x={plot.left - Y_TICK_INSET}
            y={tick.y + Y_TICK_BASELINE_NUDGE}
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
          y={plot.bottom + X_TICK_DROP}
          fill={muted}
          fontSize={AXIS.fontSize}
          fontWeight={tick.year === partial.year ? 700 : 400}
          textAnchor="middle"
        >
          {tick.year}
        </text>
      ))}

      {/* A dashed boundary marks where the comparable series stops — the frame's own way of
          saying "the line ends here on purpose," so the absence of a 2026 mark on the line
          does not read as an oversight. */}
      <line
        x1={plot.right}
        x2={plot.right}
        y1={plot.top}
        y2={plot.bottom}
        stroke={grid}
        strokeWidth={1}
        strokeDasharray="2 3"
      />

      <path
        d={path}
        fill="none"
        stroke={accent}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={4}
        fill={accent}
      />
      <text
        x={plot.right + END_LABEL_AIR}
        y={points[points.length - 1].y + MARK_BASELINE_NUDGE}
        fill={accent}
        fontSize={LABEL.fontSize}
        fontWeight={LABEL.fontWeight}
      >
        {endLabel}
      </text>

      {noteLines.map((line, i) => (
        <text
          key={`note${i}`}
          x={noteX}
          y={noteTop + i * NOTE.lead}
          fill={muted}
          fontSize={NOTE.fontSize}
          textAnchor="start"
        >
          {line}
        </text>
      ))}
    </svg>
  );
}
