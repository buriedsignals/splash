/**
 * Beat 1 — the pedelec catches the bicycle.
 *
 * Two series of one measure over twelve ordered years, one accented and one muted, drawn from
 * BRIEF.md. Written in the seed's shape (`skills/chart-beat/assets/ChartSeed.tsx`) and not
 * imported from it: pure geometry -> furniture derived from the ground -> direct end labels ->
 * one accent.
 */

import { extent, tickStep } from "d3-array";
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { deriveFurniture, measureText, decollide, FONT_FAMILY } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor, stageFor } from "#shared/chart-beat/sizes.mjs";

/** The chart type this beat is, in the vocabulary `references/types/` uses. Read by render.mjs
 *  through `assertTypeMayEnter`, so the size gate reads the type rather than being told it. */
export const TYPE = "line";

type Series = { name: string; values: number[]; accented: boolean };
type Padding = { top: number; right: number; bottom: number; left: number };

/** The 900x560 tokens the size scale multiplies. Every spacing number goes through `sp`, not only
 *  the font sizes — the collision the seed's own header records was a bare literal in the layout
 *  arithmetic, not a font constant. */
const BASE = {
  TITLE: { fontSize: 26, fontWeight: 700, lead: 34 },
  NOTE: { fontSize: 15, fontWeight: 400, lead: 20 },
  SOURCE: { fontSize: 14, fontWeight: 400, lead: 18 },
  AXIS: { fontSize: 13, fontWeight: 400 },
  LABEL: { fontSize: 15, fontWeight: 600 },
  MARK_NOTE: { fontSize: 13, fontWeight: 400 },
  X_TICK_DROP: 24,
  X_AXIS_TO_SOURCE_GAP: 8,
  TITLE_TO_NOTE: 26,
  HEADER_TO_PLOT: 30,
  END_LABEL_GUTTER: 12,
  END_LABEL_AIR: 10,
  END_LABEL_MIN_GAP: 4,
  Y_TICK_INSET: 10,
  Y_TICK_BASELINE_NUDGE: 4,
  MARK_BASELINE_NUDGE: 5,
  MARK_NOTE_LIFT: 16,
  MARK_NOTE_AIR: 9,
  DOT_R: 4,
  STROKE: 2.5,
};

export function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  return {
    sp,
    TITLE: { ...BASE.TITLE, fontSize: sp(BASE.TITLE.fontSize), lead: sp(BASE.TITLE.lead) },
    NOTE: { ...BASE.NOTE, fontSize: sp(BASE.NOTE.fontSize), lead: sp(BASE.NOTE.lead) },
    SOURCE: { ...BASE.SOURCE, fontSize: sp(BASE.SOURCE.fontSize), lead: sp(BASE.SOURCE.lead) },
    AXIS: { ...BASE.AXIS, fontSize: sp(BASE.AXIS.fontSize) },
    LABEL: { ...BASE.LABEL, fontSize: sp(BASE.LABEL.fontSize) },
    MARK_NOTE: { ...BASE.MARK_NOTE, fontSize: sp(BASE.MARK_NOTE.fontSize) },
    X_TICK_DROP: sp(BASE.X_TICK_DROP),
    X_AXIS_TO_SOURCE_GAP: sp(BASE.X_AXIS_TO_SOURCE_GAP),
    TITLE_TO_NOTE: sp(BASE.TITLE_TO_NOTE),
    HEADER_TO_PLOT: sp(BASE.HEADER_TO_PLOT),
    END_LABEL_GUTTER: sp(BASE.END_LABEL_GUTTER),
    END_LABEL_AIR: sp(BASE.END_LABEL_AIR),
    END_LABEL_MIN_GAP: sp(BASE.END_LABEL_MIN_GAP),
    Y_TICK_INSET: sp(BASE.Y_TICK_INSET),
    Y_TICK_BASELINE_NUDGE: sp(BASE.Y_TICK_BASELINE_NUDGE),
    MARK_BASELINE_NUDGE: sp(BASE.MARK_BASELINE_NUDGE),
    MARK_NOTE_LIFT: sp(BASE.MARK_NOTE_LIFT),
    MARK_NOTE_AIR: sp(BASE.MARK_NOTE_AIR),
    DOT_R: sp(BASE.DOT_R),
    STROKE: Math.max(1, sp(BASE.STROKE)),
  };
}

const Y_TICK_HINT = 5;
const X_TICK_HINT = 6;

/**
 * THE SHARED VERTICAL SCALE, and it is shared on purpose.
 *
 * `references/types/line.md`: "never give two series their own, independently-scaled y-axis". Both
 * series here are the same measure in the same unit — people killed in one year — so one fitted
 * scale over BOTH of them is the only honest frame, and the convergence the beat is about is a
 * fact about the picture only because of it.
 *
 * The extent is the two series' own, nicened outward. These are counts and the floor lands on zero
 * of its own accord; nothing anchors it there by hand, and nothing pads it.
 */
