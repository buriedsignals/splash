/**
 * The video beat of "China emits more CO₂ than the next five biggest emitters combined." —
 * 10 seconds, 30fps, 1080 × 1080.
 *
 * First bar-and-column written in the video format. The type had a static sibling and a web sibling
 * in this corpus and no video one, which is the gap this beat closes. Ten columns, one value each,
 * every length measured from a shared zero baseline — so this file's geometry (`columnGeometry`
 * below) is its own shape, not a copy of `LollipopVideo.tsx`'s row-band geometry (rows there,
 * columns here; a dot at a tip there, a filled rectangle here) and not the stacked bar's segment
 * stack.
 *
 * `FONT_FAMILY`, `measureText`, `wrap` and `en` ARE this story's own copies of the other proof
 * workspaces' functions of the same name — not an import from any of them. The settled rule for a
 * workspace that needs something a skill has is to duplicate it, not reach back across the skill
 * boundary, and these four are specifically the VIDEO format's browser-Canvas text measurer, not the
 * static format's resvg one: the two are not interchangeable, so vendoring the wrong one would
 * mismeasure silently.
 *
 * THE MOTION PROBLEM (from `BRIEF.md`): the finding is not a property of any single column. It is
 * arithmetic across five of them — the second through sixth columns, added together, come to less
 * than the first. Nothing in a ranking's own build says that; a reader can watch ten columns arrive
 * and still not know it. So the beat separates the two: `reveal` builds the ranking and says only
 * what a ranking says (who is bigger, and in what order), and `conclusion` introduces the sum as a
 * mark of its own — a rule drawn at the summed height with a bracket under the five columns it
 * sums — so the comparison is SEEN (China's column stands above the rule) rather than asserted.
 *
 * THE TYPE'S OWN TRAP, honoured: `references/types/bar-and-column.md` calls a truncated baseline "a
 * false statement about the data dressed up as a stylistic choice." `columnGeometry` anchors the
 * value domain at zero unconditionally — there is no prop, no flag and no code path that fits the
 * scale to the readings, which is the line chart's discipline and belongs to lines only.
 *
 * COLOUR AND CONTRAST: exactly one column carries accent — China's, the one the headline is about,
 * and picked because the headline is about it rather than because it is the tallest (the sheet
 * names "highlighting the tallest bar simply because it's tallest" as letting the data choose the
 * story). Every value label stays in page `ink`, outside and above its column, never inside the
 * fill: the sheet's accessibility trap is a label painted on a mid-luminance fill, and a label that
 * never touches a fill cannot fail that way.
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
// The VIDEO format's own size table — its landscape row carries a 30px legibility floor and a 2.5
// type scale where the static skill's carries 26 and 2.2, because a 16:9 video is watched on a
// phone turned sideways (~800 dp) and a static landscape sits in a ~900 px article column. Same
// 12 CSS px rule, different reading distance; that split is exactly what the table is per-craft for.
import {
  assertTypeFloor,
  frameInsetFor,
  sizeFor,
  stageFor,
} from "#shared/chart-video/sizes.mjs";
// Whether this TYPE may enter that size at all is a fact about the type, not about the craft, so
// there is one copy of it and the video format reads the same one the static format does. Named here
// rather than left implicit: `chart-video` carries no `type-at-size.mjs` of its own, and
// adding a second copy of a table whose contents are measured aspect ranges would be the drift the
// carried-table discipline exists to prevent.
import { formForSize } from "#shared/chart-beat/type-at-size.mjs";
import { COLUMN_RANKING_TIMING } from "./timing-contract";

export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

/** The chart type this beat draws, in `references/types/` vocabulary. Read by `formForSize`. */
export const TYPE = "column";

