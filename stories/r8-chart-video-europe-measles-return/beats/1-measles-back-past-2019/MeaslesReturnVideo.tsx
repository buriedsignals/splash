/**
 * The video beat of "Measles in Europe and central Asia fell to 150 cases in 2021 — by 2024 it was
 * back above 2019." — 8 seconds, 30fps, 1080 × 1080.
 *
 * Written in the shape `chart-video`'s seed teaches and `proof/life-expectancy` works: its own pure
 * geometry below, its own timing contract (`timing-contract.ts`), no frame literal in the drawing.
 *
 * `FONT_FAMILY`, `measureText`, `wrap` and `drawnSoFar` are this story's own copies of the seed's
 * functions of the same name, not imports from it — a story lives outside the skill boundary and
 * the settled rule is that it duplicates what it needs rather than reaching back across. The bodies
 * are identical on purpose: both are the video format's browser-Canvas text measurer, not the
 * static format's resvg one, and vendoring the wrong one would silently mismeasure.
 *
 * THE MOTION PROBLEM, AND WHY THIS ARGUMENT NEEDS AN ORDER AT ALL. The claim is a CROSSING: 2024
 * came back past a level the region had already reached in 2019. A still can draw a line and a
 * dashed rule at once, and a reader then has to work out which one the argument is measured
 * against. The order does that work: the rule is laid down and labelled with its own number while
 * the plot is otherwise empty, so by the time any data exists the reader already holds the level
 * the last mark will be judged against. That is the whole reason this is a video and not a still.
 *
 * THE HONEST LIMIT, STATED HERE AND AGAIN IN BRIEF.md. The crossing itself is 1 795 cases on a
 * 110 000-case axis — about seven pixels at this size. The geometry CANNOT carry it, and nothing
 * in this file pretends it can: the conclusion states the excess as a number, in words, beside the
 * mark. What the geometry carries is the collapse and the return, which is a true and much larger
 * shape. A beat that relied on seven pixels to make its point would be decorating an argument
 * rather than drawing one.
 */

import { line } from "d3-shape";
import { extent } from "d3-array";
import { scaleLinear } from "d3-scale";
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import { progressOf, type BeatTiming } from "#shared/chart-video/timing.ts";
import { frameInsetFor, sizeFor, stageFor } from "#shared/chart-video/sizes.mjs";
import { MEASLES_TIMING } from "./timing-contract";

/**
 * THE FAMILY, AS A LITERAL — and it is a literal because the tree will not let it be anything else.
 *
 * `chart-video`'s render path reads `PALETTE.md` and does NOT read `TYPEFACE.md`; the seed and both
 * pattern beats carry this same constant as their only family. This beat first threaded the
 * recorded family in as a prop and used it to DRAW and to MEASURE — six lines — and
 * `splash/test/video-helper-parity.test.ts` turned red on it, because `measureText` and `wrap`
 * are vendored helpers required to stay byte-identical to `EmissionsVideo.tsx`'s, and honouring a
 * recorded family in the MEASUREMENT means changing `measureText`'s signature.
 *
 * So the fix is refused by the architecture, and this beat does not work around it. What it does
 * instead is refuse to render when the two disagree: `render.mjs` reads the recorded family out of
 * `TYPEFACE.md`, reads this literal out of this file, and throws if they are not the same string.
 * The limit stays; it stops being silent. See NOTES-FOR-MAINTAINER.md.
 */
export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

/**
 * The rendered width of a string in the font it will really be drawn in. Chromium's own text
 * measurement, which is the same engine that will draw it. The fallback is only for a context with
 * no DOM, and no frame is ever rendered in one.
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
 * Chronological, and LINEAR, because the x axis IS time — easing this would make some years occupy
 * more screen time than others, which is a lie about the pace of the data (`motion-grammar.md`).
 * Re-generated from the points reached, never a finished path hidden behind a moving dash: a dash
 * pattern is measured in a space the path's length may not live in, and this shape cannot have that
 * defect because there is no pattern to compute.
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

/**
 * THE TUNING, REBASED, WITH THE SIZE AS THE MULTIPLIER.
 *
 * The base is the 900 × 560 convention every beat in this tree writes against, and the smallest
 * token is 12 — so at the square row's typeScale of 3.0 the axis lands on 36 px exactly, which is
 * `sizes.mjs`'s floor for a frame read full-bleed at 360 dp. Every spacing number goes through
 * `sp`, not only the fonts: scaling the type and leaving the gaps is what collides a title into a
 * subtitle. `PAD` is the one exception — a frame's margin is proportional to the CANVAS, not to
 * the type, which is what `frameInsetFor` states.
 */
