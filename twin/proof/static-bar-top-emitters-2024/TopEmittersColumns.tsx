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
 */

import { scaleLinear, scaleBand } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/twin-chart-beat/render-still.mjs";

export type Row = { country: string; value: number };

const FRAME = { width: 900, height: 560 };
const PAD = 40;
const TITLE = { fontSize: 24, fontWeight: 700, lead: 30 };
const SUBTITLE = { fontSize: 15, fontWeight: 400, lead: 20 };
const SOURCE = { fontSize: 14, fontWeight: 400 };
const CATEGORY_LABEL = { fontSize: 13, fontWeight: 400, lead: 16 };
const VALUE_LABEL = { fontSize: 14, fontWeight: 600 };
const CALLOUT = { fontSize: 14, fontWeight: 400, lead: 18 };
/** The reference rule's dash, and the gap it keeps from the column tops it passes over. */
const REFERENCE_DASH = "5 4";

/** Pure geometry: rows (already ranked by the caller) to column rectangles. Knows no colour,
 *  no font and no label — the boundary `ChartSeed.tsx`'s `lineGeometry` draws. */
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

  // Zero floor, non-negotiable for a length encoding
  // (`references/types/bar-and-column.md`, "Where it goes wrong").
  const y = scaleLinear()
    .domain([0, Math.max(...rows.map((r) => r.value))])
    .range([plot.bottom, plot.top]);

  const x = scaleBand()
    .domain(rows.map((r) => r.country))
    .range([plot.left, plot.right])
    .paddingInner(0.28)
    .paddingOuter(0.14);

  const columns = rows.map((r) => ({
    country: r.country,
    value: r.value,
    x: x(r.country)!,
    width: x.bandwidth(),
    y: y(r.value),
    height: plot.bottom - y(r.value),
  }));

  return { plot, columns, y: (v: number) => y(v) };
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
  const { width, height } = FRAME;

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const subtitleTop = titleBaseline + (titleLines.length - 1) * TITLE.lead + 26;
  const subtitleLines = wrap(subtitle, width - PAD * 2, SUBTITLE);
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN — `height - PAD`, the same inset the title
  // hangs off at the top, on the same x. See twin-chart-beat/references/static-discipline.md,
  // "The source on the frame's bottom margin."
  const sourceBaseline = height - PAD;

  // The band width each category label has to live inside is only known after the band scale
  // exists, and the band scale needs the padding, which needs the label height. Resolve it in
  // that order with a provisional band width — the plot's horizontal extent does not depend on
  // the label wrap, only its vertical extent does.
  const provisionalBand = ((width - PAD * 2) / rows.length) * 0.72;
  const wrapped = rows.map((r) => ({
    country: r.country,
    lines: wrap(r.country, provisionalBand, CATEGORY_LABEL),
  }));
  const deepestLabel = Math.max(...wrapped.map((w) => w.lines.length));

  const padding = {
    // The plot starts below the LAST HEADER line, never below the source: that dependency is what
    // would otherwise have dragged the whole plot down the frame with the credit.
    top: subtitleTop + (subtitleLines.length - 1) * SUBTITLE.lead + 46,
    right: PAD,
    // Grown by the source's own height plus clear air, so the category-label band beneath the
    // plot ends above the credit's ink.
    bottom:
      PAD + 10 + deepestLabel * CATEGORY_LABEL.lead + SOURCE.fontSize + 10,
    left: PAD,
  };

  const { plot, columns, y } = columnGeometry(rows, { width, height, padding });
  const referenceY = y(callout.value);
  // The caption starts clear of the subject's own column, because the subject's value label is
  // printed above that column and the first render put the two strings on top of each other —
  // "China's 12.3" over "12.3", found by opening the PNG, not by any test.
  const subjectColumn = columns.find((c) => c.country === subject)!;
  const calloutX = subjectColumn.x + subjectColumn.width + 14;
  const calloutLines = wrap(callout.text, plot.right - calloutX, CALLOUT);

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
      <text x={PAD} y={sourceBaseline} fill={muted} fontSize={SOURCE.fontSize}>
        {source}
      </text>

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
            {/* The value sits OUTSIDE the column, in ink — never inside a coloured fill, which is
                where `bar-and-column.md`'s own trap lives (a naive light/dark rule mis-picks white
                text on a mid-toned fill). Outside the mark, the only contrast that has to hold is
                ink against the ground, which `deriveFurniture` already guarantees. */}
            <text
              x={c.x + c.width / 2}
              y={c.y - 8}
              fill={ink}
              fontSize={VALUE_LABEL.fontSize}
              fontWeight={VALUE_LABEL.fontWeight}
              textAnchor="middle"
            >
              {labelText}
            </text>
            {lines.map((line, i) => (
              <text
                key={line}
                x={c.x + c.width / 2}
                y={plot.bottom + 18 + i * CATEGORY_LABEL.lead}
                fill={ink}
                fontSize={CATEGORY_LABEL.fontSize}
                textAnchor="middle"
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}

      {/* The comparison the claim actually makes, drawn rather than asserted: the subject's own
          level carried across every other column so the reader can see how far below it they all
          sit, captioned with the sum computed from the frozen data. */}
      <line
        x1={plot.left}
        x2={plot.right}
        y1={referenceY}
        y2={referenceY}
        stroke={accent}
        strokeWidth={1.5}
        strokeDasharray={REFERENCE_DASH}
      />
      {calloutLines.map((line, i) => (
        <text
          key={line}
          x={calloutX}
          y={referenceY - 12 - (calloutLines.length - 1 - i) * CALLOUT.lead}
          fill={ink}
          fontSize={CALLOUT.fontSize}
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

/** Billion tonnes. One decimal above 1, two below it — because at one decimal the 10th-ranked
 *  pair (0.58 and 0.57) would print the same number in a chart whose whole job is a ranking. */
export function formatValue(v: number): string {
  return v >= 1 ? v.toFixed(1) : v.toFixed(2);
}
