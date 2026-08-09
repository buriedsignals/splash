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
import { STACKED_BAR_TIMING } from "./timing-contract";

const FRAME = { width: 1080, height: 1080 };
const PAD = 72;
const TITLE = { fontSize: 40, fontWeight: 700, lead: 52 };
const SOURCE = { fontSize: 22, fontWeight: 400, lead: 28 };
const AXIS = { fontSize: 22, fontWeight: 400 };
const CATEGORY = { fontSize: 26, fontWeight: 600 };
const LEGEND = { fontSize: 21, fontWeight: 600 };
const TOTAL = { fontSize: 20, fontWeight: 600 };
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
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  reference: number;
  referenceLabel: string;
  legendLabels: [string, string, string]; // ["Solar & wind", "Hydropower", "Nuclear & other"]
  subjectYear: number;
  timing?: BeatTiming;
};

export function StackedBarVideo({
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
  subjectYear,
  timing = STACKED_BAR_TIMING,
}: StackedBarVideoProps) {
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

  // CONCLUSION_RESERVE: the conclusion's own banner row, reserved from frame 0 — same fix the
  // grouped-bar beat needed, for the same reason: four narrow columns leave no clear width beside
  // the subject segment for the stated finding without overlapping a neighbour.
  const CONCLUSION_RESERVE = 46;
  const referenceLabelWidth = measureText(referenceLabel, {
    fontSize: 22,
    fontWeight: 400,
  });
  const padding = {
    top: legendBaseline + CONCLUSION_RESERVE + 44,
    right: PAD + 20 + referenceLabelWidth,
    bottom: PAD + 44,
    left: PAD + 20 + measureText(fmt(reference * 1.05, 0), AXIS),
  };

  const g = stackedBarGeometry(data, { width, height, padding, reference });
  const subjectIndex = data.findIndex((d) => d.year === subjectYear);
  const subjectColumn = g.columns[subjectIndex];

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

        {/* Legend: three swatches, top-to-bottom order matching the stack (`stacked-bar.md`'s one
            accepted exception to direct labelling — three segments can't each carry their own
            label without crowding a 1080px-wide frame at this scale). */}
        {legendLabels.map((label, i) => {
          const fills = [accent, muted, muted];
          const opacities = [1, 1, 0.5];
          const lx = PAD + i * 250;
          return (
            <g key={label}>
              <rect
                x={lx}
                y={legendBaseline - 16}
                width={16}
                height={16}
                fill={fills[i]}
                opacity={opacities[i]}
              />
              <text
                x={lx + 24}
                y={legendBaseline - 3}
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
              strokeWidth={1.5}
            />
            <text
              x={g.plot.left - 14}
              y={g.yScale(tick) + 7}
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
            y={g.plot.bottom + 36}
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
            strokeWidth={2}
            strokeDasharray="8 6"
          />
          <text
            x={g.plot.right + 12}
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

      {/* Subject's highlight wash — behind the whole 2024 column. */}
      {highlightOpacity > 0 ? (
        <rect
          x={subjectColumn.x - 10}
          y={g.plot.top}
          width={g.columnWidth + 20}
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
              fill={accent}
            />
            <rect
              x={col.x}
              y={hydroY}
              width={col.width}
              height={Math.max(0, solarWindY - hydroY)}
              fill={muted}
            />
            <rect
              x={col.x}
              y={nuclearOtherY}
              width={col.width}
              height={Math.max(0, hydroY - nuclearOtherY)}
              fill={muted}
              opacity={0.5}
            />
            {isSubject && subjectSpring > 0 ? (
              <rect
                x={col.x - 3}
                y={solarWindY - 3}
                width={col.width + 6}
                height={g.zeroY - solarWindY + 6}
                fill="none"
                stroke={ink}
                strokeWidth={interpolate(subjectSpring, [0, 1], [0, 3])}
                opacity={subjectSpring}
              />
            ) : null}
            <text
              x={col.x + col.width / 2}
              y={nuclearOtherY - 12}
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
