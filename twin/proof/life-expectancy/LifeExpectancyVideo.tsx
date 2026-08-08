/**
 * The video beat of "Covid cost Switzerland nearly a year of life expectancy — and it took three
 * years to win it back." — 8 seconds, 30fps, 1080 × 1080.
 *
 * Second beat written in this shape (`EmissionsVideo.tsx` is the first): its own pure geometry
 * below (no `crossingGeometry` import — that module's `peak`/`crossing` are beat 1's specific
 * shape, a value climbing to a maximum and later falling back through a level; this beat's shape
 * is different, see below), its own timing contract (`timing-contract.ts`).
 *
 * `FONT_FAMILY`, `measureText`, `wrap` and `drawnSoFar` are this story's own copies of
 * `EmissionsVideo.tsx`'s functions of the same name, not an import from it — this story lives
 * outside `twin-chart-video`'s skill boundary now (`proof/life-expectancy/`), and the settled rule
 * for a story that needs something a skill has is to duplicate it, not reach back across the
 * boundary. The bodies are identical on purpose: both are the video genre's browser-Canvas text
 * measurer, not the static genre's resvg one (`#shared/twin-chart-beat/render-still.mjs`) — the
 * two are not interchangeable, so vendoring the wrong one would silently mismeasure.
 *
 * THE MOTION PROBLEM: the confirmed subject is 2020, the dip — but 2020 sits four years before the
 * series ends, not at its tail, and the takeaway's second half ("it took three years to win it
 * back") is only true if the reader has already seen 2021–2024 on screen. A reveal that stopped at
 * 2020 the way beat 1's stops at 2024 would hide the fact the beat exists to state.
 *
 * The fix: `reveal` never stops early. It draws the WHOLE series, 2000 → 2024, in chronological
 * order at constant pace, same as beat 1 — "data arriving is the motion event" governs the reveal
 * regardless of where the subject sits inside it. `subject` is then something beat 1 does not need:
 * a distinct EMPHASIS event that lands on a mark already drawn, not a mark still arriving. By the
 * time it starts, 2023 — the recovery — and 2024 are already on screen, so the accent lands on
 * evidence the reader has already read, never on an empty frame.
 */

import { line } from "d3-shape";
import { extent } from "d3-array";
import { scaleLinear } from "d3-scale";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import {
  progressOf,
  type BeatTiming,
} from "#shared/twin-chart-video/timing.ts";
import { LIFE_EXPECTANCY_TIMING } from "./timing-contract";

const FRAME = { width: 1080, height: 1080 };
const PAD = 72;
export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

/**
 * The rendered width of a string in the font it will really be drawn in. Chromium's own text
 * measurement, which is the same engine that will draw it — the browser equivalent of the still
 * path's `measureText`. A fixed gutter constant is the defect this removes; the fallback below is
 * only for a context with no DOM, and no frame is ever rendered in one.
 *
 * This story's own copy of `EmissionsVideo.tsx`'s function of the same name — see the file
 * doc-comment for why it is duplicated, not imported.
 */
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

/**
 * The curve as far as it has been drawn, with the last segment cut mid-way so the head moves
 * smoothly instead of jumping from reading to reading.
 *
 * Chronological: index 0 is the first reading and the head advances forward in time. Linear,
 * because the x axis IS time — easing this would make some years occupy more screen time than
 * others, which is a lie about the pace of the data (`motion-grammar.md`).
 *
 * This story's own copy of `EmissionsVideo.tsx`'s function of the same name — see the file
 * doc-comment for why it is duplicated, not imported.
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

const TITLE = { fontSize: 40, fontWeight: 700, lead: 52 };
const SOURCE = { fontSize: 22, fontWeight: 400 };
const AXIS = { fontSize: 22, fontWeight: 400 };
const LABEL = { fontSize: 28, fontWeight: 600 };
const NOTE = { fontSize: 22, fontWeight: 400 };
const UNIT = "yrs";

export type Reading = { year: number; value: number };

/** English: one decimal, no thousands separator — every value in this series is under 100. */
export function en(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}

