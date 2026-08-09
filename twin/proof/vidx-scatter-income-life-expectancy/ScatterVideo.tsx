/**
 * The video beat of "among twenty wealthy countries, the United States has the lowest life
 * expectancy" — 9.1 seconds, 30fps, 1080 × 1080.
 *
 * TYPE: scatter. Its own pure geometry below (`scatterGeometry`) — not imported from anywhere,
 * because this story lives outside `twin-chart-video`'s skill boundary
 * (`proof/vidx-scatter-income-life-expectancy/`); the settled rule for a story that needs
 * something a skill has is to duplicate it, never reach back across the boundary. `FONT_FAMILY`,
 * `measureText`, `wrap` are this story's own copies of `EmissionsVideo.tsx`'s functions of the
 * same name.
 *
 * THE MOTION PROBLEM (`BRIEF.md`): twenty independent points, not a continuous trend —
 * `pointWindow` gives each point its own overlapping slice of `reveal` (the technique proven by
 * `DumbbellVideo.tsx`'s `rowWindow`), cascading in GDP-ascending order (the x-axis's own order).
 * The United States lands at its natural sorted position (16th of 20), not held back to last for
 * spectacle — its extra emphasis (ring, bold label) is a SEPARATE event that cannot start before
 * every point has landed.
 *
 * The furniture colours (ink, muted, grid) are NOT derived here — `deriveFurniture` lives in node
 * (this skill's own copy of `render-still.mjs`), passed in as props.
 */

import { extent } from "d3-array";
import { scaleLinear } from "d3-scale";
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
import { SCATTER_TIMING } from "./timing-contract";

const FRAME = { width: 1080, height: 1080 };
const PAD = 72;
const TITLE = { fontSize: 38, fontWeight: 700, lead: 48 };
const SOURCE = { fontSize: 21, fontWeight: 400, lead: 27 };
const AXIS = { fontSize: 20, fontWeight: 400 };
const AXIS_TITLE = { fontSize: 21, fontWeight: 600 };
const LABEL = { fontSize: 25, fontWeight: 700 };
export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

export type Point = { country: string; gdp: number; lifeExpectancy: number };

export function fmtGdp(value: number): string {
  return `$${Math.round(value / 1000)}k`;
}
export function fmtYears(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}

export function scatterGeometry(
  data: Point[],
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

  // Neither axis anchored at zero — a scatter is a position chart (`scatter.md`).
  const x = scaleLinear()
    .domain(extent(data.map((d) => d.gdp)) as [number, number])
    .nice()
    .range([plot.left, plot.right]);
  const y = scaleLinear()
    .domain(
      extent([...data.map((d) => d.lifeExpectancy), reference]) as [
        number,
        number,
      ],
    )
    .nice()
    .range([plot.bottom, plot.top]);

  const points = data.map((d) => ({
    ...d,
    x: x(d.gdp),
    y: y(d.lifeExpectancy),
  }));

  return {
    plot,
    points,
    referenceY: y(reference),
    xTicks: x.ticks(5),
    yTicks: y.ticks(5),
    xScale: x,
    yScale: y,
  };
}

/** Point `i`'s own overlapping slice of the master `reveal` progress — proven by
 *  `DumbbellVideo.tsx`'s `rowWindow`. */
