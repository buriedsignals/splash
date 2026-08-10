/**
 * The video beat of "In 2023, more countries reach 75-to-80 years of life expectancy than any
 * other five-year span." — 7.6 seconds, 30fps, 1080 × 1080.
 *
 * First histogram written in this shape. One continuous variable (life expectancy at birth, one
 * reading per country) binned into eight contiguous five-year bands — not a time series and not
 * ten independent rows, so this file's geometry (`histogramGeometry` below) is a fresh shape, not
 * a copy of any prior beat's `crossingGeometry` / `migrationGeometry` / `lifeExpectancyGeometry` /
 * `dumbbellGeometry`. `FONT_FAMILY`, `measureText` and `wrap` ARE this story's own copies of the
 * other proof workspaces' functions of the same name — not an import from any of them, per the
 * duplicate-do-not-link rule (this story lives outside `chart-video`'s skill boundary, and
 * the settled rule for a workspace that needs something a skill has is to duplicate it, not reach
 * back across the boundary). `drawnSoFar` is NOT copied here — nothing in this beat traces a
 * continuously-drawing path; every bar grows in place from a fixed baseline, so there is no
 * partial-path head to compute.
 *
 * THE MOTION JUDGEMENT (from `BRIEF.md`): a histogram's bins carry no order beyond their position
 * on the variable's own axis — bin 3 is not "before" bin 4 the way 1994 is before 1995, and it is
 * not "ranked above" it the way a sorted dumbbell row is. Staggering the bars in by index would
 * assert a sequence the data does not contain (`motion-grammar.md`'s "the order is chronological,
 * or it is argumentative — never arbitrary"). So the honest build here is smaller than the
 * dumbbell's ten-row cascade: the median reference line lays down the rule the distribution is
 * read against, all eight bars rise together as ONE build (a single shared progress value, not
 * eight staggered ones), and only then does the bin the finding is actually about — 75-to-80
 * years, the tallest bar in the set — land its own emphasis as a distinct final event. A build
 * that invented per-bar staggering here would be motion for its own sake, not an argument; a
 * build with no order in it at all would have skipped a real one (the reference-then-evidence
 * pause, the subject's separation). This is the honest middle the data actually supports.
 *
 * COLOUR: the histogram type doctrine (`chart-beat/references/types/histogram.md`) reserves
 * a value label's accent for the median mark alone ("a color that's safe on a shape is not
 * automatically safe as a label... reserve the accent color for the mark itself, not the number
 * next to it") and caps the chart at one semantic accent overall (`motion-grammar.md`'s "the one
 * semantic accent"). All eight bars share the SAME neutral fill (`muted`) — a histogram's bars are
 * one series, not several, so there is no second hue to assign the way the dumbbell split
 * 2000-vs-2023. The median rule USED to be drawn in `muted` too, on the reasoning that a reference
 * line borrows the furniture's neutral — and that produced a rule at **1.00:1 against the bars it
 * crosses**, i.e. an invisible one, which is what the owner reported as B6.4a: extracting frame 131
 * of the committed mp4 shows the dashed rule stopping dead at the top of the 75–80 bar. Its ink is
 * now DERIVED from the marks it is drawn over (`annotation-ink.mjs`, SC 1.4.11's 3:1 for a non-text
 * mark), exactly as the static sibling `../static-carbon-footprint-spread` derives its own. That
 * answer is `#000000` at 3.39:1 over the `#616161` bars and 4.25:1 over the accent one — near-black
 * rather than neutral-grey, which looks like a regression against the "furniture is muted" habit and
 * is not one: a rule nobody can see is not carrying the furniture either.
 * `accent` is spent exactly once: the subject bin's fill crossfades from `muted` to
 * `accent` once every bar has landed. Every text label — axis ticks, the median's caption, the
 * subject bin's count, the conclusion sentence — renders in `ink` or `muted`, never in `accent`,
 * per the type doctrine's own accessibility note: an Okabe-Ito-safe *mark* colour measured under
 * the 4.5:1 text floor when reused as a label in the case that note documents.
 *
 * VALUE LABELS: the type doctrine's "if the median gets a value label, render it in ink" is
 * honoured by `referenceLabel` below. The subject bin gets an outer value label too — its count,
 * the one number in this chart that is not printed on every bar (printing "how many countries" on
 * all eight bars when only one bin's count is the finding would be `anti-patterns.md`'s "repeated
 * years or values" eight times over, not eight new facts) — using the same two-stage label
 * technique `../video-population-growth-dumbbell/DumbbellVideo.tsx`'s gap-extension and
 * `EmissionsVideo.tsx`'s `endLabel` both use: a short label at `subject`, extended in place into
 * the full sentence at `conclusion`.
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
// The VIDEO genre's own size table — its landscape row carries a 30px legibility floor and a 2.5
// type scale where the static skill's carries 26 and 2.2, because a 16:9 video is watched on a
// phone turned sideways (~800 dp) and a static landscape sits in a ~900 px article column.
import {
  assertTypeFloor,
  frameInsetFor,
  sizeFor,
  stageFor,
} from "#shared/chart-video/sizes.mjs";
// Whether this TYPE may enter that size is a fact about the type, not about the craft, so both
// genres read one copy. A histogram's x is a CONTINUUM, so it has no twin form to transpose into;
// what it has is a measured aspect range, and outside it the distribution stops being a shape.
import {
  assertPlotAspect,
  assertTypeMayEnter,
} from "#shared/chart-beat/type-at-size.mjs";
import { HISTOGRAM_TIMING } from "./timing-contract";

export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

/** The chart type this beat draws, in `references/types/` vocabulary. Read by `formForSize`. */
export const TYPE = "histogram";

