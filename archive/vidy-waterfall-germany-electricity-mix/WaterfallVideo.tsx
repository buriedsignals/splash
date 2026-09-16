/**
 * The video beat of "Germany's electricity generation fell as coal and nuclear losses outpaced
 * renewable growth, 2010–2023." — ~10.5 seconds, 30fps, 1080 × 1080.
 *
 * First waterfall written in this shape. Ten bars: an opening total (2010, full bar from zero),
 * eight signed steps (one per electricity source, each floating from exactly where the previous one
 * ended), and a closing total (2023, full bar from zero). This file's geometry
 * (`waterfallGeometry` below) is a fresh shape, not a copy of any prior beat's — a RUNNING TOTAL
 * walked left to right, not a traced time series or a set of paired rows. `FONT_FAMILY`,
 * `measureText` and `wrap` ARE this story's own copies of the other proof workspaces' functions of
 * the same name — not an import from any of them, per the duplicate-do-not-link rule
 * (`../video-population-growth-dumbbell/DumbbellVideo.tsx`'s file doc-comment explains why: this
 * story lives outside `chart-video`'s skill boundary, and the settled rule for a workspace
 * that needs something a skill has is to duplicate it, not reach back across the boundary).
 * `drawnSoFar` is not copied here — nothing in this beat traces a continuously-drawing path; every
 * bar's edge interpolates between two fixed data values, so there is no partial-path head to
 * compute.
 *
 * 1080×1080 (the corpus's own convention, `DumbbellVideo.tsx`'s square) rather than a wide short
 * frame: ten bars fit comfortably in the ~936px of usable width once padding is subtracted, so
 * there was no real reason to deviate — a wide frame would mostly have bought unused width, not
 * legibility this beat needs.
 *
 * THE MOTION PROBLEM (from `BRIEF.md`): a waterfall's whole point is a running total walked step
 * by step, and the reveal's order is chronological/argumentative BY CONSTRUCTION — this type does
 * NOT get the "maybe a build adds nothing" pass the still-shaped types get. The opening total lands
 * first, as a full bar from zero, doubling as the reference the rest of the bridge is read against
 * (`reference`). Each signed step then floats in, one at a time, left to right, starting exactly
 * where the previous one's bar ended — a connector makes that literal (`reveal`). The closing
 * total — the subject, since the confirmed takeaway is about it — lands as its own distinct final
 * event, again a full bar from zero, so it can be compared directly against the opening bar's
 * height (`subject`). The net change is stated once the closing total is on screen (`conclusion`).
 *
 * COLOUR: the waterfall type doctrine (`chart-beat/references/types/waterfall.md`) requires
 * THREE role colours — increase, decrease, total — where a dumbbell or a single-line beat only ever
 * needs one accent. `BRIEF.md` justifies the Okabe-Ito blue/vermillion pair (CVD-distinguishable,
 * never a plain red/green) and the neutral grey `total` colour (deliberately off that hue axis, so
 * it reads as "the anchor," not a third signed colour). The subject's own emphasis (once the 2023
 * bar lands) is therefore a FOURTH channel that is NOT a fourth hue — an ink outline plus a wash in
 * the already-spent `total` colour, the same "third channel, never a third hue" device
 * `../video-population-growth-dumbbell/DumbbellVideo.tsx`'s doc-comment names for its own subject
 * emphasis.
 *
 * VALUE LABELS: never painted inside a bar's own fill — `waterfall.md` names this exact trap by
 * name (a white label on a bright decrease fill measuring under 4:1), and
 * `doctrine/references/visual-system.md` independently documents the same defect having
 * shipped and been fixed on "waterfall's own value labels" before. Every value label here floats
 * just outside the bar's CURRENTLY-ANIMATING edge, in `ink`, computed against the page ground —
 * never inherited from whichever of the three role colours the bar underneath happens to be. Each
 * label fades in within the first quarter of its own bar's local reveal window and then RIDES the
 * growing tip's position as the bar continues to extend, rather than gating on the last slice of
 * the growth — `visual-system.md` and `chart-beat/references/types/diverging-bar.md` both name
 * the opposite (gate-on-last-slice) as an already-shipped-and-fixed defect: "a label that only
 * appears once a bar is fully grown is a label that's absent for most of the time the bar is on
 * screen."
 */