export function pointWindow(
  i: number,
  n: number,
): { start: number; end: number } {
  const span = 1 / n;
  const start = i * span;
  const duration = span * 1.8;
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

export type ScatterVideoProps = {
  data: Point[]; // pre-sorted by gdp, ascending — render.mjs's job, not this component's.
  title: string;
  source: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  reference: number;
  referenceLabel: string;
  subjectCountry: string;
  xAxisLabel: string;
  yAxisLabel: string;
  timing?: BeatTiming;
};

export function ScatterVideo({
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
  subjectCountry,
  xAxisLabel,
  yAxisLabel,
  timing = SCATTER_TIMING,
}: ScatterVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = FRAME;

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  const sourceBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 40;

  // CONCLUSION_RESERVE: the conclusion's own banner row, reserved from frame 0 — same fix the
  // grouped-bar and stacked-bar beats needed: a crowded cloud leaves no guaranteed clear space
  // beside the subject's own point for a two-fact sentence.
  const CONCLUSION_RESERVE = 40;
  const conclusionBaseline =
    sourceBaseline + (sourceLines.length - 1) * SOURCE.lead + 36;

  const yTickWidth = Math.max(
    ...scatterGeometry(data, {
      width,
      height,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      reference,
    }).yTicks.map((t) => measureText(fmtYears(t, 0), AXIS)),
  );

  const padding = {
    top: conclusionBaseline + CONCLUSION_RESERVE,
    right: PAD + 10,
    bottom: PAD + 56,
    left: PAD + 26 + yTickWidth,
  };

  const g = scatterGeometry(data, { width, height, padding, reference });
  const subjectIndex = data.findIndex((d) => d.country === subjectCountry);
  const subject = g.points[subjectIndex];

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
  // The axis furniture still fades in over `establish` — it is the frame the data will be measured
  // in, and it has nothing to say before the data does.
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
  const subjectRingRadius = interpolate(subjectSpring, [0, 1], [0, 16]);
  const conclusionOpacity = interpolate(conclusion, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  const conclusionLabel = `${subjectCountry}: ${fmtYears(subject.lifeExpectancy)} years — the lowest of the twenty, despite the 5th-highest income`;

  return (
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

      {/* Axis furniture — the frame the points will be measured in, faded in over `establish`
          rather than present at frame 0. */}
      <g opacity={axisOpacity}>
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
              y={g.yScale(tick) + 6}
              fill={muted}
              fontSize={AXIS.fontSize}
              textAnchor="end"
            >
              {fmtYears(tick, 0)}
            </text>
          </g>
        ))}
        {g.xTicks.map((tick) => (
          <text
            key={tick}
            x={g.xScale(tick)}
            y={g.plot.bottom + 32}
            fill={muted}
            fontSize={AXIS.fontSize}
            textAnchor="middle"
          >
            {fmtGdp(tick)}
          </text>
        ))}

        {/* Axis titles — a bare number axis on a scatter is close to unreadable (`scatter.md`). */}
        <text
          x={(g.plot.left + g.plot.right) / 2}
          y={g.plot.bottom + 58}
          fill={ink}
          fontSize={AXIS_TITLE.fontSize}
          fontWeight={AXIS_TITLE.fontWeight}
          textAnchor="middle"
        >
          {xAxisLabel}
        </text>
        <text
          x={0}
          y={0}
          fill={ink}
          fontSize={AXIS_TITLE.fontSize}
          fontWeight={AXIS_TITLE.fontWeight}
          textAnchor="middle"
          transform={`translate(${PAD - 44}, ${(g.plot.top + g.plot.bottom) / 2}) rotate(-90)`}
        >
          {yAxisLabel}
        </text>
      </g>

      {/* The reference: the peer median, laid down before any point appears. */}
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
            x={g.plot.left + 12}
            y={g.referenceY - 12}
            fill={muted}
            fontSize={20}
            textAnchor="start"
            opacity={referenceLabelOpacity}
          >
            {referenceLabel}
          </text>
        </g>
      ) : null}

      {/* The cloud — each point cascades in GDP-ascending order, its own overlapping window. */}
      {g.points.map((p, i) => {
        const w = pointWindow(i, g.points.length);
        const pointProgress = interpolate(reveal, [w.start, w.end], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });
        const isSubject = p.country === subjectCountry;
        const radius = interpolate(
          pointProgress,
          [0, 1],
          [0, isSubject ? 8 : 6],
        );
        if (radius <= 0) return null;
        return (
          <circle
            key={p.country}
            cx={p.x}
            cy={p.y}
            r={radius}
            fill={isSubject ? accent : muted}
            opacity={isSubject ? 1 : 0.75}
          />
        );
      })}

      {/* Subject emphasis — ring, then label — only once every point has landed. */}
      {subjectRingRadius > 0 ? (
        <circle
          cx={subject.x}
          cy={subject.y}
          r={subjectRingRadius}
          fill="none"
          stroke={ink}
          strokeWidth={2.5}
          opacity={subjectSpring}
        />
      ) : null}
      <text
        x={subject.x}
        y={subject.y - 26}
        fill={ink}
        fontSize={LABEL.fontSize}
        fontWeight={LABEL.fontWeight}
        textAnchor="middle"
        opacity={subjectSpring}
      >
        {subjectCountry}
      </text>

      {/* The conclusion: the US figure against the peer median and its own income rank, stated
          once the subject has landed — never before, per `motion-grammar.md`. Its own reserved
          banner row (`CONCLUSION_RESERVE`), the same fix the two bar beats in this batch needed. */}
      <text
        x={PAD}
        y={conclusionBaseline}
        fill={ink}
        fontSize={24}
        fontWeight={700}
        textAnchor="start"
        opacity={conclusionOpacity}
      >
        {conclusionLabel}
      </text>
    </svg>
  );
}
