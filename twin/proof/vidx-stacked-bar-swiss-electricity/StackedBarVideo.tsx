/**
 * The video beat of "solar and wind went from almost nothing to 7% of Switzerland's electricity" —
 * 8.3 seconds, 30fps, 1080 × 1080.
 *
 * TYPE: stacked bar. Its own pure geometry below (`stackedBarGeometry`) — not imported from
 * anywhere, because this story lives outside `twin-chart-video`'s skill boundary
 * (`proof/vidx-stacked-bar-swiss-electricity/`); the settled rule for a story that needs something
 * a skill has is to duplicate it, never reach back across the boundary. `FONT_FAMILY`,
 * `measureText`, `wrap` are this story's own copies of `EmissionsVideo.tsx`'s functions of the
 * same name.
 *
 * THE MOTION PROBLEM (`BRIEF.md`): four columns arrive in CHRONOLOGICAL order (2000, 2010, 2020,
 * 2024 — one entity's own history, not a cross-country ranking), each a three-segment stack that
 * must rise TOGETHER as one event, `columnWindow` giving each column its own overlapping slice of
 * `reveal` (the same technique proven by the grouped-bar beat's `categoryWindow` and, before that,
 * the dumbbell's `rowWindow`). Solar & wind sits on the shared zero baseline in every column — the
 * one band actually comparable across columns by eye — because it is the segment the claim is
 * about. The subject (solar & wind's 2024 segment) cannot land its ring until every column has
 * finished stacking.
 *
 * The furniture colours (ink, muted, grid) are NOT derived here — `deriveFurniture` lives in node
 * (this skill's own copy of `render-still.mjs`), passed in as props.
 */

import { scaleBand, scaleLinear } from "d3-scale";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import {
  progressOf,
  type BeatTiming,
} from "#shared/twin-chart-video/timing.ts";
import {
  assertTypeFloor,
  frameInsetFor,
  sizeFor,
} from "#shared/twin-chart-video/sizes.mjs";
import { formForSize } from "#shared/twin-chart-beat/type-at-size.mjs";
import { STACKED_BAR_TIMING } from "./timing-contract";

/** The chart type this beat draws, in `references/types/` vocabulary. Read by `formForSize`. */
const TYPE = "stacked-bar";

/**
 * THE 900x560-CONVENTION BASE, WITH THE ROW'S `typeScale` AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more. It said `1080 x 1080` here while `Root.tsx` said
 * `width={1080} height={1080}` two files away, with nothing between them, so `size: portrait` on
 * the slot produced a square in silence (`specs/W4-export-sizes.md` §1a).
 *
 * Every spacing number goes through `sp`, not only the fonts — including the three that decide
 * where a column's total is printed, which used to be module constants measured in pixels of a
 * frame this beat no longer draws at. Two font sizes were not tokens at all (`fontSize={22}` at the
 * reference label and `fontSize={26}` at the conclusion, written bare at the mark).
 *
 * The base numbers are the old 1080-square values re-expressed at the convention the table's
 * `typeScale` is written against — smallest token 12, so the row's multiplier lands the smallest
 * drawn type exactly on that row's legibility floor. The old values did not clear it: the column
 * totals were 20px on a 1080 frame, 6.7 CSS px on the phone a square post is read on.
 */