import { scaleBand, scaleLinear } from "d3-scale";
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
// The VIDEO format's own size table — its landscape row carries a 30px legibility floor and a 2.5
// type scale where the static skill's carries 26 and 2.2, because a 16:9 video is watched on a
// phone turned sideways (~800 dp) and a static landscape sits in a ~900 px article column.
import {
  assertTypeFloor,
  frameInsetFor,
  sizeFor,
  stageFor,
} from "#shared/chart-video/sizes.mjs";
// Whether this TYPE may enter that size is a fact about the type, not about the craft, so both
// formats read one copy. A waterfall has no measured aspect range at a tall frame and no twin form —
// its bars sit on a RUNNING TOTAL, so rotating it would put a cumulative axis on a band scale — so
// the two phone frames are refused by name rather than drawn at a shape nobody measured.
import { assertTypeMayEnter } from "#shared/chart-beat/type-at-size.mjs";
import { WATERFALL_TIMING } from "./timing-contract";

export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

/** The chart type this beat draws, in `references/types/` vocabulary. Read by `formForSize`. */
export const TYPE = "waterfall";

/**
 * THE 900x560 TUNING, KEPT AS THE BASE, WITH THE SIZE AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more. The frame is `sizeFor(size)`'s, and `size` is the decision
 * gate 2c took, read out of this beat's own `BRIEF.md` and carried onto the composition by
 * `Root.tsx`. The shipped values were 1080-frame tuning, divided so the SMALLEST token lands at 12
 * — the number every row's `typeScale` in `chart-video/scripts/sizes.mjs` is derived from.
 *
 * EVERY SPACING NUMBER GOES THROUGH `sp`, including the rotated label's own strip and its width
 * cap: those are measured in pixels of a frame, and leaving them at 1080 values while the type grew
 * is exactly how a rotated label starts truncating words it used to fit. `PAD` is the one
 * exception: a frame's margin is proportional to the CANVAS, not to the type (`frameInsetFor`).
 */
const BASE = {
  TITLE: { fontSize: 21, fontWeight: 700, lead: 28 },
  SOURCE: { fontSize: 12, fontWeight: 400 },
  LEGEND: { fontSize: 13, fontWeight: 600 },
  CATEGORY_LABEL: { fontSize: 12, fontWeight: 500 },
  CATEGORY_LABEL_ACCENT: { fontSize: 12, fontWeight: 700 },
  VALUE_LABEL: { fontSize: 12, fontWeight: 600 },
  CONCLUSION_LABEL: { fontSize: 13, fontWeight: 700 },
  MAX_CATEGORY_LABEL_WIDTH: 88,
  CATEGORY_STRIP: 64,
  LABEL_GAP: 7,
  CONCLUSION_LEAD: 16,
  /** Air under the last title line, before the legend. */
  TITLE_TO_LEGEND: 25,
  /** Air under the legend, before the plot. */
  LEGEND_TO_PLOT: 40,
  /** Air between the category strip and the credit's ink. */
  STRIP_TO_SOURCE: 7,
  /** The legend's own dot radius, its gap to the label, and the gap between entries. */
  LEGEND_DOT_R: 5,
  LEGEND_DOT_GAP: 15,
  LEGEND_ENTRY_GAP: 23,
  /** The drop from the plot's floor to the rotated category strip. */
  CATEGORY_DROP: 13,
  /** How far the closing total's outline stands off its own bar. */
  OUTLINE_STANDOFF: 9,
  /** Ink widths. A stroke is proportional to the canvas the way a gap is, so it scales too. */
  CONNECTOR_STROKE: 1.3,
  OUTLINE_STROKE: 2,
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
    LEGEND: f(BASE.LEGEND) as typeof BASE.LEGEND,
    CATEGORY_LABEL: f(BASE.CATEGORY_LABEL) as typeof BASE.CATEGORY_LABEL,
    CATEGORY_LABEL_ACCENT: f(
      BASE.CATEGORY_LABEL_ACCENT,
    ) as typeof BASE.CATEGORY_LABEL_ACCENT,
    VALUE_LABEL: f(BASE.VALUE_LABEL) as typeof BASE.VALUE_LABEL,
    CONCLUSION_LABEL: f(BASE.CONCLUSION_LABEL) as typeof BASE.CONCLUSION_LABEL,
    MAX_CATEGORY_LABEL_WIDTH: sp(BASE.MAX_CATEGORY_LABEL_WIDTH),
    CATEGORY_STRIP: sp(BASE.CATEGORY_STRIP),
    LABEL_GAP: sp(BASE.LABEL_GAP),
    CONCLUSION_LEAD: sp(BASE.CONCLUSION_LEAD),
    TITLE_TO_LEGEND: sp(BASE.TITLE_TO_LEGEND),
    LEGEND_TO_PLOT: sp(BASE.LEGEND_TO_PLOT),
    STRIP_TO_SOURCE: sp(BASE.STRIP_TO_SOURCE),
    LEGEND_DOT_R: sp(BASE.LEGEND_DOT_R),
    LEGEND_DOT_GAP: sp(BASE.LEGEND_DOT_GAP),
    LEGEND_ENTRY_GAP: sp(BASE.LEGEND_ENTRY_GAP),
    CATEGORY_DROP: sp(BASE.CATEGORY_DROP),
    OUTLINE_STANDOFF: sp(BASE.OUTLINE_STANDOFF),
    CONNECTOR_STROKE: Math.max(1, sp(BASE.CONNECTOR_STROKE)),
    OUTLINE_STROKE: Math.max(1, sp(BASE.OUTLINE_STROKE)),
  };
}

