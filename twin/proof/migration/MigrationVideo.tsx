/**
 * The video beat of "Twice since 1991, more people left Switzerland than arrived." — 8 seconds,
 * 30fps, 1080 × 1080.
 *
 * Third beat written in this shape. Its own pure geometry below (no `crossingGeometry` import —
 * same reasoning as `LifeExpectancyVideo.tsx`), its own timing contract
 * (`migration-timing.ts`), reusing `FONT_FAMILY`, `measureText`, `wrap` and `drawnSoFar` from
 * `EmissionsVideo.tsx`.
 *
 * THE MOTION PROBLEM: the subject — 1996 and 1997, at −5.8 and −6.8 thousand — is real but tiny
 * against a series that swings up to +139.1. `anti-patterns.md` is explicit that a line's honest scale is
 * "fitted to the readings with every tick labelled," never rescaled to flatter a moment the axis
 * would otherwise make small — so the fix here is not a bigger axis for those two years, which
 * would be the exact anti-pattern ("the axis contradicts its own claim") applied to make a point
 * legible. The two years stay exactly where the fitted, zero-crossing scale puts them — a few
 * pixels under the rule — and legibility comes from three things layered on top, never from
 * moving the mark: (1) the exact area between the line and zero, shaded, computed by linearly
 * interpolating the true zero-crossings on either side of 1996–1997 rather than guessed; (2) both
 * years landing together, as one subject with two points, once the whole 1991–2024 line is
 * already on screen; (3) a callout with a leader line, because a same-size in-place label would be
 * wider than the two years are apart on the time axis.
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
import {
  progressOf,
  type BeatTiming,
} from "#shared/twin-chart-video/timing.ts";
import {
  frameInsetFor,
  sizeFor,
  stageFor,
} from "#shared/twin-chart-video/sizes.mjs";
import { MIGRATION_TIMING } from "./timing-contract";

// Video-canvas helpers duplicated from EmissionsVideo.tsx — not shared because they are
// browser-Canvas-based (document.createElement("canvas")), not the static-render resvg substrate.
// These functions are identical to EmissionsVideo's versions; both are always kept in sync.

const FONT_FAMILY = "Helvetica, Arial, sans-serif";

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

function drawnSoFar<T extends { x: number; y: number }>(
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
 * THE TUNING THIS BEAT WAS DRAWN AT, REBASED, WITH THE SIZE AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more: the frame is Remotion's own (`useVideoConfig`), which comes
 * from the `<Composition>` this beat is rendered through, and `size` names the row that composition
 * was registered from. Before this the frame was two literals here and the same two again in
 * `Root.tsx`, and nothing downstream of gate 2c read what the journalist chose.
 *
 * THE NUMBERS BELOW ARE THE OLD ONES DIVIDED BY THE SQUARE ROW'S SCALE, AND THAT IS THE DEFECT THIS
 * FILE WAS CARRYING. The shipped tokens were 40 / 26 / 22 on a 1080x1080 frame. A square video is
 * watched full-bleed on a phone — 360 dp — so one frame pixel is one third of a CSS pixel and a
 * 22 px axis label is **7.3 CSS px**, against the 11–12 px floor three independent sources converge
 * on (`sizes.mjs`; `proof/portrait-aspect-probe/MOBILE-FIRST-WIREFRAME.md` §1.1). The base is set
 * from the SMALLEST token — 22 -> 12 — and every other token keeps its ratio to it.
 *
 * EVERY SPACING NUMBER GOES THROUGH `sp`: the gaps, the tick drops, the callout's own offsets, the
 * mark radii, the stroke widths and the dash pattern.
 *
 * `PAD` is the one that does NOT go through it — a frame's margin is proportional to the CANVAS,
 * not to the type (`frameInsetFor` states the split).
 */
