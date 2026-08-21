/**
 * Beat 1: the six Portuguese city networks ranked by annual trips, as columns.
 *
 * Written fresh in `ChartSeed.tsx`'s shape against `chart-beat/references/types/bar-and-column.md`.
 * The type's two non-negotiables drive the layout: the value axis starts at ZERO, because length is
 * the encoding; and every column carries its own value printed OUTSIDE the mark, so a short column's
 * label is never swallowed by the fill it belongs to.
 *
 * Because every column is directly labelled there is no value axis and no gridline set — the
 * axis-density rule's own test ("a reader must be able to locate any point the chart annotates")
 * is met at the mark rather than twice.
 */

import { scaleLinear, scaleBand } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor, stageFor } from "#shared/chart-beat/sizes.mjs";
import { formForSize } from "#shared/chart-beat/type-at-size.mjs";
import {
  NON_TEXT_CONTRAST_FLOOR,
  assertAnnotationReadsOverMarks,
  marksUnder,
} from "#shared/chart-beat/annotation-ink.mjs";
import { fmt } from "../../ridership.ts";

export type Row = { city: string; value: number };

/** The type this beat draws, in `references/types/` vocabulary (`bar-and-column.md`). */
export const TYPE = "column";

/** The 900x560 tuning kept as the base; the size row's `typeScale` is the multiplier. */
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
  REFERENCE_RULE_WIDTH: 1.5,
} as const;

/** The reference rule's dash. A pattern, not a measurement — no offset, no pathLength. */
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
    REFERENCE_RULE_WIDTH: Math.max(1, sp(BASE.REFERENCE_RULE_WIDTH)),
    REFERENCE_DASH: REFERENCE_DASH_BASE.map((v) => sp(v)).join(" "),
  };
}

/**
 * Pure geometry: ranked rows to column rectangles. Knows no colour, no font and no label — the
 * boundary the seed's `lineGeometry` draws.
 */
