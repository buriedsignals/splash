/**
 * Beat: 2024 per-capita CO2 emissions across 15 European countries, ranked (lollipop).
 *
 * Written fresh from `ChartSeed.tsx`'s shape for a type that is "a bar, minus the fill"
 * (`references/types/lollipop.md`): one category band axis (country) crossed with one linear
 * value axis running from zero to the data's own max — a stem per row, capped with a dot, never
 * a mirrored two-sided chart. The value axis keeps the bar family's non-negotiable zero floor
 * (`static-discipline.md`'s "Honest scale" — length encoding, the opposite of the line rule this
 * doctrine also carries) even though the mark is thin enough to tempt otherwise.
 *
 * Orientation is horizontal — category names read left-to-right without rotation, and the stem's
 * rightward length is the thing a reader measures, same posture as the population pyramid's
 * horizontal bars but single-sided. That posture is also, exactly, the TWIN FORM `type-at-size.mjs`
 * asks a band-scale type to take at a tall frame — so this beat arrives at portrait already
 * transposed, and rung R0 of the removal ladder costs it nothing. What a tall frame does cost it is
 * ROWS, and that is what `assertRowsFit` below refuses rather than draws.
 */

import { scaleLinear, scaleBand } from "d3-scale";
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

export type Row = { country: string; value: number };

/**
 * THE 900x800 TUNING, KEPT AS THE BASE, WITH THE SIZE AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more, and its absence is the point: the frame is `sizeFor(size)`'s,
 * and `size` is the decision gate 2c took, read out of this beat's own `BRIEF.md` by `render.mjs`.
 * Before this, the size was stated TWICE as literals — once here and once in the render script —
 * and `renderStill` compared them against each other, so they agreed by construction and a
 * journalist pinning `portrait` got this component's landscape frame back in silence.
 *
 * EVERY SPACING NUMBER GOES THROUGH `sp`, not only the fonts — the probe's sharpest finding
 * (`proof/static-carbon-footprint-spread/probe/VERDICT.md`): the named font constants are not a
 * beat's whole tuning. The nine bare literals this file used to carry inside its layout arithmetic
 * (`+ 30`, `+ 14`, `+ 10`, `+ 22`, `+ 8`, `+ 5`, `± 11`, and the two mark dimensions) are 900x800
 * tuning under no name, and scaling the type while leaving them at their literal value is what
 * collides a header into a plot.
 *
 * The two MARK dimensions are in here deliberately. A dot that stays 5px while its own value label
 * grows to 42px stops being the cap on a stem and becomes a speck beside a word.
 *
 * `PAD` is the one that does NOT go through it: a frame's margin is proportional to the CANVAS, not
 * to the type — `frameInsetFor` in `sizes.mjs` states the split and why.
 */
const BASE = {
  TITLE: { fontSize: 24, fontWeight: 700, lead: 30 },
  SOURCE: { fontSize: 14, fontWeight: 400, lead: 20 },
  CATEGORY_LABEL: { fontSize: 14, fontWeight: 400 },
  VALUE_LABEL: { fontSize: 14, fontWeight: 600 },
  AXIS: { fontSize: 12, fontWeight: 400 },
  TITLE_TO_PLOT: 30,
  CATEGORY_GUTTER_AIR: 10,
  VALUE_LABEL_GAP: 8,
  VALUE_GUTTER_AIR: 14,
  /** From the plot's floor down to the tick labels' own baseline. */
  TICK_DROP: 22,
  /** The whole band the tick labels occupy under the plot, descender included. */
  AXIS_BAND: 34,
  /** Clear air between the tick labels' descenders and the credit's first line of ink. */
  AXIS_TO_SOURCE: 10,
  /** Half the height of the hole a value label punches in a gridline it would otherwise share. */
  GRID_GAP_HALF: 11,
  /** A text baseline sits below the row's centre by roughly a third of a cap height. */
  ROW_BASELINE_NUDGE: 5,
  DOT_RADIUS: 5,
  STEM_WIDTH: 2.5,
};