/**
 * THE 900×560 TUNING, KEPT AS THE BASE, WITH THE SIZE AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more, and its absence is the point. The frame is `sizeFor(size)`'s,
 * and `size` is the decision gate 2c took, read out of this beat's own `BRIEF.md` by `render.mjs`
 * and carried onto the composition by `Root.tsx`. Before this the size was stated three times as
 * literals — here, in `Root.tsx`'s `width`/`height`, and in the prose of the brief — and all three
 * agreed by construction, so a journalist who pinned `portrait` still got 1080 × 1080.
 *
 * The numbers below are the shipped 1080-frame values divided by that frame's own 1.20 over the
 * 900-wide convention every other craft skill's base is written at, so the smallest token lands at
 * 12 — the value `chart-video/scripts/sizes.mjs` derives every row's `typeScale` from
 * (30 / 12 = 2.5 at landscape, 36 / 12 = 3.0 at the two phone frames). `CATEGORY_MIN_SIZE` is that
 * floor exactly: `fitCategorySize` may shrink a name down to it and no further, so a name that will
 * not fit reaches the refusal below instead of being drawn under the legibility floor.
 *
 * EVERY SPACING NUMBER GOES THROUGH `sp`, not only the fonts — the probe's sharpest finding
 * (`proof/static-carbon-footprint-spread/probe/VERDICT.md`): scaling the type and leaving the bare
 * literals in the layout arithmetic collides the header into itself. `PAD` is the one exception,
 * because a frame's margin is proportional to the CANVAS and not to the type (`frameInsetFor`).
 */
const BASE = {
  TITLE: { fontSize: 32, fontWeight: 700, lead: 40 },
  SOURCE: { fontSize: 17, fontWeight: 400 },
  AXIS_TICK: { fontSize: 15, fontWeight: 500 },
  AXIS_TITLE: { fontSize: 16, fontWeight: 500 },
  VALUE_LABEL: { fontSize: 18, fontWeight: 600 },
  CATEGORY_MAX: { fontSize: 16, fontWeight: 500 },
  CATEGORY_MIN_SIZE: 12,
  CONCLUSION: { fontSize: 18, fontWeight: 600, lead: 23 },
  /** Air under the last title line, before the axis title. */
  TITLE_TO_AXIS_TITLE: 34,
  /** Air between the axis title and the tallest column's value label. */
  AXIS_TITLE_TO_PLOT: 14,
  /** Air under the value label, before the plot's own top. */
  VALUE_LABEL_TO_PLOT: 10,
  /** Air under the baseline, before the category strip. */
  BASELINE_TO_CATEGORY: 12,
  /** Air under the category strip, before the credit block. */
  CATEGORY_TO_SOURCE: 8,
  /** The gap between a tick label and the plot's left edge. */
  TICK_INSET: 10,
  /** Added to the widest tick label to make the left gutter. */
  TICK_GUTTER_AIR: 12,
  /** The air a category name keeps inside its own band. */
  CATEGORY_BAND_AIR: 5,
  /** How far above its column's top a value label sits. */
  VALUE_LABEL_DROP: 8,
  /** How far the subject's highlight wash rises above the plot. */
  HIGHLIGHT_RISE: 7,
  /** The bracket's turned-down ends, and its clearance under the value label it must not strike. */
  BRACKET_TICK: 8,
  BRACKET_CLEARANCE: 12,
  /** Where the conclusion's words start, right of the summed columns, and their lift off the rule. */
  CONCLUSION_INSET: 14,
  CONCLUSION_LIFT: 5,
  /** Ink widths. A stroke is proportional to the canvas the way a gap is, so it scales too. */
  GRID_STROKE: 1,
  BASELINE_STROKE: 2,
  BRACKET_STROKE: 1.6,
  RULE_STROKE: 2,
};