const BASE = {
  TITLE: { fontSize: 24, fontWeight: 700, lead: 31 },
  SOURCE: { fontSize: 13, fontWeight: 400, lead: 17 },
  AXIS: { fontSize: 13, fontWeight: 400 },
  CATEGORY: { fontSize: 16, fontWeight: 600 },
  LEGEND: { fontSize: 13, fontWeight: 600 },
  TOTAL: { fontSize: 12, fontWeight: 600 },
  NOTE: { fontSize: 13, fontWeight: 400 },
  CONCLUSION: { fontSize: 16, fontWeight: 700 },
  TITLE_TO_LEGEND: 24,
  CONCLUSION_RESERVE: 28,
  CONCLUSION_TO_PLOT: 26,
  LEGEND_SWATCH: 10,
  LEGEND_TEXT_GAP: 14,
  LEGEND_TEXT_LIFT: 2,
  LEGEND_PITCH: 150,
  PLOT_RIGHT_AIR: 12,
  X_LABEL_BAND: 26,
  SOURCE_AIR: 6,
  Y_GUTTER_AIR: 12,
  TICK_LABEL_INSET: 8,
  TICK_BASELINE_NUDGE: 4,
  CATEGORY_DROP: 22,
  REFERENCE_LABEL_GAP: 7,
  COLUMN_WASH_AIR: 6,
  RING_INSET: 2,
  TOTAL_GAP: 7,
  TOTAL_INK: 12,
  TOTAL_GRID_CLEAR: 4,
  DASH_REFERENCE: [4, 3],
};

/** Strokes scale but are NOT rounded: a hairline that rounds up stops being a hairline. */
const BASE_STROKE = { grid: 0.6, reference: 0.8, ring: 1.2 };

function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  const st = (v: number) => Number((v * typeScale).toFixed(2));
  const f = <T extends { fontSize: number; lead?: number }>(tok: T) => ({
    ...tok,
    fontSize: sp(tok.fontSize),
    ...(tok.lead === undefined ? {} : { lead: sp(tok.lead) }),
  });
  return {
    TITLE: f(BASE.TITLE) as typeof BASE.TITLE,
    SOURCE: f(BASE.SOURCE) as typeof BASE.SOURCE,
    AXIS: f(BASE.AXIS) as typeof BASE.AXIS,
    CATEGORY: f(BASE.CATEGORY) as typeof BASE.CATEGORY,
    LEGEND: f(BASE.LEGEND) as typeof BASE.LEGEND,
    TOTAL: f(BASE.TOTAL) as typeof BASE.TOTAL,
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    CONCLUSION: f(BASE.CONCLUSION) as typeof BASE.CONCLUSION,
    TITLE_TO_LEGEND: sp(BASE.TITLE_TO_LEGEND),
    CONCLUSION_RESERVE: sp(BASE.CONCLUSION_RESERVE),
    CONCLUSION_TO_PLOT: sp(BASE.CONCLUSION_TO_PLOT),
    LEGEND_SWATCH: sp(BASE.LEGEND_SWATCH),
    LEGEND_TEXT_GAP: sp(BASE.LEGEND_TEXT_GAP),
    LEGEND_TEXT_LIFT: sp(BASE.LEGEND_TEXT_LIFT),
    LEGEND_PITCH: sp(BASE.LEGEND_PITCH),
    PLOT_RIGHT_AIR: sp(BASE.PLOT_RIGHT_AIR),
    X_LABEL_BAND: sp(BASE.X_LABEL_BAND),
    SOURCE_AIR: sp(BASE.SOURCE_AIR),
    Y_GUTTER_AIR: sp(BASE.Y_GUTTER_AIR),
    TICK_LABEL_INSET: sp(BASE.TICK_LABEL_INSET),
    TICK_BASELINE_NUDGE: sp(BASE.TICK_BASELINE_NUDGE),
    CATEGORY_DROP: sp(BASE.CATEGORY_DROP),
    REFERENCE_LABEL_GAP: sp(BASE.REFERENCE_LABEL_GAP),
    COLUMN_WASH_AIR: sp(BASE.COLUMN_WASH_AIR),
    RING_INSET: sp(BASE.RING_INSET),
    TOTAL_GAP: sp(BASE.TOTAL_GAP),
    TOTAL_INK: sp(BASE.TOTAL_INK),
    TOTAL_GRID_CLEAR: sp(BASE.TOTAL_GRID_CLEAR),
    DASH_REFERENCE: BASE.DASH_REFERENCE.map(sp).join(" "),
    STROKE: {
      grid: st(BASE_STROKE.grid),
      reference: st(BASE_STROKE.reference),
      ring: st(BASE_STROKE.ring),
    },
  };
}