/**
 * THE 900x560 TUNING, KEPT AS THE BASE, WITH THE SIZE AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more. The frame is `sizeFor(size)`'s, and `size` is the decision
 * gate 2c took, read out of this beat's own `BRIEF.md` by `render.mjs` and carried onto the
 * composition by `Root.tsx`. The shipped values were 1080-frame tuning; they are divided by that
 * frame's own 1.20 over the 900-wide convention, so the smallest token lands at 12 — the number
 * every row's `typeScale` in `chart-video/scripts/sizes.mjs` is derived from.
 *
 * EVERY SPACING NUMBER GOES THROUGH `sp`, not only the fonts. `PAD` is the one exception: a frame's
 * margin is proportional to the CANVAS, not to the type (`frameInsetFor`).
 */
const BASE = {
  TITLE: { fontSize: 24, fontWeight: 700, lead: 30 },
  SOURCE: { fontSize: 13, fontWeight: 400 },
  AXIS_NOTE: { fontSize: 13, fontWeight: 600 },
  TICK_LABEL: { fontSize: 12, fontWeight: 400 },
  NOTE: { fontSize: 13, fontWeight: 400 },
  VALUE_LABEL: { fontSize: 17, fontWeight: 700 },
  CONCLUSION_LABEL: { fontSize: 15, fontWeight: 600 },
  /** The median rule's weight and dash. Its INK is deliberately NOT here: it is derived from the
   *  marks the rule is drawn over, every render, which is the whole point of `annotation-ink.mjs`. */
  MEDIAN_RULE: { width: 1.5, dash: 5 },
  /** The air between the median caption's baseline and the top of the plot. It is what keeps the
   *  caption on the page rather than on a bar, and the assertion below measures it rather than
   *  trusting it. */
  MEDIAN_CAPTION_LIFT: 9,
  /** Air under the last title line, before the axis note. */
  TITLE_TO_AXIS_NOTE: 28,
  /** Air under the axis note, before the plot. */
  AXIS_NOTE_TO_PLOT: 26,
  /** The plot's own side air, inside the frame margin. */
  PLOT_SIDE_AIR: 5,
  /** The band under the axis holding the tick row and the unit line. */
  UNDER_AXIS_BAND: 35,
  /** Air between that band and the credit's ink. */
  BAND_TO_SOURCE: 17,
  /** The drop from the axis to a tick label's own row. */
  TICK_DROP: 5,
  /** Air between the tick row and the unit line under it. */
  TICK_TO_UNIT: 6,
  /** How far above the subject bar its two labels sit. */
  SUBJECT_LABEL_LIFT: 11,
  /** Ink widths. A stroke is proportional to the canvas the way a gap is, so it scales too. */
  AXIS_STROKE: 1.5,
  TICK_STROKE: 1.2,
  SUBJECT_STROKE: 2,
};