const UNIT = "t";

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
    CATEGORY_LABEL: f(BASE.CATEGORY_LABEL) as typeof BASE.CATEGORY_LABEL,
    VALUE_LABEL: f(BASE.VALUE_LABEL) as typeof BASE.VALUE_LABEL,
    AXIS: f(BASE.AXIS) as typeof BASE.AXIS,
    TITLE_TO_PLOT: sp(BASE.TITLE_TO_PLOT),
    CATEGORY_GUTTER_AIR: sp(BASE.CATEGORY_GUTTER_AIR),
    VALUE_LABEL_GAP: sp(BASE.VALUE_LABEL_GAP),
    VALUE_GUTTER_AIR: sp(BASE.VALUE_GUTTER_AIR),
    TICK_DROP: sp(BASE.TICK_DROP),
    AXIS_BAND: sp(BASE.AXIS_BAND),
    AXIS_TO_SOURCE: sp(BASE.AXIS_TO_SOURCE),
    GRID_GAP_HALF: sp(BASE.GRID_GAP_HALF),
    ROW_BASELINE_NUDGE: sp(BASE.ROW_BASELINE_NUDGE),
    DOT_RADIUS: sp(BASE.DOT_RADIUS),
    STEM_WIDTH: BASE.STEM_WIDTH * typeScale,
  };
}

/** How many labelled gridlines the value axis asks for — the static genre's conventional density
 *  in an article column (`static-discipline.md`, "Axis density"); three where the frame is read on
 *  a phone, which is removal-ladder rung R2, the only rung that gives budget back without removing
 *  anything vertical. */
const VALUE_TICK_HINT = 5;
function valueTickHintFor(size: string) {
  return sizeFor(size).minTypePx >= 36 ? 3 : VALUE_TICK_HINT;
}

/** Pure geometry: rows (already sorted by the caller) to stem/dot coordinates. Knows no colour,
 *  no font, no label — the same boundary `ChartSeed.tsx`'s `lineGeometry` draws. */
export function lollipopGeometry(
  rows: Row[],
  {
    width,
    height,
    padding,
    valueTickHint = VALUE_TICK_HINT,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    /** Travels with the call, so the drawn gridlines and the measured labels are one list. */
    valueTickHint?: number;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };

  // The value axis is a length encoding, so it is fitted from zero — not from the data's own
  // minimum, which is the line-chart rule this type explicitly does not inherit
  // (`references/types/lollipop.md`, "The one thing that goes wrong").
  const maxValue = Math.max(...rows.map((r) => r.value));
  const x = scaleLinear()
    .domain([0, maxValue])
    .nice()
    .range([plot.left, plot.right]);

  // Band padding wide enough that a row of thin stems reads as separated rows, not a solid mass
  // — the reason this type exists as distinct from a bar in the first place.
  const y = scaleBand()
    .domain(rows.map((r) => r.country))
    .range([plot.top, plot.bottom])
    .paddingInner(0.45)
    .paddingOuter(0.3);

  const points = rows.map((r) => {
    const rowY = y(r.country)! + y.bandwidth() / 2;
    return { country: r.country, value: r.value, rowY, dotX: x(r.value) };
  });

  const ticks = x.ticks(valueTickHint);
  return {
    plot,
    zeroX: x(0),
    points,
    step: y.step(),
    ticks: ticks.map((v) => ({ value: v, x: x(v) })),
  };
}

/**
 * REFUSE ROWS THE READER CANNOT TELL APART.
 *
 * The row-driven twin form has no aspect to distort, so `assertPlotAspect` never fires on it — and
 * that is exactly why this exists. What a tall frame takes from a band-scale type is not its shape,
 * it is its ROW BUDGET: the header and the credit grow with the type, the plot's height does not,
 * and at some point fifteen rows are pitched closer together than one line of the type that names
 * them. Nothing clips, nothing throws, and the names run into each other.
 *
 * The floor is MEASURED and not chosen: `measureTextBand` returns the real ascent and descent of
 * the actual strings this beat draws, so the condition is exactly "two adjacent names share ink"
 * rather than a ratio somebody liked. A ratio would have been the same mistake `assertTypeFloor`
 * exists to avoid — trusting a multiplier instead of the rendered markup. (`Belgium` and `Portugal`
 * carry the descender; `United Kingdom` carries the ascender; the widest band wins.)
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

/** Wrap on the measured width of the real string, never on a character count. */
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
  return `${v.toFixed(1)} ${UNIT}`;
}

