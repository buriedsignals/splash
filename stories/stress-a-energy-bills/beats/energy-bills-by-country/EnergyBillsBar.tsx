/**
 * Beat: reported household energy prices across seven European countries, one 2023 snapshot.
 *
 * Written fresh from `ChartSeed.tsx`'s shape (pure geometry -> furniture derived from the ground ->
 * direct annotation -> one accent) against `references/types/bar-and-column.md`. Two things this
 * type is non-negotiable about drive the drawing: the value axis is ZERO-based, because a bar's
 * LENGTH is the encoding, and every bar carries its own value printed OUTSIDE it, never inside a
 * coloured fill.
 *
 * TWO ROWS CARRY NO BAR AT ALL. Italy and Poland reported no price in the frozen source data. A
 * missing category is not drawn as a zero-height column next to real ones (a real zero and "we
 * have nothing" are different facts) — it gets no rectangle and a direct "no price reported" note
 * at the baseline instead, the bar-chart equivalent of `ChartSeed.tsx`'s line-gap note.
 *
 * DENMARK'S BAR IS KEPT AT ITS FULL, ZERO-BASED HEIGHT — not broken, not log-scaled, not dropped.
 * A broken axis is exactly the truncation `static-discipline.md` forbids for a length encoding;
 * dropping the one country the article explicitly names ("Denmark stands out") would erase the
 * story's own observation to make a tidier chart. The other four bars read as near-flat against
 * it — that is not a lie, it is the true shape of this data — and every one of them still carries
 * its own printed value, so a reader can recover Spain's or France's real number even where the
 * bar itself is a few pixels tall. See BRIEF.md, "The outlier," for the full reasoning.
 */

import { scaleLinear, scaleBand } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor, stageFor } from "#shared/chart-beat/sizes.mjs";

export type Row = { country: string; value: number | null };

export const TYPE = "bar";

/** The 900x560 tuning, kept as the base; the size row's `typeScale` is the multiplier. */
const BASE = {
  TITLE: { fontSize: 24, fontWeight: 700, lead: 30 },
  SUBTITLE: { fontSize: 15, fontWeight: 400, lead: 20 },
  SOURCE: { fontSize: 14, fontWeight: 400, lead: 19 },
  CATEGORY_LABEL: { fontSize: 13, fontWeight: 400, lead: 16 },
  VALUE_LABEL: { fontSize: 14, fontWeight: 600 },
  NO_DATA_LABEL: { fontSize: 12, fontWeight: 400 },
  TITLE_TO_SUBTITLE: 22,
  HEADER_TO_PLOT: 40,
  CATEGORY_DROP: 18,
  VALUE_LABEL_GAP: 8,
  NO_DATA_GAP: 8,
  SOURCE_AIR: 10,
};

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
    NO_DATA_LABEL: f(BASE.NO_DATA_LABEL) as typeof BASE.NO_DATA_LABEL,
    TITLE_TO_SUBTITLE: sp(BASE.TITLE_TO_SUBTITLE),
    HEADER_TO_PLOT: sp(BASE.HEADER_TO_PLOT),
    CATEGORY_DROP: sp(BASE.CATEGORY_DROP),
    VALUE_LABEL_GAP: sp(BASE.VALUE_LABEL_GAP),
    NO_DATA_GAP: sp(BASE.NO_DATA_GAP),
    SOURCE_AIR: sp(BASE.SOURCE_AIR),
  };
}

/**
 * Pure geometry: rows (already ordered by the caller) to bar rectangles. Knows no colour, no font
 * and no label. A `null` value gets a zero-height rectangle at the baseline — the drawing layer
 * below chooses not to paint it and prints a note instead, but the geometry itself stays honest
 * about there being no bar there rather than encoding "no data" as a magic number.
 */
