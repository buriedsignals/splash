/**
 * Beat: income vs. life expectancy, 165 countries, 2021 (scatter).
 *
 * Written fresh from `ChartSeed.tsx`'s shape for a type that spends BOTH axes on a measured value
 * (`references/types/scatter.md`) — the opposite of every bar-family type in this set, where one
 * axis is always category. Position is the entire encoding: no bubble, no third variable, so the
 * "radius should scale by area not by value" trap that sheet names does not apply here at all.
 *
 * GDP per capita spans two and a half orders of magnitude (roughly $600 to $150,000), so the x
 * axis is a LOG scale — the honest choice for this variable, not a stylistic one: on a linear
 * axis, 150 of these 165 countries would sit crushed into the first tenth of the frame, which
 * would hide the exact shape (steep gains at the bottom, flattening at the top) the chart exists
 * to show. The scale is named as log in the subtitle, because a reader who doesn't know an axis is
 * log-transformed will misjudge every distance on it.
 */

import { extent } from "d3-array";
import { scaleLinear, scaleLog } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/twin-chart-beat/render-still.mjs";
import {
  frameInsetFor,
  sizeFor,
  stageFor,
} from "#shared/twin-chart-beat/sizes.mjs";
import { formForSize } from "#shared/twin-chart-beat/type-at-size.mjs";

export type Point = {
  country: string;
  gdpPerCapita: number;
  lifeExpectancy: number;
};

/** The type this beat draws, in `references/types/` vocabulary. `formForSize` answers for it, and
 *  a size it refuses is refused by the runner before a mark is drawn. */
export const TYPE = 'scatter';

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
  TITLE: { fontSize: 25, fontWeight: 700, lead: 32 },
  TITLE_TO_SUBTITLE: 28,
  HEADER_TO_PLOT: 30,
  AXIS_TITLE_TO_SOURCE: 8,
  X_LABEL_BAND: 30,
  X_TICK_DROP: 20,
  TICK_INSET: 10,
  TICK_BASELINE_NUDGE: 4,
  PLOT_RIGHT_AIR: 8,
  Y_AXIS_TITLE_AIR: 4,
  Y_TICK_GUTTER: 10,
  /** The dot radii. A mark's size is a frame quantity like any other — left at its 900px value on a
   *  1920px frame the cloud would have thinned to specks. */
  DOT_R: 3.5,
  DOT_R_HIGHLIGHT: 4.5,
  /** The gap between a named point's leader end and its own word. */
  LABEL_LEADER_GAP: 5,
  SUBTITLE: { fontSize: 14, fontWeight: 400, lead: 20 },
  SOURCE: { fontSize: 14, fontWeight: 400 },
  AXIS: { fontSize: 13, fontWeight: 400 },
  AXIS_TITLE: { fontSize: 13, fontWeight: 600 },
  POINT_LABEL: { fontSize: 12, fontWeight: 600 },
} as const;

/** How many gridlines the y axis asks d3 for. A COUNT, not a spacing number — it deliberately
 *  does NOT go through `sp`: multiplied by a 2.2 type scale it would have asked for eleven. */
const Y_TICK_HINT = 5;

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
    AXIS: f(BASE.AXIS) as typeof BASE.AXIS,
    AXIS_TITLE: f(BASE.AXIS_TITLE) as typeof BASE.AXIS_TITLE,
    POINT_LABEL: f(BASE.POINT_LABEL) as typeof BASE.POINT_LABEL,
    TITLE_TO_SUBTITLE: sp(BASE.TITLE_TO_SUBTITLE),
    HEADER_TO_PLOT: sp(BASE.HEADER_TO_PLOT),
    AXIS_TITLE_TO_SOURCE: sp(BASE.AXIS_TITLE_TO_SOURCE),
    X_LABEL_BAND: sp(BASE.X_LABEL_BAND),
    X_TICK_DROP: sp(BASE.X_TICK_DROP),
    TICK_INSET: sp(BASE.TICK_INSET),
    TICK_BASELINE_NUDGE: sp(BASE.TICK_BASELINE_NUDGE),
    PLOT_RIGHT_AIR: sp(BASE.PLOT_RIGHT_AIR),
    Y_AXIS_TITLE_AIR: sp(BASE.Y_AXIS_TITLE_AIR),
    Y_TICK_GUTTER: sp(BASE.Y_TICK_GUTTER),
    DOT_R: Math.max(1, sp(BASE.DOT_R)),
    DOT_R_HIGHLIGHT: Math.max(1, sp(BASE.DOT_R_HIGHLIGHT)),
    LABEL_LEADER_GAP: sp(BASE.LABEL_LEADER_GAP),
    /** The multiplier a caller's own 900-wide offsets are read at — a named-point nudge is a
     *  spacing number that happens to arrive as data. */
    scale: typeScale,
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
/** The conventional 1-2-5 sequence within each decade — the log-scale analogue of the linear
 *  `tickStep` the doctrine already trusts, not a per-story hand pick. */
