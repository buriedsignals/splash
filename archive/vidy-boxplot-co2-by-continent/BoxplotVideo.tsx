/**
 * The video beat of "CO₂ emissions per capita vary widely within every continent — and in the
 * Americas, the US and Canada each emit over 4× the region's median." — ~8.7 seconds, 30fps,
 * 1080 × 1080.
 *
 * First box plot written in this shape. Four continents, each a real five-number summary (plus 0-2
 * Tukey outliers) computed from 12-15 real per-country readings — not a single pre-aggregated
 * number per group, and not a time series, so this file's geometry (`boxplotGeometry` below) is a
 * fresh shape, not a copy of any prior beat's `crossingGeometry` / `migrationGeometry` /
 * `dumbbellGeometry`. `FONT_FAMILY`, `measureText`, `wrap` and `en` ARE this story's own copies of
 * the other proof workspaces' functions of the same name — not an import from any of them, per the
 * duplicate-do-not-link rule (`../video-population-growth-dumbbell/DumbbellVideo.tsx`'s file
 * doc-comment explains why: this story lives outside `chart-video`'s skill boundary, and the
 * settled rule for a workspace that needs something a skill has is to duplicate it, not reach back
 * across the boundary). `drawnSoFar` is NOT copied here — nothing in this beat traces a
 * continuously-drawing path; every mark pops into place at a fixed coordinate.
 *
 * THE MOTION PROBLEM (from `BRIEF.md`): a box plot is already a summary — five numbers per group,
 * none of which "happens before" another in any sense a reader could follow. Cascading a single
 * box's own five marks in as five separate timed events would invent motion the data does not
 * contain. What genuinely benefits from an order in time is the GROUP-level comparison: the four
 * continent boxes arrive one at a time, sorted by median ascending (Africa, Americas, Asia, Europe),
 * each box's whiskers + box + outlier dots drawing together as ONE event per category. The Americas
 * box is the subject — not because its median is highest or lowest, but because of what it HIDES: a
 * modest median with two countries (Canada, the United States) sitting far outside it — and its
 * emphasis (ring + column wash + bold label) lands only once every box, including its own, is
 * already on screen, the same structural guarantee the dumbbell beat's Switzerland emphasis relies
 * on (`checkTiming`'s ordering rule leaves no other option).
 *
 * COLOUR: there is no second series here (unlike the dumbbell's 2000-vs-2023 legend) — every box is
 * the same distribution's own shape, so one hue does the whole job: `accent` fills and strokes every
 * box and its outlier dots; `muted` draws the whiskers, caps and the shared reference line;
 * `ink` draws the median line and every piece of text, per the type doctrine's rule that a label is
 * never automatically safe in the mark's own colour. The Americas subject emphasis spends `accent`
 * again (a ring, a column wash) rather than a second hue, the same "third channel, not a third hue"
 * discipline `DumbbellVideo.tsx` documents for Switzerland.
 *
 * VALUE LABELS: median value + `n` beneath every category label print with the box's own arrival
 * (`boxplot.md`'s "show the n, or the box plot lies about confidence"). Each outlier gets its own
 * value label beside its dot — there are only 1-2 per group, well under the doctrine's "once there
 * are many, drop the per-point labels" threshold. The Americas outliers' plain value labels swap, at
 * the conclusion event, for the "× the median" framing that is the actual finding — the same
 * in-place-extension device `DumbbellVideo.tsx`'s `conclusionLabelFor` uses for Switzerland's gap.
 */

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
import { BOXPLOT_TIMING } from "./timing-contract";

export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

/** The chart type this beat draws, in `references/types/` vocabulary. Read by `formForSize`. */
const TYPE = "boxplot";

/**
 * THE 900x560-CONVENTION BASE, WITH THE ROW'S `typeScale` AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more. It said `1080 x 1080` here while `Root.tsx` said
 * `width={1080} height={1080}` two files away, with nothing between them, so `size: portrait` on
 * the slot produced a square in silence (`specs/W4-export-sizes.md` §1a).
 *
 * Every spacing number goes through `sp`, not only the fonts — the whisker cap's own width, the
 * outlier radius, the cap on how wide a box may get, the lift of an outlier's label off its dot.
 *
 * The base numbers are the old 1080-square values re-expressed at the convention the table's
 * `typeScale` is written against — smallest token 12, so the row's multiplier lands the smallest
 * drawn type exactly on that row's legibility floor. The old values did not clear it: this beat's
 * `n =` row and its outlier labels were 17px on a 1080 frame, 5.7 CSS px on the phone a square post
 * is read on — the exact figure the W4 audit measured across this corpus.
 */
