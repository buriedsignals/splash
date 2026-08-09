/**
 * A ranking beat. Every prior beat in this trial was a time series, so every one of them was a
 * line — this case tests whether the twin's advantage was really about the doctrine or just about
 * lines. A ranking is a different shape: no time axis, a bar per category, and the "zero" rule now
 * binds the OTHER way round from the crossing/rainfall beats (`static-discipline.md`, "Honest
 * scale") — a bar's LENGTH is the claim, so it starts at zero, full stop, no fitted-domain
 * argument to make.
 *
 * Written fresh for "En Europe de l'Ouest, seule la Suède emet moins de CO2 par habitant que la
 * Suisse" — not a parameterisation of `EmissionsLine.tsx`'s shape, because nothing in that file's
 * geometry (a scale fitted to a run of years, an endpoint, a peak) applies to sixteen unordered
 * countries.
 */

import { scaleLinear } from "d3-scale";
import { max } from "d3-array";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/twin-chart-beat/render-still.mjs";

export type RankedCountry = { country: string; value: number };

const FRAME = { width: 900, height: 560 };
const PAD = 40;
const TITLE = { fontSize: 23, fontWeight: 700, lead: 29 };
const SUBTITLE = { fontSize: 14, fontWeight: 400, lead: 19 };
const SOURCE = { fontSize: 13, fontWeight: 400 };
const AXIS = { fontSize: 12, fontWeight: 400 };
const ROW_LABEL = { fontSize: 13, fontWeight: 600 };
const VALUE_LABEL = { fontSize: 13, fontWeight: 600 };

/** French: comma decimal. The furniture speaks the journalist's language, same as the crossing
 *  beat's own `fr` — copied rather than imported, because sharing that one-line helper across an
 *  unrelated story is not worth a module boundary. */
function fr(value: number, decimals = 2): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Wrap on the measured width of the real string, never on a character count — this beat's own
 *  copy of the same wrapping rule every other beat duplicates. */
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

/**
 * Data to coordinates. No colour, no font, no label — the boundary this doctrine keeps on every
 * beat, ranking or line alike.
 *
 * Sorted ascending (lowest first) and read top-to-bottom in that order, so the subject
 * (Switzerland, second-lowest) and its comparison (Sweden, lowest) land in adjacent rows at the
 * top — the two the takeaway is about are the two the reader's eye reaches first, not the two
 * that happen to be alphabetically or numerically extreme in the usual "biggest on top" sense.
 *
 * The x domain starts at zero and is `.nice()`d outward — a bar's length is the claim, so unlike
 * the line beats in this trial, there is no "fitted to the readings" argument to make here at
 * all: `static-discipline.md`'s zero rule for bars is not a special case of the line rule, it is
 * the rule the line rule was written to be an exception FROM.
 */
export function rankingGeometry(
  data: RankedCountry[],
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
  const sorted = [...data].sort((a, b) => a.value - b.value);
  const x = scaleLinear()
    .domain([0, max(sorted, (d) => d.value) ?? 0])
    .nice()
    .range([plot.left, plot.right]);

  const rowHeight = (plot.bottom - plot.top) / sorted.length;
  const barThickness = rowHeight * 0.62;
  const rows = sorted.map((d, i) => {
    const rowTop = plot.top + i * rowHeight;
    const centerY = rowTop + rowHeight / 2;
    return {
      ...d,
      rank: i + 1,
      barTop: centerY - barThickness / 2,
      barBottom: centerY + barThickness / 2,
      centerY,
      x0: plot.left,
      x1: x(d.value),
    };
  });

  return { plot, x, rows };
}

