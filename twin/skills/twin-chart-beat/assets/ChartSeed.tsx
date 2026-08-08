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

import { extent, tickStep } from "d3-array";
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
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
/** How many labelled y gridlines a STATIC frame asks for. d3 treats it as a hint and returns the
 *  round values that actually fall inside the fitted range, so the answer is rarely exactly this
 *  number. This is the static genre's own density — conventional, so a reader who scrutinises can
 *  put a number on any point — not the sparse 2-3 tick axis the motion genre asks for
 *  (`static-discipline.md`, "Axis density"). */
const Y_TICK_HINT = 5;
/** How many x ticks the beat asks `tickStep` for. `tickStep(first, last, hint)` answers with the
 *  nearest 1/2/5×10ⁿ interval to span/hint — the same primitive `.nice()`/`.ticks()` already use
 *  internally — so THIS constant is the only knob, and the resulting interval (a decade on a
 *  75-year series, five years on a 35-year one) is derived per story, never hand-picked
 *  (`static-discipline.md`, "Axis density"). */
const X_TICK_HINT = 6;

/**
 * The fitted vertical scale, and the only place a reading becomes a y coordinate.
 *
 * The scale is fitted to the readings, not anchored at zero. Zero belongs under a mark whose
 * LENGTH carries the value — a bar, a column, an area. A line carries it by slope, so anchoring
 * it at zero when the values sit far above zero flattens the very change the beat is about:
 * rainfall running 604–912 mm on a 0–1000 scale draws a gentle sag under a title that says it
 * fell by a third.
 *
 * `.nice()` rounds the readings' OWN extent outward to the nearest round values and stops there.
 * The arithmetic this replaced padded the extent by 15%, floored it to a step, and then spent a
 * spare step to keep the tick count even — three compounding widenings that on a series running
 * -3.4 to 84.1 produced an axis from -45 to 105, a third of the frame carrying no data at all.
 *
 * Two floors survive that swap, and both come out of d3 rather than being enforced on top of it:
 * a series of positive values never dips below zero (rounding a non-negative floor outward to a
 * multiple of a positive step cannot cross it), and a series that crosses zero always shows the
 * zero line (`zeroY`), because the sign change is the story.
 */
function yScale(data: Reading[]) {
  const values = data
    .map((d) => d.value)
    .filter((v): v is number => v !== null);
  if (values.length === 0)
    throw new Error("a line beat needs a reading to scale against, got none");
  return scaleLinear()
    .domain(extent(values) as [number, number])
    .nice();
}

/**
 * Conventional density for a static frame: d3 picks the round values inside the fitted range, at
 * a hint high enough that a reader who scrutinises the frame can put a number on more than the
 * two or three points a sparser axis would have named. Nothing between the gridlines is invented
 * — every tick is a multiple of a round step that the data's own extent reaches — but there are
 * enough of them to read a value off the axis directly. The unit is stated once, on the top one.
 */
export function yTickValues(data: Reading[]): number[] {
  return yScale(data).ticks(Y_TICK_HINT);
}

/**
 * Regular, round-interval x ticks derived from the series' own span — never a fixed count of
 * arbitrary points, and never `first, middle, last`. `tickStep` answers with the "nice" step
 * closest to span / hint, so a 75-year series gets decade ticks and a 35-year series gets
 * five-year ticks without either number being written down as a knob for this particular story.
 *
 * This density is what makes a point the beat annotates but does not tick — a peak, a crossing —
 * locatable by eye against a regular grid, even though it is not itself one of the round values
 * (`static-discipline.md`, "Axis density"). It is not shared with the motion genre, which keeps
 * its own sparse first/middle/last rule on purpose.
 */