/**
 * The base, at the size's own multiplier — one integer-rounding helper for every number, so
 * `measureText`'s cache keys stay stable and no half-pixel arrives anywhere.
 */
export function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  const f = <T extends { fontSize: number; lead?: number }>(tok: T) => ({
    ...tok,
    fontSize: sp(tok.fontSize),
    ...(tok.lead === undefined ? {} : { lead: sp(tok.lead) }),
  });
  return {
    TITLE: f(BASE.TITLE) as typeof BASE.TITLE,
    SOURCE: f(BASE.SOURCE) as typeof BASE.SOURCE,
    AXIS_NOTE: f(BASE.AXIS_NOTE) as typeof BASE.AXIS_NOTE,
    TICK_LABEL: f(BASE.TICK_LABEL) as typeof BASE.TICK_LABEL,
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    VALUE_LABEL: f(BASE.VALUE_LABEL) as typeof BASE.VALUE_LABEL,
    CONCLUSION_LABEL: f(BASE.CONCLUSION_LABEL) as typeof BASE.CONCLUSION_LABEL,
    MEDIAN_RULE: {
      width: Math.max(1, sp(BASE.MEDIAN_RULE.width)),
      dash: `${sp(BASE.MEDIAN_RULE.dash + 1)} ${sp(BASE.MEDIAN_RULE.dash - 1)}`,
    },
    MEDIAN_CAPTION_LIFT: sp(BASE.MEDIAN_CAPTION_LIFT),
    TITLE_TO_AXIS_NOTE: sp(BASE.TITLE_TO_AXIS_NOTE),
    AXIS_NOTE_TO_PLOT: sp(BASE.AXIS_NOTE_TO_PLOT),
    PLOT_SIDE_AIR: sp(BASE.PLOT_SIDE_AIR),
    UNDER_AXIS_BAND: sp(BASE.UNDER_AXIS_BAND),
    BAND_TO_SOURCE: sp(BASE.BAND_TO_SOURCE),
    TICK_DROP: sp(BASE.TICK_DROP),
    TICK_TO_UNIT: sp(BASE.TICK_TO_UNIT),
    SUBJECT_LABEL_LIFT: sp(BASE.SUBJECT_LABEL_LIFT),
    AXIS_STROKE: Math.max(1, sp(BASE.AXIS_STROKE)),
    TICK_STROKE: Math.max(1, sp(BASE.TICK_STROKE)),
    SUBJECT_STROKE: Math.max(1, sp(BASE.SUBJECT_STROKE)),
  };
}

/**
 * The median caption's own font AT A GIVEN SIZE, for `render.mjs`'s contrast assertion.
 *
 * It used to export the bare `NOTE` constant, which was a 1080-frame number: the WCAG floor that
 * `textContrastFloor` picks depends on the size the text is actually DRAWN at (1.4.3's large-text
 * threshold), so a contrast claim made against an unscaled token is a claim about a render that no
 * longer happens. The floor is now asked for at the size this beat ships at.
 */
export function noteFor(size: string) {
  return tokens(sizeFor(size).typeScale).NOTE;
}

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

export type Reading = { entity: string; value: number };

export type Bin = {
  start: number;
  end: number;
  count: number;
};

/**
 * Data to coordinates. Pure — no colour, no font, no React. A fresh shape: bins are contiguous
 * slices of one continuum, not categories and not readings on a shared time axis, so this is
 * neither `crossingGeometry`'s traced line nor `dumbbellGeometry`'s paired rows.
 *
 * `domainStart`/`domainEnd`/`binWidth` are supplied, not inferred, so the same sanity check
 * `render.mjs` runs on the frozen data (3–50 bins, per `histogram.md`'s floor and ceiling) is
 * checked once, at render time, against the real numbers — not silently re-derived here from
 * whatever a future call happens to pass in.
 *
 * The x domain is the bin edges themselves, `[domainStart, domainEnd]` — not padded, because bin
 * edges are already round, meaningful values in the variable's own unit (`histogram.md`: "the
 * x-axis is the continuous variable itself... not bin index"). The y (count) domain starts at
 * zero — the same non-negotiable rule as any bar: a count axis that doesn't start at zero halves
 * what a bar claims about how many observations fell there.
 */
