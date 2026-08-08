/**
 * The video beat of "CO₂ suisse, retour au niveau de 1967" — 8 seconds, 30fps, 1080 × 1080.
 *
 * REPLACE ME per story, the way `twin-chart-beat/assets/ChartSeed.tsx` is replaced. Do not
 * parameterise me into a general video chart; write the next beat's own composition in this shape.
 *
 * What it is NOT is a second chart. The coordinates come from `proof/crossing-geometry.ts`, the
 * same pure core the static beat draws — one geometry, two outputs. This file adds exactly one
 * thing the still cannot have: an order in time. Every window in that order derives from
 * `timing.ts`; there is no frame literal below.
 *
 * The furniture colours (ink, muted, grid) are NOT derived here. `deriveFurniture` lives in
 * `twin-chart-beat/scripts/render-still.mjs`, which loads a native rasteriser at module scope and
 * therefore cannot be bundled for a browser. The render script derives them in node and passes
 * them in as props, so the two genres still share one implementation of the colour rule rather
 * than each carrying their own copy of it.
 */

import { line } from "d3-shape";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import {
  crossingGeometry,
  fr,
  yTickValues,
  type Reading,
} from "../../../proof/crossing-geometry";
import { CO2_TIMING, progressOf, type BeatTiming } from "./timing";

const FRAME = { width: 1080, height: 1080 };
const PAD = 72;
const TITLE = { fontSize: 46, fontWeight: 700, lead: 58 };
const SOURCE = { fontSize: 22, fontWeight: 400 };
const AXIS = { fontSize: 22, fontWeight: 400 };
const LABEL = { fontSize: 28, fontWeight: 600 };
const NOTE = { fontSize: 22, fontWeight: 400 };
const UNIT = "Mt";
const FONT_FAMILY = "Helvetica, Arial, sans-serif";

export type EmissionsVideoProps = {
  data: Reading[];
  title: string;
  source: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  reference: number;
  referenceLabel: string;
  peakLabel: string;
  timing?: BeatTiming;
};

/**
 * The rendered width of a string in the font it will really be drawn in. Chromium's own text
 * measurement, which is the same engine that will draw it — the browser equivalent of the still
 * path's `measureText`. A fixed gutter constant is the defect this removes; the fallback below is
 * only for a context with no DOM, and no frame is ever rendered in one.
 */
let measuringContext: CanvasRenderingContext2D | null | undefined;
function measureText(
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

function wrap(
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

/**
 * The curve as far as it has been drawn, with the last segment cut mid-way so the head moves
 * smoothly instead of jumping from reading to reading.
 *
 * Chronological: index 0 is 1950 and the head advances forward in time. Linear, because the x axis
 * IS time — easing this would make some years occupy more screen time than others, which is a lie
 * about the pace of the data (`motion-grammar.md`).
 */
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

export function EmissionsVideo({
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
  peakLabel,
  timing = CO2_TIMING,
}: EmissionsVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = FRAME;

  // ── Layout. Identical at every frame: the build changes what is visible, never where it sits.
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const sourceBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 46;

  const endReading = data[data.length - 1];
  const endLabel = `${endReading.year} · ${fr(endReading.mt)} ${UNIT}`;
  const tickLabels = yTickValues(data, reference).map((v, i, all) =>
    i === all.length - 1 ? `${fr(v, 0)} ${UNIT}` : fr(v, i === 1 ? 1 : 0),
  );
  const padding = {
    top: sourceBaseline + 60,
    right: PAD + 16 + measureText(endLabel, LABEL),
    bottom: PAD + 44,
    left: PAD + 14 + Math.max(...tickLabels.map((l) => measureText(l, AXIS))),
  };

  const g = crossingGeometry(data, { width, height, padding, reference });

  // ── The edit. Six windows, all of them read off the timing contract.
  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const subjectProgress = progressOf(frame, timing.subject);
  const conclusion = progressOf(frame, timing.conclusion);

  // Furniture: one fade, together, then still forever.
  const furnitureOpacity = establish;

  // The baseline is laid down left to right, then labelled. It is left alone before the curve
  // starts, which is the gap between `reference` and `reveal` in the timing contract.
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

  const drawn = drawnSoFar(g.points, reveal);
  const path =
    drawn.length > 1
      ? line<{ x: number; y: number }>()
          .x((p) => p.x)
          .y((p) => p.y)
          .digits(1)(drawn)!
      : null;

  // The peak is context and it arrives when the line reaches it — data arriving is the motion
  // event, so a marker for 1973 that appeared in 1962 would be pointing at nothing.
  const peakFraction = g.points.indexOf(g.peak) / (g.points.length - 1);
  const peakOpacity = interpolate(
    reveal,
    [peakFraction, peakFraction + 0.06],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // The subject lands on its own. Damping 200 against stiffness 120 is critically damped: the dot
  // settles onto its coordinate and never passes it, because for the frames it overshot it would
  // be showing a value the data does not contain.
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const subjectRadius = interpolate(subjectSpring, [0, 1], [0, 10]);
  const subjectLabelOpacity = interpolate(subjectProgress, [0.35, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // The sentence, handed over once the chart has proved it. Its space was reserved from frame 0,
  // so nothing below it moves when it arrives.
  const titleOpacity = conclusion;
  const titleRise = interpolate(conclusion, [0, 1], [12, 0], {
    easing: Easing.out(Easing.cubic),
  });

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
        <text
          x={PAD}
          y={sourceBaseline}
          fill={muted}
          fontSize={SOURCE.fontSize}
        >
          {source}
        </text>

        {g.ticksY.map((tick, i) => (
          <g key={tick.value}>
            {/* The middle tick IS the reference; its rule is drawn on its own, dashed, in its own
                event. One line, not two. */}
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

      {/* The reference: a dashed rule, because it is a level somebody chose, not a measurement. */}
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
          {/* Under the rule and centred, not above it and left-aligned: the curve climbs THROUGH
              the reference level at 1967, so the only clean space beside the rule on the left is
              152 px wide and the first render put the curve straight through the word "1967". The
              band under the rule between the crossing up and the crossing back down is empty for
              fifty years of data — which is the same fact the beat is about. */}
          <text
            x={(g.plot.left + g.plot.right) / 2}
            y={g.referenceY + 34}
            fill={muted}
            fontSize={NOTE.fontSize}
            textAnchor="middle"
            opacity={referenceLabelOpacity}
          >
            {referenceLabel}
          </text>
        </g>
      ) : null}

      {path ? (
        <path
          d={path}
          fill="none"
          stroke={accent}
          strokeWidth={4}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}

      {/* The peak is context, not the subject: muted, marked, and silent about its own value. */}
      {peakOpacity > 0 ? (
        <g opacity={peakOpacity}>
          <circle cx={g.peak.x} cy={g.peak.y} r={5} fill={muted} />
          <text
            x={g.peak.x}
            y={g.peak.y - 18}
            fill={muted}
            fontSize={NOTE.fontSize}
            textAnchor="middle"
          >
            {peakLabel}
          </text>
        </g>
      ) : null}

      {subjectRadius > 0 ? (
        <circle cx={g.end.x} cy={g.end.y} r={subjectRadius} fill={accent} />
      ) : null}
      <text
        x={g.plot.right + 16}
        y={g.end.y + 10}
        fill={accent}
        fontSize={LABEL.fontSize}
        fontWeight={LABEL.fontWeight}
        opacity={subjectLabelOpacity}
      >
        {endLabel}
      </text>

      <g opacity={titleOpacity} transform={`translate(0 ${titleRise})`}>
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
      </g>
    </svg>
  );
}
