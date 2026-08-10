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
} from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor, stageFor } from "#shared/chart-beat/sizes.mjs";
import { assertPlotAspect } from "#shared/chart-beat/type-at-size.mjs";

/** The type this beat draws, in `references/types/` vocabulary. `formForSize` answers for it, and
 *  a size it refuses is refused by the runner before a mark is drawn. */
export const TYPE = "line";

const UNIT = "Mt";

/**
 * THE 900-WIDE TUNING, KEPT AS THE BASE, WITH THE SIZE ROW'S `typeScale` AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more. This beat is the one where its absence matters most: it is
 * the FIRST beat in the project, everything else was written against it, and until 2026-08-10 it
 * was the only artifact in `proof/` that nothing could regenerate — a committed 1800x1120 still
 * with no producing script at all, which is precisely what `claims-grounded-in-data`'s ancestry
 * check exists to forbid. `render.mjs` beside this file is the runner; the size it draws at is read
 * out of `BRIEF.md`'s front matter, and the delivered PNG's own IHDR is checked against it.
 *
 * EVERY SPACING NUMBER GOES THROUGH `sp`, not only the fonts. Fifteen bare literals lived in the
 * layout arithmetic below, and scaling the type while leaving them is measured to collide the
 * header (`proof/static-carbon-footprint-spread/probe/VERDICT.md`). `PAD` is the one that does NOT
 * go through it: a frame's margin is proportional to the CANVAS, not to the type — `frameInsetFor`
 * in `sizes.mjs` states the split and argues it.
 */
const BASE = {
  TITLE: { fontSize: 26, fontWeight: 700, lead: 34 },
  SUBTITLE: { fontSize: 14, fontWeight: 400, lead: 20 },
  SOURCE: { fontSize: 14, fontWeight: 400 },
  AXIS: { fontSize: 13, fontWeight: 400 },
  LABEL: { fontSize: 15, fontWeight: 600 },
  NOTE: { fontSize: 13, fontWeight: 400 },
  TITLE_TO_SUBTITLE: 30,
  HEADER_TO_PLOT: 34,
  X_LABEL_BAND: 24,
  SOURCE_AIR: 10,
  END_LABEL_GUTTER: 12,
  END_LABEL_GAP: 10,
  END_LABEL_NUDGE: 5,
  Y_TICK_GUTTER: 10,
  Y_TICK_INSET: 10,
  TICK_BASELINE_NUDGE: 4,
  X_TICK_DROP: 24,
  REFERENCE_LABEL_LIFT: 8,
  REFERENCE_LABEL_INSET: 4,
  PEAK_LABEL_LIFT: 10,
  /** The mark weights. A mark's size is a frame quantity like any other — left at their 900px
   *  value on a 1920px frame the two dots would have read as specks. */
  LINE_WIDTH: 2.5,
  PEAK_DOT_R: 3,
  END_DOT_R: 4,
  /** A regular gridline within one label's own line height of the hand-placed reference is dropped
   *  — line and label both — so the reference's dashed rule and its caption never share a vertical
   *  band with a routine tick that was never the line the reader needed there. */
  MIN_GRIDLINE_GAP_PX: 20,
} as const;

/** How many y gridlines this static beat asks for — conventional density, not the sparse
 *  floor/reference/ceiling the motion genre keeps (`static-discipline.md`, "Axis density"). A
 *  COUNT, so it deliberately does not scale: multiplied by 2.2 it would ask for eleven. */
const Y_TICK_HINT = 5;
/** How many x ticks `tickStep` derives a round interval from. On this beat's 1950-2024 span that
 *  answers a decade; the number is never hand-picked per story, and it does not scale either. */
const X_TICK_HINT = 6;

