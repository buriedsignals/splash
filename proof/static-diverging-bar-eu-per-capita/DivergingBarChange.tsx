/**
 * The STATIC beat of "Croatia is the only EU country emitting more CO₂ per person than in 1990" —
 * one frame, 900 × 1000, no motion and no interaction. Twenty-seven signed values growing left and
 * right out of a zero line, rows sorted from the largest rise to the largest fall.
 *
 * Written fresh from `ChartSeed.tsx`'s shape against
 * `chart-beat/references/types/diverging-bar.md`. It is NOT the video sibling's component with
 * the timing taken out: a video can spend ten seconds introducing the zero line, growing each bar
 * out of it and only then descending the average rule, so at no single instant does it hold every
 * word this frame has to hold at once. A still has one instant. Every consequence below follows
 * from that.
 *
 * WHAT THIS FORMAT OWES THAT THE VIDEO DID NOT.
 *
 * 1. EVERY LABEL LEGIBLE AT REST, SIMULTANEOUSLY. The video's value labels faded in one row at a
 *    time and rode their own bar's growing tip, so the crowded band around the average rule was
 *    never fully populated until the last frame. Here all 27 are printed from the start, on top of
 *    four gridlines, the zero line and the average rule. That is why the value labels are the LAST
 *    thing drawn and why each carries a ground-coloured halo (`paintOrder="stroke"`).
 *
 * 2. THE CLAIM DEFECT THIS TYPE HAS ALREADY SHIPPED, AND WHY THE HALO IS NOT COSMETIC. In the
 *    video build, the conclusion's dashed rule at −4.93 struck clean through "−3.94", "−4.01" and
 *    "−4.09" — and turned the minus of "−3.39" into what reads as "+3.39". A reader would have seen
 *    a country RISE that fell, in a chart whose entire argument is which side of zero a row lands
 *    on. The frame below is denser than that video frame ever was, so the same collision is
 *    guaranteed rather than possible: at 29.8 px per tonne, a value label is ~46px wide and the
 *    average rule sits 29px from the label of any row within one tonne of it. Two things answer it
 *    together — draw order (both rules before every value label) and the halo (so a label crossing
 *    a gridline anywhere else stays readable too). Neither alone is enough.
 *
 * 3. THE SUBJECT IS A SLIVER, AND A STILL CANNOT RING IT IN TIME. Croatia's rise is +0.03 tonnes on
 *    a domain 21.3 tonnes wide: 1.3 pixels of accent. The video spent a spring, a ring and a wash
 *    on it over 40 frames. Here the row carries an accent wash band, a bold name, and a direct
 *    annotation printed into the empty half of its own row — the space to the LEFT of zero that
 *    this one row, uniquely, does not use. Three redundant signals, none of them motion.
 *
 * COLOUR — the one place this type's requirement outranks the corpus habit. The sheet asks for
 * exactly two fills, one per sign, so colour here encodes the SIGN and the accent is spent the
 * moment the positive bar is drawn; it cannot ALSO be held back to mark the subject. On this beat
 * that costs nothing, because the subject IS the only positive row. See `PALETTE.md`.
 *
 * Value labels stay in page ink and are signed EXPLICITLY, with U+2212 rather than a hyphen — a
 * label painted in the bar's own fill is this whole bar family's named WCAG failure.
 *
 * `wrap` is this story's own copy of the corpus function of that name, per the duplicate-do-not-link
 * rule; `measureText`/`deriveFurniture`/`FONT_FAMILY` come from the installed root's own vendored
 * rasteriser, which is the one thing a beat does import.
 */

import { scaleLinear } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/chart-beat/render-still.mjs";
import {
  frameInsetFor,
  sizeFor,
  stageFor,
} from "#shared/chart-beat/sizes.mjs";
import { formForSize } from "#shared/chart-beat/type-at-size.mjs";

export type Row = {
  country: string;
  /** Change in CO₂ emissions per person between the two years, tonnes. Negative is a fall. */
  change: number;
};

/** The type this beat draws, in `references/types/` vocabulary. `formForSize` answers for it —
 *  `diverging-bar` is a band-scale type, so its answer at a tall or square frame is the twin FORM,
 *  and this beat is ALREADY in it: rows down the frame, names horizontal on one line. The transpose
 *  is therefore a no-op here, which is worth stating rather than leaving as an absence. */
export const TYPE = "diverging-bar";

