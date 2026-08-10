/**
 * PORTRAIT PROBE — the histogram, drawn three ways in the same 1080x1920 frame.
 *
 * A copy of `../static-carbon-footprint-spread/probe/ProbeHistogram.tsx`, which is itself a copy of
 * the beat. Nothing ships from here and no production component is touched: this file exists so the
 * three arms differ in exactly ONE decision each and can be laid side by side.
 *
 *   arm "stretch"  — A. The plot fills whatever height is left. What the tool draws today.
 *   arm "capped"   — B0, the control. The plot is clamped into the aspect range the type's own
 *                    accepted renders demonstrate; the leftover height is left EMPTY. This arm is
 *                    here so that the eye can separate "the aspect was fixed" from "more words were
 *                    added" — B changes both, and a comparison that cannot attribute its own result
 *                    is worth nothing.
 *   arm "furnished"— B, the hypothesis. Same clamp, plus the leftover height spent on editorial
 *                    furniture: a larger title, a developed standfirst, unfolded annotations.
 *
 * Everything else — the palette, the data, the bins, the median rule, the gutters, the wrap — is
 * identical across the three.
 */

import { scaleLinear } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/twin-chart-beat/render-still.mjs";

export type Bin = { lo: number; hi: number; count: number };
export type Arm = "stretch" | "capped" | "furnished";

const BASE = {
  PAD: 40,
  TITLE: { fontSize: 25, fontWeight: 700, lead: 32 },
  SUBTITLE: { fontSize: 14, fontWeight: 400, lead: 20 },
  SOURCE: { fontSize: 14, fontWeight: 400 },
  AXIS: { fontSize: 13, fontWeight: 400 },
  AXIS_TITLE: { fontSize: 13, fontWeight: 600 },
  NOTE: { fontSize: 13, fontWeight: 700 },
  /** The unfolded-annotation block. Only drawn by the "furnished" arm. */
  BODY: { fontSize: 15, fontWeight: 400, lead: 23 },
  BODY_LEAD_IN: { fontSize: 15, fontWeight: 700 },
};

/**
 * `typeScale` sizes the PLOT's own furniture (axes, marks, gutters); `headerScale` sizes the
 * editorial block. They are the same number in every arm but "furnished", where the hypothesis is
 * precisely that a story frame carries a bigger headline. Keeping them separate is what lets the
 * probe say which of the two changes did the work.
 */
