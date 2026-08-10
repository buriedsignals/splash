/**
 * PORTRAIT PROBE — the histogram's SIBLING CASE: a ranking of ten countries, drawn three ways in
 * the same 1080x1920 frame.
 *
 * A copy of `../static-bar-top-emitters-2024/TopEmittersColumns.tsx`, parameterised by frame and
 * arm. Nothing ships from here and the beat is not touched.
 *
 *   arm "stretch"  — A. Ten vertical columns, the plot filling whatever height is left.
 *   arm "furnished"— B. The same ten columns, the plot clamped into the aspect range the type's
 *                    accepted renders demonstrate, the leftover height spent on annotations.
 *   arm "transposed"— C. The same ten values as HORIZONTAL bars: categories running DOWN the
 *                    frame, length running RIGHT. This is not a rescaling of B; it is a different
 *                    drawing of the same data, and it is available to this type because the
 *                    category axis is nominal. A histogram's x axis is a continuum, so transposing
 *                    it would put a continuous variable on a band scale — which is why the
 *                    histogram has no C arm.
 *
 * The reference rule and its caption carry over unchanged in all three: in the column arms it is
 * horizontal at the subject's own level, in the bar arm it is vertical at the same value. The
 * comparison the beat exists to make survives the transposition, which is part of what is being
 * tested.
 */

import { scaleLinear, scaleBand } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/twin-chart-beat/render-still.mjs";
import { clampPlotHeight, wrap } from "./PortraitHistogram.tsx";

export type Row = { country: string; value: number };
export type RankingArm = "stretch" | "furnished" | "transposed";

const BASE = {
  PAD: 40,
  TITLE: { fontSize: 24, fontWeight: 700, lead: 30 },
  SUBTITLE: { fontSize: 15, fontWeight: 400, lead: 20 },
  SOURCE: { fontSize: 14, fontWeight: 400 },
  CATEGORY: { fontSize: 13, fontWeight: 400, lead: 16 },
  VALUE: { fontSize: 14, fontWeight: 600 },
  CALLOUT: { fontSize: 14, fontWeight: 400, lead: 18 },
  BODY: { fontSize: 15, fontWeight: 400, lead: 23 },
  BODY_LEAD_IN: { fontSize: 15, fontWeight: 700 },
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
    // The source does not grow with the headline — see `PortraitHistogram.tsx`'s note.
    SOURCE: { ...BASE.SOURCE, fontSize: sp(BASE.SOURCE.fontSize) },
    CATEGORY: {
      ...BASE.CATEGORY,
      fontSize: sp(BASE.CATEGORY.fontSize),
      lead: sp(BASE.CATEGORY.lead),
    },
    VALUE: { ...BASE.VALUE, fontSize: sp(BASE.VALUE.fontSize) },
    CALLOUT: {
      ...BASE.CALLOUT,
      fontSize: sp(BASE.CALLOUT.fontSize),
      lead: sp(BASE.CALLOUT.lead),
    },
    BODY: {
      ...BASE.BODY,
      fontSize: hp(BASE.BODY.fontSize),
      lead: hp(BASE.BODY.lead),
    },
    BODY_LEAD_IN: {
      ...BASE.BODY_LEAD_IN,
      fontSize: hp(BASE.BODY_LEAD_IN.fontSize),
    },
  };
}

const REFERENCE_DASH = "5 4";

/** Billion tonnes: one decimal above 1, two below — the beat's own rule, so ranks 9 and 10 do not
 *  print the same number in a chart whose whole job is a ranking. */
export function formatValue(v: number): string {
  return v >= 1 ? v.toFixed(1) : v.toFixed(2);
}