/**
 * Every `fontSize` the returned element tree actually carries, INCLUDING one written bare at a mark
 * — which this beat had two of. The still path reads the rendered SVG's `font-size` attributes; a
 * video composition's markup only exists inside the browser Remotion drives, so the equivalent
 * reading is the element tree, walked rather than listed.
 */
function fontSizesIn(node: unknown, out: number[] = []): number[] {
  if (Array.isArray(node)) {
    for (const child of node) fontSizesIn(child, out);
    return out;
  }
  if (!node || typeof node !== "object") return out;
  const props = (node as { props?: Record<string, unknown> }).props;
  if (!props) return out;
  if (typeof props.fontSize === "number") out.push(props.fontSize);
  fontSizesIn(props.children, out);
  return out;
}
export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

const UNIT = "TWh";

export type StackRow = {
  year: number;
  solarWind: number;
  hydro: number;
  nuclearOther: number;
};

export function fmt(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}

export function total(row: StackRow): number {
  return row.solarWind + row.hydro + row.nuclearOther;
}

/** Bottom-to-top stacking order, identical in every column — reordering per column is the trap
 *  `stacked-bar.md` names first. Solar & wind is the baseline segment on purpose: it is the ONE
 *  band an across-column comparison can trust, and it is what this beat's claim is about. */
export function stackedBarGeometry(
  data: StackRow[],
  {
    width,
    height,
    padding,
    reference,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    reference: number;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };

  const x = scaleBand<number>()
    .domain(data.map((d) => d.year))
    .range([plot.left, plot.right])
    .paddingInner(0.42)
    .paddingOuter(0.15);

  const maxTotal = Math.max(reference, ...data.map(total));
  const y = scaleLinear()
    .domain([0, maxTotal])
    .nice()
    .range([plot.bottom, plot.top]);

  const columns = data.map((d) => {
    const solarWindTop = y(d.solarWind);
    const hydroTop = y(d.solarWind + d.hydro);
    const nuclearOtherTop = y(d.solarWind + d.hydro + d.nuclearOther);
    return {
      year: d.year,
      x: x(d.year)!,
      width: x.bandwidth(),
      solarWind: d.solarWind,
      hydro: d.hydro,
      nuclearOther: d.nuclearOther,
      solarWindTop,
      hydroTop,
      nuclearOtherTop,
      total: total(d),
    };
  });

  return {
    plot,
    columns,
    columnWidth: x.bandwidth(),
    zeroY: y(0),
    referenceY: y(reference),
    yTicks: y.ticks(4),
    yScale: y,
  };
}


/**
 * Where a column's own total is printed, given the gridlines it has to live among.
 *
 * `barTop - TOTAL_GAP` alone is not enough, and this beat is the proof: 2024's total is 78.37 TWh
 * against a `nice()`d domain that tops out at 80, so the column's top lands 1.63 TWh — about 13px —
 * under the topmost gridline, and the label's baseline came to rest ON it. Measured off frame 247
 * of the delivered mp4: the "78.4 TWh" glyphs occupy rows 322–336 and the 80 gridline is drawn at
 * rows 335–336, so the line ran through the type's own feet.
 *
 * No amount of headroom in the scale fixes that — a column whose value sits just under ANY gridline
 * puts its label on that gridline, wherever the scale is cut. So the label steps up over the line
 * instead: if a gridline falls inside the label's own ink band, the baseline moves to
 * `gridline − TOTAL_GRID_CLEAR`, which puts the whole word above the rule with air under it. Every
 * other column here is nowhere near a gridline and is left exactly where it was.
 */
