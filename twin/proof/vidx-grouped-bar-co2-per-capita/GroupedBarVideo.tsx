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
import { GROUPED_BAR_TIMING } from "./timing-contract";

const FRAME = { width: 1080, height: 1080 };
const PAD = 72;
const TITLE = { fontSize: 40, fontWeight: 700, lead: 52 };
const SOURCE = { fontSize: 22, fontWeight: 400, lead: 28 };
const AXIS = { fontSize: 22, fontWeight: 400 };
const CATEGORY = { fontSize: 24, fontWeight: 600 };
const LEGEND = { fontSize: 22, fontWeight: 600 };
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
  timing = GROUPED_BAR_TIMING,
}: GroupedBarVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = FRAME;

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  const sourceBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 42;
  const legendBaseline =
    sourceBaseline + (sourceLines.length - 1) * SOURCE.lead + 40;

  const referenceLabelWidth = measureText(referenceLabel, {
    fontSize: 22,
    fontWeight: 400,
  });
  // CONCLUSION_RESERVE: the conclusion's own banner row, reserved from frame 0 (`motion-grammar.md`
  // — "anything that arrives late has its space reserved from frame 0, so nothing shifts when it
  // lands"). It cannot sit in-place at the subject's bar the way the dumbbell's label does: five
  // narrow groups leave no clear width beside China's bar for "8.6 t · 1.8× the world average"
  // without overlapping the next group — this beat's own version of the seed's "conclusion ≠
  // title" lesson, solved here with a dedicated row instead of a leader line.
  const CONCLUSION_RESERVE = 46;
  const padding = {
    top: legendBaseline + CONCLUSION_RESERVE + 44,
    right: PAD + 24 + referenceLabelWidth,
    bottom: PAD + 60,
    left: PAD + 20 + measureText(fmt(reference * 1.05), AXIS),
  };

  const g = groupedBarGeometry(data, { width, height, padding, reference });
  const subjectIndex = data.findIndex((d) => d.country === subjectCountry);

  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const subjectProgress = progressOf(frame, timing.subject);
  const conclusion = progressOf(frame, timing.conclusion);

  const furnitureOpacity = establish;

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

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fontFamily={FONT_FAMILY}
    >
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      <g opacity={furnitureOpacity}>
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

        {/* Legend: the only thing telling a reader which bar is which year, in every group —
            load-bearing, same left-to-right order as the bars within a group. */}
        <rect
          x={PAD}
          y={legendBaseline - 16}
          width={16}
          height={16}
          fill={muted}
        />
        <text
          x={PAD + 24}
          y={legendBaseline - 3}
          fill={ink}
          fontSize={LEGEND.fontSize}
          fontWeight={LEGEND.fontWeight}
        >
          {legendLabels[0]}
        </text>
        <rect
          x={PAD + 24 + measureText(legendLabels[0], LEGEND) + 28}
          y={legendBaseline - 16}
          width={16}
          height={16}
          fill={accent}
        />
        <text
          x={PAD + 24 + measureText(legendLabels[0], LEGEND) + 52}
          y={legendBaseline - 3}
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
              strokeWidth={1.5}
            />
            <text
              x={g.plot.left - 14}
              y={g.yScale(tick) + 7}
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
            y={g.plot.bottom + 34}
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
            strokeWidth={2}
            strokeDasharray="8 6"
          />
          <text
            x={g.plot.right + 14}
            y={g.referenceY + 7}
            fill={muted}
            fontSize={22}
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
          x={subjectBar.groupX - 10}
          y={g.plot.top}
          width={g.groupWidth + 20}
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
                x={bar.x2023 - 3}
                y={bar.top2023 - 3}
                width={bar.barWidth + 6}
                height={g.zeroY - bar.top2023 + 6}
                fill="none"
                stroke={ink}
                strokeWidth={interpolate(subjectSpring, [0, 1], [0, 3])}
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
        fontSize={26}
        fontWeight={700}
        textAnchor="start"
        opacity={conclusionOpacity}
      >
        {conclusionLabel}
      </text>
    </svg>
  );
}
