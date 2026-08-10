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
import {
  assertTypeFloor,
  frameInsetFor,
  sizeFor,
} from "#shared/twin-chart-video/sizes.mjs";
import { formForSize } from "#shared/twin-chart-beat/type-at-size.mjs";
import { SCATTER_TIMING } from "./timing-contract";

/** The chart type this beat draws, in `references/types/` vocabulary. Read by `formForSize`. */
const TYPE = "scatter";

/**
 * THE 900x560-CONVENTION BASE, WITH THE ROW'S `typeScale` AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more. It said `1080 x 1080` here while `Root.tsx` said
 * `width={1080} height={1080}` two files away, with nothing between them, so `size: portrait` on
 * the slot produced a square in silence (`specs/W4-export-sizes.md` §1a).
 *
 * Every spacing number goes through `sp`, not only the fonts. And two font sizes were not tokens at
 * all — `fontSize={20}` at the reference label and `fontSize={24}` at the conclusion, written bare
 * at the mark, which is the static seed's GAP_NOTE defect exactly.
 *
 * The base numbers are the old 1080-square values re-expressed at the convention the table's
 * `typeScale` is written against — smallest token 12, so the row's multiplier lands the smallest
 * drawn type exactly on that row's legibility floor. The old values did not clear it: the axis was
 * 20px on a 1080 frame, 6.7 CSS px on the phone a square post is read on.
 */
const BASE = {
  TITLE: { fontSize: 23, fontWeight: 700, lead: 29 },
  SOURCE: { fontSize: 13, fontWeight: 400, lead: 16 },
  AXIS: { fontSize: 12, fontWeight: 400 },
  AXIS_TITLE: { fontSize: 13, fontWeight: 600 },
  LABEL: { fontSize: 15, fontWeight: 700 },
  NOTE: { fontSize: 12, fontWeight: 400 },
  CONCLUSION: { fontSize: 14, fontWeight: 700 },
  CONCLUSION_RESERVE: 24,
  TITLE_TO_CONCLUSION: 22,
  PLOT_RIGHT_AIR: 6,
  X_LABEL_BAND: 34,
  SOURCE_AIR: 6,
  Y_GUTTER_AIR: 16,
  Y_TICK_INSET: 8,
  TICK_BASELINE_NUDGE: 4,
  X_TICK_DROP: 19,
  X_AXIS_TITLE_DROP: 35,
  REFERENCE_LABEL_INSET: 7,
  REFERENCE_LABEL_LIFT: 7,
  DOT_R: 4,
  SUBJECT_DOT_R: 5,
  SUBJECT_RING_R: 10,
  SUBJECT_LABEL_LIFT: 16,
  DASH_REFERENCE: [4, 3],
};

/** Strokes scale but are NOT rounded: a hairline that rounds up stops being a hairline. */
const BASE_STROKE = { grid: 0.6, reference: 0.8, ring: 1.0 };

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
    AXIS_TITLE: f(BASE.AXIS_TITLE) as typeof BASE.AXIS_TITLE,
    LABEL: f(BASE.LABEL) as typeof BASE.LABEL,
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    CONCLUSION: f(BASE.CONCLUSION) as typeof BASE.CONCLUSION,
    CONCLUSION_RESERVE: sp(BASE.CONCLUSION_RESERVE),
    TITLE_TO_CONCLUSION: sp(BASE.TITLE_TO_CONCLUSION),
    PLOT_RIGHT_AIR: sp(BASE.PLOT_RIGHT_AIR),
    X_LABEL_BAND: sp(BASE.X_LABEL_BAND),
    SOURCE_AIR: sp(BASE.SOURCE_AIR),
    Y_GUTTER_AIR: sp(BASE.Y_GUTTER_AIR),
    Y_TICK_INSET: sp(BASE.Y_TICK_INSET),
    TICK_BASELINE_NUDGE: sp(BASE.TICK_BASELINE_NUDGE),
    X_TICK_DROP: sp(BASE.X_TICK_DROP),
    X_AXIS_TITLE_DROP: sp(BASE.X_AXIS_TITLE_DROP),
    REFERENCE_LABEL_INSET: sp(BASE.REFERENCE_LABEL_INSET),
    REFERENCE_LABEL_LIFT: sp(BASE.REFERENCE_LABEL_LIFT),
    DOT_R: sp(BASE.DOT_R),
    SUBJECT_DOT_R: sp(BASE.SUBJECT_DOT_R),
    SUBJECT_RING_R: sp(BASE.SUBJECT_RING_R),
    SUBJECT_LABEL_LIFT: sp(BASE.SUBJECT_LABEL_LIFT),
    DASH_REFERENCE: BASE.DASH_REFERENCE.map(sp).join(" "),
    STROKE: {
      grid: st(BASE_STROKE.grid),
      reference: st(BASE_STROKE.reference),
      ring: st(BASE_STROKE.ring),
    },
  };
}

