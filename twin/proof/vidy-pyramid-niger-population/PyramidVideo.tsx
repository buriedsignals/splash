/**
 * The video beat of "Niger's youngest age band dwarfs its entire population aged 65+."
 * — 11.2 seconds, 30fps, 1080 × 1350.
 *
 * First population pyramid written in this shape. Twenty-one age bands, each a MIRRORED PAIR of
 * bars (male extending left, female extending right) sharing one central zero — not a traced
 * series and not ten rows of exactly two points, so this file's geometry (`pyramidGeometry` below)
 * is a fresh shape, not a copy of `crossingGeometry` / `migrationGeometry` / `lifeExpectancyGeometry`
 * / `dumbbellGeometry`. `FONT_FAMILY`, `measureText`, `wrap` and `en` ARE this story's own copies of
 * the other proof workspaces' functions of the same name — not an import from any of them, per the
 * duplicate-do-not-link rule (`../video-population-growth-dumbbell/DumbbellVideo.tsx`'s file
 * doc-comment explains why: this story lives outside `chart-video`'s skill boundary, and the
 * settled rule for a workspace that needs something a skill has is to duplicate it, not reach back
 * across the boundary).
 *
 * FRAME: 1080 × 1350 (4:5), taller than the corpus's square default — the same per-story override
 * `../static-swiss-age-pyramid/`'s static beat already made (900 × 820, taller than that genre's own
 * default): 21 age bands need more vertical room than a square frame gives for a legible per-band
 * gutter label at any genre's own minimum readable size.
 *
 * THE MOTION PROBLEM (from `BRIEF.md`): every one of Niger's 21 age bands is a mirrored pair of
 * bars around one shared central zero, and the bands run in a real, fixed sequence (age) that must
 * never be reordered by value — the silhouette IS the argument. Displayed oldest at the top to
 * youngest at the bottom (the same convention `../static-swiss-age-pyramid/SwissAgePyramid.tsx`
 * uses), the cascade reveals in that same top-to-bottom, oldest-to-youngest order: in this dataset
 * every successive band is wider than the last, so the reveal is a steady escalation that climaxes
 * on the frame's single widest pair of bars — the 0-4 band, which is also the confirmed subject —
 * rather than spoiling the finding early and trailing off into smaller arrivals. See
 * `timing-contract.ts`'s doc-comment for the frame numbers this produces.
 *
 * COLOUR: the population-pyramid type doctrine
 * (`chart-beat/references/types/population-pyramid.md`) requires the two side colours to be a
 * CVD-safe pair, checked together, not assumed safe individually — `BRIEF.md` names the pair and
 * the check. Male is Okabe-Ito blue (`#0072B2`), female is Okabe-Ito vermillion (`#D55E00`): a
 * cool/warm pair, not the two adjacent warm hues `visual-system.md`'s "adjacency inside an
 * already-safe palette" warns about, and the same two hues `../static-swiss-age-pyramid/`'s static
 * beat already uses for this exact type. The subject's emphasis then reuses the FEMALE hue as a
 * third CHANNEL (an outline stroke, a highlight wash, a bold label) rather than introducing a third
 * HUE — the same discipline `DumbbellVideo.tsx`'s subject block documents ("never a third hue").
 *
 * VALUE LABELS: printing a number beside all 21 bands' 42 bars would be `anti-patterns.md`'s
 * clutter, not 42 new facts a reader can use in a build meant to be watched, not studied — so no
 * band prints a raw value except the subject. The 0-4 band's total lands as part of `subject`, then
 * extends in place during `conclusion` into the one new fact the beat states: its ratio against the
 * entire 65-and-older population — see `en`/`abbrev` below and the `conclusion` block.
 */

import { max } from "d3-array";
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
// genres read one copy. A population pyramid has no measured aspect range at a tall frame — its
// argument is the SHAPE of two mirrored distributions, exactly the property the portrait probe
// proved no counter here can see — so the two phone frames are refused by name.
import { assertTypeMayEnter } from "#shared/chart-beat/type-at-size.mjs";
import { PYRAMID_TIMING } from "./timing-contract";

