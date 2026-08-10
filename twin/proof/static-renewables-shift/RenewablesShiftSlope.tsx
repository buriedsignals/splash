/**
 * Beat: "Germany's renewable share nearly doubled between 2015 and 2024" (slope chart).
 *
 * Written fresh from `ChartSeed.tsx`'s shape for a type that plots exactly two moments per
 * category (`references/types/slope.md`) — position-encoded, so unlike the bar family the value
 * axis is fitted, not zero-anchored, and unlike the scatter next door there is no third axis at
 * all: x is fixed at exactly two positions (2015, 2024), not a measured variable.
 */

import { extent } from "d3-array";
import { scaleLinear } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  contrast,
  FONT_FAMILY,
} from "#shared/twin-chart-beat/render-still.mjs";

export type Series = { name: string; start: number; end: number };

const FRAME = { width: 900, height: 560 };
const PAD = 40;
const TITLE = { fontSize: 24, fontWeight: 700, lead: 30 };
const SUBTITLE = { fontSize: 14, fontWeight: 400, lead: 20 };
const SOURCE = { fontSize: 14, fontWeight: 400 };
const PERIOD_LABEL = { fontSize: 14, fontWeight: 700 };
const CATEGORY_LABEL = { fontSize: 13, fontWeight: 600 };
const VALUE_LABEL = { fontSize: 13, fontWeight: 700 };
/** The label's own line height, in px — the minimum vertical gap the de-collision pass enforces
 *  between two category labels stacked at the same end. */
const MIN_LABEL_GAP = 16;

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

/** Push apart label y-positions, closest pair first, until every neighbouring pair clears
 *  `MIN_LABEL_GAP` — a minimal de-collision pass, not a full force layout, because six categories
 *  never needs one. */
function decollide(values: number[], minGap: number): number[] {
  const order = values.map((v, i) => i).sort((a, b) => values[a] - values[b]);
  const y = order.map((i) => values[i]);
  for (let pass = 0; pass < values.length; pass++) {
    let moved = false;
    for (let i = 1; i < y.length; i++) {
      if (y[i] - y[i - 1] < minGap) {
        const deficit = minGap - (y[i] - y[i - 1]);
        y[i] += deficit / 2;
        y[i - 1] -= deficit / 2;
        moved = true;
      }
    }
    if (!moved) break;
  }
  const result = new Array(values.length);
  order.forEach(
    (originalIndex, sortedIndex) => (result[originalIndex] = y[sortedIndex]),
  );
  return result;
}

function inkOn(fill: string): string {
  return contrast("#000000", fill) >= contrast("#FFFFFF", fill)
    ? "#000000"
    : "#FFFFFF";
}

/** Pure geometry: two x positions, one y scale fitted (never zero-anchored — position encoding,
 *  the direct opposite of a bar's length encoding). */
export function slopeGeometry(
  series: Series[],
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
  const values = series.flatMap((s) => [s.start, s.end]);
  const y = scaleLinear()
    .domain(extent(values) as [number, number])
    .nice()
    .range([plot.bottom, plot.top]);

  const startYRaw = series.map((s) => y(s.start));
  const endYRaw = series.map((s) => y(s.end));
  const startY = decollide(startYRaw, MIN_LABEL_GAP);
  const endY = decollide(endYRaw, MIN_LABEL_GAP);

  const lines = series.map((s, i) => ({
    name: s.name,
    start: { value: s.start, x: plot.left, y: y(s.start), labelY: startY[i] },
    end: { value: s.end, x: plot.right, y: y(s.end), labelY: endY[i] },
  }));

  return { plot, lines };
}