export function totalLabelBaseline(
  barTop: number,
  gridlineYs: number[],
  /** All three in drawn pixels at THIS size — the air above the column, the label's own ink height
   *  above its baseline, and the air it keeps off a gridline. They were module constants measured
   *  in pixels of a 1080-square frame; an ink height that does not follow the type is a band this
   *  function looks in that has nothing to do with where the glyphs are. */
  {
    gap,
    ink,
    gridClear,
  }: { gap: number; ink: number; gridClear: number },
): number {
  let baseline = barTop - gap;
  for (const gy of gridlineYs) {
    if (gy <= baseline + 2 && gy >= baseline - ink)
      baseline = Math.min(baseline, gy - gridClear);
  }
  return baseline;
}

/** Column `i`'s own overlapping slice of the master `reveal` progress — proven by
 *  `DumbbellVideo.tsx`'s `rowWindow` and the grouped-bar beat's `categoryWindow`. */
export function columnWindow(
  i: number,
  n: number,
): { start: number; end: number } {
  const span = 1 / n;
  const start = i * span;
  const duration = span * 1.6;
  return { start, end: Math.min(1, start + duration) };
}

let measuringContext: CanvasRenderingContext2D | null | undefined;
export function measureText(
  text: string,
  { fontSize, fontWeight = 400 }: { fontSize: number; fontWeight?: number },
): number {
  if (!text) return 0;
  if (measuringContext === undefined)
    measuringContext =
      typeof document === "undefined"
        ? null
        : document.createElement("canvas").getContext("2d");
  if (!measuringContext) return text.length * fontSize * 0.5;
  measuringContext.font = `${fontWeight} ${fontSize}px ${FONT_FAMILY}`;
  return measuringContext.measureText(text).width;
}

export function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const trial = current ? `${current} ${word}` : word;
    if (current && measureText(trial, font) > maxWidth) {
      lines.push(current);
      current = word;
    } else current = trial;
  }
  return current ? [...lines, current] : lines;
}

export type StackedBarVideoProps = {
  data: StackRow[]; // chronological order — render.mjs's job, not this component's.
  title: string;
  source: string;
  ground: string;
  /** The primary house accent — the reference the subject emphasis and the year label are drawn in. */
  accent: string;
  /**
   * ONE INK PER BAND, bottom to top, matching `legendLabels`. Passed in rather than built here:
   * this component used to compose its own fills as `[accent, muted, muted]`, which drew two of
   * the three bands in the FURNITURE grey — a colour derived from the ground to recede behind the
   * data, not to carry it, and one that does not move when a newsroom changes its accent. The
   * runner now reads the recorded palette and hands all three through `seriesInks`, so every band
   * is a colour somebody chose. The three bands are three CATEGORIES, not three steps of a scale,
   * which is why they are three hues rather than three shades of one.
   */
  bandInks: [string, string, string];
  ink: string;
  muted: string;
  grid: string;
  reference: number;
  referenceLabel: string;
  legendLabels: [string, string, string]; // ["Solar & wind", "Hydropower", "Nuclear & other"]
  subjectYear: number;
  /** The export size gate 2c pinned, recorded in this beat's own `BRIEF.md` front matter. */
  size: string;
  timing?: BeatTiming;
};

