/**
 * MOBILE-FIRST PROBE — the line, composed from the phone.
 *
 * The sibling of `MobileFirstHistogram.tsx`, implementing the same `MOBILE-FIRST-WIREFRAME.md`.
 * The scale, the stage and the solve-the-plot-from-the-budget rule are DUPLICATED here rather than
 * imported — the twin's method is that a skill stays copy-pasteable on its own, so the answer to
 * "make this true for two types" is the same change made twice with a parity test, never a shared
 * module. `mobile-first-probe.mjs` asserts the two copies agree on the scale and on the stage.
 *
 * Where the two types genuinely differ, they differ, and the difference is the interesting part:
 *
 *   - a line has NO axis title, so the histogram's cheapest rung does not exist here;
 *   - a line's readings cannot be thinned without changing the series, so the histogram's
 *     reclassification rung does not exist here either;
 *   - which leaves the line with four rungs where the histogram has six, and a line that does not
 *     fit reaches REFUSAL sooner. That is a result about the type, not a gap in the file.
 *
 * The end label is the one place this file redraws rather than removes. At article sizes the seed
 * puts "the sample town 596 mm" in a right-hand gutter; at 42 frame px that gutter is over 400 px
 * wide, which is half the plot. On a phone the label goes ABOVE the final point, right-aligned to
 * the plot's own edge, and the gutter disappears.
 */

import { extent, tickStep } from "d3-array";
import { scaleLinear } from "d3-scale";
import { line as d3Line } from "d3-shape";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/chart-beat/render-still.mjs";
import type { Reading } from "./PortraitLine.tsx";

/** The scale, COPIED from `MobileFirstHistogram.tsx` rather than imported. That is the twin's
 *  method and not an accident: a craft skill has to stay copy-pasteable on its own, so the answer
 *  to "make this true for N types" is the same change made N times with a walking parity test.
 *  `mobile-first-probe.mjs` compares this object against the histogram's field by field and fails
 *  loud on any drift; changing one number here and not there turns the probe red. */
export const MOBILE_FIRST_SCALE = {
  FLOOR: 36,
  PAD: 72,
  TITLE: { fontSize: 72, fontWeight: 700, lead: 86 },
  STANDFIRST: { fontSize: 48, fontWeight: 400, lead: 62 },
  BODY: { fontSize: 48, fontWeight: 400, lead: 62 },
  BODY_LEAD_IN: { fontSize: 48, fontWeight: 700 },
  LABEL: { fontSize: 42, fontWeight: 600 },
  AXIS: { fontSize: 39, fontWeight: 400 },
  AXIS_TITLE: { fontSize: 39, fontWeight: 600 },
  SOURCE: { fontSize: 36, fontWeight: 400 },
};

/** Copied for the same reason. */
export function wrapAt(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const trial = line ? `${line} ${word}` : word;
    if (line && measureText(trial, font) > maxWidth) {
      out.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...out, line] : out;
}

export type LineRung =
  | "R2 value-axis ticks 5 to 3"
  | "R2b year ticks reduced to first, middle, last"
  | "R3 standfirst sentence dropped"
  | "R4 annotation dropped"
  | "R7 standfirst removed entirely";

/** The rungs `MOBILE-FIRST-WIREFRAME.md` §4 lists that this type cannot offer, with the reason.
 *  Printed by the runner so a missing rung is a stated fact rather than an absence. */
export const LINE_RUNGS_UNAVAILABLE = [
  "R0 transpose — a line's x axis is time, and Horak et al. 2021 §2.4.2: 'Line charts also resist rotation, due to the convention that the horizontal axis represents time proceeding from left to right'",
  "R1 axis title — this type draws none; its unit rides a caption above the axis, which the ladder never removes because it is the only statement of what the numbers are",
  "R5 end label reduced to the value alone — there is nothing left to reduce: the portrait frame uses the SHORT form by default. 'the sample town 604 mm' repeats a subject the title already names, and at 42 frame px it is 500 px of ink laid across the series it is labelling",
  "R6 reclassify — thinning eleven annual readings changes the series the claim is about, not its presentation",
];

