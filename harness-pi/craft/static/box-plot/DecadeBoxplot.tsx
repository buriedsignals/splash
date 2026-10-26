/**
 * Beat: France's annual per-capita CO2 emissions, grouped into decades, 1950-2024 (box plot).
 *
 * Written fresh from `ChartSeed.tsx`'s shape for a type the seed does not cover
 * (`references/types/boxplot.md`): a position encoding, not a length one, so the value axis is
 * fitted to the data rather than anchored at zero; every whisker is clipped at the furthest
 * reading still within 1.5x the interquartile range of its nearest quartile (Tukey's rule), and
 * anything past that is drawn as an individual outlier dot rather than let stretch the whisker;
 * decades keep their own chronological order (this is a time-ordered categorical axis, not one
 * sorted by median); and the 2020s box carries a visibly smaller n (5, a partial decade) printed
 * under its own category label rather than left looking equivalent to the other seven full ones.
 *
 * A box plot's argument is a SHAPE — where the median sits inside the box, how long the whiskers
 * run — so it is exactly the type the portrait probe proved no counter in this project can protect.
 * `type-at-size.mjs` carries no measured aspect range for it and it is not a band-scale type with a
 * twin form, so it REFUSES portrait and square outright, naming the measurement that is missing.
 * That refusal is the beat's answer at those two sizes; see `BRIEF.md`.
 */

import { extent, quantile } from "d3-array";
import { scaleBand, scaleLinear } from "d3-scale";
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

export type DecadeReadings = { label: string; values: number[] };

/**
 * THE 900x560 TUNING, KEPT AS THE BASE, WITH THE SIZE AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more: the frame is `sizeFor(size)`'s, and `size` is the decision
 * gate 2c took, read out of this beat's own `BRIEF.md` by `render.mjs`. Before this the size was
 * stated three times as literals — here and twice in the render script — and `renderStill` compared
 * two of them against each other, so a journalist pinning `portrait` got this beat's landscape
 * frame back in silence.
 *
 * TWO TOKENS ARE RAISED FROM 11 TO 12, and it is a legibility fix rather than a tidy-up. The table's
 * multipliers are derived so that the SEED's smallest token — 12 — clears each row's floor
 * (`sizes.mjs`: 26/12 = 2.2 at landscape). A beat carrying an 11 lands at 24.2 px against a 26 px
 * floor, and `assertTypeFloor` refuses it off the rendered markup. The floor is never lowered, so
 * the token comes up to the smallest the scale was derived for.
 *
 * EVERY SPACING NUMBER GOES THROUGH `sp`, not only the fonts — the box's own strokes and the outlier
 * dot's radius included, because a 1.5 px stroke on a 1920 px frame is a hairline.
 *
 * `PAD` is the one that does NOT go through it — a frame's margin is proportional to the CANVAS,
 * not to the type (`frameInsetFor`).
 */
const BASE = {
  TITLE: { fontSize: 24, fontWeight: 700, lead: 30 },
  SOURCE: { fontSize: 14, fontWeight: 400, lead: 20 },
  AXIS: { fontSize: 13, fontWeight: 400 },
  CATEGORY_LABEL: { fontSize: 13, fontWeight: 600 },
  N_LABEL: { fontSize: 12, fontWeight: 400 },
  OUTLIER_LABEL: { fontSize: 12, fontWeight: 600 },
  HEADER_TO_PLOT: 30,
  /** Room to the right of the plot for an outlier label sitting beside its dot. */
  OUTLIER_LABEL_GUTTER: 40,
  OUTLIER_LABEL_GAP: 9,
  OUTLIER_BASELINE_NUDGE: 4,
  CATEGORY_DROP: 22,
  CATEGORY_TO_N: 4,
  AXIS_TO_CATEGORY: 6,
  AXIS_TO_SOURCE: 10,
  Y_TICK_INSET: 10,
  Y_TICK_BASELINE_NUDGE: 4,
  WHISKER_STROKE: 1.5,
  BOX_STROKE: 1.5,
  MEDIAN_STROKE: 2.5,
  OUTLIER_DOT: 4,
};
/** Static format density (`static-discipline.md`, "Axis density") — enough gridlines that a reader
 *  scrutinising the frame can put a number on any box edge, not the two-or-three-tick floor a
 *  motion beat would use. */