/** Category labels rotate to fit ten bars in the available width — the type doctrine's own
 *  guidance ("truncate from the end... give the rotated label a bounded strip of vertical room"). */
const ROTATION_DEG = -34;
/** Where inside the `conclusion` window the base value label has finished leaving and the
 *  conclusion block starts arriving — they never share a frame. */
const CONCLUSION_HANDOVER = 0.5;
/** The minimum clear space between one bar's label and the neighbouring bar's own column. */
const LABEL_CLEARANCE = 10;

export type WaterfallStepKind = "total" | "increase" | "decrease";

export type WaterfallStep = {
  id: string;
  label: string;
  kind: WaterfallStepKind;
  /** The delta for an increase/decrease step; the absolute total for a "total" bar. */
  value: number;
  /** The running total this bar starts from — 0 for a "total" bar, drawn as a full bar from zero. */
  runningBefore: number;
  /** The running total this bar ends at. */
  runningAfter: number;
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

/** Truncates from the END, keeping the readable start — `waterfall.md`'s own rule for a category
 *  label that doesn't fit even rotated, rather than letting it overrun its bounded strip. */
export function truncateToWidth(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string {
  if (measureText(text, font) <= maxWidth) return text;
  let end = text.length;
  while (end > 1 && measureText(`${text.slice(0, end)}…`, font) > maxWidth)
    end--;
  return `${text.slice(0, end)}…`;
}

/** Absolute value, fixed decimals, no sign — for the two "total" bars, which are always positive
 *  and get an absolute label per the type doctrine. */
export function en(value: number, decimals = 2): string {
  return Math.abs(value).toFixed(decimals);
}

/** Explicitly signed, fixed decimals — every delta bar gets a `+` or `−`, never a bare number,
 *  per the type doctrine's "every delta carries a signed label." */
export function signed(value: number, decimals = 2): string {
  const sign = value < 0 ? "−" : "+";
  return `${sign}${Math.abs(value).toFixed(decimals)}`;
}

/**
 * Data to coordinates. Pure — no colour, no font, no React. A fresh shape: the x domain is ten
 * ordered categories (`scaleBand`), the y domain is a running total ([0, the highest running total
 * the bridge ever reaches] — NOT just the higher of the two ends, since the bridge can overshoot
 * both of them mid-walk, which it does here: the renewables climb the running total to 795.90
 * before the fossil/nuclear steps bring it back down to 506.72). Bars are position-AND-length
 * encoded (unlike the dumbbell's pure position encoding): the count axis has to start at zero
 * (`waterfall.md`), so `y`'s domain always includes 0.
 */
export function waterfallGeometry(
  steps: WaterfallStep[],
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

  const maxValue = Math.max(
    0,
    ...steps.flatMap((s) => [s.runningBefore, s.runningAfter]),
  );
  const y = scaleLinear()
    .domain([0, maxValue])
    .nice()
    .range([plot.bottom, plot.top]);
  const x = scaleBand<string>()
    .domain(steps.map((s) => s.id))
    .range([plot.left, plot.right])
    .paddingInner(0.42)
    .paddingOuter(0.14);

  const bandwidth = x.bandwidth();
  const bars = steps.map((s) => {
    const barX = x(s.id) ?? 0;
    return {
      ...s,
      x: barX,
      centerX: barX + bandwidth / 2,
      width: bandwidth,
      anchorY: y(s.runningBefore),
      finalY: y(s.runningAfter),
    };
  });

  const connectors = bars.slice(0, -1).map((bar, i) => ({
    x1: bar.x + bar.width,
    x2: bars[i + 1].x,
    y: y(bar.runningAfter),
  }));

  return { plot, x, y, bandwidth, bars, connectors };
}

export type WaterfallVideoProps = {
  /** Story order, never resorted by magnitude: [opening total, ...signed steps, closing total]. */
  data: WaterfallStep[];
  title: string;
  source: string;
  ground: string;
  ink: string;
  muted: string;
  grid: string;
  increase: string;
  decrease: string;
  total: string;
  /** ["Increase", "Decrease", "Total"] — a waterfall needs three swatches, a dumbbell only two. */
  legendLabels: [string, string, string];
  unit: string;
  /** The size gate 2c pinned, read from this beat's own `BRIEF.md`. Not a default. */
  size: string;
  timing?: BeatTiming;
};

export function WaterfallVideo({
  data,
  title,
  source,
  ground,
  ink,
  muted,
  increase,
  decrease,
  total,
  legendLabels,
  unit,
  size,
  timing = WATERFALL_TIMING,
}: WaterfallVideoProps) {
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
    LEGEND,
    CATEGORY_LABEL,
    CATEGORY_LABEL_ACCENT,
    VALUE_LABEL,
    CONCLUSION_LABEL,
    MAX_CATEGORY_LABEL_WIDTH,
    CATEGORY_STRIP,
    LABEL_GAP,
    CONCLUSION_LEAD,
  } = T;

  // WHETHER THIS TYPE MAY ENTER THIS SIZE AT ALL, before anything is measured.
  assertTypeMayEnter(TYPE, size, {
    what: "vidy-waterfall-germany-electricity-mix",
  });

  if (data.length < 3)
    throw new Error(
      `need at least an opening total, one step and a closing total, got ${data.length} bars`,
    );
  if (data[0].kind !== "total" || data[data.length - 1].kind !== "total")
    throw new Error(
      "the first and last bars must be the true totals (waterfall.md)",
    );
  const openBar = data[0];
  const closeBar = data[data.length - 1];
  const middle = data.slice(1, -1);

  const colourFor = (kind: WaterfallStepKind) =>
    kind === "total" ? total : kind === "increase" ? increase : decrease;

  // ── Layout. Identical at every frame: the build changes what is visible, never where anything
  // sits, so nothing shifts when a bar arrives late.
  const contentTop = stage.reserved ? stage.top : PAD;
  // Named `sourceBottom` rather than something generic because it IS the credit's own anchor, and
  // `credit-anchors-to-the-frame-bottom.test.ts` follows that name through the chain: the credit has
  // to resolve to the frame's own height minus something, never to a header rung. At portrait the
  // bottom it names is the STAGE's — below that band sit the platform's caption and progress bar,
  // and a covered credit is an attribution failure, not a cosmetic one.
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = contentTop + TITLE.fontSize;
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN, not under the title — `height - PAD`, the
  // same inset the title hangs off at the top, on the same x. It stays inside the furniture
  // opacity group, so no timing contract moves. See
  // chart-beat/references/static-discipline.md, "The source on the frame's bottom margin".
  const sourceBaseline = sourceBottom;
  // The legend keeps the air it always had above it, measured from the LAST TITLE line rather
  // than from the source, which is no longer in the header.
  const legendBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + T.TITLE_TO_LEGEND;

  // The opening and closing bars sit at the very edges of the plot — their centre-anchored value
  // labels can be wider than the bar itself, and the closing total's CONCLUSION label ("506.72 TWh
  // · net −117.49 TWh") is wider still. `measureText` is the same "measured, not guessed" contract
  // this codebase's own `measureText` doc-comment names: a wrong measurement clips, silently, in
  // the rendered PNG — which is exactly the defect a first render of this beat shipped (the
  // conclusion label ran off the right edge of the frame) before this gutter was measured instead
  // of assumed. Reserving `padding.left`/`.right` at least as wide as half of each edge label's own
  // measured width guarantees neither can ever run past the canvas, regardless of the bar's exact
  // band position.
  const openValueText = `${en(openBar.runningAfter)} ${unit}`;
  const closeValueText = `${en(closeBar.runningAfter)} ${unit}`;
  const netChange = closeBar.runningAfter - openBar.runningAfter;
  // The conclusion is TWO clauses — the level the bridge lands on, and the net move that got it
  // there — and it is drawn as two lines, split on that seam rather than by greedy wrapping. As one
  // 268.75px line centred on the closing bar it was 49px wider than the whole right end of the plot
  // and its first clause was drawn INSIDE the Coal bar's own vermillion fill (measured on the
  // delivered mp4's final frame: 286 dark glyph pixels inside the rect x 794–843, y 406–513), which
  // is the exact trap `BRIEF.md:112` forbids — "value labels never sit inside a bar's own fill".
  // Two lines right-anchored to the frame's own margin bring the widest line down to 148.37px, which
  // fits in the space right of the last delta bar; `conclusionClearance` below proves it rather than
  // assuming it.
  const conclusionLines = [
    `${en(closeBar.runningAfter)} ${unit} ·`,
    `net ${signed(netChange)} ${unit}`,
  ];
  const conclusionBlockWidth = Math.max(
    ...conclusionLines.map((line) => measureText(line, CONCLUSION_LABEL)),
  );
  const leftGutter = measureText(openValueText, VALUE_LABEL) / 2;
  // Two different reservations, for two labels anchored two different ways. The closing bar's own
  // value label is CENTRED on that bar, so half of it hangs past the plot's right edge. The
  // conclusion block is right-anchored at the frame margin and cannot overrun the canvas at all —
  // what it needs from this reservation is the opposite thing: enough right margin that the block's
  // LEFT edge stays clear of the last delta bar, so reserving its own width is what buys that room.
  const rightGutter = Math.max(
    measureText(closeValueText, VALUE_LABEL) / 2,
    conclusionBlockWidth,
  );

  const padding = {
    top: legendBaseline + T.LEGEND_TO_PLOT,
    right: Math.max(PAD, rightGutter),
    // Grown by the credit's own height plus clear air, and measured DOWN FROM the credit's own
    // baseline rather than up from the frame's foot, so the portrait stage moves the plot with it.
    bottom:
      height - sourceBottom + CATEGORY_STRIP + SOURCE.fontSize + T.STRIP_TO_SOURCE,
    left: Math.max(PAD, leftGutter),
  };

  // EVERY TYPE SIZE THIS FRAME ACTUALLY DRAWS, against the row's own floor.
  assertTypeFloor(
    [
      TITLE.fontSize,
      SOURCE.fontSize,
      LEGEND.fontSize,
      CATEGORY_LABEL.fontSize,
      CATEGORY_LABEL_ACCENT.fontSize,
      VALUE_LABEL.fontSize,
      CONCLUSION_LABEL.fontSize,
    ]
      .map((px) => `font-size="${px}"`)
      .join(" "),
    size,
    { what: `vidy-waterfall-germany-electricity-mix at ${size}` },
  );

  const g = waterfallGeometry(data, { width, height, padding });

  // Both of the closing bar's labels have to clear the bar standing immediately to their left. This
  // is measured against the geometry that was actually produced, not against the reservation that
  // asked for it, and it throws rather than drawing over a bar — a silently overprinted label is
  // the defect this beat shipped, and a render that fails loud is the only thing that cannot ship it
  // twice.
  const closeBarGeometry = g.bars[g.bars.length - 1];
  const lastDeltaBar = g.bars[g.bars.length - 2];
  const lastDeltaRight = lastDeltaBar.x + lastDeltaBar.width;
  const conclusionRightAnchor = width - PAD;
  const conclusionBlockLeft = conclusionRightAnchor - conclusionBlockWidth;
  const closeValueLeft =
    closeBarGeometry.centerX - measureText(closeValueText, VALUE_LABEL) / 2;
  for (const [what, left] of [
    ["the conclusion block", conclusionBlockLeft],
    ["the closing total's value label", closeValueLeft],
  ] as const)
    if (left < lastDeltaRight + LABEL_CLEARANCE)
      throw new Error(
        `${what} starts at x=${left.toFixed(2)}, inside the ${lastDeltaBar.label} bar's own column ` +
          `(right edge x=${lastDeltaRight.toFixed(2)}, clearance ${LABEL_CLEARANCE}px) — it would be ` +
          `drawn on that bar's fill`,
      );

  // ── The edit. Six windows, all read off the timing contract — no frame literal below.
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
  // `motion-grammar.md`'s "the conclusion appears only after its evidence" governs assertions, not
  // the title. The three-swatch legend still fades in over `establish` — it names roles that no
  // bar carries yet.
  const axisOpacity = establish;

  // How far through step `i`'s own arrival window the master `reveal` progress is, 0..1, already
  // eased — the same value drives that step's connector fade, bar growth AND value-label position,
  // so nothing computes its own out-of-step easing.
  const stepLocal = (i: number, count: number) => {
    const span = 1 / count;
    const start = i * span;
    const dur = span * 1.6;
    return interpolate(reveal, [start, Math.min(1, start + dur)], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
  };
  const middleLocal = middle.map((_, i) => stepLocal(i, middle.length));

  /** The bar's own currently-animating value — anchor at progress 0, final at progress 1. Used
   *  both for the rect's growing edge and for the value label's position, so the label rides the
   *  tip exactly rather than computing a second, independently-derived position. */
  const animatedValue = (
    anchor: number,
    finalValue: number,
    localProgress: number,
  ) =>
    interpolate(localProgress, [0, 1], [anchor, finalValue], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });

  const openCurrent = g.y(
    animatedValue(0, openBar.runningAfter, referenceProgress),
  );
  const closeCurrent = g.y(
    animatedValue(0, closeBar.runningAfter, subjectProgress),
  );
  const middleCurrent = middle.map((bar, i) =>
    g.y(animatedValue(bar.runningBefore, bar.runningAfter, middleLocal[i])),
  );

  // The subject's own third-channel emphasis (never a fourth hue) — critically damped, same device
  // every prior beat's landing mark uses: an overshoot would show, for a few frames, more emphasis
  // than the finding warrants.
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const outlineOpacity = interpolate(subjectSpring, [0, 1], [0, 1]);
  const washOpacity = interpolate(subjectSpring, [0, 1], [0, 0.12]);
  // The closing category label crossfades to bold, gated on the SUBJECT event's OWN progress (not
  // the master reveal signal) — `motion-grammar.md`'s "a label's reveal gates on its own mark,
  // never on a master clock."
  const closeLabelAccent = interpolate(subjectProgress, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  const rowLabelBaselineOffset = CATEGORY_LABEL.fontSize * 0.32;

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
        <text
          x={PAD}
          y={sourceBaseline}
          fill={muted}
          fontSize={SOURCE.fontSize}
        >
          {source}
        </text>
      </g>

      {/* The three-role legend — load-bearing, not decorative: without it a reader has no way
          to read a bar's colour as "grew" vs "shrank" vs "the anchor." Faded in over `establish`
          rather than present at frame 0. */}
      <g opacity={axisOpacity}>
        {(() => {
          const swatches: Array<[string, string]> = [
            [legendLabels[0], increase],
            [legendLabels[1], decrease],
            [legendLabels[2], total],
          ];
          let cursor = PAD;
          return swatches.map(([label, colour]) => {
            const cx = cursor + T.LEGEND_DOT_R;
            const textX = cursor + T.LEGEND_DOT_GAP + T.LEGEND_DOT_R;
            const labelWidth = measureText(label, LEGEND);
            cursor = textX + labelWidth + T.LEGEND_ENTRY_GAP;
            return (
              <g key={label}>
                <circle cx={cx} cy={legendBaseline - T.LEGEND_DOT_R} r={T.LEGEND_DOT_R} fill={colour} />
                <text
                  x={textX}
                  y={legendBaseline}
                  fill={ink}
                  fontSize={LEGEND.fontSize}
                  fontWeight={LEGEND.fontWeight}
                >
                  {label}
                </text>
              </g>
            );
          });
        })()}
      </g>

      {/* Connectors — each linking a bar's end to the next bar's start, gated on the LATER bar's
          own arrival so a connector never appears before the level it's pointing into exists. */}
      {g.connectors.map((c, i) => {
        const laterOpacity =
          i === g.connectors.length - 1
            ? interpolate(subjectProgress, [0, 0.2], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            : i === 0
              ? interpolate(middleLocal[0], [0, 0.2], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
              : interpolate(middleLocal[i], [0, 0.2], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
        return (
          <line
            key={`connector-${i}`}
            x1={c.x1}
            x2={c.x2}
            y1={c.y}
            y2={c.y}
            stroke={muted}
            strokeWidth={T.CONNECTOR_STROKE}
            strokeDasharray="5 5"
            opacity={laterOpacity}
          />
        );
      })}

      {/* The 2010 opening total — a full bar from zero, doubling as the reference the rest of the
          bridge is read against. */}
      {referenceProgress > 0 ? (
        <g>
          <rect
            x={g.bars[0].x}
            y={openCurrent}
            width={g.bars[0].width}
            height={g.plot.bottom - openCurrent}
            fill={total}
          />
          <text
            x={g.bars[0].centerX}
            y={openCurrent - LABEL_GAP}
            fill={ink}
            fontSize={VALUE_LABEL.fontSize}
            fontWeight={VALUE_LABEL.fontWeight}
            textAnchor="middle"
            opacity={interpolate(referenceProgress, [0, 0.25], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            {openValueText}
          </text>
          <text
            x={g.bars[0].centerX}
            y={g.plot.bottom + T.CATEGORY_DROP}
            fill={ink}
            fontSize={CATEGORY_LABEL.fontSize}
            fontWeight={CATEGORY_LABEL.fontWeight}
            textAnchor="end"
            transform={`rotate(${ROTATION_DEG} ${g.bars[0].centerX} ${g.plot.bottom + T.CATEGORY_DROP})`}
            opacity={interpolate(referenceProgress, [0, 0.3], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            {truncateToWidth(
              openBar.label,
              MAX_CATEGORY_LABEL_WIDTH,
              CATEGORY_LABEL,
            )}
          </text>
        </g>
      ) : null}

      {/* The eight signed steps — one at a time, left to right, each floating from exactly where
          the previous one ended. Never resorted by magnitude: `data`'s own order IS the story
          order (`render.mjs`'s job, not this component's). */}
      {middle.map((bar, i) => {
        const local = middleLocal[i];
        if (local <= 0) return null;
        const current = middleCurrent[i];
        const top = Math.min(g.bars[i + 1].anchorY, current);
        const bottom = Math.max(g.bars[i + 1].anchorY, current);
        const labelAbove = bar.kind !== "decrease";
        const valueOpacity = interpolate(local, [0, 0.25], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const categoryOpacity = interpolate(local, [0, 0.3], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <g key={bar.id}>
            <rect
              x={g.bars[i + 1].x}
              y={top}
              width={g.bars[i + 1].width}
              height={Math.max(1, bottom - top)}
              fill={colourFor(bar.kind)}
              opacity={local}
            />
            <text
              x={g.bars[i + 1].centerX}
              y={
                labelAbove
                  ? current - LABEL_GAP
                  : current + LABEL_GAP + VALUE_LABEL.fontSize * 0.8
              }
              fill={ink}
              fontSize={VALUE_LABEL.fontSize}
              fontWeight={VALUE_LABEL.fontWeight}
              textAnchor="middle"
              opacity={valueOpacity}
            >
              {signed(bar.value)}
            </text>
            <text
              x={g.bars[i + 1].centerX}
              y={g.plot.bottom + T.CATEGORY_DROP}
              fill={ink}
              fontSize={CATEGORY_LABEL.fontSize}
              fontWeight={CATEGORY_LABEL.fontWeight}
              textAnchor="end"
              transform={`rotate(${ROTATION_DEG} ${g.bars[i + 1].centerX} ${g.plot.bottom + T.CATEGORY_DROP})`}
              opacity={categoryOpacity}
            >
              {truncateToWidth(
                bar.label,
                MAX_CATEGORY_LABEL_WIDTH,
                CATEGORY_LABEL,
              )}
            </text>
          </g>
        );
      })}

      {/* The 2023 closing total — the subject. Lands only once every step has (`subject.start`
          cannot precede `reveal`'s end — structural, not just editorial intent), as its own full
          bar from zero so it can be compared directly against the opening bar's height. */}
      {subjectProgress > 0 ? (
        <g>
          {/* The subject's wash, behind the bar — a third channel, never a third hue. */}
          {washOpacity > 0 ? (
            <rect
              x={g.bars[g.bars.length - 1].x - T.OUTLINE_STANDOFF}
              y={g.plot.top}
              width={g.bars[g.bars.length - 1].width + T.OUTLINE_STANDOFF * 2}
              height={g.plot.bottom - g.plot.top}
              fill={total}
              opacity={washOpacity}
            />
          ) : null}
          <rect
            x={g.bars[g.bars.length - 1].x}
            y={closeCurrent}
            width={g.bars[g.bars.length - 1].width}
            height={g.plot.bottom - closeCurrent}
            fill={total}
          />
          {outlineOpacity > 0 ? (
            <rect
              x={g.bars[g.bars.length - 1].x}
              y={closeCurrent}
              width={g.bars[g.bars.length - 1].width}
              height={g.plot.bottom - closeCurrent}
              fill="none"
              stroke={ink}
              strokeWidth={T.OUTLINE_STROKE}
              opacity={outlineOpacity}
            />
          ) : null}
          {/* The base total label. It hands OVER to the conclusion rather than crossfading with it,
              and that is a consequence of the layout fix above rather than a preference: the two
              labels no longer share an anchor, so any frame that showed both showed two different
              strings superimposed. Rendering the first draft of this fix proved it — frame 245 of
              the mp4 printed "506.72 TWh" and "net −117.49 TWh" on top of each other, unreadable,
              for a full second. The base label is therefore gone by the halfway point of
              `conclusion` and the block only starts appearing there, so no frame carries both. */}
          <text
            x={g.bars[g.bars.length - 1].centerX}
            y={closeCurrent - LABEL_GAP}
            fill={ink}
            fontSize={VALUE_LABEL.fontSize}
            fontWeight={VALUE_LABEL.fontWeight}
            textAnchor="middle"
            opacity={
              interpolate(subjectProgress, [0, 0.25], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }) *
              interpolate(conclusion, [0, CONCLUSION_HANDOVER], [1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            }
          >
            {closeValueText}
          </text>
          {/* The conclusion, right-anchored to the frame's own margin and stacked upward from the
              base label's baseline, so its last line keeps that baseline. Right-anchored rather than
              centred on the bar because centred is what put its first clause inside the Coal bar —
              see the layout block above. */}
          {conclusionLines.map((line, i) => (
            <text
              key={line}
              x={conclusionRightAnchor}
              y={
                closeCurrent -
                LABEL_GAP -
                (conclusionLines.length - 1 - i) * CONCLUSION_LEAD
              }
              fill={ink}
              fontSize={CONCLUSION_LABEL.fontSize}
              fontWeight={CONCLUSION_LABEL.fontWeight}
              textAnchor="end"
              opacity={interpolate(
                conclusion,
                [CONCLUSION_HANDOVER, 1],
                [0, 1],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.out(Easing.cubic),
                },
              )}
            >
              {line}
            </text>
          ))}
          <text
            x={g.bars[g.bars.length - 1].centerX}
            y={g.plot.bottom + T.CATEGORY_DROP}
            fill={ink}
            fontSize={CATEGORY_LABEL_ACCENT.fontSize}
            fontWeight={CATEGORY_LABEL_ACCENT.fontWeight}
            textAnchor="end"
            transform={`rotate(${ROTATION_DEG} ${g.bars[g.bars.length - 1].centerX} ${g.plot.bottom + T.CATEGORY_DROP})`}
            opacity={interpolate(subjectProgress, [0, 0.3], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            {truncateToWidth(
              closeBar.label,
              MAX_CATEGORY_LABEL_WIDTH,
              CATEGORY_LABEL_ACCENT,
            )}
          </text>
        </g>
      ) : null}
    </svg>
  );
}