function yScale(series: Series[]) {
  const values = series.flatMap((s) => s.values);
  if (values.length === 0) throw new Error("a line beat needs a reading to scale against, got none");
  return scaleLinear().domain(extent(values) as [number, number]).nice();
}

export function yTickValues(series: Series[], hint: number = Y_TICK_HINT): number[] {
  return yScale(series).ticks(hint);
}

export function yTickHintFor(size: string): number {
  return sizeFor(size).minTypePx >= 36 ? 3 : Y_TICK_HINT;
}

export function xTickHintFor(size: string): number {
  return sizeFor(size).minTypePx >= 36 ? 3 : X_TICK_HINT;
}

export function xTickValues(years: number[], hint: number = X_TICK_HINT): number[] {
  const first = Math.min(...years);
  const last = Math.max(...years);
  if (first === last) return [first];
  const step = tickStep(first, last, hint);
  const values: number[] = [];
  for (let year = Math.ceil(first / step) * step; year <= last; year += step) values.push(year);
  return values;
}

/** Data to coordinates. No colour, no font, no label. */
export function seriesGeometry(
  years: number[],
  series: Series[],
  {
    width,
    height,
    padding,
    yTickHint = Y_TICK_HINT,
    xTickHint = X_TICK_HINT,
  }: { width: number; height: number; padding: Padding; yTickHint?: number; xTickHint?: number },
) {
  if (years.length < 2) throw new Error(`a line beat needs at least two periods, got ${years.length}`);
  for (const s of series) {
    if (s.values.length !== years.length)
      throw new Error(`series "${s.name}" carries ${s.values.length} readings for ${years.length} years`);
  }
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const x = scaleLinear().domain([years[0], years[years.length - 1]]).range([plot.left, plot.right]);
  const y = yScale(series).range([plot.bottom, plot.top]);
  const [floor, ceiling] = y.domain();
  const trace = line<{ x: number; y: number }>().x((p) => p.x).y((p) => p.y).digits(1);

  const lines = series.map((s) => {
    const points = s.values.map((value, i) => ({ year: years[i], value, x: x(years[i]), y: y(value) }));
    return { ...s, points, path: trace(points) ?? "", end: points[points.length - 1] };
  });

  return {
    plot,
    lines,
    domain: [floor, ceiling] as [number, number],
    ticksY: y.ticks(yTickHint).map((value) => ({ value, y: y(value) })),
    ticksX: xTickValues(years, xTickHint).map((year) => ({ year, x: x(year) })),
  };
}

/** Wrap on the measured width of the real string, never on a character count. */
export function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of breakLongTokens(text.split(/\s+/), maxWidth, font)) {
    const joiner = current.endsWith("-") ? "" : " ";
    const trial = current ? `${current}${joiner}${word}` : word;
    if (current && measureText(trial, font) > maxWidth) {
      lines.push(current);
      current = word;
    } else current = trial;
  }
  return current ? [...lines, current] : lines;
}

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
    pieces.forEach((piece, i) => out.push(i < pieces.length - 1 ? `${piece}-` : piece));
  }
  return out;
}

