/**
 * Beat 1 — hospital beds per 10 000 inhabitants, by voivodeship.
 *
 * Written from `chart-beat/assets/ChartSeed.tsx`'s shape, not imported from it: pure geometry
 * first, furniture derived from the ground, direct annotation, one accent.
 *
 * The argument is a RANK, not a magnitude. Eight regions sit inside 5,1 beds of each other, so the
 * bars from a shared zero look alike on purpose — the frozen table really is that flat — and every
 * row carries its own printed number. What the reader is meant to see is the ORDER, and that the
 * subject is third in it while leading the raw count by a wide margin.
 */

import { scaleLinear } from "d3-scale";
import { deriveFurniture, measureText, FONT_FAMILY } from "#shared/chart-beat/render-still.mjs";
import { inkThatReadsOver, NON_TEXT_CONTRAST_FLOOR } from "#shared/chart-beat/annotation-ink.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-beat/sizes.mjs";

/** The vocabulary `references/types/` uses, read by `assertTypeMayEnter`. */
export const TYPE = "bar";

export type Row = {
  name: string;
  perTenThousand: number;
  beds: number;
  population: number;
};

/** The 900x560 tokens this beat is tuned at. Every spacing number goes through `sp`, not only the
 *  font sizes — the seed's own finding, and the reason nothing here is a bare literal. */
const BASE = {
  TITLE: { fontSize: 26, fontWeight: 700, lead: 34 },
  STANDFIRST: { fontSize: 15, fontWeight: 400, lead: 22 },
  SOURCE: { fontSize: 14, fontWeight: 400, lead: 18 },
  NAME: { fontSize: 15, fontWeight: 400 },
  VALUE: { fontSize: 15, fontWeight: 700 },
  NOTE: { fontSize: 13, fontWeight: 400, lead: 18 },
  RULE_LABEL: { fontSize: 13, fontWeight: 400 },
  TITLE_TO_STANDFIRST: 16,
  STANDFIRST_TO_PLOT: 30,
  NAME_GUTTER: 14,
  VALUE_AIR: 10,
  NOTE_AIR: 22,
  BAR_HEIGHT: 22,
  ROW_GAP: 12,
  RULE_LABEL_DROP: 10,
  PLOT_TO_SOURCE_GAP: 24,
  BASELINE_NUDGE: 5,
};

export function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  return {
    sp,
    TITLE: { ...BASE.TITLE, fontSize: sp(BASE.TITLE.fontSize), lead: sp(BASE.TITLE.lead) },
    STANDFIRST: {
      ...BASE.STANDFIRST,
      fontSize: sp(BASE.STANDFIRST.fontSize),
      lead: sp(BASE.STANDFIRST.lead),
    },
    SOURCE: { ...BASE.SOURCE, fontSize: sp(BASE.SOURCE.fontSize), lead: sp(BASE.SOURCE.lead) },
    NAME: { ...BASE.NAME, fontSize: sp(BASE.NAME.fontSize) },
    VALUE: { ...BASE.VALUE, fontSize: sp(BASE.VALUE.fontSize) },
    NOTE: { ...BASE.NOTE, fontSize: sp(BASE.NOTE.fontSize), lead: sp(BASE.NOTE.lead) },
    RULE_LABEL: { ...BASE.RULE_LABEL, fontSize: sp(BASE.RULE_LABEL.fontSize) },
    TITLE_TO_STANDFIRST: sp(BASE.TITLE_TO_STANDFIRST),
    STANDFIRST_TO_PLOT: sp(BASE.STANDFIRST_TO_PLOT),
    NAME_GUTTER: sp(BASE.NAME_GUTTER),
    VALUE_AIR: sp(BASE.VALUE_AIR),
    NOTE_AIR: sp(BASE.NOTE_AIR),
    BAR_HEIGHT: sp(BASE.BAR_HEIGHT),
    ROW_GAP: sp(BASE.ROW_GAP),
    RULE_LABEL_DROP: sp(BASE.RULE_LABEL_DROP),
    PLOT_TO_SOURCE_GAP: sp(BASE.PLOT_TO_SOURCE_GAP),
    BASELINE_NUDGE: sp(BASE.BASELINE_NUDGE),
  };
}

/**
 * Data to coordinates, and nothing else — no colour, no font, no label.
 *
 * The domain starts at ZERO and it is not negotiable here: a bar carries its value in its LENGTH,
 * so a truncated baseline would turn a 15 % spread into a landslide. The compression that costs is
 * a stated decision, recorded in `BRIEF.md` under "Framing", not a defect this function hides.
 */
