/**
 * Beat: the ten countries that emitted the most CO₂ in 2024, as columns.
 *
 * Written fresh from `ChartSeed.tsx`'s shape against
 * `references/types/bar-and-column.md`. The type's two non-negotiables drive every decision
 * below: the value axis starts at ZERO, because length is the encoding and a fitted floor would
 * be a false statement dressed as care; and every column carries its own value printed OUTSIDE
 * the column, so a short bar's label is never swallowed by the bar it belongs to.
 *
 * Because every column is directly labelled, there is no value axis and no gridline set. That is
 * `static-discipline.md`'s "every layer earns its place" applied honestly rather than by habit:
 * its axis-density rule states its own test as "a reader must be able to locate, on the axis, any
 * point the chart itself annotates or names", and here every point IS named, in its own label, at
 * the mark. A gridline set beside ten printed numbers would be decoding work done twice.
 *
 * Category labels are wrapped on MEASURED width, never rotated — "United States" and "Saudi
 * Arabia" become two lines rather than a 45-degree slope the reader has to tilt their head for.
 *
 * ── MIGRATED TO THE SIZE TABLE, 2026-08-11 ────────────────────────────────────────────────────
 *
 * The frame is `sizeFor(size)`'s and `size` is gate 2c's decision, read out of this beat's own
 * `BRIEF.md`. Every spacing literal goes through `sp()`; `PAD` alone stays proportional to the
 * canvas (`frameInsetFor`). This is a BAND-SCALE type, so at a tall or square frame it takes the
 * twin FORM rather than a stretched aspect — rows down the frame, each country's name horizontal
 * on one line — which is the arm `proof/portrait-aspect-probe/PORTRAIT-VERDICT.md` would publish
 * "and it is not close".
 */

import { scaleLinear, scaleBand } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/twin-chart-beat/render-still.mjs";
import {
  frameInsetFor,
  sizeFor,
  stageFor,
} from "#shared/twin-chart-beat/sizes.mjs";
import { formForSize } from "#shared/twin-chart-beat/type-at-size.mjs";
import {
  NON_TEXT_CONTRAST_FLOOR,
  assertAnnotationReadsOverMarks,
  inkThatReadsOver,
  marksUnder,
} from "#shared/twin-chart-beat/annotation-ink.mjs";

export type Row = { country: string; value: number };

/** The type this beat draws, in `references/types/` vocabulary (`bar-and-column.md`). At landscape
 *  it is drawn as columns; `formForSize` answers `transpose` for it at the two tall frames. */
export const TYPE = "column";

/** The 900x560 tuning, kept as the base; the size row's `typeScale` is the multiplier. */
const BASE = {
  TITLE: { fontSize: 24, fontWeight: 700, lead: 30 },
  SUBTITLE: { fontSize: 15, fontWeight: 400, lead: 20 },
  SOURCE: { fontSize: 14, fontWeight: 400, lead: 19 },
  CATEGORY_LABEL: { fontSize: 13, fontWeight: 400, lead: 16 },
  VALUE_LABEL: { fontSize: 14, fontWeight: 600 },
  CALLOUT: { fontSize: 14, fontWeight: 400, lead: 18 },
  TITLE_TO_SUBTITLE: 26,
  HEADER_TO_PLOT: 46,
  CATEGORY_DROP: 18,
  CATEGORY_BAND_AIR: 10,
  SOURCE_AIR: 10,
  VALUE_LABEL_GAP: 8,
  CALLOUT_INSET: 14,
  CALLOUT_RISE: 12,
  NAME_INSET: 10,
  /** Its stroke weight — named because the crossing check needs the rule's real thickness to know
   *  what it lies over, and a literal in two places is a literal that drifts. */
  REFERENCE_RULE_WIDTH: 1.5,
} as const;

/** The reference rule's dash. Unitless pattern, not a spacing number — but it IS drawn at frame
 *  scale, so it is scaled with the rest rather than left at a 900px value on a 1920px frame. */
const REFERENCE_DASH_BASE = [5, 4];