const BASE = {
  TITLE: { fontSize: 22, fontWeight: 700, lead: 28 },
  SOURCE: { fontSize: 12, fontWeight: 400, lead: 17 },
  AXIS: { fontSize: 12, fontWeight: 400 },
  LABEL: { fontSize: 15, fontWeight: 600 },
  NOTE: { fontSize: 12, fontWeight: 400 },
  TITLE_TO_PLOT: 25,
  PLOT_RIGHT_AIR: 5,
  X_LABEL_BAND: 15,
  AXIS_TO_SOURCE: 3,
  Y_TICK_INSET: 5,
  Y_TICK_BASELINE_NUDGE: 2,
  X_TICK_DROP: 13,
  REFERENCE_LABEL_RISE: 5,
  SUBJECT_LABEL_RISE: 6,
  SUBJECT_LABEL_GUTTER: 5,
  SUBJECT_NOTE_RISE: 6,
  SUBJECT_RADIUS: 3.3,
  FLOOR_RADIUS: 1.7,
  GRID_STROKE: 0.5,
  REFERENCE_STROKE: 0.67,
  // 1.33 is the seed's, and the seed is watched in an article. This beat is watched in a feed at
  // 360 dp, where 1.33 x 3.0 = 4 frame px is 1.3 CSS px — a hairline, and it is the ONLY mark
  // carrying the argument. 2.0 puts it on 2 CSS px, which is the thinnest stroke the same
  // mobile-first probe behind minTypePx treats as reliably visible.
  LINE_STROKE: 2.0,
  REFERENCE_DASH: [2.7, 2],
};

function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  const f = <T extends { fontSize: number; lead?: number }>(tok: T) => ({
    ...tok,
    fontSize: sp(tok.fontSize),
    ...(tok.lead === undefined ? {} : { lead: sp(tok.lead) }),
  });
  const dash = (pair: number[]) =>
    pair.map((v) => (v * typeScale).toFixed(1)).join(" ");
  return {
    TITLE: f(BASE.TITLE) as typeof BASE.TITLE,
    SOURCE: f(BASE.SOURCE) as typeof BASE.SOURCE,
    AXIS: f(BASE.AXIS) as typeof BASE.AXIS,
    LABEL: f(BASE.LABEL) as typeof BASE.LABEL,
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    TITLE_TO_PLOT: sp(BASE.TITLE_TO_PLOT),
    PLOT_RIGHT_AIR: sp(BASE.PLOT_RIGHT_AIR),
    X_LABEL_BAND: sp(BASE.X_LABEL_BAND),
    AXIS_TO_SOURCE: sp(BASE.AXIS_TO_SOURCE),
    Y_TICK_INSET: sp(BASE.Y_TICK_INSET),
    Y_TICK_BASELINE_NUDGE: sp(BASE.Y_TICK_BASELINE_NUDGE),
    X_TICK_DROP: sp(BASE.X_TICK_DROP),
    REFERENCE_LABEL_RISE: sp(BASE.REFERENCE_LABEL_RISE),
    SUBJECT_LABEL_RISE: sp(BASE.SUBJECT_LABEL_RISE),
    SUBJECT_LABEL_GUTTER: sp(BASE.SUBJECT_LABEL_GUTTER),
    SUBJECT_NOTE_RISE: sp(BASE.SUBJECT_NOTE_RISE),
    SUBJECT_RADIUS: BASE.SUBJECT_RADIUS * typeScale,
    FLOOR_RADIUS: BASE.FLOOR_RADIUS * typeScale,
    GRID_STROKE: BASE.GRID_STROKE * typeScale,
    REFERENCE_STROKE: BASE.REFERENCE_STROKE * typeScale,
    LINE_STROKE: BASE.LINE_STROKE * typeScale,
    REFERENCE_DASH: dash(BASE.REFERENCE_DASH),
  };
}