export function barGeometry(
  rows: Row[],
  { left, right, top, barHeight, rowGap }: {
    left: number;
    right: number;
    top: number;
    barHeight: number;
    rowGap: number;
  },
) {
  if (rows.length < 2) throw new Error(`a ranking beat needs at least two rows, got ${rows.length}`);
  const max = Math.max(...rows.map((r) => r.perTenThousand));
  const x = scaleLinear().domain([0, max]).range([left, right]);
  const rowHeight = barHeight + rowGap;
  const bars = rows.map((row, i) => {
    const y = top + i * rowHeight;
    return {
      ...row,
      y,
      centreY: y + barHeight / 2,
      x0: left,
      x1: x(row.perTenThousand),
      width: x(row.perTenThousand) - left,
    };
  });
  return {
    bars,
    x,
    rowHeight,
    bottom: top + rows.length * rowHeight - rowGap,
  };
}

/** Wrap on the measured width of the real string, never on a character count. */
export function wrap(
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

export function HospitalBeds({
  rows,
  title,
  standfirst,
  source,
  alt,
  ground,
  accent,
  fieldInk,
  subject,
  subjectNote,
  averageLabel,
  average,
  size,
}: {
  rows: Row[];
  title: string;
  standfirst: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  /** The ink the seven NON-subject bars are drawn in. Handed in rather than derived here, because
   *  it is a palette decision and `render.mjs` is where this beat reads its palette. Two candidates
   *  were rendered and looked at; `render.mjs` records which won and why. */
  fieldInk: string;
  subject: string;
  subjectNote: string;
  averageLabel: string;
  average: number;
  size: string;
}) {
  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height, typeScale } = sizeFor(size);
  const INSET = frameInsetFor(size);
  const T = tokens(typeScale);

  // The header is laid out first, because the plot starts where the header stops.
  const titleLines = wrap(title, width - INSET * 2, T.TITLE);
  const titleBaseline = INSET + T.TITLE.fontSize;
  const standfirstTop =
    titleBaseline + (titleLines.length - 1) * T.TITLE.lead + T.TITLE_TO_STANDFIRST;
  const standfirstLines = wrap(standfirst, width - INSET * 2, T.STANDFIRST);
  const standfirstBaseline = standfirstTop + T.STANDFIRST.fontSize;

  // The credit sits on the frame's bottom margin, on the same x as the title.
  const sourceLines = wrap(source, width - INSET * 2, T.SOURCE);
  const sourceBaseline = height - INSET;

  // Every gutter is measured from the widest string that will actually be drawn in it.
  const nameColumn = Math.max(...rows.map((r) => measureText(r.name, T.NAME)));
  const valueOf = (row: Row) => row.perTenThousand.toFixed(1).replace(".", ",");
  const valueColumn = Math.max(...rows.map((r) => measureText(valueOf(r), T.VALUE)));

  const plotLeft = INSET + nameColumn + T.NAME_GUTTER;
  // The subject's own note gets its own reserved column at the frame's right, so it is drawn on the
  // GROUND and never over a mark. Two lines at most; the reserve is the wider of them.
  const noteLines = wrap(subjectNote, Math.round((width - INSET * 2) * 0.28), T.NOTE);
  const noteColumn = Math.max(...noteLines.map((line) => measureText(line, T.NOTE)));
  const plotRight = width - INSET - noteColumn - T.NOTE_AIR - valueColumn - T.VALUE_AIR;

  const plotTop = standfirstBaseline + (standfirstLines.length - 1) * T.STANDFIRST.lead +
    T.STANDFIRST_TO_PLOT + T.RULE_LABEL.fontSize + T.RULE_LABEL_DROP;

  // THE ROW HEIGHT IS DERIVED FROM THE BAND, NOT ASSUMED. The header is the journalist's own
  // sentences and it grows with them: a standfirst that gains a line pushes the plot down, and a
  // fixed row height then walks the last row into the credit. The band between the header and the
  // credit block is measured, and the eight rows are fitted into it at the tuned bar-to-gap ratio.
  const creditTop = sourceBaseline - T.SOURCE.fontSize - (sourceLines.length - 1) * T.SOURCE.lead;
  const band = creditTop - T.PLOT_TO_SOURCE_GAP - plotTop;
  const rowHeight = Math.floor(band / rows.length);
  const barHeight = Math.round(rowHeight * (BASE.BAR_HEIGHT / (BASE.BAR_HEIGHT + BASE.ROW_GAP)));
  const rowGap = rowHeight - barHeight;
  if (barHeight < T.NAME.fontSize)
    throw new Error(
      `${rows.length} rows fitted into a ${band}px band give a ${barHeight}px bar, thinner than the ` +
        `${T.NAME.fontSize}px name beside it — the header has taken the plot's room. Shorten the ` +
        `standfirst or drop a row.`,
    );

  const { bars, x, bottom } = barGeometry(rows, {
    left: plotLeft,
    right: plotRight,
    top: plotTop,
    barHeight,
    rowGap,
  });

  const isSubject = (name: string) => name === subject;
  const barFill = (name: string) => (isSubject(name) ? accent : fieldInk);
  // The reference rule crosses every bar it passes, so its ink is measured against what it is drawn
  // OVER — the ground, the accent, and the furniture the other seven bars are drawn in — never
  // against the page alone.
  const ruleInk = inkThatReadsOver([ground, accent, fieldInk], NON_TEXT_CONTRAST_FLOOR);
  const averageX = x(average);

  const valueColumnRight = plotRight + T.VALUE_AIR + valueColumn;

  const subjectRow = bars.find((b) => isSubject(b.name));
  if (!subjectRow) throw new Error(`the subject ${JSON.stringify(subject)} is not one of the rows drawn`);

  if (bottom + T.PLOT_TO_SOURCE_GAP > creditTop)
    throw new Error(
      `the plot's last row ends at ${bottom} and the credit block starts at ${creditTop} — they collide`,
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
          x={INSET}
          y={titleBaseline + i * T.TITLE.lead}
          fill={ink}
          fontSize={T.TITLE.fontSize}
          fontWeight={T.TITLE.fontWeight}
        >
          {line}
        </text>
      ))}

      {standfirstLines.map((line, i) => (
        <text
          key={line}
          x={INSET}
          y={standfirstBaseline + i * T.STANDFIRST.lead}
          fill={muted}
          fontSize={T.STANDFIRST.fontSize}
        >
          {line}
        </text>
      ))}

      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={INSET}
          y={sourceBaseline - (sourceLines.length - 1 - i) * T.SOURCE.lead}
          fill={muted}
          fontSize={T.SOURCE.fontSize}
        >
          {line}
        </text>
      ))}

      {/* The bars, from a shared zero on the left. */}
      {bars.map((bar) => (
        <rect
          key={bar.name}
          x={bar.x0}
          y={bar.y}
          width={bar.width}
          height={barHeight}
          fill={barFill(bar.name)}
        />
      ))}

      {/* Every row names itself, on its own row, flush to the bar it belongs to. */}
      {bars.map((bar) => (
        <text
          key={bar.name}
          x={plotLeft - T.NAME_GUTTER}
          y={bar.centreY + T.BASELINE_NUDGE}
          fill={isSubject(bar.name) ? ink : muted}
          fontSize={T.NAME.fontSize}
          fontWeight={isSubject(bar.name) ? 700 : T.NAME.fontWeight}
          textAnchor="end"
        >
          {bar.name}
        </text>
      ))}

      {/* And its own value, outside every mark, in ONE right-aligned column past the longest bar.
          It sat at each bar's own tip in the first render and the average rule was drawn straight
          through "38,5", "37,0", "36,7", "35,4" and "35,3" — every row below the average, because a
          tip label and a vertical rule at the average are a few pixels apart by construction. A
          fixed column cannot collide with a rule that lives inside the track. */}
      {bars.map((bar) => (
        <text
          key={bar.name}
          x={valueColumnRight}
          y={bar.centreY + T.BASELINE_NUDGE}
          fill={isSubject(bar.name) ? ink : muted}
          fontSize={T.VALUE.fontSize}
          fontWeight={T.VALUE.fontWeight}
          textAnchor="end"
        >
          {valueOf(bar)}
        </text>
      ))}

      {/* The eight-region average — the anchor that says how tight the field is. A plain dash
          pattern in the path's own units: no dashoffset, no pathLength, no non-scaling-stroke. */}
      <line
        x1={averageX}
        x2={averageX}
        y1={plotTop - T.RULE_LABEL_DROP}
        y2={bottom}
        stroke={ruleInk}
        strokeWidth={2}
        strokeDasharray="6 5"
      />
      <text
        x={averageX}
        y={plotTop - T.RULE_LABEL_DROP - T.RULE_LABEL.fontSize * 0.4}
        fill={ink}
        fontSize={T.RULE_LABEL.fontSize}
        textAnchor="middle"
      >
        {averageLabel}
      </text>

      {/* The raw count, once, on the subject's own row, drawn on the ground in its own reserved
          column — never over a mark. */}
      {noteLines.map((line, i) => (
        <text
          key={line}
          x={width - INSET - noteColumn}
          y={
            subjectRow.centreY +
            T.BASELINE_NUDGE -
            ((noteLines.length - 1) / 2) * T.NOTE.lead +
            i * T.NOTE.lead
          }
          fill={ink}
          fontSize={T.NOTE.fontSize}
        >
          {line}
        </text>
      ))}
    </svg>
  );
}
