/**
 * Beat: "Germany's renewable share nearly doubled between 2015 and 2024" (slope chart).
 *
 * Written fresh from `ChartSeed.tsx`'s shape for a type that plots exactly two moments per
 * category (`references/types/slope.md`) — position-encoded, so unlike the bar family the value
 * axis is fitted, not zero-anchored, and unlike the scatter next door there is no third axis at
 * all: x is fixed at exactly two positions (2015, 2024), not a measured variable.
 */

import { extent } from "d3-array";
import { scaleLinear } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  contrast,
  FONT_FAMILY,
} from "#shared/twin-chart-beat/render-still.mjs";
import {
  frameInsetFor,
  sizeFor,
  stageFor,
} from "#shared/twin-chart-beat/sizes.mjs";
import { formForSize } from "#shared/twin-chart-beat/type-at-size.mjs";

export type Series = { name: string; start: number; end: number };

/** The type this beat draws, in `references/types/` vocabulary. `formForSize` answers for it, and
 *  a size it refuses is refused by the runner before a mark is drawn. */
export const TYPE = 'slope';

/**
 * THE 900-WIDE TUNING, KEPT AS THE BASE, WITH THE SIZE ROW'S `typeScale` AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more, and its absence is the point: the frame is `sizeFor(size)`'s,
 * and `size` is the decision gate 2c took, read out of this beat's own `BRIEF.md` by `render.mjs`.
 * Before this the size was stated TWICE as literals — once here and once in the render script — and
 * `renderStill` compared them against each other, so they agreed by construction and nothing
 * downstream of the gate ever read what the journalist chose.
 *
 * EVERY SPACING NUMBER GOES THROUGH `sp`, not only the fonts: the probe measured eleven bare
 * literals in the layout arithmetic of the SIMPLEST static in this corpus, and scaling the type
 * while leaving them collided the title into the subtitle at 1920x1080
 * (`proof/static-carbon-footprint-spread/probe/VERDICT.md`). `PAD` is the one that does NOT go
 * through it: a frame's margin is proportional to the CANVAS, not to the type — `frameInsetFor` in
 * `sizes.mjs` states the split and argues it.
 */
const BASE = {
  TITLE: { fontSize: 24, fontWeight: 700, lead: 30 },
  TITLE_TO_SUBTITLE: 28,
  SUBTITLE_TO_PERIOD: 34,
  PERIOD_TO_PLOT: 20,
  LABEL_GUTTER_AIR: 12,
  PLOT_FLOOR_AIR: 20,
  SOURCE_AIR: 10,
  LEADER_INSET: 8,
  LABEL_INSET: 12,
  LABEL_BASELINE_NUDGE: 4,
  DOT_R: 3.5,
  LINE_WIDTH: 1.5,
  ACCENT_LINE_WIDTH: 3,
  SUBTITLE: { fontSize: 14, fontWeight: 400, lead: 20 },
  SOURCE: { fontSize: 14, fontWeight: 400 },
  PERIOD_LABEL: { fontSize: 14, fontWeight: 700 },
  CATEGORY_LABEL: { fontSize: 13, fontWeight: 600 },
  VALUE_LABEL: { fontSize: 13, fontWeight: 700 },
  MIN_LABEL_GAP: 16,
} as const;

function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  const f = (tok: { fontSize: number; fontWeight: number; lead?: number }) => ({
    ...tok,
    fontSize: sp(tok.fontSize),
    ...(tok.lead === undefined ? {} : { lead: sp(tok.lead) }),
  });
  return {
    TITLE: f(BASE.TITLE) as typeof BASE.TITLE,
    SUBTITLE: f(BASE.SUBTITLE) as typeof BASE.SUBTITLE,
    SOURCE: f(BASE.SOURCE) as typeof BASE.SOURCE,
    PERIOD_LABEL: f(BASE.PERIOD_LABEL) as typeof BASE.PERIOD_LABEL,
    CATEGORY_LABEL: f(BASE.CATEGORY_LABEL) as typeof BASE.CATEGORY_LABEL,
    VALUE_LABEL: f(BASE.VALUE_LABEL) as typeof BASE.VALUE_LABEL,
    TITLE_TO_SUBTITLE: sp(BASE.TITLE_TO_SUBTITLE),
    SUBTITLE_TO_PERIOD: sp(BASE.SUBTITLE_TO_PERIOD),
    PERIOD_TO_PLOT: sp(BASE.PERIOD_TO_PLOT),
    LABEL_GUTTER_AIR: sp(BASE.LABEL_GUTTER_AIR),
    PLOT_FLOOR_AIR: sp(BASE.PLOT_FLOOR_AIR),
    SOURCE_AIR: sp(BASE.SOURCE_AIR),
    LEADER_INSET: sp(BASE.LEADER_INSET),
    LABEL_INSET: sp(BASE.LABEL_INSET),
    LABEL_BASELINE_NUDGE: sp(BASE.LABEL_BASELINE_NUDGE),
    DOT_R: Math.max(1, sp(BASE.DOT_R)),
    LINE_WIDTH: Math.max(1, sp(BASE.LINE_WIDTH)),
    ACCENT_LINE_WIDTH: Math.max(1, sp(BASE.ACCENT_LINE_WIDTH)),
    MIN_LABEL_GAP: sp(BASE.MIN_LABEL_GAP),
  };
}

