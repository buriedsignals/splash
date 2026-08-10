/**
 * The video beat of "Switzerland has kept a longer life expectancy than France for over three
 * decades" — 8 seconds, 30fps, 1080 × 1080.
 *
 * TYPE: line, two series. Its own pure geometry below (`twoLineGeometry`, `yTickValues`) — not
 * imported from anywhere, because this story lives outside `chart-video`'s skill boundary
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
} from "#shared/chart-video/timing.ts";
import {
  assertTypeFloor,
  frameInsetFor,
  sizeFor,
} from "#shared/chart-video/sizes.mjs";
import {
  assertPlotAspect,
  formForSize,
} from "#shared/chart-beat/type-at-size.mjs";
import { LINE_TIMING } from "./timing-contract";

/** The chart type this beat draws, in `references/types/` vocabulary. Read by `formForSize`. */
const TYPE = "line";

/**
 * THE 900x560-CONVENTION BASE, WITH THE ROW'S `typeScale` AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more. It said `1080 x 1080` here while `Root.tsx` said
 * `width={1080} height={1080}` two files away, with nothing between them, so `size: portrait` on
 * the slot produced a square in silence (`specs/W4-export-sizes.md` §1a).
 *
 * Every spacing number goes through `sp`, not only the fonts — the air under the header, the tick
 * inset, the lift of the reference label off its own rule. Scaling the type and leaving those at
 * their 1080-square value is what collided the title into the subtitle on the static probe's first
 * run.
 *
 * The base numbers are the old 1080-square values re-expressed at the convention the table's
 * `typeScale` is written against — smallest token 12, so the row's multiplier lands the smallest
 * drawn type exactly on that row's legibility floor. The old values did not clear it: the axis was
 * 22px on a 1080 frame, 7.3 CSS px on the phone a square post is read on.
 */
const BASE = {
  TITLE: { fontSize: 24, fontWeight: 700, lead: 31 },
  SOURCE: { fontSize: 12, fontWeight: 400, lead: 15 },
  AXIS: { fontSize: 12, fontWeight: 400 },
  LABEL: { fontSize: 15, fontWeight: 600 },
  NOTE: { fontSize: 12, fontWeight: 400 },
  HEADER_TO_PLOT: 33,
  END_LABEL_AIR: 9,
  END_LABEL_NUDGE: 4,
  X_LABEL_BAND: 24,
  SOURCE_AIR: 5,
  Y_TICK_INSET: 8,
  TICK_BASELINE_NUDGE: 4,
  X_TICK_DROP: 21,
  REFERENCE_LABEL_INSET: 33,
  REFERENCE_LABEL_LIFT: 8,
  END_DOT_R: 3,
  SUBJECT_R: 5,
  DASH_REFERENCE: [4, 3],
};

/** Strokes scale but are NOT rounded: a hairline that rounds up stops being a hairline. */
const BASE_STROKE = { grid: 0.6, reference: 0.8, context: 1.4, subject: 1.6 };

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
    LABEL: f(BASE.LABEL) as typeof BASE.LABEL,
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    HEADER_TO_PLOT: sp(BASE.HEADER_TO_PLOT),
    END_LABEL_AIR: sp(BASE.END_LABEL_AIR),
    END_LABEL_NUDGE: sp(BASE.END_LABEL_NUDGE),
    X_LABEL_BAND: sp(BASE.X_LABEL_BAND),
    SOURCE_AIR: sp(BASE.SOURCE_AIR),
    Y_TICK_INSET: sp(BASE.Y_TICK_INSET),
    TICK_BASELINE_NUDGE: sp(BASE.TICK_BASELINE_NUDGE),
    X_TICK_DROP: sp(BASE.X_TICK_DROP),
    REFERENCE_LABEL_INSET: sp(BASE.REFERENCE_LABEL_INSET),
    REFERENCE_LABEL_LIFT: sp(BASE.REFERENCE_LABEL_LIFT),
    END_DOT_R: sp(BASE.END_DOT_R),
    SUBJECT_R: sp(BASE.SUBJECT_R),
    DASH_REFERENCE: BASE.DASH_REFERENCE.map(sp).join(" "),
    STROKE: {
      grid: st(BASE_STROKE.grid),
      reference: st(BASE_STROKE.reference),
      context: st(BASE_STROKE.context),
      subject: st(BASE_STROKE.subject),
    },
  };
}

