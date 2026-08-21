/**
 * Beat 1 — water consumption by governorate, drawn RIGHT TO LEFT.
 *
 * WHY THIS COMPONENT MIRRORS ITS OWN LAYOUT BY HAND.
 *
 * Nothing in this toolchain knows that a label is right-to-left. There is no `direction`, no
 * `dir="rtl"`, no axis-side switch and no anchor flip anywhere in `skills/` or `shared/`, and the
 * rasteriser ignores SVG's own `direction` attribute — measured on this machine, three renders of
 * the same string with and without it produced identical ink. What the rasteriser DOES do on its own
 * is the Unicode bidi algorithm and Arabic joining INSIDE one run: the strings below are handed over
 * exactly as the journalist froze them, never reversed and never reordered, and they come out joined
 * and in reading order. Everything above the run — which edge the names hang off, which way the bars
 * grow, which end a value label sits at — is this file's arithmetic, because there is nowhere else
 * for it to live.
 *
 * So the mirroring rule for this frame, written down once:
 *   · the category names are flush to the RIGHT frame edge, `text-anchor="end"`;
 *   · zero is at the RIGHT, and a bar grows LEFTWARD by its own value;
 *   · a value label sits at the bar's tip, on its LEFT, `text-anchor="end"`;
 *   · the header and the credit are flush right too, on the same margin as the names.
 *
 * THE ONE VALUE THE TOOLCHAIN COULD NOT READ. `source/data.csv` writes Sfax's consumption in
 * Arabic-Indic digits, so `source/profile.json` refuses the whole column as `text`. `water.ts`
 * transliterates those digits — one-for-one, never an estimate — and this beat draws the bar it
 * gets, as an OUTLINE rather than a fill, with the source's own characters printed beside it. A
 * reader sees which figure came out of the table as a number and which one did not.
 */

import { scaleLinear } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor, stageFor } from "#shared/chart-beat/sizes.mjs";

/** The treatment this beat is, as `type-at-size.mjs` names it. */
export const TYPE = "bar";

export type Row = {
  name: string;
  value: number;
  /** The cell exactly as the frozen table writes it, when it needed transliteration. */
  raw: string | null;
};

const BASE = {
  TITLE: { fontSize: 26, fontWeight: 700, lead: 34 },
  SUB: { fontSize: 16, fontWeight: 400, lead: 22 },
  SOURCE: { fontSize: 14, fontWeight: 400, lead: 18 },
  NAME: { fontSize: 15, fontWeight: 600 },
  VALUE: { fontSize: 15, fontWeight: 700 },
  NOTE: { fontSize: 12, fontWeight: 400, lead: 17 },
  TITLE_TO_SUB: 26,
  HEADER_TO_PLOT: 34,
  NAME_GUTTER: 14,
  VALUE_AIR: 10,
  NOTE_AIR: 22,
  BASELINE_NUDGE: 5,
  PLOT_TO_SOURCE: 26,
};

export function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  return {
    sp,
    TITLE: { ...BASE.TITLE, fontSize: sp(BASE.TITLE.fontSize), lead: sp(BASE.TITLE.lead) },
    SUB: { ...BASE.SUB, fontSize: sp(BASE.SUB.fontSize), lead: sp(BASE.SUB.lead) },
    SOURCE: { ...BASE.SOURCE, fontSize: sp(BASE.SOURCE.fontSize), lead: sp(BASE.SOURCE.lead) },
    NAME: { ...BASE.NAME, fontSize: sp(BASE.NAME.fontSize) },
    VALUE: { ...BASE.VALUE, fontSize: sp(BASE.VALUE.fontSize) },
    NOTE: { ...BASE.NOTE, fontSize: sp(BASE.NOTE.fontSize), lead: sp(BASE.NOTE.lead) },
    TITLE_TO_SUB: sp(BASE.TITLE_TO_SUB),
    HEADER_TO_PLOT: sp(BASE.HEADER_TO_PLOT),
    NAME_GUTTER: sp(BASE.NAME_GUTTER),
    VALUE_AIR: sp(BASE.VALUE_AIR),
    NOTE_AIR: sp(BASE.NOTE_AIR),
    BASELINE_NUDGE: sp(BASE.BASELINE_NUDGE),
    PLOT_TO_SOURCE: sp(BASE.PLOT_TO_SOURCE),
  };
}