const BASE = {
  TITLE: { fontSize: 25, fontWeight: 700, lead: 32 },
  SOURCE: { fontSize: 13, fontWeight: 400 },
  AXIS_UNIT: { fontSize: 13, fontWeight: 400 },
  TICK_LABEL: { fontSize: 13, fontWeight: 400 },
  CATEGORY_LABEL: { fontSize: 17, fontWeight: 600 },
  CATEGORY_LABEL_ACCENT: { fontSize: 17, fontWeight: 700 },
  N_LABEL: { fontSize: 12, fontWeight: 400 },
  MEDIAN_LABEL: { fontSize: 13, fontWeight: 600 },
  OUTLIER_LABEL: { fontSize: 12, fontWeight: 500 },
  NOTE: { fontSize: 13, fontWeight: 400 },
  OUTLIER_R: 4,
  RING_AIR: 4,
  WHISKER_CAP: 14,
  BOX_HALF_MAX: 32,
  TITLE_TO_AXIS_UNIT: 24,
  AXIS_UNIT_TO_NOTE: 23,
  NOTE_TO_PLOT: 28,
  PLOT_RIGHT_AIR: 14,
  X_LABEL_BAND: 38,
  SOURCE_AIR: 17,
  Y_GUTTER: 32,
  TICK_LABEL_INSET: 7,
  OUTLIER_LABEL_LIFT: 7,
  CATEGORY_DROP: 21,
  N_ROW_DROP: 14,
  MEDIAN_LABEL_GAP: 7,
  DASH_REFERENCE: [4, 3],
};

