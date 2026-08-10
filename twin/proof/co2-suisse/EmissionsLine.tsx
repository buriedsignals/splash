/**
 * Beat 1 of "CO₂ suisse, retour au niveau de 1967". Written for this story, from BRIEF.md.
 *
 * Not the seed with different data: the seed proves a decline by slope alone. This beat proves a
 * CROSSING — a long series read back against one historical level — so it carries a reference line
 * that holds the sentence, a muted peak marker that is deliberately silent about its own value, and
 * French number furniture. It has no gap handling, because this series has none.
 *
 * Axis density and the limits subtitle are this file's own — not `crossing-geometry.ts`'s, and not
 * `EmissionsVideo.tsx`'s. `crossingGeometry`/`yTickValues` stay exactly as they were (still
 * imported for the fitted domain and the point/peak/end coordinates the video beat also reads),
 * because the motion genre keeps its own sparse three-tick axis on purpose
 * (`static-discipline.md`, "Axis density") — this file layers a denser, static-only tick set and a
 * collision filter on top locally, rather than changing what the shared geometry hands back.
 */

import { scaleLinear } from "d3-scale";
import { tickStep } from "d3-array";
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
} from "#shared/twin-chart-beat/render-still.mjs";

const FRAME = { width: 900, height: 560 };
const PAD = 40;
const TITLE = { fontSize: 26, fontWeight: 700, lead: 34 };
const SUBTITLE = { fontSize: 14, fontWeight: 400, lead: 20 };
const SOURCE = { fontSize: 14, fontWeight: 400 };
const AXIS = { fontSize: 13, fontWeight: 400 };
const LABEL = { fontSize: 15, fontWeight: 600 };
const NOTE = { fontSize: 13, fontWeight: 400 };
const UNIT = "Mt";

/** How many y gridlines this static beat asks for — conventional density, not the sparse
 *  floor/reference/ceiling the motion genre keeps (`static-discipline.md`, "Axis density"). */
const Y_TICK_HINT = 5;
/** How many x ticks `tickStep` derives a round interval from. On this beat's 1950-2024 span that
 *  answers a decade; the number is never hand-picked per story. */
const X_TICK_HINT = 6;
/** A regular gridline within one label's own line height of the hand-placed reference is dropped
 *  — line and label both — so the reference's dashed rule and its caption never share a vertical
 *  band with a routine tick that was never the line the reader needed there. */
const MIN_GRIDLINE_GAP_PX = 20;

/**
 * A WORD WIDER THAN ITS OWN MEASURE — hyphen-broken, never broken mid-syllable.
 *
 * Carried verbatim across the wrap family (`splash-twin/test/helper-parity.test.ts` compares them
 * case for case). `wrap` breaks between words, so a token wider than the measure was emitted whole
 * and ran off the frame — invisible at 900x560 and a 219px overflow the moment a phone frame put
 * 78px type on a 1080px canvas. A hyphen is already a break and already reads as one, so a
 * hyphenated token is split at its own hyphens and `wrap` re-joins without a space after one.
 *
 * A token with no hyphen and no room is emitted WHOLE and not refused: breaking a word
 * mid-syllable is a decision about somebody's name, and a throw here would be a contract change
 * for the fluid web copies, where a transient 1px measure during layout is ordinary. The overflow
 * is refused where it can be SEEN — `three-sizes-no-collision.test.ts` measures every run's real
 * ink box against the frame edge.
 */
function breakLongTokens(
  words: string[],
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const out: string[] = [];
  for (const word of words) {
    const pieces = word.split("-");
    if (pieces.length === 1 || measureText(word, font) <= maxWidth) {
      out.push(word);
      continue;
    }
    pieces.forEach((piece, i) =>
      out.push(i < pieces.length - 1 ? `${piece}-` : piece),
    );
  }
  return out;
}