export function PortraitRanking({
  rows,
  title,
  subtitle,
  source,
  notes,
  alt,
  ground,
  accent,
  subject,
  callout,
  width,
  height,
  typeScale,
  headerScale,
  arm,
  plotAspectRange,
}: {
  rows: Row[];
  title: string;
  subtitle: string;
  source: string;
  notes: { lead: string; body: string }[];
  alt: string;
  ground: string;
  accent: string;
  subject: string;
  callout: { value: number; text: string };
  width: number;
  height: number;
  typeScale: number;
  headerScale: number;
  arm: RankingArm;
  plotAspectRange: [number, number];
}) {
  if (rows.length < 3)
    throw new Error(
      `a ranking beat needs at least three rows, got ${rows.length}`,
    );
  if (!rows.some((r) => r.country === subject))
    throw new Error(
      `subject ${JSON.stringify(subject)} is not one of the rows drawn`,
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const {
    sp,
    PAD,
    TITLE,
    SUBTITLE,
    SOURCE,
    CATEGORY,
    VALUE,
    CALLOUT,
    BODY,
    BODY_LEAD_IN,
  } = tokens(typeScale, headerScale);

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const subtitleTop =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + sp(26);
  const subtitleLines = wrap(subtitle, width - PAD * 2, SUBTITLE);
  const sourceBaseline =
    subtitleTop + (subtitleLines.length - 1) * SUBTITLE.lead + sp(24);
  // The source WRAPS. It was one unwrapped run copied from the beat, where a 14px string fits a
  // 900-wide frame; at `headerScale` 1.75 the same string is 25px and ran 38px past the frame's
  // right edge in the furnished arms. Caught by the clipping counter, which is what it is for.
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  const plotTop =
    sourceBaseline + (sourceLines.length - 1) * SUBTITLE.lead + sp(46);

  // The same three corrections as the other two components, made identically rather than imported.
  const LEAD_GAP = sp(10);
  const NOTE_GAP = sp(14);
  const noteLines =
    arm === "stretch"
      ? []
      : notes.map((n) => ({
          lead: n.lead,
          indent: measureText(n.lead, BODY_LEAD_IN) + LEAD_GAP,
          lines: wrap(
            n.body,
            width - PAD * 2 - measureText(n.lead, BODY_LEAD_IN) - LEAD_GAP,
            BODY,
          ),
        }));
  const noteInnerHeight =
    noteLines.length === 0
      ? 0
      : noteLines.reduce((s, n) => s + n.lines.length * BODY.lead, 0) +
        (noteLines.length - 1) * NOTE_GAP;
  const noteBlockHeight = noteLines.length === 0 ? 0 : noteInnerHeight + sp(60);
  /** The block sits on the frame's bottom margin — the source is up in the header here, so nothing
   *  sits below it. */
  const noteBlockLastBaseline = height - PAD;
  const noteBlockFirstBaseline =
    noteBlockLastBaseline - noteInnerHeight + BODY.lead;
  const noteRuleY = noteBlockFirstBaseline - BODY.fontSize - sp(26);

  const maxValue = Math.max(...rows.map((r) => r.value));

  // ------------------------------------------------------------------ the two drawings
  if (arm === "transposed") {
    // HORIZONTAL BARS. The vertical extent is ROW-DRIVEN — ten bands, whatever height they need —
    // not a plot aspect clamped into a range. That is the point of the arm: a tall frame is this
    // drawing's native shape, so there is no leftover to reclaim and no distortion to cap. The
    // category gutter and the value gutter are both MEASURED from the widest string that will be
    // drawn in them.
    const labelWidth = Math.max(
      ...rows.map((r) => measureText(r.country, CATEGORY)),
    );
    const valueWidth = Math.max(
      ...rows.map((r) => measureText(formatValue(r.value), VALUE)),
    );
    const left = PAD + labelWidth + sp(14);
    const right = PAD + valueWidth + sp(12);
    const calloutLines = wrap(callout.text, width - PAD * 2, CALLOUT);
    const calloutHeight = calloutLines.length * CALLOUT.lead + sp(16);
    const bottom =
      PAD + SOURCE.fontSize + sp(18) + noteBlockHeight + calloutHeight;
    const plot = {
      left,
      top: plotTop,
      right: width - right,
      bottom: height - bottom,
    };

    const x = scaleLinear()
      .domain([0, maxValue])
      .range([plot.left, plot.right]);
    const y = scaleBand()
      .domain(rows.map((r) => r.country))
      .range([plot.top, plot.bottom])
      .paddingInner(0.34)
      .paddingOuter(0.1);

    const referenceX = x(callout.value);
    let noteCursor = noteBlockFirstBaseline;

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
        {subtitleLines.map((line, i) => (
          <text
            key={line}
            x={PAD}
            y={subtitleTop + i * SUBTITLE.lead}
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

        {rows.map((r) => {
          const isSubject = r.country === subject;
          const bandTop = y(r.country)!;
          const centre = bandTop + y.bandwidth() / 2;
          return (
            <g key={r.country}>
              <rect
                x={plot.left}
                y={bandTop}
                width={x(r.value) - plot.left}
                height={y.bandwidth()}
                fill={isSubject ? accent : muted}
              />
              {/* The category reads left to right on its own line, never rotated and never wrapped:
                  a horizontal bar chart's whole ergonomic advantage is that a long country name
                  costs a gutter, not a tilted head. */}
              <text
                x={plot.left - sp(14)}
                y={centre + sp(5)}
                fill={ink}
                fontSize={CATEGORY.fontSize}
                textAnchor="end"
              >
                {r.country}
              </text>
              <text
                x={x(r.value) + sp(12)}
                y={centre + sp(5)}
                fill={ink}
                fontSize={VALUE.fontSize}
                fontWeight={VALUE.fontWeight}
              >
                {formatValue(r.value)}
              </text>
            </g>
          );
        })}

        <line
          x1={referenceX}
          x2={referenceX}
          y1={plot.top}
          y2={plot.bottom}
          stroke={accent}
          strokeWidth={1.5}
          strokeDasharray={REFERENCE_DASH}
        />
        <line
          x1={plot.left}
          x2={plot.left}
          y1={plot.top}
          y2={plot.bottom}
          stroke={ink}
          strokeWidth={1}
        />
        {calloutLines.map((line, i) => (
          <text
            key={line}
            x={PAD}
            y={plot.bottom + sp(28) + i * CALLOUT.lead}
            fill={ink}
            fontSize={CALLOUT.fontSize}
          >
            {line}
          </text>
        ))}

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

  // COLUMNS — arms A and B.
  const provisionalBand = ((width - PAD * 2) / rows.length) * 0.72;
  const wrapped = rows.map((r) => ({
    country: r.country,
    lines: wrap(r.country, provisionalBand, CATEGORY),
  }));
  const deepestLabel = Math.max(...wrapped.map((w) => w.lines.length));
  const categoryBand = sp(10) + deepestLabel * CATEGORY.lead;

  const left = PAD;
  const right = PAD;
  const plotWidth = width - left - right;
  const floorLimit =
    height - PAD - SOURCE.fontSize - sp(18) - noteBlockHeight - categoryBand;
  const plotHeight =
    arm === "stretch"
      ? floorLimit - plotTop
      : clampPlotHeight(floorLimit - plotTop, plotWidth, plotAspectRange);
  const plot = {
    left,
    top: plotTop,
    right: width - right,
    bottom: plotTop + plotHeight,
  };

  const y = scaleLinear().domain([0, maxValue]).range([plot.bottom, plot.top]);
  const x = scaleBand()
    .domain(rows.map((r) => r.country))
    .range([plot.left, plot.right])
    .paddingInner(0.28)
    .paddingOuter(0.14);
  const columns = rows.map((r) => ({
    country: r.country,
    value: r.value,
    x: x(r.country)!,
    width: x.bandwidth(),
    y: y(r.value),
    height: plot.bottom - y(r.value),
  }));

  const referenceY = y(callout.value);
  const subjectColumn = columns.find((c) => c.country === subject)!;
  const calloutX = subjectColumn.x + subjectColumn.width + sp(14);
  const calloutLines = wrap(callout.text, plot.right - calloutX, CALLOUT);
  let noteCursor = noteBlockFirstBaseline;

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
      {subtitleLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={subtitleTop + i * SUBTITLE.lead}
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

      {columns.map((c) => {
        const isSubject = c.country === subject;
        const lines = wrapped.find((w) => w.country === c.country)!.lines;
        return (
          <g key={c.country}>
            <rect
              x={c.x}
              y={c.y}
              width={c.width}
              height={c.height}
              fill={isSubject ? accent : muted}
            />
            <text
              x={c.x + c.width / 2}
              y={c.y - sp(8)}
              fill={ink}
              fontSize={VALUE.fontSize}
              fontWeight={VALUE.fontWeight}
              textAnchor="middle"
            >
              {formatValue(c.value)}
            </text>
            {lines.map((line, i) => (
              <text
                key={line}
                x={c.x + c.width / 2}
                y={plot.bottom + sp(18) + i * CATEGORY.lead}
                fill={ink}
                fontSize={CATEGORY.fontSize}
                textAnchor="middle"
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}

      <line
        x1={plot.left}
        x2={plot.right}
        y1={referenceY}
        y2={referenceY}
        stroke={accent}
        strokeWidth={1.5}
        strokeDasharray={REFERENCE_DASH}
      />
      {calloutLines.map((line, i) => (
        <text
          key={line}
          x={calloutX}
          y={referenceY - sp(12) - (calloutLines.length - 1 - i) * CALLOUT.lead}
          fill={ink}
          fontSize={CALLOUT.fontSize}
        >
          {line}
        </text>
      ))}
      <line
        x1={plot.left}
        x2={plot.right}
        y1={plot.bottom}
        y2={plot.bottom}
        stroke={ink}
        strokeWidth={1}
      />

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