export function xTickValues(years: number[]): number[] {
  const first = Math.min(...years);
  const last = Math.max(...years);
  if (first === last) return [first];
  const step = tickStep(first, last, X_TICK_HINT);
  const values: number[] = [];
  for (let year = Math.ceil(first / step) * step; year <= last; year += step) {
    values.push(year);
  }
  return values;
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
  // The x domain is the years themselves — first to last, never nicened. Rounding it outward
  // would push the series away from the frame edges and invent time nobody measured.
  const x = scaleLinear().domain([first, last]).range([plot.left, plot.right]);
  const y = yScale(data).range([plot.bottom, plot.top]);
  const [floor, ceiling] = y.domain();
  const ticks = y.ticks(Y_TICK_HINT);

  const points = data.map((d) => ({
    year: d.year,
    value: d.value,
    x: x(d.year),
    y: d.value === null ? null : y(d.value),
  }));

  // A missing year ends the run: `defined()` closes the sub-path at the hole and opens a new one
  // after it, so one `d` string carries every run and the line is never drawn across a gap.
  const path =
    line<(typeof points)[number]>()
      .defined((p) => p.y !== null)
      .x((p) => p.x)
      .y((p) => p.y as number)
      .digits(1)(points) ?? "";

  // One note per RUN of missing readings, placed at the midpoint of the readings it separates —
  // not on the missing slot, which on unevenly spaced data is nowhere near the middle of the hole.
  const gaps: { years: number[]; x: number; y: number }[] = [];
  for (let i = 0; i < points.length; i++) {
    if (points[i].value !== null) continue;
    const start = i;
    while (i + 1 < points.length && points[i + 1].value === null) i++;
    const neighbours = [
      points.slice(0, start).findLast((p) => p.value !== null),
      points.slice(i + 1).find((p) => p.value !== null),
    ].filter((p) => p !== undefined);
    const middle = (pick: (p: (typeof points)[number]) => number) =>
      neighbours.reduce((sum, p) => sum + pick(p), 0) / neighbours.length;
    gaps.push({
      years: points.slice(start, i + 1).map((p) => p.year),
      x: neighbours.length > 0 ? middle((p) => p.x) : points[start].x,
      y:
        neighbours.length > 0
          ? middle((p) => p.y as number)
          : (plot.top + plot.bottom) / 2,
    });
  }

  return {
    plot,
    points,
    path,
    gaps,
    domain: [floor, ceiling] as [number, number],
    end: points.findLast((p) => p.value !== null),
    zeroY: floor < 0 && ceiling > 0 ? y(0) : null,
    ticksY: ticks.map((value) => ({ value, y: y(value) })),
    ticksX: xTickValues(years).map((year) => ({
      year,
      x: x(year),
    })),
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

  const { plot, path, gaps, ticksY, ticksX, zeroY, end } = lineGeometry(data, {
    width,
    height,
    padding,
  });

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

      {zeroY === null ? null : (
        <line
          x1={plot.left}
          x2={plot.right}
          y1={zeroY}
          y2={zeroY}
          stroke={muted}
          strokeWidth={1}
        />
      )}

      {gaps.map((gap) => (
        // The break in the line is the fact; this only names it. It sits IN the hole, centred
        // between the readings it separates — a full-height rule would shout louder than the
        // subject, and a dashed bridge across the hole would read as data nobody measured.
        <text
          key={gap.years[0]}
          x={gap.x}
          y={gap.y + 5}
          fill={muted}
          fontSize={12}
          textAnchor="middle"
        >
          {gap.years.length > 1
            ? `no data ${gap.years[0]}–${gap.years[gap.years.length - 1]}`
            : `no data ${gap.years[0]}`}
        </text>
      ))}

      {/* One path, every run: `defined()` already broke it at the holes. */}
      <path
        d={path}
        fill="none"
        stroke={accent}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={end!.x} cy={end!.y as number} r={4} fill={accent} />
      <text
        x={plot.right + 10}
        y={(end!.y as number) + 5}
        fill={accent}
        fontSize={LABEL.fontSize}
        fontWeight={LABEL.fontWeight}
      >
        {endLabel}
      </text>
    </svg>
  );
}