export function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of breakLongTokens(text.split(/\s+/), maxWidth, font)) {
    const joiner = line.endsWith("-") ? "" : " ";
    const trial = line ? `${line}${joiner}${word}` : word;
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
  limits,
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
  /** The one caveat this data needs stated before its claim is read — harvested in the framing
   *  exchange's "what does this data NOT let you conclude" question and carried as the subtitle
   *  `information-architecture.md` names for it, not dropped in favour of the source credit. */
  limits: string;
}) {
  if (data.length < 2)
    throw new Error(
      "a crossing beat needs at least two readings, got " + data.length,
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height } = FRAME;

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  // The limits subtitle sits directly under the title. Title and subtitle are anchored at the top
  // of the frame; the source is not part of that stack any more — it sits on the frame's own
  // bottom margin (`information-architecture.md` item 5, `static-discipline.md`).
  const limitsLines = wrap(limits, width - PAD * 2, SUBTITLE);
  const limitsBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 30;
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN — `height - PAD`, the same inset the title
  // hangs off at the top, on the same x. See twin-chart-beat/references/static-discipline.md,
  // "The source on the frame's bottom margin".
  const sourceBaseline = height - PAD;

  // Both gutters measured from the widest string that will really be drawn in them.
  const last = data[data.length - 1];
  const endLabel = `${last.year} · ${fr(last.mt)} ${UNIT}`;

  // The fitted domain, read from the shared geometry's own scale — only its bounds. The tick SET
  // drawn from that domain is this static beat's own choice (see the file header): denser than the
  // motion genre's, and with any regular tick that would crowd the reference dropped before it can
  // compete with the reference's own dashed rule and its own label.
  const [floor, , ceiling] = yTickValues(data, reference);
  // Y-axis-only provisional plot rectangle: top/bottom depend on the header block's height, which
  // is already fixed at this point, and NOT on the left gutter the tick labels below are about to
  // measure — so they can be computed before `crossingGeometry` needs the finished padding.
  // The plot starts below the LAST HEADER line, never below the source.
  const plotTop = limitsBaseline + (limitsLines.length - 1) * SUBTITLE.lead + 34;
  // Room for the x-axis tick labels, AND for the credit that now owns the bottom margin.
  const plotBottom = height - (PAD + 24 + SOURCE.fontSize + 10);
  const gridScale = scaleLinear()
    .domain([floor, ceiling])
    .range([plotBottom, plotTop]);
  const referenceYProvisional = gridScale(reference);
  const regularTicks = gridScale
    .ticks(Y_TICK_HINT)
    .filter(
      (v) =>
        Math.abs(gridScale(v) - referenceYProvisional) >= MIN_GRIDLINE_GAP_PX,
    );
  const yTicks = [...regularTicks, reference].sort((a, b) => a - b);
  const topValue = Math.max(...yTicks);
  // Every tick but the reference keeps zero decimals; the reference keeps one, because rounding
  // 32,5 to 33 would put a number on the axis that is not the level the beat is about. The unit is
  // stated once, on whichever tick actually ends up highest.
  const tickLabels = yTicks.map((v) =>
    v === topValue ? `${fr(v, 0)} ${UNIT}` : fr(v, v === reference ? 1 : 0),
  );
  const padding = {
    top: plotTop,
    right: PAD + 12 + measureText(endLabel, LABEL),
    bottom: PAD + 24 + SOURCE.fontSize + 10,
    left: PAD + 10 + Math.max(...tickLabels.map((l) => measureText(l, AXIS))),
  };

  const g = crossingGeometry(data, { width, height, padding, reference });
  // No `defined()` here: this series has no holes, and inventing gap handling it does not need
  // would be the seed's shape copied rather than this beat's own.
  const path = line<(typeof g.points)[number]>()
    .x((p) => p.x)
    .y((p) => p.y)
    .digits(1)(g.points)!;

  // Regular, round-interval x ticks derived from this series' own span — decade ticks on a 75-year
  // run, never a hand-picked count. Each tick year is an actual reading in this annual series, so
  // its pixel position is read off the geometry's own points rather than re-deriving the x scale.
  const years = data.map((d) => d.year);
  const firstYear = Math.min(...years);
  const lastYear = Math.max(...years);
  const xStep = tickStep(firstYear, lastYear, X_TICK_HINT);
  const xTicks: number[] = [];
  for (
    let year = Math.ceil(firstYear / xStep) * xStep;
    year <= lastYear;
    year += xStep
  ) {
    xTicks.push(year);
  }
  const ticksX = xTicks
    .map((year) => ({
      year,
      point: g.points.find((p) => p.year === year),
    }))
    .filter(
      (tick): tick is { year: number; point: (typeof g.points)[number] } =>
        tick.point !== undefined,
    )
    .map(({ year, point }) => ({ year, x: point.x }));

  // The reference label sits on its own line, above it, left-aligned in the plot — the NYT Upshot
  // lesson the journalist picked: the reference states its claim, it is not a bare rule. With the
  // regular gridlines that would have crowded it already filtered out above, this caption now
  // shares its vertical band with nothing but the dashed rule it names.
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

      {yTicks.map((value, i) => (
        <g key={value}>
          {/* The reference's own dashed rule is drawn below; a regular tick this close to it was
              already dropped above, so nothing here competes with that rule or its caption. */}
          {value === reference ? null : (
            <line
              x1={g.plot.left}
              x2={g.plot.right}
              y1={gridScale(value)}
              y2={gridScale(value)}
              stroke={grid}
              strokeWidth={1}
            />
          )}
          <text
            x={g.plot.left - 10}
            y={gridScale(value) + 4}
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
