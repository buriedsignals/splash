/**
 * The video beat of "Switzerland's share of renewable electricity trails Norway's by more than 31
 * points." — 10 seconds, 30fps, 1080 × 1080.
 *
 * First lollipop written in this shape. Fourteen rows, each with exactly ONE value (share of
 * electricity from renewables, %) measured against a shared zero baseline — not a time series, not
 * the dumbbell's two-points-per-row gap, so this file's geometry (`lollipopGeometry` below) is a
 * fresh shape, not a copy of `dumbbellGeometry` or any prior beat's geometry. `FONT_FAMILY`,
 * `measureText`, `wrap` and `en` ARE this story's own copies of the other proof workspaces'
 * functions of the same name — not an import from any of them, per the duplicate-do-not-link rule
 * (`../video-population-growth-dumbbell/DumbbellVideo.tsx`'s file doc-comment explains why: this
 * story lives outside `twin-chart-video`'s skill boundary, and the settled rule for a workspace that
 * needs something a skill has is to duplicate it, not reach back across the boundary). `drawnSoFar`
 * is NOT copied here — nothing in this beat traces a continuously-drawing path; every stem grows
 * toward a fixed final coordinate along one straight line, so there is no partial-path head to
 * compute — a simpler `interpolate` of its own tip position does the whole job.
 *
 * THE MOTION PROBLEM (from `BRIEF.md`): every row's stem grows from the SAME shared zero baseline
 * to its own value. The reveal establishes that baseline first — the value axis's own zero line —
 * leaves it to be read, then brings in each row's stem-and-dot in rank order, largest share first,
 * each stem GROWING from zero to its value (not merely fading in at final length), so the reader
 * watches both the ranking assemble and each row's own magnitude arrive as one motion event.
 * Switzerland, the subject, gets the emphasis treatment once every row — including its own — has
 * already landed, never before — `checkTiming`'s ordering rule makes that structurally true, since
 * `subject` cannot start until `reveal` (all fourteen rows) has fully finished.
 *
 * COLOUR: the lollipop type doctrine (`twin-chart-beat/references/types/lollipop.md`) allows exactly
 * ONE accent stem-and-dot, for the subject row, with every other row neutral. Unlike the dumbbell
 * (whose two hues were already spent encoding "2000 vs 2023" before Switzerland's own emphasis could
 * use a colour), this beat has no second series to encode — so EVERY row, including Switzerland's,
 * draws in `muted` during `reveal`, undifferentiated. Accent is reserved entirely for the `subject`
 * event: Switzerland's stem and dot cross-dissolve from `muted` to `accent` only once its own row has
 * already landed (a second, accent-coloured stem+dot rendered on top with opacity gated on the
 * subject event, over the permanent muted one beneath), alongside a ring pop and its category label
 * crossfading from ink to bold accent — see the `subject` block below.
 *
 * VALUE LABELS: the type doctrine names this type's own previously-shipped WCAG failure by name — a
 * saturated accent hue reads fine as a thin stem/dot but fails 4.5:1 as running text. Every value
 * label here, including Switzerland's, stays in page `ink`, never in `accent`, at every frame.
 */

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
import {
  progressOf,
  type BeatTiming,
} from "#shared/twin-chart-video/timing.ts";
// The VIDEO genre's own size table — its landscape row carries a 30px legibility floor and a 2.5
// type scale where the static skill's carries 26 and 2.2, because a 16:9 video is watched on a
// phone turned sideways (~800 dp) and a static landscape sits in a ~900 px article column.
import {
  assertTypeFloor,
  frameInsetFor,
  sizeFor,
  stageFor,
} from "#shared/twin-chart-video/sizes.mjs";
// Whether this TYPE may enter that size is a fact about the type, not about the craft, so both
// genres read one copy. A lollipop's category axis is NOMINAL, so a tall frame asks for its twin
// FORM — rows running down the frame — which is the form this beat already draws.
import { assertTypeMayEnter } from "#shared/twin-chart-beat/type-at-size.mjs";
import { LOLLIPOP_TIMING } from "./timing-contract";

export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

/** The chart type this beat draws, in `references/types/` vocabulary. Read by `formForSize`. */
export const TYPE = "lollipop";

