/**
 * Beat 3: network length per city, as horizontal lollipops, with Aveiro as the subject.
 *
 * Written against `chart-beat/references/types/lollipop.md`. Its two non-negotiables: the value
 * axis includes ZERO, because the stem's length is what a reader measures; and every value label
 * stays in INK, never in the accent — this type's own previously-shipped failure is an accent hue
 * used as running text, measuring under 4.5:1 while reading fine as a thin mark.
 *
 * The category gutter is the measured width of the widest name, never a constant — the same sheet
 * records truncated category labels from a fixed gutter as this type's other real bug.
 */

import { scaleLinear, scaleBand } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor, stageFor } from "#shared/chart-beat/sizes.mjs";
import {
  NON_TEXT_CONTRAST_FLOOR,
  assertAnnotationReadsOverMarks,
} from "#shared/chart-beat/annotation-ink.mjs";
import { fmt } from "../../ridership.ts";

export type Row = { city: string; value: number };

/** The type this beat draws, in `references/types/` vocabulary (`lollipop.md`). */
export const TYPE = "lollipop";

const BASE = {
  TITLE: { fontSize: 24, fontWeight: 700, lead: 30 },
  SUBTITLE: { fontSize: 15, fontWeight: 400, lead: 20 },
  SOURCE: { fontSize: 14, fontWeight: 400, lead: 19 },
  CATEGORY_LABEL: { fontSize: 14, fontWeight: 400, lead: 18 },
  VALUE_LABEL: { fontSize: 14, fontWeight: 600 },
  NOTE: { fontSize: 14, fontWeight: 400, lead: 18 },
  TITLE_TO_SUBTITLE: 26,
  HEADER_TO_PLOT: 46,
  SOURCE_AIR: 10,
  NAME_INSET: 12,
  VALUE_LABEL_GAP: 12,
  NOTE_GAP: 14,
  STEM_WIDTH: 3,
  DOT_RADIUS: 7,
} as const;

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
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    TITLE_TO_SUBTITLE: sp(BASE.TITLE_TO_SUBTITLE),
    HEADER_TO_PLOT: sp(BASE.HEADER_TO_PLOT),
    SOURCE_AIR: sp(BASE.SOURCE_AIR),
    NAME_INSET: sp(BASE.NAME_INSET),
    VALUE_LABEL_GAP: sp(BASE.VALUE_LABEL_GAP),
    NOTE_GAP: sp(BASE.NOTE_GAP),
    STEM_WIDTH: Math.max(2, sp(BASE.STEM_WIDTH)),
    DOT_RADIUS: Math.max(4, sp(BASE.DOT_RADIUS)),
  };
}

/**
 * Pure geometry: ranked rows to stems. Knows no colour, no font and no label.
 * Zero floor, non-negotiable — the stem's length is the encoding.
 */
export function lollipopGeometry(
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
  const max = Math.max(...rows.map((r) => r.value));
  const value = scaleLinear().domain([0, max]).range([plot.left, plot.right]);
  const band = scaleBand()
    .domain(rows.map((r) => r.city))
    .paddingInner(0.5)
    .paddingOuter(0.3)
    .range([plot.top, plot.bottom]);
  const stems = rows.map((r) => ({
    city: r.city,
    value: r.value,
    x1: plot.left,
    x2: value(r.value),
    y: band(r.city)! + band.bandwidth() / 2,
  }));
  return { plot, stems, at: (v: number) => value(v), step: band.step() };
}

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

