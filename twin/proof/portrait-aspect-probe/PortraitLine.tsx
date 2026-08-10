/**
 * PORTRAIT PROBE — the line, drawn two ways in the same 1080x1920 frame.
 *
 * A copy of `skills/twin-chart-beat/assets/ChartSeed.tsx` — the seed, which is the file every new
 * line beat is written from, and the one the task names. Nothing ships from here and the seed is
 * not touched.
 *
 *   arm "stretch"  — A. The plot fills whatever height is left. Byte-for-byte the seed's own
 *                    portrait render, which is why `portrait-probe.mjs` also renders the seed
 *                    itself and compares the two measurements before trusting this file.
 *   arm "furnished"— B. The plot is clamped into the aspect range the type's accepted renders
 *                    demonstrate, and the leftover height carries the annotations.
 *
 * A line is the harder case for the rule and that is why it is here: a histogram's aspect distorts
 * a SHAPE, but a line's aspect distorts a SLOPE, which is the quantity the reader is being asked to
 * judge. Rainfall falling by a third over eleven readings is the same fall at every aspect; whether
 * it reads as a drift or as a cliff is decided entirely by the height of the box it is drawn in.
 */

import { extent, tickStep } from "d3-array";
import { scaleLinear } from "d3-scale";
import { line as d3Line } from "d3-shape";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/twin-chart-beat/render-still.mjs";
import { clampPlotHeight, wrap, type Arm } from "./PortraitHistogram.tsx";

export type Reading = { year: number; value: number | null };

const BASE = {
  PAD: 40,
  TITLE: { fontSize: 26, fontWeight: 700, lead: 34 },
  SUBTITLE: { fontSize: 15, fontWeight: 400, lead: 21 },
  SOURCE: { fontSize: 14, fontWeight: 400 },
  AXIS: { fontSize: 13, fontWeight: 400 },
  LABEL: { fontSize: 15, fontWeight: 600 },
  BODY: { fontSize: 15, fontWeight: 400, lead: 23 },
  BODY_LEAD_IN: { fontSize: 15, fontWeight: 700 },
  X_TICK_DROP: 24,
  X_AXIS_TO_SOURCE_GAP: 8,
  HEADER_TO_PLOT: 34,
  END_LABEL_GUTTER: 12,
  END_LABEL_AIR: 10,
  Y_TICK_INSET: 10,
  Y_TICK_BASELINE_NUDGE: 4,
  MARK_BASELINE_NUDGE: 5,
};

