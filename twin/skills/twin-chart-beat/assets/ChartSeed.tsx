/**
 * REPLACE ME. Do not parameterise me.
 *
 * This is not a chart type and it is not a component library. It is the wiring of one static
 * chart beat, written out once so the next one can be written from scratch in the same shape:
 *
 *   pure geometry (numbers only) -> furniture derived from the ground -> direct annotation -> one accent
 *
 * The story that needs a second line, a band, a projection or an annotation writes its own
 * component. Adding a `variant` prop to this file is the failure this seed exists to prevent.
 */

import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "../scripts/render-still.mjs";

type Reading = { year: number; value: number | null };
type Padding = { top: number; right: number; bottom: number; left: number };

const FRAME = { width: 900, height: 560 };
const PAD = 40;
const TITLE = { fontSize: 26, fontWeight: 700, lead: 34 };
const SOURCE = { fontSize: 14, fontWeight: 400 };
const AXIS = { fontSize: 13, fontWeight: 400 };
const LABEL = { fontSize: 15, fontWeight: 600 };
const UNIT = "mm"; // this story's unit. The next beat's is not mm — it rewrites this file.

/** Round a maximum up to a round number, so the top tick is a number a reader recognises. */
function niceTop(max: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(max));
  return Math.ceil(max / magnitude) * magnitude;
}

/** Sparse by construction: the floor, the middle, the top. Nothing between them is read. */
export function yTickValues(data: Reading[]): number[] {
  const top = niceTop(Math.max(...data.map((d) => d.value ?? 0)));
  return [0, top / 2, top];
}

/**
 * Data to coordinates. Knows no colour, no font and no label — that boundary is what makes it
 * testable and what makes it worth keeping when the rest of this file is thrown away.
 */
export function lineGeometry(
  data: Reading[],
  {
    width,
    height,
    padding,
  }: { width: number; height: number; padding: Padding },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const years = data.map((d) => d.year);
  const [first, last] = [Math.min(...years), Math.max(...years)];
  const ticks = yTickValues(data);
  const top = ticks[ticks.length - 1];

  const x = (year: number) =>
    plot.left + ((year - first) / (last - first)) * (plot.right - plot.left);
  const y = (value: number) =>
    plot.bottom - (value / top) * (plot.bottom - plot.top);

  const points = data.map((d) => ({
    year: d.year,
    value: d.value,
    x: x(d.year),
    y: d.value === null ? null : y(d.value),
  }));
  // A missing year ends the run. The line is not drawn across a hole in the data.
  const segments: (typeof points)[] = [];
  let run: typeof points = [];
  for (const point of points) {
    if (point.value === null) {
      if (run.length > 0) segments.push(run);
      run = [];
    } else run.push(point);
  }
  if (run.length > 0) segments.push(run);

  return {
    plot,
    points,
    segments,
    gaps: points.filter((p) => p.value === null).map((p) => p.year),
    ticksY: ticks.map((value) => ({ value, y: y(value) })),
    ticksX: [first, years[Math.floor(years.length / 2)], last].map((year) => ({
      year,
      x: x(year),
    })),
  };
}

/** A gap note is drawn where the missing reading would have been: between its two neighbours. */
function gapLabelY(points: { y: number | null }[], index: number): number {
  const before = points.slice(0, index).findLast((p) => p.y !== null)?.y;
  const after = points.slice(index + 1).find((p) => p.y !== null)?.y;
  const known = [before, after].filter((y): y is number => y !== undefined);
  return known.reduce((a, b) => a + b, 0) / known.length + 5;
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

export function ChartSeed({
  data,
  title,
  source,
  alt,
  ground,
  accent,
  subject,
}: {
  data: Reading[];
  title: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  subject: string;
}) {
  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height } = FRAME;

  // The header is laid out first, because the plot starts where the header stops.
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const sourceBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 26;

  // Both gutters are measured from the widest string that will actually be drawn in them.
  const present = data.filter(
    (d): d is { year: number; value: number } => d.value !== null,
  );
  if (present.length < 2)
    throw new Error(
      "a line beat needs at least two readings, got " + present.length,
    );
  const last = present[present.length - 1];
  const endLabel = `${subject} ${last.value} ${UNIT}`;
  const tickLabels = yTickValues(data).map((v, i, all) =>
    i === all.length - 1 ? `${v} ${UNIT}` : `${v}`,
  );
  const padding = {
    top: sourceBaseline + 34,
    right: PAD + 12 + measureText(endLabel, LABEL),
    bottom: PAD + 24,
    left:
      PAD +
      10 +
      Math.max(...tickLabels.map((label) => measureText(label, AXIS))),
  };

  const { plot, segments, points, ticksY, ticksX } = lineGeometry(data, {
    width,
    height,
    padding,
  });
  const path = (run: { x: number; y: number | null }[]) =>
    run
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${(p.y as number).toFixed(1)}`,
      )
      .join(" ");
  const end = segments[segments.length - 1].at(-1)!;

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
      <text x={PAD} y={sourceBaseline} fill={muted} fontSize={SOURCE.fontSize}>
        {source}
      </text>

      {ticksY.map((tick, i) => (
        <g key={tick.value}>
          <line
            x1={plot.left}
            x2={plot.right}
            y1={tick.y}
            y2={tick.y}
            stroke={tick.value === 0 ? muted : grid}
            strokeWidth={1}
          />
          <text
            x={plot.left - 10}
            y={tick.y + 4}
            fill={muted}
            fontSize={AXIS.fontSize}
            textAnchor="end"
          >
            {tickLabels[i]}
          </text>
        </g>
      ))}
      {ticksX.map((tick) => (
        <text
          key={tick.year}
          x={tick.x}
          y={plot.bottom + 24}
          fill={muted}
          fontSize={AXIS.fontSize}
          textAnchor="middle"
        >
          {tick.year}
        </text>
      ))}

      {points.map((point, i) =>
        point.value !== null ? null : (
          // The break in the line is the fact; this only names it. It sits IN the hole, at the
          // height of its neighbours — a full-height rule would shout louder than the subject,
          // and a dashed bridge across the hole would read as data nobody measured.
          <text
            key={point.year}
            x={point.x}
            y={gapLabelY(points, i)}
            fill={muted}
            fontSize={12}
            textAnchor="middle"
          >
            {`no data ${point.year}`}
          </text>
        ),
      )}

      {segments.map((run) => (
        <path
          key={run[0].year}
          d={path(run)}
          fill="none"
          stroke={accent}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      <circle cx={end.x} cy={end.y as number} r={4} fill={accent} />
      <text
        x={plot.right + 10}
        y={(end.y as number) + 5}
        fill={accent}
        fontSize={LABEL.fontSize}
        fontWeight={LABEL.fontWeight}
      >
        {endLabel}
      </text>
    </svg>
  );
}