const Y_TICK_HINT = 6;
const UNIT = "t CO₂ per capita";

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
    CATEGORY_LABEL: f(BASE.CATEGORY_LABEL) as typeof BASE.CATEGORY_LABEL,
    N_LABEL: f(BASE.N_LABEL) as typeof BASE.N_LABEL,
    OUTLIER_LABEL: f(BASE.OUTLIER_LABEL) as typeof BASE.OUTLIER_LABEL,
    HEADER_TO_PLOT: sp(BASE.HEADER_TO_PLOT),
    OUTLIER_LABEL_GUTTER: sp(BASE.OUTLIER_LABEL_GUTTER),
    OUTLIER_LABEL_GAP: sp(BASE.OUTLIER_LABEL_GAP),
    OUTLIER_BASELINE_NUDGE: sp(BASE.OUTLIER_BASELINE_NUDGE),
    CATEGORY_DROP: sp(BASE.CATEGORY_DROP),
    CATEGORY_TO_N: sp(BASE.CATEGORY_TO_N),
    AXIS_TO_CATEGORY: sp(BASE.AXIS_TO_CATEGORY),
    AXIS_TO_SOURCE: sp(BASE.AXIS_TO_SOURCE),
    Y_TICK_INSET: sp(BASE.Y_TICK_INSET),
    Y_TICK_BASELINE_NUDGE: sp(BASE.Y_TICK_BASELINE_NUDGE),
    WHISKER_STROKE: BASE.WHISKER_STROKE * typeScale,
    BOX_STROKE: BASE.BOX_STROKE * typeScale,
    MEDIAN_STROKE: BASE.MEDIAN_STROKE * typeScale,
    OUTLIER_DOT: sp(BASE.OUTLIER_DOT),
  };
}

/**
 * Pure statistics: one decade's raw readings to its five-number summary plus its Tukey outliers.
 * No pixels, no colour — this is the part worth keeping when the rest of the file is thrown away.
 *
 * `q1`/`median`/`q3` come from d3-array's `quantile` (linear interpolation, the conventional
 * "type 7" method) rather than hand-rolled arithmetic. The whisker is clipped to the furthest
 * reading still inside the fence, never to the data's own extreme: letting a whisker stretch to
 * the most extreme point is exactly the shortcut `boxplot.md` names as the type's one honesty
 * failure, because it launders a lone extreme value into looking like ordinary spread.
 */
export function summarizeDecade(label: string, values: number[]) {
  if (values.length < 2)
    throw new Error(
      `decade ${label} needs at least two readings to summarize, got ${values.length}`,
    );
  const q1 = quantile(values, 0.25) as number;
  const median = quantile(values, 0.5) as number;
  const q3 = quantile(values, 0.75) as number;
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const inFence = values.filter((v) => v >= lowerFence && v <= upperFence);
  const outliers = values
    .filter((v) => v < lowerFence || v > upperFence)
    .sort((a, b) => a - b);
  const [whiskerLo, whiskerHi] = extent(
    inFence.length > 0 ? inFence : values,
  ) as [number, number];
  return {
    label,
    n: values.length,
    q1,
    median,
    q3,
    whiskerLo,
    whiskerHi,
    outliers,
  };
}

export type DecadeSummary = ReturnType<typeof summarizeDecade>;

/**
 * Summaries to pixels. The y domain is fitted to every reading that will actually be drawn —
 * whisker ends and outlier points alike — and `.nice()`d outward, never anchored at zero: this is
 * a POSITION encoding (`boxplot.md`), so a zoomed range that shows the real spread is the honest
 * choice, the opposite of the length-encoding zero rule a bar or lollipop follows.
 */