/**
 * THE 900x1000 TUNING, KEPT AS THE BASE, WITH THE SIZE ROW'S `typeScale` AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more. The frame is `sizeFor(size)`'s and `size` is gate 2c's
 * decision, read out of this beat's own `BRIEF.md`. Every spacing literal below used to be bare
 * inside the layout arithmetic — `+ 26`, `+ 16`, `+ 14`, `+ 34`, `+ 28`, `+ 10`, `+ 22`, `+ 8`,
 * `− 12` — and leaving those at a 900px value while the type grows is what collides a header
 * (`proof/static-carbon-footprint-spread/probe/VERDICT.md`). `PAD` is the one exception: a frame's
 * margin is proportional to the CANVAS, which `frameInsetFor` states and argues.
 */
const BASE = {
  TITLE: { fontSize: 24, fontWeight: 700, lead: 30 },
  SUBTITLE: { fontSize: 15, fontWeight: 400, lead: 20 },
  SOURCE: { fontSize: 14, fontWeight: 400, lead: 19 },
  AXIS_TITLE: { fontSize: 13, fontWeight: 500 },
  AXIS_TICK: { fontSize: 13, fontWeight: 500 },
  ROW_LABEL: { fontSize: 13, fontWeight: 400 },
  ROW_LABEL_SUBJECT: { fontSize: 13, fontWeight: 700 },
  VALUE_LABEL: { fontSize: 13, fontWeight: 600 },
  ANNOTATION: { fontSize: 13, fontWeight: 400 },
  /** The halo each value label carries, in stroke width — see this file's own point 2. */
  LABEL_HALO: 6,
  TITLE_TO_SUBTITLE: 26,
  SUBTITLE_TO_AXIS_TITLE: 34,
  AXIS_TITLE_TO_TICKS: 28,
  TICKS_TO_PLOT: 34,
  SOURCE_AIR: 10,
  NAME_GUTTER_AIR: 16,
  VALUE_GUTTER_AIR: 14,
  VALUE_GUTTER_TO_PLOT: 10,
  VALUE_LABEL_OFFSET: 8,
  ANNOTATION_OFFSET: 22,
  AVERAGE_LABEL_RISE: 12,
  /** The thickest a bar is drawn, whatever room the row has. */
  BAR_MAX: 16,
  ZERO_RULE_WIDTH: 2,
  AVERAGE_RULE_WIDTH: 1.5,
  /**
   * A regular gridline landing this close to the average rule is DROPPED, with its tick label.
   * Measured on the first render at 900x1000: the −5 gridline fell 2px from the dashed rule at
   * −4.93 and the two read as one smeared line.
   */
  MIN_GRIDLINE_GAP: 24,
} as const;

/** The dash patterns, scaled with the frame: a `"8 5"` written for a 900px frame arrives as a
 *  different rhythm on a 1920px one, and the rasteriser no longer doubles them for us. */
const AVERAGE_DASH_BASE = [8, 5];

function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  const f = (tok: { fontSize: number; fontWeight: number; lead?: number }) => ({
    ...tok,
    fontSize: sp(tok.fontSize),
    ...(tok.lead === undefined ? {} : { lead: sp(tok.lead) }),
  });
  return {
    TITLE: f(BASE.TITLE) as typeof BASE.TITLE,
    SUBTITLE: f(BASE.SUBTITLE) as typeof BASE.SUBTITLE,
    SOURCE: f(BASE.SOURCE) as typeof BASE.SOURCE,
    AXIS_TITLE: f(BASE.AXIS_TITLE) as typeof BASE.AXIS_TITLE,
    AXIS_TICK: f(BASE.AXIS_TICK) as typeof BASE.AXIS_TICK,
    ROW_LABEL: f(BASE.ROW_LABEL) as typeof BASE.ROW_LABEL,
    ROW_LABEL_SUBJECT: f(BASE.ROW_LABEL_SUBJECT) as typeof BASE.ROW_LABEL_SUBJECT,
    VALUE_LABEL: f(BASE.VALUE_LABEL) as typeof BASE.VALUE_LABEL,
    ANNOTATION: f(BASE.ANNOTATION) as typeof BASE.ANNOTATION,
    LABEL_HALO: sp(BASE.LABEL_HALO),
    TITLE_TO_SUBTITLE: sp(BASE.TITLE_TO_SUBTITLE),
    SUBTITLE_TO_AXIS_TITLE: sp(BASE.SUBTITLE_TO_AXIS_TITLE),
    AXIS_TITLE_TO_TICKS: sp(BASE.AXIS_TITLE_TO_TICKS),
    TICKS_TO_PLOT: sp(BASE.TICKS_TO_PLOT),
    SOURCE_AIR: sp(BASE.SOURCE_AIR),
    NAME_GUTTER_AIR: sp(BASE.NAME_GUTTER_AIR),
    VALUE_GUTTER_AIR: sp(BASE.VALUE_GUTTER_AIR),
    VALUE_GUTTER_TO_PLOT: sp(BASE.VALUE_GUTTER_TO_PLOT),
    VALUE_LABEL_OFFSET: sp(BASE.VALUE_LABEL_OFFSET),
    ANNOTATION_OFFSET: sp(BASE.ANNOTATION_OFFSET),
    AVERAGE_LABEL_RISE: sp(BASE.AVERAGE_LABEL_RISE),
    BAR_MAX: sp(BASE.BAR_MAX),
    ZERO_RULE_WIDTH: Math.max(1, sp(BASE.ZERO_RULE_WIDTH)),
    AVERAGE_RULE_WIDTH: Math.max(1, sp(BASE.AVERAGE_RULE_WIDTH)),
    MIN_GRIDLINE_GAP: sp(BASE.MIN_GRIDLINE_GAP),
    AVERAGE_DASH: AVERAGE_DASH_BASE.map((v) => sp(v)).join(" "),
  };
}

