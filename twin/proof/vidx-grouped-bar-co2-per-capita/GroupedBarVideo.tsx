/**
 * The video beat of "China's per-person CO2 emissions have nearly tripled since 2000, overtaking
 * the world average" — 8.7 seconds, 30fps, 1080 × 1080.
 *
 * TYPE: grouped bar. Its own pure geometry below (`groupedBarGeometry`) — not imported from
 * anywhere, because this story lives outside `twin-chart-video`'s skill boundary
 * (`proof/vidx-grouped-bar-co2-per-capita/`); the settled rule for a story that needs something a
 * skill has is to duplicate it, never reach back across the boundary. `FONT_FAMILY`,
 * `measureText`, `wrap` are this story's own copies of `EmissionsVideo.tsx`'s functions of the
 * same name.
 *
 * THE MOTION PROBLEM (`BRIEF.md`): five categories, each a PAIR of bars that must rise TOGETHER
 * from a shared zero baseline — `categoryWindow` gives each category its own overlapping slice of
 * the `reveal` window (the same technique `DumbbellVideo.tsx`'s `rowWindow` proved for ten
 * independent rows, here without that file's shared-first-slice, because there is no single mark
 * every category shares the way every dumbbell row shared index 100). Categories arrive in their
 * sorted, on-screen order (by 2023 value, descending) so the ranking the reader watches assemble
 * is the ranking the chart ends on. China — the subject — arrives in its natural sorted position
 * (second), not first or last for spectacle; its extra emphasis (highlight band, ring, bold label)
 * is a SEPARATE event that cannot start until every category has finished rising.
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
import { GROUPED_BAR_TIMING } from "./timing-contract";

/** The chart type this beat draws, in `references/types/` vocabulary. Read by `formForSize`. */
const TYPE = "grouped-bar";

/**
 * THE 900x560-CONVENTION BASE, WITH THE ROW'S `typeScale` AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more. It said `1080 x 1080` here while `Root.tsx` said
 * `width={1080} height={1080}` two files away, with nothing between them, so `size: portrait` on
 * the slot produced a square in silence (`specs/W4-export-sizes.md` §1a).
 *
 * Every spacing number goes through `sp`, not only the fonts. And two font sizes were not even
 * named — `fontSize={22}` at the reference label and `fontSize={26}` at the conclusion, written
 * bare at the mark. That is the static seed's `GAP_NOTE` defect exactly, the one no assertion in
 * this project saw; they are tokens now, and `assertTypeFloor` reads the element tree rather than a
 * list, so the next one cannot hide either.
 *
 * The base numbers are the old 1080-square values re-expressed at the convention the table's
 * `typeScale` is written against — smallest token 12, so the row's multiplier lands the smallest
 * drawn type exactly on that row's legibility floor. The old values did not clear it: the axis was
 * 22px on a 1080 frame, 7.3 CSS px on the phone a square post is read on.
 */