/**
 * THE 900x560 TUNING, KEPT AS THE BASE, WITH THE SIZE AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more. The frame is `sizeFor(size)`'s, and `size` is the decision
 * gate 2c took, read out of this beat's own `BRIEF.md` by `render.mjs` and carried onto the
 * composition by `Root.tsx`. The shipped values were 1080-frame tuning; they are divided so the
 * SMALLEST token lands at 12 — the number every row's `typeScale` in
 * `twin-chart-video/scripts/sizes.mjs` is derived from (30 / 12 = 2.5 at landscape, 36 / 12 = 3.0
 * at the two phone frames). The ramp flattens as a result: the floor binds the smallest token, and
 * a title that grew by the same factor would take a third of the frame before a mark was drawn.
 *
 * EVERY SPACING NUMBER GOES THROUGH `sp`, not only the fonts. `PAD` is the one exception: a frame's
 * margin is proportional to the CANVAS, not to the type (`frameInsetFor`).
 */
const BASE = {
  TITLE: { fontSize: 25, fontWeight: 700, lead: 32 },
  SOURCE: { fontSize: 13, fontWeight: 400 },
  AXIS_TICK: { fontSize: 12, fontWeight: 500 },
  ROW_LABEL: { fontSize: 15, fontWeight: 500 },
  ROW_LABEL_ACCENT: { fontSize: 15, fontWeight: 700 },
  VALUE_LABEL: { fontSize: 15, fontWeight: 600 },
  DOT_R: 5,
  /** Air under the last title line, before the axis tick row. */
  TITLE_TO_AXIS: 27,
  /** Air under the axis tick row, before the first lollipop row. */
  AXIS_TO_PLOT: 16,
  /** The gutter between a row's dot and its value label, and between the plot and the frame. */
  VALUE_GUTTER: 11,
  /** The gutter between a row's category label and the zero baseline. */
  LABEL_GUTTER: 9,
  /** Air between the last row and the credit's ink. */
  PLOT_TO_SOURCE: 7,
  /** How far the subject's ring stands off its own dot. */
  RING_STANDOFF: 4,
  /** Ink widths. A stroke is proportional to the canvas the way a gap is, so it scales too. */
  GRID_STROKE: 1,
  BASELINE_STROKE: 1.3,
  STEM_STROKE: 2.7,
  RING_STROKE: 2,
};

/**
 * The base, at the size's own multiplier — one integer-rounding helper for every number, so
 * `measureText`'s cache keys stay stable and no half-pixel arrives anywhere.
 */
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
    AXIS_TICK: f(BASE.AXIS_TICK) as typeof BASE.AXIS_TICK,
    ROW_LABEL: f(BASE.ROW_LABEL) as typeof BASE.ROW_LABEL,
    ROW_LABEL_ACCENT: f(BASE.ROW_LABEL_ACCENT) as typeof BASE.ROW_LABEL_ACCENT,
    VALUE_LABEL: f(BASE.VALUE_LABEL) as typeof BASE.VALUE_LABEL,
    DOT_R: sp(BASE.DOT_R),
    TITLE_TO_AXIS: sp(BASE.TITLE_TO_AXIS),
    AXIS_TO_PLOT: sp(BASE.AXIS_TO_PLOT),
    VALUE_GUTTER: sp(BASE.VALUE_GUTTER),
    LABEL_GUTTER: sp(BASE.LABEL_GUTTER),
    PLOT_TO_SOURCE: sp(BASE.PLOT_TO_SOURCE),
    RING_STANDOFF: sp(BASE.RING_STANDOFF),
    GRID_STROKE: Math.max(1, sp(BASE.GRID_STROKE)),
    BASELINE_STROKE: Math.max(1, sp(BASE.BASELINE_STROKE)),
    STEM_STROKE: Math.max(1, sp(BASE.STEM_STROKE)),
    RING_STROKE: Math.max(1, sp(BASE.RING_STROKE)),
  };
}

export type Row = {
  country: string;
  value: number; // share of electricity from renewables, %
};