/**
 * Every `fontSize` the returned element tree actually carries, INCLUDING one written bare at a mark.
 * The still path reads the rendered SVG's `font-size` attributes; a video composition's markup only
 * exists inside the browser Remotion drives, so the equivalent reading is the element tree.
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

const UNIT = "years";
/**
 * The collision floor between the two end-labels, DERIVED from the label's own drawn size rather
 * than typed. It was `32` — "roughly one label's own line-height" said the comment, against a 27px
 * label, which is 1.19 of it. At any other frame that literal is a floor for a type size the beat
 * no longer draws: at landscape the label is 38px and two labels 32px apart would overlap while
 * the guard called them clear. The ratio is the fact; the pixel was a coincidence.
 */
export function labelGapMinFor(labelFontSize: number): number {
  return Math.round(labelFontSize * 1.2);
}

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
  labelGapMin: number,
): { cheLabelY: number; fraLabelY: number } {
  const gap = Math.abs(fraY - cheY);
  if (gap >= labelGapMin) return { cheLabelY: cheY, fraLabelY: fraY };
  const mid = (cheY + fraY) / 2;
  const [higherY, lowerY] = cheY < fraY ? [cheY, fraY] : [fraY, cheY]; // smaller y = higher on screen
  const spread = {
    higher: mid - labelGapMin / 2,
    lower: mid + labelGapMin / 2,
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
  /** The export size gate 2c pinned, recorded in this beat's own `BRIEF.md` front matter. */
  size: string;
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
  size,
  timing = LINE_TIMING,
}: LifeExpectancyGapVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // The frame is the TABLE's, at the size the journalist pinned — never a constant in this file.
  const { width, height, typeScale } = sizeFor(size);
  const PAD = frameInsetFor(size);
  const T = tokens(typeScale);
  const { TITLE, SOURCE, AXIS, LABEL, NOTE } = T;

  // WHETHER THIS TYPE MAY ENTER THIS SIZE, AND IN WHAT FORM — before anything is measured.
  //
  // A line's x axis is TIME, so it has no twin form: "line charts resist rotation, due to the
  // convention that the horizontal axis represents time proceeding from left to right" (Horak et
  // al. §2.4.2, quoted in `type-at-size.mjs`). What it has instead is a MEASURED aspect range, so
  // `formForSize` answers `clamp` at a square or tall frame and `assertPlotAspect` below refuses a
  // plot outside it. A line's argument is a slope, and a slope is an aspect ratio.
  const form = formForSize(TYPE, size);
  if (form.verdict === "refuse")
    throw new Error(
      `vidx-line-life-expectancy: ${TYPE} cannot be drawn at ${size}. ${form.reason}`,
    );

  // ── Layout. Identical at every frame — the build changes what is visible, never where it sits.
  // Both title and source are WRAPPED, not trusted to fit — a bare `measureText` check against
  // the frame width is what a fixed-width source line silently overruns off the right edge.
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN, not under the title — the LAST line lands on
  // `height - PAD`, the same inset the title hangs off at the top, on the same x. It stays inside
  // the furniture opacity group, so no timing contract moves. See
  // chart-beat/references/static-discipline.md, "The source on the frame's bottom margin".
  const sourceBaseline = height - PAD - (sourceLines.length - 1) * SOURCE.lead;

  const cheEndReading = che[che.length - 1];
  const fraEndReading = fra[fra.length - 1];
  const cheLabel = `Switzerland · ${fmt(cheEndReading.value)} ${UNIT}`;
  const fraLabel = `France · ${fmt(fraEndReading.value)} ${UNIT}`;
  const tickLabels = yTickValues(che, fra, reference).map(
    (v) => `${fmt(v, 1)}`,
  );
  const padding = {
    // The plot starts below the LAST TITLE LINE, never below the source.
    top:
      titleBaseline + (titleLines.length - 1) * TITLE.lead + T.HEADER_TO_PLOT,
    right:
      PAD +
      T.END_LABEL_AIR +
      Math.max(measureText(cheLabel, LABEL), measureText(fraLabel, LABEL)),
    // Grown by the credit block's own height plus clear air.
    bottom:
      PAD +
      T.X_LABEL_BAND +
      (sourceLines.length - 1) * SOURCE.lead +
      SOURCE.fontSize +
      T.SOURCE_AIR,
    left:
      PAD +
      T.Y_TICK_INSET +
      Math.max(...tickLabels.map((l) => measureText(l, AXIS))),
  };

  const g = twoLineGeometry(che, fra, { width, height, padding, reference });
  // THE PLOT'S OWN SHAPE, refused before anything is drawn. At landscape this is a no-op — the
  // verdict is `as-is` — and at a square or tall frame it is the assertion that stops a slope being
  // rescaled into a different claim. No counter in this project can see that: the probe's arms
  // scored zero clipped runs and zero collisions while a distribution was destroyed.
  assertPlotAspect(g.plot, TYPE, size, { what: "vidx-line-life-expectancy" });

  // ── The edit. Six windows, all read off the timing contract.
  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
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
  const subjectRadius = interpolate(subjectSpring, [0, 1], [0, T.SUBJECT_R]);

  const conclusionOpacity = interpolate(conclusion, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  const { cheLabelY, fraLabelY } = nudgeLabels(
    g.cheEnd.y,
    g.fraEnd.y,
    labelGapMinFor(LABEL.fontSize),
  );

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

      {/* Axis ticks and gridlines — the frame the data will be measured in, faded in over
          `establish` rather than present at frame 0. */}
      <g opacity={axisOpacity}>
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
                strokeWidth={T.STROKE.grid}
              />
            )}
            <text
              x={g.plot.left - T.Y_TICK_INSET}
              y={tick.y + T.TICK_BASELINE_NUDGE}
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
            y={g.plot.bottom + T.X_TICK_DROP}
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
            strokeWidth={T.STROKE.reference}
            strokeDasharray={T.DASH_REFERENCE}
          />
          {/* Left-anchored, not centred: both lines cross 80 years around 2003–2007, roughly the
              plot's own middle (`BRIEF.md`'s exact values) — a centred label would sit directly
              on top of the crossing it is naming. Both series start well under 80 in 1990, so the
              left third of the rule is clear space for the whole life of this beat's data. */}
          <text
            x={g.plot.left + T.REFERENCE_LABEL_INSET}
            y={g.referenceY - T.REFERENCE_LABEL_LIFT}
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
          strokeWidth={T.STROKE.context}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}
      {fraDotOpacity > 0 ? (
        <circle
          cx={g.fraEnd.x}
          cy={g.fraEnd.y}
          r={T.END_DOT_R}
          fill={muted}
          opacity={fraDotOpacity}
        />
      ) : null}
      <text
        x={g.plot.right + T.END_LABEL_AIR}
        y={fraLabelY + T.END_LABEL_NUDGE}
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
          strokeWidth={T.STROKE.subject}
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
        x={g.plot.right + T.END_LABEL_AIR}
        y={cheLabelY + T.END_LABEL_NUDGE}
        fill={ink}
        fontSize={LABEL.fontSize}
        fontWeight={LABEL.fontWeight}
        opacity={conclusionOpacity}
      >
        {cheLabel}
      </text>
    </svg>
  );

  // EVERY TYPE SIZE THIS FRAME ACTUALLY DRAWS, against the row's own floor — read off the element
  // tree rather than a list of tokens, so a size written bare at a mark cannot escape it.
  assertTypeFloor(
    fontSizesIn(drawing)
      .map((px) => `font-size="${px}"`)
      .join(" "),
    size,
    { what: `vidx-line-life-expectancy at ${size}` },
  );

  return drawing;
}