export function histogramGeometry(
  readings: Reading[],
  {
    width,
    height,
    padding,
    binWidth,
    domainStart,
    domainEnd,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    binWidth: number;
    domainStart: number;
    domainEnd: number;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };

  const binCount = Math.round((domainEnd - domainStart) / binWidth);
  if (binCount < 3 || binCount > 50)
    throw new Error(
      `histogramGeometry: ${binCount} bins is outside the 3–50 sanity range (histogram.md)`,
    );

  const counts = new Array(binCount).fill(0);
  for (const r of readings) {
    const idx = Math.min(
      binCount - 1,
      Math.max(0, Math.floor((r.value - domainStart) / binWidth)),
    );
    counts[idx] += 1;
  }
  const bins: Bin[] = counts.map((count, i) => ({
    start: domainStart + i * binWidth,
    end: domainStart + (i + 1) * binWidth,
    count,
  }));
  const maxCount = Math.max(...counts);

  const x = scaleLinear()
    .domain([domainStart, domainEnd])
    .range([plot.left, plot.right]);
  const y = scaleLinear()
    .domain([0, maxCount * 1.18]) // headroom for the subject bin's own value label
    .range([plot.bottom, plot.top]);

  const bars = bins.map((b) => ({
    ...b,
    x1: x(b.start),
    x2: x(b.end),
    yTop: y(b.count),
  }));

  return { plot, bars, x, y, maxCount, binCount };
}

export type HistogramVideoProps = {
  readings: Reading[]; // one row per country, year already filtered — render.mjs's job.
  title: string;
  source: string;
  axisNote: string; // e.g. "Countries per 5-year band"
  unitLabel: string; // x-axis unit line, e.g. "Life expectancy at birth, years (2023)"
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  referenceLabel: string; // e.g. "Median: 75.3 years"
  /** The median rule's ink, derived by `render.mjs` against everything the rule is drawn over. */
  medianRuleInk: string;
  medianValue: number;
  binWidth: number;
  domainStart: number;
  domainEnd: number;
  subjectBinStart: number; // which bin's left edge is the finding, e.g. 75
  /** The size gate 2c pinned, read from this beat's own `BRIEF.md`. Not a default. */
  size: string;
  timing?: BeatTiming;
};