export function boxplotGeometry(
  summaries: DecadeSummary[],
  allValues: number[],
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
  const y = scaleLinear()
    .domain(extent(allValues) as [number, number])
    .nice()
    .range([plot.bottom, plot.top]);
  const x = scaleBand<string>()
    .domain(summaries.map((s) => s.label))
    .range([plot.left, plot.right])
    .paddingInner(0.38)
    .paddingOuter(0.25);
  const boxWidth = x.bandwidth() * 0.68;

  const boxes = summaries.map((s) => {
    const cx = (x(s.label) as number) + x.bandwidth() / 2;
    return {
      ...s,
      cx,
      boxLeft: cx - boxWidth / 2,
      boxRight: cx + boxWidth / 2,
      yQ1: y(s.q1),
      yQ3: y(s.q3),
      yMedian: y(s.median),
      yWhiskerLo: y(s.whiskerLo),
      yWhiskerHi: y(s.whiskerHi),
      outlierPoints: s.outliers.map((value) => ({ value, y: y(value) })),
    };
  });

  return {
    plot,
    boxWidth,
    boxes,
    ticksY: y.ticks(Y_TICK_HINT).map((value) => ({ value, y: y(value) })),
  };
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

export function DecadeBoxplot({
  decades,
  title,
  source,
  alt,
  ground,
  accent,
  size,
}: {
  decades: DecadeReadings[];
  title: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  /** The size gate 2c pinned, read from this beat's own `BRIEF.md`. Not a default. */
  size: string;
}) {
  if (decades.length < 3)
    throw new Error(
      "a boxplot beat needs at least three groups to compare, got " +
        decades.length,
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height, typeScale } = sizeFor(size);
  // The band this beat may draw in. At portrait the platform reserves 14% at the top and 35% at the
  // foot; content there is at RISK OF BEING COVERED, which no clipping counter can see. This beat
  // refuses portrait outright (see the file header), so the branch is here for one reason: nothing
  // in this component may assume the frame IS the stage.
  const stage = stageFor(size);
  const PAD = frameInsetFor(size);
  const {
    TITLE,
    SOURCE,
    AXIS,
    CATEGORY_LABEL,
    N_LABEL,
    OUTLIER_LABEL,
    HEADER_TO_PLOT,
    OUTLIER_LABEL_GUTTER,
    OUTLIER_LABEL_GAP,
    OUTLIER_BASELINE_NUDGE,
    CATEGORY_DROP,
    CATEGORY_TO_N,
    AXIS_TO_CATEGORY,
    AXIS_TO_SOURCE,
    Y_TICK_INSET,
    Y_TICK_BASELINE_NUDGE,
    WHISKER_STROKE,
    BOX_STROKE,
    MEDIAN_STROKE,
    OUTLIER_DOT,
  } = tokens(typeScale);
  const contentTop = stage.reserved ? stage.top : PAD;
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;

  const summaries = decades.map((d) => summarizeDecade(d.label, d.values));
  const allValues = decades.flatMap((d) => d.values);

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = contentTop + TITLE.fontSize;
  // THE SOURCE SITS ON THE BOTTOM OF THE BAND — the LAST line lands there, the same edge the title
  // hangs off at the top, on the same x. See chart-beat/references/static-discipline.md,
  // "The source on the frame's bottom margin." It WRAPS now: one 900px line becomes several at a
  // wider frame's type scale, and an unwrapped credit ran off the frame.
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  const sourceBaseline = sourceBottom - (sourceLines.length - 1) * SOURCE.lead;

  // Both gutters are measured from the widest string that will actually be drawn in them, never
  // a fixed constant (`static-discipline.md`, "Gutters are measured, never fixed").
  const rawTicks = boxplotGeometry(summaries, allValues, {
    width,
    height,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
  }).ticksY.map((t) => t.value);
  const tickLabels = rawTicks.map((v, i, all) =>
    i === all.length - 1 ? `${v} ${UNIT}` : `${v}`,
  );
  const leftGutter =
    PAD +
    Y_TICK_INSET +
    Math.max(...tickLabels.map((label) => measureText(label, AXIS)));

  // The x-axis carries two lines per category: the decade, and its own n — the honest reading of
  // "show the n somewhere" (`boxplot.md`), since a box drawn from 5 points looks exactly like one
  // drawn from 5000 unless the count is printed next to it. The 2020s box is the one that is
  // actually partial (n=5, 2020-2024); every other decade is a full n=10.
  const categoryLines = summaries.map((s) => [s.label, `n=${s.n}`]);

  const padding = {
    top: titleBaseline + (titleLines.length - 1) * TITLE.lead + HEADER_TO_PLOT,
    // Room for an outlier label sitting to the right of its dot.
    right: PAD + OUTLIER_LABEL_GUTTER,
    // Derived from where the credit now sits, not from a constant: the two-line category band
    // under the plot's floor has to end above the credit's first line of ink.
    bottom:
      height -
      (sourceBaseline - SOURCE.fontSize - AXIS_TO_SOURCE) +
      AXIS_TO_CATEGORY +
      CATEGORY_LABEL.fontSize +
      CATEGORY_TO_N +
      N_LABEL.fontSize,
    left: leftGutter,
  };

  const { plot, boxes, ticksY } = boxplotGeometry(summaries, allValues, {
    width,
    height,
    padding,
  });

  const categoryBaselineTop = plot.bottom + CATEGORY_DROP;
  const categoryBaselineBottom =
    categoryBaselineTop + N_LABEL.fontSize + CATEGORY_TO_N;

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

      {boxes.map((b, i) => (
        <g key={b.label}>
          {/* Whisker: a single vertical rule from the low fence-clipped reading to the high one,
              drawn UNDER the box so the box's own top/bottom edges read as the crisp Q1/Q3 line. */}
          <line
            x1={b.cx}
            x2={b.cx}
            y1={b.yWhiskerLo}
            y2={b.yWhiskerHi}
            stroke={accent}
            strokeWidth={WHISKER_STROKE}
          />
          <line
            x1={b.boxLeft + (b.boxRight - b.boxLeft) * 0.22}
            x2={b.boxRight - (b.boxRight - b.boxLeft) * 0.22}
            y1={b.yWhiskerLo}
            y2={b.yWhiskerLo}
            stroke={accent}
            strokeWidth={WHISKER_STROKE}
          />
          <line
            x1={b.boxLeft + (b.boxRight - b.boxLeft) * 0.22}
            x2={b.boxRight - (b.boxRight - b.boxLeft) * 0.22}
            y1={b.yWhiskerHi}
            y2={b.yWhiskerHi}
            stroke={accent}
            strokeWidth={WHISKER_STROKE}
          />

          {/* Box: Q1 to Q3, one hue (`boxplot.md`: one hue for a single-group comparison). Fill is
              light so the ink median line reads clearly inside it. */}
          <rect
            x={b.boxLeft}
            y={b.yQ3}
            width={b.boxRight - b.boxLeft}
            height={b.yQ1 - b.yQ3}
            fill={accent}
            fillOpacity={0.22}
            stroke={accent}
            strokeWidth={BOX_STROKE}
          />

          {/* Median: in ink, never the box's own fill or stroke colour (`boxplot.md`). */}
          <line
            x1={b.boxLeft}
            x2={b.boxRight}
            y1={b.yMedian}
            y2={b.yMedian}
            stroke={ink}
            strokeWidth={MEDIAN_STROKE}
          />

          {/* Outliers: individual dots beyond the whisker, never folded into a stretched whisker
              line. This decade carries only one or two, so the value is written next to each dot
              — once a decade carries many, `boxplot.md` says drop the per-point labels. */}
          {b.outlierPoints.map((pt) => (
            <g key={pt.value}>
              <circle cx={b.cx} cy={pt.y} r={OUTLIER_DOT} fill={accent} />
              {b.outlierPoints.length <= 3 && (
                <text
                  x={b.cx + OUTLIER_DOT + OUTLIER_LABEL_GAP}
                  y={pt.y + OUTLIER_BASELINE_NUDGE}
                  fill={ink}
                  fontSize={OUTLIER_LABEL.fontSize}
                  fontWeight={OUTLIER_LABEL.fontWeight}
                >
                  {pt.value.toFixed(1)}
                </text>
              )}
            </g>
          ))}

          {/* Category label: the decade in its own natural chronological order (never resorted by
              median — this is a time-ordered axis, `boxplot.md`), and its own n directly under it
              so a 5-point decade never reads as equivalent to a 10-point one. */}
          <text
            x={b.cx}
            y={categoryBaselineTop}
            fill={ink}
            fontSize={CATEGORY_LABEL.fontSize}
            fontWeight={CATEGORY_LABEL.fontWeight}
            textAnchor="middle"
          >
            {categoryLines[i][0]}
          </text>
          <text
            x={b.cx}
            y={categoryBaselineBottom}
            fill={muted}
            fontSize={N_LABEL.fontSize}
            textAnchor="middle"
          >
            {categoryLines[i][1]}
          </text>
        </g>
      ))}
    </svg>
  );
}