/**
 * A RUN THE RASTERISER WILL TYPESET AS A RIGHT-TO-LEFT PARAGRAPH.
 *
 * MEASURED, not assumed, on this machine on 2026-08-21. resvg runs the Unicode bidi algorithm and
 * Arabic joining on its own — the letters come out joined and in reading order with no help — but it
 * resolves the PARAGRAPH level as left-to-right, and it IGNORES SVG's own `direction` attribute
 * (three renders of the same string with `direction="rtl"`, with `unicode-bidi:bidi-override` and
 * with neither produced identical ink). So a sentence that ends in an ASCII full stop has that stop
 * placed at the visual RIGHT of the line — the START of the sentence — and reads as `.الجدول`.
 * That is punctuation on the wrong side, which is the class of defect the desk rejected a previous
 * attempt for.
 *
 * What resvg DOES honour is the Unicode explicit formatting characters themselves, because they are
 * characters and not attributes. Measured, same run: RLE+PDF, RLI+PDI, FSI+PDI and a trailing RLM
 * all place the stop correctly at the left; a bare string and a LEADING RLM do not. U+2067 RIGHT-TO-
 * LEFT ISOLATE / U+2069 POP DIRECTIONAL ISOLATE is the one used here — an isolate rather than an
 * embedding, so the run cannot change the direction of anything drawn after it.
 *
 * Applied only to a run that actually carries Arabic letters, so a bare number is left alone, and
 * applied to the string that is MEASURED as well as the one that is drawn: both control characters
 * are zero-width, but measuring one string and drawing another is how a gutter stops being measured.
 *
 * There is nowhere in this toolchain for this to live: nothing in `skills/` or `shared/` mentions
 * direction, RTL or bidi at all.
 */
const RTL_LETTER = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
export function rtl(text: string): string {
  return RTL_LETTER.test(text) ? `\u2067${text}\u2069` : text;
}

/** How much of a row's band the bar itself occupies. The rest is the gap `bar-and-column.md` asks
 *  for — "roughly a fifth to a third of the band's width" — so the bars read as discrete marks. */
const BAR_OF_BAND = 0.62;

/**
 * Data to coordinates, mirrored. Knows no colour, no font and no label.
 *
 * `x0` is the ZERO end and it is on the RIGHT; `x` is the bar's tip, to its left. A bar's length is
 * `x0 - x`, which is the same length a left-to-right frame would have drawn, laid the other way.
 * The value axis is anchored at zero, as a length encoding requires — the mirroring changes which
 * edge zero sits on, never whether the scale starts there.
 */
export function barGeometry(
  rows: Row[],
  {
    plotLeft,
    plotRight,
    plotTop,
    plotBottom,
  }: { plotLeft: number; plotRight: number; plotTop: number; plotBottom: number },
) {
  if (rows.length === 0) throw new Error("a bar beat needs at least one row, got none");
  const max = Math.max(...rows.map((r) => r.value));
  if (!(max > 0)) throw new Error("a length encoding needs a positive maximum to scale against");
  const x = scaleLinear().domain([0, max]).range([plotRight, plotLeft]);
  const band = (plotBottom - plotTop) / rows.length;
  const barHeight = band * BAR_OF_BAND;
  return {
    max,
    band,
    barHeight,
    bars: rows.map((row, i) => {
      const top = plotTop + band * i + (band - barHeight) / 2;
      return {
        ...row,
        top,
        height: barHeight,
        middle: top + barHeight / 2,
        x0: plotRight,
        x: x(row.value),
      };
    }),
  };
}

/** Wrap on the measured width of the real string, never on a character count. Arabic words are
 *  space-separated, so the ordinary word split is the right one — and each line is handed to the
 *  rasteriser whole, so its own bidi pass still orders the run. */
export function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const trial = line ? `${line} ${word}` : word;
    if (line && measureText(rtl(trial), font) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...lines, line] : lines;
}