export function RankBars({
  data,
  title,
  limits,
  source,
  alt,
  ground,
  accent,
  subject,
  unit,
}: {
  data: RankedCountry[];
  title: string;
  /** The caveat the framing exchange extracted — read directly under the title, ahead of the
   *  claim it qualifies (`information-architecture.md`'s subtitle zone, and the static genre's own
   *  override of where it sits — `static-discipline.md`, "The source under the header"). */
  limits: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  /** The country the confirmed takeaway is about. NOT the extreme of the ranking — the accent is
   *  assigned by this name, never by which bar happens to be longest or shortest
   *  (`visual-system.md`, "One semantic accent"). */
  subject: string;
  unit: string;
}) {
  if (data.length < 2)
    throw new Error("a ranking needs at least two entries, got " + data.length);
  if (!data.some((d) => d.country === subject))
    throw new Error(`subject "${subject}" is not in the ranked data`);

  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height } = FRAME;

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const limitsLines = wrap(limits, width - PAD * 2, SUBTITLE);
  const limitsBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 26;
  const sourceBaseline =
    limitsBaseline + (limitsLines.length - 1) * SUBTITLE.lead + 20;

  // Row labels ("2. Suisse") sit left of the plot, right-aligned; value labels sit at each bar's
  // own end. Both gutters are measured from the widest string that will really be drawn in them —
  // never a constant (`static-discipline.md`, "Gutters are measured, never fixed").
  const rowLabelFor = (rank: number, country: string) => `${rank}. ${country}`;
  const leftGutter = Math.max(
    ...data.map((d, i) =>
      measureText(rowLabelFor(i + 1, d.country), ROW_LABEL),
    ),
  );
  const valueLabelWidth = Math.max(
    ...data.map((d) => measureText(fr(d.value), VALUE_LABEL)),
  );

  const plotTop = sourceBaseline + 28;
  const plotBottom = height - (PAD + 22); // room for the x-axis tick labels below the bars
  const padding = {
    top: plotTop,
    right: PAD + 10 + valueLabelWidth,
    bottom: height - plotBottom,
    left: PAD + 12 + leftGutter,
  };

  const { plot, x, rows } = rankingGeometry(data, { width, height, padding });

  // Value-axis gridlines: a bar's length is the claim, so the domain starts at zero
  // (`static-discipline.md`, "zero is a rule about bars") and gets enough ticks that a reader can
  // read a value off the axis itself, not just off the direct end label
  // (`static-discipline.md`, "Axis density").
  const X_TICK_HINT = 5;
  const xTicks = x.ticks(X_TICK_HINT);
  const topTickValue = Math.max(...xTicks);

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
      {limitsLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={limitsBaseline + i * SUBTITLE.lead}
          fill={muted}
          fontSize={SUBTITLE.fontSize}
        >
          {line}
        </text>
      ))}
      <text x={PAD} y={sourceBaseline} fill={muted} fontSize={SOURCE.fontSize}>
        {source}
      </text>

      {/* Value-axis gridlines, drawn behind the bars. The topmost drawn tick carries the unit
          once, the same "state it on the highest tick actually drawn" rule the line beats use. */}
      {xTicks.map((value) => (
        <g key={value}>
          <line
            x1={x(value)}
            x2={x(value)}
            y1={plot.top}
            y2={plot.bottom}
            stroke={grid}
            strokeWidth={1}
          />
          <text
            x={x(value)}
            y={plot.bottom + 18}
            fill={muted}
            fontSize={AXIS.fontSize}
            textAnchor="middle"
          >
            {value === topTickValue ? `${value} ${unit}` : String(value)}
          </text>
        </g>
      ))}
      {/* The zero baseline itself, drawn solid: every bar starts here, and it is the one line on
          this axis that is not decoration. */}
      <line
        x1={plot.left}
        x2={plot.left}
        y1={plot.top}
        y2={plot.bottom}
        stroke={muted}
        strokeWidth={1}
      />

      {rows.map((row) => {
        const isSubject = row.country === subject;
        // Colour alone is not enough hierarchy when every label is drawn at the same weight as
        // the subject's — the fifteen comparison rows recede in TYPE the same way their bars
        // already recede in COLOUR, so the one accent is the only loud thing on the canvas
        // (`editorial-standard.md`, "establish hierarchy"; `visual-system.md`, "one semantic
        // accent"). The values stay legible either way — `muted` never drops below 4.5:1 — so the
        // bold, full-ink treatment on all sixteen rows was ink this beat's first render spent
        // without it earning a job.
        const barFill = isSubject ? accent : muted;
        const labelFill = isSubject ? accent : muted;
        const labelWeight = isSubject ? 700 : 400;
        return (
          <g key={row.country}>
            <rect
              x={row.x0}
              y={row.barTop}
              width={row.x1 - row.x0}
              height={row.barBottom - row.barTop}
              fill={barFill}
            />
            <text
              x={plot.left - 10}
              y={row.centerY + ROW_LABEL.fontSize * 0.35}
              fill={labelFill}
              fontSize={ROW_LABEL.fontSize}
              fontWeight={labelWeight}
              textAnchor="end"
            >
              {rowLabelFor(row.rank, row.country)}
            </text>
            <text
              x={row.x1 + 8}
              y={row.centerY + VALUE_LABEL.fontSize * 0.35}
              fill={labelFill}
              fontSize={VALUE_LABEL.fontSize}
              fontWeight={labelWeight}
            >
              {fr(row.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