export function tokens(typeScale: number, headerScale: number) {
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
    // THE SOURCE DOES NOT GROW WITH THE HEADLINE, and this is a finding rather than a preference.
    // The first furnished render put `headerScale` through the whole header block: the title went
    // to 44px, and so did the source, which then read as a second standfirst line and competed
    // with the argument. What the leftover height buys is a bigger TITLE — one multiplier for the
    // whole header block is the wrong shape for the rule.
    SOURCE: { ...BASE.SOURCE, fontSize: sp(BASE.SOURCE.fontSize) },
    AXIS: { ...BASE.AXIS, fontSize: sp(BASE.AXIS.fontSize) },
    AXIS_TITLE: { ...BASE.AXIS_TITLE, fontSize: sp(BASE.AXIS_TITLE.fontSize) },
    NOTE: { ...BASE.NOTE, fontSize: sp(BASE.NOTE.fontSize) },
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

export function wrap(
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

/** Unchanged from the beat: bins to bar rectangles on the variable's own unit, zero-anchored. */
export function histogramGeometry(
  bins: Bin[],
  {
    width,
    height,
    padding,
    yTickHint,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    yTickHint: number;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const x = scaleLinear()
    .domain([bins[0].lo, bins[bins.length - 1].hi])
    .range([plot.left, plot.right]);
  const y = scaleLinear()
    .domain([0, Math.max(...bins.map((b) => b.count))])
    .nice()
    .range([plot.bottom, plot.top]);
  const bars = bins.map((b) => ({
    lo: b.lo,
    hi: b.hi,
    count: b.count,
    x: x(b.lo),
    width: x(b.hi) - x(b.lo),
    y: y(b.count),
    height: y(0) - y(b.count),
  }));
  return {
    plot,
    bars,
    x,
    y,
    ticksY: y.ticks(yTickHint).map((v) => ({ value: v, y: y(v) })),
  };
}

/**
 * THE ONE NEW RULE UNDER TEST, in four lines.
 *
 * The frame's aspect and the plot's aspect are two different things. A plot that fills its frame
 * inherits the frame's aspect; this instead clamps the plot into the range the TYPE's geometry
 * supports and hands the leftover height back to the caller to spend on words.
 *
 * `[min, max]` are width:height. The range is not invented here — `portrait-probe.mjs` derives it
 * by rendering this same component, in "stretch" arm, at the three frames this project has already
 * looked at and accepted, and taking the extremes of what those renders measured.
 */
export function clampPlotHeight(
  availableHeight: number,
  plotWidth: number,
  range: [number, number],
): number {
  const [min, max] = range;
  const tallest = plotWidth / min;
  const shortest = plotWidth / max;
  return Math.max(shortest, Math.min(tallest, availableHeight));
}

export function PortraitHistogram({
  bins,
  title,
  limits,
  source,
  notes,
  alt,
  ground,
  accent,
  median,
  medianLabel,
  width,
  height,
  typeScale,
  headerScale,
  arm,
  plotAspectRange,
  yTickHint = 5,
}: {
  bins: Bin[];
  title: string;
  limits: string;
  source: string;
  /** Facts computed by the runner from the frozen data. Drawn only by the "furnished" arm. */
  notes: { lead: string; body: string }[];
  alt: string;
  ground: string;
  accent: string;
  median: number;
  medianLabel: string;
  width: number;
  height: number;
  typeScale: number;
  headerScale: number;
  arm: Arm;
  plotAspectRange: [number, number];
  yTickHint?: number;
}) {
  if (bins.length < 3)
    throw new Error(
      "a histogram beat needs at least three bins to show a shape, got " +
        bins.length,
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const {
    sp,
    PAD,
    TITLE,
    SUBTITLE,
    SOURCE,
    AXIS,
    AXIS_TITLE,
    NOTE,
    BODY,
    BODY_LEAD_IN,
  } = tokens(typeScale, headerScale);

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const limitsLines = wrap(limits, width - PAD * 2, SUBTITLE);
  const limitsBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + sp(28);
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  const sourceBaseline =
    limitsBaseline + (limitsLines.length - 1) * SUBTITLE.lead + sp(22);
  const plotTop =
    sourceBaseline + (sourceLines.length - 1) * SUBTITLE.lead + sp(34);

  const tickLabels = scaleLinear()
    .domain([0, Math.max(...bins.map((b) => b.count))])
    .nice()
    .ticks(yTickHint)
    .map((v, i, all) => (i === all.length - 1 ? `${v} countries` : `${v}`));

  const left =
    PAD + sp(10) + Math.max(...tickLabels.map((l) => measureText(l, AXIS)));
  const right = PAD + sp(8);
  const plotWidth = width - left - right;

  // The band under the plot that the x tick labels and the axis title occupy — identical in every
  // arm, so the only thing that moves between them is where the plot's FLOOR sits.
  const axisBand = sp(24) + AXIS_TITLE.fontSize + sp(6);

  // The annotation block, laid out before the plot because the plot gets what is left after it.
  //
  // `LEAD_GAP` is a measured defect, not a taste: the first furnished render printed
  // "The bulk.127 of the 213 countries" as one word, because the gutter was measured as
  // `measureText(lead + " ")` and a trailing space has no INK — resvg's box stops at the full
  // stop. The air after a lead-in has to be asked for explicitly.
  const LEAD_GAP = sp(10);
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
  const NOTE_GAP = sp(14);
  /** The block's own ink height: every line, plus the air between the notes. */
  const noteInnerHeight =
    noteLines.length === 0
      ? 0
      : noteLines.reduce((sum, n) => sum + n.lines.length * BODY.lead, 0) +
        (noteLines.length - 1) * NOTE_GAP;
  const noteBlockHeight = noteLines.length === 0 ? 0 : noteInnerHeight + sp(60);

  const floorLimit = height - PAD - noteBlockHeight - axisBand;
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

  const { plot, bars, x, ticksY } = histogramGeometry(bins, {
    width,
    height,
    padding,
    yTickHint,
  });
  const medianX = x(median);
  const axisTitleBaseline = plot.bottom + sp(24) + sp(6) + AXIS_TITLE.fontSize;

  // THE ANNOTATION BLOCK SITS ON THE FRAME'S BOTTOM MARGIN, not directly under the axis. The plot
  // is clamped, the notes are as long as the data made them, and the two rarely add up to exactly
  // 1920 — the first furnished render left ~28% of the frame blank BELOW the notes, which reads as
  // a graphic that failed to finish. Anchored to `height - PAD`, the same slack becomes air between
  // the chart and its commentary, which reads as a section break. Same rule as the source's own
  // bottom-margin anchor in `static-discipline.md`, applied to the block under it.
  const noteBlockLastBaseline = height - PAD;
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
            x={plot.left - sp(10)}
            y={tick.y + sp(4)}
            fill={muted}
            fontSize={AXIS.fontSize}
            textAnchor="end"
          >
            {tickLabels[i]}
          </text>
        </g>
      ))}

      {bars.map((b) => (
        <rect
          key={b.lo}
          x={b.x}
          y={b.y}
          width={Math.max(b.width - 1, 0)}
          height={b.height}
          fill={muted}
        />
      ))}
      {bars.map((b) => (
        <text
          key={`label-${b.lo}`}
          x={b.x}
          y={plot.bottom + sp(20)}
          fill={muted}
          fontSize={AXIS.fontSize}
          textAnchor="middle"
        >
          {b.lo}
        </text>
      ))}
      <text
        x={plot.right}
        y={plot.bottom + sp(20)}
        fill={muted}
        fontSize={AXIS.fontSize}
        textAnchor="middle"
      >
        {bins[bins.length - 1].hi}
      </text>
      <text
        x={(plot.left + plot.right) / 2}
        y={axisTitleBaseline}
        fill={muted}
        fontSize={AXIS_TITLE.fontSize}
        fontWeight={AXIS_TITLE.fontWeight}
        textAnchor="middle"
      >
        CO2 emissions per capita (tonnes/year)
      </text>

      <line
        x1={medianX}
        x2={medianX}
        y1={plot.top}
        y2={plot.bottom}
        stroke={accent}
        strokeWidth={2}
        strokeDasharray="6 4"
      />
      <text
        x={medianX + sp(8)}
        y={plot.top + sp(16)}
        fill={ink}
        fontSize={NOTE.fontSize}
        fontWeight={NOTE.fontWeight}
      >
        {medianLabel}
      </text>

      {/* THE LEFTOVER, SPENT. Each note is a fact the runner computed from the frozen file: at
          landscape these would be a subtitle clause or nothing at all, and the portrait frame is
          what gives them room to be said in full. */}
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