const BASE = {
  TITLE: { fontSize: 22, fontWeight: 700, lead: 28 },
  SOURCE: { fontSize: 12, fontWeight: 400, lead: 15 },
  AXIS: { fontSize: 12, fontWeight: 400 },
  CATEGORY: { fontSize: 13, fontWeight: 600 },
  LEGEND: { fontSize: 12, fontWeight: 600 },
  NOTE: { fontSize: 12, fontWeight: 400 },
  CONCLUSION: { fontSize: 14, fontWeight: 700 },
  TITLE_TO_LEGEND: 22,
  CONCLUSION_RESERVE: 25,
  CONCLUSION_TO_PLOT: 24,
  LEGEND_SWATCH: 9,
  LEGEND_TEXT_GAP: 13,
  LEGEND_TEXT_LIFT: 2,
  LEGEND_ITEM_GAP: 15,
  LEGEND_ITEM_TEXT: 28,
  REFERENCE_LABEL_AIR: 13,
  REFERENCE_LABEL_GAP: 8,
  CATEGORY_BAND: 33,
  CATEGORY_DROP: 19,
  SOURCE_AIR: 5,
  Y_GUTTER_AIR: 11,
  TICK_LABEL_INSET: 8,
  TICK_BASELINE_NUDGE: 4,
  GROUP_WASH_AIR: 5,
  RING_INSET: 2,
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
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    CONCLUSION: f(BASE.CONCLUSION) as typeof BASE.CONCLUSION,
    TITLE_TO_LEGEND: sp(BASE.TITLE_TO_LEGEND),
    CONCLUSION_RESERVE: sp(BASE.CONCLUSION_RESERVE),
    CONCLUSION_TO_PLOT: sp(BASE.CONCLUSION_TO_PLOT),
    LEGEND_SWATCH: sp(BASE.LEGEND_SWATCH),
    LEGEND_TEXT_GAP: sp(BASE.LEGEND_TEXT_GAP),
    LEGEND_TEXT_LIFT: sp(BASE.LEGEND_TEXT_LIFT),
    LEGEND_ITEM_GAP: sp(BASE.LEGEND_ITEM_GAP),
    LEGEND_ITEM_TEXT: sp(BASE.LEGEND_ITEM_TEXT),
    REFERENCE_LABEL_AIR: sp(BASE.REFERENCE_LABEL_AIR),
    REFERENCE_LABEL_GAP: sp(BASE.REFERENCE_LABEL_GAP),
    CATEGORY_BAND: sp(BASE.CATEGORY_BAND),
    CATEGORY_DROP: sp(BASE.CATEGORY_DROP),
    SOURCE_AIR: sp(BASE.SOURCE_AIR),
    Y_GUTTER_AIR: sp(BASE.Y_GUTTER_AIR),
    TICK_LABEL_INSET: sp(BASE.TICK_LABEL_INSET),
    TICK_BASELINE_NUDGE: sp(BASE.TICK_BASELINE_NUDGE),
    GROUP_WASH_AIR: sp(BASE.GROUP_WASH_AIR),
    RING_INSET: sp(BASE.RING_INSET),
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

const UNIT = "t CO₂/person";

export type BarRow = { country: string; y2000: number; y2023: number };

export function fmt(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}

export function groupedBarGeometry(
  data: BarRow[],
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

  const xOuter = scaleBand<string>()
    .domain(data.map((d) => d.country))
    .range([plot.left, plot.right])
    .paddingInner(0.38)
    .paddingOuter(0.12);
  const xInner = scaleBand<string>()
    .domain(["2000", "2023"])
    .range([0, xOuter.bandwidth()])
    .paddingInner(0.1);

  const maxValue = Math.max(
    reference,
    ...data.flatMap((d) => [d.y2000, d.y2023]),
  );
  const y = scaleLinear()
    .domain([0, maxValue])
    .nice()
    .range([plot.bottom, plot.top]);

  const bars = data.map((d) => ({
    country: d.country,
    y2000: d.y2000,
    y2023: d.y2023,
    groupX: xOuter(d.country)!,
    barWidth: xInner.bandwidth(),
    x2000: xOuter(d.country)! + xInner("2000")!,
    x2023: xOuter(d.country)! + xInner("2023")!,
    top2000: y(d.y2000),
    top2023: y(d.y2023),
  }));

  return {
    plot,
    bars,
    groupWidth: xOuter.bandwidth(),
    zeroY: y(0),
    referenceY: y(reference),
    yTicks: y.ticks(4),
    yScale: y,
  };
}

/** Category `i`'s own overlapping slice of the master `reveal` progress — the technique proven by
 *  `DumbbellVideo.tsx`'s `rowWindow`, without that file's shared-first-slice (no mark here is
 *  common to every category the way every dumbbell row shared index 100). */
export function categoryWindow(
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

export type GroupedBarVideoProps = {
  data: BarRow[]; // pre-sorted by 2023 value, descending — render.mjs's job, not this component's.
  title: string;
  source: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  reference: number;
  referenceLabel: string;
  legendLabels: [string, string]; // ["2000", "2023"]
  subjectCountry: string;
  /** The export size gate 2c pinned, recorded in this beat's own `BRIEF.md` front matter. */
  size: string;
  timing?: BeatTiming;
};

export function GroupedBarVideo({
  data,
  title,
  source,
  ground,
  accent,
  ink,
  muted,
  grid,
  reference,
  referenceLabel,
  legendLabels,
  subjectCountry,
  size,
  timing = GROUPED_BAR_TIMING,
}: GroupedBarVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // The frame is the TABLE's, at the size the journalist pinned — never a constant in this file.
  const { width, height, typeScale } = sizeFor(size);
  const PAD = frameInsetFor(size);
  const T = tokens(typeScale);
  const { TITLE, SOURCE, AXIS, CATEGORY, LEGEND } = T;

  // WHETHER THIS TYPE MAY ENTER THIS SIZE, AND IN WHAT FORM — before anything is measured.
  //
  // A grouped bar's category axis is NOMINAL, so `formForSize` answers `transpose` at a square or
  // tall frame: rows running down the frame, every country name horizontal on one line. That is not
  // a rescaling of what this file draws — five groups of two vertical columns — it is a different
  // drawing, and this beat does not carry it. So the composition EXISTS at all three sizes, and the
  // two it cannot draw refuse here, loudly, naming the rung and the size that works. Squeezing ten
  // columns into 1080px instead would clip nothing and collide with nothing, which is precisely the
  // defect the probe proved no counter in this project can see.
  const form = formForSize(TYPE, size);
  if (form.verdict === "refuse")
    throw new Error(
      `vidx-grouped-bar-co2-per-capita: ${TYPE} cannot be drawn at ${size}. ${form.reason}`,
    );
  if (form.verdict === "transpose")
    throw new Error(
      `vidx-grouped-bar-co2-per-capita draws the COLUMN form, and ${size} asks for its twin form ` +
        `instead — ladder rung R0. ${form.reason}\nCost of taking it: ${form.cost}\n` +
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

  const referenceLabelWidth = measureText(referenceLabel, T.NOTE);
  // CONCLUSION_RESERVE: the conclusion's own banner row, reserved from frame 0 (`motion-grammar.md`
  // — "anything that arrives late has its space reserved from frame 0, so nothing shifts when it
  // lands"). It cannot sit in-place at the subject's bar the way the dumbbell's label does: five
  // narrow groups leave no clear width beside China's bar for "8.6 t · 1.8× the world average"
  // without overlapping the next group — this beat's own version of the seed's "conclusion ≠
  // title" lesson, solved here with a dedicated row instead of a leader line.
  const CONCLUSION_RESERVE = T.CONCLUSION_RESERVE;
  const padding = {
    top: legendBaseline + CONCLUSION_RESERVE + T.CONCLUSION_TO_PLOT,
    right: PAD + T.REFERENCE_LABEL_AIR + referenceLabelWidth,
    // Grown by the credit block's own height plus clear air, so the label band beneath the plot
    // ends above its ink.
    bottom:
      PAD +
      T.CATEGORY_BAND +
      (sourceLines.length - 1) * SOURCE.lead +
      SOURCE.fontSize +
      T.SOURCE_AIR,
    left: PAD + T.Y_GUTTER_AIR + measureText(fmt(reference * 1.05), AXIS),
  };

  const g = groupedBarGeometry(data, { width, height, padding, reference });
  const subjectIndex = data.findIndex((d) => d.country === subjectCountry);

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
  // The legend, the axis and the category labels still fade in over `establish` — they name and
  // measure bars that do not exist yet.
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

  // Subject emphasis — a ring, a highlight wash, a bold label — cannot start before every
  // category has finished rising (`checkTiming`'s ordering rule already guarantees this).
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const highlightOpacity = interpolate(subjectProgress, [0, 1], [0, 0.14], {
    easing: Easing.out(Easing.cubic),
  });
  const labelBoldness = subjectProgress; // 0 = ink, 1 = bold accent (colour swap at threshold below)
  const conclusionOpacity = interpolate(conclusion, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  const subjectBar = g.bars[subjectIndex];
  const conclusionLabel = `${subjectCountry}, 2023: ${fmt(subjectBar.y2023)} ${UNIT} · ${fmt(subjectBar.y2023 / reference, 1)}× the world average`;
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

      {/* Legend, value axis and category labels — the frame the bars will be read in, faded in
          over `establish` rather than present at frame 0.
          Legend: the only thing telling a reader which bar is which year, in every group —
          load-bearing, same left-to-right order as the bars within a group. */}
      <g opacity={axisOpacity}>
        <rect
          x={PAD}
          y={legendBaseline - T.LEGEND_SWATCH}
          width={T.LEGEND_SWATCH}
          height={T.LEGEND_SWATCH}
          fill={muted}
        />
        <text
          x={PAD + T.LEGEND_TEXT_GAP}
          y={legendBaseline - T.LEGEND_TEXT_LIFT}
          fill={ink}
          fontSize={LEGEND.fontSize}
          fontWeight={LEGEND.fontWeight}
        >
          {legendLabels[0]}
        </text>
        <rect
          x={
            PAD +
            T.LEGEND_TEXT_GAP +
            measureText(legendLabels[0], LEGEND) +
            T.LEGEND_ITEM_GAP
          }
          y={legendBaseline - T.LEGEND_SWATCH}
          width={T.LEGEND_SWATCH}
          height={T.LEGEND_SWATCH}
          fill={accent}
        />
        <text
          x={
            PAD +
            T.LEGEND_TEXT_GAP +
            measureText(legendLabels[0], LEGEND) +
            T.LEGEND_ITEM_TEXT
          }
          y={legendBaseline - T.LEGEND_TEXT_LIFT}
          fill={ink}
          fontSize={LEGEND.fontSize}
          fontWeight={LEGEND.fontWeight}
        >
          {legendLabels[1]}
        </text>

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
              {fmt(tick, tick === 0 ? 0 : 1)}
            </text>
          </g>
        ))}
        {data.map((d) => (
          <text
            key={d.country}
            x={
              g.bars.find((b) => b.country === d.country)!.groupX +
              g.groupWidth / 2
            }
            y={g.plot.bottom + T.CATEGORY_DROP}
            fill={
              d.country === subjectCountry && labelBoldness > 0.5 ? accent : ink
            }
            fontWeight={
              d.country === subjectCountry && labelBoldness > 0.5
                ? 700
                : CATEGORY.fontWeight
            }
            fontSize={CATEGORY.fontSize}
            textAnchor="middle"
          >
            {d.country}
          </text>
        ))}
      </g>

      {/* The reference: the 2023 world average, laid down before any bar grows. */}
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

      {/* Subject's highlight wash — behind its whole group, so the reader sees which category the
          ring and bold label refer to without the wash itself claiming a value. */}
      {highlightOpacity > 0 ? (
        <rect
          x={subjectBar.groupX - T.GROUP_WASH_AIR}
          y={g.plot.top}
          width={g.groupWidth + 2 * T.GROUP_WASH_AIR}
          height={g.plot.bottom - g.plot.top}
          fill={accent}
          opacity={highlightOpacity}
        />
      ) : null}

      {/* The bars — each category cascades in its own overlapping window of `reveal`. */}
      {g.bars.map((bar, i) => {
        const w = categoryWindow(i, g.bars.length);
        const catProgress = interpolate(reveal, [w.start, w.end], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });
        const y2000 = interpolate(catProgress, [0, 1], [g.zeroY, bar.top2000]);
        const y2023 = interpolate(catProgress, [0, 1], [g.zeroY, bar.top2023]);
        const isSubject = bar.country === subjectCountry;
        return (
          <g key={bar.country}>
            <rect
              x={bar.x2000}
              y={y2000}
              width={bar.barWidth}
              height={Math.max(0, g.zeroY - y2000)}
              fill={muted}
            />
            <rect
              x={bar.x2023}
              y={y2023}
              width={bar.barWidth}
              height={Math.max(0, g.zeroY - y2023)}
              fill={accent}
            />
            {isSubject && subjectSpring > 0 ? (
              <rect
                x={bar.x2023 - T.RING_INSET}
                y={bar.top2023 - T.RING_INSET}
                width={bar.barWidth + 2 * T.RING_INSET}
                height={g.zeroY - bar.top2023 + 2 * T.RING_INSET}
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
          </g>
        );
      })}

      {/* The conclusion: China's 2023 value against the world average, stated once the subject
          has landed — never before, per `motion-grammar.md`. Its own reserved banner row
          (`CONCLUSION_RESERVE`), not in-place at the bar: see the padding comment above for why. */}
      <text
        x={PAD}
        y={conclusionBaseline}
        fill={ink}
        fontSize={T.CONCLUSION.fontSize}
        fontWeight={T.CONCLUSION.fontWeight}
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
    { what: `vidx-grouped-bar-co2-per-capita at ${size}` },
  );

  return drawing;
}