export function columnGeometry(
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
  // Zero floor, non-negotiable for a length encoding.
  const max = Math.max(...rows.map((r) => r.value));
  const value = scaleLinear().domain([0, max]).range([plot.bottom, plot.top]);
  const band = scaleBand()
    .domain(rows.map((r) => r.city))
    .paddingInner(0.28)
    .paddingOuter(0.14)
    .range([plot.left, plot.right]);
  const columns = rows.map((r) => ({
    city: r.city,
    value: r.value,
    x: band(r.city)!,
    width: band.bandwidth(),
    y: value(r.value),
    height: plot.bottom - value(r.value),
  }));
  return { plot, columns, at: (v: number) => value(v), step: band.step() };
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

export function RidershipColumns({
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
  /** Already ranked descending by the caller — the ranking is one decision, made at the data layer. */
  rows: Row[];
  title: string;
  subtitle: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  /** The city the claim is about, named by `STORYBOARD.md`'s `subject`, never picked by height. */
  subject: string;
  /** `{ value, text }` — the level the reference rule sits at and what it says. Computed by the
   *  caller from the frozen data, never typed. */
  callout: { value: number; text: string };
  /** The size gate 2c pinned, read from this beat's own `BRIEF.md`. Not a default. */
  size: string;
}) {
  if (rows.length < 3)
    throw new Error(`a ranking beat needs at least three rows, got ${rows.length}`);
  if (!rows.some((r) => r.city === subject))
    throw new Error(`subject ${JSON.stringify(subject)} is not one of the rows drawn`);
  if (formForSize(TYPE, size).verdict === "transpose")
    throw new Error(
      `at ${size} a band-scale type takes the row form, and this beat draws columns only. ` +
        `Slot 1 pinned landscape; a tall frame needs the row layout written, not this one stretched.`,
    );

  const { ink, muted } = deriveFurniture(ground);
  const { width, height, typeScale, minTypePx } = sizeFor(size);
  const stage = stageFor(size);
  const PAD = frameInsetFor(size);
  const T = tokens(typeScale);
  const contentTop = stage.reserved ? stage.top : PAD;
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;

  const titleLines = wrap(title, width - PAD * 2, T.TITLE);
  const titleBaseline = contentTop + T.TITLE.fontSize;
  const subtitleTop =
    titleBaseline + (titleLines.length - 1) * T.TITLE.lead + T.TITLE_TO_SUBTITLE;
  const subtitleLines = wrap(subtitle, width - PAD * 2, T.SUBTITLE);
  const sourceLines = wrap(source, width - PAD * 2, T.SOURCE);
  const sourceBaseline = sourceBottom - (sourceLines.length - 1) * T.SOURCE.lead;
  const plotTop =
    subtitleTop + (subtitleLines.length - 1) * T.SUBTITLE.lead + T.HEADER_TO_PLOT;

  const provisionalBand = ((width - PAD * 2) / rows.length) * 0.72;
  const wrapped = rows.map((r) => ({
    city: r.city,
    lines: wrap(r.city, provisionalBand, T.CATEGORY_LABEL),
  }));
  const deepestLabel = Math.max(...wrapped.map((w) => w.lines.length));

  const padding = {
    top: plotTop,
    right: PAD,
    bottom:
      height -
      (sourceBaseline - T.SOURCE.fontSize - T.SOURCE_AIR) +
      T.CATEGORY_BAND_AIR +
      deepestLabel * T.CATEGORY_LABEL.lead,
    left: PAD,
  };

  const { plot, columns, at, step } = columnGeometry(rows, { width, height, padding });

  if (step < minTypePx)
    throw new Error(
      `beat 1: at ${size} the ${rows.length} columns get ${step.toFixed(1)}px of band each, ` +
        `under the ${minTypePx}px one line of type occupies.`,
    );

  const referenceAt = at(callout.value);
  const subjectColumn = columns.find((c) => c.city === subject)!;
  const marks = columns.map((c) => ({
    x: c.x,
    y: c.y,
    width: c.width,
    height: c.height,
    fill: c.city === subject ? accent : muted,
  }));

  // The rule starts where the subject's own column ends: inside it, accent on accent measures
  // 1.00:1 and carries nothing, because the column's top already IS the subject's level. What it
  // still crosses is measured against the ink it is drawn in (SC 1.4.11, 3:1 for a non-text mark).
  const referenceRule = {
    x1: subjectColumn.x + subjectColumn.width,
    box: {
      x: subjectColumn.x + subjectColumn.width,
      y: referenceAt - T.REFERENCE_RULE_WIDTH / 2,
      width: plot.right - (subjectColumn.x + subjectColumn.width),
      height: T.REFERENCE_RULE_WIDTH,
    },
  };
  assertAnnotationReadsOverMarks(
    { what: `the ${subject} reference rule`, colour: accent },
    [ground, ...marksUnder(referenceRule.box, marks).map((m) => m.fill)],
    NON_TEXT_CONTRAST_FLOOR,
  );

  const calloutX = subjectColumn.x + subjectColumn.width + T.CALLOUT_INSET;
  const calloutLines = wrap(callout.text, plot.right - calloutX, T.CALLOUT);

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
        const isSubject = c.city === subject;
        const lines = wrapped.find((w) => w.city === c.city)!.lines;
        return (
          <g key={c.city}>
            <rect
              x={c.x}
              y={c.y}
              width={c.width}
              height={c.height}
              fill={isSubject ? accent : muted}
            />
            {/* The value sits OUTSIDE the mark, in ink — never inside a coloured fill, which is
                where `bar-and-column.md`'s own trap lives. */}
            <text
              x={c.x + c.width / 2}
              y={c.y - T.VALUE_LABEL_GAP}
              fill={ink}
              fontSize={T.VALUE_LABEL.fontSize}
              fontWeight={T.VALUE_LABEL.fontWeight}
              textAnchor="middle"
            >
              {fmt.trips(c.value)}
            </text>
            {lines.map((line, i) => (
              <text
                key={line}
                x={c.x + c.width / 2}
                y={plot.bottom + T.CATEGORY_DROP + i * T.CATEGORY_LABEL.lead}
                fill={ink}
                fontSize={T.CATEGORY_LABEL.fontSize}
                textAnchor="middle"
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}

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
          y={referenceAt - T.CALLOUT_RISE - (calloutLines.length - 1 - i) * T.CALLOUT.lead}
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
    </svg>
  );
}