/**
 * Every `fontSize` the returned element tree actually carries, INCLUDING one written bare at a mark
 * — which this beat had two of. The still path reads the rendered SVG's `font-size` attributes; a
 * video composition's markup only exists inside the browser Remotion drives, so the equivalent
 * reading is the element tree, walked rather than listed.
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
  /** The export size gate 2c pinned, recorded in this beat's own `BRIEF.md` front matter. */
  size: string;
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
  size,
  timing = SCATTER_TIMING,
}: ScatterVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // The frame is the TABLE's, at the size the journalist pinned — never a constant in this file.
  const { width, height, typeScale } = sizeFor(size);
  const PAD = frameInsetFor(size);
  const T = tokens(typeScale);
  const { TITLE, SOURCE, AXIS, AXIS_TITLE, LABEL } = T;

  // WHETHER THIS TYPE MAY ENTER THIS SIZE AT ALL — before anything is measured.
  //
  // A scatter has a NAMED refusal in `type-at-size.mjs`, not merely an unmeasured one: rotating it
  // violates conventions of reading direction (Horak et al. §2.4.2), so it has no twin form; and
  // what a phone frame runs out of budget on here is DENSITY, not aspect — twenty labelled points
  // in a cloud. Neither has been measured. The composition still exists at all three sizes, and the
  // two this type cannot draw refuse here, loudly, rather than returning a cloud squeezed into a
  // column with nothing clipped and nothing colliding.
  const form = formForSize(TYPE, size);
  if (form.verdict !== "as-is")
    throw new Error(
      `vidx-scatter-income-life-expectancy: ${TYPE} cannot be drawn at ${size}. ${form.reason}\n` +
        `It ships at landscape.`,
    );

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN, not under the title — the LAST line lands on
  // `height - PAD`, the same inset the title hangs off at the top, on the same x. It stays inside
  // the furniture opacity group, so no timing contract moves. See
  // twin-chart-beat/references/static-discipline.md, "The source on the frame's bottom margin".
  const sourceBaseline = height - PAD - (sourceLines.length - 1) * SOURCE.lead;

  // CONCLUSION_RESERVE: the conclusion's own banner row, reserved from frame 0 — same fix the
  // grouped-bar and stacked-bar beats needed: a crowded cloud leaves no guaranteed clear space
  // beside the subject's own point for a two-fact sentence.
  const CONCLUSION_RESERVE = T.CONCLUSION_RESERVE;
  // The conclusion banner keeps the air it always had above it, measured from the LAST TITLE
  // line rather than from the source, which is no longer in the header.
  const conclusionBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + T.TITLE_TO_CONCLUSION;

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
    right: PAD + T.PLOT_RIGHT_AIR,
    // Grown by the credit block's own height plus clear air.
    bottom:
      PAD +
      T.X_LABEL_BAND +
      (sourceLines.length - 1) * SOURCE.lead +
      SOURCE.fontSize +
      T.SOURCE_AIR,
    left: PAD + T.Y_GUTTER_AIR + yTickWidth,
  };

  // The rotated y-axis title's own baseline, one em from the frame's left edge rather than a
  // literal inset from PAD. It was `PAD - 44`, which cleared a 21px title on a 72px margin by 12px
  // and CLIPPED a 33px title on an 85px margin — measured on the render, the cap heights ran off
  // the left edge. A rotated run's ink reaches its cap height to the left of its baseline, so the
  // baseline has to be at least that far in, and the type size is the only thing that knows it.
  const yAxisTitleX = T.AXIS_TITLE.fontSize;
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
  const subjectRingRadius = interpolate(
    subjectSpring,
    [0, 1],
    [0, T.SUBJECT_RING_R],
  );
  const conclusionOpacity = interpolate(conclusion, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  const conclusionLabel = `${subjectCountry}: ${fmtYears(subject.lifeExpectancy)} years — the lowest of the twenty, despite the 5th-highest income`;

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
              strokeWidth={T.STROKE.grid}
            />
            <text
              x={g.plot.left - T.Y_TICK_INSET}
              y={g.yScale(tick) + T.TICK_BASELINE_NUDGE}
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
            y={g.plot.bottom + T.X_TICK_DROP}
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
          y={g.plot.bottom + T.X_AXIS_TITLE_DROP}
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
          transform={`translate(${yAxisTitleX}, ${(g.plot.top + g.plot.bottom) / 2}) rotate(-90)`}
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
            strokeWidth={T.STROKE.reference}
            strokeDasharray={T.DASH_REFERENCE}
          />
          <text
            x={g.plot.left + T.REFERENCE_LABEL_INSET}
            y={g.referenceY - T.REFERENCE_LABEL_LIFT}
            fill={muted}
            fontSize={T.NOTE.fontSize}
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
          [0, isSubject ? T.SUBJECT_DOT_R : T.DOT_R],
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
          strokeWidth={T.STROKE.ring}
          opacity={subjectSpring}
        />
      ) : null}
      <text
        x={subject.x}
        y={subject.y - T.SUBJECT_LABEL_LIFT}
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
        fontSize={T.CONCLUSION.fontSize}
        fontWeight={T.CONCLUSION.fontWeight}
        textAnchor="start"
        opacity={conclusionOpacity}
      >
        {conclusionLabel}
      </text>
    </svg>
  );

  // EVERY TYPE SIZE THIS FRAME ACTUALLY DRAWS, against the row's own floor — read off the element
  // tree rather than a list of tokens, so a size written bare at a mark cannot escape it. This beat
  // had two.
  assertTypeFloor(
    fontSizesIn(drawing)
      .map((px) => `font-size="${px}"`)
      .join(" "),
    size,
    { what: `vidx-scatter-income-life-expectancy at ${size}` },
  );

  return drawing;
}