/** Strokes scale but are NOT rounded: a hairline that rounds up stops being a hairline. */
const BASE_STROKE = {
  grid: 0.4,
  reference: 0.8,
  whisker: 0.8,
  box: 0.8,
  median: 1.2,
  outlier: 0.4,
  ring: 1.2,
};

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
    AXIS_UNIT: f(BASE.AXIS_UNIT) as typeof BASE.AXIS_UNIT,
    TICK_LABEL: f(BASE.TICK_LABEL) as typeof BASE.TICK_LABEL,
    CATEGORY_LABEL: f(BASE.CATEGORY_LABEL) as typeof BASE.CATEGORY_LABEL,
    CATEGORY_LABEL_ACCENT: f(
      BASE.CATEGORY_LABEL_ACCENT,
    ) as typeof BASE.CATEGORY_LABEL_ACCENT,
    N_LABEL: f(BASE.N_LABEL) as typeof BASE.N_LABEL,
    MEDIAN_LABEL: f(BASE.MEDIAN_LABEL) as typeof BASE.MEDIAN_LABEL,
    OUTLIER_LABEL: f(BASE.OUTLIER_LABEL) as typeof BASE.OUTLIER_LABEL,
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    OUTLIER_R: sp(BASE.OUTLIER_R),
    RING_AIR: sp(BASE.RING_AIR),
    WHISKER_CAP: sp(BASE.WHISKER_CAP),
    BOX_HALF_MAX: sp(BASE.BOX_HALF_MAX),
    TITLE_TO_AXIS_UNIT: sp(BASE.TITLE_TO_AXIS_UNIT),
    AXIS_UNIT_TO_NOTE: sp(BASE.AXIS_UNIT_TO_NOTE),
    NOTE_TO_PLOT: sp(BASE.NOTE_TO_PLOT),
    PLOT_RIGHT_AIR: sp(BASE.PLOT_RIGHT_AIR),
    X_LABEL_BAND: sp(BASE.X_LABEL_BAND),
    SOURCE_AIR: sp(BASE.SOURCE_AIR),
    Y_GUTTER: sp(BASE.Y_GUTTER),
    TICK_LABEL_INSET: sp(BASE.TICK_LABEL_INSET),
    OUTLIER_LABEL_LIFT: sp(BASE.OUTLIER_LABEL_LIFT),
    CATEGORY_DROP: sp(BASE.CATEGORY_DROP),
    N_ROW_DROP: sp(BASE.N_ROW_DROP),
    MEDIAN_LABEL_GAP: sp(BASE.MEDIAN_LABEL_GAP),
    DASH_REFERENCE: BASE.DASH_REFERENCE.map(sp).join(" "),
    STROKE: {
      grid: st(BASE_STROKE.grid),
      reference: st(BASE_STROKE.reference),
      whisker: st(BASE_STROKE.whisker),
      box: st(BASE_STROKE.box),
      median: st(BASE_STROKE.median),
      outlier: st(BASE_STROKE.outlier),
      ring: st(BASE_STROKE.ring),
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

export type Outlier = { country: string; value: number };

export type Group = {
  continent: string;
  n: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  whiskerLo: number;
  whiskerHi: number;
  outliers: Outlier[];
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

/** English, one decimal — every value here sits between 0.1 and 20.4. */
export function en(value: number, decimals = 1): string {
  const sign = value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(decimals)}`;
}

/**
 * Data to coordinates. Pure — no colour, no font, no React. A fresh shape, not a copy of any prior
 * beat's geometry: categories sit on an evenly-spaced band axis, and each category supplies its own
 * five-number summary plus outliers rather than one series of readings.
 *
 * The value (y) domain is fitted to every number actually drawn across every group — quartiles,
 * whiskers AND outliers, so an outlier is never clipped off the shared axis it is plotted on — and
 * is NOT padded to zero: a position encoding, the same discipline `dumbbellGeometry` and
 * `crossingGeometry` apply to their own value axes (`boxplot.md`'s "the value axis does not need to
 * start at zero").
 */
export function boxplotGeometry(
  groups: Group[],
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
  const allValues = groups.flatMap((g) => [
    g.whiskerLo,
    g.whiskerHi,
    ...g.outliers.map((o) => o.value),
  ]);
  const y = scaleLinear()
    .domain([Math.min(...allValues), Math.max(...allValues)])
    .nice()
    .range([plot.bottom, plot.top]);

  const colWidth = (plot.right - plot.left) / groups.length;
  const boxHalfWidth = Math.min(46, colWidth * 0.28);

  const points = groups.map((g, i) => ({
    ...g,
    cx: plot.left + colWidth * (i + 0.5),
    yMin: y(g.min),
    yQ1: y(g.q1),
    yMedian: y(g.median),
    yQ3: y(g.q3),
    yMax: y(g.max),
    yWhiskerLo: y(g.whiskerLo),
    yWhiskerHi: y(g.whiskerHi),
    outliers: g.outliers.map((o) => ({ ...o, y: y(o.value) })),
  }));

  return { plot, colWidth, boxHalfWidth, y, points };
}

/**
 * How far through group `i`'s own arrival window the master `reveal` progress is, 0..1. Four
 * groups cascading in the caller's own sort order (median ascending — see the file doc-comment),
 * each window overlapping the next slightly so the build reads as one continuous reveal rather than
 * four discrete pops.
 */
function groupWindow(i: number, groupCount: number) {
  const span = 1 / groupCount;
  const start = i * span;
  const duration = span * 1.7;
  return { start, end: Math.min(1, start + duration) };
}

export type BoxplotVideoProps = {
  data: Group[]; // pre-sorted by median, ascending — render.mjs's job, not this component's.
  title: string;
  source: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  referenceValue: number;
  referenceLabel: string;
  axisUnit: string;
  subjectContinent: string;
  /** The export size gate 2c pinned, recorded in this beat's own `BRIEF.md` front matter. */
  size: string;
  timing?: BeatTiming;
};

export function BoxplotVideo({
  data,
  title,
  source,
  ground,
  accent,
  ink,
  muted,
  grid,
  referenceValue,
  referenceLabel,
  axisUnit,
  subjectContinent,
  size,
  timing = BOXPLOT_TIMING,
}: BoxplotVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // The frame is the TABLE's, at the size the journalist pinned — never a constant in this file.
  const { width, height, typeScale } = sizeFor(size);
  const PAD = frameInsetFor(size);
  const T = tokens(typeScale);
  const {
    TITLE,
    SOURCE,
    AXIS_UNIT,
    TICK_LABEL,
    CATEGORY_LABEL,
    CATEGORY_LABEL_ACCENT,
    N_LABEL,
    MEDIAN_LABEL,
    OUTLIER_LABEL,
    NOTE,
    OUTLIER_R,
    WHISKER_CAP,
  } = T;

  // WHETHER THIS TYPE MAY ENTER THIS SIZE AT ALL — before anything is measured.
  //
  // A box plot's value axis is a continuum and the SHAPE of each group — the box, the whiskers,
  // where the outliers sit relative to them — is the whole argument. It has no twin form, and no
  // aspect range has ever been MEASURED for it at a tall or square frame, so `type-at-size.mjs`
  // refuses by default and names the measurement that is missing. The probe's finding is exactly
  // about this class: a distribution redrawn at another aspect scores zero clipped runs and zero
  // collisions and is a different claim.
  const form = formForSize(TYPE, size);
  if (form.verdict !== "as-is")
    throw new Error(
      `vidy-boxplot-co2-by-continent: ${TYPE} cannot be drawn at ${size}. ${form.reason}\n` +
        `It ships at landscape.`,
    );

  if (data.length < 2)
    throw new Error(`need at least two groups, got ${data.length}`);
  const subjectIndex = data.findIndex((g) => g.continent === subjectContinent);
  if (subjectIndex < 0)
    throw new Error(
      `no group for subject continent ${JSON.stringify(subjectContinent)}`,
    );

  // ── Layout. Identical at every frame: the build changes what is visible, never where it sits,
  // so nothing shifts when a group arrives late.
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN, not under the title — `height - PAD`, the
  // same inset the title hangs off at the top, on the same x. It stays inside the furniture
  // opacity group, so no timing contract moves. See
  // chart-beat/references/static-discipline.md, "The source on the frame's bottom margin".
  const sourceBaseline = height - PAD;
  // The axis unit keeps the air it always had above it, measured from the LAST TITLE line rather
  // than from the source, which is no longer in the header.
  const axisUnitBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + T.TITLE_TO_AXIS_UNIT;
  // The reference line's caption lives in the header, not floating beside the line itself: at
  // 3.69 t the dashed rule crosses through the BODY of two boxes (Americas', Asia's) and runs
  // flush against the median value labels of the others — there is no clean band beside the line
  // anywhere along its own height once four real boxes share one shared scale. The header has
  // guaranteed clear space above every mark, and the reference event still gates this line's
  // opacity (`referenceLabelOpacity`), so it still arrives as its own event, just parked where
  // nothing else is ever drawn — the same render-verify-then-move fix `EmissionsVideo.tsx`'s own
  // reference caption documents taking, for the same reason (the first placement collided).
  const referenceNoteBaseline = axisUnitBaseline + T.AXIS_UNIT_TO_NOTE;

  const padding = {
    top: referenceNoteBaseline + T.NOTE_TO_PLOT,
    right: PAD + T.PLOT_RIGHT_AIR,
    // Grown by the credit's own height plus clear air. 24px rather than the family's 10: this
    // beat draws TWO rows under the plot (the continent name and its `n = ` row), and the first
    // render left the `n = ` row and the credit about ten pixels apart — legible, but not the
    // clear band the rest of the family gets.
    bottom: PAD + T.X_LABEL_BAND + SOURCE.fontSize + T.SOURCE_AIR,
    left: PAD + T.Y_GUTTER,
  };

  const g = boxplotGeometry(data, {
    width,
    height,
    padding,
    boxHalfMax: T.BOX_HALF_MAX,
  });
  const ticks = g.y.ticks(5);
  // ONE decimal count for the whole axis, taken from the tick set as a set. Each tick used to pick
  // its own (`t < 1 ? 1 : 0`), which printed this beat's own axis as `0.0, 5, 10, 15, 20`: the
  // zero alone carrying a decimal, as if it were measured to a different precision than the four
  // above it. An axis is one scale and reads as one column of numbers, so the count is derived
  // once, from the finest step the ticks actually need — 0 here, and 1 for any domain d3 ticks at
  // 0.5 or 2.5.
  //
  // `exactDecimals` is this beat's own copy of the one `proof/life-expectancy/LifeExpectancyVideo
  // .tsx` added for the same class of defect (a tick label that names a position it is not drawn
  // at) — duplicated rather than reached for across a beat boundary, the settled rule here.
  const exactDecimals = (v: number) => {
    for (let d = 0; d <= 3; d += 1) if (Number(v.toFixed(d)) === v) return d;
    throw new Error(
      `axis tick ${v} needs more than three decimals to print exactly — the scale is not "nice"`,
    );
  };
  const tickDecimals = Math.max(...ticks.map(exactDecimals));
  // The tripwire, kept separate from the formatting so it still fires if a fixed count is typed
  // back in: whatever a tick label says, reading it back as a number must give the tick it sits on.
  const tickLabel = (t: number) => {
    const label = en(t, tickDecimals);
    const printed = Number(label.replace("−", "-"));
    if (printed !== t)
      throw new Error(
        `axis tick label ${JSON.stringify(label)} is not the gridline it sits on (${t}) — a rounded tick draws a line at one place and names another`,
      );
    return label;
  };

  const subjectGroup = data[subjectIndex];
  const subjectOutliersSorted = [...subjectGroup.outliers].sort(
    (a, b) => b.value - a.value,
  );

  // ── The edit. Six windows, all read off the timing contract — no frame literal below.
  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const subject = progressOf(frame, timing.subject);
  const conclusion = progressOf(frame, timing.conclusion);

  // The title, the source and the axis unit are on screen at FRAME ZERO, at full opacity, never
  // faded in. Extracting frame 0 from this beat's mp4 returned a completely blank white image —
  // measured, not assumed: `establish` starts at frame 0, so its progress there is exactly 0 and
  // everything gated on it is invisible. Frame 0 is the poster frame a CMS or a social platform
  // pulls as the thumbnail before anyone presses play, and a blank poster frame is a beat that
  // says nothing. `motion-grammar.md`'s "the conclusion appears only after its evidence" governs
  // assertions, not the title; the title establishes what the reader is looking at.
  // The value axis still fades in over `establish` — it is the frame the boxes will be measured
  // in, and it has nothing to say before they exist.
  const axisOpacity = establish;

  // The reference: the shared median line every box is implicitly read against, drawn left-to-
  // right like every prior beat's horizontal reference line, laid down before the boxes and left
  // alone for the same 18-frame pause.
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
  const referenceY = g.y(referenceValue);

  // The reveal: four boxes, each arriving as one event (whiskers + box + outlier dots + category
  // label together) — see `groupWindow` above and the file doc-comment for why the five marks
  // inside a box never cascade against each other.
  const groupOpacity = g.points.map((_, i) => {
    const w = groupWindow(i, g.points.length);
    return interpolate(reveal, [w.start, w.end], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
  });

  // The subject: the Americas box's own emphasis, landing once every group (including its own) is
  // already on screen — `subject.start` cannot precede `reveal`'s end, so this is structural, not
  // just editorial intent. Critically damped, same as every prior beat's landing mark: a ring that
  // overshot would be showing, for a few frames, more emphasis than the finding warrants.
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const ringRadius = interpolate(
    subjectSpring,
    [0, 1],
    [0, OUTLIER_R + T.RING_AIR],
  );
  const ringOpacity = interpolate(subjectSpring, [0, 1], [0, 1]);
  const highlightOpacity = interpolate(subjectSpring, [0, 1], [0, 0.1]);
  // The category label crossfades from ink to bold accent, gated on the SUBJECT event's own
  // progress (not the master reveal signal) — `motion-grammar.md`'s "a label's reveal gates on its
  // own mark, never on a master clock."
  const labelAccentOpacity = interpolate(subject, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  // The conclusion: the Americas outliers' plain value labels extend in place into the one new
  // fact the beat has not yet stated — how many times the region's median they represent.
  const conclusionOpacity = interpolate(conclusion, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  const categoryLabelBaselineOffset = CATEGORY_LABEL.fontSize * 0.32;

  // Two Americas outliers (Canada, the US) sit close together in value — 0.44 t apart, about 12px
  // on this scale — so their labels have to be stacked. The stack is ordered the way the DOTS are:
  // the higher value on the higher line. The previous version placed each label at its own natural
  // offset and pushed collisions upward, which put Canada (13.9, the LOWER dot) above the United
  // States (14.3, the higher one) — a reader matching label to dot read the pair inverted.
  // Crowded stacks lift clear of the topmost dot rather than being pushed down onto their own
  // marks; an uncrowded pair keeps its natural offset so a distant outlier's label stays with it.
  // Shared by BOTH the plain value label (pre-conclusion) and the conclusion's "× median" label,
  // so the text never jumps position when it swaps wording.
  // The stacking floor between two outlier labels, DERIVED from the label's own drawn size rather
  // than typed: it was 22 against a 17px label, so the ratio is the fact and the pixel was a
  // coincidence of one frame.
  const MIN_LABEL_GAP = Math.round(OUTLIER_LABEL.fontSize * 1.29);
  const naturalLabelY = subjectOutliersSorted.map(
    (o) => g.y(o.value) - OUTLIER_R - T.OUTLIER_LABEL_LIFT,
  );
  const crowded = naturalLabelY.some(
    (y, i) => i > 0 && y - naturalLabelY[i - 1] < MIN_LABEL_GAP,
  );
  const stackFloor = Math.min(...naturalLabelY);
  const subjectOutlierLabelY = new Map<string, number>();
  subjectOutliersSorted.forEach((o, i) => {
    // `subjectOutliersSorted` is descending by value, so index 0 takes the topmost line.
    const placedY = crowded
      ? stackFloor - (subjectOutliersSorted.length - 1 - i) * MIN_LABEL_GAP
      : naturalLabelY[i];
    subjectOutlierLabelY.set(o.country, placedY);
  });

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
        <text
          x={PAD}
          y={axisUnitBaseline}
          fill={muted}
          fontSize={AXIS_UNIT.fontSize}
        >
          {axisUnit}
        </text>
      </g>

      {/* The value axis: sparse ticks, faded in over `establish` rather than present at frame 0,
          then never moving again — a box plot needs its unit labelled (`boxplot.md`), but this
          format asks for the sparsest version of that rule, not the static format's dense grid. */}
      <g opacity={axisOpacity}>
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={g.plot.left}
              x2={g.plot.right}
              y1={g.y(t)}
              y2={g.y(t)}
              stroke={grid}
              strokeWidth={T.STROKE.grid}
            />
            <text
              x={g.plot.left - T.TICK_LABEL_INSET}
              y={g.y(t) + TICK_LABEL.fontSize * 0.32}
              fill={muted}
              fontSize={TICK_LABEL.fontSize}
              textAnchor="end"
            >
              {tickLabel(t)}
            </text>
          </g>
        ))}
      </g>

      {/* The reference: the dashed line every box is implicitly read against — the 53-country
          median, laid down before any box and left alone to be read. Its caption lives in the
          header (see `referenceNoteBaseline`'s doc-comment above for why), not floating beside
          the line — but still gated on the SAME `referenceLabelOpacity`, so it still arrives as
          part of this event, just placed where nothing else is ever drawn. */}
      {referenceProgress > 0 ? (
        <line
          x1={g.plot.left}
          x2={referenceX2}
          y1={referenceY}
          y2={referenceY}
          stroke={muted}
          strokeWidth={T.STROKE.reference}
          strokeDasharray={T.DASH_REFERENCE}
        />
      ) : null}
      <text
        x={PAD}
        y={referenceNoteBaseline}
        fill={muted}
        fontSize={NOTE.fontSize}
        opacity={referenceLabelOpacity}
      >
        {referenceLabel} — {en(referenceValue)} (dashed line)
      </text>

      {/* The subject's highlight wash, behind everything else in its column. */}
      {highlightOpacity > 0 ? (
        <rect
          x={g.plot.left + g.colWidth * subjectIndex}
          y={g.plot.top}
          width={g.colWidth}
          height={g.plot.bottom - g.plot.top}
          fill={accent}
          opacity={highlightOpacity}
        />
      ) : null}

      {/* Each group: whiskers + caps (neutral scaffolding), box (the one hue), median line (ink),
          outlier dots, category label, median value label — arriving together via groupOpacity.
          Every opacity below is an ABSOLUTE value (never divided back out of a parent group's
          opacity), so nothing produces NaN in the frame before a group's own window opens. */}
      {g.points.map((p, i) => {
        const isSubject = i === subjectIndex;
        // Two handovers belong to the subject column — its category label takes the bold accent,
        // and each of its outlier labels takes the "x the median" framing. Both are CUTS: one
        // form is mounted at a time. Written as crossfading twins they printed "Americas" over
        // "Americas" and "Canada 13.9" over "Canada 13.9 - 4.6x the Americas median", two copies
        // superimposed at partial opacity for the width of the window.
        const accented = isSubject && subject > 0;
        const concluded = isSubject && conclusion > 0;
        return (
          <g key={p.continent}>
            {/* Whisker: one vertical line from whisker-lo to whisker-hi, with caps — the honest
                Tukey rule, never stretched to the raw extreme (`boxplot.md`). */}
            <line
              x1={p.cx}
              x2={p.cx}
              y1={p.yWhiskerLo}
              y2={p.yWhiskerHi}
              stroke={muted}
              strokeWidth={T.STROKE.whisker}
              opacity={groupOpacity[i]}
            />
            <line
              x1={p.cx - WHISKER_CAP / 2}
              x2={p.cx + WHISKER_CAP / 2}
              y1={p.yWhiskerLo}
              y2={p.yWhiskerLo}
              stroke={muted}
              strokeWidth={T.STROKE.whisker}
              opacity={groupOpacity[i]}
            />
            <line
              x1={p.cx - WHISKER_CAP / 2}
              x2={p.cx + WHISKER_CAP / 2}
              y1={p.yWhiskerHi}
              y2={p.yWhiskerHi}
              stroke={muted}
              strokeWidth={T.STROKE.whisker}
              opacity={groupOpacity[i]}
            />
            {/* Box: Q1 to Q3, the one hue every box shares. */}
            <rect
              x={p.cx - g.boxHalfWidth}
              y={p.yQ3}
              width={g.boxHalfWidth * 2}
              height={Math.max(1, p.yQ1 - p.yQ3)}
              fill={accent}
              fillOpacity={0.22}
              stroke={accent}
              strokeWidth={T.STROKE.box}
              opacity={groupOpacity[i]}
            />
            {/* Median: in ink, never the box's own colour (`boxplot.md`). */}
            <line
              x1={p.cx - g.boxHalfWidth}
              x2={p.cx + g.boxHalfWidth}
              y1={p.yMedian}
              y2={p.yMedian}
              stroke={ink}
              strokeWidth={T.STROKE.median}
              opacity={groupOpacity[i]}
            />
            {/* Outlier dots — every point beyond the Tukey fence, drawn individually, never
                absorbed into a longer whisker. */}
            {p.outliers.map((o) => (
              <circle
                key={o.country}
                cx={p.cx}
                cy={o.y}
                r={OUTLIER_R}
                fill={accent}
                stroke={ink}
                strokeWidth={T.STROKE.outlier}
                opacity={groupOpacity[i]}
              />
            ))}
            {/* Plain outlier value labels — only 1-2 per group, so each gets its own
                (`boxplot.md`'s "when a category carries only a handful of outliers, write the
                value"). In ink, never the dot's own hue. The subject's own labels use the
                stacked Y positions computed above (`subjectOutlierLabelY`) so Canada's and the
                US's close values never collide; every other group's outliers are far enough
                apart that the natural position never needs stacking. */}
            {concluded
              ? null
              : p.outliers.map((o) => (
                  <text
                    key={`label-${o.country}`}
                    x={p.cx}
                    y={
                      isSubject
                        ? (subjectOutlierLabelY.get(o.country) ??
                          o.y - OUTLIER_R - T.OUTLIER_LABEL_LIFT)
                        : o.y - OUTLIER_R - T.OUTLIER_LABEL_LIFT
                    }
                    fill={ink}
                    fontSize={OUTLIER_LABEL.fontSize}
                    fontWeight={OUTLIER_LABEL.fontWeight}
                    textAnchor="middle"
                    opacity={groupOpacity[i]}
                  >
                    {o.country} {en(o.value)}
                  </text>
                ))}
            {/* Category label, beneath the box — plain ink, crossfading OUT for the subject as
                its bold accent twin (drawn once, after this loop, so it sits above every column's
                highlight wash) crossfades IN. Every other group's label just stays at
                groupOpacity[i] forever, since categoryOpacity === groupOpacity[i] when
                labelAccentOpacity is never driven for it. */}
            <text
              x={p.cx}
              y={g.plot.bottom + T.CATEGORY_DROP}
              fill={accented ? accent : ink}
              fontSize={
                accented
                  ? CATEGORY_LABEL_ACCENT.fontSize
                  : CATEGORY_LABEL.fontSize
              }
              fontWeight={
                accented
                  ? CATEGORY_LABEL_ACCENT.fontWeight
                  : CATEGORY_LABEL.fontWeight
              }
              textAnchor="middle"
              opacity={groupOpacity[i]}
            >
              {p.continent}
            </text>
            <text
              x={p.cx}
              y={
                g.plot.bottom +
                T.CATEGORY_DROP +
                categoryLabelBaselineOffset +
                T.N_ROW_DROP
              }
              fill={muted}
              fontSize={N_LABEL.fontSize}
              textAnchor="middle"
              opacity={groupOpacity[i]}
            >
              n = {p.n}
            </text>
            {/* Median value, printed beside the box. */}
            <text
              x={p.cx + g.boxHalfWidth + T.MEDIAN_LABEL_GAP}
              y={p.yMedian + MEDIAN_LABEL.fontSize * 0.32}
              fill={ink}
              fontSize={MEDIAN_LABEL.fontSize}
              fontWeight={MEDIAN_LABEL.fontWeight}
              opacity={groupOpacity[i]}
            >
              {en(p.median)}
            </text>
          </g>
        );
      })}

      {/* The subject's ring — pops onto both of Americas' outlier dots once the subject event
          starts. */}
      {ringOpacity > 0
        ? subjectGroup.outliers.map((o) => (
            <circle
              key={`ring-${o.country}`}
              cx={g.points[subjectIndex].cx}
              cy={g.y(o.value)}
              r={ringRadius}
              fill="none"
              stroke={accent}
              strokeWidth={T.STROKE.ring}
              opacity={ringOpacity}
            />
          ))
        : null}

      {/* The conclusion: each Americas outlier's plain value label swaps in place for the "× the
          median" framing — the actual finding, stated once both dots have landed and been rung.
          Same stacked Y positions as the plain label above, so the text never jumps.

          THE DENOMINATOR IS THE SUBJECT GROUP'S OWN MEDIAN, and that is the whole point of the
          beat: "what this box HIDES" is a statement about the Americas' own middle, drawn as the
          median line inside the box these two dots escape from. It used to divide by
          `referenceValue` — the 53-country median on the dashed line — while the title divided by
          the region's median, so the artifact printed "over 4×" above two labels reading 3.8× and
          3.9×. Both were true against their own denominator, which is exactly why nothing caught
          it. `render.mjs` now fails if the title's multiple stops bounding what these labels
          print. */}
      {subjectOutliersSorted.map((o) => (
        <text
          key={`conclusion-${o.country}`}
          x={g.points[subjectIndex].cx}
          y={subjectOutlierLabelY.get(o.country)}
          fill={ink}
          fontSize={OUTLIER_LABEL.fontSize}
          fontWeight={700}
          textAnchor="middle"
          opacity={groupOpacity[subjectIndex] * conclusion}
        >
          {o.country} {en(o.value)} · {en(o.value / subjectGroup.median, 1)}×
          the {subjectContinent} median
        </text>
      ))}
    </svg>
  );

  // EVERY TYPE SIZE THIS FRAME ACTUALLY DRAWS, against the row's own floor — read off the element
  // tree rather than a list of tokens, so a size written bare at a mark cannot escape it.
  assertTypeFloor(
    fontSizesIn(drawing)
      .map((px) => `font-size="${px}"`)
      .join(" "),
    size,
    { what: `vidy-boxplot-co2-by-continent at ${size}` },
  );

  return drawing;
}