/** The chart type this beat draws, in `references/types/` vocabulary. Read by `formForSize`. */
export const TYPE = "population-pyramid";

/**
 * THE TWO MASK STOPS — physics, not palette, and named so that is legible at the use site.
 *
 * An SVG mask reads its own luminance: full white keeps what is under it, full black erases it.
 * Neither is a colour anybody chose, neither reaches a reader's eye, and neither moves when a
 * newsroom changes its accent — so they are NOT recorded in `PALETTE.md` and must not be. Every
 * colour in this component that a reader actually sees arrives as a prop.
 */
const MASK_KEEP = "#FFFFFF";
const MASK_ERASE = "#000000";
export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

/**
 * THE 900x560 TUNING, KEPT AS THE BASE, WITH THE SIZE AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more — this beat carried 1080 x 1350, a fourth frame nobody's table
 * has, so a journalist who pinned any of the three sizes got 4:5 whatever they chose. The frame is
 * `sizeFor(size)`'s now, and `size` is the decision gate 2c took. The shipped values are divided so
 * the SMALLEST token lands at 12 — the number every row's `typeScale` in
 * `chart-video/scripts/sizes.mjs` is derived from.
 *
 * EVERY SPACING NUMBER GOES THROUGH `sp`, including the centre gutter and the spine's own clearance:
 * a clearance measured in 1080-frame pixels stops covering a label the moment the label grows.
 * `PAD` is the one exception: a frame's margin is proportional to the CANVAS, not to the type.
 */
const BASE = {
  TITLE: { fontSize: 26, fontWeight: 700, lead: 32 },
  SOURCE: { fontSize: 13, fontWeight: 400 },
  NOTE: { fontSize: 13, fontWeight: 400 },
  LEGEND: { fontSize: 15, fontWeight: 600 },
  BAND_LABEL: { fontSize: 12, fontWeight: 500 },
  BAND_LABEL_ACCENT: { fontSize: 12, fontWeight: 700 },
  REFERENCE_LABEL: { fontSize: 12, fontWeight: 400 },
  SUBJECT_LABEL: { fontSize: 18, fontWeight: 700 },
  GUTTER_MARGIN: 9,
  OUTLINE_PAD: 4,
  /** Breathing space above and below a band label's measured glyph band, where the spine gives way. */
  SPINE_LABEL_CLEARANCE: 3,
  /** Air under the last title line, before the note; and under the note, before the legend. */
  TITLE_TO_NOTE: 26,
  NOTE_TO_LEGEND: 29,
  /** Air under the legend, before the plot. */
  LEGEND_TO_PLOT: 30,
  /** The drop from the plot's floor to the subject's conclusion label, and the block it reserves. */
  SUBJECT_LABEL_DROP: 33,
  SUBJECT_BLOCK: 48,
  /** Air between that block and the credit's ink. */
  BLOCK_TO_SOURCE: 7,
  /** The lift of the spine's caption above the plot. */
  CAPTION_LIFT: 10,
  /** The subject's highlight wash, inset from the frame's own edges. */
  HIGHLIGHT_INSET: 18,
  /** Ink widths, and the spine's dash. */
  SPINE_STROKE: 1.5,
  SPINE_DASH: 6,
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
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    LEGEND: f(BASE.LEGEND) as typeof BASE.LEGEND,
    BAND_LABEL: f(BASE.BAND_LABEL) as typeof BASE.BAND_LABEL,
    BAND_LABEL_ACCENT: f(BASE.BAND_LABEL_ACCENT) as typeof BASE.BAND_LABEL_ACCENT,
    REFERENCE_LABEL: f(BASE.REFERENCE_LABEL) as typeof BASE.REFERENCE_LABEL,
    SUBJECT_LABEL: f(BASE.SUBJECT_LABEL) as typeof BASE.SUBJECT_LABEL,
    GUTTER_MARGIN: sp(BASE.GUTTER_MARGIN),
    OUTLINE_PAD: sp(BASE.OUTLINE_PAD),
    SPINE_LABEL_CLEARANCE: sp(BASE.SPINE_LABEL_CLEARANCE),
    TITLE_TO_NOTE: sp(BASE.TITLE_TO_NOTE),
    NOTE_TO_LEGEND: sp(BASE.NOTE_TO_LEGEND),
    LEGEND_TO_PLOT: sp(BASE.LEGEND_TO_PLOT),
    SUBJECT_LABEL_DROP: sp(BASE.SUBJECT_LABEL_DROP),
    SUBJECT_BLOCK: sp(BASE.SUBJECT_BLOCK),
    BLOCK_TO_SOURCE: sp(BASE.BLOCK_TO_SOURCE),
    CAPTION_LIFT: sp(BASE.CAPTION_LIFT),
    HIGHLIGHT_INSET: sp(BASE.HIGHLIGHT_INSET),
    SPINE_STROKE: Math.max(1, sp(BASE.SPINE_STROKE)),
    SPINE_DASH: `${sp(BASE.SPINE_DASH + 1)} ${sp(BASE.SPINE_DASH - 1)}`,
    OUTLINE_STROKE: Math.max(1, sp(BASE.OUTLINE_STROKE)),
  };
}

