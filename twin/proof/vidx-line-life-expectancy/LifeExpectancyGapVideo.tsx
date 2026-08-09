/**
 * The video beat of "Switzerland has kept a longer life expectancy than France for over three
 * decades" — 8 seconds, 30fps, 1080 × 1080.
 *
 * TYPE: line, two series. Its own pure geometry below (`twoLineGeometry`, `yTickValues`) — not
 * imported from anywhere, because this story lives outside `twin-chart-video`'s skill boundary
 * (`proof/vidx-line-life-expectancy/`) and the settled rule for a story that needs something a
 * skill has is to duplicate it, never reach back across the boundary. `FONT_FAMILY`,
 * `measureText`, `wrap` and `drawnSoFar` are this story's own copies of `EmissionsVideo.tsx`'s
 * functions of the same name, bodies identical on purpose — this is the video genre's own
 * browser-Canvas text measurer, not the static genre's resvg one.
 *
 * THE MOTION PROBLEM (`BRIEF.md`): two lines share one time axis and must draw at the SAME pace —
 * neither may lead the other, because the claim ("Switzerland stayed ahead") is about the whole
 * span, not who arrives first. Both series are windowed off the identical `reveal` progress
 * fraction. The two end-labels land 0.63 years apart on a ~77–84 axis — close enough to collide —
 * so `nudgeLabels` spreads them vertically once they are closer than a label's own height, per
 * `references/types/line.md`'s own trap.
 *
 * The furniture colours (ink, muted, grid) are NOT derived here — `deriveFurniture` lives in
 * node (this skill's own copy of `render-still.mjs`), passed in as props, so this composition
 * never carries a second implementation of the contrast rule.
 */

import { extent } from "d3-array";
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
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
import { LINE_TIMING } from "./timing-contract";

const FRAME = { width: 1080, height: 1080 };
const PAD = 72;
const TITLE = { fontSize: 44, fontWeight: 700, lead: 56 };
const SOURCE = { fontSize: 22, fontWeight: 400, lead: 28 };
const AXIS = { fontSize: 22, fontWeight: 400 };
const LABEL = { fontSize: 27, fontWeight: 600 };
const NOTE = { fontSize: 22, fontWeight: 400 };
export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

const UNIT = "years";
const LABEL_GAP_MIN = 32; // px — roughly one label's own line-height; the collision floor.

export type Reading = { year: number; value: number };

