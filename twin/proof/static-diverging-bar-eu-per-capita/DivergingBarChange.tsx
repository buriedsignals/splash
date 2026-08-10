/**
 * The STATIC beat of "Croatia is the only EU country emitting more CO₂ per person than in 1990" —
 * one frame, 900 × 1000, no motion and no interaction. Twenty-seven signed values growing left and
 * right out of a zero line, rows sorted from the largest rise to the largest fall.
 *
 * Written fresh from `ChartSeed.tsx`'s shape against
 * `twin-chart-beat/references/types/diverging-bar.md`. It is NOT the video sibling's component with
 * the timing taken out: a video can spend ten seconds introducing the zero line, growing each bar
 * out of it and only then descending the average rule, so at no single instant does it hold every
 * word this frame has to hold at once. A still has one instant. Every consequence below follows
 * from that.
 *
 * WHAT THIS GENRE OWES THAT THE VIDEO DID NOT.
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
} from "#shared/twin-chart-beat/render-still.mjs";

export type Row = {
  country: string;
  /** Change in CO₂ emissions per person between the two years, tonnes. Negative is a fall. */
  change: number;
};

const FRAME = { width: 900, height: 1000 };
const PAD = 40;

const TITLE = { fontSize: 24, fontWeight: 700, lead: 30 };
const SUBTITLE = { fontSize: 15, fontWeight: 400, lead: 20 };
const SOURCE = { fontSize: 14, fontWeight: 400, lead: 19 };
const AXIS_TITLE = { fontSize: 13, fontWeight: 500 };
const AXIS_TICK = { fontSize: 13, fontWeight: 500 };
const ROW_LABEL = { fontSize: 13, fontWeight: 400 };
const ROW_LABEL_SUBJECT = { fontSize: 13, fontWeight: 700 };
const VALUE_LABEL = { fontSize: 13, fontWeight: 600 };
const ANNOTATION = { fontSize: 13, fontWeight: 400 };
/** The halo each value label carries, in stroke width — see this file's own point 2. */
const LABEL_HALO = 6;
/** How many ticks the value axis asks d3 for. A hint, not a count. */
const TICK_HINT = 6;
/** How far the subject's own wash band sits from the ground, toward the accent. */
const SUBJECT_BAND_TINT = 0.12;
/**
 * A regular gridline landing this close to the average rule is DROPPED, with its tick label.
 * `static-discipline.md` states the rule for an annotation's own line height; the same reasoning
 * applies to a reference rule. Measured on the first render: the −5 gridline fell 2px from the
 * dashed rule at −4.93 and the two read as one smeared line, so the axis printed a tick the reader
 * could not actually locate. The rule's own label already states −4.93 at that position, so nothing
 * is lost by dropping the neighbour.
 */
const MIN_GRIDLINE_GAP_PX = 24;

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
 */