export function RenewablesShiftSlope({
  series,
  title,
  limits,
  source,
  alt,
  ground,
  accent,
  highlighted,
  startLabel,
  endLabel,
  unit,
}: {
  series: Series[];
  title: string;
  limits: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  highlighted: string;
  startLabel: string;
  endLabel: string;
  unit: string;
}) {
  if (series.length < 2)
    throw new Error(
      "a slope beat needs at least two categories, got " + series.length,
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height } = FRAME;

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const limitsLines = wrap(limits, width - PAD * 2, SUBTITLE);
  const limitsBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 28;
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN — the LAST line lands on `height - PAD`, the
  // same inset the title hangs off at the top, on the same x. See
  // twin-chart-beat/references/static-discipline.md, "The source on the frame's bottom margin".
  const sourceBaseline =
    height - PAD - (sourceLines.length - 1) * SUBTITLE.lead;
  // The period labels keep the air they always had above them, measured from the LAST HEADER line
  // rather than from the source, which is no longer in the header.
  const periodBaseline =
    limitsBaseline + (limitsLines.length - 1) * SUBTITLE.lead + 34;

  const widestLabel = Math.max(
    ...series.map((s) =>
      measureText(`${s.name} ${s.start.toFixed(1)}${unit}`, CATEGORY_LABEL),
    ),
    ...series.map((s) =>
      measureText(`${s.name} ${s.end.toFixed(1)}${unit}`, CATEGORY_LABEL),
    ),
  );
  const padding = {
    top: periodBaseline + 20,
    right: PAD + 12 + widestLabel,
    // Grown by the source block's own height plus clear air: the credit now sits on the frame's
    // bottom margin, so the band beneath the plot has to end above its ink.
    bottom:
      PAD +
      20 +
      (sourceLines.length - 1) * SUBTITLE.lead +
      SOURCE.fontSize +
      10,
    left: PAD + 12 + widestLabel,
  };

  const { plot, lines } = slopeGeometry(series, { width, height, padding });

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
      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={sourceBaseline + i * SUBTITLE.lead}
          fill={muted}
          fontSize={SOURCE.fontSize}
        >
          {line}
        </text>
      ))}

      {/* THE TWO VERTICAL AXES, one per period. `references/types/slope.md` asks for them by name —
          "Two vertical axes — one per period — with each category's two values plotted as points
          and joined by a straight line between them" — and this beat drew neither. What the
          delivered HTML sibling calls `.y-axis` and `.r-axis` are label GUTTERS, not rules; the
          only vertical strokes in the committed SVG were the twelve dashed label leaders, whose
          longest span measured 6.21px against a ~292px plot. That is what "not everything seems
          rendered" was: the connecting lines were there, and the thing they connect was not.
          Drawn first, in `grid`, so the six category lines and their end dots sit on top of them —
          an axis is the frame a reading is taken against, never a mark competing with the data.
          `vidx-slope-child-mortality/SlopeVideo.tsx` already honoured the sheet; the static and the
          web sibling did not, which is this project's recurring shape — the video honours the sheet
          and its siblings do not. */}
      <line
        x1={plot.left}
        x2={plot.left}
        y1={plot.top}
        y2={plot.bottom}
        stroke={grid}
        strokeWidth={1}
      />
      <line
        x1={plot.right}
        x2={plot.right}
        y1={plot.top}
        y2={plot.bottom}
        stroke={grid}
        strokeWidth={1}
      />

      {/* Each period needs its own caption — a slope chart with unlabelled ends states direction
          with no stated "from when to when," half the claim (`references/types/slope.md`). */}
      <text
        x={plot.left}
        y={periodBaseline}
        fill={ink}
        fontSize={PERIOD_LABEL.fontSize}
        fontWeight={PERIOD_LABEL.fontWeight}
        textAnchor="middle"
      >
        {startLabel}
      </text>
      <text
        x={plot.right}
        y={periodBaseline}
        fill={ink}
        fontSize={PERIOD_LABEL.fontSize}
        fontWeight={PERIOD_LABEL.fontWeight}
        textAnchor="middle"
      >
        {endLabel}
      </text>

      {lines.map((l) => {
        const isAccent = l.name === highlighted;
        const stroke = isAccent ? accent : muted;
        return (
          <g key={l.name}>
            <line
              x1={l.start.x}
              y1={l.start.y}
              x2={l.end.x}
              y2={l.end.y}
              stroke={stroke}
              strokeWidth={isAccent ? 3 : 1.5}
            />
            <circle cx={l.start.x} cy={l.start.y} r={3.5} fill={stroke} />
            <circle cx={l.end.x} cy={l.end.y} r={3.5} fill={stroke} />
            {/* Value label carries the number in ink, never the line's own accent — the same
                escalated-contrast discipline as every other type in this set
                (`visual-system.md`). A short leader connects the label to its true point when the
                de-collision pass above has shifted it. */}
            <line
              x1={l.start.x - 8}
              y1={l.start.y}
              x2={l.start.x - 8}
              y2={l.start.labelY}
              stroke={stroke}
              strokeWidth={1}
              strokeDasharray="2 2"
              opacity={Math.abs(l.start.y - l.start.labelY) > 1 ? 1 : 0}
            />
            <text
              x={l.start.x - 12}
              y={l.start.labelY + 4}
              fill={ink}
              fontSize={CATEGORY_LABEL.fontSize}
              fontWeight={isAccent ? 700 : CATEGORY_LABEL.fontWeight}
              textAnchor="end"
            >
              {l.name} {l.start.value.toFixed(1)}
              {unit}
            </text>
            <line
              x1={l.end.x + 8}
              y1={l.end.y}
              x2={l.end.x + 8}
              y2={l.end.labelY}
              stroke={stroke}
              strokeWidth={1}
              strokeDasharray="2 2"
              opacity={Math.abs(l.end.y - l.end.labelY) > 1 ? 1 : 0}
            />
            <text
              x={l.end.x + 12}
              y={l.end.labelY + 4}
              fill={ink}
              fontSize={CATEGORY_LABEL.fontSize}
              fontWeight={isAccent ? 700 : CATEGORY_LABEL.fontWeight}
              textAnchor="start"
            >
              {l.name} {l.end.value.toFixed(1)}
              {unit}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