/** How many ticks the value axis asks d3 for. A hint, not a count. Ladder rung R2 at a phone
 *  frame — the only rung that gives budget back without removing anything vertical. */
const TICK_HINT = 6;
function tickHintFor(size: string) {
  return sizeFor(size).minTypePx >= 36 ? 3 : TICK_HINT;
}

/**
 * THE REMOVAL LADDER THIS BEAT RUNS, per size, recorded so the render can print it.
 *
 * Twenty-seven rows are the claim — "of the 27 EU member states, exactly one" — so R8 is closed
 * before it is reached, and everything above it is furniture. At a phone frame R2 and R3 fire.
 */
export function rungsFor(size: string): string[] {
  if (sizeFor(size).minTypePx < 36) return [];
  return ["R2: value-axis ticks 6 -> 3"];
}

function firstSentence(text: string): string {
  const stop = text.indexOf(". ");
  return stop === -1 ? text : text.slice(0, stop + 1);
}

/** How far the subject's own wash band sits from the ground, toward the accent. Unitless. */
const SUBJECT_BAND_TINT = 0.12;
/**
 * English, and signed EXPLICITLY. The sheet requires a + or a − on every value label on this type,
 * because the sign IS the finding and a bare number leaves it to the bar's direction alone. The
 * minus is U+2212, never a hyphen: a hyphen is narrower, sits lower, and is the character a
 * gridline crossing it turns into a plus.
 *
 * Grouping is delegated to `Intl.NumberFormat` — this beat's own values never reach a thousand, but
 * a hand-rolled separator is the exact defect the corpus already paid for three times over, and a
 * formatter named for a locale it does not produce is the other half of it. Formats the ABSOLUTE
 * value and prefixes the sign, because `Intl` would emit its own U+002D.
 */
export function en(value: number, decimals = 2): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const digits = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value));
  return `${sign}${digits}`;
}

/**
 * The subject row's own background: the ground moved `ratio` of the way toward the accent.
 *
 * It is computed rather than drawn as a translucent overlay for one reason found by looking at the
 * first render: the two labels on that row carry a ground-coloured halo, and against a TINTED band
 * a white halo punches ragged white holes through it — the row read as a smear rather than a
 * highlight. Compositing here gives one opaque colour that the band is filled with AND the halo is
 * stroked in, so the two match exactly instead of approximately. No hex is named: this is derived
 * from the two colours the beat was handed, the same way `deriveFurniture` derives the rest.
 */