const BASE = {
  TITLE: { fontSize: 22, fontWeight: 700, lead: 28 },
  SOURCE: { fontSize: 12, fontWeight: 400, lead: 17 },
  AXIS: { fontSize: 12, fontWeight: 400 },
  LABEL: { fontSize: 14, fontWeight: 600 },
  NOTE: { fontSize: 12, fontWeight: 400 },
  TITLE_TO_PLOT: 20,
  PLOT_RIGHT_AIR: 5,
  X_LABEL_BAND: 30,
  AXIS_TO_SOURCE: 3,
  Y_TICK_INSET: 5,
  Y_TICK_BASELINE_NUDGE: 2,
  X_TICK_DROP: 13,
  REFERENCE_LABEL_RISE: 5,
  /** How far the callout block sits to the right of, and below, the pair it names. */
  CALLOUT_OUT: 30,
  CALLOUT_EDGE_AIR: 7,
  CALLOUT_DROP: 25,
  CALLOUT_LEADER_GAP: 11,
  CALLOUT_LEAD: 10,
  DOT_RADIUS: 2.3,
  GRID_STROKE: 0.5,
  REFERENCE_STROKE: 0.67,
  LINE_STROKE: 1.33,
  LEADER_STROKE: 0.5,
  REFERENCE_DASH: [2.7, 2],
};
const UNIT = "k";

function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
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
    TITLE_TO_PLOT: sp(BASE.TITLE_TO_PLOT),
    PLOT_RIGHT_AIR: sp(BASE.PLOT_RIGHT_AIR),
    X_LABEL_BAND: sp(BASE.X_LABEL_BAND),
    AXIS_TO_SOURCE: sp(BASE.AXIS_TO_SOURCE),
    Y_TICK_INSET: sp(BASE.Y_TICK_INSET),
    Y_TICK_BASELINE_NUDGE: sp(BASE.Y_TICK_BASELINE_NUDGE),
    X_TICK_DROP: sp(BASE.X_TICK_DROP),
    REFERENCE_LABEL_RISE: sp(BASE.REFERENCE_LABEL_RISE),
    CALLOUT_OUT: sp(BASE.CALLOUT_OUT),
    CALLOUT_EDGE_AIR: sp(BASE.CALLOUT_EDGE_AIR),
    CALLOUT_DROP: sp(BASE.CALLOUT_DROP),
    CALLOUT_LEADER_GAP: sp(BASE.CALLOUT_LEADER_GAP),
    CALLOUT_LEAD: sp(BASE.CALLOUT_LEAD),
    DOT_RADIUS: BASE.DOT_RADIUS * typeScale,
    GRID_STROKE: BASE.GRID_STROKE * typeScale,
    REFERENCE_STROKE: BASE.REFERENCE_STROKE * typeScale,
    LINE_STROKE: BASE.LINE_STROKE * typeScale,
    LEADER_STROKE: BASE.LEADER_STROKE * typeScale,
    REFERENCE_DASH: BASE.REFERENCE_DASH.map((v) => (v * typeScale).toFixed(1)).join(" "),
  };
}

export type Reading = { year: number; value: number };

