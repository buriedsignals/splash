/**
 * Beat 1 of "CO₂ suisse, retour au niveau de 1967". Written for this story, from BRIEF.md.
 *
 * Not the seed with different data: the seed proves a decline by slope alone. This beat proves a
 * CROSSING — a long series read back against one historical level — so it carries a reference line
 * that holds the sentence, a muted peak marker that is deliberately silent about its own value, and
 * French number furniture. It has no gap handling, because this series has none.
 */

import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "/Users/rmdms/Sites/Professional/splash-twin/twin/skills/twin-chart-beat/scripts/render-still.mjs";

type Reading = { year: number; mt: number };

const FRAME = { width: 900, height: 560 };
const PAD = 40;
const TITLE = { fontSize: 26, fontWeight: 700, lead: 34 };
const SOURCE = { fontSize: 14, fontWeight: 400 };
const AXIS = { fontSize: 13, fontWeight: 400 };
const LABEL = { fontSize: 15, fontWeight: 600 };
const NOTE = { fontSize: 13, fontWeight: 400 };
const UNIT = "Mt";

/** French: comma decimal, thin space for thousands. The furniture speaks the journalist's language. */
export function fr(value: number, decimals = 1): string {
  return value
    .toFixed(decimals)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/, " ");
}

function niceStep(raw: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const f = raw / magnitude;
  return (
    (f <= 1 ? 1 : f <= 1.5 ? 1.5 : f <= 2 ? 2 : f <= 3 ? 3 : f <= 5 ? 5 : 10) *
    magnitude
  );
}

/**
 * Three ticks — floor, THE REFERENCE LEVEL, top.
 *
 * The middle tick is not the arithmetic middle: it is the level the beat is about. Cycle 1 rendered
 * a round [0, 30, 60] scale and the render showed why that is wrong twice over — the floor snapped
 * all the way down to zero (a third of the frame empty under a line whose slope carries the story,
 * exactly the failure `static-discipline.md` describes), and the 30 gridline landed 20 px from the
 * 1967 reference at 32,5, so the one rule the reader must see had a decorative twin beside it.
 *
 * Putting the reference ON the axis removes both: the fitted floor keeps the slope, and the middle
 * gridline IS the reference, so nothing competes with it and the number is stated once, on the axis.
 */
export function yTickValues(data: Reading[], reference: number): number[] {
  const values = data.map((d) => d.mt);
  const min = Math.min(...values, reference);
  const max = Math.max(...values, reference);
  const pad = (max - min) * 0.15 || Math.abs(max) * 0.1 || 1;
  const step = niceStep((max + pad - Math.max(0, min - pad)) / 10);
  // Round the padded floor rather than flooring it: flooring 4,9 to a multiple of 5 gives 0, and a
  // fitted scale that lands on zero anyway is the zero-anchored line the doctrine forbids. Never
  // above the lowest reading, and never below zero for a positive series.
  const low = Math.max(0, Math.min(Math.round((min - pad) / step) * step, Math.floor(min / step) * step));
  const high = Math.ceil((max + pad) / step) * step;
  return [low, reference, high].map((v) => Number(v.toFixed(6)));
}