export type Band = { ageBand: string; male: number; female: number };

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

/**
 * The rendered VERTICAL extent of a string — how far its glyphs actually rise above and fall below
 * the baseline, in the font they will really be drawn in. `measureText` above answers the same
 * question horizontally; a centre-gutter label needs the other axis, because what it has to be kept
 * clear of (the zero spine) is vertical. Read off the same Canvas metrics rather than guessed from
 * the font size: "0-4" and "100+" have no descenders at all and a ratio-of-fontSize constant would
 * be a magic number standing where a measurement belongs.
 */
function measureTextBand(
  text: string,
  font: { fontSize: number; fontWeight?: number },
): { ascent: number; descent: number } {
  // Primes the shared measuring context with exactly this font — the width is discarded.
  measureText(text, font);
  const metrics = measuringContext?.measureText(text);
  if (!metrics || typeof metrics.actualBoundingBoxAscent !== "number")
    return { ascent: font.fontSize * 0.72, descent: font.fontSize * 0.08 };
  return {
    ascent: metrics.actualBoundingBoxAscent,
    descent: metrics.actualBoundingBoxDescent,
  };
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

/** English thousands-grouped integer. */
export function en(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

/** Compact English magnitude — "4.67M", "673K" — for the subject's own labels only. */
export function abbrev(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return en(value);
}

/**
 * Data to coordinates. Pure — no colour, no font, no React. A fresh shape: bands are categories on
 * a fixed-order vertical axis (never sorted by value), each supplying a MIRRORED PAIR of magnitudes
 * read off ONE shared scale anchored at a shared central zero — not two independent scales that
 * happen to look similar, because the type's entire comparative power depends on a pixel of bar
 * meaning the same magnitude on both sides (`population-pyramid.md`).
 *
 * `bands` must already be in DISPLAY order — oldest first (top), youngest last (bottom). The
 * reversal from the data's own youngest-first natural order happens once, by the caller, with its
 * own comment (`readingsFromCsv` below) — not inside this pure function, so this function's input
 * order and its output row order are always the same order, with no hidden step in between.
 */
export function pyramidGeometry(
  bands: Band[],
  {
    width,
    height,
    padding,
    gutter,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    gutter: number; // half-width of the centre age-label gutter, reserved on both sides of zero
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const centreX = (plot.left + plot.right) / 2;
  const halfWidth = (plot.right - plot.left) / 2 - gutter;
  const maxValue = max(bands.flatMap((b) => [b.male, b.female])) ?? 0;
  const magnitude = scaleLinear().domain([0, maxValue]).range([0, halfWidth]);

  const rowHeight = (plot.bottom - plot.top) / bands.length;
  const rows = bands.map((b, i) => ({
    ...b,
    y: plot.top + rowHeight * (i + 0.5),
    maleZeroX: centreX - gutter,
    maleTipX: centreX - gutter - magnitude(b.male),
    femaleZeroX: centreX + gutter,
    femaleTipX: centreX + gutter + magnitude(b.female),
  }));

  return { plot, centreX, halfWidth, rowHeight, rows, magnitude };
}

/**
 * How far through band `i`'s own arrival window the master `reveal` progress is, 0..1. Every band
 * gets a slice of the reveal proportional to the band count, each slice slightly overlapping the
 * next so a 21-band cascade still reads as one continuous build rather than 21 discrete steps — the
 * same overlap-factor device `DumbbellVideo.tsx`'s `rowWindow` uses for its own ten rows.
 */
function rowWindow(i: number, rowCount: number) {
  const span = 1 / rowCount;
  const start = i * span;
  const duration = span * 1.8;
  return { start, end: Math.min(1, start + duration) };
}

export type PyramidVideoProps = {
  data: Band[]; // natural order: youngest first ("0-4" at index 0) — this component reverses for display.
  title: string;
  note: string;
  source: string;
  referenceLabel: string;
  ground: string;
  ink: string;
  muted: string;
  male: string;
  female: string;
  legendLabels: [string, string]; // ["Male", "Female"]
  subjectBand: string; // "0-4"
  elderTotal: number; // sum of male+female across every band from 65-69 up
  /** The size gate 2c pinned, read from this beat's own `BRIEF.md`. Not a default. */
  size: string;
  timing?: BeatTiming;
};

export function PyramidVideo({
  data,
  title,
  note,
  source,
  referenceLabel,
  ground,
  ink,
  muted,
  male,
  female,
  legendLabels,
  subjectBand,
  elderTotal,
  size,
  timing = PYRAMID_TIMING,
}: PyramidVideoProps) {
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
    NOTE,
    LEGEND,
    BAND_LABEL,
    BAND_LABEL_ACCENT,
    REFERENCE_LABEL,
    SUBJECT_LABEL,
    GUTTER_MARGIN,
    OUTLINE_PAD,
    SPINE_LABEL_CLEARANCE,
  } = T;

  // WHETHER THIS TYPE MAY ENTER THIS SIZE AT ALL, before anything is measured.
  assertTypeMayEnter(TYPE, size, { what: "vidy-pyramid-niger-population" });

  if (data.length < 2)
    throw new Error(`need at least two age bands, got ${data.length}`);

  // Display order: oldest at the top, youngest at the bottom — the same reversal
  // `../static-swiss-age-pyramid/SwissAgePyramid.tsx` documents for the static genre of this same
  // type. The data's own natural order (youngest first) is preserved end to end up to this one,
  // deliberate, commented step; nothing downstream re-sorts by value.
  const displayBands = [...data].reverse();
  const subjectIndex = displayBands.findIndex((b) => b.ageBand === subjectBand);
  if (subjectIndex < 0)
    throw new Error(`no band for subject ${JSON.stringify(subjectBand)}`);
  const subjectRow = displayBands[subjectIndex];
  const subjectTotal = subjectRow.male + subjectRow.female;
  const ratio = subjectTotal / elderTotal;

  // ── Layout. Identical at every frame: the build changes what is visible, never where it sits,
  // so nothing shifts when a band arrives late.
  const contentTop = stage.reserved ? stage.top : PAD;
  // Named `sourceBottom` rather than something generic because it IS the credit's own anchor, and
  // `credit-anchors-to-the-frame-bottom.test.ts` follows that name through the chain: the credit has
  // to resolve to the frame's own height minus something, never to a header rung. At portrait the
  // bottom it names is the STAGE's — below that band sit the platform's caption and progress bar,
  // and a covered credit is an attribution failure, not a cosmetic one.
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = contentTop + TITLE.fontSize;
  const noteBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + T.TITLE_TO_NOTE;
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN, not under the title — `height - PAD`, the
  // same inset the title hangs off at the top, on the same x. It stays inside the furniture
  // opacity group, so no timing contract moves. See
  // chart-beat/references/static-discipline.md, "The source on the frame's bottom margin".
  const sourceBaseline = sourceBottom;
  // The legend keeps the air it always had above it, measured from the LAST HEADER line (the
  // note) rather than from the source, which is no longer in the header.
  const legendBaseline = noteBaseline + T.NOTE_TO_LEGEND;

  const maxBandLabelWidth = Math.max(
    ...displayBands.map((b) =>
      Math.max(
        measureText(b.ageBand, BAND_LABEL),
        measureText(b.ageBand, BAND_LABEL_ACCENT),
      ),
    ),
  );
  const gutter = maxBandLabelWidth / 2 + GUTTER_MARGIN;

  const padding = {
    top: legendBaseline + T.LEGEND_TO_PLOT,
    right: PAD,
    // Room for the subject's conclusion label, centred below the widest row, AND for the credit
    // under it — measured DOWN FROM the credit's own baseline rather than up from the frame's foot,
    // so the portrait stage moves the plot with it.
    bottom:
      height -
      sourceBottom +
      T.SUBJECT_BLOCK +
      SOURCE.fontSize +
      T.BLOCK_TO_SOURCE,
    left: PAD,
  };

  // EVERY TYPE SIZE THIS FRAME ACTUALLY DRAWS, against the row's own floor.
  assertTypeFloor(
    [
      TITLE.fontSize,
      SOURCE.fontSize,
      NOTE.fontSize,
      LEGEND.fontSize,
      BAND_LABEL.fontSize,
      BAND_LABEL_ACCENT.fontSize,
      REFERENCE_LABEL.fontSize,
      SUBJECT_LABEL.fontSize,
    ]
      .map((px) => `font-size="${px}"`)
      .join(" "),
    size,
    { what: `vidy-pyramid-niger-population at ${size}` },
  );

  const g = pyramidGeometry(displayBands, { width, height, padding, gutter });

  // ── The edit. Six windows, all read off the timing contract — no frame literal below.
  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const subject = progressOf(frame, timing.subject);
  const conclusion = progressOf(frame, timing.conclusion);

  // The title, the note and the source are on screen at FRAME ZERO, at full opacity, never faded
  // in. Extracting frame 0 from this beat's mp4 returned a completely blank white image —
  // measured, not assumed: `establish` starts at frame 0, so its progress there is exactly 0 and
  // everything gated on it is invisible. Frame 0 is the poster frame a CMS or a social platform
  // pulls as the thumbnail before anyone presses play, and a blank poster frame is a beat that
  // says nothing. `motion-grammar.md`'s "the conclusion appears only after its evidence" governs
  // assertions, not the title; the title establishes what the reader is looking at.
  // The legend still fades in over `establish` — it names two sides of a pyramid that has no bars
  // yet.
  const axisOpacity = establish;

  // The reference: the central zero spine, drawn top-to-bottom — vertical rather than horizontal,
  // same device the dumbbell's index-100 rule used, still laid down before any band and left alone
  // to be read.
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

  // The reveal: 21 bands cascading oldest (top) to youngest (bottom) — see `rowWindow` and the file
  // doc-comment. Each band's own local progress grows its pair of bars OUTWARD from the shared
  // zero, which is the literal "evidence appearing" event this type earns: the same technique the
  // dumbbell's reference rule and this file's own reference spine use for their own top-to-bottom
  // draw, applied here to each row's own two bars instead of to one shared rule.
  const rowReveal = displayBands.map((_, i) => {
    const w = rowWindow(i, displayBands.length);
    return interpolate(reveal, [w.start, w.end], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
  });

  // The subject: the 0-4 row's own emphasis, landing once every row (including its own) is already
  // on screen — `subject.start` is set to exactly `endOf(reveal)`, so this is structural, not just
  // editorial intent. Critically damped, same as every prior beat's landing mark: an outline that
  // overshot would be showing, for a few frames, more emphasis than the finding warrants.
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const outlineOpacity = interpolate(subjectSpring, [0, 1], [0, 1]);
  const highlightOpacity = interpolate(subjectSpring, [0, 1], [0, 0.12]);
  // The age-band label crossfades from ink to bold, gated on the SUBJECT event's own progress (not
  // the master reveal signal) — `motion-grammar.md`'s "a label's reveal gates on its own mark,
  // never on a master clock."
  const labelAccentOpacity = interpolate(subject, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  // The subject's own total label (e.g. "4.67M") fades in with the subject event, centred below
  // the row — this is the number the row's silhouette has just finished asserting.
  const subjectValueOpacity = interpolate(subjectSpring, [0, 1], [0, 1]);

  // The conclusion: the subject's total label extends in place into the one new fact the beat has
  // not yet stated, the ratio against the 65+ population — see the file doc-comment for why this
  // runs in place rather than as a detached leader-line callout.
  const conclusionOpacity = interpolate(conclusion, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  const bandLabelBaselineOffset = BAND_LABEL.fontSize * 0.32;
  const subjectLabelY = g.plot.bottom + T.SUBJECT_LABEL_DROP;

  // The zero spine runs down the centre of the gutter, and the age-band labels are centred on that
  // same x — so without this the dashed rule STRUCK THROUGH all 21 of them: "85-89" read as "85+89",
  // "0-4" as "0⌐4". Measured on the delivered mp4's final frame, every band. The rule is not
  // decoration (its caption says the two sides share this zero), and the labels are the vertical
  // axis, so neither can move out of the other's way: the fix is that the spine YIELDS where a label
  // is drawn. Each band's clearance is its own glyphs' measured vertical extent (`measureTextBand`,
  // taking the taller of the plain and the accent weight) plus a breathing gap.
  //
  // HOW MANY BANDS CARRY A LABEL, MEASURED — the removal ladder's tick-thinning rung (R2), applied
  // to the one axis a pyramid has. 21 bands in the table's landscape frame give each row about
  // 24px, and a band label at this size's own legibility floor is taller than that: at one label
  // per band the strip read as a single black column of overlapping type, which is what the first
  // render of this migration produced. Nothing here makes the type smaller — the floor is never
  // lowered — so the LABELS thin out instead, one every `labelStride` rows, and the bars all stay:
  // the silhouette is the argument and it is untouched.
  //
  // The phase is chosen so the SUBJECT band always keeps its label (it is the band the headline is
  // about, and it takes the bold form at `subject`), rather than falling wherever an offset lands.
  const bandLabelBand = measureTextBand("00-00", BAND_LABEL_ACCENT);
  const labelStride = Math.max(
    1,
    Math.ceil(
      (bandLabelBand.ascent + bandLabelBand.descent + SPINE_LABEL_CLEARANCE * 2) /
        g.rowHeight,
    ),
  );
  const labelledRow = (i: number) => i % labelStride === subjectIndex % labelStride;

  const spineMaskId = "pyramid-spine-clearance";
  const labelClearances = g.rows.map((r) => {
    const plain = measureTextBand(r.ageBand, BAND_LABEL);
    const accent = measureTextBand(r.ageBand, BAND_LABEL_ACCENT);
    const ascent = Math.max(plain.ascent, accent.ascent);
    const descent = Math.max(plain.descent, accent.descent);
    const baseline = r.y + bandLabelBaselineOffset;
    return {
      top: baseline - ascent - SPINE_LABEL_CLEARANCE,
      height: ascent + descent + SPINE_LABEL_CLEARANCE * 2,
    };
  });
  // The clearance is BINARY — the rect is absent, or fully opaque. It switches on the frame the
  // band begins to arrive and never crossfades.
  //
  // Carrying the label's own opacity here (`opacity={rowReveal[i]}`) was the first repair's own
  // defect, and it is the reason a mask must never depend on the thing it protects: at α ≈ 0.5 the
  // label was half-drawn and the rule half-erased, so the dash crossed the very label the clearance
  // exists for. Measured on the mp4 with ffmpeg, reading only the clearance band's glyph-free
  // padding rows: **18 of 21 bands, 4–6 frames each, 76 band-frames in all** — at frame 120
  // "70-74" read "70⌐74". It survived because it is invisible in the held final frame, which is
  // the frame a still, and therefore every review, looks at.
  //
  // The trade this makes, stated: a band's gap now opens on the same frame its faintest glyphs
  // appear, so for one frame the rule gives way to a label barely on screen. That is the right way
  // round — a dashed rule that yields a frame early is not a misreading, and a rule drawn through
  // an age band is. It is NOT the alternative the first repair rejected (pre-cutting 21 gaps into a
  // rule drawn before any band arrives): a band that has not started still masks nothing.
  // …and it only yields where a label is actually DRAWN. A gap cut for a label the thinning rung
  // removed is a gap in the rule with nothing in it.
  const spineClearanceOn = rowReveal.map((progress, i) =>
    progress > 0 && labelledRow(i) ? 1 : 0,
  );

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
        <text x={PAD} y={noteBaseline} fill={muted} fontSize={NOTE.fontSize}>
          {note}
        </text>
        <text
          x={PAD}
          y={sourceBaseline}
          fill={muted}
          fontSize={SOURCE.fontSize}
        >
          {source}
        </text>
      </g>

      {/* Legend: the only thing telling a reader which side is which group — load-bearing, not
          decorative (`population-pyramid.md`'s only accessibility trap, checked as a pair). Faded
          in over `establish` rather than present at frame 0. */}
      <g opacity={axisOpacity}>
        <rect
          x={PAD}
          y={legendBaseline - 15}
          width={16}
          height={16}
          fill={male}
        />
        <text
          x={PAD + 24}
          y={legendBaseline - 2}
          fill={ink}
          fontSize={LEGEND.fontSize}
          fontWeight={LEGEND.fontWeight}
        >
          {legendLabels[0]}
        </text>
        <rect
          x={PAD + 24 + measureText(legendLabels[0], LEGEND) + 28}
          y={legendBaseline - 15}
          width={16}
          height={16}
          fill={female}
        />
        <text
          x={PAD + 24 + measureText(legendLabels[0], LEGEND) + 52}
          y={legendBaseline - 2}
          fill={ink}
          fontSize={LEGEND.fontSize}
          fontWeight={LEGEND.fontWeight}
        >
          {legendLabels[1]}
        </text>
      </g>

      {/* The reference: a dashed vertical spine at the shared zero, every row's two bars anchored
          to it. Its caption states what a bar represents, once. */}
      {referenceProgress > 0 ? (
        <g>
          <defs>
            {/* White keeps the rule; a black rect erases it. Each rect is on or off with its band's
                arrival (`spineClearanceOn` above) and never at a part opacity, so the rule is never
                half-erased across a half-drawn label. `maskUnits="userSpaceOnUse"` is
                load-bearing: the default objectBoundingBox region collapses on a zero-width vertical
                line and would mask the rule out entirely. */}
            <mask
              id={spineMaskId}
              maskUnits="userSpaceOnUse"
              x={0}
              y={0}
              width={width}
              height={height}
            >
              <rect
                x={0}
                y={0}
                width={width}
                height={height}
                fill={MASK_KEEP}
              />
              {labelClearances.map((clearance, i) => (
                <rect
                  key={g.rows[i].ageBand}
                  x={g.centreX - gutter}
                  y={clearance.top}
                  width={gutter * 2}
                  height={clearance.height}
                  fill={MASK_ERASE}
                  opacity={spineClearanceOn[i]}
                />
              ))}
            </mask>
          </defs>
          <line
            x1={g.centreX}
            x2={g.centreX}
            y1={g.plot.top}
            y2={referenceY2}
            stroke={muted}
            strokeWidth={T.SPINE_STROKE}
            strokeDasharray={T.SPINE_DASH}
            mask={`url(#${spineMaskId})`}
          />
          <text
            x={g.centreX}
            y={g.plot.top - T.CAPTION_LIFT}
            fill={muted}
            fontSize={REFERENCE_LABEL.fontSize}
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
          x={T.HIGHLIGHT_INSET}
          y={g.rows[subjectIndex].y - g.rowHeight / 2}
          width={width - T.HIGHLIGHT_INSET * 2}
          height={g.rowHeight}
          fill={female}
          opacity={highlightOpacity}
        />
      ) : null}

      {/* Every band: two bars growing outward from the shared zero, plus the age-band label in the
          centre gutter — cascading oldest to youngest via rowReveal. Every opacity/width below is
          an ABSOLUTE value derived from that row's own progress, never divided out of a parent
          group's opacity, so nothing produces NaN in the frame before a row's own window opens. */}
      {g.rows.map((r, i) => {
        const isSubject = i === subjectIndex;
        const maleCurrentX = interpolate(
          rowReveal[i],
          [0, 1],
          [r.maleZeroX, r.maleTipX],
        );
        const femaleCurrentX = interpolate(
          rowReveal[i],
          [0, 1],
          [r.femaleZeroX, r.femaleTipX],
        );
        // The subject band's label takes the bold form at `subject`'s own boundary — a CUT. Drawn
        // as a plain copy crossfading out under a bold copy crossfading in, both at the same
        // centre and the same baseline, the artifact printed "0-4" over "0-4" at partial opacity
        // for the width of the window: one grey ghost behind one bold label.
        const accented = isSubject && subject > 0;
        const labelOpacity = rowReveal[i];
        const barHeight = g.rowHeight * 0.62;
        return (
          <g key={r.ageBand}>
            <rect
              x={Math.min(maleCurrentX, r.maleZeroX)}
              y={r.y - barHeight / 2}
              width={Math.abs(maleCurrentX - r.maleZeroX)}
              height={barHeight}
              fill={male}
              opacity={rowReveal[i]}
            />
            <rect
              x={Math.min(femaleCurrentX, r.femaleZeroX)}
              y={r.y - barHeight / 2}
              width={Math.abs(femaleCurrentX - r.femaleZeroX)}
              height={barHeight}
              fill={female}
              opacity={rowReveal[i]}
            />
            {labelledRow(i) ? (
              <text
                x={g.centreX}
                y={r.y + bandLabelBaselineOffset}
                fill={ink}
                fontSize={
                  accented ? BAND_LABEL_ACCENT.fontSize : BAND_LABEL.fontSize
                }
                fontWeight={
                  accented ? BAND_LABEL_ACCENT.fontWeight : BAND_LABEL.fontWeight
                }
                textAnchor="middle"
                opacity={labelOpacity}
              >
                {r.ageBand}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* The subject's outline — pops onto both already-landed bars once the subject event
          starts. Padded OUTWARD from each bar's own edges (`OUTLINE_PAD`) so it always sits on
          the ground/highlight-wash behind the bar, never drawn directly on top of the bar's own
          fill: a same-hue stroke laid exactly on a same-hue fill (the female bar, reusing the
          female hue for this emphasis channel) is invisible where it matters most, and only the
          padding — not a different stroke colour — fixes that for both bars uniformly. */}
      {outlineOpacity > 0 ? (
        <g opacity={outlineOpacity}>
          <rect
            x={g.rows[subjectIndex].maleTipX - OUTLINE_PAD}
            y={g.rows[subjectIndex].y - (g.rowHeight * 0.62) / 2 - OUTLINE_PAD}
            width={
              g.rows[subjectIndex].maleZeroX -
              g.rows[subjectIndex].maleTipX +
              OUTLINE_PAD * 2
            }
            height={g.rowHeight * 0.62 + OUTLINE_PAD * 2}
            fill="none"
            stroke={female}
            strokeWidth={T.OUTLINE_STROKE}
          />
          <rect
            x={g.rows[subjectIndex].femaleZeroX - OUTLINE_PAD}
            y={g.rows[subjectIndex].y - (g.rowHeight * 0.62) / 2 - OUTLINE_PAD}
            width={
              g.rows[subjectIndex].femaleTipX -
              g.rows[subjectIndex].femaleZeroX +
              OUTLINE_PAD * 2
            }
            height={g.rowHeight * 0.62 + OUTLINE_PAD * 2}
            fill="none"
            stroke={female}
            strokeWidth={T.OUTLINE_STROKE}
          />
        </g>
      ) : null}

      {/* The subject's total label, centred below the widest row — where the pyramid's own base
          just finished drawing — then extended in place, during `conclusion`, into the ratio
          against the 65+ population. */}
      <text
        x={g.centreX}
        y={subjectLabelY}
        fill={ink}
        fontSize={SUBJECT_LABEL.fontSize}
        fontWeight={SUBJECT_LABEL.fontWeight}
        textAnchor="middle"
        opacity={subjectValueOpacity}
      >
        {conclusion > 0
          ? `${abbrev(subjectTotal)} · ~${ratio.toFixed(1)}× the 65+ population (${abbrev(elderTotal)})`
          : abbrev(subjectTotal)}
      </text>
    </svg>
  );
}
