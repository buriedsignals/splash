/**
 * Beat: world population, 1800-2023 (area).
 *
 * Written fresh from `ChartSeed.tsx`'s shape for a type whose fill is a CLAIM, not decoration
 * (`references/types/area.md`): population is exactly the "stock, accumulated" case the sheet
 * names as the right use of a fill — a level, not a rate — so the value axis includes zero (the
 * same non-negotiable rule as any length-encoded mark, restated for a filled area's AREA rather
 * than a bar's height) and the fitted-scale-with-honest-ticks treatment `ChartSeed.tsx` uses for a
 * line does NOT apply here; this is the bar family's zero rule, not the line family's fitted one.
 */

import { extent, tickStep } from "d3-array";
import { scaleLinear } from "d3-scale";
import { area, line } from "d3-shape";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor, stageFor } from "#shared/chart-beat/sizes.mjs";

export type Reading = { year: number; population: number };

/** The type this beat draws, in `references/types/` vocabulary. `formForSize` answers for it, and
 *  a size it refuses is refused by the runner before a mark is drawn. */
export const TYPE = "area";

/**
 * THE 900-WIDE TUNING, KEPT AS THE BASE, WITH THE SIZE ROW'S `typeScale` AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more, and its absence is the point: the frame is `sizeFor(size)`'s,
 * and `size` is the decision gate 2c took, read out of this beat's own `BRIEF.md` by `render.mjs`.
 * Before this the size was stated TWICE as literals — once here and once in the render script — and
 * `renderStill` compared them against each other, so they agreed by construction and the delivered
 * PNG measured 1800x1120, a size nobody chose.
 *
 * EVERY SPACING NUMBER GOES THROUGH `sp`, not only the fonts. Eleven bare literals lived in the
 * layout arithmetic below (`+ 30`, `+ 34`, `+ 12`, `+ 24`, `+ 10` twice, `+ 4`, `- 10`, `- 12`,
 * `+ 5`, and the two mark radii), and scaling the type while leaving them is measured to collide the
 * title into the subtitle (`proof/static-carbon-footprint-spread/probe/VERDICT.md`). `PAD` is the
 * one that does NOT go through it: a frame's margin is proportional to the CANVAS, not to the type —
 * `frameInsetFor` in `sizes.mjs` states the split and argues it.
 */
const BASE = {
  TITLE: { fontSize: 26, fontWeight: 700, lead: 34 },
  SUBTITLE: { fontSize: 14, fontWeight: 400, lead: 20 },
  SOURCE: { fontSize: 14, fontWeight: 400 },
  AXIS: { fontSize: 13, fontWeight: 400 },
  LABEL: { fontSize: 15, fontWeight: 600 },
  NOTE: { fontSize: 13, fontWeight: 400 },
  TITLE_TO_SUBTITLE: 30,
  HEADER_TO_PLOT: 34,
  END_LABEL_GUTTER: 12,
  END_LABEL_GAP: 10,
  END_LABEL_NUDGE: 5,
  X_LABEL_BAND: 24,
  X_TICK_DROP: 24,
  SOURCE_AIR: 10,
  Y_TICK_GUTTER: 10,
  Y_TICK_INSET: 10,
  TICK_BASELINE_NUDGE: 4,
  /** The mark's own weight and the two dot radii. A mark's size is a frame quantity like any
   *  other — left at its 900px value on a 1920px frame the end dot would have read as a speck. */
  LINE_WIDTH: 2.5,
  CROSSING_DOT_R: 3,
  CROSSING_LABEL_DROP: 12,
  END_DOT_R: 4,
} as const;

/** How many gridlines each axis asks d3 for. COUNTS, not spacing numbers — they deliberately do
 *  NOT go through `sp`: multiplied by a 2.2 type scale the y axis would have asked for eleven. */
const Y_TICK_HINT = 5;
const X_TICK_HINT = 6;

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
    LABEL: f(BASE.LABEL) as typeof BASE.LABEL,
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    TITLE_TO_SUBTITLE: sp(BASE.TITLE_TO_SUBTITLE),
    HEADER_TO_PLOT: sp(BASE.HEADER_TO_PLOT),
    END_LABEL_GUTTER: sp(BASE.END_LABEL_GUTTER),
    END_LABEL_GAP: sp(BASE.END_LABEL_GAP),
    END_LABEL_NUDGE: sp(BASE.END_LABEL_NUDGE),
    X_LABEL_BAND: sp(BASE.X_LABEL_BAND),
    X_TICK_DROP: sp(BASE.X_TICK_DROP),
    SOURCE_AIR: sp(BASE.SOURCE_AIR),
    Y_TICK_GUTTER: sp(BASE.Y_TICK_GUTTER),
    Y_TICK_INSET: sp(BASE.Y_TICK_INSET),
    TICK_BASELINE_NUDGE: sp(BASE.TICK_BASELINE_NUDGE),
    LINE_WIDTH: Math.max(1, sp(BASE.LINE_WIDTH)),
    CROSSING_DOT_R: Math.max(1, sp(BASE.CROSSING_DOT_R)),
    CROSSING_LABEL_DROP: sp(BASE.CROSSING_LABEL_DROP),
    END_DOT_R: Math.max(1, sp(BASE.END_DOT_R)),
  };
}

