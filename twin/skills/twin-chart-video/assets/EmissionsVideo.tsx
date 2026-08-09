/**
 * The video beat of "CO₂ suisse, retour au niveau de 1967" — 8 seconds, 30fps, 1080 × 1080.
 *
 * REPLACE ME. Do not parameterise me. Write the next beat's own composition in this shape,
 * the way `twin-chart-beat/assets/ChartSeed.tsx` is replaced per story. Do not
 * parameterise this file into a general video chart.
 *
 * What it is NOT is a second chart. The coordinates are computed in this same file — `fr`,
 * `yTickValues` and `crossingGeometry` below — and not imported from anywhere. That is deliberate
 * and it is the premise of the whole canon: this skill directory has to build after being copied,
 * on its own, into a journalist's root, so nothing under it may import out of it. This file used to
 * reach into `proof/co2-suisse/crossing-geometry.ts`, a story workspace that no copy of this skill
 * would carry with it. Skills duplicate; they never link. A story's own static beat keeps its own
 * copy of the same arithmetic, and `splash-twin/test/helper-parity.test.ts` is what keeps the copies
 * honest. What this file adds that a still cannot have is an order in time: every window in that
 * order derives from `timing.ts`, and there is no frame literal below.
 *
 * The furniture colours (ink, muted, grid) are NOT derived here. `deriveFurniture` lives in this
 * skill's own `scripts/render-still.mjs`, which loads a native rasteriser at module scope and
 * therefore cannot be bundled for a browser. The render script derives them in node and passes
 * them in as props, so one render never carries two implementations of the colour rule.
 *
 * `FONT_FAMILY`, `measureText`, `wrap` and `drawnSoFar` are exported so this skill's own tests, and
 * `splash-twin/test/helper-parity.test.ts`, can exercise this copy against every other copy in the
 * tree without a browser. They are NOT a library for another beat to import: the two beats that
 * began beside this one (`LifeExpectancyVideo.tsx`, `MigrationVideo.tsx`) left for `proof/` and each
 * carries its own copy, which is what the duplicate-do-not-link rule requires of them.
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
import { CO2_TIMING, progressOf, type BeatTiming } from "./timing";

const FRAME = { width: 1080, height: 1080 };
const PAD = 72;
const TITLE = { fontSize: 46, fontWeight: 700, lead: 58 };
const SOURCE = { fontSize: 22, fontWeight: 400 };
const AXIS = { fontSize: 22, fontWeight: 400 };
/** How far below the plot's own floor an x-axis tick label's BASELINE sits. Named, because two
 *  places have to agree about it: the `<text y>` that draws the label, and `padding.bottom`, which
 *  reserves room for that label AND for the source line now sitting under it. */
const X_TICK_DROP = 38;
/** The clear air between the bottom of the x-axis label band and the top of the source line. */
const X_AXIS_TO_SOURCE_GAP = 10;
const LABEL = { fontSize: 28, fontWeight: 600 };
const NOTE = { fontSize: 22, fontWeight: 400 };
export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

// ===== CONFIG — edit for your story =====
// Everything between here and the closing marker is this beat's own words and its own editorial
// calls — the next beat replaces every value below.
/** Unit of measurement for this series. Specific to each story. */
const UNIT = "mm";
// =========================================

export type Reading = { year: number; mt: number };

/** French: comma decimal, thin space for thousands. The furniture speaks the journalist's language. */
export function fr(value: number, decimals = 1): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * The fitted vertical scale. The reference joins the readings in the extent, because a level the
 * beat is about must be inside the frame even in the year it is not approached.
 *
 * `.nice()` rounds that extent outward to round values and stops — no padding, no stepping, nothing
 * to defend against afterwards.
 */
function yScale(data: Reading[], reference: number) {
  return scaleLinear()
    .domain(extent([...data.map((d) => d.mt), reference]) as [number, number])
    .nice();
}

/**
 * Three ticks — floor, THE REFERENCE LEVEL, top.
 *
 * The middle tick is not the arithmetic middle and it is not one of d3's: it is the level the beat
 * is about, placed on the axis on purpose. A round scale gets this wrong twice over — the floor
 * snaps to zero (a third of the frame empty under a line whose slope carries the story, the failure
 * `static-discipline.md` describes), and a regular gridline lands a few pixels from the reference,
 * so the one rule the reader must see acquires a decorative twin. Putting the reference ON the axis
 * removes both: the fitted floor keeps the slope, the middle gridline IS the reference, and the
 * number is stated once. Floor and top are d3's rounded domain ends, which is why they read round.
 */
export function yTickValues(data: Reading[], reference: number): number[] {
  const [floor, ceiling] = yScale(data, reference).domain();
  return [floor, reference, ceiling];
}