/** Copied from `MobileFirstHistogram.tsx` for the reason stated at the top of this file: a ladder
 *  may drop a whole sentence and may never cut one in half. */
export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const AIR = {
  TITLE_TO_STANDFIRST: 30,
  STANDFIRST_TO_UNIT: 60,
  // The unit caption has to clear a tick label sitting ON the plot's top edge, which is where
  // `.nice()` puts this series' 950. At 16 the two overlapped by 11 px and neither the clip counter
  // nor the collision counter saw it, because both compare text with the FRAME and text with TEXT
  // — and these two are text with text, but the earlier run measured them before the caption
  // existed. 40 clears the tick's own ascent.
  UNIT_TO_PLOT: 40,
  PLOT_TO_TICKS: 46,
  AXIS_TO_NOTES: 44,
  RULE_TO_NOTE: 34,
  NOTE_TO_NOTE: 22,
  NOTES_TO_SOURCE: 34,
  Y_TICK_INSET: 14,
  END_LABEL_LIFT: 30,
};

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

type State = {
  yTickCount: number;
  xTickCount: number;
  standfirstSentences: number;
  noteCount: number;
};

export type LineLayout = {
  fired: LineRung[];
  unavailable: string[];
  refused: string | null;
  state: State;
  blockHeight: number;
  plotHeight: number;
  plotWidth: number;
  minPlotHeight: number;
  maxPlotHeight: number;
};