export function WaterBars({
  rows,
  title,
  subtitle,
  source,
  alt,
  ground,
  accent,
  subject,
  unreadNote,
  size,
}: {
  rows: Row[];
  title: string;
  subtitle: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  subject: string;
  /** The sentence that names the one cell the frozen table did not hand over as a number. */
  unreadNote: string;
  size: string;
}) {
  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height, typeScale } = sizeFor(size);
  const stage = stageFor(size);
  const T = tokens(typeScale);
  const INSET = frameInsetFor(size);

  // THE RIGHT EDGE IS THE ONE EVERYTHING HANGS OFF, because the reader starts there.
  const rightEdge = width - INSET;
  const leftEdge = INSET;
  const contentTop = stage.reserved ? stage.top : INSET;
  const sourceBaseline = stage.reserved ? stage.bottom : height - INSET;

  const titleLines = wrap(title, rightEdge - leftEdge, T.TITLE);
  const titleBaseline = contentTop + T.TITLE.fontSize;
  const subtitleTop =
    titleBaseline + (titleLines.length - 1) * T.TITLE.lead + T.TITLE_TO_SUB + T.SUB.fontSize;
  const subtitleLines = wrap(subtitle, rightEdge - leftEdge, T.SUB);
  const sourceLines = wrap(source, rightEdge - leftEdge, T.SOURCE);

  // Both gutters measured from the widest string that will really be drawn in them.
  const nameGutter = Math.max(...rows.map((r) => measureText(rtl(r.name), T.NAME)));
  const valueOf = (row: Row) => String(row.value);
  const valueGutter = Math.max(...rows.map((r) => measureText(valueOf(r), T.VALUE)));

  const plotRight = rightEdge - nameGutter - T.NAME_GUTTER;
  const plotLeft = leftEdge + valueGutter + T.VALUE_AIR;
  const plotTop = subtitleTop + (subtitleLines.length - 1) * T.SUB.lead + T.HEADER_TO_PLOT;
  const plotBottom =
    sourceBaseline -
    T.SOURCE.fontSize -
    (sourceLines.length - 1) * T.SOURCE.lead -
    T.PLOT_TO_SOURCE;

  const { bars } = barGeometry(rows, { plotLeft, plotRight, plotTop, plotBottom });

  // The note sits in the clear air to the LEFT of the outlined bar it is about — direct annotation,
  // on the row it names, not a footnote a reader has to travel to. Its measure is whatever is left
  // between the frame's left edge and that bar's own value label.
  const unread = bars.find((bar) => bar.raw !== null);
  const noteMeasure = unread ? unread.x - T.VALUE_AIR - valueGutter - T.NOTE_AIR - leftEdge : 0;
  const noteLines = unread && noteMeasure > 0 ? wrap(unreadNote, noteMeasure, T.NOTE) : [];

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
          x={rightEdge}
          y={titleBaseline + i * T.TITLE.lead}
          fill={ink}
          fontSize={T.TITLE.fontSize}
          fontWeight={T.TITLE.fontWeight}
          textAnchor="end"
        >
          {rtl(line)}
        </text>
      ))}
      {subtitleLines.map((line, i) => (
        <text
          key={line}
          x={rightEdge}
          y={subtitleTop + i * T.SUB.lead}
          fill={muted}
          fontSize={T.SUB.fontSize}
          textAnchor="end"
        >
          {rtl(line)}
        </text>
      ))}
      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={rightEdge}
          y={sourceBaseline - (sourceLines.length - 1 - i) * T.SOURCE.lead}
          fill={muted}
          fontSize={T.SOURCE.fontSize}
          textAnchor="end"
        >
          {rtl(line)}
        </text>
      ))}

      {/* Zero, on the right, where an Arabic reader's eye starts. */}
      <line
        x1={plotRight}
        x2={plotRight}
        y1={plotTop}
        y2={plotBottom}
        stroke={grid}
        strokeWidth={1}
      />

      {bars.map((bar) => {
        const isSubject = bar.name === subject;
        const unreadable = bar.raw !== null;
        return (
          <g key={bar.name}>
            <rect
              x={bar.x}
              y={bar.top}
              width={bar.x0 - bar.x}
              height={bar.height}
              fill={unreadable ? "none" : isSubject ? accent : muted}
              stroke={unreadable ? muted : "none"}
              strokeWidth={unreadable ? 2 : 0}
              strokeDasharray={unreadable ? "8 6" : undefined}
            />
            <text
              x={rightEdge}
              y={bar.middle + T.BASELINE_NUDGE}
              fill={ink}
              fontSize={T.NAME.fontSize}
              fontWeight={T.NAME.fontWeight}
              textAnchor="end"
            >
              {rtl(bar.name)}
            </text>
            <text
              x={bar.x - T.VALUE_AIR}
              y={bar.middle + T.BASELINE_NUDGE}
              // NOT THE ACCENT, and this was caught by measuring the render rather than by
              // reading the markup. `#1F6FB2` clears the 3:1 NON-TEXT floor against this ground
              // (3.34:1), which is what makes it a legal MARK colour, and it is under the 4.5:1
              // floor a WORD has to clear — `inspectSvg` reported exactly that on the first
              // render. The accent stays on the bar; the subject's own figure is set in `ink`,
              // which is both legible and louder than the muted rest.
              fill={isSubject ? ink : muted}
              fontSize={T.VALUE.fontSize}
              fontWeight={T.VALUE.fontWeight}
              textAnchor="end"
            >
              {valueOf(bar)}
            </text>
          </g>
        );
      })}

      {unread
        ? noteLines.map((line, i) => (
            <text
              key={line}
              x={unread.x - T.VALUE_AIR - valueGutter - T.NOTE_AIR}
              // THE BLOCK HANGS FROM THE BAR'S OWN TOP AND GROWS DOWNWARD, never centred on the
              // row. Centred, a three-line note rose into the row above: measured at 1.4px of
              // clearance under the accent bar — a collision in everything but arithmetic. Growing
              // down is safe on this frame because every bar below this one starts far to the
              // right of where this note ends, so the space it grows into carries no mark.
              y={unread.top + T.NOTE.fontSize + i * T.NOTE.lead}
              fill={muted}
              fontSize={T.NOTE.fontSize}
              textAnchor="end"
            >
              {rtl(line)}
            </text>
          ))
        : null}
    </svg>
  );
}