export function StackedBarVideo({
  data,
  title,
  source,
  ground,
  accent,
  bandInks,
  ink,
  muted,
  grid,
  reference,
  referenceLabel,
  legendLabels,
  subjectYear,
  size,
  timing = STACKED_BAR_TIMING,
}: StackedBarVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // The frame is the TABLE's, at the size the journalist pinned — never a constant in this file.
  const { width, height, typeScale } = sizeFor(size);
  const PAD = frameInsetFor(size);
  const T = tokens(typeScale);
  const { TITLE, SOURCE, AXIS, CATEGORY, LEGEND, TOTAL } = T;

  // WHETHER THIS TYPE MAY ENTER THIS SIZE, AND IN WHAT FORM — before anything is measured.
  //
  // A stacked bar's category axis is NOMINAL, so `formForSize` answers `transpose` at a square or
  // tall frame: four stacked ROWS running down the frame, each year's name horizontal on one line.
  // That is a different drawing, not a rescaling of this one, and this beat does not carry it. So
  // the composition exists at all three sizes and the two it cannot draw refuse here, loudly,
  // naming the rung — rather than squeezing four columns into 1080px, which clips nothing and
  // collides with nothing.
  const form = formForSize(TYPE, size);
  if (form.verdict === "refuse")
    throw new Error(
      `vidx-stacked-bar-swiss-electricity: ${TYPE} cannot be drawn at ${size}. ${form.reason}`,
    );
  if (form.verdict === "transpose")
    throw new Error(
      `vidx-stacked-bar-swiss-electricity draws the COLUMN form, and ${size} asks for its twin ` +
        `form instead — ladder rung R0. ${form.reason}\nCost of taking it: ${form.cost}\n` +
        `This beat ships at landscape; the row form is a redraw, not a flag.`,
    );

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN, not under the title — the LAST line lands on
  // `height - PAD`, the same inset the title hangs off at the top, on the same x. It stays inside
  // the furniture opacity group, so no timing contract moves. See
  // twin-chart-beat/references/static-discipline.md, "The source on the frame's bottom margin".
  const sourceBaseline = height - PAD - (sourceLines.length - 1) * SOURCE.lead;
  // The legend keeps the air it always had above it, measured from the LAST TITLE line rather
  // than from the source, which is no longer in the header.
  const legendBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + T.TITLE_TO_LEGEND;

  // CONCLUSION_RESERVE: the conclusion's own banner row, reserved from frame 0 — same fix the
  // grouped-bar beat needed, for the same reason: four narrow columns leave no clear width beside
  // the subject segment for the stated finding without overlapping a neighbour.
  const CONCLUSION_RESERVE = T.CONCLUSION_RESERVE;
  const referenceLabelWidth = measureText(referenceLabel, T.NOTE);
  const padding = {
    top: legendBaseline + CONCLUSION_RESERVE + T.CONCLUSION_TO_PLOT,
    right: PAD + T.PLOT_RIGHT_AIR + referenceLabelWidth,
    // Grown by the credit block's own height plus clear air.
    bottom:
      PAD +
      T.X_LABEL_BAND +
      (sourceLines.length - 1) * SOURCE.lead +
      SOURCE.fontSize +
      T.SOURCE_AIR,
    left: PAD + T.Y_GUTTER_AIR + measureText(fmt(reference * 1.05, 0), AXIS),
  };

  const g = stackedBarGeometry(data, { width, height, padding, reference });
  const gridlineYs = g.yTicks.map((t) => g.yScale(t));
  const subjectIndex = data.findIndex((d) => d.year === subjectYear);
  const subjectColumn = g.columns[subjectIndex];

  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const subjectProgress = progressOf(frame, timing.subject);
  const conclusion = progressOf(frame, timing.conclusion);

  // The title and the source are on screen at FRAME ZERO, at full opacity, never faded in.
  // Extracting frame 0 from this beat's mp4 returned a completely blank white image — measured,
  // not assumed: `establish` starts at frame 0, so its progress there is exactly 0 and everything
  // gated on it is invisible. Frame 0 is the poster frame a CMS or a social platform pulls as the
  // thumbnail before anyone presses play, and a blank poster frame is a beat that says nothing.
  // The legend and the axis still fade in over `establish` — they name and measure segments that
  // do not exist yet.
  const axisOpacity = establish;

  const referenceX2 = interpolate(
    referenceProgress,
    [0, 1],
    [g.plot.left, g.plot.right],
    {
      easing: Easing.out(Easing.cubic),
    },
  );
  const referenceLabelOpacity = interpolate(
    referenceProgress,
    [0.55, 1],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const highlightOpacity = interpolate(subjectProgress, [0, 1], [0, 0.16], {
    easing: Easing.out(Easing.cubic),
  });
  const conclusionOpacity = interpolate(conclusion, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  const subjectShare = (subjectColumn.solarWind / subjectColumn.total) * 100;
  const baseYear = data[0];
  const baseShare = (baseYear.solarWind / total(baseYear)) * 100;
  const conclusionLabel = `Solar & wind: ${fmt(subjectShare)}% of the mix in ${subjectYear} — ${fmt(baseShare, 2)}% in ${baseYear.year}`;
  const conclusionBaseline = legendBaseline + CONCLUSION_RESERVE;

  const drawing = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fontFamily={FONT_FAMILY}
    >
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      <g>
        {titleLines.map((text, i) => (
          <text
            key={text}
            x={PAD}
            y={titleBaseline + i * TITLE.lead}
            fill={ink}
            fontSize={TITLE.fontSize}
            fontWeight={TITLE.fontWeight}
          >
            {text}
          </text>
        ))}
        {sourceLines.map((text, i) => (
          <text
            key={text}
            x={PAD}
            y={sourceBaseline + i * SOURCE.lead}
            fill={muted}
            fontSize={SOURCE.fontSize}
          >
            {text}
          </text>
        ))}
      </g>

      {/* Legend and value axis — the frame the stack will be read in, faded in over `establish`
          rather than present at frame 0.
          Legend: three swatches, top-to-bottom order matching the stack (`stacked-bar.md`'s one
          accepted exception to direct labelling — three segments can't each carry their own
          label without crowding a 1080px-wide frame at this scale). */}
      <g opacity={axisOpacity}>
        {legendLabels.map((label, i) => {
          // The swatch is the band's own ink, at full opacity. Three distinct inks separate
          // themselves; the half-opacity third swatch this used to carry existed only because two
          // of the three fills were the same furniture grey.
          const lx = PAD + i * T.LEGEND_PITCH;
          return (
            <g key={label}>
              <rect
                x={lx}
                y={legendBaseline - T.LEGEND_SWATCH}
                width={T.LEGEND_SWATCH}
                height={T.LEGEND_SWATCH}
                fill={bandInks[i]}
              />
              <text
                x={lx + T.LEGEND_TEXT_GAP}
                y={legendBaseline - T.LEGEND_TEXT_LIFT}
                fill={ink}
                fontSize={LEGEND.fontSize}
                fontWeight={LEGEND.fontWeight}
              >
                {label}
              </text>
            </g>
          );
        })}

        {g.yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={g.plot.left}
              x2={g.plot.right}
              y1={g.yScale(tick)}
              y2={g.yScale(tick)}
              stroke={grid}
              strokeWidth={T.STROKE.grid}
            />
            <text
              x={g.plot.left - T.TICK_LABEL_INSET}
              y={g.yScale(tick) + T.TICK_BASELINE_NUDGE}
              fill={muted}
              fontSize={AXIS.fontSize}
              textAnchor="end"
            >
              {fmt(tick, 0)}
            </text>
          </g>
        ))}
        {data.map((d) => (
          <text
            key={d.year}
            x={g.columns.find((c) => c.year === d.year)!.x + g.columnWidth / 2}
            y={g.plot.bottom + T.CATEGORY_DROP}
            fill={
              d.year === subjectYear && subjectProgress > 0.5 ? accent : ink
            }
            fontWeight={
              d.year === subjectYear && subjectProgress > 0.5
                ? 700
                : CATEGORY.fontWeight
            }
            fontSize={CATEGORY.fontSize}
            textAnchor="middle"
          >
            {d.year}
          </text>
        ))}
      </g>

      {/* The reference: 2000's own total, laid down before any column grows. */}
      {referenceProgress > 0 ? (
        <g>
          <line
            x1={g.plot.left}
            x2={referenceX2}
            y1={g.referenceY}
            y2={g.referenceY}
            stroke={muted}
            strokeWidth={T.STROKE.reference}
            strokeDasharray={T.DASH_REFERENCE}
          />
          <text
            x={g.plot.right + T.REFERENCE_LABEL_GAP}
            y={g.referenceY + T.TICK_BASELINE_NUDGE}
            fill={muted}
            fontSize={T.NOTE.fontSize}
            textAnchor="start"
            opacity={referenceLabelOpacity}
          >
            {referenceLabel}
          </text>
        </g>
      ) : null}

      {/* Subject's highlight wash — behind the whole 2024 column. */}
      {highlightOpacity > 0 ? (
        <rect
          x={subjectColumn.x - T.COLUMN_WASH_AIR}
          y={g.plot.top}
          width={g.columnWidth + 2 * T.COLUMN_WASH_AIR}
          height={g.plot.bottom - g.plot.top}
          fill={accent}
          opacity={highlightOpacity}
        />
      ) : null}

      {/* The columns — each cascades in its own overlapping window of `reveal`, in chronological
          order, three segments rising together as one event. */}
      {g.columns.map((col, i) => {
        const w = columnWindow(i, g.columns.length);
        const colProgress = interpolate(reveal, [w.start, w.end], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });
        const solarWindY = interpolate(
          colProgress,
          [0, 1],
          [g.zeroY, col.solarWindTop],
        );
        const hydroY = interpolate(
          colProgress,
          [0, 1],
          [g.zeroY, col.hydroTop],
        );
        const nuclearOtherY = interpolate(
          colProgress,
          [0, 1],
          [g.zeroY, col.nuclearOtherTop],
        );
        const totalOpacity = interpolate(colProgress, [0.9, 1], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const isSubject = col.year === subjectYear;
        return (
          <g key={col.year}>
            <rect
              x={col.x}
              y={solarWindY}
              width={col.width}
              height={Math.max(0, g.zeroY - solarWindY)}
              fill={bandInks[0]}
            />
            <rect
              x={col.x}
              y={hydroY}
              width={col.width}
              height={Math.max(0, solarWindY - hydroY)}
              fill={bandInks[1]}
            />
            <rect
              x={col.x}
              y={nuclearOtherY}
              width={col.width}
              height={Math.max(0, hydroY - nuclearOtherY)}
              fill={bandInks[2]}
            />
            {isSubject && subjectSpring > 0 ? (
              <rect
                x={col.x - T.RING_INSET}
                y={solarWindY - T.RING_INSET}
                width={col.width + 2 * T.RING_INSET}
                height={g.zeroY - solarWindY + 2 * T.RING_INSET}
                fill="none"
                stroke={ink}
                strokeWidth={interpolate(
                  subjectSpring,
                  [0, 1],
                  [0, T.STROKE.ring],
                )}
                opacity={subjectSpring}
              />
            ) : null}
            <text
              x={col.x + col.width / 2}
              y={totalLabelBaseline(nuclearOtherY, gridlineYs, {
                gap: T.TOTAL_GAP,
                ink: T.TOTAL_INK,
                gridClear: T.TOTAL_GRID_CLEAR,
              })}
              fill={ink}
              fontSize={TOTAL.fontSize}
              fontWeight={TOTAL.fontWeight}
              textAnchor="middle"
              opacity={totalOpacity}
            >
              {fmt(col.total)} {UNIT}
            </text>
          </g>
        );
      })}

      {/* The conclusion: solar & wind's 2024 share against its 2000 share, stated once the
          subject has landed — never before, per `motion-grammar.md`. Its own reserved banner row
          (`CONCLUSION_RESERVE`), same fix the grouped-bar beat needed. */}
      <text
        x={PAD}
        y={conclusionBaseline}
        fill={ink}
        fontSize={T.CONCLUSION.fontSize}
        fontWeight={700}
        textAnchor="start"
        opacity={conclusionOpacity}
      >
        {conclusionLabel}
      </text>
    </svg>
  );

  // EVERY TYPE SIZE THIS FRAME ACTUALLY DRAWS, against the row's own floor — read off the element
  // tree rather than a list of tokens, so a size written bare at a mark cannot escape it. This beat
  // had two.
  assertTypeFloor(
    fontSizesIn(drawing)
      .map((px) => `font-size="${px}"`)
      .join(" "),
    size,
    { what: `vidx-stacked-bar-swiss-electricity at ${size}` },
  );

  return drawing;
}