/** English, signed: a true minus sign (not a hyphen) — every value here is under 100. */
export function en(value: number, decimals = 1): string {
  const sign = value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(decimals)}`;
}

type Point = Reading & { x: number; y: number };

/**
 * Where a segment between two readings crosses a reference value, in the readings' own
 * coordinates — linear interpolation, exact, not eyeballed. Used to shade precisely the area that
 * sits below zero, instead of a box drawn to "about" where the dip is.
 */
function crossingX(
  a: Point,
  b: Point,
  referenceValue: number,
  a0: number,
  b0: number,
): number {
  const t = (referenceValue - a0) / (b0 - a0);
  return a.x + t * (b.x - a.x);
}

/**
 * Data to coordinates. Pure — no colour, no font, no React — same discipline as beat 1's
 * `crossingGeometry` and beat 2's `lifeExpectancyGeometry`, its own module because this beat's
 * subject is two points, not one, and needs the two real zero-crossings either side of them.
 */
export function migrationGeometry(
  data: Reading[],
  {
    width,
    height,
    padding,
    reference,
    subjectYears,
    bottomReserve = 0,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    reference: number;
    subjectYears: number[];
    /** Pixels of the plot's own bottom edge the DATA CURVE never draws into — reserved for the
     *  callout block that names the two sub-zero years. The mirror of the sibling beat's
     *  `topReserve` (`../life-expectancy/LifeExpectancyVideo.tsx`) and it exists for the same
     *  reason, at the other end of the frame: this beat's subject is the two years the balance
     *  goes NEGATIVE, so the pair sits within 8% of the plot's height of the domain floor, and
     *  "put the callout under the pair" had nowhere to put it. Without the reserve the block was
     *  drawn over the x-axis labels and the credit at the phone's type floor, and over the rising
     *  curve when it was moved above the pair instead. Reserved out of the plotted range, so the
     *  strip is empty by construction whatever the data does. */
    bottomReserve?: number;
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
  const y = yDomain.range([plot.bottom - bottomReserve, plot.top]);

  const points: Point[] = data.map((d) => ({
    ...d,
    x: x(d.year),
    y: y(d.value),
  }));
  const subjects = subjectYears.map((year) => {
    const p = points.find((r) => r.year === year);
    if (!p) throw new Error(`no reading for subject year ${year}`);
    return p;
  });
  const firstSubjectIndex = points.indexOf(subjects[0]);
  const lastSubjectIndex = points.indexOf(subjects[subjects.length - 1]);
  const before = points[firstSubjectIndex - 1];
  const after = points[lastSubjectIndex + 1];
  if (!before || !after)
    throw new Error(
      "subject years must have a reading on both sides, to compute real zero-crossings",
    );

  const dipStartX = crossingX(
    before,
    subjects[0],
    reference,
    before.value,
    subjects[0].value,
  );
  const dipEndX = crossingX(
    subjects[subjects.length - 1],
    after,
    reference,
    subjects[subjects.length - 1].value,
    after.value,
  );

  return {
    plot,
    points,
    subjects,
    dipStartX,
    dipEndX,
    referenceY: y(reference),
    ticksY: ticksY.map((value) => ({ value, y: y(value) })),
    ticksX: [first, years[Math.floor(years.length / 2)], last].map((year) => ({
      year,
      x: x(year),
    })),
  };
}

export type MigrationVideoProps = {
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
  subjectYears: number[];
  timing?: BeatTiming;
  /** The size row this beat's composition was registered from — `Root.tsx` passes it, one
   *  composition per row. Not a default. */
  size: string;
};

export function MigrationVideo({
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
  subjectYears,
  timing = MIGRATION_TIMING,
  size,
}: MigrationVideoProps) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  // THE TWO STATEMENTS OF THE FRAME, CHECKED AGAINST EACH OTHER. Remotion's is what will actually
  // be encoded; the row is what gate 2c pinned. They come from different places — the
  // `<Composition>` registration and `sizes.mjs` — so this is the one reading the code that drew
  // the frame cannot make agree with itself.
  const row = sizeFor(size);
  if (row.width !== width || row.height !== height)
    throw new Error(
      `this composition renders at ${width}x${height}, but the size it names — ` +
        `${JSON.stringify(size)} — is ${row.width}x${row.height}. Root.tsx registers one ` +
        `composition per row and passes that row's name; the two have come apart.`,
    );
  const { typeScale } = row;
  // The band this beat may draw in. At portrait the platform reserves 14% at the top and 35% at the
  // foot; content there is at RISK OF BEING COVERED, which no frame counter can see.
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
    CALLOUT_OUT,
    CALLOUT_EDGE_AIR,
    CALLOUT_DROP,
    CALLOUT_LEADER_GAP,
    CALLOUT_LEAD,
    DOT_RADIUS,
    GRID_STROKE,
    REFERENCE_STROKE,
    LINE_STROKE,
    LEADER_STROKE,
    REFERENCE_DASH,
  } = tokens(typeScale);
  const contentTop = stage.reserved ? stage.top : PAD;
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;

  // ── Layout. Identical at every frame: the build changes what is visible, never where it sits.
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = contentTop + TITLE.fontSize;
  // THE SOURCE SITS ON THE BOTTOM OF THE BAND, not under the title — the same edge the title hangs
  // off at the top, on the same x. It stays inside the furniture opacity group, so no timing
  // contract moves. See twin-chart-beat/references/static-discipline.md, "The source on the frame's
  // bottom margin". It WRAPS now: one line at 22px is three at 36px.
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  const sourceBaseline = sourceBottom - (sourceLines.length - 1) * SOURCE.lead;

  const tickLabelsFor = (values: number[]) =>
    values.map((v, i, all) =>
      i === all.length - 1 ? `${en(v, 0)}${UNIT}` : en(v, 0),
    );
  const provisionalTicks = tickLabelsFor(
    (() => {
      const g = migrationGeometry(data, {
        width,
        height,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        reference,
        subjectYears,
      });
      return g.ticksY.map((t) => t.value);
    })(),
  );
  const calloutLines = subjectYears.map(
    (year) =>
      `${year} · ${en(data.find((d) => d.year === year)!.value)}${UNIT}`,
  );
  const padding = {
    // The plot starts below the LAST TITLE LINE, never below the source.
    top: titleBaseline + (titleLines.length - 1) * TITLE.lead + TITLE_TO_PLOT,
    // The last x-tick label is centred on the plot's right edge, so half of it hangs outside —
    // reserve that half, measured, plus air. It used to reserve the WHOLE label.
    right:
      PAD +
      PLOT_RIGHT_AIR +
      measureText(`${data[data.length - 1].year}`, AXIS) / 2,
    // Derived from where the credit now sits, not from a constant, so the x-axis label band ends
    // above the credit's first line of ink however many lines the credit wraps to.
    bottom:
      height -
      (sourceBaseline - SOURCE.fontSize - AXIS_TO_SOURCE) +
      X_LABEL_BAND,
    left:
      PAD +
      Y_TICK_INSET +
      Math.max(...provisionalTicks.map((l) => measureText(l, AXIS))),
  };

  // The strip the curve may not enter, sized from the block that will stand in it — two lines of
  // the callout's own type plus the drop below the pair.
  const calloutBlockHeight =
    calloutLines.length * LABEL.fontSize +
    (calloutLines.length - 1) * CALLOUT_LEAD;
  const g = migrationGeometry(data, {
    width,
    height,
    padding,
    reference,
    subjectYears,
    bottomReserve: calloutBlockHeight + CALLOUT_DROP,
  });
  const tickLabels = tickLabelsFor(g.ticksY.map((t) => t.value));

  // ── The edit. Six windows, all read off the timing contract — no frame literal below.
  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const subject = progressOf(frame, timing.subject);
  const conclusion = progressOf(frame, timing.conclusion);

  // Renamed from `furnitureOpacity`: it no longer governs the title and source (see the ungated
  // group below), only the axis ticks and gridlines. The old name outlived what it described.
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
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // The whole line, 1991 → 2024, chronological, constant pace — the dip is drawn in its own place,
  // like every other year, with no pause and no detour: nothing marks it yet.
  const drawn = drawnSoFar(g.points, reveal);
  const path =
    drawn.length > 1
      ? line<{ x: number; y: number }>()
          .x((p) => p.x)
          .y((p) => p.y)
          .digits(1)(drawn)!
      : null;

  // The subject: both years land together, once the whole curve is already visible. The shaded
  // band is the true area between the line and zero — its two edges are the real interpolated
  // crossings, not a box guessed around the dots.
  const bandOpacity = interpolate(subject, [0, 0.5], [0, 0.28], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dotSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const dotRadius = interpolate(dotSpring, [0, 1], [0, DOT_RADIUS]);

  const bandPath = `M ${g.dipStartX} ${g.referenceY} L ${g.subjects
    .map((p) => `${p.x} ${p.y}`)
    .join(" L ")} L ${g.dipEndX} ${g.referenceY} Z`;

  // The conclusion: a callout with a leader line, because an in-place label at reading size would
  // be wider than the two years are apart. It states the two values once the marks they belong to
  // are on screen — the assertion, not a repeat of the title's own sentence.
  const calloutOpacity = interpolate(conclusion, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const midX = (g.subjects[0].x + g.subjects[g.subjects.length - 1].x) / 2;
  const midY = (g.subjects[0].y + g.subjects[g.subjects.length - 1].y) / 2;
  // THE CALLOUT BLOCK IS KEPT INSIDE THE FRAME BY ITS OWN MEASURED WIDTH, not by a literal inset.
  // `g.plot.right - 20` reserved twenty pixels for a centred two-line block that is ~200px wide at
  // the shipped type and ~280px at the phone's floor, so its right half hung outside the frame.
  const calloutHalf =
    Math.max(...calloutLines.map((l) => measureText(l, LABEL))) / 2;
  const calloutX = Math.min(
    Math.max(midX + CALLOUT_OUT, PAD + calloutHalf),
    width - PAD - calloutHalf,
  );
  // The callout hangs below the lowest of the two named points, in the strip the geometry reserves
  // for it (`bottomReserve`) — so it is inside the plot, under the pair it names, and standing on
  // ground the curve is not allowed to enter.
  const lowestSubject = Math.max(...g.subjects.map((p) => p.y));
  const calloutY = lowestSubject + CALLOUT_DROP + LABEL.fontSize;

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
          before pressing play, and the frame a CMS or a social platform pulls as the thumbnail.
          These used to sit inside the `establish` fade, whose progress at frame 0 is exactly 0, so
          the poster was a blank white rectangle: measured at 0.0000% non-ground pixels, and the
          beat said nothing in the only frame most people ever see. The axis furniture below keeps
          its fade — it is the frame the line will be measured in and has nothing to say before the
          line exists. */}
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
        {g.ticksY.map((tick, i) => (
          <g key={tick.value}>
            {i === 1 ? null : (
              <line
                x1={g.plot.left}
                x2={g.plot.right}
                y1={tick.y}
                y2={tick.y}
                stroke={grid}
                strokeWidth={GRID_STROKE}
              />
            )}
            <text
              x={g.plot.left - Y_TICK_INSET}
              y={tick.y + Y_TICK_BASELINE_NUDGE}
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

      {/* The reference: zero, drawn as its own rule — "a series that crosses zero always draws the
          zero line, because the sign change is the story" (`anti-patterns.md`). */}
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
            x={(g.plot.left + g.plot.right) / 2}
            y={g.referenceY - REFERENCE_LABEL_RISE}
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
          strokeWidth={LINE_STROKE}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}

      {/* The exact sub-zero area — the true crossings, not a box around the dots. */}
      {bandOpacity > 0 ? (
        <path d={bandPath} fill={accent} opacity={bandOpacity} />
      ) : null}

      {dotRadius > 0
        ? g.subjects.map((p) => (
            <circle
              key={p.year}
              cx={p.x}
              cy={p.y}
              r={dotRadius}
              fill={accent}
            />
          ))
        : null}

      {/* The callout: a leader line to the two landed points, then the two values. */}
      <g opacity={calloutOpacity}>
        <line
          x1={midX}
          x2={calloutX}
          y1={midY}
          y2={calloutY - LABEL.fontSize - CALLOUT_LEADER_GAP}
          stroke={muted}
          strokeWidth={LEADER_STROKE}
        />
        {calloutLines.map((textLine, i) => (
          <text
            key={textLine}
            x={calloutX}
            y={calloutY + i * (LABEL.fontSize + CALLOUT_LEAD)}
            fill={accent}
            fontSize={LABEL.fontSize}
            fontWeight={LABEL.fontWeight}
            textAnchor="middle"
          >
            {textLine}
          </text>
        ))}
      </g>
    </svg>
  );
}