export function NetworkLollipop({
  rows,
  title,
  subtitle,
  source,
  alt,
  ground,
  accent,
  subject,
  subjectNote,
  size,
}: {
  /** Already ranked descending by the caller. */
  rows: Row[];
  title: string;
  subtitle: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  /** The city the claim is about — `STORYBOARD.md`'s slot-3 subject, not the maximum. */
  subject: string;
  /** One sentence set on the subject's own row, computed by the caller from the frozen data. */
  subjectNote: string;
  size: string;
}) {
  if (rows.length < 3)
    throw new Error(`a ranking beat needs at least three rows, got ${rows.length}`);
  if (!rows.some((r) => r.city === subject))
    throw new Error(`subject ${JSON.stringify(subject)} is not one of the rows drawn`);

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

  // Both gutters MEASURED, never constants — this type's other recorded bug.
  const widestName = Math.max(...rows.map((r) => measureText(r.city, T.CATEGORY_LABEL)));
  const widestValue = Math.max(
    ...rows.map((r) => measureText(fmt.km(r.value), T.VALUE_LABEL)),
  );
  const noteWidth = measureText(subjectNote, T.NOTE);

  const padding = {
    top: plotTop,
    // Room for the value label beyond the LONGEST stem, and nothing more. The subject's note used
    // to be reserved here too, which reserved it at the longest row rather than at the row it is
    // actually drawn on — the longest stem then stopped at 58% of the frame and the right third
    // stayed empty. The note is checked against the frame below, where its real x is known.
    right: PAD + T.DOT_RADIUS + T.VALUE_LABEL_GAP + widestValue,
    bottom: height - (sourceBaseline - T.SOURCE.fontSize - T.SOURCE_AIR),
    left: PAD + widestName + T.NAME_INSET,
  };

  const { plot, stems, step } = lollipopGeometry(rows, { width, height, padding });

  if (step < minTypePx)
    throw new Error(
      `beat 3: at ${size} the ${rows.length} rows get ${step.toFixed(1)}px of band each, ` +
        `under the ${minTypePx}px one line of type occupies.`,
    );

  // The note is TEXT drawn beyond every mark, on the page. Measured against the ground it sits on
  // (SC 1.4.3's 4.5:1 is what `deriveFurniture` already guarantees for `ink`); the accent is only
  // ever on the mark, which is this type's own accessibility rule.
  assertAnnotationReadsOverMarks(
    { what: "the subject's stem and dot", colour: accent },
    [ground],
    NON_TEXT_CONTRAST_FLOOR,
  );

  const subjectStem = stems.find((s) => s.city === subject)!;
  const noteX = subjectStem.x2 + T.DOT_RADIUS + T.VALUE_LABEL_GAP + widestValue + T.NOTE_GAP;
  if (noteX + noteWidth > width - PAD)
    throw new Error(
      `beat 3: the note on ${subject}'s row would run ${Math.round(noteX + noteWidth - (width - PAD))}px ` +
        `past the frame. It is set beside the subject's own dot, so a subject near the top of the ` +
        `ranking leaves no room for it — shorten the sentence or move it under the plot.`,
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

      {stems.map((s) => {
        const isSubject = s.city === subject;
        const hue = isSubject ? accent : muted;
        return (
          <g key={s.city}>
            <line
              x1={s.x1}
              x2={s.x2}
              y1={s.y}
              y2={s.y}
              stroke={hue}
              strokeWidth={T.STEM_WIDTH}
            />
            <circle cx={s.x2} cy={s.y} r={T.DOT_RADIUS} fill={hue} />
            {/* The label carries the value, the mark carries the hue, and the two are never the
                same colour — `lollipop.md`'s accessibility trap, stated as a rule. */}
            <text
              x={s.x2 + T.DOT_RADIUS + T.VALUE_LABEL_GAP}
              y={s.y + T.VALUE_LABEL.fontSize * 0.36}
              fill={ink}
              fontSize={T.VALUE_LABEL.fontSize}
              fontWeight={T.VALUE_LABEL.fontWeight}
            >
              {fmt.km(s.value)}
            </text>
            <text
              x={plot.left - T.NAME_INSET}
              y={s.y + T.CATEGORY_LABEL.fontSize * 0.36}
              fill={ink}
              fontSize={T.CATEGORY_LABEL.fontSize}
              fontWeight={isSubject ? 700 : 400}
              textAnchor="end"
            >
              {s.city}
            </text>
          </g>
        );
      })}

      {/* The subject's own sentence, on its own row, in ink. */}
      <text
        x={noteX}
        y={subjectStem.y + T.NOTE.fontSize * 0.36}
        fill={ink}
        fontSize={T.NOTE.fontSize}
      >
        {subjectNote}
      </text>

      {/* Zero baseline — the floor every stem is measured from. */}
      <line
        x1={plot.left}
        x2={plot.left}
        y1={plot.top}
        y2={plot.bottom}
        stroke={ink}
        strokeWidth={1}
      />
    </svg>
  );
}