function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  const f = <T extends { fontSize: number; lead?: number }>(tok: T) => ({
    ...tok,
    fontSize: sp(tok.fontSize),
    ...(tok.lead === undefined ? {} : { lead: sp(tok.lead) }),
  });
  return {
    TITLE: f(BASE.TITLE) as typeof BASE.TITLE,
    SUBTITLE: f(BASE.SUBTITLE) as typeof BASE.SUBTITLE,
    SOURCE: f(BASE.SOURCE) as typeof BASE.SOURCE,
    CATEGORY_LABEL: f(BASE.CATEGORY_LABEL) as typeof BASE.CATEGORY_LABEL,
    VALUE_LABEL: f(BASE.VALUE_LABEL) as typeof BASE.VALUE_LABEL,
    CALLOUT: f(BASE.CALLOUT) as typeof BASE.CALLOUT,
    TITLE_TO_SUBTITLE: sp(BASE.TITLE_TO_SUBTITLE),
    HEADER_TO_PLOT: sp(BASE.HEADER_TO_PLOT),
    CATEGORY_DROP: sp(BASE.CATEGORY_DROP),
    CATEGORY_BAND_AIR: sp(BASE.CATEGORY_BAND_AIR),
    SOURCE_AIR: sp(BASE.SOURCE_AIR),
    VALUE_LABEL_GAP: sp(BASE.VALUE_LABEL_GAP),
    CALLOUT_INSET: sp(BASE.CALLOUT_INSET),
    CALLOUT_RISE: sp(BASE.CALLOUT_RISE),
    NAME_INSET: sp(BASE.NAME_INSET),
    REFERENCE_RULE_WIDTH: Math.max(1, sp(BASE.REFERENCE_RULE_WIDTH)),
    REFERENCE_DASH: REFERENCE_DASH_BASE.map((v) => sp(v)).join(" "),
  };
}

/**
 * THE REMOVAL LADDER THIS BEAT RUNS, per size, recorded so the render can print it.
 *
 * At a phone frame the type floor is 36px, which sets the headline at 72px and the standfirst at
 * 45px, and portrait's safe band is 979px in total. R3 fires before a mark is drawn; this beat's
 * standfirst is two sentences and its second one — the world-share and the accounting caveat — is
 * the context the title mostly implies, which is exactly the rung's own description.
 */
export function rungsFor(size: string): string[] {
  if (sizeFor(size).minTypePx < 36) return [];
  return ["R3: the standfirst keeps its first sentence only"];
}

function firstSentence(text: string): string {
  const stop = text.indexOf(". ");
  return stop === -1 ? text : text.slice(0, stop + 1);
}

/**
 * Pure geometry: rows (already ranked by the caller) to bar rectangles. Knows no colour,
 * no font and no label — the boundary `ChartSeed.tsx`'s `lineGeometry` draws.
 *
 * `orientation` is the TWIN FORM. Columns at landscape; rows at a tall or square frame, where the
 * band scale runs DOWN the frame and the value scale runs across it. A row-driven layout has no
 * aspect to distort, which is why `type-at-size.mjs` answers `transpose` rather than `clamp` for
 * every band-scale type.
 */