/**
 * The rendered width of a string in the font it will really be drawn in — this story's own copy
 * of the video genre's browser-Canvas text measurer (see the file doc-comment for why it is
 * duplicated, not imported from a sibling workspace or a skill).
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

/** English, one decimal — every share value here sits between 0 and 100. */
export function en(value: number, decimals = 1): string {
  const sign = value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(decimals)}`;
}

/**
 * Data to coordinates. Pure — no colour, no font, no React. A fresh shape, not a copy of
 * `dumbbellGeometry`: rows are categories on a band-like vertical axis (shared with the dumbbell),
 * but each row supplies exactly ONE value rather than a pair, and the value axis is anchored at
 * zero and padded to it — the zero-baseline rule this type inherits from a bar chart, unlike the
 * dumbbell's un-padded, position-encoded axis.
 */
export function lollipopGeometry(
  rows: Row[],
  {
    width,
    height,
    padding,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const domainMax = Math.max(...rows.map((r) => r.value));
  const x = scaleLinear()
    .domain(extent([0, domainMax]) as [number, number])
    .nice()
    .range([plot.left, plot.right]);

  const rowHeight = (plot.bottom - plot.top) / rows.length;
  const points = rows.map((r, i) => ({
    ...r,
    y: plot.top + rowHeight * (i + 0.5),
    xValue: x(r.value),
  }));

  return {
    plot,
    rowHeight,
    points,
    zeroX: x(0),
    tickValues: x.ticks(4).filter((t) => t !== 0),
  };
}

/**
 * How far through row `i`'s own arrival window the master `reveal` progress is, 0..1.
 *
 * Rows cascade in rank order (row 0 = the largest share = the top of the ranking) with each
 * window overlapping the next slightly, so the build reads as one continuous cascade rather than
 * fourteen discrete steps — the same overlap device `DumbbellVideo.tsx`'s `rowWindow` uses, minus
 * that beat's separate "all left dots together" slice: this type has no shared second point to
 * batch — the zero baseline already IS the shared reference, and it is drawn once, in `reference`,
 * not restated per row.
 */
function rowWindow(i: number, rowCount: number) {
  const span = 1 / rowCount;
  const start = i * span;
  const duration = span * 1.6;
  return { start, end: Math.min(1, start + duration) };
}

export type LollipopVideoProps = {
  data: Row[]; // pre-sorted by value, descending — render.mjs's job, not this component's.
  title: string;
  source: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  subjectCountry: string;
  compareCountry: string;
  /** The size gate 2c pinned, read from this beat's own `BRIEF.md`. Not a default. */
  size: string;
  timing?: BeatTiming;
};

export function LollipopVideo({
  data,
  title,
  source,
  ground,
  accent,
  ink,
  muted,
  grid,
  subjectCountry,
  compareCountry,
  size,
  timing = LOLLIPOP_TIMING,
}: LollipopVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // The frame is the TABLE's, at the size the journalist pinned — never a constant in this file.
  const { width, height, typeScale } = sizeFor(size);
  const stage = stageFor(size);
  const PAD = frameInsetFor(size);
  const T = tokens(typeScale);
  const {
    TITLE,
    SOURCE,
    AXIS_TICK,
    ROW_LABEL,
    ROW_LABEL_ACCENT,
    VALUE_LABEL,
    DOT_R,
  } = T;

  // WHETHER THIS TYPE MAY ENTER THIS SIZE AT ALL, before anything is measured. A lollipop is
  // row-driven already, so the twin form a tall frame asks for is the drawing this file makes —
  // there is no aspect to distort and no clamp applies.
  assertTypeMayEnter(TYPE, size, {
    what: "vidy-lollipop-renewables-share-europe",
  });

  if (data.length < 2)
    throw new Error(`need at least two rows, got ${data.length}`);
  const subjectIndex = data.findIndex((r) => r.country === subjectCountry);
  if (subjectIndex < 0)
    throw new Error(
      `no row for subject country ${JSON.stringify(subjectCountry)}`,
    );
  const compareRow = data.find((r) => r.country === compareCountry);
  if (!compareRow)
    throw new Error(
      `no row for compare country ${JSON.stringify(compareCountry)}`,
    );

  // ── Layout. Identical at every frame: the build changes what is visible, never where it sits,
  // so nothing shifts when a row arrives late.
  const contentTop = stage.reserved ? stage.top : PAD;
  // Named `sourceBottom` rather than something generic because it IS the credit's own anchor, and
  // `credit-anchors-to-the-frame-bottom.test.ts` follows that name through the chain: the credit has
  // to resolve to the frame's own height minus something, never to a header rung. At portrait the
  // bottom it names is the STAGE's — below that band sit the platform's caption and progress bar,
  // and a covered credit is an attribution failure, not a cosmetic one.
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = contentTop + TITLE.fontSize;
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  const sourceLead = Math.round(SOURCE.fontSize * 1.5);
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN, not under the title — the LAST line lands on `height - PAD`, the
  // same inset the title hangs off at the top, on the same x. It stays inside the furniture
  // opacity group, so no timing contract moves. See
  // twin-chart-beat/references/static-discipline.md, "The source on the frame's bottom margin".
  const sourceBaseline = sourceBottom - (sourceLines.length - 1) * sourceLead;
  // The axis label keeps the air it always had above it, measured from the LAST TITLE line rather
  // than from the source, which is no longer in the header.
  const axisLabelBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + T.TITLE_TO_AXIS;

  const valueLabelFor = (r: Row) => `${en(r.value)}%`;
  const subjectRow = data[subjectIndex];
  const gap = compareRow.value - subjectRow.value;
  const conclusionLabelFor = (r: Row) =>
    `${en(r.value)}% · ${en(gap)} pts behind ${compareCountry}`;

  const maxCategoryWidth = Math.max(
    ...data.map((r) =>
      Math.max(
        measureText(r.country, ROW_LABEL),
        measureText(r.country, ROW_LABEL_ACCENT),
      ),
    ),
  );
  const maxRightWidth = Math.max(
    ...data.map((r) => measureText(valueLabelFor(r), VALUE_LABEL)),
    measureText(conclusionLabelFor(subjectRow), VALUE_LABEL),
  );

  const padding = {
    top: axisLabelBaseline + T.AXIS_TO_PLOT,
    right: PAD + T.VALUE_GUTTER + maxRightWidth,
    // Grown by the credit block's own height plus clear air, and measured DOWN FROM the credit's
    // own baseline rather than up from the frame's foot, so the portrait stage moves the plot with
    // it instead of leaving the last rows under the platform's caption.
    bottom:
      height -
      sourceBottom +
      T.VALUE_GUTTER +
      (sourceLines.length - 1) * sourceLead +
      SOURCE.fontSize +
      T.PLOT_TO_SOURCE,
    left: PAD + T.LABEL_GUTTER + maxCategoryWidth,
  };

  // EVERY TYPE SIZE THIS FRAME ACTUALLY DRAWS, against the row's own floor. The guard reads
  // `font-size="…"` out of markup because that is what it reads on the static side; a video
  // composition's markup only exists inside the browser Remotion drives, so the sizes are handed to
  // it in the form they will be written in.
  assertTypeFloor(
    [
      TITLE.fontSize,
      SOURCE.fontSize,
      AXIS_TICK.fontSize,
      ROW_LABEL.fontSize,
      ROW_LABEL_ACCENT.fontSize,
      VALUE_LABEL.fontSize,
    ]
      .map((px) => `font-size="${px}"`)
      .join(" "),
    size,
    { what: `vidy-lollipop-renewables-share-europe at ${size}` },
  );

  const g = lollipopGeometry(data, { width, height, padding });

  // ── The edit. Six windows, all read off the timing contract — no frame literal below.
  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const subject = progressOf(frame, timing.subject);
  const conclusion = progressOf(frame, timing.conclusion);

  // The title and the source are on screen at FRAME ZERO, at full opacity, never faded in.
  // Extracting frame 0 from this beat's mp4 returned a completely blank white image — measured,
  // not assumed: `establish` starts at frame 0, so its progress there is exactly 0 and everything
  // gated on it is invisible. Frame 0 is the poster frame a CMS or a social platform pulls as the
  // thumbnail before anyone presses play, and a blank poster frame is a beat that says nothing.
  // `motion-grammar.md`'s "the conclusion appears only after its evidence" governs assertions, not
  // the title; the title establishes what the reader is looking at.
  // The axis tick gridlines still fade in over `establish` — they are the frame the stems will be
  // measured in, and they have nothing to say before the stems exist.
  const axisOpacity = establish;

  // The reference: the zero baseline, drawn top-to-bottom (the value axis's own origin, laid down
  // before any stem and left alone to be read — same device, same pause, as every prior beat's
  // reference line).
  const referenceY2 = interpolate(
    referenceProgress,
    [0, 1],
    [g.plot.top, g.plot.bottom],
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

  // The reveal: each row's stem grows from the zero baseline to its value, cascading in rank
  // order — see `rowWindow` above and the file doc-comment. `stemT` is the row's OWN growth
  // fraction (0 = stem length zero, 1 = stem at its final value), never the master `reveal` signal
  // directly — `motion-grammar.md`'s "a label's reveal gates on its own mark, never on a master
  // clock" applies to the stem's own tip position too.
  const stemT = g.points.map((_, i) => {
    const w = rowWindow(i, g.points.length);
    return interpolate(reveal, [w.start, w.end], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
  });
  // The dot and labels pop in almost as soon as the row's own window opens, then ride the
  // growing tip — a stem that is visible but dot-less for its first frames would look broken,
  // not "growing".
  const markOpacity = stemT.map((t) =>
    interpolate(t, [0, 0.06], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  // Labels arrive once the stem is nearly at its final length, not halfway through the growth —
  // a value label next to a half-grown stem would be naming a length that has not landed yet.
  const labelOpacity = stemT.map((t) =>
    interpolate(t, [0.7, 1], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  // The subject: Switzerland's own emphasis, landing once every row (including its own) is
  // already on screen — `subject.start` cannot precede `reveal`'s end, so this is structural, not
  // just editorial intent. Critically damped, same as every prior beat's landing mark: a ring that
  // overshot would be showing, for a few frames, more emphasis than the finding warrants.
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const ringRadius = interpolate(subjectSpring, [0, 1], [0, DOT_R + T.RING_STANDOFF]);
  const ringOpacity = interpolate(subjectSpring, [0, 1], [0, 1]);
  const highlightOpacity = interpolate(subjectSpring, [0, 1], [0, 0.1]);
  // The stem/dot recolour (muted → accent) and the category label crossfade (ink → bold accent)
  // both gate on the SUBJECT event's own progress (not the master reveal signal) —
  // `motion-grammar.md`'s "a label's reveal gates on its own mark, never on a master clock."
  const emphasis = interpolate(subject, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  // The conclusion: Switzerland's already-visible value label extends in place into the one new
  // fact the beat has not yet stated, the gap to the compare country — same two-stage label
  // technique `DumbbellVideo.tsx`'s `conclusion` block uses.
  const conclusionOpacity = interpolate(conclusion, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  const rowLabelBaselineOffset = ROW_LABEL.fontSize * 0.32;

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
            y={sourceBaseline + i * sourceLead}
            fill={muted}
            fontSize={SOURCE.fontSize}
          >
            {text}
          </text>
        ))}
      </g>

      {/* Scale furniture: light gridlines + tick labels at whatever d3 picks for this domain
          (excluding zero, which is drawn separately, with emphasis, as the `reference` event
          below) — faded in over `establish`, then still. */}
      <g opacity={axisOpacity}>
        {g.tickValues.map((t) => {
          const scaledX =
            g.zeroX +
            (g.plot.right - g.zeroX) *
              (t / (g.tickValues[g.tickValues.length - 1] ?? t));
          return (
            <g key={`tick-${t}`}>
              <line
                x1={scaledX}
                x2={scaledX}
                y1={g.plot.top}
                y2={g.plot.bottom}
                stroke={grid}
                strokeWidth={T.GRID_STROKE}
              />
              <text
                x={scaledX}
                y={axisLabelBaseline}
                fill={muted}
                fontSize={AXIS_TICK.fontSize}
                fontWeight={AXIS_TICK.fontWeight}
                textAnchor="middle"
              >
                {t}%
              </text>
            </g>
          );
        })}
      </g>

      {/* The reference: the zero baseline, the value axis's own origin — every stem's true zero,
          drawn with emphasis (dashed, muted, animated) and left alone to be read. */}
      {referenceProgress > 0 ? (
        <g>
          <line
            x1={g.zeroX}
            x2={g.zeroX}
            y1={g.plot.top}
            y2={referenceY2}
            stroke={muted}
            strokeWidth={T.BASELINE_STROKE}
            strokeDasharray="8 6"
          />
          <text
            x={g.zeroX}
            y={axisLabelBaseline}
            fill={muted}
            fontSize={AXIS_TICK.fontSize}
            fontWeight={AXIS_TICK.fontWeight}
            textAnchor="start"
            opacity={referenceLabelOpacity}
          >
            0%
          </text>
        </g>
      ) : null}

      {/* The subject's highlight band, behind everything else in the row — a wash, not a mark. */}
      {highlightOpacity > 0 ? (
        <rect
          x={PAD / 2}
          y={g.points[subjectIndex].y - g.rowHeight / 2}
          width={width - PAD}
          height={g.rowHeight}
          fill={accent}
          opacity={highlightOpacity}
        />
      ) : null}

      {/* Each row: stem growing from the zero baseline to its value, dot at the tip, category
          label, value label — cascading in rank order via `stemT`. Every opacity below is an
          ABSOLUTE value (never divided back out of a parent group's opacity), so nothing produces
          NaN in the frame before a row's own window opens. */}
      {g.points.map((p, i) => {
        const isSubject = i === subjectIndex;
        const tipX = interpolate(stemT[i], [0, 1], [g.zeroX, p.xValue], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        // Three handovers belong to the subject row — its mark takes the accent, its label takes
        // the bold accent, its value takes the gap sentence. All three are CUTS. Written as
        // crossfades this row drew its stem and dot TWICE, a muted pair under an accent pair
        // dissolving over it, which composites to a hue between `muted` and `accent` that nobody
        // chose, and printed "Switzerland" over "Switzerland" at the same anchor.
        const accented = isSubject && subject > 0;
        const concluded = isSubject && conclusion > 0;
        const valueOpacity = labelOpacity[i];
        const categoryOpacity = labelOpacity[i];
        return (
          <g key={p.country}>
            {/* ONE stem and ONE dot per row, whose colour switches at the subject's own
                boundary — never a second accent-coloured pair dissolving over the first. */}
            <line
              x1={g.zeroX}
              x2={tipX}
              y1={p.y}
              y2={p.y}
              stroke={accented ? accent : muted}
              strokeWidth={T.STEM_STROKE}
              opacity={markOpacity[i]}
            />
            <circle
              cx={tipX}
              cy={p.y}
              r={DOT_R}
              fill={accented ? accent : muted}
              opacity={markOpacity[i]}
            />
            <text
              x={g.plot.left - T.LABEL_GUTTER}
              y={p.y + rowLabelBaselineOffset}
              fill={accented ? accent : ink}
              fontSize={accented ? ROW_LABEL_ACCENT.fontSize : ROW_LABEL.fontSize}
              fontWeight={
                accented ? ROW_LABEL_ACCENT.fontWeight : ROW_LABEL.fontWeight
              }
              textAnchor="end"
              opacity={categoryOpacity}
            >
              {p.country}
            </text>
            <text
              x={tipX + T.VALUE_GUTTER}
              y={p.y + rowLabelBaselineOffset}
              fill={ink}
              fontSize={VALUE_LABEL.fontSize}
              fontWeight={VALUE_LABEL.fontWeight}
              opacity={valueOpacity}
            >
              {concluded ? conclusionLabelFor(p) : valueLabelFor(p)}
            </text>
          </g>
        );
      })}

      {/* Switzerland's ring — pops onto its dot once the subject event starts. */}
      {ringOpacity > 0 ? (
        <circle
          cx={g.points[subjectIndex].xValue}
          cy={g.points[subjectIndex].y}
          r={ringRadius}
          fill="none"
          stroke={accent}
          strokeWidth={T.RING_STROKE}
          opacity={ringOpacity}
        />
      ) : null}

    </svg>
  );
}