function logTicks(domain: [number, number]): number[] {
  const [lo, hi] = domain;
  const ticks: number[] = [];
  let power = Math.floor(Math.log10(lo));
  while (10 ** power <= hi) {
    for (const m of [1, 2, 5]) {
      const v = m * 10 ** power;
      if (v >= lo && v <= hi) ticks.push(v);
    }
    power++;
  }
  return ticks;
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

/** Pure geometry: points to coordinates. Both axes fitted to the data's own extent — a scatter is
 *  a position chart, the opposite of a bar's length encoding, so neither axis is forced to zero
 *  (`static-discipline.md`'s zero rule is explicitly scoped to length-encoded marks). */
export function scatterGeometry(
  points: Point[],
  {
    width,
    height,
    padding,
    tickHint = Y_TICK_HINT,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    tickHint?: number;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const gdpExtent = extent(points.map((p) => p.gdpPerCapita)) as [
    number,
    number,
  ];
  const xDomain: [number, number] = [gdpExtent[0] / 1.25, gdpExtent[1] * 1.25];
  const x = scaleLog().domain(xDomain).range([plot.left, plot.right]);
  const y = scaleLinear()
    .domain(extent(points.map((p) => p.lifeExpectancy)) as [number, number])
    .nice()
    .range([plot.bottom, plot.top]);

  const placed = points.map((p) => ({
    ...p,
    x: x(p.gdpPerCapita),
    y: y(p.lifeExpectancy),
  }));
  return {
    plot,
    points: placed,
    ticksX: logTicks(xDomain).map((v) => ({ value: v, x: x(v) })),
    ticksY: y.ticks(tickHint).map((v) => ({ value: v, y: y(v) })),
  };
}

function formatGdp(v: number): string {
  if (v >= 1000) return `$${Math.round(v / 1000)}k`;
  return `$${Math.round(v)}`;
}

export function IncomeLifeExpectancyScatter({
  points,
  title,
  limits,
  source,
  alt,
  ground,
  accent,
  highlighted,
  size,
}: {
  points: Point[];
  title: string;
  limits: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  /** The few points the chart names directly, per the sheet's "name only the story's own points"
   *  rule — everything else reads as the shape of the cloud, not as individuals. */
  highlighted: {
    country: string;
    dx: number;
    dy: number;
    anchor: "start" | "end";
  }[];
  /** The size gate 2c pinned, read from this beat's own `BRIEF.md`. Not a default. */
  size: string;
}) {
  if (points.length < 10)
    throw new Error(
      "a scatter beat needs a cloud with a shape, got " +
        points.length +
        " points",
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
  // The plot starts below the LAST HEADER line, never below the source.
  const plotTop =
    limitsBaseline + (limitsLines.length - 1) * T.SUBTITLE.lead + T.HEADER_TO_PLOT;
  // The x-axis title used to sit on `height - PAD` — the slot the credit now owns. It sits
  // directly ABOVE the credit block, clear of its first line's ink.
  const axisTitleBaseline =
    sourceBaseline - T.SOURCE.fontSize - T.AXIS_TITLE_TO_SOURCE;

  // A scatter needs an axis label on both axes — unlike a bar's shared baseline, a bare number
  // here carries no cue for what a position means (the sheet's own accessibility note). Reserve a
  // strip at the bottom and the left for those, outside the plot itself, so neither collides with
  // the marks the way a corner-set label could occlude a point underneath it.
  const yAxisTitleWidth = T.AXIS_TITLE.fontSize + T.Y_AXIS_TITLE_AIR;
  const padding = {
    top: plotTop,
    right: PAD + T.PLOT_RIGHT_AIR,
    // Derived from where the axis title now sits, not from a constant: the tick-label band below
    // the plot's floor has to end above the axis title's ink. Reproduces the old reserve exactly
    // when there is no credit block to clear.
    bottom: height - axisTitleBaseline + T.AXIS_TITLE.fontSize + T.X_LABEL_BAND,
    left:
      PAD + yAxisTitleWidth + T.Y_TICK_GUTTER + measureText("90", T.AXIS),
  };

  const {
    plot,
    points: placed,
    ticksX,
    ticksY,
  } = scatterGeometry(points, {
    width,
    height,
    padding,
    tickHint: Y_TICK_HINT,
  });

  // THE LAST RUNG, FIRED RATHER THAN DESCRIBED. A scatter has no measured aspect range — it is one
  // of `type-at-size.mjs`'s two NAMED refusals — so nothing clamps its plot, and `assertTypeFloor`
  // measures the type rather than the room it has.
  if (plot.bottom - plot.top < minTypePx * 4)
    throw new Error(
      `static-income-life-expectancy: at ${size} the plot is ` +
        `${(plot.bottom - plot.top).toFixed(0)}px tall against a ${minTypePx}px type floor — a ` +
        `cloud needs room to have a shape.\n` +
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

      {ticksY.map((tick) => (
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
            x={plot.left - T.TICK_INSET}
            y={tick.y + T.TICK_BASELINE_NUDGE}
            fill={muted}
            fontSize={T.AXIS.fontSize}
            textAnchor="end"
          >
            {tick.value}
          </text>
        </g>
      ))}
      {ticksX.map((tick) => (
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
            y={plot.bottom + T.X_TICK_DROP}
            fill={muted}
            fontSize={T.AXIS.fontSize}
            textAnchor="middle"
          >
            {formatGdp(tick.value)}
          </text>
        </g>
      ))}

      <text
        transform={`translate(${PAD + T.AXIS_TITLE.fontSize - T.Y_AXIS_TITLE_AIR}, ${(plot.top + plot.bottom) / 2}) rotate(-90)`}
        fill={muted}
        fontSize={T.AXIS_TITLE.fontSize}
        fontWeight={T.AXIS_TITLE.fontWeight}
        textAnchor="middle"
      >
        Life expectancy at birth (years)
      </text>
      <text
        x={(plot.left + plot.right) / 2}
        y={axisTitleBaseline}
        fill={muted}
        fontSize={T.AXIS_TITLE.fontSize}
        fontWeight={T.AXIS_TITLE.fontWeight}
        textAnchor="middle"
      >
        GDP per capita (log scale)
      </text>

      {placed.map((p) => {
        const isHighlighted = highlighted.some((h) => h.country === p.country);
        return (
          <circle
            key={p.country}
            cx={p.x}
            cy={p.y}
            r={isHighlighted ? T.DOT_R_HIGHLIGHT : T.DOT_R}
            fill={isHighlighted ? accent : muted}
            fillOpacity={isHighlighted ? 1 : 0.55}
          />
        );
      })}

      {/* Named points get a leader line back to the dot (the sheet's own rule for a point sitting
          in a crowd) and their label in ink, never in the accent — a label's contrast is checked
          against the page, not against the mark it names (`visual-system.md`). */}
      {highlighted.map((h) => {
        const p = placed.find((pt) => pt.country === h.country);
        if (!p) return null;
        // The caller's nudges are written in the 900-wide frame this beat was tuned at, so they
        // are read at the row's own scale. Left raw, a 26px leader on a 1920px frame would have
        // parked every named country's word on top of its own dot.
        const labelX = p.x + h.dx * T.scale;
        const labelY = p.y + h.dy * T.scale;
        return (
          <g key={h.country}>
            <line
              x1={p.x}
              y1={p.y}
              x2={labelX}
              y2={labelY}
              stroke={muted}
              strokeWidth={1}
            />
            <text
              x={
                labelX +
                (h.anchor === "end" ? -T.LABEL_LEADER_GAP : T.LABEL_LEADER_GAP)
              }
              y={labelY + T.TICK_BASELINE_NUDGE}
              fill={ink}
              fontSize={T.POINT_LABEL.fontSize}
              fontWeight={T.POINT_LABEL.fontWeight}
              textAnchor={h.anchor}
            >
              {h.country}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
