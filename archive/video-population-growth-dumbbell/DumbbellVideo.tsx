/**
 * The video beat of "Switzerland's population grew fastest of ten European countries since 2000."
 * — 9 seconds, 30fps, 1080 × 1080.
 *
 * First dumbbell written in this shape. Ten rows, each with exactly two points (2000 and 2023,
 * indexed to 2000 = 100), joined by a connector whose LENGTH is the point — not a time series, so
 * this file's geometry (`dumbbellGeometry` below) is a fresh shape, not a copy of any prior beat's
 * `crossingGeometry` / `migrationGeometry` / `lifeExpectancyGeometry`. `FONT_FAMILY`, `measureText`
 * and `wrap` ARE this story's own copies of the other proof workspaces' functions of the same name
 * — not an import from any of them, per the duplicate-do-not-link rule (`../migration/MigrationVideo.tsx`'s
 * file doc-comment explains why: this story lives outside `chart-video`'s skill boundary, and
 * the settled rule for a workspace that needs something a skill has is to duplicate it, not reach
 * back across the boundary). `drawnSoFar` is NOT copied here — nothing in this beat traces a
 * continuously-drawing path; every mark pops into place at a fixed coordinate, so there is no
 * partial-path head to compute.
 *
 * THE MOTION PROBLEM (from `BRIEF.md`): every row shares the SAME left dot (index 100 — that is
 * what indexing to a common base year achieves) and a DIFFERENT right dot. The reveal establishes
 * all ten left dots together first — the shared starting line, literally a vertical rule at 100 —
 * then brings in each row's right dot, connector and category label in gap-size order, largest
 * first, so the reader watches the ranking build in the same order the rows are sorted: the last
 * (smallest) connectors to arrive are also the shortest, which reads as "and here's the bottom of
 * the ranking," not as an afterthought. Switzerland, the subject, gets the emphasis treatment once
 * its own connector has landed, not before — `checkTiming`'s ordering rule makes that structurally
 * true, since `subject` cannot start until `reveal` (all ten rows) has fully finished.
 *
 * COLOUR: the dumbbell type doctrine (`chart-beat/references/types/dumbbell.md`) caps colour
 * at exactly two hues, one per SERIES, reused on every row — that channel is already spent encoding
 * "2000 vs 2023" before Switzerland's own emphasis can use it. `visual-system.md`'s grammar gives
 * the natural assignment: 2000 is the series "the subject is compared against" (neutral, `muted`),
 * 2023 is the series carrying the finding (the one accent, `accent`). Switzerland's emphasis is
 * then a THIRD channel, never a third hue: a ring popping onto its already-landed dots, a soft
 * highlight wash behind its row, and its category label crossfading from ink to bold accent — see
 * the `subject` block below.
 *
 * VALUE LABELS: the type doctrine says a dumbbell's two dots each get an outer-side value label.
 * Here the left dot is 100 on EVERY row — the shared rule already states that once; printing "100"
 * ten times beside ten dots that all say the same thing would be `anti-patterns.md`'s "repeated
 * years or values" ten times over, not ten new facts. The rule's own caption (`referenceLabel`,
 * arriving with the `reference` event, same device `EmissionsVideo.tsx` and
 * `../migration/MigrationVideo.tsx` use for their horizontal reference lines) carries that value
 * instead. Each row's RIGHT dot — the one number that differs per row — gets its own outer-side
 * label, in page ink, never in either dot's own hue (the accessibility trap the type doctrine names
 * by name).
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
} from "#shared/chart-video/timing.ts";
import {
  assertTypeFloor,
  frameInsetFor,
  sizeFor,
} from "#shared/chart-video/sizes.mjs";
import { formForSize } from "#shared/chart-beat/type-at-size.mjs";
import { DUMBBELL_TIMING } from "./timing-contract";

export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

/** The chart type this beat draws, in `references/types/` vocabulary. Read by `formForSize`. */
const TYPE = "dumbbell";