export function fmt(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

/** The fitted vertical scale — both series AND the reference joined into one extent, then
 *  `.nice()`d outward, so neither line is squeezed to make room for the other and the 80-year
 *  reference sits inside the frame in every year. */
function yScale(che: Reading[], fra: Reading[], reference: number) {
  const values = [
    ...che.map((d) => d.value),
    ...fra.map((d) => d.value),
    reference,
  ];
  return scaleLinear()
    .domain(extent(values) as [number, number])
    .nice();
}

export function yTickValues(
  che: Reading[],
  fra: Reading[],
  reference: number,
): number[] {
  const [floor, ceiling] = yScale(che, fra, reference).domain();
  return [floor, reference, ceiling];
}

export function twoLineGeometry(
  che: Reading[],
  fra: Reading[],
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
  const years = che.map((d) => d.year);
  const first = Math.min(...years);
  const last = Math.max(...years);
  const ticks = yTickValues(che, fra, reference);

  const x = scaleLinear().domain([first, last]).range([plot.left, plot.right]);
  const y = yScale(che, fra, reference).range([plot.bottom, plot.top]);

  const chePoints = che.map((d) => ({ ...d, x: x(d.year), y: y(d.value) }));
  const fraPoints = fra.map((d) => ({ ...d, x: x(d.year), y: y(d.value) }));

  return {
    plot,
    chePoints,
    fraPoints,
    cheEnd: chePoints[chePoints.length - 1],
    fraEnd: fraPoints[fraPoints.length - 1],
    referenceY: y(reference),
    ticksY: ticks.map((value) => ({ value, y: y(value) })),
    ticksX: [first, years[Math.floor(years.length / 2)], last].map((year) => ({
      year,
      x: x(year),
    })),
  };
}

/** The trap this beat exists to exercise: two end-labels close enough in pixel space to collide.
 *  Spreads them apart vertically — up for the higher value, down for the lower — only once they
 *  are actually closer than a label's own height; otherwise both sit at their true endpoint. */
export function nudgeLabels(
  cheY: number,
  fraY: number,
): { cheLabelY: number; fraLabelY: number } {
  const gap = Math.abs(fraY - cheY);
  if (gap >= LABEL_GAP_MIN) return { cheLabelY: cheY, fraLabelY: fraY };
  const mid = (cheY + fraY) / 2;
  const [higherY, lowerY] = cheY < fraY ? [cheY, fraY] : [fraY, cheY]; // smaller y = higher on screen
  const spread = {
    higher: mid - LABEL_GAP_MIN / 2,
    lower: mid + LABEL_GAP_MIN / 2,
  };
  return cheY < fraY
    ? { cheLabelY: spread.higher, fraLabelY: spread.lower }
    : { cheLabelY: spread.lower, fraLabelY: spread.higher };
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

/** Chronological partial path — index 0 is the first year, the head advances forward in time,
 *  linear (the x axis IS time, `motion-grammar.md`). */
export function drawnSoFar<T extends { x: number; y: number }>(
  points: T[],
  progress: number,
): { x: number; y: number }[] {
  if (points.length === 0 || progress <= 0) return [];
  const last = points.length - 1;
  const travelled = progress * last;
  const index = Math.min(last, Math.floor(travelled));
  if (index >= last) return points.map(({ x, y }) => ({ x, y }));
  const head = points.slice(0, index + 1).map(({ x, y }) => ({ x, y }));
  const fraction = travelled - index;
  const a = points[index];
  const b = points[index + 1];
  return [
    ...head,
    { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction },
  ];
}

export type LifeExpectancyGapVideoProps = {
  che: Reading[];
  fra: Reading[];
  title: string;
  source: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  reference: number;
  referenceLabel: string;
  timing?: BeatTiming;
};

export function LifeExpectancyGapVideo({
  che,
  fra,
  title,
  source,
  ground,
  accent,
  ink,
  muted,
  grid,
  reference,
  referenceLabel,
  timing = LINE_TIMING,
}: LifeExpectancyGapVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = FRAME;

  // ── Layout. Identical at every frame — the build changes what is visible, never where it sits.
  // Both title and source are WRAPPED, not trusted to fit — a bare `measureText` check against
  // the frame width is what a fixed-width source line silently overruns off the right edge.
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  const sourceBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 44;

  const cheEndReading = che[che.length - 1];
  const fraEndReading = fra[fra.length - 1];
  const cheLabel = `Switzerland · ${fmt(cheEndReading.value)} ${UNIT}`;
  const fraLabel = `France · ${fmt(fraEndReading.value)} ${UNIT}`;
  const tickLabels = yTickValues(che, fra, reference).map(
    (v) => `${fmt(v, 1)}`,
  );
  const padding = {
    top: sourceBaseline + (sourceLines.length - 1) * SOURCE.lead + 60,
    right:
      PAD +
      16 +
      Math.max(measureText(cheLabel, LABEL), measureText(fraLabel, LABEL)),
    bottom: PAD + 44,
    left: PAD + 14 + Math.max(...tickLabels.map((l) => measureText(l, AXIS))),
  };

  const g = twoLineGeometry(che, fra, { width, height, padding, reference });

  // ── The edit. Six windows, all read off the timing contract.
  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const conclusion = progressOf(frame, timing.conclusion);

  const furnitureOpacity = establish;

  const referenceX2 = interpolate(
    referenceProgress,
    [0, 1],
    [g.plot.left, g.plot.right],
    { easing: Easing.out(Easing.cubic) },
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

  // Both series drawn off the SAME reveal fraction — neither line leads the other.
  const cheDrawn = drawnSoFar(g.chePoints, reveal);
  const fraDrawn = drawnSoFar(g.fraPoints, reveal);
  const chePath =
    cheDrawn.length > 1
      ? line<{ x: number; y: number }>()
          .x((p) => p.x)
          .y((p) => p.y)
          .digits(1)(cheDrawn)!
      : null;
  const fraPath =
    fraDrawn.length > 1
      ? line<{ x: number; y: number }>()
          .x((p) => p.x)
          .y((p) => p.y)
          .digits(1)(fraDrawn)!
      : null;

  // France's own end-dot: fades in right as the reveal finishes drawing to it — gated on the
  // mark's own reveal progress, not a separate master signal (`motion-grammar.md`).
  const fraDotOpacity = interpolate(reveal, [0.97, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fraLabelOpacity = fraDotOpacity;

  // Switzerland — the subject — lands as its own event, after both lines are fully drawn.
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const subjectRadius = interpolate(subjectSpring, [0, 1], [0, 10]);

  const conclusionOpacity = interpolate(conclusion, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  const { cheLabelY, fraLabelY } = nudgeLabels(g.cheEnd.y, g.fraEnd.y);

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

        {g.ticksY.map((tick, i) => (
          <g key={tick.value}>
            {/* The middle tick IS the reference; its own dashed rule is drawn separately below,
                in its own event, so it is never a decorative twin of a gridline. */}
            {i === 1 ? null : (
              <line
                x1={g.plot.left}
                x2={g.plot.right}
                y1={tick.y}
                y2={tick.y}
                stroke={grid}
                strokeWidth={1.5}
              />
            )}
            <text
              x={g.plot.left - 14}
              y={tick.y + 7}
              fill={muted}
              fontSize={AXIS.fontSize}
              textAnchor="end"
            >
              {tickLabels[i]}
            </text>
          </g>
        ))}
        {g.ticksX.map((tick) => (
          <text
            key={tick.year}
            x={tick.x}
            y={g.plot.bottom + 38}
            fill={muted}
            fontSize={AXIS.fontSize}
            textAnchor="middle"
          >
            {tick.year}
          </text>
        ))}
      </g>

      {/* The reference: both countries' shared milestone, laid down before either line. */}
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
          {/* Left-anchored, not centred: both lines cross 80 years around 2003–2007, roughly the
              plot's own middle (`BRIEF.md`'s exact values) — a centred label would sit directly
              on top of the crossing it is naming. Both series start well under 80 in 1990, so the
              left third of the rule is clear space for the whole life of this beat's data. */}
          <text
            x={g.plot.left + 60}
            y={g.referenceY - 14}
            fill={muted}
            fontSize={NOTE.fontSize}
            textAnchor="start"
            opacity={referenceLabelOpacity}
          >
            {referenceLabel}
          </text>
        </g>
      ) : null}

      {/* France — muted-but-named, never the accent (`BRIEF.md`: two hues total). */}
      {fraPath ? (
        <path
          d={fraPath}
          fill="none"
          stroke={muted}
          strokeWidth={3.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}
      {fraDotOpacity > 0 ? (
        <circle
          cx={g.fraEnd.x}
          cy={g.fraEnd.y}
          r={6}
          fill={muted}
          opacity={fraDotOpacity}
        />
      ) : null}
      <text
        x={g.plot.right + 16}
        y={fraLabelY + 8}
        fill={ink}
        fontSize={LABEL.fontSize}
        fontWeight={400}
        opacity={fraLabelOpacity}
      >
        {fraLabel}
      </text>

      {/* Switzerland — the accent, the subject. */}
      {chePath ? (
        <path
          d={chePath}
          fill="none"
          stroke={accent}
          strokeWidth={4}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}
      {subjectRadius > 0 ? (
        <circle
          cx={g.cheEnd.x}
          cy={g.cheEnd.y}
          r={subjectRadius}
          fill={accent}
        />
      ) : null}
      <text
        x={g.plot.right + 16}
        y={cheLabelY + 8}
        fill={ink}
        fontSize={LABEL.fontSize}
        fontWeight={LABEL.fontWeight}
        opacity={conclusionOpacity}
      >
        {cheLabel}
      </text>
    </svg>
  );
}