export function divergingGeometry(
  rows: Row[],
  {
    width,
    height,
    padding,
    tickHint = TICK_HINT,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    tickHint?: number;
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
  const x = scaleLinear()
    .domain([min - pad, max + pad])
    .range([plot.left, plot.right]);

  const rowHeight = (plot.bottom - plot.top) / rows.length;
  const points = rows.map((r, i) => ({
    ...r,
    y: plot.top + rowHeight * (i + 0.5),
    xValue: x(r.change),
  }));

  return {
    plot,
    rowHeight,
    points,
    zeroX: x(0),
    x,
    tickValues: x.ticks(tickHint).filter((t) => t !== 0),
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
  axisTitle: string;
  /** The mean of the falls, tonnes per person — where the dashed rule stands. Computed by the
   *  caller from the frozen data, never typed. */
  averageFall: number;
  averageFallLabel: string;
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
  const { width, height } = FRAME;

  // ── The header block. Each of the four stacked text blocks clears the one above it by a
  // MEASURED amount: the video sibling's first render put its axis title 12px under a two-line
  // caveat and the two overprinted.
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const subtitleTop = titleBaseline + (titleLines.length - 1) * TITLE.lead + 26;
  const subtitleLines = wrap(subtitle, width - PAD * 2, SUBTITLE);
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN — the LAST line lands on `height - PAD`, the
  // same inset the title hangs off at the top, on the same x. See
  // twin-chart-beat/references/static-discipline.md, "The source on the frame's bottom margin".
  const sourceTop = height - PAD - (sourceLines.length - 1) * SOURCE.lead;
  // The axis title keeps the air it always had above it, measured from the LAST HEADER line
  // rather than from the source, which is no longer in the header.
  const axisTitleBaseline =
    subtitleTop + (subtitleLines.length - 1) * SUBTITLE.lead + 34;
  const axisTickBaseline = axisTitleBaseline + 28;

  // ── Both gutters measured against the strings that will actually be drawn in them, at the exact
  // font they will be drawn in. The video sibling's first render read "Luxembo—20.48" because the
  // country names sat 12px off the plot edge, which is where the longest bar's own value label
  // already was: the name gutter sits OUTSIDE the value gutter, not on top of it.
  const nameGutter =
    Math.max(
      ...rows.map((r) =>
        Math.max(
          measureText(r.country, ROW_LABEL),
          measureText(r.country, ROW_LABEL_SUBJECT),
        ),
      ),
    ) + 16;
  const valueGutter =
    Math.max(...rows.map((r) => measureText(en(r.change), VALUE_LABEL))) + 14;

  const padding = {
    // Room under the tick row for the average rule's own label, which sits above the plot.
    top: axisTickBaseline + 34,
    // A positive bar grows RIGHT and prints its label to the right of its own end, and this
    // domain's maximum is +0.03 — so zero sits at 98% of the plot and that label lands in the
    // right gutter. Measured, not assumed.
    right: PAD + valueGutter + 10,
    // Grown by the source block's own height plus clear air: the credit now sits on the frame's
    // bottom margin, so the last row has to end above its ink.
    bottom: PAD + (sourceLines.length - 1) * SOURCE.lead + SOURCE.fontSize + 10,
    left: PAD + nameGutter + valueGutter,
  };

  const g = divergingGeometry(rows, { width, height, padding });
  const barHeight = Math.min(16, g.rowHeight * 0.62);
  const averageX = g.x(averageFall);
  const rowBaselineOffset = ROW_LABEL.fontSize * 0.34;
  const subjectPoint = g.points[subjectIndex];
  const subjectBand = blend(ground, accent, SUBJECT_BAND_TINT);
  // See MIN_GRIDLINE_GAP_PX. Dropped by MEASURED pixel distance, not by comparing the tick's own
  // value to the average — the same interval is a collision on this frame and comfortably apart on
  // a wider one.
  const ticks = g.tickValues.filter(
    (t) => Math.abs(g.x(t) - averageX) >= MIN_GRIDLINE_GAP_PX,
  );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      fontFamily={FONT_FAMILY}
    >
      <desc>{alt}</desc>
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {titleLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={titleBaseline + i * TITLE.lead}
          fill={ink}
          fontSize={TITLE.fontSize}
          fontWeight={TITLE.fontWeight}
        >
          {line}
        </text>
      ))}
      {subtitleLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={subtitleTop + i * SUBTITLE.lead}
          fill={muted}
          fontSize={SUBTITLE.fontSize}
        >
          {line}
        </text>
      ))}
      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={sourceTop + i * SOURCE.lead}
          fill={muted}
          fontSize={SOURCE.fontSize}
        >
          {line}
        </text>
      ))}

      <text
        x={PAD}
        y={axisTitleBaseline}
        fill={muted}
        fontSize={AXIS_TITLE.fontSize}
        fontWeight={AXIS_TITLE.fontWeight}
      >
        {axisTitle}
      </text>
      {ticks.map((t) => (
        <g key={`tick-${t}`}>
          <line
            x1={g.x(t)}
            x2={g.x(t)}
            y1={g.plot.top}
            y2={g.plot.bottom}
            stroke={grid}
            strokeWidth={1}
          />
          <text
            x={g.x(t)}
            y={axisTickBaseline}
            fill={muted}
            fontSize={AXIS_TICK.fontSize}
            fontWeight={AXIS_TICK.fontWeight}
            textAnchor="middle"
          >
            {en(t, 0)}
          </text>
        </g>
      ))}

      {/* The subject's own wash band, behind its row — one of the three redundant signals that
          replace the video's spring-and-ring on a 1.3-pixel bar. Filled OPAQUE with a composited
          colour rather than translucent accent, so the two labels that sit on this row can stroke
          their halo in exactly the colour behind them. */}
      <rect
        x={PAD / 2}
        y={subjectPoint.y - g.rowHeight / 2}
        width={width - PAD}
        height={g.rowHeight}
        fill={subjectBand}
      />

      {/* The bars. Two fills, one per sign — accent for the rise the headline is about, the
          furniture's own muted for the 26 falls. */}
      {g.points.map((p) => {
        const left = Math.min(g.zeroX, p.xValue);
        return (
          <rect
            key={`bar-${p.country}`}
            x={left}
            y={p.y - barHeight / 2}
            width={Math.abs(p.xValue - g.zeroX)}
            height={barHeight}
            fill={p.change >= 0 ? accent : muted}
          />
        );
      })}

      {/* Country names, in the NAME gutter — which sits to the left of the VALUE gutter. */}
      {g.points.map((p, i) => (
        <text
          key={`name-${p.country}`}
          x={PAD + nameGutter}
          y={p.y + rowBaselineOffset}
          fill={ink}
          fontSize={ROW_LABEL.fontSize}
          fontWeight={
            i === subjectIndex
              ? ROW_LABEL_SUBJECT.fontWeight
              : ROW_LABEL.fontWeight
          }
          textAnchor="end"
        >
          {p.country}
        </text>
      ))}

      {/* The reference: the zero line, drawn ON TOP of the bars so no fill can cover it — the
          sheet's own requirement, and the reason it is not painted before them. */}
      <line
        x1={g.zeroX}
        x2={g.zeroX}
        y1={g.plot.top}
        y2={g.plot.bottom}
        stroke={ink}
        strokeWidth={2}
      />
      <text
        x={g.zeroX}
        y={axisTickBaseline}
        fill={ink}
        fontSize={AXIS_TICK.fontSize}
        fontWeight={AXIS_TICK.fontWeight}
        textAnchor="middle"
      >
        0
      </text>

      {/* Where the 26 falls average out. Its label sits above the plot rather than inside it,
          because inside it would land on a row. */}
      <line
        x1={averageX}
        x2={averageX}
        y1={g.plot.top}
        y2={g.plot.bottom}
        stroke={ink}
        strokeWidth={1.5}
        strokeDasharray="8 5"
      />
      <text
        x={averageX}
        y={g.plot.top - 12}
        fill={ink}
        fontSize={VALUE_LABEL.fontSize}
        fontWeight={VALUE_LABEL.fontWeight}
        textAnchor="middle"
      >
        {averageFallLabel}
      </text>

      {/* The subject's direct annotation, printed into the empty half of its own row: with the
          domain's maximum at +0.03 the whole span from the plot's left edge to the zero line is
          unused on this one row, and on no other. Anchored END, clear of the zero line and of the
          value label that starts just to the right of it. */}
      <text
        x={g.zeroX - 22}
        y={subjectPoint.y + rowBaselineOffset}
        fill={ink}
        stroke={subjectBand}
        strokeWidth={LABEL_HALO}
        paintOrder="stroke"
        fontSize={ANNOTATION.fontSize}
        fontWeight={ANNOTATION.fontWeight}
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
          x={p.change >= 0 ? p.xValue + 8 : p.xValue - 8}
          y={p.y + rowBaselineOffset}
          fill={ink}
          stroke={i === subjectIndex ? subjectBand : ground}
          strokeWidth={LABEL_HALO}
          paintOrder="stroke"
          fontSize={VALUE_LABEL.fontSize}
          fontWeight={VALUE_LABEL.fontWeight}
          textAnchor={p.change >= 0 ? "start" : "end"}
        >
          {en(p.change)}
        </text>
      ))}
    </svg>
  );
}