/**
 * The base, at the size's own multiplier. One integer-rounding helper for every number, so
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
    AXIS_TITLE: f(BASE.AXIS_TITLE) as typeof BASE.AXIS_TITLE,
    VALUE_LABEL: f(BASE.VALUE_LABEL) as typeof BASE.VALUE_LABEL,
    CATEGORY_MAX: f(BASE.CATEGORY_MAX) as typeof BASE.CATEGORY_MAX,
    CATEGORY_MIN_SIZE: sp(BASE.CATEGORY_MIN_SIZE),
    CONCLUSION: f(BASE.CONCLUSION) as typeof BASE.CONCLUSION,
    TITLE_TO_AXIS_TITLE: sp(BASE.TITLE_TO_AXIS_TITLE),
    AXIS_TITLE_TO_PLOT: sp(BASE.AXIS_TITLE_TO_PLOT),
    VALUE_LABEL_TO_PLOT: sp(BASE.VALUE_LABEL_TO_PLOT),
    BASELINE_TO_CATEGORY: sp(BASE.BASELINE_TO_CATEGORY),
    CATEGORY_TO_SOURCE: sp(BASE.CATEGORY_TO_SOURCE),
    TICK_INSET: sp(BASE.TICK_INSET),
    TICK_GUTTER_AIR: sp(BASE.TICK_GUTTER_AIR),
    CATEGORY_BAND_AIR: sp(BASE.CATEGORY_BAND_AIR),
    VALUE_LABEL_DROP: sp(BASE.VALUE_LABEL_DROP),
    HIGHLIGHT_RISE: sp(BASE.HIGHLIGHT_RISE),
    BRACKET_TICK: sp(BASE.BRACKET_TICK),
    BRACKET_CLEARANCE: sp(BASE.BRACKET_CLEARANCE),
    CONCLUSION_INSET: sp(BASE.CONCLUSION_INSET),
    CONCLUSION_LIFT: sp(BASE.CONCLUSION_LIFT),
    GRID_STROKE: Math.max(1, sp(BASE.GRID_STROKE)),
    BASELINE_STROKE: Math.max(1, sp(BASE.BASELINE_STROKE)),
    BRACKET_STROKE: Math.max(1, sp(BASE.BRACKET_STROKE)),
    RULE_STROKE: Math.max(1, sp(BASE.RULE_STROKE)),
  };
}

/** Share of the band a column occupies. The sheet asks for a gap of a fifth to a third of the
 *  band; 0.62 of the band leaves 0.38 as gap, inside that range on the generous side. */
const COLUMN_FILL = 0.62;

export type Column = {
  country: string;
  /** Annual CO₂ emissions, billion tonnes (OWID publishes tonnes; render.mjs divides). */
  gt: number;
};