function tokens(typeScale: number, headerScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  const hp = (v: number) => Math.round(v * headerScale);
  return {
    sp,
    PAD: sp(BASE.PAD),
    TITLE: {
      ...BASE.TITLE,
      fontSize: hp(BASE.TITLE.fontSize),
      lead: hp(BASE.TITLE.lead),
    },
    SUBTITLE: {
      ...BASE.SUBTITLE,
      fontSize: hp(BASE.SUBTITLE.fontSize),
      lead: hp(BASE.SUBTITLE.lead),
    },
    // The source does not grow with the headline — see `PortraitHistogram.tsx`'s note on the same
    // line: one multiplier over the whole header block made the credit read as a standfirst.
    SOURCE: { ...BASE.SOURCE, fontSize: sp(BASE.SOURCE.fontSize) },
    AXIS: { ...BASE.AXIS, fontSize: sp(BASE.AXIS.fontSize) },
    LABEL: { ...BASE.LABEL, fontSize: sp(BASE.LABEL.fontSize) },
    BODY: {
      ...BASE.BODY,
      fontSize: hp(BASE.BODY.fontSize),
      lead: hp(BASE.BODY.lead),
    },
    BODY_LEAD_IN: {
      ...BASE.BODY_LEAD_IN,
      fontSize: hp(BASE.BODY_LEAD_IN.fontSize),
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

const Y_TICK_HINT = 5;
const X_TICK_HINT = 6;

function yScale(data: Reading[]) {
  const values = data
    .map((d) => d.value)
    .filter((v): v is number => v !== null);
  if (values.length === 0)
    throw new Error("a line beat needs a reading to scale against, got none");
  return scaleLinear()
    .domain(extent(values) as [number, number])
    .nice();
}

export function lineGeometry(
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
  const y = yScale(data).range([plot.bottom, plot.top]);
  const [floor, ceiling] = y.domain();

  const points = data.map((d) => ({
    year: d.year,
    value: d.value,
    x: x(d.year),
    y: d.value === null ? null : y(d.value),
  }));

  const path =
    d3Line<(typeof points)[number]>()
      .defined((p) => p.y !== null)
      .x((p) => p.x)
      .y((p) => p.y as number)
      .digits(1)(points) ?? "";

  const gaps: { years: number[]; x: number; y: number }[] = [];
  for (let i = 0; i < points.length; i++) {
    if (points[i].value !== null) continue;
    const start = i;
    while (i + 1 < points.length && points[i + 1].value === null) i++;
    const neighbours = [
      points.slice(0, start).findLast((p) => p.value !== null),
      points.slice(i + 1).find((p) => p.value !== null),
    ].filter((p) => p !== undefined);
    const middle = (pick: (p: (typeof points)[number]) => number) =>
      neighbours.reduce((sum, p) => sum + pick(p), 0) / neighbours.length;
    gaps.push({
      years: points.slice(start, i + 1).map((p) => p.year),
      x: neighbours.length > 0 ? middle((p) => p.x) : points[start].x,
      y:
        neighbours.length > 0
          ? middle((p) => p.y as number)
          : (plot.top + plot.bottom) / 2,
    });
  }

  const step = tickStep(first, last, X_TICK_HINT);
  const xTicks: number[] = [];
  for (let year = Math.ceil(first / step) * step; year <= last; year += step)
    xTicks.push(year);

  return {
    plot,
    points,
    path,
    gaps,
    end: points.findLast((p) => p.value !== null),
    zeroY: floor < 0 && ceiling > 0 ? y(0) : null,
    ticksY: yScale(data)
      .ticks(Y_TICK_HINT)
      .map((value) => ({ value, y: y(value) })),
    ticksX: xTicks.map((year) => ({ year, x: x(year) })),
  };
}

export function PortraitLine({
  data,
  title,
  standfirst,
  source,
  notes,
  alt,
  ground,
  accent,
  subject,
  unit,
  width,
  height,
  typeScale,
  headerScale,
  arm,
  plotAspectRange,
}: {
  data: Reading[];
  title: string;
  standfirst: string;
  source: string;
  notes: { lead: string; body: string }[];
  alt: string;
  ground: string;
  accent: string;
  subject: string;
  unit: string;
  width: number;
  height: number;
  typeScale: number;
  headerScale: number;
  arm: Arm;
  plotAspectRange: [number, number];
}) {
  const { ink, muted, grid } = deriveFurniture(ground);
  const t = tokens(typeScale, headerScale);
  const { sp, PAD, TITLE, SUBTITLE, SOURCE, AXIS, LABEL, BODY, BODY_LEAD_IN } =
    t;

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const standfirstLines =
    arm === "furnished" ? wrap(standfirst, width - PAD * 2, SUBTITLE) : [];
  const standfirstBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + sp(30);
  const headerBottom =
    standfirstLines.length === 0
      ? titleBaseline + (titleLines.length - 1) * TITLE.lead
      : standfirstBaseline + (standfirstLines.length - 1) * SUBTITLE.lead;
  const sourceBaseline = height - PAD;

  const present = data.filter(
    (d): d is { year: number; value: number } => d.value !== null,
  );
  if (present.length < 2)
    throw new Error(
      "a line beat needs at least two readings, got " + present.length,
    );
  const last = present[present.length - 1];
  const endLabel = `${subject} ${last.value} ${unit}`;
  const tickLabels = yScale(data)
    .ticks(Y_TICK_HINT)
    .map((v, i, all) => (i === all.length - 1 ? `${v} ${unit}` : `${v}`));

  const left =
    PAD +
    t.Y_TICK_INSET +
    Math.max(...tickLabels.map((l) => measureText(l, AXIS)));
  const right = PAD + t.END_LABEL_GUTTER + measureText(endLabel, LABEL);
  const plotWidth = width - left - right;
  const plotTop = headerBottom + t.HEADER_TO_PLOT;

  // `LEAD_GAP`, `NOTE_GAP` and the bottom anchor: the same three corrections as the histogram, made
  // identically here rather than imported (the twin's own rule — a skill stays copy-pasteable, so
  // helpers are duplicated). The lead-in gutter has to be asked for explicitly because a trailing
  // space carries no ink.
  const LEAD_GAP = sp(10);
  const NOTE_GAP = sp(14);
  const noteLines =
    arm === "furnished"
      ? notes.map((n) => ({
          lead: n.lead,
          indent: measureText(n.lead, BODY_LEAD_IN) + LEAD_GAP,
          lines: wrap(
            n.body,
            width - PAD * 2 - measureText(n.lead, BODY_LEAD_IN) - LEAD_GAP,
            BODY,
          ),
        }))
      : [];
  const noteInnerHeight =
    noteLines.length === 0
      ? 0
      : noteLines.reduce((s, n) => s + n.lines.length * BODY.lead, 0) +
        (noteLines.length - 1) * NOTE_GAP;
  const noteBlockHeight = noteLines.length === 0 ? 0 : noteInnerHeight + sp(60);

  // The band the x tick labels and the source occupy under the plot — identical in both arms.
  const bottomBand = SOURCE.fontSize + t.X_TICK_DROP + t.X_AXIS_TO_SOURCE_GAP;
  const floorLimit = height - PAD - noteBlockHeight - bottomBand;
  const plotHeight =
    arm === "stretch"
      ? floorLimit - plotTop
      : clampPlotHeight(floorLimit - plotTop, plotWidth, plotAspectRange);

  const padding = {
    top: plotTop,
    right,
    bottom: height - (plotTop + plotHeight),
    left,
  };
  const { plot, path, gaps, ticksY, ticksX, zeroY, end } = lineGeometry(data, {
    width,
    height,
    padding,
  });

  // The block sits on the frame's bottom margin, clear of the source's own line — so the slack the
  // clamp leaves becomes air between the chart and its commentary rather than a blank tail.
  const noteBlockLastBaseline = height - PAD - SOURCE.fontSize - sp(22);
  let noteCursor = noteBlockLastBaseline - noteInnerHeight + BODY.lead;
  const noteRuleY = noteCursor - BODY.fontSize - sp(26);

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
      {standfirstLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={standfirstBaseline + i * SUBTITLE.lead}
          fill={muted}
          fontSize={SUBTITLE.fontSize}
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
            x={plot.left - t.Y_TICK_INSET}
            y={tick.y + t.Y_TICK_BASELINE_NUDGE}
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
          y={plot.bottom + t.X_TICK_DROP}
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

      {gaps.map((gap) => (
        <text
          key={gap.years[0]}
          x={gap.x}
          y={gap.y + t.MARK_BASELINE_NUDGE}
          fill={muted}
          fontSize={Math.round(12 * typeScale)}
          textAnchor="middle"
        >
          {gap.years.length > 1
            ? `no data ${gap.years[0]}–${gap.years[gap.years.length - 1]}`
            : `no data ${gap.years[0]}`}
        </text>
      ))}

      <path
        d={path}
        fill="none"
        stroke={accent}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={end!.x} cy={end!.y as number} r={4} fill={accent} />
      <text
        x={plot.right + t.END_LABEL_AIR}
        y={(end!.y as number) + t.MARK_BASELINE_NUDGE}
        fill={accent}
        fontSize={LABEL.fontSize}
        fontWeight={LABEL.fontWeight}
      >
        {endLabel}
      </text>

      {noteLines.length === 0 ? null : (
        <line
          x1={PAD}
          x2={width - PAD}
          y1={noteRuleY}
          y2={noteRuleY}
          stroke={grid}
          strokeWidth={1}
        />
      )}
      {noteLines.map((note) => {
        const leadWidth = note.indent;
        const block = (
          <g key={note.lead}>
            <text
              x={PAD}
              y={noteCursor}
              fill={accent}
              fontSize={BODY_LEAD_IN.fontSize}
              fontWeight={BODY_LEAD_IN.fontWeight}
            >
              {note.lead}
            </text>
            {note.lines.map((line, i) => (
              <text
                key={line}
                x={PAD + leadWidth}
                y={noteCursor + i * BODY.lead}
                fill={ink}
                fontSize={BODY.fontSize}
              >
                {line}
              </text>
            ))}
          </g>
        );
        noteCursor += note.lines.length * BODY.lead + NOTE_GAP;
        return block;
      })}
    </svg>
  );
}
