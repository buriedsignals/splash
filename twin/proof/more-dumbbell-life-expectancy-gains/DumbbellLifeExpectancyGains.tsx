/**
 * Beat: life expectancy gains, 2000 -> 2023, ten countries (dumbbell / range plot).
 *
 * Written fresh from `ChartSeed.tsx`'s shape for a type that is NOT the pyramid's mirrored bars:
 * every row's two values sit on ONE shared linear scale, plotted as two dots joined by a straight
 * connector (`references/types/dumbbell.md`). Position encoding, not length encoding, so the scale
 * is fitted to the data's own extent and NOT anchored at zero — what matters is where each dot
 * sits and how far apart the pair is, not the distance from a floor. Rows are sorted by gap size,
 * descending, so the biggest differences surface at the top. Colour is capped at exactly two hues,
 * one per year, and because there is no positional convention here (unlike a slope chart's
 * left-is-earlier reading) telling a reader which dot is which series, the legend is load-bearing,
 * not decorative — the one deliberate exception to this discipline's usual "direct end labels, not
 * a legend."
 *
 * The category-label gutter is the type sheet's own named failure mode: this file measures the
 * widest country name actually drawn (`measureText`) and reserves exactly that much room, rather
 * than a constant that fits some names and clips others.
 *
 * A dumbbell's category axis is NOMINAL, so `type-at-size.mjs` answers `transpose` for it at a tall
 * frame — and this beat is already drawn in that twin form, rows running down the frame with every
 * country name horizontal on one line. Rung R0 therefore costs it nothing and no aspect clamp
 * applies. What a tall frame costs a row-driven form is ROWS, and `assertRowsFit` refuses that
 * rather than drawing names that share ink.
 */

import { extent } from "d3-array";
import { scaleLinear, scaleBand } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  measureTextBand,
  FONT_FAMILY,
} from "#shared/twin-chart-beat/render-still.mjs";
import {
  frameInsetFor,
  sizeFor,
  stageFor,
} from "#shared/twin-chart-beat/sizes.mjs";

export type Row = {
  country: string;
  y2000: number;
  y2023: number;
  gap: number;
};

/**
 * THE 900x860 TUNING, KEPT AS THE BASE, WITH THE SIZE AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more: the frame is `sizeFor(size)`'s, and `size` is the decision
 * gate 2c took, read out of this beat's own `BRIEF.md` by `render.mjs`. Before this the size was
 * stated three times as literals — here and twice in the render script — and `renderStill` compared
 * two of them against each other, so a journalist pinning `portrait` got this beat's own landscape
 * frame back in silence.
 *
 * EVERY SPACING NUMBER GOES THROUGH `sp`, not only the fonts. The fourteen bare literals this file
 * used to carry in its layout arithmetic (`+ 30`, `+ 26`, `+ 10`, `+ 18`, `+ 34`, `+ 22`, `+ 5`,
 * `± 10`, `+ 6`, `+ 90`, `+ 102`, `- 4`, and the two radii) are 900x860 tuning under no name;
 * leaving them at their literal value while the type grows is what collides a header into a plot
 * (`proof/static-carbon-footprint-spread/probe/VERDICT.md`).
 *
 * The DOT RADIUS and the connector's width are in here deliberately: a 6px dot beside a 39px value
 * label stops reading as the mark the label belongs to.
 *
 * `PAD` is the one that does NOT go through it — a frame's margin is proportional to the CANVAS,
 * not to the type (`frameInsetFor`).
 */