export type Reading = { year: number; cases: number };

/** Whole cases, grouped the way an English-language desk sets them. Never a rounded thousand: the
 *  numbers on this frame are the argument, and 106 237 rounded to "106,000" would put a figure on
 *  screen that the frozen table does not hold. */
const GROUPED = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
export function en(value: number): string {
  return GROUPED.format(value);
}

/**
 * Data to coordinates. Pure — no colour, no font, no React.
 *
 * The reference joins the readings in the fitted extent for the same reason the seed does it: a
 * level the beat is measured against must be inside the frame. Here it changes nothing, because
 * the reference is itself a reading of the series, but stating it keeps the geometry honest if the
 * beat is ever re-pointed at a level outside the data's own range.
 *
 * `topReserve` is pixels of the plot's own top edge the DATA never draws into, reserved for the
 * subject's two-line label. Without it the 2024 mark sits at 96.6% of the axis and its label has
 * nowhere to go but off the frame or through the ceiling.
 */
export function measlesGeometry(
  data: Reading[],
  {
    width,
    height,
    padding,
    reference,
    subjectYear,
    floorYear,
    topReserve = 0,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    reference: number;
    subjectYear: number;
    floorYear: number;
    topReserve?: number;
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
    .domain(extent([...data.map((d) => d.cases), reference, 0]) as [number, number])
    .nice();
  const bounds = yDomain.domain() as [number, number];

  const x = scaleLinear().domain([first, last]).range([plot.left, plot.right]);
  const y = yDomain.range([plot.bottom, plot.top + topReserve]);

  const points = data.map((d) => ({ ...d, x: x(d.year), y: y(d.cases) }));
  const subject = points.find((p) => p.year === subjectYear);
  const floor = points.find((p) => p.year === floorYear);
  if (!subject) throw new Error(`no reading for subject year ${subjectYear}`);
  if (!floor) throw new Error(`no reading for floor year ${floorYear}`);

  return {
    plot,
    points,
    subject,
    floor,
    referenceY: y(reference),
    ticksY: bounds.map((value) => ({ value, y: y(value) })),
    ticksX: [first, years[Math.floor(years.length / 2)], last].map((year) => ({
      year,
      x: x(year),
    })),
  };
}

export type MeaslesReturnVideoProps = {
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
  floorYear: number;
  excessLabel: string;
  unit: string;
  timing?: BeatTiming;
  /** The size row this beat's composition was registered from — `Root.tsx` passes it, one
   *  composition per row. Not a default: a video drawn at a scale nobody chose looks every bit as
   *  deliberate as one drawn in a colour nobody chose. */
  size: string;
};

export function MeaslesReturnVideo({
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
  floorYear,
  excessLabel,
  unit,
  timing = MEASLES_TIMING,
  size,
}: MeaslesReturnVideoProps) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  // THE TWO STATEMENTS OF THE FRAME, CHECKED AGAINST EACH OTHER. Remotion's is what will actually
  // be encoded; the row is what gate 2c pinned. They come from different places, so this is a
  // reading the code that drew the frame cannot make agree with itself.
  const row = sizeFor(size);
  if (row.width !== width || row.height !== height)
    throw new Error(
      `this composition renders at ${width}x${height}, but the size it names — ` +
        `${JSON.stringify(size)} — is ${row.width}x${row.height}. Root.tsx registers one ` +
        `composition per row and passes that row's name; the two have come apart.`,
    );
  const { typeScale } = row;
  const stage = stageFor(size);
  const PAD = frameInsetFor(size);
  const {
    TITLE,
    SOURCE,
    AXIS,
    LABEL,
    NOTE,
    TITLE_TO_PLOT,
    PLOT_RIGHT_AIR,
    X_LABEL_BAND,
    AXIS_TO_SOURCE,
    Y_TICK_INSET,
    Y_TICK_BASELINE_NUDGE,
    X_TICK_DROP,
    REFERENCE_LABEL_RISE,
    SUBJECT_LABEL_RISE,
    SUBJECT_LABEL_GUTTER,
    SUBJECT_NOTE_RISE,
    SUBJECT_RADIUS,
    FLOOR_RADIUS,
    GRID_STROKE,
    REFERENCE_STROKE,
    LINE_STROKE,
    REFERENCE_DASH,
  } = tokens(typeScale);

  const contentTop = stage.reserved ? stage.top : PAD;
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;

  // ── Layout. Identical at every frame: the build changes what is VISIBLE, never where anything
  // SITS, so nothing shifts when a layer arrives late.
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = contentTop + TITLE.fontSize;
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  const sourceBaseline = sourceBottom - (sourceLines.length - 1) * SOURCE.lead;

  const subjectValue = data.find((d) => d.year === subjectYear)!.cases;
  const subjectLabel = `${subjectYear} · ${en(subjectValue)}`;
  // The vertical footprint of the subject's two-line label, reserved out of the plotted range so
  // the 2024 mark can never climb close enough to the plot's top edge to leave less room than the
  // label needs. Derived from the tokens, so it grows with them.
  const SUBJECT_LABEL_RESERVE =
    SUBJECT_LABEL_RISE + LABEL.fontSize + SUBJECT_NOTE_RISE + NOTE.fontSize;

  // THE Y AXIS CARRIES ONE NUMBER: ZERO. The fitted ceiling had a label and it was removed after
  // looking at the render — `.nice()` puts it at 110 000 while the reference sits at 104 442, so
  // the two labels landed on baselines five pixels apart and read as one run-on line ("110,000
  // cases 2019 level · 104,442"). Worse, its width drove `padding.left`, which spent a third of
  // the frame's width on a number nobody needs: the two magnitudes this beat is about are already
  // printed, on the reference rule and on the subject mark. The unit moved to the reference label
  // with it — see `render.mjs`, where that string is built. The zero baseline stays, drawn and
  // labelled, because it is what makes 150 legible as a collapse rather than as a small number.
  const provisionalTicks = [en(0)];

  const padding = {
    top: titleBaseline + (titleLines.length - 1) * TITLE.lead + TITLE_TO_PLOT,
    right: PAD + PLOT_RIGHT_AIR,
    // Derived from where the credit sits, so the x-axis label band ends above the credit's first
    // line of ink however many lines the credit wraps to.
    bottom:
      height - (sourceBaseline - SOURCE.fontSize - AXIS_TO_SOURCE) + X_LABEL_BAND,
    left:
      PAD + Y_TICK_INSET + Math.max(...provisionalTicks.map((l) => measureText(l, AXIS))),
  };

  const g = measlesGeometry(data, {
    width,
    height,
    padding,
    reference,
    subjectYear,
    floorYear,
    topReserve: SUBJECT_LABEL_RESERVE,
  });
  const baselineLabel = en(g.ticksY[0].value);

  // ── The edit. Every window read off the timing contract — no frame literal below.
  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const conclusion = progressOf(frame, timing.conclusion);

  const axisOpacity = establish;

  // The reference draws left to right across the plot, then its label fades in over the second
  // half of the same window — the level exists before it is named, and both exist before any data.
  const referenceX2 = interpolate(
    referenceProgress,
    [0, 1],
    [g.plot.left, g.plot.right],
    { easing: Easing.out(Easing.cubic) },
  );
  const referenceLabelOpacity = interpolate(referenceProgress, [0.55, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // The WHOLE series, 2011 → 2024, at a constant pace.
  const drawn = drawnSoFar(g.points, reveal);
  const path =
    drawn.length > 1
      ? line<{ x: number; y: number }>()
          .x((p) => p.x)
          .y((p) => p.y)
          .digits(1)(drawn)!
      : null;

  // The floor: context, arriving when the line reaches it during the reveal. Muted, marked, and
  // SILENT about its own value — the title already states 150 in 2021, and a number printed twice
  // is `anti-patterns.md`'s repeated value.
  const floorFraction = g.points.indexOf(g.floor) / (g.points.length - 1);
  const floorOpacity = interpolate(reveal, [floorFraction, floorFraction + 0.06], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // The subject: 2024, landing as its own event once the whole curve is on screen. Critically
  // damped — a spring that overshot would show, for a few frames, a value the data does not hold.
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const subjectRadius = interpolate(subjectSpring, [0, 1], [0, SUBJECT_RADIUS]);

  // The conclusion states two things in sequence: the value the subject landed on, and then how
  // far past the reference it is. The second is in WORDS because it is 1 795 on a 110 000 axis —
  // roughly seven pixels — and no honest geometry at this size can show it.
  const valueOpacity = interpolate(conclusion, [0, 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const excessOpacity = interpolate(conclusion, [0.45, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // The subject's labels hang to the LEFT of the mark, because the mark is the last reading and
  // sits on the plot's right edge; centred or right-anchored they would leave the frame. Derived
  // from where the subject actually is, not from a typed offset.
  const subjectOnRight = g.subject.x > (g.plot.left + g.plot.right) / 2;
  const labelX = subjectOnRight
    ? g.subject.x - SUBJECT_RADIUS - SUBJECT_LABEL_GUTTER
    : g.subject.x + SUBJECT_RADIUS + SUBJECT_LABEL_GUTTER;
  const labelAnchor = subjectOnRight ? "end" : "start";
  const valueBaseline = g.subject.y - SUBJECT_LABEL_RISE;
  const excessBaseline = valueBaseline - LABEL.fontSize - SUBJECT_NOTE_RISE;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fontFamily={FONT_FAMILY}
    >
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {/* Title and source are UNGATED. Frame 0 is the poster frame — the one image a reader sees
          before pressing play, and the frame a feed pulls as the thumbnail. Inside the `establish`
          fade its progress at frame 0 is exactly 0, and the poster would be a blank rectangle. The
          axis furniture below keeps its fade: it has nothing to say before the line exists. */}
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

      <g opacity={axisOpacity}>
        <g>
          <line
            x1={g.plot.left}
            x2={g.plot.right}
            y1={g.ticksY[0].y}
            y2={g.ticksY[0].y}
            stroke={grid}
            strokeWidth={GRID_STROKE}
          />
          <text
            x={g.plot.left - Y_TICK_INSET}
            y={g.ticksY[0].y + Y_TICK_BASELINE_NUDGE}
            fill={muted}
            fontSize={AXIS.fontSize}
            textAnchor="end"
          >
            {baselineLabel}
          </text>
        </g>
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

      {/* The reference: a dashed rule, because the 2019 level is what the argument is read
          against, not a measurement drawn from the series' own extremes. It carries its own number
          — the y axis prints only the two bounds, so this is the number's one home. */}
      {referenceProgress > 0 ? (
        <g>
          <line
            x1={g.plot.left}
            x2={referenceX2}
            y1={g.referenceY}
            y2={g.referenceY}
            stroke={muted}
            strokeWidth={REFERENCE_STROKE}
            strokeDasharray={REFERENCE_DASH}
          />
          <text
            x={g.plot.left}
            y={g.referenceY - REFERENCE_LABEL_RISE}
            fill={muted}
            fontSize={NOTE.fontSize}
            textAnchor="start"
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
          strokeWidth={LINE_STROKE}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}

      {/* The pandemic floor: muted, marked, unlabelled. The title already carries its number. */}
      {floorOpacity > 0 ? (
        <circle
          cx={g.floor.x}
          cy={g.floor.y}
          r={FLOOR_RADIUS}
          fill={muted}
          opacity={floorOpacity}
        />
      ) : null}

      {subjectRadius > 0 ? (
        <circle cx={g.subject.x} cy={g.subject.y} r={subjectRadius} fill={accent} />
      ) : null}

      <text
        x={labelX}
        y={valueBaseline}
        fill={accent}
        fontSize={LABEL.fontSize}
        fontWeight={LABEL.fontWeight}
        textAnchor={labelAnchor}
        opacity={valueOpacity}
      >
        {subjectLabel}
      </text>
      <text
        x={labelX}
        y={excessBaseline}
        fill={muted}
        fontSize={NOTE.fontSize}
        textAnchor={labelAnchor}
        opacity={excessOpacity}
      >
        {excessLabel}
      </text>
    </svg>
  );
}