export function PedelecCatchesTheBicycle({
  years,
  pedelec,
  bicycle,
  title,
  note,
  source,
  alt,
  ground,
  accent,
  size,
}: {
  years: number[];
  pedelec: number[];
  bicycle: number[];
  title: string;
  note: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  size: string;
}) {
  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height, typeScale } = sizeFor(size);
  const stage = stageFor(size);
  const T = tokens(typeScale);
  const INSET = frameInsetFor(size);

  // The subject is drawn LAST so its stroke is never crossed by the comparison field's.
  const series: Series[] = [
    { name: "Bicycle without a motor", values: bicycle, accented: false },
    { name: "Pedelec (pedal-assist e-bike)", values: pedelec, accented: true },
  ];
  const inkFor = (s: Series) => (s.accented ? accent : muted);

  const contentTop = stage.reserved ? stage.top : INSET;
  const sourceBottom = stage.reserved ? stage.bottom : height - INSET;

  const titleLines = wrap(title, width - INSET * 2, T.TITLE);
  const titleBaseline = contentTop + T.TITLE.fontSize;
  const noteBaseline = titleBaseline + (titleLines.length - 1) * T.TITLE.lead + T.TITLE_TO_NOTE;
  const noteLines = wrap(note, width - INSET * 2, T.NOTE);
  const sourceLines = wrap(source, width - INSET * 2, T.SOURCE);
  const sourceBaseline = sourceBottom;

  // Both gutters measured from the widest string that will really be drawn in them.
  const endLabels = series.map((s) => `${s.name} ${s.values[s.values.length - 1]}`);
  const yHint = yTickHintFor(size);
  const tickLabels = yTickValues(series, yHint).map((v, i, all) =>
    i === all.length - 1 ? `${v} deaths` : `${v}`,
  );
  const padding = {
    top: noteBaseline + (noteLines.length - 1) * T.NOTE.lead + T.HEADER_TO_PLOT,
    right: INSET + T.END_LABEL_GUTTER + Math.max(...endLabels.map((l) => measureText(l, T.LABEL))),
    bottom:
      height -
      sourceBaseline +
      T.SOURCE.fontSize +
      (sourceLines.length - 1) * T.SOURCE.lead +
      T.X_TICK_DROP +
      T.X_AXIS_TO_SOURCE_GAP,
    left: INSET + T.Y_TICK_INSET + Math.max(...tickLabels.map((label) => measureText(label, T.AXIS))),
  };

  const { plot, lines, ticksY, ticksX } = seriesGeometry(years, series, {
    width,
    height,
    padding,
    yTickHint: yHint,
    xTickHint: xTickHintFor(size),
  });

  // THE TWO END LABELS ARE 34 DEATHS APART, which is the whole point and is also close enough that
  // they can collide. `decollide` spaces them by one label's own height plus a little air — the
  // smallest gap that keeps two lines of type apart — and reports which ones moved; a moved label
  // is drawn with a leader back to its own mark. A larger gap would push both labels away from the
  // ends they name and make the picture claim a wider gap than the data has.
  const placed = decollide(
    lines.map((l) => l.end.y),
    { minGap: T.END_LABEL_MIN_GAP + T.LABEL.fontSize, top: plot.top, bottom: plot.bottom },
  );

  // The subject's 2015 reading, named where it is, because the title states that number and a
  // reader is owed the point it refers to. THE VALUE, NOT THE YEAR — the x axis already carries the
  // year, and `references/exchange.md` movement 3 states the rule: do not duplicate what is already
  // beside it. That is also what makes the label short enough to clear the accented line as it
  // climbs away to the right: this beat's first render printed "36 in 2015" here, 134px of ink, and
  // the accent stroke entered its box at (438, 822) — accent text on accent stroke, 1.00:1 against
  // a 3:1 floor for large text (`annotation-ink.mjs`). Measured again after the change: the
  // nearest the stroke comes to the box is 21px below it.
  const first = lines[1].points[1];

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

      {titleLines.map((l, i) => (
        <text key={l} x={INSET} y={titleBaseline + i * T.TITLE.lead} fill={ink} fontSize={T.TITLE.fontSize} fontWeight={T.TITLE.fontWeight}>
          {l}
        </text>
      ))}
      {noteLines.map((l, i) => (
        <text key={l} x={INSET} y={noteBaseline + i * T.NOTE.lead} fill={muted} fontSize={T.NOTE.fontSize}>
          {l}
        </text>
      ))}
      {sourceLines.map((l, i) => (
        <text
          key={l}
          x={INSET}
          y={sourceBaseline - (sourceLines.length - 1 - i) * T.SOURCE.lead}
          fill={muted}
          fontSize={T.SOURCE.fontSize}
        >
          {l}
        </text>
      ))}

      {ticksY.map((tick, i) => (
        <g key={tick.value}>
          <line x1={plot.left} x2={plot.right} y1={tick.y} y2={tick.y} stroke={grid} strokeWidth={1} />
          <text
            x={plot.left - T.Y_TICK_INSET}
            y={tick.y + T.Y_TICK_BASELINE_NUDGE}
            fill={muted}
            fontSize={T.AXIS.fontSize}
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
          y={plot.bottom + T.X_TICK_DROP}
          fill={muted}
          fontSize={T.AXIS.fontSize}
          textAnchor="middle"
        >
          {tick.year}
        </text>
      ))}

      {lines.map((l) => (
        <path
          key={l.name}
          d={l.path}
          fill="none"
          stroke={inkFor(l)}
          strokeWidth={T.STROKE}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}

      <circle cx={first.x} cy={first.y} r={T.DOT_R} fill={accent} />
      <text
        x={first.x + T.MARK_NOTE_AIR}
        y={first.y - T.MARK_NOTE_LIFT}
        fill={accent}
        fontSize={T.MARK_NOTE.fontSize}
      >
        {first.value}
      </text>

      {lines.map((l, i) => (
        <g key={`${l.name}-end`}>
          <circle cx={l.end.x} cy={l.end.y} r={T.DOT_R} fill={inkFor(l)} />
          {placed[i].moved ? (
            <line
              x1={l.end.x + T.DOT_R}
              x2={plot.right + T.END_LABEL_AIR - T.DOT_R}
              y1={l.end.y}
              y2={placed[i].y}
              stroke={inkFor(l)}
              strokeWidth={Math.max(1, T.sp(1))}
            />
          ) : null}
          <text
            x={plot.right + T.END_LABEL_AIR}
            y={placed[i].y + T.MARK_BASELINE_NUDGE}
            fill={inkFor(l)}
            fontSize={T.LABEL.fontSize}
            fontWeight={T.LABEL.fontWeight}
          >
            {endLabels[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}
