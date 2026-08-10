/**
 * Beat: "Most countries emit under 4 tonnes of CO2 per person" (histogram).
 *
 * Written fresh from `ChartSeed.tsx`'s shape for a type whose bars are contiguous SLICES OF ONE
 * CONTINUUM, not discrete categories (`references/types/histogram.md`) — the sheet's own warning
 * that removing the gap between bars is what tells the reader "this is one variable's shape," and
 * putting a gap back in would lie about contiguity that isn't there. Bar height is a count, so the
 * zero-baseline rule applies exactly as it does to any bar family member.
 */

import { scaleLinear } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  measureTextBand,
  FONT_FAMILY,
} from "#shared/chart-beat/render-still.mjs";
import {
  frameInsetFor,
  sizeFor,
  stageFor,
} from "#shared/chart-beat/sizes.mjs";
import { assertPlotAspect } from "#shared/chart-beat/type-at-size.mjs";
import {
  NON_TEXT_CONTRAST_FLOOR,
  inkBox,
  inkThatReadsOver,
  marksUnder,
  textContrastFloor,
} from "#shared/chart-beat/annotation-ink.mjs";

export type Bin = { lo: number; hi: number; count: number };

/**
 * THE 900x560 TUNING, KEPT AS THE BASE, WITH THE SIZE AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more, and its absence is the point: the frame is
 * `sizeFor(size)`'s, and `size` is the decision gate 2c took, read out of this beat's own
 * `BRIEF.md` by `render.mjs`. Before this, the size was stated TWICE as literals — once here and
 * once in the render script — and `renderStill` compared them against each other, so they agreed
 * by construction and nothing downstream of the gate ever read what the journalist chose.
 *
 * EVERY SPACING NUMBER GOES THROUGH `sp`, not only the fonts. This beat is the one the probe
 * measured: eleven bare literals in its layout arithmetic (`+ 28`, `+ 34`, `+ 8`, `+ 30`, `+ 10`,
 * `+ 16`, `+ 20`, `+ 4`, `+ 8`, and the two inside the median-label placement) are 900x560 tuning
 * under no name, and scaling the type while leaving them collided the title into the subtitle at
 * 1920x1080 by 1634 x 4.5 px. `proof/static-carbon-footprint-spread/probe/VERDICT.md`.
 *
 * `PAD` is the one that does NOT go through it: a frame's margin is proportional to the CANVAS,
 * not to the type — `frameInsetFor` in `sizes.mjs` states the split and why.
 */
const BASE = {
  TITLE: { fontSize: 25, fontWeight: 700, lead: 32 },
  SUBTITLE: { fontSize: 14, fontWeight: 400, lead: 20 },
  SOURCE: { fontSize: 14, fontWeight: 400 },
  AXIS: { fontSize: 13, fontWeight: 400 },
  AXIS_TITLE: { fontSize: 13, fontWeight: 600 },
  NOTE: { fontSize: 13, fontWeight: 700 },
  /** The median rule's own weight and dash. Its INK is not here — it is derived from the marks the
   *  rule crosses, which is the whole point (`annotation-ink.mjs`). */
  MEDIAN_RULE: { width: 2, dash: "6 4" },
  /** The air between the median rule and its label, and between the label and the last bar it had
   *  to clear. One number, used for both, because it is the same gap doing the same job. */
  MEDIAN_LABEL_GAP: 8,
  TITLE_TO_SUBTITLE: 28,
  HEADER_TO_PLOT: 34,
  AXIS_TITLE_TO_SOURCE: 8,
  X_TICK_DROP: 20,
  X_LABEL_BAND: 30,
  Y_TICK_INSET: 10,
  Y_TICK_BASELINE_NUDGE: 4,
  PLOT_RIGHT_AIR: 8,
  MEDIAN_LABEL_DROP: 16,
};