/**
 * The rendered width of a string in the font it will really be drawn in — this story's own copy of
 * the video format's browser-Canvas text measurer (see the file doc-comment for why it is
 * duplicated rather than imported).
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

/** English, fixed decimals. Every value here is a positive quantity of billions of tonnes. */
export function en(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

/**
 * The largest category font size at which every single WORD of every category name fits inside one
 * column band. Measured, never assumed: the sheet's "fixed gutter" failure is the reliable way to
 * clip a real category name the day the real dataset's names are longer than the sample's, and the
 * column equivalent of a gutter is the band a name has to sit inside.
 */
export function fitCategorySize(
  countries: string[],
  bandWidth: number,
  {
    max,
    min,
    air,
    fontWeight,
  }: { max: number; min: number; air: number; fontWeight: number },
): number {
  for (let size = max; size > min; size--) {
    const font = { fontSize: size, fontWeight };
    const longestWord = Math.max(
      ...countries.flatMap((c) =>
        c.split(/\s+/).map((w) => measureText(w, font)),
      ),
    );
    if (longestWord <= bandWidth - air) return size;
  }
  // The floor, not a smaller number. `min` is the size's own legibility floor scaled — a name that
  // does not fit at it does not get drawn smaller, it reaches `assertTypeFloor` below, which is the
  // whole reason the ladder in `type-at-size.mjs` contains no rung that shrinks type.
  return min;
}

/**
 * Data to coordinates. Pure — no colour, no font, no React.
 *
 * The value domain starts at zero and is never fitted to the readings. That is not a default that
 * a prop could override: for a length encoding, the baseline IS the encoding, and this function
 * has no parameter that could move it.
 */
export function columnGeometry(
  columns: Column[],
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
  const y = scaleLinear()
    .domain([0, Math.max(...columns.map((c) => c.gt))])
    .nice()
    .range([plot.bottom, plot.top]);

  const band = (plot.right - plot.left) / columns.length;
  const columnWidth = band * COLUMN_FILL;
  const bars = columns.map((c, i) => {
    const centre = plot.left + band * (i + 0.5);
    return {
      ...c,
      centre,
      x: centre - columnWidth / 2,
      top: y(c.gt),
      width: columnWidth,
    };
  });

  return { plot, band, columnWidth, bars, y, tickValues: y.ticks(6) };
}

/**
 * How far through column `i`'s own growth window the master `reveal` progress is, 0..1.
 *
 * Columns arrive in rank order with each window overlapping the next, so the build reads as one
 * cascade rather than ten discrete steps — the same overlap device the lollipop beat's `rowWindow`
 * uses, on the other axis.
 */
function columnWindow(i: number, count: number) {
  const span = 1 / count;
  const start = i * span;
  return { start, end: Math.min(1, start + span * 1.6) };
}

export type ColumnRankingVideoProps = {
  /** Pre-sorted by value, descending — render.mjs's job, not this component's. */
  data: Column[];
  title: string;
  source: string;
  axisTitle: string;
  subjectCountry: string;
  /** How many columns after the first the conclusion sums. Computed in render.mjs. */
  combinedCount: number;
  /** The sum of those columns, billion tonnes. Computed in render.mjs. */
  combinedTotal: number;
  /** "The next five combined", already in words — the word for the count is derived, not typed. */
  combinedLabel: string;
  /** The unit the summed value is printed in, e.g. "billion tonnes". */
  unit: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  /** The size gate 2c pinned, read from this beat's own `BRIEF.md`. Not a default. */
  size: string;
  timing?: BeatTiming;
};

export function ColumnRankingVideo({
  data,
  title,
  source,
  axisTitle,
  subjectCountry,
  combinedCount,
  combinedTotal,
  combinedLabel,
  unit,
  ground,
  accent,
  ink,
  muted,
  grid,
  size,
  timing = COLUMN_RANKING_TIMING,
}: ColumnRankingVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // The frame is the TABLE's, at the size the journalist pinned — never a constant in this file.
  // `sizeFor` throws naming all three rather than defaulting, so a size nobody exports cannot draw.
  const { width, height, typeScale } = sizeFor(size);
  const stage = stageFor(size);
  const PAD = frameInsetFor(size);
  const T = tokens(typeScale);

  // WHETHER THIS TYPE MAY ENTER THIS SIZE, AND IN WHAT FORM — before anything is measured.
  //
  // A column chart's category axis is nominal, so `formForSize` answers `transpose` at a tall or
  // square frame: rows running down the frame, every name horizontal on one line. That is not a
  // rescaling of what this file draws, it is a different drawing, and this beat does not carry it.
  // So the composition EXISTS at all three sizes — a size with no composition cannot be rendered at
  // all, whatever a component does — and the two it cannot draw refuse here, loudly, naming the
  // rung and the size that works. A silent stretch is the failure the probe proved no counter in
  // this project can see: zero clipped runs, zero collisions, and a destroyed shape.
  const form = formForSize(TYPE, size);
  if (form.verdict === "refuse")
    throw new Error(
      `vidz-bar-column-top-emitters: ${TYPE} cannot be drawn at ${size}. ${form.reason}`,
    );
  if (form.verdict === "transpose")
    throw new Error(
      `vidz-bar-column-top-emitters draws the COLUMN form, and ${size} asks for its twin form ` +
        `instead — ladder rung R0. ${form.reason}\nCost of taking it: ${form.cost}\n` +
        `Drawing ten vertical columns into a ${width}x${height} frame would stretch every one of ` +
        `them without clipping anything or colliding with anything, which is the one defect no ` +
        `counter here can see. This beat ships at landscape; the row form is a redraw, not a flag.`,
    );

  if (data.length < 3)
    throw new Error(`need at least three columns, got ${data.length}`);
  const subjectIndex = data.findIndex((c) => c.country === subjectCountry);
  if (subjectIndex !== 0)
    throw new Error(
      `this beat's argument is about the LEADING column; ${JSON.stringify(subjectCountry)} sits at index ${subjectIndex}`,
    );
  if (combinedCount < 1 || 1 + combinedCount > data.length)
    throw new Error(
      `combinedCount ${combinedCount} does not fit ${data.length} columns`,
    );

  // ── Layout. Identical at every frame: the build changes what is visible, never where it sits.
  // The top and bottom the content hangs off are the STAGE's where the platform reserves part of
  // the frame (portrait today) and the frame's margin otherwise, so nothing here branches on size.
  const contentTop = stage.reserved ? stage.top : PAD;
  // Named `sourceBottom` rather than something generic because it IS the credit's own anchor, and
  // `credit-anchors-to-the-frame-bottom.test.ts` follows that name through the chain: the credit has
  // to resolve to the frame's own height minus something, never to a header rung. At portrait the
  // bottom it names is the STAGE's — below that band sit the platform's caption and progress bar,
  // and a covered credit is an attribution failure, not a cosmetic one.
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;
  const titleLines = wrap(title, width - PAD * 2, T.TITLE);
  const titleBaseline = contentTop + T.TITLE.fontSize;
  const sourceLines = wrap(source, width - PAD * 2, T.SOURCE);
  const sourceLead = Math.round(T.SOURCE.fontSize * 1.5);
  // THE SOURCE SITS ON THE BOTTOM OF THE BAND — the LAST line lands there, the same edge the title
  // hangs off at the top, on the same x. It stays inside the furniture opacity group, so no timing
  // contract moves. See chart-beat/references/static-discipline.md, "The source on the frame's
  // bottom margin". At portrait that bottom is the stage's: below it sit the platform's caption and
  // progress bar, and a covered credit is an attribution failure, not a cosmetic one.
  const sourceBaseline = sourceBottom - (sourceLines.length - 1) * sourceLead;
  // The axis title keeps the air it always had above it, measured from the LAST TITLE line rather
  // than from the source, which is no longer in the header.
  const axisTitleBaseline =
    titleBaseline +
    (titleLines.length - 1) * T.TITLE.lead +
    T.TITLE_TO_AXIS_TITLE;

  // The left gutter is the widest tick label actually present, measured — never a constant.
  const provisionalTicks = scaleLinear()
    .domain([0, Math.max(...data.map((c) => c.gt))])
    .nice()
    .ticks(6);
  const tickGutter =
    Math.max(
      ...provisionalTicks.map((t) => measureText(en(t, 0), T.AXIS_TICK)),
    ) + T.TICK_GUTTER_AIR;

  const provisionalBand = (width - PAD * 2 - tickGutter) / data.length;
  const categorySize = fitCategorySize(
    data.map((c) => c.country),
    provisionalBand,
    {
      max: T.CATEGORY_MAX.fontSize,
      min: T.CATEGORY_MIN_SIZE,
      air: T.CATEGORY_BAND_AIR,
      fontWeight: T.CATEGORY_MAX.fontWeight,
    },
  );
  const categoryFont = {
    fontSize: categorySize,
    fontWeight: T.CATEGORY_MAX.fontWeight,
  };
  // `fitCategorySize` stops AT the floor rather than below it, so a name that still does not fit is
  // a name that would be drawn over its neighbour. Refused here with the ladder named, because the
  // fix is fewer columns (rung R8) or the row form (rung R0) — never smaller type.
  const widestWord = Math.max(
    ...data.flatMap((c) =>
      c.country.split(/\s+/).map((w) => measureText(w, categoryFont)),
    ),
  );
  if (widestWord > provisionalBand - T.CATEGORY_BAND_AIR)
    throw new Error(
      `vidz-bar-column-top-emitters at ${size}: the widest category word measures ` +
        `${widestWord.toFixed(0)}px at the ${categorySize}px legibility floor, and a band is only ` +
        `${provisionalBand.toFixed(0)}px wide. Nothing here makes type smaller — run the ladder: ` +
        `fewer columns (R8, and say so) or the row form (R0).`,
    );
  const categoryLines = data.map((c) =>
    wrap(c.country, provisionalBand - T.CATEGORY_BAND_AIR, categoryFont),
  );
  const categoryRows = Math.max(...categoryLines.map((l) => l.length));
  const categoryLead = Math.round(categorySize * 1.25);

  // EVERY TYPE SIZE THIS FRAME ACTUALLY DRAWS, against the row's own floor — including
  // `categorySize`, which is measured rather than declared and is the one a multiplier check would
  // miss. The guard reads `font-size="…"` out of markup because that is what it reads on the static
  // side; a video composition's markup only exists inside the browser Remotion drives, so the sizes
  // are handed to it in the same form they will be written in. It is the values that are checked,
  // and they are the values the JSX below carries.
  assertTypeFloor(
    [
      T.TITLE.fontSize,
      T.SOURCE.fontSize,
      T.AXIS_TICK.fontSize,
      T.AXIS_TITLE.fontSize,
      T.VALUE_LABEL.fontSize,
      T.CONCLUSION.fontSize,
      categorySize,
    ]
      .map((px) => `font-size="${px}"`)
      .join(" "),
    size,
    { what: `vidz-bar-column-top-emitters at ${size}` },
  );

  const padding = {
    // Headroom for the value label that sits above the tallest column.
    top:
      axisTitleBaseline +
      T.AXIS_TITLE_TO_PLOT +
      T.VALUE_LABEL.fontSize +
      T.VALUE_LABEL_TO_PLOT,
    right: PAD,
    // Grown by the credit block's own height plus clear air, so the category strip ends above it.
    // Measured DOWN FROM the credit's own baseline rather than up from the frame's foot, so the
    // portrait stage moves the plot with it instead of leaving it under the platform's caption.
    bottom:
      height -
      sourceBottom +
      T.BASELINE_TO_CATEGORY +
      categoryRows * categoryLead +
      (sourceLines.length - 1) * sourceLead +
      T.SOURCE.fontSize +
      T.CATEGORY_TO_SOURCE,
    left: PAD + tickGutter,
  };

  const g = columnGeometry(data, { width, height, padding });

  // The conclusion's own geometry, all of it derived from the data, none of it typed.
  const summed = data.slice(1, 1 + combinedCount);
  const summedLeft = g.bars[1].x;
  const summedRight = g.bars[combinedCount].x + g.bars[combinedCount].width;
  const summedTallest = Math.min(...summed.map((b) => g.y(b.gt)));
  // Clear of the value label that already sits above the tallest of the summed columns: that label
  // occupies from `top - 10 - fontSize` to `top - 10`, so the bracket goes above all of it. Measured
  // against the label's own box, never a constant — the first render put it at −22 and the bracket
  // struck through "4.90".
  const bracketY =
    summedTallest -
    (T.VALUE_LABEL.fontSize + T.VALUE_LABEL_DROP + T.BRACKET_CLEARANCE);
  const ruleY = g.y(combinedTotal);
  const conclusionTextX = summedRight + T.CONCLUSION_INSET;
  const conclusionLines = [
    ...wrap(combinedLabel, g.plot.right - conclusionTextX, T.CONCLUSION),
    `${en(combinedTotal)} ${unit}`,
  ];

  // ── The edit. Six windows, all read off the timing contract — no frame literal below.
  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const subject = progressOf(frame, timing.subject);
  const conclusion = progressOf(frame, timing.conclusion);

  // The title and the source are on screen at FRAME ZERO, at full opacity, never faded in.
  // Extracting frame 0 from the mp4 of every video beat in this corpus returns a completely blank
  // white image — measured, not assumed: `establish` starts at frame 0, so its progress there is
  // exactly 0 and everything gated on it is invisible. Frame 0 is the poster frame a social
  // platform shows before anyone presses play, and a blank poster frame is a beat that says
  // nothing. `motion-grammar.md` already argues the title is furniture that establishes what the
  // reader is looking at; that argument taken literally means it cannot be absent at the start.
  // The axis furniture still fades in over `establish` — it is the frame the data will be measured
  // in, and it has nothing to say before the data does.
  const axisOpacity = establish;

  // The reference: the zero baseline, swept left to right and then left alone to be read.
  const baselineX2 = interpolate(
    referenceProgress,
    [0, 1],
    [g.plot.left, g.plot.right],
    { easing: Easing.out(Easing.cubic) },
  );

  // The reveal: every column grows UP from the baseline to its own value.
  const growth = g.bars.map((_, i) => {
    const w = columnWindow(i, g.bars.length);
    return interpolate(reveal, [w.start, w.end], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
  });
  // Category labels sit under the baseline and belong to the band, not to the column's length, so
  // they arrive as soon as their own column starts growing.
  const categoryOpacity = growth.map((t) =>
    interpolate(t, [0, 0.08], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  // Value labels ride the growing top from early on rather than waiting for the column to finish —
  // `references/types/diverging-bar.md` records the sibling failure of gating a label on the LAST
  // slice of its bar's growth: the last-staggered bars end up unlabelled for most of the time they
  // are on screen. Here the label is legible from a third of the way up and travels with the top.
  const valueOpacity = growth.map((t) =>
    interpolate(t, [0.25, 0.5], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  // The subject: China's emphasis, once every column has landed. Critically damped — a wash that
  // overshot would show more emphasis for a few frames than the finding warrants.
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const highlightOpacity = interpolate(subjectSpring, [0, 1], [0, 0.1]);
  const emphasis = interpolate(subject, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  // The conclusion: the bracket first, then the rule rising to the summed height, then the words.
  const bracketOpacity = interpolate(conclusion, [0, 0.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ruleGrowth = interpolate(conclusion, [0.2, 0.7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const conclusionTextOpacity = interpolate(conclusion, [0.55, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
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
            y={titleBaseline + i * T.TITLE.lead}
            fill={ink}
            fontSize={T.TITLE.fontSize}
            fontWeight={T.TITLE.fontWeight}
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
            fontSize={T.SOURCE.fontSize}
          >
            {text}
          </text>
        ))}
        <text
          x={PAD}
          y={axisTitleBaseline}
          fill={muted}
          fontSize={T.AXIS_TITLE.fontSize}
          fontWeight={T.AXIS_TITLE.fontWeight}
        >
          {axisTitle}
        </text>
      </g>

      {/* Value-axis gridlines and their tick labels — established with the title, then still.
          Zero is drawn separately, with emphasis, as the `reference` event. */}
      <g opacity={axisOpacity}>
        {g.tickValues
          .filter((t) => t !== 0)
          .map((t) => (
            <g key={`tick-${t}`}>
              <line
                x1={g.plot.left}
                x2={g.plot.right}
                y1={g.y(t)}
                y2={g.y(t)}
                stroke={grid}
                strokeWidth={T.GRID_STROKE}
              />
              <text
                x={g.plot.left - T.TICK_INSET}
                y={g.y(t) + T.AXIS_TICK.fontSize * 0.34}
                fill={muted}
                fontSize={T.AXIS_TICK.fontSize}
                fontWeight={T.AXIS_TICK.fontWeight}
                textAnchor="end"
              >
                {en(t, 0)}
              </text>
            </g>
          ))}
      </g>

      {/* The reference: the zero baseline every column is measured from. */}
      {referenceProgress > 0 ? (
        <g>
          <line
            x1={g.plot.left}
            x2={baselineX2}
            y1={g.plot.bottom}
            y2={g.plot.bottom}
            stroke={ink}
            strokeWidth={T.BASELINE_STROKE}
          />
          <text
            x={g.plot.left - T.TICK_INSET}
            y={g.plot.bottom + T.AXIS_TICK.fontSize * 0.34}
            fill={muted}
            fontSize={T.AXIS_TICK.fontSize}
            fontWeight={T.AXIS_TICK.fontWeight}
            textAnchor="end"
            opacity={referenceProgress}
          >
            0
          </text>
        </g>
      ) : null}

      {/* The subject's highlight wash, behind its column — a wash, not a mark. */}
      {highlightOpacity > 0 ? (
        <rect
          x={g.bars[subjectIndex].centre - g.band / 2}
          y={g.plot.top - T.HIGHLIGHT_RISE}
          width={g.band}
          height={g.plot.bottom - g.plot.top + T.HIGHLIGHT_RISE}
          fill={accent}
          opacity={highlightOpacity}
        />
      ) : null}

      {/* The columns. Every opacity below is absolute — never divided back out of a parent
          group's opacity — so nothing produces NaN before a column's own window opens. */}
      {g.bars.map((b, i) => {
        const grown = (g.plot.bottom - b.top) * growth[i];
        const top = g.plot.bottom - grown;
        const isSubject = i === subjectIndex;
        return (
          <g key={b.country}>
            {/* ONE column whose fill switches at the same boundary its category label already
                switches on (`emphasis > 0.5` below) — never a second accent-coloured column
                dissolving over a neutral one, which spends the whole window in a blend of `muted`
                and `accent` that nobody chose. */}
            <rect
              x={b.x}
              y={top}
              width={b.width}
              height={Math.max(0, grown)}
              fill={isSubject && emphasis > 0.5 ? accent : muted}
            />
            <text
              x={b.centre}
              y={top - T.VALUE_LABEL_DROP}
              fill={ink}
              fontSize={T.VALUE_LABEL.fontSize}
              fontWeight={T.VALUE_LABEL.fontWeight}
              textAnchor="middle"
              opacity={valueOpacity[i]}
            >
              {/* The number the label prints is the height the column is CURRENTLY drawn at, not
                  the value it is heading for. The scale starts at zero and is linear, so the drawn
                  height is exactly `gt × growth` — printing `gt` instead put "3.19" above a column
                  standing at 2.15 for most of its own arrival, which is a label naming a length
                  that has not landed. Extracted from the mp4 at frame 100, not visible in the
                  final-frame still. */}
              {en(b.gt * growth[i])}
            </text>
            {categoryLines[i].map((text, line) => (
              <text
                key={text}
                x={b.centre}
                y={g.plot.bottom + T.BASELINE_TO_CATEGORY + categorySize + line * categoryLead}
                fill={isSubject && emphasis > 0.5 ? accent : ink}
                fontSize={categorySize}
                fontWeight={
                  isSubject && emphasis > 0.5 ? 700 : categoryFont.fontWeight
                }
                textAnchor="middle"
                opacity={categoryOpacity[i]}
              >
                {text}
              </text>
            ))}
          </g>
        );
      })}

      {/* The conclusion: a bracket naming the columns that are summed, a rule at the sum's own
          height, and the sentence. The comparison is the rule passing BELOW the leading column's
          top — nothing here states it in words. */}
      {bracketOpacity > 0 ? (
        <g opacity={bracketOpacity}>
          <path
            d={`M ${summedLeft} ${bracketY + T.BRACKET_TICK} L ${summedLeft} ${bracketY} L ${summedRight} ${bracketY} L ${summedRight} ${bracketY + T.BRACKET_TICK}`}
            fill="none"
            stroke={muted}
            strokeWidth={T.BRACKET_STROKE}
          />
          <line
            x1={(summedLeft + summedRight) / 2}
            x2={(summedLeft + summedRight) / 2}
            y1={bracketY}
            y2={interpolate(ruleGrowth, [0, 1], [bracketY, ruleY])}
            stroke={muted}
            strokeWidth={T.BRACKET_STROKE}
            strokeDasharray={`${T.BRACKET_TICK} ${T.BRACKET_TICK}`}
          />
        </g>
      ) : null}
      {ruleGrowth > 0 ? (
        <line
          // The rule is born at the leader-end of the bracket and travels LEFT, across the leading
          // column, so its arrival is the comparison happening. x1 is the fixed end; interpolating
          // BOTH ends (the first draft's mistake) collapses the line to zero length at full growth.
          x1={summedRight}
          x2={interpolate(ruleGrowth, [0, 1], [summedRight, g.plot.left], {
            easing: Easing.out(Easing.cubic),
          })}
          y1={ruleY}
          y2={ruleY}
          stroke={ink}
          strokeWidth={T.RULE_STROKE}
          strokeDasharray={`${T.CONCLUSION_INSET} ${T.BRACKET_CLEARANCE}`}
          opacity={bracketOpacity}
        />
      ) : null}
      {conclusionTextOpacity > 0
        ? conclusionLines.map((text, i) => (
            <text
              key={text}
              x={conclusionTextX}
              y={ruleY - T.CONCLUSION_LIFT + i * T.CONCLUSION.lead}
              fill={ink}
              fontSize={T.CONCLUSION.fontSize}
              fontWeight={T.CONCLUSION.fontWeight}
              opacity={conclusionTextOpacity}
            >
              {text}
            </text>
          ))
        : null}
    </svg>
  );
}