/** Data to coordinates. No colour, no font, no label. */
export function crossingGeometry(
  data: Reading[],
  {
    width,
    height,
    padding,
    reference,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    reference: number;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const years = data.map((d) => d.year);
  const first = Math.min(...years);
  const last = Math.max(...years);
  const ticks = yTickValues(data, reference);
  const [floor, , ceiling] = ticks;

  const x = (year: number) =>
    plot.left + ((year - first) / (last - first)) * (plot.right - plot.left);
  const y = (mt: number) =>
    plot.bottom - ((mt - floor) / (ceiling - floor)) * (plot.bottom - plot.top);

  const points = data.map((d) => ({ ...d, x: x(d.year), y: y(d.mt) }));
  const peak = points.reduce((a, b) => (b.mt > a.mt ? b : a));
  const end = points[points.length - 1];

  // The crossing itself: the first reading after the peak that sits at or below the reference.
  const crossing =
    points.slice(points.indexOf(peak)).find((p) => p.mt <= reference) ?? null;

  return {
    plot,
    points,
    peak,
    end,
    crossing,
    referenceY: y(reference),
    ticksY: ticks.map((value) => ({ value, y: y(value) })),
    ticksX: [first, years[Math.floor(years.length / 2)], last].map((year) => ({
      year,
      x: x(year),
    })),
  };
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

export function EmissionsLine({
  data,
  title,
  source,
  alt,
  ground,
  accent,
  reference,
  referenceLabel,
  peakLabel,
}: {
  data: Reading[];
  title: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  reference: number;
  referenceLabel: string;
  peakLabel: string;
}) {
  if (data.length < 2)
    throw new Error(
      "a crossing beat needs at least two readings, got " + data.length,
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height } = FRAME;

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const sourceBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 26;

  // Both gutters measured from the widest string that will really be drawn in them.
  const last = data[data.length - 1];
  const endLabel = `${last.year} · ${fr(last.mt)} ${UNIT}`;
  // The middle tick is the reference, so it keeps its decimal: rounding 32,5 to 33 would put a
  // number on the axis that is not the level the beat is about. The unit is stated once, on top.
  const tickLabels = yTickValues(data, reference).map((v, i, all) =>
    i === all.length - 1 ? `${fr(v, 0)} ${UNIT}` : fr(v, i === 1 ? 1 : 0),
  );
  const padding = {
    top: sourceBaseline + 34,
    right: PAD + 12 + measureText(endLabel, LABEL),
    bottom: PAD + 24,
    left: PAD + 10 + Math.max(...tickLabels.map((l) => measureText(l, AXIS))),
  };

  const g = crossingGeometry(data, { width, height, padding, reference });
  const path = g.points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  // The reference label sits on its own line, above it, left-aligned in the plot — the NYT Upshot
  // lesson the journalist picked: the reference states its claim, it is not a bare rule.
  const referenceBaseline = g.referenceY - 8;

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

      {g.ticksY.map((tick, i) => (
        <g key={tick.value}>
          {/* The middle tick IS the reference; its rule is drawn below, dashed. One line, not two. */}
          {i === 1 ? null : (
            <line
              x1={g.plot.left}
              x2={g.plot.right}
              y1={tick.y}
              y2={tick.y}
              stroke={grid}
              strokeWidth={1}
            />
          )}
          <text
            x={g.plot.left - 10}
            y={tick.y + 4}
            fill={muted}
            fontSize={AXIS.fontSize}
            textAnchor="end"
          >
            {tickLabels[i]}
          </text>
        </g>
      ))}
      {g.ticksX.map((tick) => (
        <text
          key={tick.year}
          x={tick.x}
          y={g.plot.bottom + 24}
          fill={muted}
          fontSize={AXIS.fontSize}
          textAnchor="middle"
        >
          {tick.year}
        </text>
      ))}

      {/* The reference: a dashed rule, because it is a level somebody chose, not a measurement. */}
      <line
        x1={g.plot.left}
        x2={g.plot.right}
        y1={g.referenceY}
        y2={g.referenceY}
        stroke={muted}
        strokeWidth={1}
        strokeDasharray="5 4"
      />
      <text
        x={g.plot.left + 4}
        y={referenceBaseline}
        fill={muted}
        fontSize={NOTE.fontSize}
      >
        {referenceLabel}
      </text>

      <path
        d={path}
        fill="none"
        stroke={accent}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* The peak is context, not the subject: muted, marked, and silent about its own value. */}
      <circle cx={g.peak.x} cy={g.peak.y} r={3} fill={muted} />
      <text
        x={g.peak.x}
        y={g.peak.y - 10}
        fill={muted}
        fontSize={NOTE.fontSize}
        textAnchor="middle"
      >
        {peakLabel}
      </text>

      <circle cx={g.end.x} cy={g.end.y} r={4} fill={accent} />
      <text
        x={g.plot.right + 10}
        y={g.end.y + 5}
        fill={accent}
        fontSize={LABEL.fontSize}
        fontWeight={LABEL.fontWeight}
      >
        {endLabel}
      </text>
    </svg>
  );
}
