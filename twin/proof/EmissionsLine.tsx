/**
 * Beat 1 of "CO₂ suisse, retour au niveau de 1967". Written for this story, from BRIEF.md.
 *
 * Not the seed with different data: the seed proves a decline by slope alone. This beat proves a
 * CROSSING — a long series read back against one historical level — so it carries a reference line
 * that holds the sentence, a muted peak marker that is deliberately silent about its own value, and
 * French number furniture. It has no gap handling, because this series has none.
 */

import { line } from "d3-shape";
import {
  crossingGeometry,
  fr,
  yTickValues,
  type Reading,
} from "./crossing-geometry";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "/Users/rmdms/Sites/Professional/splash-twin/twin/skills/twin-chart-beat/scripts/render-still.mjs";

const FRAME = { width: 900, height: 560 };
const PAD = 40;
const TITLE = { fontSize: 26, fontWeight: 700, lead: 34 };
const SOURCE = { fontSize: 14, fontWeight: 400 };
const AXIS = { fontSize: 13, fontWeight: 400 };
const LABEL = { fontSize: 15, fontWeight: 600 };
const NOTE = { fontSize: 13, fontWeight: 400 };
const UNIT = "Mt";

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
  // No `defined()` here: this series has no holes, and inventing gap handling it does not need
  // would be the seed's shape copied rather than this beat's own.
  const path = line<(typeof g.points)[number]>()
    .x((p) => p.x)
    .y((p) => p.y)
    .digits(1)(g.points)!;

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