const BASE = {
  TITLE: { fontSize: 22, fontWeight: 700, lead: 28 },
  SOURCE: { fontSize: 14, fontWeight: 400, lead: 20 },
  LEGEND: { fontSize: 13, fontWeight: 600 },
  AXIS: { fontSize: 12, fontWeight: 400 },
  CATEGORY_LABEL: { fontSize: 14, fontWeight: 600 },
  VALUE_LABEL: { fontSize: 13, fontWeight: 600 },
  TITLE_TO_LEGEND: 30,
  LEGEND_TO_PLOT: 26,
  /** Between a legend swatch and the word it names, and between the two legend entries. */
  LEGEND_SWATCH_GAP: 12,
  LEGEND_ENTRY_GAP: 84,
  LEGEND_SWATCH_RISE: 4,
  CATEGORY_TO_VALUE: 18,
  VALUE_LABEL_GAP: 10,
  TICK_DROP: 22,
  /** The whole band the value-tick labels occupy under the plot, descender included. */
  AXIS_BAND: 34,
  AXIS_TO_SOURCE: 10,
  ROW_BASELINE_NUDGE: 5,
  DOT_RADIUS: 6,
  CONNECTOR_WIDTH: 2,
};

/** How many labelled value ticks a static frame asks for (`static-discipline.md`'s "Axis
 *  density" — conventional density for a static frame, not the sparse 2-3 tick motion rule);
 *  three where the frame is read on a phone, which is removal-ladder rung R2. */
const X_TICK_HINT = 5;
function xTickHintFor(size: string) {
  return sizeFor(size).minTypePx >= 36 ? 3 : X_TICK_HINT;
}
const UNIT = "years";

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
    LEGEND: f(BASE.LEGEND) as typeof BASE.LEGEND,
    AXIS: f(BASE.AXIS) as typeof BASE.AXIS,
    CATEGORY_LABEL: f(BASE.CATEGORY_LABEL) as typeof BASE.CATEGORY_LABEL,
    VALUE_LABEL: f(BASE.VALUE_LABEL) as typeof BASE.VALUE_LABEL,
    TITLE_TO_LEGEND: sp(BASE.TITLE_TO_LEGEND),
    LEGEND_TO_PLOT: sp(BASE.LEGEND_TO_PLOT),
    LEGEND_SWATCH_GAP: sp(BASE.LEGEND_SWATCH_GAP),
    LEGEND_ENTRY_GAP: sp(BASE.LEGEND_ENTRY_GAP),
    LEGEND_SWATCH_RISE: sp(BASE.LEGEND_SWATCH_RISE),
    CATEGORY_TO_VALUE: sp(BASE.CATEGORY_TO_VALUE),
    VALUE_LABEL_GAP: sp(BASE.VALUE_LABEL_GAP),
    TICK_DROP: sp(BASE.TICK_DROP),
    AXIS_BAND: sp(BASE.AXIS_BAND),
    AXIS_TO_SOURCE: sp(BASE.AXIS_TO_SOURCE),
    ROW_BASELINE_NUDGE: sp(BASE.ROW_BASELINE_NUDGE),
    DOT_RADIUS: sp(BASE.DOT_RADIUS),
    CONNECTOR_WIDTH: sp(BASE.CONNECTOR_WIDTH),
  };
}

/**
 * REFUSE ROWS THE READER CANNOT TELL APART.
 *
 * The row-driven twin form has no aspect to distort, so `assertPlotAspect` never fires on it — and
 * that is exactly why this exists. What a tall frame takes from a band-scale type is not its shape,
 * it is its ROW BUDGET: the header, the legend and the credit all grow with the type, the frame's
 * height does not, and at some point ten rows are pitched closer together than one line of the type
 * that names them. Nothing clips, nothing throws, and the names run into each other.
 *
 * The floor is MEASURED and not chosen: `measureTextBand` returns the real ascent and descent of
 * the strings this beat actually draws, so the condition is exactly "two adjacent names share ink"
 * rather than a ratio somebody liked — the same reason `assertTypeFloor` reads the rendered markup
 * instead of trusting the multiplier that produced it.
 *
 * Rung R8 of the ladder is the honest answer above this — fewer rows, AND say so — and R9 is the
 * refusal, which is what this is.
 */