/**
 * THE 900x560-CONVENTION BASE, WITH THE ROW'S `typeScale` AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more, and its absence is the point: it said `1080 x 1080` here
 * while `Root.tsx` said `width={1080} height={1080}` two files away, with nothing between them, so
 * `size: portrait` on the slot produced a square in silence (`specs/W4-export-sizes.md` §1a).
 *
 * Every spacing number goes through `sp`, not only the fonts — the legend's own gaps, the air under
 * the header, the inset of a row label from the plot. Scaling the type and leaving those at their
 * 1080-square value is what collided the title into the subtitle on the static probe's first run.
 *
 * The base numbers are the old 1080-square values re-expressed at the convention the table's
 * `typeScale` is written against — smallest token 12, so the row's multiplier lands the smallest
 * drawn type exactly on that row's legibility floor. The old values did not clear it: this beat's
 * credit was 20px on a 1080 frame, 6.7 CSS px on the phone a square post is read on.
 *
 * `PAD` is the one number that is NOT from here: a frame's margin is proportional to the CANVAS.
 */
const BASE = {
  TITLE: { fontSize: 23, fontWeight: 700, lead: 29 },
  SOURCE: { fontSize: 12, fontWeight: 400 },
  LEGEND: { fontSize: 13, fontWeight: 600 },
  ROW_LABEL: { fontSize: 14, fontWeight: 500 },
  ROW_LABEL_ACCENT: { fontSize: 14, fontWeight: 700 },
  VALUE_LABEL: { fontSize: 14, fontWeight: 600 },
  NOTE: { fontSize: 12, fontWeight: 400 },
  DOT_R: 4,
  RING_AIR: 4,
  TITLE_TO_LEGEND: 24,
  LEGEND_TO_PLOT: 34,
  LEGEND_DOT_GAP: 13,
  LEGEND_ITEM_GAP: 21,
  LEGEND_ITEM_TEXT: 30,
  SOURCE_BAND: 10,
  SOURCE_AIR: 6,
  ROW_LABEL_AIR: 4,
  VALUE_LABEL_GAP: 4,
  REFERENCE_LABEL_LIFT: 8,
  DASH_REFERENCE: [5, 4],
};

/** Strokes scale but are NOT rounded: a hairline that rounds up stops being a hairline, and SVG
 *  takes a sub-pixel width. The base is the width drawn at landscape. */
const BASE_STROKE = { connector: 1.2, reference: 0.8, ring: 1.2 };

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
    LEGEND: f(BASE.LEGEND) as typeof BASE.LEGEND,
    ROW_LABEL: f(BASE.ROW_LABEL) as typeof BASE.ROW_LABEL,
    ROW_LABEL_ACCENT: f(BASE.ROW_LABEL_ACCENT) as typeof BASE.ROW_LABEL_ACCENT,
    VALUE_LABEL: f(BASE.VALUE_LABEL) as typeof BASE.VALUE_LABEL,
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    DOT_R: sp(BASE.DOT_R),
    RING_AIR: sp(BASE.RING_AIR),
    TITLE_TO_LEGEND: sp(BASE.TITLE_TO_LEGEND),
    LEGEND_TO_PLOT: sp(BASE.LEGEND_TO_PLOT),
    LEGEND_DOT_GAP: sp(BASE.LEGEND_DOT_GAP),
    LEGEND_ITEM_GAP: sp(BASE.LEGEND_ITEM_GAP),
    LEGEND_ITEM_TEXT: sp(BASE.LEGEND_ITEM_TEXT),
    SOURCE_BAND: sp(BASE.SOURCE_BAND),
    SOURCE_AIR: sp(BASE.SOURCE_AIR),
    ROW_LABEL_AIR: sp(BASE.ROW_LABEL_AIR),
    VALUE_LABEL_GAP: sp(BASE.VALUE_LABEL_GAP),
    REFERENCE_LABEL_LIFT: sp(BASE.REFERENCE_LABEL_LIFT),
    DASH_REFERENCE: BASE.DASH_REFERENCE.map(sp).join(" "),
    STROKE: {
      connector: st(BASE_STROKE.connector),
      reference: st(BASE_STROKE.reference),
      ring: st(BASE_STROKE.ring),
    },
  };
}