export function HistogramVideo({
  readings,
  title,
  source,
  axisNote,
  unitLabel,
  ground,
  accent,
  ink,
  muted,
  referenceLabel,
  medianRuleInk,
  medianValue,
  binWidth,
  domainStart,
  domainEnd,
  subjectBinStart,
  size,
  timing = HISTOGRAM_TIMING,
}: HistogramVideoProps) {
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
    AXIS_NOTE,
    TICK_LABEL,
    NOTE,
    VALUE_LABEL,
    CONCLUSION_LABEL,
    MEDIAN_RULE,
    MEDIAN_CAPTION_LIFT,
  } = T;

  // WHETHER THIS TYPE MAY ENTER THIS SIZE AT ALL, before anything is measured. A histogram has no
  // twin form — transposing a continuum onto a band scale would lie about it — so an unmeasured
  // frame is refused, and a measured one is clamped by `assertPlotAspect` further down.
  const form = assertTypeMayEnter(TYPE, size, {
    what: "vidy-histogram-life-expectancy",
  });

  if (readings.length < 1) throw new Error("need at least one reading");

  // ── Layout. Identical at every frame: the build changes what is visible, never where it sits,
  // so nothing shifts when the reveal or the subject bin arrives.
  const contentTop = stage.reserved ? stage.top : PAD;
  // Named `sourceBottom` rather than something generic because it IS the credit's own anchor, and
  // `credit-anchors-to-the-frame-bottom.test.ts` follows that name through the chain: the credit has
  // to resolve to the frame's own height minus something, never to a header rung. At portrait the
  // bottom it names is the STAGE's — below that band sit the platform's caption and progress bar,
  // and a covered credit is an attribution failure, not a cosmetic one.
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = contentTop + TITLE.fontSize;
  // THE CREDIT WRAPS. It was one unwrapped `<text>` that happened to fit a 1080 frame at 20px; at
  // the size table's own landscape scale it ran off the right edge and the last words of the source
  // — "237 countries and territories" — left the frame. A credit that is partly outside the frame
  // is an attribution failure, so it is measured and wrapped like every other run here.
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  const sourceLead = Math.round(SOURCE.fontSize * 1.5);
  // THE SOURCE SITS ON THE BOTTOM OF THE BAND — the same edge the title hangs off at the top, on
  // the same x. It stays inside the furniture opacity group, so no timing contract moves. See
  // chart-beat/references/static-discipline.md, "The source on the frame's bottom margin".
  // At portrait that bottom is the STAGE's: below it sit the platform's caption and progress bar,
  // and a covered credit is an attribution failure rather than a cosmetic one.
  const sourceBaseline = sourceBottom - (sourceLines.length - 1) * sourceLead;
  // The axis note keeps the air it always had above it, measured from the LAST TITLE line rather
  // than from the source, which is no longer in the header.
  const axisNoteBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + T.TITLE_TO_AXIS_NOTE;

  const padding = {
    top: axisNoteBaseline + T.AXIS_NOTE_TO_PLOT,
    right: PAD + T.PLOT_SIDE_AIR,
    // Room for tick labels + the unit line below the axis, AND for the credit under them. Measured
    // DOWN FROM the credit's own baseline rather than up from the frame's foot, so the portrait
    // stage moves the plot with it instead of leaving it under the platform's caption.
    bottom:
      height -
      sourceBottom +
      T.UNDER_AXIS_BAND +
      (sourceLines.length - 1) * sourceLead +
      SOURCE.fontSize +
      T.BAND_TO_SOURCE,
    left: PAD + T.PLOT_SIDE_AIR,
  };

  // EVERY TYPE SIZE THIS FRAME ACTUALLY DRAWS, against the row's own floor. The guard reads
  // `font-size="…"` out of markup because that is what it reads on the static side; a video
  // composition's markup only exists inside the browser Remotion drives, so the sizes are handed to
  // it in the form they will be written in. It is the values that are checked.
  assertTypeFloor(
    [
      TITLE.fontSize,
      SOURCE.fontSize,
      AXIS_NOTE.fontSize,
      TICK_LABEL.fontSize,
      NOTE.fontSize,
      VALUE_LABEL.fontSize,
      CONCLUSION_LABEL.fontSize,
    ]
      .map((px) => `font-size="${px}"`)
      .join(" "),
    size,
    { what: `vidy-histogram-life-expectancy at ${size}` },
  );

  const g = histogramGeometry(readings, {
    width,
    height,
    padding,
    binWidth,
    domainStart,
    domainEnd,
  });
  // THE PLOT'S OWN SHAPE, refused before anything is drawn. `proof/portrait-aspect-probe/` took
  // exactly this chart type from 2.35:1 to 0.54:1 and turned a right-skewed distribution into one
  // enormous column beside nine slivers — with zero clipped runs and zero collisions. A
  // distribution's argument IS a shape, and this is the only assertion in the project that sees it.
  assertPlotAspect(g.plot, TYPE, size, {
    what: `vidy-histogram-life-expectancy at ${size} (${form.verdict})`,
  });

  const subjectIndex = g.bars.findIndex((b) => b.start === subjectBinStart);
  if (subjectIndex < 0)
    throw new Error(
      `no bin starts at ${subjectBinStart} — check subjectBinStart against binWidth/domainStart`,
    );
  const subjectBar = g.bars[subjectIndex];

  // ── The edit. Six windows, all read off the timing contract — no frame literal below.
  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const subject = progressOf(frame, timing.subject);
  const conclusion = progressOf(frame, timing.conclusion);

  // The title, the source and the axis note are on screen at FRAME ZERO, at full opacity, never
  // faded in. Extracting frame 0 from this beat's mp4 returned a completely blank white image —
  // measured, not assumed: `establish` starts at frame 0, so its progress there is exactly 0 and
  // everything gated on it is invisible. Frame 0 is the poster frame a CMS or a social platform
  // pulls as the thumbnail before anyone presses play, and a blank poster frame is a beat that
  // says nothing. `motion-grammar.md`'s conclusion rule governs assertions, not the title.
  // The zero baseline and the bin-edge x-axis still fade in over `establish` — they are the frame
  // the bars will be measured in, and they have nothing to say before the bars exist.
  const axisOpacity = establish;

  // The reference: the median line, drawn top-to-bottom, then left alone to be read before any
  // bar arrives — same device, same pause, as every prior beat's reference line.
  const medianX = g.x(medianValue);
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
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // THE MEDIAN RULE'S INK IS DERIVED FROM THE MARKS IT IS DRAWN OVER, AND IT IS DERIVED IN NODE.
  //
  // `render.mjs` calls `annotation-ink.mjs`'s `inkThatReadsOver` and hands the answer down as a
  // prop, for the same reason this file takes `ink`/`muted`/`grid` rather than deriving them:
  // that module reaches `contrast` through `render-still.mjs`, which loads a native rasteriser no
  // browser bundle can parse — measured, not assumed (webpack: "Module parse failed: Unexpected
  // character" on the `.node` binary). One implementation of the rule, two genres.
  //
  // A MISSING VALUE THROWS rather than falling back to `muted`, which is what this beat drew before
  // and is exactly the 1.00:1 defect: a fallback here would restore it silently.
  if (!medianRuleInk)
    throw new Error(
      "no medianRuleInk was supplied — render.mjs derives it with inkThatReadsOver against this " +
        "beat's own ground, bar fill and accent, and the rule cannot be drawn in a colour nobody chose",
    );

  // The subject bin's two labels — the short count during `subject`, the sentence during
  // `conclusion` — share one baseline above the subject bar. Computed HERE, above the caption,
  // because the caption's own placement now depends on this box.
  const valueLabel = `${subjectBar.count}`;
  const conclusionLabel = `${subjectBar.count} countries, ${subjectBar.start}–${subjectBar.end} years — the most of any span`;
  const conclusionLabelWidth = measureText(conclusionLabel, CONCLUSION_LABEL);
  const conclusionX = Math.min(
    subjectBar.x1,
    g.plot.right - conclusionLabelWidth,
  );
  const conclusionBaseline = subjectBar.yTop - T.SUBJECT_LABEL_LIFT;

  // The caption is a POSITION decision before it is a colour one. It is drawn ABOVE `plot.top`,
  // where the only thing under it is the page — which is what makes `muted` legitimate here while
  // the rule below it cannot use `muted` at all. If a future layout drops it into the plot, this
  // throws with the number that says so instead of quietly printing grey on grey.
  //
  // AND IT CLEARS THE SENTENCE. Both runs live in the strip above the subject bar, and how much
  // strip there is depends on the plot's height — so at 1080 x 1080 they were 110px apart and at
  // the table's landscape frame they overlapped, printing "Median: 75.3 years" through "65
  // countries, 75–80 years". The clearance is derived from the two boxes rather than tuned: they
  // are compared where they actually are, and the caption is lifted by the sentence's own line
  // height only when its own x range meets the sentence's.
  const captionWidth = measureText(referenceLabel, NOTE);
  const captionMeetsSentence =
    medianX + captionWidth / 2 > conclusionX &&
    medianX - captionWidth / 2 < conclusionX + conclusionLabelWidth;
  const captionBaseline = captionMeetsSentence
    ? Math.min(
        g.plot.top - MEDIAN_CAPTION_LIFT,
        conclusionBaseline -
          CONCLUSION_LABEL.fontSize -
          MEDIAN_CAPTION_LIFT,
      )
    : g.plot.top - MEDIAN_CAPTION_LIFT;
  if (captionBaseline + NOTE.fontSize * 0.25 > g.plot.top)
    throw new Error(
      `the median caption's baseline (${captionBaseline.toFixed(1)}) puts its descender inside the ` +
        `plot (top ${g.plot.top.toFixed(1)}) — it would sit on a bar, and its ink is measured ` +
        `against the page only. Raise MEDIAN_CAPTION_LIFT or ink it against the marks.`,
    );

  // The reveal: ALL eight bars rise together, sharing ONE eased progress — see the file
  // doc-comment for why this is a single build rather than a per-bin cascade. Easing is legal
  // here because this is evidence arriving, not the traversal of a measured axis
  // (`motion-grammar.md`: "easing is for things that arrive... never for the traversal of a
  // measured axis" — the x axis here is the variable, established already and static; the reveal
  // moves height, not position along that axis).
  const revealEase = interpolate(reveal, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  // The subject: the 75-to-80 bin takes the one accent at `subject`'s own boundary — a cut, not a
  // dissolve. It happens once every bar (including its own) is already fully up: `subject.start`
  // cannot precede `reveal`'s end, so that ordering is structural, not just editorial intent.
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const subjectOutlineOpacity = interpolate(subjectSpring, [0, 1], [0, 1]);

  // The conclusion: the subject bin's short count label extends in place into the sentence the
  // beat is actually making — the same two-stage label technique the dumbbell's gap-extension and
  // `EmissionsVideo.tsx`'s `endLabel` both use.
  const valueOpacity = interpolate(subject, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
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
        {sourceLines.map((line, i) => (
          <text
            key={line}
            x={PAD}
            y={sourceBaseline + i * sourceLead}
            fill={muted}
            fontSize={SOURCE.fontSize}
          >
            {line}
          </text>
        ))}
        <text
          x={PAD}
          y={axisNoteBaseline}
          fill={muted}
          fontSize={AXIS_NOTE.fontSize}
          fontWeight={AXIS_NOTE.fontWeight}
        >
          {axisNote}
        </text>
      </g>

      {/* The measuring frame — zero baseline and bin-edge x-axis — faded in over `establish`
          rather than present at frame 0. */}
      <g opacity={axisOpacity}>
        {/* The zero baseline — the count axis's own floor, the non-negotiable rule every bar's
            height is read against (`histogram.md`). */}
        <line
          x1={g.plot.left}
          x2={g.plot.right}
          y1={g.plot.bottom}
          y2={g.plot.bottom}
          stroke={muted}
          strokeWidth={T.AXIS_STROKE}
        />

        {/* The bin-edge x-axis: ticks and labels at every bin boundary, in the variable's own
            unit — the type's own requirement, not a genre choice
            (`histogram.md`: "not bin index"). Kept sparse in weight and size, the video genre's
            own discipline (`motion-grammar.md`'s furniture-density rule), but every edge is
            present because a histogram whose x-axis omits an edge has hidden a bin boundary. */}
        {g.bars.map((b) => (
          <g key={`tick-${b.start}`}>
            <line
              x1={g.x(b.start)}
              x2={g.x(b.start)}
              y1={g.plot.bottom}
              y2={g.plot.bottom + T.TICK_DROP}
              stroke={muted}
              strokeWidth={T.TICK_STROKE}
            />
            <text
              x={g.x(b.start)}
              y={g.plot.bottom + T.TICK_DROP + TICK_LABEL.fontSize}
              fill={muted}
              fontSize={TICK_LABEL.fontSize}
              textAnchor="middle"
            >
              {b.start}
            </text>
          </g>
        ))}
        <line
          x1={g.x(domainEnd)}
          x2={g.x(domainEnd)}
          y1={g.plot.bottom}
          y2={g.plot.bottom + T.TICK_DROP}
          stroke={muted}
          strokeWidth={T.TICK_STROKE}
        />
        <text
          x={g.x(domainEnd)}
          y={g.plot.bottom + T.TICK_DROP + TICK_LABEL.fontSize}
          fill={muted}
          fontSize={TICK_LABEL.fontSize}
          textAnchor="middle"
        >
          {domainEnd}
        </text>
        <text
          x={(g.plot.left + g.plot.right) / 2}
          y={g.plot.bottom + T.TICK_DROP + TICK_LABEL.fontSize * 2 + T.TICK_TO_UNIT}
          fill={muted}
          fontSize={NOTE.fontSize}
          textAnchor="middle"
        >
          {unitLabel}
        </text>
      </g>

      {/* All eight bars: the shared neutral fill, rising together from the zero baseline. Every
          opacity/height below is an ABSOLUTE value derived from `revealEase` alone, never gated
          on a later event's own progress, so nothing produces NaN in the frame before the reveal
          window opens. */}
      {g.bars.map((b, i) => {
        const barHeight = (g.plot.bottom - b.yTop) * revealEase;
        const barY = g.plot.bottom - barHeight;
        const isSubject = i === subjectIndex;
        return (
          <g key={`bar-${b.start}`}>
            {/* ONE rect whose fill switches at the subject's own boundary. Drawn as two rects —
                a neutral one with an accent one dissolving over it — the bin spent the whole
                22-frame window in a blend of `muted` and `accent` that nobody chose, which is the
                first invariant broken on the one mark the beat is about. */}
            <rect
              x={b.x1}
              y={barY}
              width={b.x2 - b.x1}
              height={barHeight}
              fill={isSubject && subject > 0 ? accent : muted}
            />
          </g>
        );
      })}

      {/* The reference: a dashed vertical rule at the median, the one thing every bar's shape is
          read against. Its caption states the value once. */}
      {referenceProgress > 0 ? (
        <g>
          <line
            x1={medianX}
            x2={medianX}
            y1={g.plot.top}
            y2={referenceY2}
            stroke={medianRuleInk}
            strokeWidth={MEDIAN_RULE.width}
            strokeDasharray={MEDIAN_RULE.dash}
          />
          <text
            x={medianX}
            y={captionBaseline}
            fill={muted}
            fontSize={NOTE.fontSize}
            textAnchor="middle"
            opacity={referenceLabelOpacity}
          >
            {referenceLabel}
          </text>
        </g>
      ) : null}

      {/* The subject bin's outline — pops on once its own crossfade begins, the same critically
          damped landing every prior beat's subject mark uses: no overshoot, because a ring or
          outline that overshot would be showing more emphasis than the finding warrants. */}
      {subjectOutlineOpacity > 0 ? (
        <rect
          x={subjectBar.x1}
          y={subjectBar.yTop}
          width={subjectBar.x2 - subjectBar.x1}
          height={g.plot.bottom - subjectBar.yTop}
          fill="none"
          stroke={accent}
          strokeWidth={T.SUBJECT_STROKE}
          opacity={subjectOutlineOpacity}
        />
      ) : null}

      {/* The subject bin's value label, in ink (never the accent — the type doctrine's own
          accessibility trap: a colour safe as a mark can fail as text).

          The value label EXTENDS into the sentence the beat is actually making, at the same
          baseline. An extension is a cut, not a dissolve: exactly one of the two is mounted at any
          frame. Drawn as two crossfading nodes — which is how this was first written — frames 154
          to 179 printed both, and because the sentence opens with the same token as the short
          label a reader saw "65 countries, 75–80 yea65 — the most of any span" for 0.87s. */}
      {conclusion > 0 ? (
        <text
          x={conclusionX}
          y={conclusionBaseline}
          fill={ink}
          fontSize={CONCLUSION_LABEL.fontSize}
          fontWeight={CONCLUSION_LABEL.fontWeight}
          opacity={conclusionOpacity}
        >
          {conclusionLabel}
        </text>
      ) : (
        <text
          x={(subjectBar.x1 + subjectBar.x2) / 2}
          y={conclusionBaseline}
          fill={ink}
          fontSize={VALUE_LABEL.fontSize}
          fontWeight={VALUE_LABEL.fontWeight}
          textAnchor="middle"
          opacity={valueOpacity}
        >
          {valueLabel}
        </text>
      )}
    </svg>
  );
}