function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  const f = (tok: { fontSize: number; fontWeight: number; lead?: number }) => ({
    ...tok,
    fontSize: sp(tok.fontSize),
    ...(tok.lead === undefined ? {} : { lead: sp(tok.lead) }),
  });
  return {
    TITLE: f(BASE.TITLE) as typeof BASE.TITLE,
    SUBTITLE: f(BASE.SUBTITLE) as typeof BASE.SUBTITLE,
    SOURCE: f(BASE.SOURCE) as typeof BASE.SOURCE,
    AXIS: f(BASE.AXIS) as typeof BASE.AXIS,
    LABEL: f(BASE.LABEL) as typeof BASE.LABEL,
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    TITLE_TO_SUBTITLE: sp(BASE.TITLE_TO_SUBTITLE),
    HEADER_TO_PLOT: sp(BASE.HEADER_TO_PLOT),
    X_LABEL_BAND: sp(BASE.X_LABEL_BAND),
    SOURCE_AIR: sp(BASE.SOURCE_AIR),
    END_LABEL_GUTTER: sp(BASE.END_LABEL_GUTTER),
    END_LABEL_GAP: sp(BASE.END_LABEL_GAP),
    END_LABEL_NUDGE: sp(BASE.END_LABEL_NUDGE),
    Y_TICK_GUTTER: sp(BASE.Y_TICK_GUTTER),
    Y_TICK_INSET: sp(BASE.Y_TICK_INSET),
    TICK_BASELINE_NUDGE: sp(BASE.TICK_BASELINE_NUDGE),
    X_TICK_DROP: sp(BASE.X_TICK_DROP),
    REFERENCE_LABEL_LIFT: sp(BASE.REFERENCE_LABEL_LIFT),
    REFERENCE_LABEL_INSET: sp(BASE.REFERENCE_LABEL_INSET),
    PEAK_LABEL_LIFT: sp(BASE.PEAK_LABEL_LIFT),
    LINE_WIDTH: Math.max(1, sp(BASE.LINE_WIDTH)),
    PEAK_DOT_R: Math.max(1, sp(BASE.PEAK_DOT_R)),
    END_DOT_R: Math.max(1, sp(BASE.END_DOT_R)),
    MIN_GRIDLINE_GAP_PX: sp(BASE.MIN_GRIDLINE_GAP_PX),
  };
}