function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  const f = <T extends { fontSize: number; lead?: number }>(tok: T) => ({
    ...tok,
    fontSize: sp(tok.fontSize),
    ...(tok.lead === undefined ? {} : { lead: sp(tok.lead) }),
  });
  return {
    TITLE: f(BASE.TITLE) as typeof BASE.TITLE,
    SUBTITLE: f(BASE.SUBTITLE) as typeof BASE.SUBTITLE,
    SOURCE: f(BASE.SOURCE) as typeof BASE.SOURCE,
    AXIS: f(BASE.AXIS) as typeof BASE.AXIS,
    AXIS_TITLE: f(BASE.AXIS_TITLE) as typeof BASE.AXIS_TITLE,
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    MEDIAN_RULE: { ...BASE.MEDIAN_RULE, width: sp(BASE.MEDIAN_RULE.width) },
    MEDIAN_LABEL_GAP: sp(BASE.MEDIAN_LABEL_GAP),
    TITLE_TO_SUBTITLE: sp(BASE.TITLE_TO_SUBTITLE),
    HEADER_TO_PLOT: sp(BASE.HEADER_TO_PLOT),
    AXIS_TITLE_TO_SOURCE: sp(BASE.AXIS_TITLE_TO_SOURCE),
    X_TICK_DROP: sp(BASE.X_TICK_DROP),
    X_LABEL_BAND: sp(BASE.X_LABEL_BAND),
    Y_TICK_INSET: sp(BASE.Y_TICK_INSET),
    Y_TICK_BASELINE_NUDGE: sp(BASE.Y_TICK_BASELINE_NUDGE),
    PLOT_RIGHT_AIR: sp(BASE.PLOT_RIGHT_AIR),
    MEDIAN_LABEL_DROP: sp(BASE.MEDIAN_LABEL_DROP),
  };
}

/** Five labelled gridlines in an article column; three where the frame is read on a phone. Ladder
 *  rung R2 — the only rung that gives budget back without removing anything vertical. */