/** The removal ladder this beat runs, per size, recorded so the render can print it and the
 *  artifact can carry it. At a phone frame the type floor is 36px, which triples the headline and
 *  the credit; R3 fires before a mark is drawn. */
export function rungsFor(size: string): string[] {
  if (sizeFor(size).minTypePx < 36) return [];
  return ["R3: the standfirst keeps its first sentence only"];
}

function firstSentence(text: string): string {
  const stop = text.indexOf(". ");
  return stop === -1 ? text : text.slice(0, stop + 1);
}
/** The label's own line height, in px — the minimum vertical gap the de-collision pass enforces
 *  between two category labels stacked at the same end. */
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

/** Push apart label y-positions, closest pair first, until every neighbouring pair clears
 *  `T.MIN_LABEL_GAP` — a minimal de-collision pass, not a full force layout, because six categories
 *  never needs one. */
function decollide(values: number[], minGap: number): number[] {
  const order = values.map((v, i) => i).sort((a, b) => values[a] - values[b]);
  const y = order.map((i) => values[i]);
  for (let pass = 0; pass < values.length; pass++) {
    let moved = false;
    for (let i = 1; i < y.length; i++) {
      if (y[i] - y[i - 1] < minGap) {
        const deficit = minGap - (y[i] - y[i - 1]);
        y[i] += deficit / 2;
        y[i - 1] -= deficit / 2;
        moved = true;
      }
    }
    if (!moved) break;
  }
  const result = new Array(values.length);
  order.forEach(
    (originalIndex, sortedIndex) => (result[originalIndex] = y[sortedIndex]),
  );
  return result;
}

function inkOn(fill: string): string {
  return contrast("#000000", fill) >= contrast("#FFFFFF", fill)
    ? "#000000"
    : "#FFFFFF";
}

/** Pure geometry: two x positions, one y scale fitted (never zero-anchored — position encoding,
 *  the direct opposite of a bar's length encoding). */