/**
 * Data to coordinates. Pure — no colour, no font, no React — the same discipline
 * `proof/co2-suisse/crossing-geometry.ts` set for beat 1, kept as its own module here because this beat's
 * shape (an interior subject plus a named recovery point) is not that module's shape.
 *
 * The reference (the 2019 level) joins the readings in the fitted extent for the same reason beat
 * 1 does it: a level the beat is measured against must be inside the frame even in years that do
 * not approach it.
 */
export function lifeExpectancyGeometry(
  data: Reading[],
  {
    width,
    height,
    padding,
    reference,
    subjectYear,
    recoveryYear,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    reference: number;
    subjectYear: number;
    recoveryYear: number;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const years = data.map((d) => d.year);
  const first = Math.min(...years);
  const last = Math.max(...years);

  const yDomain = scaleLinear()
    .domain(
      extent([...data.map((d) => d.value), reference]) as [number, number],
    )
    .nice();
  const ticks = yDomain.domain() as [number, number];
  const ticksY = [ticks[0], reference, ticks[1]];

  const x = scaleLinear().domain([first, last]).range([plot.left, plot.right]);
  const y = yDomain.range([plot.bottom, plot.top]);

  const points = data.map((d) => ({ ...d, x: x(d.year), y: y(d.value) }));
  const subject = points.find((p) => p.year === subjectYear);
  const recovery = points.find((p) => p.year === recoveryYear);
  if (!subject) throw new Error(`no reading for subject year ${subjectYear}`);
  if (!recovery)
    throw new Error(`no reading for recovery year ${recoveryYear}`);

  return {
    plot,
    points,
    subject,
    recovery,
    referenceY: y(reference),
    ticksY: ticksY.map((value) => ({ value, y: y(value) })),
    ticksX: [first, years[Math.floor(years.length / 2)], last].map((year) => ({
      year,
      x: x(year),
    })),
  };
}

export type LifeExpectancyVideoProps = {
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
  subjectYear: number;
  recoveryYear: number;
  timing?: BeatTiming;
};

export function LifeExpectancyVideo({
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
  subjectYear,
  recoveryYear,
  timing = LIFE_EXPECTANCY_TIMING,
}: LifeExpectancyVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = FRAME;

  // ── Layout. Identical at every frame, same as beat 1: the build changes what is visible, never
  // where anything sits, so nothing shifts when a layer arrives late.
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const sourceBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 44;

  const subjectLabel = `${subjectYear} · ${en(
    data.find((d) => d.year === subjectYear)!.value,
  )} ${UNIT}`;
  const tickLabelsFor = (values: number[]) =>
    values.map((v, i, all) =>
      i === all.length - 1 ? `${en(v, 0)} ${UNIT}` : en(v, i === 1 ? 1 : 0),
    );
  const provisionalTicks = tickLabelsFor(
    (() => {
      const g = lifeExpectancyGeometry(data, {
        width,
        height,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        reference,
        subjectYear,
        recoveryYear,
      });
      return g.ticksY.map((t) => t.value);
    })(),
  );
  const padding = {
    top: sourceBaseline + 76,
    right: PAD + 16,
    bottom: PAD + 44,
    left:
      PAD + 14 + Math.max(...provisionalTicks.map((l) => measureText(l, AXIS))),
  };

  const g = lifeExpectancyGeometry(data, {
    width,
    height,
    padding,
    reference,
    subjectYear,
    recoveryYear,
  });
  const tickLabels = tickLabelsFor(g.ticksY.map((t) => t.value));

  // ── The edit. Six windows, all read off the timing contract — no frame literal below.
  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const conclusion = progressOf(frame, timing.conclusion);

  // Furniture: title, source, axis, ticks, gridlines — one fade, together, then still forever.
  // The title is furniture, not the conclusion (`motion-grammar.md`): it establishes what the
  // reader is looking at, and a video whose first seconds carry no title has no poster frame.
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
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // The WHOLE series, 2000 → 2024 — never stops at the subject. See the file doc-comment: this is
  // the fix for the interior-subject problem, not a compromise on it.
  const drawn = drawnSoFar(g.points, reveal);
  const path =
    drawn.length > 1
      ? line<{ x: number; y: number }>()
          .x((p) => p.x)
          .y((p) => p.y)
          .digits(1)(drawn)!
      : null;

  // The recovery point is context, arriving when the line reaches it during the reveal — the same
  // device beat 1 uses for the 1973 peak. Muted, named, silent about its own value: the value the
  // beat needs to state is 2020's, not 2023's, and a number printed twice is `anti-patterns.md`'s
  // "repeated years or values".
  const recoveryFraction = g.points.indexOf(g.recovery) / (g.points.length - 1);
  const recoveryOpacity = interpolate(
    reveal,
    [recoveryFraction, recoveryFraction + 0.06],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // The subject: 2020, landing as its OWN event once the whole curve — including the recovery and
  // 2024 — is already on screen. Critically damped, same as beat 1's dot: a spring that overshot
  // would show a value for a few frames that the data does not contain.
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const subjectRadius = interpolate(subjectSpring, [0, 1], [0, 10]);
  // A short drop-line from the reference height down to 2020 — landing with the same spring —
  // makes "below the 2019 level" legible as a distance, not just a colour.
  const dropOpacity = interpolate(subjectSpring, [0, 1], [0, 1]);

  // The conclusion states two things in sequence, which is why its window is longer than beat 1's:
  // first the number the subject event just landed on, then the span back to the recovery — never
  // a second copy of the title's own sentence (`motion-grammar.md`).
  const valueOpacity = interpolate(conclusion, [0, 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const spanOpacity = interpolate(conclusion, [0.45, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  // Above both points, but never above the ceiling gridline — the label sits on the line
  // otherwise, when the ceiling and the recovery point are close together in value.
  const spanY = Math.max(
    g.plot.top + 40,
    Math.min(g.subject.y, g.recovery.y) - 44,
  );

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

      {/* The reference: a dashed rule, because 2019 is a level the argument is read against, not a
          measurement drawn from the series' own extremes. */}
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
            x={(g.plot.left + g.plot.right) / 2}
            y={g.referenceY - 14}
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

      {/* Recovery context: muted, marked, unlabelled — the bracket below names what it is. Its
          value is not the number this beat states; 2020's is. */}
      {recoveryOpacity > 0 ? (
        <circle
          cx={g.recovery.x}
          cy={g.recovery.y}
          r={5}
          fill={muted}
          opacity={recoveryOpacity}
        />
      ) : null}

      {/* The drop: how far 2020 sits under the 2019 level, as a distance, not only a colour. */}
      {dropOpacity > 0 ? (
        <line
          x1={g.subject.x}
          x2={g.subject.x}
          y1={g.referenceY}
          y2={g.subject.y}
          stroke={muted}
          strokeWidth={1.5}
          strokeDasharray="4 4"
          opacity={dropOpacity * 0.7}
        />
      ) : null}

      {subjectRadius > 0 ? (
        <circle
          cx={g.subject.x}
          cy={g.subject.y}
          r={subjectRadius}
          fill={accent}
        />
      ) : null}

      {/* The conclusion: the 2020 value, then the span back to the recovery — the two facts the
          title's sentence promised, stated once their evidence is on screen. */}
      <text
        x={g.subject.x}
        y={g.subject.y + 34}
        fill={accent}
        fontSize={LABEL.fontSize}
        fontWeight={LABEL.fontWeight}
        textAnchor="middle"
        opacity={valueOpacity}
      >
        {subjectLabel}
      </text>

      <g opacity={spanOpacity}>
        <line
          x1={g.subject.x}
          x2={g.subject.x}
          y1={spanY}
          y2={spanY + 8}
          stroke={muted}
          strokeWidth={1.5}
        />
        <line
          x1={g.subject.x}
          x2={g.recovery.x}
          y1={spanY}
          y2={spanY}
          stroke={muted}
          strokeWidth={1.5}
        />
        <line
          x1={g.recovery.x}
          x2={g.recovery.x}
          y1={spanY}
          y2={spanY + 8}
          stroke={muted}
          strokeWidth={1.5}
        />
        <text
          x={(g.subject.x + g.recovery.x) / 2}
          y={spanY - 12}
          fill={muted}
          fontSize={NOTE.fontSize}
          textAnchor="middle"
        >
          {recoveryYear - subjectYear} years to regain it
        </text>
      </g>
    </svg>
  );
}