export function assertRowsFit(
  step: number,
  names: string[],
  label: { fontSize: number; fontWeight: number },
  size: string,
  { what = "this render" }: { what?: string } = {},
) {
  const bands = names.map((n) => {
    const band = measureTextBand(n, label);
    return { name: n, ink: band.ascent + band.descent };
  });
  const tallest = bands.reduce((a, b) => (b.ink > a.ink ? b : a));
  if (step >= tallest.ink) return step;
  throw new Error(
    `${what}: ${names.length} rows at ${size} are pitched ${step.toFixed(1)}px apart, under the ` +
      `${tallest.ink.toFixed(1)}px of ink one of their own names actually draws ("${tallest.name}" ` +
      `at ${label.fontSize}px, ascent and descent measured, not estimated). Nothing is clipped and ` +
      `nothing overflows the frame — the names simply run into each other, which is the band-scale ` +
      `twin of the stretched plot no counter in this project could see. The ladder above this rung ` +
      `is R8: carry fewer rows and SAY SO in the chart. This rung is R9 — the beat does not ship ` +
      `${size}, and the journalist is offered the sizes it does.`,
  );
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

function formatValue(v: number): string {
  return v.toFixed(1);
}

/**
 * Pure geometry: rows to dot pairs on one shared scale. The scale is fitted to the extent of
 * EVERY value plotted (both years, all countries), `.nice()`d, and NOT anchored at zero — this is
 * a position encoding, exactly like a slope chart's, so the floor is not part of the claim.
 * `rows` must already be sorted (by gap, descending) before this runs: `scaleBand`'s domain order
 * is what puts the biggest gap at the top of the frame.
 */
export function dumbbellGeometry(
  rows: Row[],
  {
    width,
    height,
    padding,
    xTickHint = X_TICK_HINT,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    /** Travels with the call, so the drawn gridlines and the measured labels are one list. */
    xTickHint?: number;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const values = rows.flatMap((r) => [r.y2000, r.y2023]);
  const scale = scaleLinear()
    .domain(extent(values) as [number, number])
    .nice()
    .range([plot.left, plot.right]);

  const y = scaleBand()
    .domain(rows.map((r) => r.country))
    .range([plot.top, plot.bottom])
    .paddingInner(0.32);

  const dots = rows.map((r) => ({
    country: r.country,
    gap: r.gap,
    rowY: y(r.country)! + y.bandwidth() / 2,
    x2000: scale(r.y2000),
    x2023: scale(r.y2023),
    y2000: r.y2000,
    y2023: r.y2023,
  }));

  const ticks = scale.ticks(xTickHint);
  return {
    plot,
    dots,
    step: y.step(),
    ticksX: ticks.map((value) => ({ value, x: scale(value) })),
  };
}

export function DumbbellLifeExpectancyGains({
  rows,
  title,
  source,
  alt,
  ground,
  startInk,
  endInk,
  size,
}: {
  rows: Row[];
  title: string;
  source: string;
  alt: string;
  ground: string;
  /** The size gate 2c pinned, read from this beat's own `BRIEF.md`. Not a default. */
  size: string;
  /** The earlier year's dot colour, and the later year's. Two CVD-safe hues, capped at exactly two
   *  per `references/types/dumbbell.md`, each reused consistently across every row so a reader
   *  learns "which dot is which series" once and applies it to the whole chart. They arrive as
   *  props because they are the newsroom's recorded answer, read from `PALETTE.md` by the runner —
   *  naming them here would put the answer back in the source, where no recorded choice reaches
   *  it. */
  startInk: string;
  endInk: string;
}) {
  if (rows.length < 2)
    throw new Error(
      "a dumbbell beat needs at least two rows, got " + rows.length,
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height, typeScale } = sizeFor(size);
  // The band this beat may draw in. At portrait the platform reserves 14% at the top and 35% at the
  // foot; content there is at RISK OF BEING COVERED, which no clipping counter can see.
  const stage = stageFor(size);
  const PAD = frameInsetFor(size);
  const {
    TITLE,
    SOURCE,
    LEGEND,
    AXIS,
    CATEGORY_LABEL,
    VALUE_LABEL,
    TITLE_TO_LEGEND,
    LEGEND_TO_PLOT,
    LEGEND_SWATCH_GAP,
    LEGEND_ENTRY_GAP,
    LEGEND_SWATCH_RISE,
    CATEGORY_TO_VALUE,
    VALUE_LABEL_GAP,
    TICK_DROP,
    AXIS_BAND,
    AXIS_TO_SOURCE,
    ROW_BASELINE_NUDGE,
    DOT_RADIUS,
    CONNECTOR_WIDTH,
  } = tokens(typeScale);
  const contentTop = stage.reserved ? stage.top : PAD;
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;

  // Header laid out first; the plot starts where the header stops.
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = contentTop + TITLE.fontSize;
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  // THE SOURCE SITS ON THE BOTTOM OF THE BAND — the LAST line lands there, the same edge the title
  // hangs off at the top, on the same x, so a wrapped credit grows upward into the frame rather
  // than downward out of it. See twin-chart-beat/references/static-discipline.md, "The source on
  // the frame's bottom margin." At portrait that bottom is the STAGE's, not the frame's: below 1248
  // is the platform's caption and progress bar, and a covered credit is an attribution failure
  // rather than a cosmetic one.
  const sourceBaseline = sourceBottom - (sourceLines.length - 1) * SOURCE.lead;
  // The legend keeps the air it always had above it, measured from the LAST HEADER line rather
  // than from the source, which is no longer in the header.
  const legendBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + TITLE_TO_LEGEND;

  // The category gutter is measured from the widest name actually drawn — the type sheet's own
  // named failure mode (`references/types/dumbbell.md`, "The one thing that goes wrong"): this
  // chart has, in production, shipped with zero reserved space for this column before.
  const categoryGutter = Math.max(
    ...rows.map((r) => measureText(r.country, CATEGORY_LABEL)),
  );
  // Value labels sit on the OUTER side of each dot, so both the left and right frame edges need
  // room reserved for the widest label that could land there — measured, not guessed, same
  // discipline as the category gutter.
  const leftLabelGutter = Math.max(
    ...rows.map((r) => measureText(formatValue(r.y2000), VALUE_LABEL)),
  );
  const rightLabelGutter = Math.max(
    ...rows.map((r) => measureText(formatValue(r.y2023), VALUE_LABEL)),
  );

  const padding = {
    top: legendBaseline + LEGEND_TO_PLOT,
    right: PAD + VALUE_LABEL_GAP + rightLabelGutter,
    // Derived from where the credit now sits, not from a constant: the value-tick band under the
    // plot's floor has to end above the credit's first line of ink.
    bottom:
      height - (sourceBaseline - SOURCE.fontSize - AXIS_TO_SOURCE) + AXIS_BAND,
    left:
      PAD +
      categoryGutter +
      CATEGORY_TO_VALUE +
      VALUE_LABEL_GAP +
      leftLabelGutter,
  };

  const { plot, dots, ticksX, step } = dumbbellGeometry(rows, {
    width,
    height,
    padding,
    xTickHint: xTickHintFor(size),
  });
  // THE LEGEND'S SECOND ENTRY IS MEASURED OFF THE FIRST, not offset by a literal. `PAD + 90` was
  // the width of the word "2000" at 13px plus air; at a phone's type scale that word is 39px tall
  // and the two entries overlapped. Laid out left to right from the strings actually drawn.
  const legendEntries = [
    { label: "2000", fill: startInk },
    { label: "2023", fill: endInk },
  ].reduce<{ label: string; fill: string; swatchX: number; textX: number }[]>(
    (acc, entry) => {
      const previous = acc[acc.length - 1];
      const swatchX = previous
        ? previous.textX +
          measureText(previous.label, LEGEND) +
          LEGEND_ENTRY_GAP +
          DOT_RADIUS
        : PAD + DOT_RADIUS;
      return [
        ...acc,
        {
          ...entry,
          swatchX,
          textX: swatchX + DOT_RADIUS + LEGEND_SWATCH_GAP,
        },
      ];
    },
    [],
  );

  // THE ROW BUDGET, refused before anything is drawn. A row-driven form has no aspect to distort,
  // so nothing else in the toolchain looks at what a tall frame does to ten rows.
  assertRowsFit(
    step,
    rows.map((r) => r.country),
    CATEGORY_LABEL,
    size,
    { what: "more-dumbbell-life-expectancy-gains" },
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

      {/* Load-bearing legend, not decorative: with no time-axis convention telling left from
          right, the two dot colours are the ONLY thing naming which series is which, on every
          single row (`references/types/dumbbell.md`, "The accessibility trap"). */}
      {legendEntries.map((entry) => (
        <g key={entry.label}>
          <circle
            cx={entry.swatchX}
            cy={legendBaseline - LEGEND_SWATCH_RISE}
            r={DOT_RADIUS}
            fill={entry.fill}
          />
          <text
            x={entry.textX}
            y={legendBaseline}
            fill={ink}
            fontSize={LEGEND.fontSize}
            fontWeight={LEGEND.fontWeight}
          >
            {entry.label}
          </text>
        </g>
      ))}

      {/* Vertical gridlines on the shared value scale — decoration, not a competing mark. The
          unit is stated once, on the rightmost tick actually drawn. */}
      {ticksX.map((tick, i) => (
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
            y={plot.bottom + TICK_DROP}
            fill={muted}
            fontSize={AXIS.fontSize}
            textAnchor="middle"
          >
            {i === ticksX.length - 1 ? `${tick.value} ${UNIT}` : tick.value}
          </text>
        </g>
      ))}

      {dots.map((d) => (
        <g key={d.country}>
          {/* Category label, left-aligned in its own measured column. */}
          <text
            x={PAD}
            y={d.rowY + ROW_BASELINE_NUDGE}
            fill={ink}
            fontSize={CATEGORY_LABEL.fontSize}
            fontWeight={CATEGORY_LABEL.fontWeight}
          >
            {d.country}
          </text>

          {/* The connector reads as neutral scaffolding, not a third mark competing with the
              two dots — its whole job is to make the gap visible as a length. */}
          <line
            x1={d.x2000}
            x2={d.x2023}
            y1={d.rowY}
            y2={d.rowY}
            stroke={muted}
            strokeWidth={CONNECTOR_WIDTH}
            strokeLinecap="round"
          />

          <circle cx={d.x2000} cy={d.rowY} r={DOT_RADIUS} fill={startInk} />
          <circle cx={d.x2023} cy={d.rowY} r={DOT_RADIUS} fill={endInk} />

          {/* Value labels on the OUTER side of each dot, in ink — never in either dot's own
              accent colour, which has previously failed WCAG contrast here
              (`references/types/dumbbell.md`, "The accessibility trap"). */}
          <text
            x={d.x2000 - DOT_RADIUS - VALUE_LABEL_GAP}
            y={d.rowY + ROW_BASELINE_NUDGE}
            fill={ink}
            fontSize={VALUE_LABEL.fontSize}
            fontWeight={VALUE_LABEL.fontWeight}
            textAnchor="end"
          >
            {formatValue(d.y2000)}
          </text>
          <text
            x={d.x2023 + DOT_RADIUS + VALUE_LABEL_GAP}
            y={d.rowY + ROW_BASELINE_NUDGE}
            fill={ink}
            fontSize={VALUE_LABEL.fontSize}
            fontWeight={VALUE_LABEL.fontWeight}
            textAnchor="start"
          >
            {formatValue(d.y2023)}
          </text>
        </g>
      ))}
    </svg>
  );
}