const Y_TICK_HINT = 5;
function yTickHintFor(size: string) {
  return sizeFor(size).minTypePx >= 36 ? 3 : Y_TICK_HINT;
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

/** Pure geometry: bins to bar rectangles, edge-to-edge on the variable's own real unit (never bin
 *  index), height a zero-anchored count. */
export function histogramGeometry(
  bins: Bin[],
  {
    width,
    height,
    padding,
    yTickHint = Y_TICK_HINT,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    /** Travels with the call, so the drawn gridlines and the measured labels are one list. */
    yTickHint?: number;
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

export function CarbonFootprintHistogram({
  bins,
  title,
  limits,
  source,
  alt,
  ground,
  median,
  medianLabel,
  size,
}: {
  bins: Bin[];
  title: string;
  limits: string;
  source: string;
  alt: string;
  ground: string;
  // NO `accent`, and that is the finding rather than an omission. This beat's only annotation is
  // the median rule, and the median rule runs THROUGH the tallest bar — so whatever hue arrives
  // here, it is measured against `#616161` and not against the page. `#0B7A75` measured 1.20:1
  // there. `references/types/histogram.md` asks for the accent on the median line; it now carries
  // the amendment this render forced. A beat that cannot spend its accent anywhere a reader would
  // see it does not take one.
  median: number;
  medianLabel: string;
  /** The size gate 2c pinned, read from this beat's own `BRIEF.md`. Not a default. */
  size: string;
}) {
  if (bins.length < 3)
    throw new Error(
      "a histogram beat needs at least three bins to show a shape, got " +
        bins.length,
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height, typeScale } = sizeFor(size);
  // The band this beat may draw in. At portrait the platform reserves 14% at the top and 35% at the
  // foot; content there is at RISK OF BEING COVERED, which no clipping counter can see.
  const stage = stageFor(size);
  const PAD = frameInsetFor(size);
  const {
    TITLE,
    SUBTITLE,
    SOURCE,
    AXIS,
    AXIS_TITLE,
    NOTE,
    MEDIAN_RULE,
    MEDIAN_LABEL_GAP,
    TITLE_TO_SUBTITLE,
    HEADER_TO_PLOT,
    AXIS_TITLE_TO_SOURCE,
    X_TICK_DROP,
    X_LABEL_BAND,
    Y_TICK_INSET,
    Y_TICK_BASELINE_NUDGE,
    PLOT_RIGHT_AIR,
    MEDIAN_LABEL_DROP,
  } = tokens(typeScale);
  const contentTop = stage.reserved ? stage.top : PAD;
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = contentTop + TITLE.fontSize;
  const limitsLines = wrap(limits, width - PAD * 2, SUBTITLE);
  const limitsBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + TITLE_TO_SUBTITLE;
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  // THE SOURCE SITS ON THE BOTTOM OF THE BAND — the LAST line lands there, the same edge the title
  // hangs off at the top, on the same x. See
  // chart-beat/references/static-discipline.md, "The source on the frame's bottom margin."
  // At portrait that bottom is the STAGE's, not the frame's: below 1248 is the platform's caption
  // and progress bar, and a covered credit is an attribution failure rather than a cosmetic one.
  const sourceBaseline =
    sourceBottom - (sourceLines.length - 1) * SUBTITLE.lead;
  // The plot starts below the LAST HEADER line, never below the source: that dependency is what
  // would otherwise have dragged the whole plot down the frame with the credit.
  const plotTop =
    limitsBaseline + (limitsLines.length - 1) * SUBTITLE.lead + HEADER_TO_PLOT;
  // The x-axis title used to sit on the frame's bottom margin — the slot the credit now owns. The
  // first render of that change put the two on top of each other, in the PNG, and that is what
  // moved this from a literal to a derivation: the title sits directly ABOVE the credit block,
  // clear of its first line's ink.
  const axisTitleBaseline =
    sourceBaseline - SOURCE.fontSize - AXIS_TITLE_TO_SOURCE;

  const tickLabels = scaleLinear()
    .domain([0, Math.max(...bins.map((b) => b.count))])
    .nice()
    .ticks(yTickHintFor(size))
    .map((v, i, all) => (i === all.length - 1 ? `${v} countries` : `${v}`));

  const padding = {
    top: plotTop,
    right: PAD + PLOT_RIGHT_AIR,
    // Derived from where the axis title now sits, not from a constant: the tick-label band (20px
    // below the plot's floor, plus its descender) has to end above the axis title's ink. The
    // arithmetic reproduces the old 83px exactly when the credit is absent — the whole reserve
    // simply follows the axis title up the frame.
    bottom:
      height - axisTitleBaseline + AXIS_TITLE.fontSize + X_LABEL_BAND,
    left:
      PAD +
      Y_TICK_INSET +
      Math.max(...tickLabels.map((l) => measureText(l, AXIS))),
  };

  const { plot, bars, x, ticksY } = histogramGeometry(bins, {
    width,
    height,
    padding,
    yTickHint: yTickHintFor(size),
  });
  // THE PLOT'S OWN SHAPE, refused before anything is drawn. At 1080x1080 with the type at the
  // phone's floor, this beat's header and credit took the whole frame and left the plot 915 x 30 —
  // 30:1 — with nothing clipped, nothing colliding and the delivered PNG at exactly the pinned
  // size. A histogram at 30:1 is not a distribution.
  assertPlotAspect(plot, "histogram", size, {
    what: "static-carbon-footprint-spread",
  });
  const medianX = x(median);

  // THE MEDIAN ANNOTATION IS COLOURED AND PLACED AGAINST THE BARS IT CROSSES, NOT AGAINST THE PAGE.
  //
  // Measured on the committed still before this existed: the rule was `stroke={accent}` — 5.18:1
  // against the white page it is nominally drawn on, and **1.20:1 against the `#616161` bar it
  // spends 97 % of its length inside**. It was not a faint rule, it was an invisible one, and
  // nothing could have said so, because the only contrast check in this file measures ink against
  // the GROUND. See `chart-beat/scripts/annotation-ink.mjs`.
  const barMarks = bars.map((b) => ({
    x: b.x,
    y: b.y,
    width: Math.max(b.width - 1, 0),
    height: b.height,
    fill: muted,
  }));
  const medianRuleBox = {
    x: medianX - MEDIAN_RULE.width / 2,
    y: plot.top,
    width: MEDIAN_RULE.width,
    height: plot.bottom - plot.top,
  };
  // The ground belongs in this set: the rule runs from `plot.top`, so it crosses bare page above
  // the tallest bar as well as the bar itself. That is what forces the answer to a near-black rule
  // rather than a near-white one — white reads on the bar and vanishes on the page.
  const medianRuleInk = inkThatReadsOver(
    [ground, ...marksUnder(medianRuleBox, barMarks).map((m) => m.fill)],
    NON_TEXT_CONTRAST_FLOOR,
  );

  // The label is a POSITION problem, not a colour one: lying partly on the page and partly on a
  // mid-grey bar, no ink clears 4.5:1 on both (black is 3.39:1 on the bar, white is 1.00:1 on the
  // page). So it is pushed right, past the right edge of every bar it would otherwise sit on, until
  // it stands on one background — then inked against that. Derived from the bars' own geometry, so
  // a different median or a different distribution moves it without anyone retyping an offset.
  const labelBand = measureTextBand(medianLabel, NOTE);
  const labelWidth = measureText(medianLabel, NOTE);
  const labelBaseline = plot.top + MEDIAN_LABEL_DROP;
  let labelX = medianX + MEDIAN_LABEL_GAP;
  const labelBoxAt = (at: number) =>
    inkBox({
      x: at,
      y: labelBaseline,
      width: labelWidth,
      ascent: labelBand.ascent,
      descent: labelBand.descent,
    });
  for (let pass = 0; pass <= bars.length; pass++) {
    const blocking = marksUnder(labelBoxAt(labelX), barMarks);
    if (!blocking.length) break;
    labelX = Math.max(...blocking.map((m) => m.x + m.width)) + MEDIAN_LABEL_GAP;
  }
  if (labelX + labelWidth > plot.right) {
    throw new Error(
      `"${medianLabel}" is ${labelWidth.toFixed(1)}px wide and every position clear of the bars ` +
        `starts at x=${labelX.toFixed(1)}, past the plot's right edge at ${plot.right.toFixed(1)}. ` +
        `A shorter label, or a taller frame, or the label goes above the plot — but it does not get ` +
        `drawn where it cannot be read.`,
    );
  }
  const labelInk = inkThatReadsOver(
    [ground, ...marksUnder(labelBoxAt(labelX), barMarks).map((m) => m.fill)],
    textContrastFloor(NOTE),
  );

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

      {/* Bars sit edge-to-edge — no gap between bins, because the bins are contiguous slices of
          one continuous variable, not discrete categories (`references/types/histogram.md`). */}
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
          // The label names the bin's LOWER EDGE (`b.lo`), so it is drawn at that edge — not at
          // `b.x + b.width / 2`, which is where it used to sit. A histogram's ticks are boundaries
          // between bins, never marks on top of them, and the half-bin offset made the axis lie:
          // the median rule, drawn correctly at x=184.4, read against the printed labels as ≈1.1 t
          // while its own label said "Median: 3.1 t". The final tick was already at the true right
          // edge, which is why the last gap rendered half-width and the two labels collided at
          // 375px — the visible symptom of an axis that was wrong everywhere else too.
          x={b.x}
          y={plot.bottom + X_TICK_DROP}
          fill={muted}
          fontSize={AXIS.fontSize}
          textAnchor="middle"
        >
          {b.lo}
        </text>
      ))}
      <text
        x={plot.right}
        y={plot.bottom + X_TICK_DROP}
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

      {/* The median. `references/types/histogram.md`'s worked example asks for one distinct signal,
          not the bars' own fill repeated — and the accent is not it here: an accent rule that spends
          its length inside a mid-grey bar carries no signal at all, at 1.20:1. Both the rule's ink
          and the label's position are derived above, from the bars they meet. */}
      <line
        x1={medianX}
        x2={medianX}
        y1={plot.top}
        y2={plot.bottom}
        stroke={medianRuleInk}
        strokeWidth={MEDIAN_RULE.width}
        strokeDasharray={MEDIAN_RULE.dash}
      />
      <text
        x={labelX}
        y={labelBaseline}
        fill={labelInk}
        fontSize={NOTE.fontSize}
        fontWeight={NOTE.fontWeight}
      >
        {medianLabel}
      </text>
    </svg>
  );
}