function blend(ground: string, toward: string, ratio: number): string {
  const channels = (hex: string) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const target = channels(toward);
  return `#${channels(ground)
    .map((v, i) =>
      Math.round(v + (target[i] - v) * ratio)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** Wrap on the measured width of the real string, never on a character count. */
function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const trial = line ? `${line} ${word}` : word;
    if (line && measureText(trial, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...lines, line] : lines;
}

/**
 * Data to coordinates. Pure — no colour, no font, no React, no label.
 *
 * The domain is the readings' own range and it CONTAINS zero rather than starting at it. It is
 * deliberately NOT made symmetric: mirroring a −20.5 fall with a +20.5 half nobody occupies would
 * halve the pixels per tonne on BOTH sides to make room for nothing. Equal units per pixel either
 * side of zero — which is what makes any two bars comparable — is the requirement that actually
 * matters, and it is preserved. The visible asymmetry is the data's: 26 of 27 rows fell.
 *
 * ── COLUMNS, AND WHY THIS FUNCTION LEARNED ABOUT THEM ─────────────────────────────────────────
 *
 * The old frame was 900 x 1000 and the 1000 was chosen FOR twenty-seven rows: width was fixed and
 * height followed the content. R2 pins both, so the content has to fit the frame — and at
 * 1920 x 1080, after a headline, a standfirst, an axis and a credit, twenty-seven rows get 12.6px
 * of pitch each against a 29px row label. Every name would be printed through its neighbours, with
 * `assertTypeFloor` green (the type IS 29px) and `assertPlotAspect` silent (a band-scale type has
 * no measured aspect range).
 *
 * What a landscape frame HAS that the old one did not is width — 1920 against 900. So the rows are
 * packed into more than one column when one will not hold them, each column carrying its own name
 * gutter, value gutter, zero line and axis, all over the SAME domain and the SAME panel width, so
 * pixels-per-tonne is identical in every column and any two bars anywhere in the chart stay
 * comparable. That is the invariant this type rests on and it is the one thing the packing may not
 * cost.
 *
 * Reading order is down column one, then down column two — the sort is descending, so the ranking
 * still reads in one direction.
 */
export function divergingGeometry(
  rows: Row[],
  {
    width,
    height,
    padding,
    tickHint = TICK_HINT,
    columns = 1,
    columnGap = 0,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    tickHint?: number;
    /** How many side-by-side stacks the rows are packed into. */
    columns?: number;
    /** The air between two stacks. */
    columnGap?: number;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const values = rows.map((r) => r.change);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const pad = (max - min) * 0.02;

  const panelWidth =
    (plot.right - plot.left - columnGap * (columns - 1)) / columns;
  const perColumn = Math.ceil(rows.length / columns);
  const rowHeight = (plot.bottom - plot.top) / perColumn;

  /** The value scale of column `k`. Every column has the same width and the same domain, so they
   *  share a units-per-pixel — which is what keeps bars in different columns comparable. */
  const scaleFor = (k: number) =>
    scaleLinear()
      .domain([min - pad, max + pad])
      .range([
        plot.left + k * (panelWidth + columnGap),
        plot.left + k * (panelWidth + columnGap) + panelWidth,
      ]);

  const points = rows.map((r, i) => {
    const column = Math.floor(i / perColumn);
    const indexInColumn = i - column * perColumn;
    const x = scaleFor(column);
    return {
      ...r,
      column,
      y: plot.top + rowHeight * (indexInColumn + 0.5),
      xValue: x(r.change),
    };
  });

  const first = scaleFor(0);
  return {
    plot,
    rowHeight,
    perColumn,
    columns,
    panelWidth,
    points,
    scaleFor,
    panelLeft: (k: number) => plot.left + k * (panelWidth + columnGap),
    zeroXOf: (k: number) => scaleFor(k)(0),
    /** The tick VALUES are a property of the domain, so they are asked once and drawn per column. */
    tickValues: first.ticks(tickHint).filter((t) => t !== 0),
  };
}

export function DivergingBarChange({
  rows,
  title,
  subtitle,
  source,
  alt,
  ground,
  accent,
  subject,
  subjectNote,
  axisTitle,
  averageFall,
  averageFallLabel,
  size,
}: {
  /** Pre-sorted by change, descending — the render script's job, so the ranking is a decision made
   *  once, at the data layer. This component draws the order it is given. */
  rows: Row[];
  title: string;
  subtitle: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  /** The country the claim is about, named by the claim rather than picked by size. */
  subject: string;
  /** The direct annotation printed inside the subject's own row. Computed by the caller. */
  subjectNote: string;
  /** Ends with the unit, comma-separated — which is what ladder rung R1 folds into the last tick
   *  label when it fires. */
  axisTitle: string;
  /** The mean of the falls, tonnes per person — where the dashed rule stands. Computed by the
   *  caller from the frozen data, never typed. */
  averageFall: number;
  averageFallLabel: string;
  /** The size gate 2c pinned, read from this beat's own `BRIEF.md`. Not a default. */
  size: string;
}) {
  if (rows.length < 3)
    throw new Error(
      `a diverging bar beat needs at least three rows, got ${rows.length}`,
    );

  // The domain has to genuinely straddle zero or this is a plain bar chart with a decorative
  // complication — the type sheet says exactly that, so the component refuses rather than drawing
  // a centred baseline nothing ever crosses.
  const straddles =
    rows.some((r) => r.change > 0) && rows.some((r) => r.change < 0);
  if (!straddles)
    throw new Error(
      "every value has the same sign — a diverging bar drawn on a domain that never crosses zero " +
        "is a plain bar chart with a decorative complication, and the type sheet says so",
    );
  const subjectIndex = rows.findIndex((r) => r.country === subject);
  if (subjectIndex < 0)
    throw new Error(
      `subject ${JSON.stringify(subject)} is not one of the rows drawn`,
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height, typeScale } = sizeFor(size);
  const stage = stageFor(size);
  const PAD = frameInsetFor(size);
  const T = tokens(typeScale);
  const contentTop = stage.reserved ? stage.top : PAD;
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;
  // A no-op for this type/beat pair, asserted rather than assumed: this beat is already row-driven,
  // so the twin form it would transpose INTO is the form it is written in.
  const form = formForSize(TYPE, size);
  if (form.verdict !== "as-is" && form.verdict !== "transpose")
    throw new Error(
      `static-diverging-bar-eu-per-capita: ${TYPE} answered ${form.verdict} at ${size} — ` +
        `this beat only knows the row form. ${form.reason}`,
    );

  // ── The header block. Each of the stacked text blocks clears the one above it by a MEASURED
  // amount: the video sibling's first render put its axis title 12px under a two-line caveat and
  // the two overprinted.
  const titleLines = wrap(title, width - PAD * 2, T.TITLE);
  const titleBaseline = contentTop + T.TITLE.fontSize;
  const subtitleTop =
    titleBaseline + (titleLines.length - 1) * T.TITLE.lead + T.TITLE_TO_SUBTITLE;
  const sourceLines = wrap(source, width - PAD * 2, T.SOURCE);
  // THE SOURCE SITS ON THE BOTTOM OF THE BAND — the LAST line lands there, the same edge the title
  // hangs off at the top, on the same x. See
  // chart-beat/references/static-discipline.md, "The source on the frame's bottom margin".
  // At portrait that bottom is the STAGE's, not the frame's: the platform's caption and progress
  // bar sit over the rest of the frame, and a covered credit is an attribution failure.
  const sourceTop = sourceBottom - (sourceLines.length - 1) * T.SOURCE.lead;
  const plotFloor = sourceTop - T.SOURCE.fontSize - T.SOURCE_AIR;

  // ── Both gutters measured against the strings that will actually be drawn in them, at the exact
  // font they will be drawn in. The video sibling's first render read "Luxembo—20.48" because the
  // country names sat 12px off the plot edge, which is where the longest bar's own value label
  // already was: the name gutter sits OUTSIDE the value gutter, not on top of it.
  const nameGutter =
    Math.max(
      ...rows.map((r) =>
        Math.max(
          measureText(r.country, T.ROW_LABEL),
          measureText(r.country, T.ROW_LABEL_SUBJECT),
        ),
      ),
    ) + T.NAME_GUTTER_AIR;
  const valueGutter =
    Math.max(...rows.map((r) => measureText(en(r.change), T.VALUE_LABEL))) +
    T.VALUE_GUTTER_AIR;

  // ── THE PACKING DECISION, AND THE LADDER RUN SPECULATIVELY TO REACH IT.
  //
  // The pitch floor is one line of the row label's own type: below it the names print through each
  // other. Two things can buy pitch — REMOVING furniture from the header (the ladder) and packing
  // the rows into more than one column, which spends the frame's WIDTH on the height it does not
  // have. Fewer columns is strictly better: a column costs a name gutter and two value gutters, so
  // a third column on this frame leaves 193px of panel against 328px of gutter and the bars stop
  // being lengths (the `barSpan` refusal below measured exactly that).
  //
  // So every rung is applied SPECULATIVELY, in the ladder's own order, and the first candidate that
  // reaches the fewest columns anything reaches is the one drawn — which is `type-at-size.mjs`'s
  // own note made mechanical: "every rung is applied speculatively and kept only if the slack
  // actually improved." Dropping the axis title alone changes nothing here (3 columns either way);
  // dropping it AND taking the standfirst's first sentence is what reaches two.
  const pitchFloor = T.ROW_LABEL.fontSize;
  const candidates = [
    { rungs: [] as string[], axisTitleShown: true, standfirstSentences: "all" },
    {
      rungs: ["R1: the axis title, its unit folded into the outermost tick label"],
      axisTitleShown: false,
      standfirstSentences: "all",
    },
    {
      rungs: [
        "R1: the axis title, its unit folded into the outermost tick label",
        "R3: the standfirst keeps its first sentence only",
      ],
      axisTitleShown: false,
      standfirstSentences: "first",
    },
    {
      rungs: [
        "R1: the axis title, its unit folded into the outermost tick label",
        "R7: the standfirst entirely",
      ],
      axisTitleShown: false,
      standfirstSentences: "none",
    },
  ];
  const layoutFor = (c: (typeof candidates)[number]) => {
    const standfirst =
      c.standfirstSentences === "all"
        ? subtitle
        : c.standfirstSentences === "first"
          ? firstSentence(subtitle)
          : "";
    const subtitleLines = standfirst
      ? wrap(standfirst, width - PAD * 2, T.SUBTITLE)
      : [];
    const headerBottom = subtitleLines.length
      ? subtitleTop + (subtitleLines.length - 1) * T.SUBTITLE.lead
      : titleBaseline + (titleLines.length - 1) * T.TITLE.lead;
    const axisTitleBaseline = headerBottom + T.SUBTITLE_TO_AXIS_TITLE;
    const axisTickBaseline =
      axisTitleBaseline + (c.axisTitleShown ? T.AXIS_TITLE_TO_TICKS : 0);
    const plotTop = axisTickBaseline + T.TICKS_TO_PLOT;
    const plotHeight = plotFloor - plotTop;
    let columns = 1;
    // Counted on `ceil(n / columns)` rather than on `n / columns`, because 27 rows in 2 columns is
    // 14 and 13, not 13.5 — the first render of this packing landed at 28.6px against a 29px floor
    // for exactly that half-row.
    while (
      columns < 6 &&
      plotHeight / Math.ceil(rows.length / columns) < pitchFloor
    )
      columns += 1;
    return {
      ...c,
      subtitleLines,
      axisTitleBaseline,
      axisTickBaseline,
      plotTop,
      plotHeight,
      columns,
    };
  };
  const tried = candidates.map(layoutFor);
  const fewest = Math.min(...tried.map((t) => t.columns));
  const layout = tried.find((t) => t.columns === fewest)!;
  const subtitleLines = layout.subtitleLines;
  const rungs = [
    ...layout.rungs,
    ...(layout.columns > 1
      ? [
          `packing: ${rows.length} rows in ${layout.columns} columns — the width of the frame ` +
            `spent on the height it does not have`,
        ]
      : []),
    ...rungsFor(size),
  ];
  /** The unit R1 folds into the last tick label — the axis title's own last comma-separated part,
   *  read off the string rather than retyped beside it. */
  const unit = axisTitle.split(",").pop()!.trim();

  const padding = {
    top: layout.plotTop,
    // A positive bar grows RIGHT and prints its label to the right of its own end, and this
    // domain's maximum is +0.03 — so zero sits at 98% of each panel and that label lands in the
    // panel's right gutter. Measured, not assumed.
    right: PAD + valueGutter + T.VALUE_GUTTER_TO_PLOT,
    bottom: height - plotFloor,
    left: PAD + nameGutter + valueGutter,
  };
  const columnGap = nameGutter + valueGutter + T.VALUE_GUTTER_TO_PLOT;

  const g = divergingGeometry(rows, {
    width,
    height,
    padding,
    tickHint: tickHintFor(size),
    columns: layout.columns,
    columnGap,
  });

  // THE LAST RUNG, FIRED RATHER THAN DESCRIBED. Even with R1 spent and the rows packed, a frame can
  // be too small for twenty-seven of anything — and neither `assertTypeFloor` (the type IS at its
  // floor) nor `assertPlotAspect` (a band-scale type has no measured range) can say so.
  if (g.rowHeight < pitchFloor)
    throw new Error(
      `static-diverging-bar-eu-per-capita: at ${size} the ${rows.length} rows in ` +
        `${g.columns} column(s) get ${g.rowHeight.toFixed(1)}px of pitch each, under the ` +
        `${pitchFloor}px one line of row-label type occupies — ` +
        `${(g.plot.bottom - g.plot.top).toFixed(0)}px of plot for ${g.perColumn} rows a column, ` +
        `so every name would be printed through its neighbours.\n` +
        `The ladder is spent: ${rungs.join("; ") || "no rung fires at this size"}. R8 is closed ` +
        `before it is reached — the claim is "of the 27 EU member states, exactly one", so a ` +
        `shorter list is a different sentence.\nR9: this beat does not ship ${size}.`,
    );
  // And a column narrow enough that the bars stop being lengths is the packing's own failure mode.
  // A column costs one name gutter and two value gutters before a single pixel of bar is drawn, so
  // the test is the panel against its own overhead: when the gutters are wider than the drawing,
  // the reader is looking at a table with a decorative complication.
  if (g.panelWidth < columnGap)
    throw new Error(
      `static-diverging-bar-eu-per-capita: at ${size} the packing leaves ${g.panelWidth.toFixed(0)}px ` +
        `of bar in a column that costs ${columnGap.toFixed(0)}px of gutter — a name gutter ` +
        `(${nameGutter.toFixed(0)}) plus two value gutters (${valueGutter.toFixed(0)}). A column ` +
        `that is mostly gutter is a table with a decorative complication.\n` +
        `R9: this beat does not ship ${size}.`,
    );

  const barHeight = Math.min(T.BAR_MAX, g.rowHeight * 0.62);
  const rowBaselineOffset = T.ROW_LABEL.fontSize * 0.34;
  const subjectPoint = g.points[subjectIndex];
  const subjectBand = blend(ground, accent, SUBJECT_BAND_TINT);
  const columnIndexes = Array.from({ length: g.columns }, (_, k) => k);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      fontFamily={FONT_FAMILY}
      // EVERY RUNG THAT FIRED, RECORDED IN THE ARTIFACT ITSELF. `type-at-size.mjs` says a rung that
      // fires is a decision and "a decision nobody chose does not happen silently"; a console line
      // in the runner is gone the moment the terminal scrolls. The runner reads this back out of
      // the rendered markup and prints it, so the two cannot disagree.
      data-ladder={rungs.join("; ") || "none"}
    >
      <desc>{alt}</desc>
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {titleLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={titleBaseline + i * T.TITLE.lead}
          fill={ink}
          fontSize={T.TITLE.fontSize}
          fontWeight={T.TITLE.fontWeight}
        >
          {line}
        </text>
      ))}
      {subtitleLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={subtitleTop + i * T.SUBTITLE.lead}
          fill={muted}
          fontSize={T.SUBTITLE.fontSize}
        >
          {line}
        </text>
      ))}
      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={sourceTop + i * T.SOURCE.lead}
          fill={muted}
          fontSize={T.SOURCE.fontSize}
        >
          {line}
        </text>
      ))}

      {layout.axisTitleShown && (
        <text
          x={PAD}
          y={layout.axisTitleBaseline}
          fill={muted}
          fontSize={T.AXIS_TITLE.fontSize}
          fontWeight={T.AXIS_TITLE.fontWeight}
        >
          {axisTitle}
        </text>
      )}

      {/* THE AXIS, PER COLUMN. Each column carries its own gridlines and its own tick labels,
          because a column is a whole small chart on the shared domain — a reader looking at column
          two must be able to locate a value without tracking back across the frame. */}
      {columnIndexes.map((k) => {
        const x = g.scaleFor(k);
        const averageX = x(averageFall);
        // See MIN_GRIDLINE_GAP. Dropped by MEASURED pixel distance, not by comparing the tick's own
        // value to the average — the same interval is a collision on a narrow column and
        // comfortably apart on a wide one.
        const ticks = g.tickValues.filter(
          (t) => Math.abs(x(t) - averageX) >= T.MIN_GRIDLINE_GAP,
        );
        return (
          <g key={`axis-${k}`}>
            {ticks.map((t, i) => (
              <g key={`tick-${k}-${t}`}>
                <line
                  x1={x(t)}
                  x2={x(t)}
                  y1={g.plot.top}
                  y2={g.plot.bottom}
                  stroke={grid}
                  strokeWidth={1}
                />
                <text
                  x={x(t)}
                  y={layout.axisTickBaseline}
                  fill={muted}
                  fontSize={T.AXIS_TICK.fontSize}
                  fontWeight={T.AXIS_TICK.fontWeight}
                  textAnchor="middle"
                >
                  {/* Rung R1's own instruction: when the axis title goes, its unit folds into a
                      tick label rather than disappearing with it. It goes on the OUTERMOST tick —
                      the first one read on an axis that runs from −20 to 0 — and not on the one
                      nearest the zero line, where the first render put it: the unit widened the
                      −10 label until it touched −15, and the axis lost the spacing it had. */}
                  {!layout.axisTitleShown && i === 0
                    ? `${en(t, 0)} ${unit}`
                    : en(t, 0)}
                </text>
              </g>
            ))}
          </g>
        );
      })}

      {/* The subject's own wash band, behind its row — one of the three redundant signals that
          replace the video's spring-and-ring on a 1.3-pixel bar. Filled OPAQUE with a composited
          colour rather than translucent accent, so the two labels that sit on this row can stroke
          their halo in exactly the colour behind them. It spans the subject's OWN column, not the
          frame, now that a frame can hold more than one. */}
      <rect
        x={g.panelLeft(subjectPoint.column) - nameGutter - valueGutter}
        y={subjectPoint.y - g.rowHeight / 2}
        width={g.panelWidth + nameGutter + valueGutter}
        height={g.rowHeight}
        fill={subjectBand}
      />

      {/* The bars. Two fills, one per sign — accent for the rise the headline is about, the
          furniture's own muted for the 26 falls. */}
      {g.points.map((p) => {
        const zeroX = g.zeroXOf(p.column);
        const left = Math.min(zeroX, p.xValue);
        return (
          <rect
            key={`bar-${p.country}`}
            x={left}
            y={p.y - barHeight / 2}
            width={Math.abs(p.xValue - zeroX)}
            height={barHeight}
            fill={p.change >= 0 ? accent : muted}
          />
        );
      })}

      {/* Country names, in the NAME gutter — which sits to the left of the VALUE gutter, on that
          row's own column. */}
      {g.points.map((p, i) => (
        <text
          key={`name-${p.country}`}
          x={g.panelLeft(p.column) - valueGutter}
          y={p.y + rowBaselineOffset}
          fill={ink}
          fontSize={T.ROW_LABEL.fontSize}
          fontWeight={
            i === subjectIndex
              ? T.ROW_LABEL_SUBJECT.fontWeight
              : T.ROW_LABEL.fontWeight
          }
          textAnchor="end"
        >
          {p.country}
        </text>
      ))}

      {/* The reference: the zero line, drawn ON TOP of the bars so no fill can cover it — the
          sheet's own requirement, and the reason it is not painted before them. One per column. */}
      {columnIndexes.map((k) => (
        <g key={`zero-${k}`}>
          <line
            x1={g.zeroXOf(k)}
            x2={g.zeroXOf(k)}
            y1={g.plot.top}
            y2={g.plot.bottom}
            stroke={ink}
            strokeWidth={T.ZERO_RULE_WIDTH}
          />
          <text
            x={g.zeroXOf(k)}
            y={layout.axisTickBaseline}
            fill={ink}
            fontSize={T.AXIS_TICK.fontSize}
            fontWeight={T.AXIS_TICK.fontWeight}
            textAnchor="middle"
          >
            0
          </text>
        </g>
      ))}

      {/* Where the 26 falls average out. Its label sits above the plot rather than inside it,
          because inside it would land on a row — and it is printed ONCE, over the first column,
          because the same rule repeated in every column would read as a different number each
          time it was labelled. */}
      {columnIndexes.map((k) => (
        <line
          key={`avg-${k}`}
          x1={g.scaleFor(k)(averageFall)}
          x2={g.scaleFor(k)(averageFall)}
          y1={g.plot.top}
          y2={g.plot.bottom}
          stroke={ink}
          strokeWidth={T.AVERAGE_RULE_WIDTH}
          strokeDasharray={T.AVERAGE_DASH}
        />
      ))}
      <text
        x={g.scaleFor(0)(averageFall)}
        y={g.plot.top - T.AVERAGE_LABEL_RISE}
        fill={ink}
        fontSize={T.VALUE_LABEL.fontSize}
        fontWeight={T.VALUE_LABEL.fontWeight}
        textAnchor="middle"
      >
        {averageFallLabel}
      </text>

      {/* The subject's direct annotation, printed into the empty half of its own row: with the
          domain's maximum at +0.03 the whole span from its column's left edge to the zero line is
          unused on this one row, and on no other. Anchored END, clear of the zero line and of the
          value label that starts just to the right of it. */}
      <text
        x={g.zeroXOf(subjectPoint.column) - T.ANNOTATION_OFFSET}
        y={subjectPoint.y + rowBaselineOffset}
        fill={ink}
        stroke={subjectBand}
        strokeWidth={T.LABEL_HALO}
        paintOrder="stroke"
        fontSize={T.ANNOTATION.fontSize}
        fontWeight={T.ANNOTATION.fontWeight}
        textAnchor="end"
      >
        {subjectNote}
      </text>

      {/* VALUE LABELS LAST — after every gridline, after the zero line and after the average rule.
          This is the draw order the video sibling shipped a claim defect for want of: its rule at
          −4.93 struck through "−3.94", "−4.01", "−4.09" and turned "−3.39" into a plus. Order alone
          does not settle it either, because a gridline can land anywhere: each label also carries a
          halo in the colour of whatever it sits on — the ground everywhere, the subject's own band
          on that one row, because a white halo against a tinted band punched ragged holes through
          it in the first render. */}
      {g.points.map((p, i) => (
        <text
          key={`value-${p.country}`}
          x={
            p.change >= 0
              ? p.xValue + T.VALUE_LABEL_OFFSET
              : p.xValue - T.VALUE_LABEL_OFFSET
          }
          y={p.y + rowBaselineOffset}
          fill={ink}
          stroke={i === subjectIndex ? subjectBand : ground}
          strokeWidth={T.LABEL_HALO}
          paintOrder="stroke"
          fontSize={T.VALUE_LABEL.fontSize}
          fontWeight={T.VALUE_LABEL.fontWeight}
          textAnchor={p.change >= 0 ? "start" : "end"}
        >
          {en(p.change)}
        </text>
      ))}
    </svg>
  );
}