/** A regular value-axis gridline that would pass straight through a row's own value label is
 *  dropped for that row's band only — not thinned, removed — the same "remove the competing
 *  line" fix `static-discipline.md` states for a hand-placed reference line, generalised here
 *  because with 15 rows any tick can land under any row's label, not just one chosen annotation.
 *  Returns the visible [y1, y2] segments of one vertical gridline once its collisions are cut
 *  out. */
function verticalSegments(
  top: number,
  bottom: number,
  gaps: [number, number][],
): [number, number][] {
  const sorted = [...gaps].sort((a, b) => a[0] - b[0]);
  const segments: [number, number][] = [];
  let cursor = top;
  for (const [gapStart, gapEnd] of sorted) {
    const start = Math.max(cursor, top);
    const end = Math.min(gapStart, bottom);
    if (end > start) segments.push([start, end]);
    cursor = Math.max(cursor, gapEnd);
  }
  if (cursor < bottom) segments.push([cursor, bottom]);
  return segments;
}

export function LollipopCo2({
  rows,
  title,
  source,
  alt,
  ground,
  accent,
  subject,
  size,
}: {
  /** Already sorted descending by value by the caller — this component draws rows in the order
   *  given rather than re-sorting, so the deliberate ranking read is a decision made once, at the
   *  data layer, not silently redone here. */
  rows: Row[];
  title: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  subject: string;
  /** The size gate 2c pinned, read from this beat's own `BRIEF.md`. Not a default. */
  size: string;
}) {
  if (rows.length < 3)
    throw new Error(
      "a lollipop beat needs at least three rows, got " + rows.length,
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
    CATEGORY_LABEL,
    VALUE_LABEL,
    AXIS,
    TITLE_TO_PLOT,
    CATEGORY_GUTTER_AIR,
    VALUE_LABEL_GAP,
    VALUE_GUTTER_AIR,
    TICK_DROP,
    AXIS_BAND,
    AXIS_TO_SOURCE,
    GRID_GAP_HALF,
    ROW_BASELINE_NUDGE,
    DOT_RADIUS,
    STEM_WIDTH,
  } = tokens(typeScale);
  const contentTop = stage.reserved ? stage.top : PAD;
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = contentTop + TITLE.fontSize;
  // THE SOURCE SITS ON THE BOTTOM OF THE BAND — the LAST line lands there, the same edge the title
  // hangs off at the top, on the same x. See chart-beat/references/static-discipline.md,
  // "The source on the frame's bottom margin." At portrait that bottom is the STAGE's, not the
  // frame's: below 1248 is the platform's caption and progress bar, and a covered credit is an
  // attribution failure rather than a cosmetic one. It also WRAPS now — at a phone's type scale
  // this credit is three lines wide, and one unwrapped line ran off the frame.
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  const sourceBaseline = sourceBottom - (sourceLines.length - 1) * SOURCE.lead;

  // Both gutters are measured from the widest string that will actually be drawn in them — a
  // fixed constant here is exactly the failure class `references/types/lollipop.md` names for
  // this type ("has previously truncated category labels because a fixed gutter was too
  // narrow"). The value-label gutter takes the max over every row's formatted label, not just
  // the row with the largest number, because digit count does not always track magnitude.
  const widestCategory = Math.max(
    ...rows.map((r) => measureText(r.country, CATEGORY_LABEL)),
  );
  const widestValueLabel = Math.max(
    ...rows.map((r) => measureText(formatValue(r.value), VALUE_LABEL)),
  );

  const padding = {
    top: titleBaseline + (titleLines.length - 1) * TITLE.lead + TITLE_TO_PLOT,
    right: PAD + VALUE_GUTTER_AIR + widestValueLabel,
    // Derived from where the credit now sits, not from a constant: the tick-label band under the
    // plot's floor has to end above the credit's first line of ink.
    bottom:
      height - (sourceBaseline - SOURCE.fontSize - AXIS_TO_SOURCE) + AXIS_BAND,
    left: PAD + CATEGORY_GUTTER_AIR + widestCategory,
  };

  const { plot, zeroX, points, ticks, step } = lollipopGeometry(rows, {
    width,
    height,
    padding,
    valueTickHint: valueTickHintFor(size),
  });
  // THE ROW BUDGET, refused before anything is drawn. A row-driven form has no aspect to distort,
  // so nothing else in the toolchain looks at what a tall frame does to fifteen rows.
  assertRowsFit(
    step,
    rows.map((r) => r.country),
    CATEGORY_LABEL,
    size,
    { what: "more-lollipop-co2-per-capita" },
  );
  const tickLabels = ticks.map((t, i, all) =>
    i === all.length - 1 ? `${t.value} ${UNIT}` : `${t.value}`,
  );

  // Each row's own value-label span, measured — the same box the collision check below tests a
  // gridline against, not an estimate.
  const labelSpans = points.map((p) => {
    const start = p.dotX + DOT_RADIUS + VALUE_LABEL_GAP;
    const width = measureText(formatValue(p.value), VALUE_LABEL);
    return { rowY: p.rowY, start, end: start + width };
  });

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

      {/* Value-axis gridlines, vertical because the value axis runs left-to-right here. Each one
          is cut into segments that skip any row whose own value label sits at this x — a
          gridline is decoration, a value label is the fact, and the two never share a pixel. */}
      {ticks.map((tick, i) => {
        const gaps: [number, number][] = labelSpans
          .filter((span) => tick.x >= span.start - 2 && tick.x <= span.end + 2)
          .map((span) => [
            span.rowY - GRID_GAP_HALF,
            span.rowY + GRID_GAP_HALF,
          ]);
        const segments = verticalSegments(plot.top, plot.bottom, gaps);
        return (
          <g key={tick.value}>
            {segments.map(([y1, y2]) => (
              <line
                key={y1}
                x1={tick.x}
                x2={tick.x}
                y1={y1}
                y2={y2}
                stroke={grid}
                strokeWidth={1}
              />
            ))}
            <text
              x={tick.x}
              y={plot.bottom + TICK_DROP}
              fill={muted}
              fontSize={AXIS.fontSize}
              textAnchor="middle"
            >
              {tickLabels[i]}
            </text>
          </g>
        );
      })}
      {/* The zero baseline every stem starts from — the length-encoding floor this type inherits
          from bars and is not allowed to relax. */}
      <line
        x1={zeroX}
        x2={zeroX}
        y1={plot.top}
        y2={plot.bottom}
        stroke={muted}
        strokeWidth={1}
      />

      {points.map((p) => {
        const isSubject = p.country === subject;
        const markColour = isSubject ? accent : muted;
        return (
          <g key={p.country}>
            <text
              x={plot.left - CATEGORY_GUTTER_AIR}
              y={p.rowY + ROW_BASELINE_NUDGE}
              fill={ink}
              fontSize={CATEGORY_LABEL.fontSize}
              fontWeight={CATEGORY_LABEL.fontWeight}
              textAnchor="end"
            >
              {p.country}
            </text>
            <line
              x1={zeroX}
              x2={p.dotX}
              y1={p.rowY}
              y2={p.rowY}
              stroke={markColour}
              strokeWidth={STEM_WIDTH}
              strokeLinecap="round"
            />
            <circle cx={p.dotX} cy={p.rowY} r={DOT_RADIUS} fill={markColour} />
            {/* The label carries the value, the mark carries the hue — never the same colour,
                even on the subject's own row (`references/types/lollipop.md`, "The accessibility
                trap": an accent hue that reads fine on a thin stem has previously measured under
                WCAG's 4.5:1 floor as running text). */}
            <text
              x={p.dotX + DOT_RADIUS + VALUE_LABEL_GAP}
              y={p.rowY + ROW_BASELINE_NUDGE}
              fill={ink}
              fontSize={VALUE_LABEL.fontSize}
              fontWeight={VALUE_LABEL.fontWeight}
            >
              {formatValue(p.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