export function slopeGeometry(
  series: Series[],
  {
    width,
    height,
    padding,
    minLabelGap,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    /** One line of the label's own type — the minimum vertical gap the de-collision pass keeps
     *  between two category labels stacked at the same end. Passed in rather than read from a
     *  module constant, because it scales with the frame and this function is outside the
     *  component that knows the scale. */
    minLabelGap: number;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const values = series.flatMap((s) => [s.start, s.end]);
  const y = scaleLinear()
    .domain(extent(values) as [number, number])
    .nice()
    .range([plot.bottom, plot.top]);

  const startYRaw = series.map((s) => y(s.start));
  const endYRaw = series.map((s) => y(s.end));
  const startY = decollide(startYRaw, minLabelGap);
  const endY = decollide(endYRaw, minLabelGap);

  const lines = series.map((s, i) => ({
    name: s.name,
    start: { value: s.start, x: plot.left, y: y(s.start), labelY: startY[i] },
    end: { value: s.end, x: plot.right, y: y(s.end), labelY: endY[i] },
  }));

  return { plot, lines };
}

export function RenewablesShiftSlope({
  series,
  title,
  limits,
  source,
  alt,
  ground,
  accent,
  highlighted,
  startLabel,
  endLabel,
  unit,
  size,
}: {
  series: Series[];
  title: string;
  limits: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  highlighted: string;
  startLabel: string;
  endLabel: string;
  unit: string;
  /** The size gate 2c pinned, read from this beat's own `BRIEF.md`. Not a default. */
  size: string;
}) {
  if (series.length < 2)
    throw new Error(
      "a slope beat needs at least two categories, got " + series.length,
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height, typeScale, minTypePx } = sizeFor(size);
  const stage = stageFor(size);
  const PAD = frameInsetFor(size);
  const T = tokens(typeScale);
  const rungs = rungsFor(size);
  const contentTop = stage.reserved ? stage.top : PAD;
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;
  const titleLines = wrap(title, width - PAD * 2, T.TITLE);
  const titleBaseline = contentTop + T.TITLE.fontSize;
  const standfirst = rungs.some((r) => r.startsWith("R3"))
    ? firstSentence(limits)
    : limits;
  const limitsLines = wrap(standfirst, width - PAD * 2, T.SUBTITLE);
  const limitsBaseline =
    titleBaseline + (titleLines.length - 1) * T.TITLE.lead + T.TITLE_TO_SUBTITLE;
  const sourceLines = wrap(source, width - PAD * 2, T.SOURCE);
  // THE T.SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN — the LAST line lands on `height - PAD`, the
  // same inset the title hangs off at the top, on the same x. See
  // twin-chart-beat/references/static-discipline.md, "The source on the frame's bottom margin".
  const sourceBaseline =
    sourceBottom - (sourceLines.length - 1) * T.SUBTITLE.lead;
  // The period labels keep the air they always had above them, measured from the LAST HEADER line
  // rather than from the source, which is no longer in the header.
  const periodBaseline =
    limitsBaseline +
    (limitsLines.length - 1) * T.SUBTITLE.lead +
    T.SUBTITLE_TO_PERIOD;

  const widestLabel = Math.max(
    ...series.map((s) =>
      measureText(`${s.name} ${s.start.toFixed(1)}${unit}`, T.CATEGORY_LABEL),
    ),
    ...series.map((s) =>
      measureText(`${s.name} ${s.end.toFixed(1)}${unit}`, T.CATEGORY_LABEL),
    ),
  );
  const padding = {
    top: periodBaseline + T.PERIOD_TO_PLOT,
    right: PAD + T.LABEL_GUTTER_AIR + widestLabel,
    // Grown by the source block's own height plus clear air: the credit now sits on the frame's
    // bottom margin, so the band beneath the plot has to end above its ink.
    bottom:
      height -
      (sourceBaseline - T.SOURCE.fontSize - T.SOURCE_AIR) +
      T.PLOT_FLOOR_AIR,
    left: PAD + T.LABEL_GUTTER_AIR + widestLabel,
  };

  const { plot, lines } = slopeGeometry(series, {
    width,
    height,
    padding,
    minLabelGap: T.MIN_LABEL_GAP,
  });

  // THE LAST RUNG, FIRED RATHER THAN DESCRIBED. A slope has no measured aspect range — its argument
  // IS a gradient, and a plot squeezed flat or stretched tall states a different one — so
  // `assertPlotAspect` cannot clamp it and `assertTypeFloor` measures the type rather than the room
  // it has. What is measured here is the plot: below four lines of label type there is no gradient
  // left to read.
  if (plot.bottom - plot.top < T.MIN_LABEL_GAP * series.length)
    throw new Error(
      `static-renewables-shift: at ${size} the plot is ` +
        `${(plot.bottom - plot.top).toFixed(0)}px tall and ${series.length} label rows need at ` +
        `least ${(T.MIN_LABEL_GAP * series.length).toFixed(0)}px, so the de-collision pass would ` +
        `push every label off its own line.\n` +
        `The ladder is spent: ${rungs.join("; ") || "no rung fires at this size"}.\n` +
        `R9: this beat does not ship ${size}.`,
    );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      fontFamily={FONT_FAMILY}
      data-ladder={rungs.join("; ") || "none"}
    >
      <desc>{alt}</desc>
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {titleLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={titleBaseline + i * T.TITLE.lead}
          fill={ink}
          fontSize={T.TITLE.fontSize}
          fontWeight={T.TITLE.fontWeight}
        >
          {line}
        </text>
      ))}
      {limitsLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={limitsBaseline + i * T.SUBTITLE.lead}
          fill={muted}
          fontSize={T.SUBTITLE.fontSize}
        >
          {line}
        </text>
      ))}
      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={sourceBaseline + i * T.SUBTITLE.lead}
          fill={muted}
          fontSize={T.SOURCE.fontSize}
        >
          {line}
        </text>
      ))}

      {/* THE TWO VERTICAL AXES, one per period. `references/types/slope.md` asks for them by name —
          "Two vertical axes — one per period — with each category's two values plotted as points
          and joined by a straight line between them" — and this beat drew neither. What the
          delivered HTML sibling calls `.y-axis` and `.r-axis` are label GUTTERS, not rules; the
          only vertical strokes in the committed SVG were the twelve dashed label leaders, whose
          longest span measured 6.21px against a ~292px plot. That is what "not everything seems
          rendered" was: the connecting lines were there, and the thing they connect was not.
          Drawn first, in `grid`, so the six category lines and their end dots sit on top of them —
          an axis is the frame a reading is taken against, never a mark competing with the data.
          `vidx-slope-child-mortality/SlopeVideo.tsx` already honoured the sheet; the static and the
          web sibling did not, which is this project's recurring shape — the video honours the sheet
          and its siblings do not. */}
      <line
        x1={plot.left}
        x2={plot.left}
        y1={plot.top}
        y2={plot.bottom}
        stroke={grid}
        strokeWidth={1}
      />
      <line
        x1={plot.right}
        x2={plot.right}
        y1={plot.top}
        y2={plot.bottom}
        stroke={grid}
        strokeWidth={1}
      />

      {/* Each period needs its own caption — a slope chart with unlabelled ends states direction
          with no stated "from when to when," half the claim (`references/types/slope.md`). */}
      <text
        x={plot.left}
        y={periodBaseline}
        fill={ink}
        fontSize={T.PERIOD_LABEL.fontSize}
        fontWeight={T.PERIOD_LABEL.fontWeight}
        textAnchor="middle"
      >
        {startLabel}
      </text>
      <text
        x={plot.right}
        y={periodBaseline}
        fill={ink}
        fontSize={T.PERIOD_LABEL.fontSize}
        fontWeight={T.PERIOD_LABEL.fontWeight}
        textAnchor="middle"
      >
        {endLabel}
      </text>

      {lines.map((l) => {
        const isAccent = l.name === highlighted;
        const stroke = isAccent ? accent : muted;
        return (
          <g key={l.name}>
            <line
              x1={l.start.x}
              y1={l.start.y}
              x2={l.end.x}
              y2={l.end.y}
              stroke={stroke}
              strokeWidth={isAccent ? T.ACCENT_LINE_WIDTH : T.LINE_WIDTH}
            />
            <circle cx={l.start.x} cy={l.start.y} r={T.DOT_R} fill={stroke} />
            <circle cx={l.end.x} cy={l.end.y} r={T.DOT_R} fill={stroke} />
            {/* Value label carries the number in ink, never the line's own accent — the same
                escalated-contrast discipline as every other type in this set
                (`visual-system.md`). A short leader connects the label to its true point when the
                de-collision pass above has shifted it. */}
            <line
              x1={l.start.x - T.LEADER_INSET}
              y1={l.start.y}
              x2={l.start.x - T.LEADER_INSET}
              y2={l.start.labelY}
              stroke={stroke}
              strokeWidth={1}
              strokeDasharray="2 2"
              opacity={Math.abs(l.start.y - l.start.labelY) > 1 ? 1 : 0}
            />
            <text
              x={l.start.x - T.LABEL_INSET}
              y={l.start.labelY + T.LABEL_BASELINE_NUDGE}
              fill={ink}
              fontSize={T.CATEGORY_LABEL.fontSize}
              fontWeight={isAccent ? 700 : T.CATEGORY_LABEL.fontWeight}
              textAnchor="end"
            >
              {l.name} {l.start.value.toFixed(1)}
              {unit}
            </text>
            <line
              x1={l.end.x + T.LEADER_INSET}
              y1={l.end.y}
              x2={l.end.x + T.LEADER_INSET}
              y2={l.end.labelY}
              stroke={stroke}
              strokeWidth={1}
              strokeDasharray="2 2"
              opacity={Math.abs(l.end.y - l.end.labelY) > 1 ? 1 : 0}
            />
            <text
              x={l.end.x + T.LABEL_INSET}
              y={l.end.labelY + T.LABEL_BASELINE_NUDGE}
              fill={ink}
              fontSize={T.CATEGORY_LABEL.fontSize}
              fontWeight={isAccent ? 700 : T.CATEGORY_LABEL.fontWeight}
              textAnchor="start"
            >
              {l.name} {l.end.value.toFixed(1)}
              {unit}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