/**
 * Data to coordinates. No colour, no font, no label — and no import that a browser bundle could not
 * load, which is what lets the composition above call it frame by frame.
 */
export function crossingGeometry(
  data: Reading[],
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
  const years = data.map((d) => d.year);
  const first = Math.min(...years);
  const last = Math.max(...years);
  const ticks = yTickValues(data, reference);

  // The x domain is the years themselves, never nicened — rounding it outward would invent time.
  const x = scaleLinear().domain([first, last]).range([plot.left, plot.right]);
  const y = yScale(data, reference).range([plot.bottom, plot.top]);

  const points = data.map((d) => ({ ...d, x: x(d.year), y: y(d.mt) }));

  return {
    plot,
    points,
    end: points[points.length - 1],
    referenceY: y(reference),
    ticksY: ticks.map((value) => ({ value, y: y(value) })),
    ticksX: [first, years[Math.floor(years.length / 2)], last].map((year) => ({
      year,
      x: x(year),
    })),
  };
}

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
  timing?: BeatTiming;
};

/**
 * The rendered width of a string in the font it will really be drawn in. Chromium's own text
 * measurement, which is the same engine that will draw it — the browser equivalent of the still
 * path's `measureText`. A fixed gutter constant is the defect this removes; the fallback below is
 * only for a context with no DOM, and no frame is ever rendered in one.
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
  timing = CO2_TIMING,
}: EmissionsVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = FRAME;

  // ── Layout. Identical at every frame: the build changes what is visible, never where it sits.
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN, not under the title — `height - PAD`, the
  // same inset the title hangs off at the top, on the same x. It stays inside the furniture
  // opacity group, so no timing contract moves: it fades in with the title at `establish` and is
  // still there at the last frame. See twin-chart-beat/references/static-discipline.md, "The
  // source on the frame's bottom margin."
  const sourceBaseline = height - PAD;

  const endReading = data[data.length - 1];
  const endLabel = `${endReading.year} · ${fr(endReading.mt)} ${UNIT}`;
  const tickLabels = yTickValues(data, reference).map((v, i, all) =>
    i === all.length - 1 ? `${fr(v, 0)} ${UNIT}` : fr(v, i === 1 ? 1 : 0),
  );
  const padding = {
    // The plot starts below the LAST TITLE LINE, never below the source — the old dependency is
    // what would otherwise have dragged the plot to the frame's floor with it.
    top: titleBaseline + (titleLines.length - 1) * TITLE.lead + 60,
    right: PAD + 16 + measureText(endLabel, LABEL),
    // Derived from where the source now sits: the x-axis label band has to end above the source's
    // own ink, with clear air between them.
    bottom:
      height -
      sourceBaseline +
      SOURCE.fontSize +
      X_TICK_DROP +
      X_AXIS_TO_SOURCE_GAP,
    left: PAD + 14 + Math.max(...tickLabels.map((l) => measureText(l, AXIS))),
  };

  const g = crossingGeometry(data, { width, height, padding, reference });

  // ── The edit. Six windows, all of them read off the timing contract.
  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const conclusion = progressOf(frame, timing.conclusion);

  // Furniture: title, source, axis, ticks, gridlines — one fade, together, then still forever.
  // The title is furniture. It establishes what the reader is looking at, which is what furniture
  // is for; it is not the conclusion (`motion-grammar.md`, "The conclusion appears only after its
  // evidence is visible"), and a video whose first seconds carry no title has no poster frame.
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

  // The subject lands on its own. Damping 200 against stiffness 120 is critically damped: the dot
  // settles onto its coordinate and never passes it, because for the frames it overshot it would
  // be showing a value the data does not contain.
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const subjectRadius = interpolate(subjectSpring, [0, 1], [0, 10]);

  // The conclusion is the ASSERTION, not the title: the 2024 value, stated once the point carrying
  // it has landed. The title is furniture and comes up with the axis, above — the first build of
  // this file put the title here, obeyed "the conclusion appears only after its evidence" to the
  // letter, and played nearly seven of its eight seconds under a deserted band of empty frame.
  const conclusionOpacity = interpolate(conclusion, [0, 1], [0, 1], {
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
            y={g.plot.bottom + X_TICK_DROP}
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

      {subjectRadius > 0 ? (
        <circle cx={g.end.x} cy={g.end.y} r={subjectRadius} fill={accent} />
      ) : null}
      <text
        x={g.plot.right + 16}
        y={g.end.y + 10}
        fill={accent}
        fontSize={LABEL.fontSize}
        fontWeight={LABEL.fontWeight}
        opacity={conclusionOpacity}
      >
        {endLabel}
      </text>
    </svg>
  );
}