export function columnGeometry(
  rows: Row[],
  {
    width,
    height,
    padding,
    orientation = "columns",
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    orientation?: "columns" | "rows";
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };

  // Zero floor, non-negotiable for a length encoding
  // (`references/types/bar-and-column.md`, "Where it goes wrong").
  const max = Math.max(...rows.map((r) => r.value));
  const band = scaleBand()
    .domain(rows.map((r) => r.country))
    .paddingInner(0.28)
    .paddingOuter(0.14);

  if (orientation === "rows") {
    const value = scaleLinear().domain([0, max]).range([plot.left, plot.right]);
    band.range([plot.top, plot.bottom]);
    const columns = rows.map((r) => ({
      country: r.country,
      value: r.value,
      x: plot.left,
      y: band(r.country)!,
      width: value(r.value) - plot.left,
      height: band.bandwidth(),
    }));
    return {
      plot,
      columns,
      /** Where a value sits, along the axis that encodes it. */
      at: (v: number) => value(v),
      step: band.step(),
      thickness: band.bandwidth(),
    };
  }

  const value = scaleLinear().domain([0, max]).range([plot.bottom, plot.top]);
  band.range([plot.left, plot.right]);
  const columns = rows.map((r) => ({
    country: r.country,
    value: r.value,
    x: band(r.country)!,
    width: band.bandwidth(),
    y: value(r.value),
    height: plot.bottom - value(r.value),
  }));
  return {
    plot,
    columns,
    at: (v: number) => value(v),
    step: band.step(),
    thickness: band.bandwidth(),
  };
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

export function TopEmittersColumns({
  rows,
  title,
  subtitle,
  source,
  alt,
  ground,
  accent,
  subject,
  callout,
  size,
}: {
  /** Already ranked descending by the caller — this component draws the order it is given
   *  rather than re-sorting, so the ranking is a decision made once, at the data layer. */
  rows: Row[];
  title: string;
  subtitle: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  /** The country the claim is about. Named by the journalist's claim, not picked by height —
   *  `static-discipline.md`'s "One accent" ("the subject is not the maximum"). Here the subject
   *  happens also to be the tallest column, so the beat carries the comparison the claim actually
   *  makes as a drawn reference rule rather than letting the colour stand in for an argument. */
  subject: string;
  /** The computed comparison drawn at the subject's own level: `{ value, text }`, where `value`
   *  is the height the rule sits at and `text` is what it says. Computed by the caller from the
   *  frozen data — never typed. */
  callout: { value: number; text: string };
  /** The size gate 2c pinned, read from this beat's own `BRIEF.md`. Not a default. */
  size: string;
}) {
  if (rows.length < 3)
    throw new Error(
      `a ranking beat needs at least three rows, got ${rows.length}`,
    );
  if (!rows.some((r) => r.country === subject))
    throw new Error(
      `subject ${JSON.stringify(subject)} is not one of the rows drawn`,
    );

  const { ink, muted } = deriveFurniture(ground);
  const { width, height, typeScale, minTypePx } = sizeFor(size);
  const stage = stageFor(size);
  const PAD = frameInsetFor(size);
  const orientation =
    formForSize(TYPE, size).verdict === "transpose" ? "rows" : "columns";
  const T = tokens(typeScale);
  const rungs = rungsFor(size);
  const contentTop = stage.reserved ? stage.top : PAD;
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;

  const titleLines = wrap(title, width - PAD * 2, T.TITLE);
  const titleBaseline = contentTop + T.TITLE.fontSize;
  const subtitleTop =
    titleBaseline +
    (titleLines.length - 1) * T.TITLE.lead +
    T.TITLE_TO_SUBTITLE;
  const standfirst = rungs.some((r) => r.startsWith("R3"))
    ? firstSentence(subtitle)
    : subtitle;
  const subtitleLines = wrap(standfirst, width - PAD * 2, T.SUBTITLE);
  // THE SOURCE SITS ON THE BOTTOM OF THE BAND — the LAST line lands there, the same edge the title
  // hangs off at the top, on the same x. See twin-chart-beat/references/static-discipline.md,
  // "The source on the frame's bottom margin." At portrait that bottom is the STAGE's, not the
  // frame's: below 1248 the platform's caption and progress bar sit over the frame, and a covered
  // credit is an attribution failure rather than a cosmetic one.
  const sourceLines = wrap(source, width - PAD * 2, T.SOURCE);
  const sourceBaseline =
    sourceBottom - (sourceLines.length - 1) * T.SOURCE.lead;

  const plotTop =
    subtitleTop +
    (subtitleLines.length - 1) * T.SUBTITLE.lead +
    T.HEADER_TO_PLOT;

  // The band width each category label has to live inside is only known after the band scale
  // exists, and the band scale needs the padding, which needs the label height. Resolve it in
  // that order with a provisional band width — the plot's horizontal extent does not depend on
  // the label wrap, only its vertical extent does.
  const provisionalBand = ((width - PAD * 2) / rows.length) * 0.72;
  const wrapped = rows.map((r) => ({
    country: r.country,
    lines:
      orientation === "rows"
        ? // In the row form a name is horizontal on ONE line in the left gutter — that is the
          // whole reason the twin form beats the twin aspect, so it must not wrap here.
          [r.country]
        : wrap(r.country, provisionalBand, T.CATEGORY_LABEL),
  }));
  const deepestLabel = Math.max(...wrapped.map((w) => w.lines.length));
  const widestName = Math.max(
    ...rows.map((r) => measureText(r.country, T.CATEGORY_LABEL)),
  );
  const widestValue = Math.max(
    ...rows.map((r) => measureText(formatValue(r.value), T.VALUE_LABEL)),
  );

  // The callout's caption. In the column form it hangs beside the reference rule inside the plot;
  // in the row form it becomes a note line under the plot, because the row form's comparison is a
  // MARK on the subject's own bar and a mark does not carry a sentence.
  const calloutNoteLines =
    orientation === "rows"
      ? wrap(callout.text, width - PAD * 2, T.CALLOUT)
      : [];
  const calloutNoteBlock = calloutNoteLines.length
    ? calloutNoteLines.length * T.CALLOUT.lead + T.SOURCE_AIR
    : 0;

  const padding =
    orientation === "rows"
      ? {
          top: plotTop,
          right: PAD + T.VALUE_LABEL_GAP + widestValue,
          bottom:
            height -
            (sourceBaseline - T.SOURCE.fontSize - T.SOURCE_AIR) +
            calloutNoteBlock,
          left: PAD + widestName + T.NAME_INSET,
        }
      : {
          // The plot starts below the LAST HEADER line, never below the source: that dependency is
          // what would otherwise have dragged the whole plot down the frame with the credit.
          top: plotTop,
          right: PAD,
          // Grown by the source's own height plus clear air, so the category-label band beneath the
          // plot ends above the credit's ink.
          bottom:
            height -
            (sourceBaseline - T.SOURCE.fontSize - T.SOURCE_AIR) +
            T.CATEGORY_BAND_AIR +
            deepestLabel * T.CATEGORY_LABEL.lead,
          left: PAD,
        };

  const { plot, columns, at, step, thickness } = columnGeometry(rows, {
    width,
    height,
    padding,
    orientation,
  });

  // THE LAST RUNG, FIRED RATHER THAN DESCRIBED. `assertPlotAspect` says nothing about a band-scale
  // type — its answer is the twin form, which this beat takes — so the floor a row layout can
  // still miss is measured here: a band pitch thinner than one line of its own category type is a
  // list of names printed on top of each other, and no clipping or collision counter in this
  // project sees that.
  const bandFloor =
    orientation === "rows" ? T.CATEGORY_LABEL.fontSize : minTypePx;
  if (step < bandFloor)
    throw new Error(
      `static-bar-top-emitters-2024: at ${size} the ${rows.length} ${orientation} get ` +
        `${step.toFixed(1)}px of band each, under the ${bandFloor}px one line of category type ` +
        `occupies — ${(plot.bottom - plot.top).toFixed(0)}px of plot for ${rows.length} rows.\n` +
        `The ladder is spent: ${rungs.join("; ") || "no rung fires at this size"}. R1 has no axis ` +
        `title (this beat labels every mark instead of drawing an axis), R2 no ticks, R4 one ` +
        `annotation which IS the claim, and R8 (a shorter ranking) would delete the comparison the ` +
        `headline makes.\nR9: this beat does not ship ${size}.`,
    );

  const referenceAt = at(callout.value);
  const subjectColumn = columns.find((c) => c.country === subject)!;
  const marks = columns.map((c) => ({
    x: c.x,
    y: c.y,
    width: c.width,
    height: c.height,
    fill: c.country === subject ? accent : muted,
  }));

  // The reference rule starts where the subject's own column ends, and whatever it still crosses
  // is measured against the ink it is drawn in. See the drawing site below for the reasoning.
  const referenceRule = {
    x1: subjectColumn.x + subjectColumn.width,
    box: {
      x: subjectColumn.x + subjectColumn.width,
      y: referenceAt - T.REFERENCE_RULE_WIDTH / 2,
      width: plot.right - (subjectColumn.x + subjectColumn.width),
      height: T.REFERENCE_RULE_WIDTH,
    },
  };
  if (orientation === "columns")
    assertAnnotationReadsOverMarks(
      { what: `the ${subject} reference rule`, colour: accent },
      [ground, ...marksUnder(referenceRule.box, marks).map((m) => m.fill)],
      NON_TEXT_CONTRAST_FLOOR,
    );

  // THE TRANSPOSE'S STATED COST, PAID RATHER THAN IGNORED. `type-at-size.mjs` names it exactly:
  // "an argument drawn ACROSS the columns degrades — a reference rule at one category's level
  // becomes a vertical line hard against the frame edge, where it reads as a border. Redraw the
  // comparison as a mark, not as a rule." The probe's own arm C shows the defect: its dashed rule
  // stands at x=985 of a 1080px frame, indistinguishable from a border.
  //
  // So in the row form the comparison becomes a TICK across the subject's own bar, at the point
  // the next five add up to, inked against the fill it lies on. It is a mark, on one bar, at the
  // value it is about.
  const subjectTickInk =
    orientation === "rows"
      ? inkThatReadsOver(
          [
            ...marksUnder(
              {
                x: referenceAt - T.REFERENCE_RULE_WIDTH,
                y: subjectColumn.y,
                width: T.REFERENCE_RULE_WIDTH * 2,
                height: subjectColumn.height,
              },
              marks,
            ).map((m) => m.fill),
            ground,
          ],
          NON_TEXT_CONTRAST_FLOOR,
        )
      : accent;

  const calloutX = subjectColumn.x + subjectColumn.width + T.CALLOUT_INSET;
  const calloutLines =
    orientation === "columns"
      ? wrap(callout.text, plot.right - calloutX, T.CALLOUT)
      : [];

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
          y={sourceBaseline + i * T.SOURCE.lead}
          fill={muted}
          fontSize={T.SOURCE.fontSize}
        >
          {line}
        </text>
      ))}

      {columns.map((c) => {
        const isSubject = c.country === subject;
        const labelText = formatValue(c.value);
        const lines = wrapped.find((w) => w.country === c.country)!.lines;
        return (
          <g key={c.country}>
            <rect
              x={c.x}
              y={c.y}
              width={c.width}
              height={c.height}
              fill={isSubject ? accent : muted}
            />
            {/* The value sits OUTSIDE the mark, in ink — never inside a coloured fill, which is
                where `bar-and-column.md`'s own trap lives (a naive light/dark rule mis-picks white
                text on a mid-toned fill). Outside the mark, the only contrast that has to hold is
                ink against the ground, which `deriveFurniture` already guarantees. */}
            {orientation === "rows" ? (
              <>
                <text
                  x={c.x + c.width + T.VALUE_LABEL_GAP}
                  y={c.y + c.height / 2 + T.VALUE_LABEL.fontSize * 0.36}
                  fill={ink}
                  fontSize={T.VALUE_LABEL.fontSize}
                  fontWeight={T.VALUE_LABEL.fontWeight}
                >
                  {labelText}
                </text>
                <text
                  x={plot.left - T.NAME_INSET}
                  y={c.y + c.height / 2 + T.CATEGORY_LABEL.fontSize * 0.36}
                  fill={ink}
                  fontSize={T.CATEGORY_LABEL.fontSize}
                  textAnchor="end"
                >
                  {c.country}
                </text>
              </>
            ) : (
              <>
                <text
                  x={c.x + c.width / 2}
                  y={c.y - T.VALUE_LABEL_GAP}
                  fill={ink}
                  fontSize={T.VALUE_LABEL.fontSize}
                  fontWeight={T.VALUE_LABEL.fontWeight}
                  textAnchor="middle"
                >
                  {labelText}
                </text>
                {lines.map((line, i) => (
                  <text
                    key={line}
                    x={c.x + c.width / 2}
                    y={
                      plot.bottom + T.CATEGORY_DROP + i * T.CATEGORY_LABEL.lead
                    }
                    fill={ink}
                    fontSize={T.CATEGORY_LABEL.fontSize}
                    textAnchor="middle"
                  >
                    {line}
                  </text>
                ))}
              </>
            )}
          </g>
        );
      })}

      {orientation === "columns" ? (
        <>
          {/* The comparison the claim actually makes, drawn rather than asserted: the subject's own
              level carried across every other column so the reader can see how far below it they
              all sit, captioned with the sum computed from the frozen data.

              It used to start at `plot.left`, which ran it straight through the subject's OWN
              column — accent on accent, 1.00:1, and in the committed PNG the first 7 % of the rule
              is simply missing. It carried no information there either: the column's top IS the
              level. So it starts where the subject's column ends, and the ink it is drawn in is
              CHECKED against everything it still crosses (`annotation-ink.mjs`, SC 1.4.11's 3:1 for
              a non-text mark). The accent survives that check on this data because the subject is
              also the tallest column, so the trimmed rule meets nothing but the page. On data where
              it did not — a subject overtaken by someone to its right — this THROWS at render
              rather than shipping an invisible rule. */}
          <line
            x1={referenceRule.x1}
            x2={plot.right}
            y1={referenceAt}
            y2={referenceAt}
            stroke={accent}
            strokeWidth={T.REFERENCE_RULE_WIDTH}
            strokeDasharray={T.REFERENCE_DASH}
          />
          {calloutLines.map((line, i) => (
            <text
              key={line}
              x={calloutX}
              y={
                referenceAt -
                T.CALLOUT_RISE -
                (calloutLines.length - 1 - i) * T.CALLOUT.lead
              }
              fill={ink}
              fontSize={T.CALLOUT.fontSize}
            >
              {line}
            </text>
          ))}

          {/* Zero baseline — the floor every column is measured from. */}
          <line
            x1={plot.left}
            x2={plot.right}
            y1={plot.bottom}
            y2={plot.bottom}
            stroke={ink}
            strokeWidth={1}
          />
        </>
      ) : (
        <>
          {/* The comparison as a MARK: a tick across the subject's own bar at the point the next
              five add up to. Inked against the fill it lies on rather than against the page — the
              accent measured 1.00:1 on itself in the column form's first render, which is the same
              defect one axis rotated. */}
          <line
            x1={referenceAt}
            x2={referenceAt}
            y1={subjectColumn.y}
            y2={subjectColumn.y + subjectColumn.height}
            stroke={subjectTickInk}
            strokeWidth={T.REFERENCE_RULE_WIDTH}
            strokeDasharray={T.REFERENCE_DASH}
          />
          {calloutNoteLines.map((line, i) => (
            <text
              key={line}
              x={PAD}
              y={plot.bottom + T.SOURCE_AIR + (i + 1) * T.CALLOUT.lead}
              fill={ink}
              fontSize={T.CALLOUT.fontSize}
            >
              {line}
            </text>
          ))}

          {/* Zero baseline — the floor every bar is measured from, on the axis that encodes it. */}
          <line
            x1={plot.left}
            x2={plot.left}
            y1={plot.top}
            y2={plot.bottom}
            stroke={ink}
            strokeWidth={1}
          />
        </>
      )}
    </svg>
  );
}

/** Billion tonnes. One decimal above 1, two below it — because at one decimal the 10th-ranked
 *  pair (0.58 and 0.57) would print the same number in a chart whose whole job is a ranking. */
export function formatValue(v: number): string {
  return v >= 1 ? v.toFixed(1) : v.toFixed(2);
}