export function PortraitMobileFirstLine({
  data,
  title,
  standfirst,
  source,
  notes,
  alt,
  ground,
  accent,
  unit,
  width,
  height,
  safeTop,
  safeBottom,
  plotAspectRange,
  onLayout,
}: {
  data: Reading[];
  title: string;
  standfirst: string;
  source: string;
  notes: { lead: string; body: string }[];
  alt: string;
  ground: string;
  accent: string;
  unit: string;
  width: number;
  height: number;
  safeTop: number;
  safeBottom: number;
  plotAspectRange: [number, number];
  onLayout?: (layout: LineLayout) => void;
}) {
  const present = data.filter(
    (d): d is { year: number; value: number } => d.value !== null,
  );
  if (present.length < 2)
    throw new Error(
      "a line beat needs at least two readings, got " + present.length,
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const k = width / 1080;
  const px = (v: number) => Math.round(v * k);
  const font = (f: {
    fontSize: number;
    fontWeight: number;
    lead?: number;
  }) => ({
    ...f,
    fontSize: px(f.fontSize),
    ...(f.lead === undefined ? {} : { lead: px(f.lead) }),
  });
  const S = MOBILE_FIRST_SCALE;
  const TITLE = font(S.TITLE) as {
    fontSize: number;
    fontWeight: number;
    lead: number;
  };
  const STANDFIRST = font(S.STANDFIRST) as {
    fontSize: number;
    fontWeight: number;
    lead: number;
  };
  const BODY = font(S.BODY) as {
    fontSize: number;
    fontWeight: number;
    lead: number;
  };
  const BODY_LEAD_IN = font(S.BODY_LEAD_IN);
  const LABEL = font(S.LABEL);
  const AXIS = font(S.AXIS);
  const SOURCE = font(S.SOURCE);
  const PAD = px(S.PAD);
  const air = Object.fromEntries(
    Object.entries(AIR).map(([key, v]) => [key, px(v)]),
  ) as Record<keyof typeof AIR, number>;

  const stageTop = safeTop;
  const stageHeight = safeBottom - safeTop;
  const contentWidth = width - PAD * 2;
  const [minAspect, maxAspect] = plotAspectRange;
  const last = present[present.length - 1];

  function layoutFor(state: State) {
    // The unit rides a caption above the axis rather than the topmost tick — same measured reason as
    // the histogram's: appending it widened the left gutter, and the gutter is subtracted from the
    // plot's width, which is what the plot's own height floor is computed from.
    const yTickLabels = yScale(data)
      .ticks(state.yTickCount)
      .map((v) => `${v}`);
    const left =
      PAD +
      air.Y_TICK_INSET +
      Math.max(...yTickLabels.map((l) => measureText(l, AXIS)));
    // No right gutter: the end label sits ABOVE the final point, inside the plot's own width.
    const plotWidth = width - left - PAD;
    const minPlotHeight = plotWidth / maxAspect;
    const maxPlotHeight = plotWidth / minAspect;

    const titleLines = wrapAt(title, contentWidth, TITLE);
    const titleHeight = TITLE.fontSize + (titleLines.length - 1) * TITLE.lead;
    const standfirstLines = wrapAt(
      sentences(standfirst).slice(0, state.standfirstSentences).join(" "),
      contentWidth,
      STANDFIRST,
    );
    const standfirstHeight =
      standfirstLines.length === 0
        ? 0
        : STANDFIRST.fontSize + (standfirstLines.length - 1) * STANDFIRST.lead;

    const axisBand = air.PLOT_TO_TICKS + AXIS.fontSize;

    const noteBlocks = notes.slice(0, state.noteCount).map((n) => {
      const indent = measureText(n.lead, BODY_LEAD_IN) + px(12);
      return {
        lead: n.lead,
        indent,
        lines: wrapAt(n.body, contentWidth - indent, BODY),
      };
    });
    const notesHeight =
      noteBlocks.length === 0
        ? 0
        : air.AXIS_TO_NOTES +
          air.RULE_TO_NOTE +
          noteBlocks.reduce((s, n) => s + n.lines.length * BODY.lead, 0) +
          (noteBlocks.length - 1) * air.NOTE_TO_NOTE;

    const fixed =
      titleHeight +
      (standfirstHeight === 0
        ? 0
        : air.TITLE_TO_STANDFIRST + standfirstHeight) +
      air.STANDFIRST_TO_UNIT +
      AXIS.fontSize +
      air.UNIT_TO_PLOT +
      axisBand +
      notesHeight +
      air.NOTES_TO_SOURCE +
      SOURCE.fontSize;

    const solved = stageHeight - fixed;
    const plotHeight = Math.min(solved, maxPlotHeight);
    return {
      yTickLabels,
      left,
      plotWidth,
      minPlotHeight,
      maxPlotHeight,
      titleLines,
      standfirstLines,
      noteBlocks,
      fixed,
      solved,
      plotHeight,
      blockHeight: fixed + plotHeight,
      fits: solved >= minPlotHeight,
    };
  }

  const state: State = {
    yTickCount: Y_TICK_HINT,
    xTickCount: X_TICK_HINT,
    standfirstSentences: sentences(standfirst).length,
    noteCount: notes.length,
  };
  const fired: LineRung[] = [];
  let L = layoutFor(state);
  const rungs: [LineRung, () => boolean][] = [
    [
      "R2 value-axis ticks 5 to 3",
      () => (state.yTickCount > 3 ? ((state.yTickCount = 3), true) : false),
    ],
    [
      "R2b year ticks reduced to first, middle, last",
      () => (state.xTickCount > 3 ? ((state.xTickCount = 3), true) : false),
    ],
    [
      "R3 standfirst sentence dropped",
      () =>
        state.standfirstSentences > 1
          ? ((state.standfirstSentences -= 1), true)
          : false,
    ],
    [
      "R4 annotation dropped",
      () => (state.noteCount > 0 ? ((state.noteCount -= 1), true) : false),
    ],
    // Separated from R3 by two rungs, for the reason stated in `MobileFirstHistogram.tsx`:
    // reducing a standfirst is cheap, deleting it is the last thing tried before refusing.
    [
      "R7 standfirst removed entirely",
      () =>
        state.standfirstSentences > 0
          ? ((state.standfirstSentences = 0), true)
          : false,
    ],
  ];
  for (const [name, apply] of rungs) {
    // A rung that recovers nothing does not fire — the same guard as the histogram's, copied, for
    // the reason stated there: the first run dropped a label that frees no vertical budget at all.
    while (!L.fits) {
      const before = { ...state };
      // The gain is measured as SLACK — height available minus the height the plot needs at the
      // current width — not as height alone. Measuring height alone judged R2 useless: reducing the
      // tick count frees no vertical space at all, it narrows the left gutter, which widens the plot
      // and LOWERS its height floor. Both halves are slack.
      const gainedFrom = L.solved - L.minPlotHeight;
      if (!apply()) break;
      const next = layoutFor(state);
      if (next.solved - next.minPlotHeight <= gainedFrom + 0.5) {
        Object.assign(state, before);
        break;
      }
      fired.push(name);
      L = next;
    }
    if (L.fits) break;
  }
  const refused = L.fits
    ? null
    : `portrait refused: after every rung the stage still leaves ${Math.round(L.solved)}px for a plot that needs at least ${Math.round(L.minPlotHeight)}px at this width. Offer square or landscape.`;
  onLayout?.({
    fired,
    unavailable: LINE_RUNGS_UNAVAILABLE,
    refused,
    state: { ...state },
    blockHeight: Math.round(L.blockHeight),
    plotHeight: Math.round(L.plotHeight),
    plotWidth: Math.round(L.plotWidth),
    minPlotHeight: Math.round(L.minPlotHeight),
    maxPlotHeight: Math.round(L.maxPlotHeight),
  });
  if (refused) throw new Error(refused);

  const top = stageTop + Math.max(0, (stageHeight - L.blockHeight) / 2);
  const titleBaseline = top + TITLE.fontSize;
  const standfirstBaseline =
    titleBaseline +
    (L.titleLines.length - 1) * TITLE.lead +
    air.TITLE_TO_STANDFIRST +
    STANDFIRST.fontSize;
  const headerBottom =
    L.standfirstLines.length === 0
      ? titleBaseline + (L.titleLines.length - 1) * TITLE.lead
      : standfirstBaseline + (L.standfirstLines.length - 1) * STANDFIRST.lead;

  const unitBaseline = headerBottom + air.STANDFIRST_TO_UNIT + AXIS.fontSize;
  const plot = {
    left: L.left,
    right: width - PAD,
    top: unitBaseline + air.UNIT_TO_PLOT,
    bottom: unitBaseline + air.UNIT_TO_PLOT + L.plotHeight,
  };

  const years = data.map((d) => d.year);
  const [firstYear, lastYear] = [Math.min(...years), Math.max(...years)];
  const x = scaleLinear()
    .domain([firstYear, lastYear])
    .range([plot.left, plot.right]);
  const y = yScale(data).range([plot.bottom, plot.top]);
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

  const step = tickStep(firstYear, lastYear, state.xTickCount);
  const xTicks: number[] = [];
  for (
    let year = Math.ceil(firstYear / step) * step;
    year <= lastYear;
    year += step
  )
    xTicks.push(year);
  const ticksY = yScale(data)
    .ticks(state.yTickCount)
    .map((value) => ({ value, y: y(value) }));
  const end = points.findLast((p) => p.value !== null)!;
  // THE SHORT FORM IS THE DEFAULT IN PORTRAIT, not a rung the ladder reaches when it is desperate.
  // `subject` is "the sample town" and the title is "Rainfall over the sample town fell by a
  // third": the long form repeats the headline's own subject and costs 500 px of the plot's width
  // to do it. The subject is carried once, where a reader reads it first.
  const endLabel = `${last.value} ${unit}`;

  // THE END LABEL IS PLACED AGAINST THE PATH, NOT AGAINST THE LAST POINT. Right-aligned to the
  // plot's edge and lifted a fixed amount above the final dot, it sat ON the line — the segments
  // that run under the label are higher than the point it was measured from. The instrument could
  // not see it either: the collision counter compares TEXT with TEXT, so ink over a path scores
  // zero. So the lift is taken from the highest thing the label actually spans.
  const labelLeft = plot.right - measureText(endLabel, LABEL);
  const spanned = points
    .filter((p) => p.y !== null && p.x >= labelLeft - px(20))
    .map((p) => p.y as number);
  const endLabelBaseline = Math.max(
    plot.top + LABEL.fontSize,
    (spanned.length > 0 ? Math.min(...spanned) : (end.y as number)) -
      air.END_LABEL_LIFT,
  );

  const tickBaseline = plot.bottom + air.PLOT_TO_TICKS;
  const noteRuleY = tickBaseline + air.AXIS_TO_NOTES;
  let noteCursor = noteRuleY + air.RULE_TO_NOTE;

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

      {L.titleLines.map((line, i) => (
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
      {L.standfirstLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={standfirstBaseline + i * STANDFIRST.lead}
          fill={muted}
          fontSize={STANDFIRST.fontSize}
        >
          {line}
        </text>
      ))}

      <text
        x={PAD}
        y={unitBaseline}
        fill={muted}
        fontSize={AXIS.fontSize}
        fontWeight={600}
      >
        Annual rainfall, {unit}
      </text>

      {ticksY.map((tick, i) => (
        <g key={tick.value}>
          <line
            x1={plot.left}
            x2={plot.right}
            y1={tick.y}
            y2={tick.y}
            stroke={grid}
            strokeWidth={2}
          />
          <text
            x={plot.left - air.Y_TICK_INSET}
            y={tick.y + px(12)}
            fill={muted}
            fontSize={AXIS.fontSize}
            textAnchor="end"
          >
            {L.yTickLabels[i]}
          </text>
        </g>
      ))}
      {xTicks.map((year, i) => (
        <text
          key={year}
          x={x(year)}
          y={tickBaseline}
          fill={muted}
          fontSize={AXIS.fontSize}
          textAnchor={
            i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"
          }
        >
          {year}
        </text>
      ))}

      {gaps.map((gap) => (
        <text
          key={gap.years[0]}
          x={gap.x}
          y={gap.y - px(20)}
          fill={muted}
          fontSize={AXIS.fontSize}
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
        strokeWidth={px(7)}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={end.x} cy={end.y as number} r={px(11)} fill={accent} />
      <text
        x={plot.right}
        y={endLabelBaseline}
        fill={accent}
        fontSize={LABEL.fontSize}
        fontWeight={LABEL.fontWeight}
        textAnchor="end"
      >
        {endLabel}
      </text>

      {L.noteBlocks.length === 0 ? null : (
        <line
          x1={PAD}
          x2={width - PAD}
          y1={noteRuleY}
          y2={noteRuleY}
          stroke={grid}
          strokeWidth={2}
        />
      )}
      {L.noteBlocks.map((note) => {
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
                x={PAD + note.indent}
                y={noteCursor + i * BODY.lead}
                fill={ink}
                fontSize={BODY.fontSize}
              >
                {line}
              </text>
            ))}
          </g>
        );
        noteCursor += note.lines.length * BODY.lead + air.NOTE_TO_NOTE;
        return block;
      })}

      <text
        x={PAD}
        y={
          (L.noteBlocks.length === 0
            ? tickBaseline
            : noteCursor - air.NOTE_TO_NOTE) +
          air.NOTES_TO_SOURCE +
          SOURCE.fontSize
        }
        fill={muted}
        fontSize={SOURCE.fontSize}
      >
        {source}
      </text>
    </svg>
  );
}