/**
 * A WORD WIDER THAN ITS OWN MEASURE — hyphen-broken, never broken mid-syllable.
 *
 * Carried verbatim across the wrap family (`splash/test/helper-parity.test.ts` compares them
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
  size,
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
  /** The size gate 2c pinned, read from this beat's own `BRIEF.md`. Not a default. */
  size: string;
}) {
  if (data.length < 2)
    throw new Error(
      "a crossing beat needs at least two readings, got " + data.length,
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height, typeScale } = sizeFor(size);
  // The band this beat may draw in. At portrait the platform reserves 14% at the top and 35% at the
  // foot; content there is at RISK OF BEING COVERED, which no clipping counter can see.
  const stage = stageFor(size);
  const PAD = frameInsetFor(size);
  const T = tokens(typeScale);
  const contentTop = stage.reserved ? stage.top : PAD;
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;

  const titleLines = wrap(title, width - PAD * 2, T.TITLE);
  const titleBaseline = contentTop + T.TITLE.fontSize;
  // The limits subtitle sits directly under the title. Title and subtitle are anchored at the top
  // of the frame; the source is not part of that stack any more — it sits on the frame's own
  // bottom margin (`information-architecture.md` item 5, `static-discipline.md`).
  const limitsLines = wrap(limits, width - PAD * 2, T.SUBTITLE);
  const limitsBaseline =
    titleBaseline +
    (titleLines.length - 1) * T.TITLE.lead +
    T.TITLE_TO_SUBTITLE;
  // THE SOURCE SITS ON THE BOTTOM OF THE BAND — the LAST line lands there, the same edge the title
  // hangs off at the top, on the same x. See chart-beat/references/static-discipline.md, "The
  // source on the frame's bottom margin". At portrait that bottom is the STAGE's, not the frame's.
  //
  // IT WRAPS, and it did not before. A single unwrapped `<text>` fits a 1920px frame and runs
  // straight off a 1080px one: the square arm of this beat printed "Source : Global Carbon Budget
  // 2025, via Our World in" and lost the rest of the credit at the frame edge. A clipped credit is
  // an attribution failure, not a cosmetic one.
  const sourceLines = wrap(source, width - PAD * 2, T.SOURCE);
  const sourceBaseline =
    sourceBottom - (sourceLines.length - 1) * T.SUBTITLE.lead;

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
  const plotTop =
    limitsBaseline +
    (limitsLines.length - 1) * T.SUBTITLE.lead +
    T.HEADER_TO_PLOT;
  // Room for the x-axis tick labels, AND for the credit that owns the bottom of the band.
  const plotBottom =
    sourceBaseline -
    (sourceLines.length - 1) * T.SUBTITLE.lead -
    (T.X_LABEL_BAND + T.SOURCE.fontSize + T.SOURCE_AIR);
  const gridScale = scaleLinear()
    .domain([floor, ceiling])
    .range([plotBottom, plotTop]);
  const referenceYProvisional = gridScale(reference);
  const regularTicks = gridScale
    .ticks(Y_TICK_HINT)
    .filter(
      (v) =>
        Math.abs(gridScale(v) - referenceYProvisional) >= T.MIN_GRIDLINE_GAP_PX,
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
    right: PAD + T.END_LABEL_GUTTER + measureText(endLabel, T.LABEL),
    bottom: height - plotBottom,
    left:
      PAD +
      T.Y_TICK_GUTTER +
      Math.max(...tickLabels.map((l) => measureText(l, T.AXIS))),
  };

  const g = crossingGeometry(data, { width, height, padding, reference });
  // THE PLOT'S OWN SHAPE, refused before anything is drawn. A line's argument is its SLOPE, and an
  // aspect change is the one thing that destroys it (Cleveland's banking-to-45°, formalised by Heer
  // & Agrawala 2006); the range is measured, arm by arm, in `proof/aspect-range-probe/`. At
  // landscape the verdict is `as-is` and this is a documented no-op — it is here so that `--size`
  // cannot quietly produce a square this beat has never been looked at in.
  assertPlotAspect(g.plot, TYPE, size, { what: "co2-suisse" });
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
  const referenceBaseline = g.referenceY - T.REFERENCE_LABEL_LIFT;

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
          y={titleBaseline + i * T.TITLE.lead}
          fill={ink}
          fontSize={T.TITLE.fontSize}
          fontWeight={T.TITLE.fontWeight}
        >
          {line}
        </text>
      ))}
      {limitsLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={limitsBaseline + i * T.SUBTITLE.lead}
          fill={muted}
          fontSize={T.SUBTITLE.fontSize}
        >
          {line}
        </text>
      ))}
      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={sourceBaseline + i * T.SUBTITLE.lead}
          fill={muted}
          fontSize={T.SOURCE.fontSize}
        >
          {line}
        </text>
      ))}

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
            x={g.plot.left - T.Y_TICK_INSET}
            y={gridScale(value) + T.TICK_BASELINE_NUDGE}
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
          y={g.plot.bottom + T.X_TICK_DROP}
          fill={muted}
          fontSize={T.AXIS.fontSize}
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
        x={g.plot.left + T.REFERENCE_LABEL_INSET}
        y={referenceBaseline}
        fill={muted}
        fontSize={T.NOTE.fontSize}
      >
        {referenceLabel}
      </text>

      <path
        d={path}
        fill="none"
        stroke={accent}
        strokeWidth={T.LINE_WIDTH}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* The peak is context, not the subject: muted, marked, and silent about its own value. */}
      <circle cx={g.peak.x} cy={g.peak.y} r={T.PEAK_DOT_R} fill={muted} />
      <text
        x={g.peak.x}
        y={g.peak.y - T.PEAK_LABEL_LIFT}
        fill={muted}
        fontSize={T.NOTE.fontSize}
        textAnchor="middle"
      >
        {peakLabel}
      </text>

      <circle cx={g.end.x} cy={g.end.y} r={T.END_DOT_R} fill={accent} />
      <text
        x={g.plot.right + T.END_LABEL_GAP}
        y={g.end.y + T.END_LABEL_NUDGE}
        fill={accent}
        fontSize={T.LABEL.fontSize}
        fontWeight={T.LABEL.fontWeight}
      >
        {endLabel}
      </text>
    </svg>
  );
}