export function barGeometry(
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
  const present = rows
    .map((r) => r.value)
    .filter((v): v is number => v !== null);
  if (present.length === 0)
    throw new Error("a bar beat needs at least one reported value, got none");
  const max = Math.max(...present);
  // Zero floor, non-negotiable for a length encoding (`bar-and-column.md`, "Where it goes wrong").
  const y = scaleLinear().domain([0, max]).range([plot.bottom, plot.top]);
  const band = scaleBand()
    .domain(rows.map((r) => r.country))
    .range([plot.left, plot.right])
    .paddingInner(0.32)
    .paddingOuter(0.16);
  const bars = rows.map((r) => ({
    country: r.country,
    value: r.value,
    x: band(r.country)!,
    width: band.bandwidth(),
    y: r.value === null ? plot.bottom : y(r.value),
    height: r.value === null ? 0 : plot.bottom - y(r.value),
  }));
  return { plot, bars, step: band.step(), thickness: band.bandwidth() };
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

export function EnergyBillsBar({
  rows,
  title,
  subtitle,
  source,
  alt,
  ground,
  accent,
  subject,
  valueLabel,
  size,
}: {
  /** Already ordered by the caller — descending by value, with the un-reported countries kept at
   *  the end in their original source order, since a value that does not exist cannot be ranked. */
  rows: Row[];
  title: string;
  subtitle: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  /** The country the accent picks out — named because the article names it, not because it is the
   *  tallest bar (`static-discipline.md`, "One accent": "the subject is not the maximum"). */
  subject: string;
  /** Formats a reported value for its printed label, e.g. "€1,234.50". Supplied by the caller so
   *  this component names no unit and no currency symbol itself. */
  valueLabel: (value: number) => string;
  size: string;
}) {
  if (!rows.some((r) => r.country === subject))
    throw new Error(`subject ${JSON.stringify(subject)} is not one of the rows drawn`);

  const { ink, muted } = deriveFurniture(ground);
  const { width, height, typeScale } = sizeFor(size);
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
  const wrappedNames = rows.map((r) => ({
    country: r.country,
    lines: wrap(r.country, provisionalBand, T.CATEGORY_LABEL),
  }));
  const deepestLabel = Math.max(...wrappedNames.map((w) => w.lines.length));

  const padding = {
    top: plotTop,
    right: PAD,
    bottom:
      height -
      (sourceBaseline - T.SOURCE.fontSize - T.SOURCE_AIR) +
      T.CATEGORY_DROP +
      deepestLabel * T.CATEGORY_LABEL.lead,
    left: PAD,
  };

  const { plot, bars } = barGeometry(rows, { width, height, padding });

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

      {bars.map((b) => {
        const isSubject = b.country === subject;
        const lines = wrappedNames.find((w) => w.country === b.country)!.lines;
        return (
          <g key={b.country}>
            {b.value !== null && (
              <>
                <rect
                  x={b.x}
                  y={b.y}
                  width={b.width}
                  height={b.height}
                  fill={isSubject ? accent : muted}
                />
                {/* The value sits OUTSIDE the mark, in ink, never inside a coloured fill — the
                    trap `bar-and-column.md` names for this type. Outside the mark the only
                    contrast that has to hold is ink against the ground, which `deriveFurniture`
                    already guarantees on any ground a newsroom picks. */}
                <text
                  x={b.x + b.width / 2}
                  y={b.y - T.VALUE_LABEL_GAP}
                  fill={ink}
                  fontSize={T.VALUE_LABEL.fontSize}
                  fontWeight={T.VALUE_LABEL.fontWeight}
                  textAnchor="middle"
                >
                  {valueLabel(b.value)}
                </text>
              </>
            )}
            {b.value === null && (
              // No bar drawn at all — a real zero and "nothing reported" are different facts, and
              // drawing a zero-height column here would silently claim the first when the data
              // only supports the second. `ChartSeed.tsx`'s own gap note is the same idea one
              // axis rotated: the absence is named, not bridged.
              <text
                x={b.x + b.width / 2}
                y={plot.bottom - T.NO_DATA_GAP}
                fill={muted}
                fontSize={T.NO_DATA_LABEL.fontSize}
                textAnchor="middle"
              >
                no price reported
              </text>
            )}
            {lines.map((line, i) => (
              <text
                key={line}
                x={b.x + b.width / 2}
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

      {/* Zero baseline — the floor every bar (drawn or absent) is measured from. */}
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