/**
 * Every `fontSize` the returned element tree actually carries, INCLUDING one written bare at a mark.
 *
 * The still path hands `assertTypeFloor` the rendered SVG's own `font-size` attributes. A video
 * composition's markup only exists inside the browser Remotion drives, so the equivalent reading is
 * the element tree — walked, not listed, because a list re-states the tokens and the defect this
 * closes is a token nobody listed.
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

export type Row = {
  country: string;
  index2000: number;
  index2023: number;
  gap: number;
};

/**
 * The rendered width of a string in the font it will really be drawn in — this story's own copy
 * of the video format's browser-Canvas text measurer (see the file doc-comment for why it is
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

/** English, one decimal — every index value here sits between 100 and 130. */
export function en(value: number, decimals = 1): string {
  const sign = value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(decimals)}`;
}

/**
 * Data to coordinates. Pure — no colour, no font, no React. A fresh shape, not a copy of any
 * prior beat's geometry: rows are categories on a band-like vertical axis, not readings on a time
 * axis, and each row supplies its own pair of points rather than one series supplying all of them.
 *
 * The x domain is fitted to every index value actually present (including 100, so the shared rule
 * is always inside the frame) and NOT padded to zero — position encoding, the same discipline
 * `crossingGeometry` and `migrationGeometry` apply to their own value axes: what matters is where
 * each dot sits and how far apart a row's pair is, not the distance from an arbitrary floor.
 */
export function dumbbellGeometry(
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
  const allValues = rows.flatMap((r) => [r.index2000, r.index2023]);
  const x = scaleLinear()
    .domain(extent(allValues) as [number, number])
    .nice()
    .range([plot.left, plot.right]);

  const rowHeight = (plot.bottom - plot.top) / rows.length;
  const points = rows.map((r, i) => ({
    ...r,
    y: plot.top + rowHeight * (i + 0.5),
    xLeft: x(r.index2000),
    xRight: x(r.index2023),
  }));

  return { plot, rowHeight, points, ruleX: x(100) };
}

/**
 * How far through row `i`'s own arrival window the master `reveal` progress is, 0..1.
 *
 * All ten left dots land together inside the first `LEFT_DOTS_END` slice — see the file
 * doc-comment: they are all index 100, and the shared rule already says so once. The remaining
 * slice is divided across the ten rows in gap-size order (row 0 = the largest gap = Switzerland,
 * arriving first), each window overlapping the next slightly so the cascade reads as one
 * continuous build rather than ten discrete steps.
 */
const LEFT_DOTS_END = 0.05;
function rowWindow(i: number, rowCount: number) {
  const span = (1 - LEFT_DOTS_END) / rowCount;
  const start = LEFT_DOTS_END + i * span;
  const duration = span * 1.6;
  return { start, end: Math.min(1, start + duration) };
}

export type DumbbellVideoProps = {
  data: Row[]; // pre-sorted by gap, descending — render.mjs's job, not this component's.
  title: string;
  source: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  referenceLabel: string;
  legendLabels: [string, string]; // ["2000", "2023"]
  subjectCountry: string;
  /** The export size gate 2c pinned, recorded in this beat's own `BRIEF.md` front matter and read
   *  back by `render.mjs`. Not a default: `sizeFor` throws naming all three. */
  size: string;
  timing?: BeatTiming;
};

export function DumbbellVideo({
  data,
  title,
  source,
  ground,
  accent,
  ink,
  muted,
  referenceLabel,
  legendLabels,
  subjectCountry,
  size,
  timing = DUMBBELL_TIMING,
}: DumbbellVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // The frame is the TABLE's, at the size the journalist pinned — never a constant in this file.
  const { width, height, typeScale } = sizeFor(size);
  const PAD = frameInsetFor(size);
  const T = tokens(typeScale);
  const {
    TITLE,
    SOURCE,
    LEGEND,
    ROW_LABEL,
    ROW_LABEL_ACCENT,
    VALUE_LABEL,
    NOTE,
    DOT_R,
  } = T;

  // WHETHER THIS TYPE MAY ENTER THIS SIZE, AND IN WHAT FORM — before anything is measured.
  //
  // A dumbbell's category axis is NOMINAL, so `formForSize` answers `transpose` at a tall or square
  // frame: rows running down the frame, every name horizontal on one line. This beat already draws
  // that form — it is row-driven, one country per row — so the twin form costs it nothing and all
  // three sizes are drawable. The verdict is still consulted rather than assumed, because it is the
  // thing that would refuse if this type ever stopped being row-driven.
  const form = formForSize(TYPE, size);
  if (form.verdict === "refuse")
    throw new Error(
      `video-population-growth-dumbbell: ${TYPE} cannot be drawn at ${size}. ${form.reason}`,
    );

  if (data.length < 2)
    throw new Error(`need at least two rows, got ${data.length}`);
  const subjectIndex = data.findIndex((r) => r.country === subjectCountry);
  if (subjectIndex < 0)
    throw new Error(
      `no row for subject country ${JSON.stringify(subjectCountry)}`,
    );

  // ── Layout. Identical at every frame: the build changes what is visible, never where it sits,
  // so nothing shifts when a row arrives late.
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN, not under the title — `height - PAD`, the
  // same inset the title hangs off at the top, on the same x. It stays inside the furniture
  // opacity group, so no timing contract moves: it fades in with the title and is still there at
  // the last frame. See chart-beat/references/static-discipline.md, "The source on the
  // frame's bottom margin".
  const sourceBaseline = height - PAD;
  // The legend keeps the air it always had above it, measured from the LAST TITLE line rather
  // than from the source, which is no longer in the header.
  const legendBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + T.TITLE_TO_LEGEND;

  const valueLabelFor = (r: Row) => en(r.index2023, 1);
  const conclusionLabelFor = (r: Row) =>
    `${en(r.index2023, 1)} · +${en(r.gap, 1)} pts`;
  const subjectRow = data[subjectIndex];

  const maxCategoryWidth = Math.max(
    ...data.map((r) =>
      Math.max(
        measureText(r.country, ROW_LABEL),
        measureText(r.country, ROW_LABEL_ACCENT),
      ),
    ),
  );
  // The value label clears the largest mark its row can carry — the subject's RING, not the plain
  // dot — so one gap serves every row and the labels stay aligned with each other. It was a bare
  // `+ 14` against a 7px dot and a 13px ring, which left the subject's label one pixel clear of its
  // own ring at 1080 and would have landed ON it at any other scale. Derived, so it cannot.
  const valueLabelGap = T.DOT_R + T.RING_AIR + T.VALUE_LABEL_GAP;
  // Same derivation on the left: the subject's ring is drawn around its 2000 dot as well, and
  // the category label used to end exactly on its edge. One gap for every row, so the names
  // stay right-aligned with each other.
  const rowLabelGap = T.DOT_R + T.RING_AIR + T.ROW_LABEL_AIR;
  const maxRightWidth = Math.max(
    ...data.map((r) => measureText(valueLabelFor(r), VALUE_LABEL)),
    measureText(conclusionLabelFor(subjectRow), VALUE_LABEL),
  );

  const padding = {
    top: legendBaseline + T.LEGEND_TO_PLOT,
    right: PAD + valueLabelGap + maxRightWidth,
    // Grown by the credit's own height plus clear air.
    bottom: PAD + T.SOURCE_BAND + SOURCE.fontSize + T.SOURCE_AIR,
    left: PAD + rowLabelGap + maxCategoryWidth,
  };

  const g = dumbbellGeometry(data, { width, height, padding });

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
  // the title; the title establishes what the reader is looking at, so it cannot be absent at the
  // start. The legend still fades in over `establish` — it names two dots that do not exist yet.
  const axisOpacity = establish;

  // The reference: the vertical rule at index 100, drawn top-to-bottom (it is vertical, not
  // horizontal, but it is still laid down before the evidence and left alone to be read — same
  // device, same pause, as every prior beat's horizontal reference line).
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

  // The reveal: all ten left dots together, then each row's right dot + connector + category
  // label cascading in gap-size order — see `rowWindow` above and the file doc-comment.
  const rowOpacity = g.points.map((_, i) => {
    const w = rowWindow(i, g.points.length);
    return interpolate(reveal, [w.start, w.end], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
  });
  const leftDotsOpacity = interpolate(reveal, [0, LEFT_DOTS_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // The subject: Switzerland's own emphasis, landing once every row (including its own) is
  // already on screen — `subject.start` cannot precede `reveal`'s end, so this is structural, not
  // just editorial intent. Critically damped, same as every prior beat's landing mark: a ring that
  // overshot would be showing, for a few frames, more emphasis than the finding warrants.
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const ringRadius = interpolate(subjectSpring, [0, 1], [0, DOT_R + T.RING_AIR]);
  const ringOpacity = interpolate(subjectSpring, [0, 1], [0, 1]);
  const highlightOpacity = interpolate(subjectSpring, [0, 1], [0, 0.1]);
  // The category label crossfades from ink to bold accent, gated on the SUBJECT event's own
  // progress (not the master reveal signal) — `motion-grammar.md`'s "a label's reveal gates on
  // its own mark, never on a master clock."
  const labelAccentOpacity = interpolate(subject, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  // The conclusion: Switzerland's already-visible value label extends in place into the one new
  // fact the beat has not yet stated, the gap itself — see the file doc-comment for why this runs
  // in place rather than as a detached leader-line callout.
  const conclusionOpacity = interpolate(conclusion, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  const rowLabelBaselineOffset = ROW_LABEL.fontSize * 0.32;

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
        <text
          x={PAD}
          y={sourceBaseline}
          fill={muted}
          fontSize={SOURCE.fontSize}
        >
          {source}
        </text>
      </g>

      {/* Legend: the only thing telling a reader which dot is which year, on every row —
          load-bearing, not decorative (`dumbbell.md`'s accessibility trap). Faded in over
          `establish` with the rest of the mark furniture, not present at frame 0. */}
      <g opacity={axisOpacity}>
        <circle
          cx={PAD + DOT_R}
          cy={legendBaseline - DOT_R}
          r={DOT_R}
          fill={muted}
        />
        <text
          x={PAD + T.LEGEND_DOT_GAP}
          y={legendBaseline}
          fill={ink}
          fontSize={LEGEND.fontSize}
          fontWeight={LEGEND.fontWeight}
        >
          {legendLabels[0]}
        </text>
        <circle
          cx={
            PAD +
            T.LEGEND_DOT_GAP +
            measureText(legendLabels[0], LEGEND) +
            T.LEGEND_ITEM_GAP
          }
          cy={legendBaseline - DOT_R}
          r={DOT_R}
          fill={accent}
        />
        <text
          x={
            PAD +
            T.LEGEND_DOT_GAP +
            measureText(legendLabels[0], LEGEND) +
            T.LEGEND_ITEM_TEXT
          }
          y={legendBaseline}
          fill={ink}
          fontSize={LEGEND.fontSize}
          fontWeight={LEGEND.fontWeight}
        >
          {legendLabels[1]}
        </text>
      </g>

      {/* The reference: a dashed vertical rule at index 100, the shared starting line every row's
          left dot sits on. Its caption states what "indexed to 2000 = 100" means, once — the
          value that would otherwise repeat as ten identical "100" dot labels. */}
      {referenceProgress > 0 ? (
        <g>
          <line
            x1={g.ruleX}
            x2={g.ruleX}
            y1={g.plot.top}
            y2={referenceY2}
            stroke={muted}
            strokeWidth={T.STROKE.reference}
            strokeDasharray={T.DASH_REFERENCE}
          />
          <text
            x={g.ruleX}
            y={g.plot.top - T.REFERENCE_LABEL_LIFT}
            fill={muted}
            fontSize={NOTE.fontSize}
            textAnchor="middle"
            opacity={referenceLabelOpacity}
          >
            {referenceLabel}
          </text>
        </g>
      ) : null}

      {/* The subject's highlight band, behind everything else in the row — a wash, not a mark. */}
      {highlightOpacity > 0 ? (
        <rect
          x={Math.round(PAD / 2)}
          y={g.points[subjectIndex].y - g.rowHeight / 2}
          width={width - 2 * Math.round(PAD / 2)}
          height={g.rowHeight}
          fill={accent}
          opacity={highlightOpacity}
        />
      ) : null}

      {/* All ten left dots, together — the shared starting line, restated as marks. Gated on
          `leftDotsOpacity` ALONE: they are not part of any row's own cascade, so they must not
          dim or delay with a later row's stagger. */}
      {leftDotsOpacity > 0
        ? g.points.map((p) => (
            <circle
              key={`left-${p.country}`}
              cx={g.ruleX}
              cy={p.y}
              r={DOT_R}
              fill={muted}
              opacity={leftDotsOpacity}
            />
          ))
        : null}

      {/* Each row: connector (neutral scaffolding), right dot (the finding), category label,
          value label — cascading in gap-size order via rowOpacity. Every opacity below is an
          ABSOLUTE value (never divided back out of a parent group's opacity), so nothing produces
          NaN in the frame before a row's own window opens. */}
      {g.points.map((p, i) => {
        const isSubject = i === subjectIndex;
        // The subject's label and value each hand over to a second form — bold accent for the
        // category, the gap sentence for the value. Both handovers are CUTS: the row draws one
        // form or the other, never both. Written as crossfading pairs they printed
        // "Switzerland" over "Switzerland" and "123.5" over "123.5 · +23.5 pts" for a full
        // second each, two superimposed copies compositing to a colour nobody chose.
        const accented = isSubject && subject > 0;
        const concluded = isSubject && conclusion > 0;
        const valueOpacity = rowOpacity[i];
        const categoryOpacity = rowOpacity[i];
        return (
          <g key={p.country}>
            <line
              x1={g.ruleX}
              x2={p.xRight}
              y1={p.y}
              y2={p.y}
              stroke={muted}
              strokeWidth={T.STROKE.connector}
              opacity={rowOpacity[i]}
            />
            <circle
              cx={p.xRight}
              cy={p.y}
              r={DOT_R}
              fill={accent}
              opacity={rowOpacity[i]}
            />
            <text
              x={g.plot.left - rowLabelGap}
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
              x={p.xRight + valueLabelGap}
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

      {/* Switzerland's ring — pops onto both already-landed dots once the subject event starts. */}
      {ringOpacity > 0 ? (
        <g opacity={ringOpacity}>
          <circle
            cx={g.ruleX}
            cy={g.points[subjectIndex].y}
            r={ringRadius}
            fill="none"
            stroke={accent}
            strokeWidth={T.STROKE.ring}
          />
          <circle
            cx={g.points[subjectIndex].xRight}
            cy={g.points[subjectIndex].y}
            r={ringRadius}
            fill="none"
            stroke={accent}
            strokeWidth={T.STROKE.ring}
          />
        </g>
      ) : null}

    </svg>
  );

  // EVERY TYPE SIZE THIS FRAME ACTUALLY DRAWS, against the row's own floor — read off the element
  // tree rather than a list of tokens, so a size written bare at a mark cannot escape it.
  assertTypeFloor(
    fontSizesIn(drawing)
      .map((px) => `font-size="${px}"`)
      .join(" "),
    size,
    { what: `video-population-growth-dumbbell at ${size}` },
  );

  return drawing;
}