/**
 * The removal ladder this beat runs, per size, recorded so the render can print it and the artifact
 * can carry it. At a phone frame the type floor is 36px, which triples the headline and the credit,
 * so R3 fires before a mark is drawn — and this beat's standfirst is a two-clause caveat about
 * where the numbers come from, which is exactly what R3 is for.
 *
 * It is written for all three rows rather than for the one this beat pins, because `--size` renders
 * the other two into `sizes/` for looking at, and a ladder that only knew about landscape would make
 * those comparisons a fiction.
 */
export function rungsFor(size: string): string[] {
  if (sizeFor(size).minTypePx < 36) return [];
  return ["R3: the standfirst keeps its first clause only"];
}

function firstClause(text: string): string {
  const stop = text.indexOf(";");
  return stop === -1 ? text : `${text.slice(0, stop)}.`;
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

/** Pure geometry. X is the readings' own first-to-last span, never nicened outward (the same
 *  reasoning `ChartSeed.tsx`'s `lineGeometry` uses). Y is `.nice()`d from a zero floor — the
 *  bar-family rule, because the fill's AREA is what a reader measures here. */
export function areaGeometry(
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
  const y = scaleLinear()
    .domain([0, extent(data.map((d) => d.population))[1] as number])
    .nice()
    .range([plot.bottom, plot.top]);

  const points = data.map((d) => ({
    year: d.year,
    population: d.population,
    x: x(d.year),
    y: y(d.population),
  }));

  const areaPath = area<(typeof points)[number]>()
    .x((p) => p.x)
    .y0(y(0))
    .y1((p) => p.y)(points)!;
  const linePath = line<(typeof points)[number]>()
    .x((p) => p.x)
    .y((p) => p.y)(points)!;

  const step = tickStep(first, last, X_TICK_HINT);
  const ticksX: number[] = [];
  for (let year = Math.ceil(first / step) * step; year <= last; year += step)
    ticksX.push(year);

  return {
    plot,
    points,
    areaPath,
    linePath,
    end: points[points.length - 1],
    zeroY: y(0),
    ticksY: y.ticks(Y_TICK_HINT).map((v) => ({ value: v, y: y(v) })),
    ticksX: ticksX.map((year) => ({ year, x: x(year) })),
  };
}

function billions(v: number): string {
  return (v / 1e9).toFixed(1);
}

export function WorldPopulationArea({
  data,
  title,
  limits,
  source,
  alt,
  ground,
  accent,
  crossing,
  size,
}: {
  data: Reading[];
  title: string;
  limits: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  crossing: { year: number; population: number; label: string };
  /** The size gate 2c pinned, read from this beat's own `BRIEF.md`. Not a default. */
  size: string;
}) {
  if (data.length < 2)
    throw new Error(
      "an area beat needs at least two readings, got " + data.length,
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height, typeScale, minTypePx } = sizeFor(size);
  // The band this beat may draw in. At portrait the platform reserves 14% at the top and 35% at the
  // foot; content there is at RISK OF BEING COVERED, which no clipping counter can see.
  const stage = stageFor(size);
  const PAD = frameInsetFor(size);
  const T = tokens(typeScale);
  const rungs = rungsFor(size);
  const contentTop = stage.reserved ? stage.top : PAD;
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;

  const titleLines = wrap(title, width - PAD * 2, T.TITLE);
  const titleBaseline = contentTop + T.TITLE.fontSize;
  const standfirst = rungs.some((r) => r.startsWith("R3"))
    ? firstClause(limits)
    : limits;
  const limitsLines = wrap(standfirst, width - PAD * 2, T.SUBTITLE);
  const limitsBaseline =
    titleBaseline +
    (titleLines.length - 1) * T.TITLE.lead +
    T.TITLE_TO_SUBTITLE;
  const sourceLines = wrap(source, width - PAD * 2, T.SOURCE);
  // THE SOURCE SITS ON THE BOTTOM OF THE BAND — the LAST line lands there, the same edge the title
  // hangs off at the top, on the same x. See
  // chart-beat/references/static-discipline.md, "The source on the frame's bottom margin".
  // At portrait that bottom is the STAGE's, not the frame's: below 1248 is the platform's caption
  // and progress bar, and a covered credit is an attribution failure rather than a cosmetic one.
  const sourceBaseline =
    sourceBottom - (sourceLines.length - 1) * T.SUBTITLE.lead;

  const last = data[data.length - 1];
  const endLabel = `${last.year} · ${billions(last.population)} billion`;

  const rawTicks = scaleLinear()
    .domain([0, extent(data.map((d) => d.population))[1] as number])
    .nice()
    .ticks(Y_TICK_HINT);
  const tickLabels = rawTicks.map((v, i, all) =>
    i === all.length - 1 ? `${billions(v)} B` : billions(v),
  );

  const padding = {
    // The plot starts below the LAST HEADER line, never below the source.
    top:
      limitsBaseline +
      (limitsLines.length - 1) * T.SUBTITLE.lead +
      T.HEADER_TO_PLOT,
    right: PAD + T.END_LABEL_GUTTER + measureText(endLabel, T.LABEL),
    // Grown by the source block's own height plus clear air: the credit sits on the bottom of the
    // band, so the strip beneath the plot has to end above its ink.
    bottom:
      height -
      sourceBaseline +
      T.X_LABEL_BAND +
      (sourceLines.length - 1) * T.SUBTITLE.lead +
      T.SOURCE.fontSize +
      T.SOURCE_AIR,
    left:
      PAD +
      T.Y_TICK_GUTTER +
      Math.max(...tickLabels.map((l) => measureText(l, T.AXIS))),
  };

  const { plot, areaPath, linePath, end, zeroY, ticksY, ticksX, points } =
    areaGeometry(data, { width, height, padding });
  const crossingPoint = points.find((p) => p.year === crossing.year);

  // THE CONTEXT MARKER'S WORD, ANCHORED WHERE IT FITS RATHER THAN ALWAYS CENTRED.
  //
  // It was `textAnchor="middle"` on the point's own x, and the first 1920x1080 render is why it is
  // not: 1805 sits four years into a 224-year span, so the label is hard against the plot's left
  // rail, and at 29px it ran out through the y axis and printed straight through the "2.0" tick
  // label. Nothing was clipped and nothing threw — the frame simply got bigger and the type got
  // bigger faster. The side it hangs off is DERIVED from where the point sits against its own
  // plot, so a different crossing year moves it without anyone retyping an offset.
  const crossingLabelWidth = crossingPoint
    ? measureText(crossing.label, T.NOTE)
    : 0;
  const crossingAnchor: "start" | "middle" | "end" = !crossingPoint
    ? "middle"
    : crossingPoint.x - crossingLabelWidth / 2 < plot.left
      ? "start"
      : crossingPoint.x + crossingLabelWidth / 2 > plot.right
        ? "end"
        : "middle";
  const crossingLabelX = !crossingPoint
    ? 0
    : crossingAnchor === "start"
      ? crossingPoint.x + T.CROSSING_DOT_R + T.END_LABEL_GAP
      : crossingAnchor === "end"
        ? crossingPoint.x - T.CROSSING_DOT_R - T.END_LABEL_GAP
        : crossingPoint.x;

  // THE LAST RUNG, FIRED RATHER THAN DESCRIBED. An area chart has no measured aspect range — it is
  // one of the types `type-at-size.mjs` refuses at a tall frame for exactly that reason — so
  // nothing clamps this plot, and `assertTypeFloor` measures the TYPE rather than the room it has.
  // What an area needs is height for its fill to have a profile: at 1080x1080 with the type at the
  // phone's 36px floor, a header and a credit can take the whole frame and leave a 30px strip that
  // clips nothing, collides with nothing, and is not a chart.
  if (plot.bottom - plot.top < minTypePx * 4)
    throw new Error(
      `static-world-population: at ${size} the plot is ` +
        `${(plot.bottom - plot.top).toFixed(0)}px tall against a ${minTypePx}px type floor — a ` +
        `filled level needs room to have a profile.\n` +
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
            x={plot.left - T.Y_TICK_INSET}
            y={tick.y + T.TICK_BASELINE_NUDGE}
            fill={muted}
            fontSize={T.AXIS.fontSize}
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
          y={plot.bottom + T.X_TICK_DROP}
          fill={muted}
          fontSize={T.AXIS.fontSize}
          textAnchor="middle"
        >
          {tick.year}
        </text>
      ))}

      {/* The fill IS the claim for this type: a level accumulated over time, read as an area, not
          a rate sampled at points (`references/types/area.md`). */}
      <path d={areaPath} fill={accent} fillOpacity={0.18} />
      <path
        d={linePath}
        fill="none"
        stroke={accent}
        strokeWidth={T.LINE_WIDTH}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {crossingPoint && (
        <g>
          <circle
            cx={crossingPoint.x}
            cy={crossingPoint.y}
            r={T.CROSSING_DOT_R}
            fill={muted}
          />
          <text
            x={crossingLabelX}
            y={crossingPoint.y - T.CROSSING_LABEL_DROP}
            fill={muted}
            fontSize={T.NOTE.fontSize}
            textAnchor={crossingAnchor}
          >
            {crossing.label}
          </text>
        </g>
      )}

      <circle cx={end.x} cy={end.y} r={T.END_DOT_R} fill={accent} />
      <text
        x={plot.right + T.END_LABEL_GAP}
        y={end.y + T.END_LABEL_NUDGE}
        fill={accent}
        fontSize={T.LABEL.fontSize}
        fontWeight={T.LABEL.fontWeight}
      >
        {endLabel}
      </text>
    </svg>
  );
}
