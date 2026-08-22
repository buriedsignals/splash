/**
 * Beat 1 — Africa carries the fall. One stacked area, six continents, 2012-2025.
 *
 * Written from `chart-beat/assets/ChartSeed.tsx`'s shape, not imported from it, and under
 * `chart-beat/references/types/area.md`: the stacking ORDER is decided up front (the subject takes
 * the flat baseline), the value axis includes zero because a band's THICKNESS is what a reader
 * measures, every band carries a seam along its top edge so adjacent fills do not fuse, and every
 * band is named at its own right edge in the PAGE's ink — never in its own fill.
 */

import { tickStep } from "d3-array";
import { scaleLinear } from "d3-scale";
import { area, line, stack } from "d3-shape";
import {
  contrast,
  deriveFurniture,
  decollide,
  measureText,
  measureTextBand,
  readApart,
  NON_TEXT_CONTRAST_MIN,
  FONT_FAMILY,
} from "#shared/chart-beat/render-still.mjs";
import { assertAnnotationReadsOverMarks, textContrastFloor } from "#shared/chart-beat/annotation-ink.mjs";
import { frameInsetFor, sizeFor, stageFor } from "#shared/chart-beat/sizes.mjs";

export const TYPE = "area";

type Band = { name: string; values: number[] };
type Padding = { top: number; right: number; bottom: number; left: number };

const BASE = {
  TITLE: { fontSize: 26, fontWeight: 700, lead: 34 },
  NOTE: { fontSize: 15, fontWeight: 400, lead: 21 },
  SOURCE: { fontSize: 14, fontWeight: 400, lead: 18 },
  AXIS: { fontSize: 13, fontWeight: 400 },
  LABEL: { fontSize: 15, fontWeight: 600 },
  CALLOUT: { fontSize: 17, fontWeight: 700, lead: 24 },
  CALLOUT_SUB: { fontSize: 14, fontWeight: 400 },
  X_TICK_DROP: 24,
  X_AXIS_TO_SOURCE_GAP: 8,
  HEADER_TO_PLOT: 30,
  TITLE_TO_NOTE: 12,
  LABEL_GUTTER: 12,
  LABEL_AIR: 10,
  Y_TICK_INSET: 10,
  Y_TICK_BASELINE_NUDGE: 4,
  MARK_BASELINE_NUDGE: 5,
  SEAM: 1.5,
  PEAK_DOT: 5,
};

export function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  const scaled = (f: { fontSize: number; fontWeight: number; lead?: number }) => ({
    ...f,
    fontSize: sp(f.fontSize),
    ...(f.lead === undefined ? {} : { lead: sp(f.lead) }),
  });
  return {
    sp,
    TITLE: scaled(BASE.TITLE) as { fontSize: number; fontWeight: number; lead: number },
    NOTE: scaled(BASE.NOTE) as { fontSize: number; fontWeight: number; lead: number },
    SOURCE: scaled(BASE.SOURCE) as { fontSize: number; fontWeight: number; lead: number },
    AXIS: scaled(BASE.AXIS) as { fontSize: number; fontWeight: number },
    LABEL: scaled(BASE.LABEL) as { fontSize: number; fontWeight: number },
    CALLOUT: scaled(BASE.CALLOUT) as { fontSize: number; fontWeight: number; lead: number },
    CALLOUT_SUB: scaled(BASE.CALLOUT_SUB) as { fontSize: number; fontWeight: number },
    X_TICK_DROP: sp(BASE.X_TICK_DROP),
    X_AXIS_TO_SOURCE_GAP: sp(BASE.X_AXIS_TO_SOURCE_GAP),
    HEADER_TO_PLOT: sp(BASE.HEADER_TO_PLOT),
    TITLE_TO_NOTE: sp(BASE.TITLE_TO_NOTE),
    LABEL_GUTTER: sp(BASE.LABEL_GUTTER),
    LABEL_AIR: sp(BASE.LABEL_AIR),
    Y_TICK_INSET: sp(BASE.Y_TICK_INSET),
    Y_TICK_BASELINE_NUDGE: sp(BASE.Y_TICK_BASELINE_NUDGE),
    MARK_BASELINE_NUDGE: sp(BASE.MARK_BASELINE_NUDGE),
    SEAM: Math.max(1, sp(BASE.SEAM)),
    PEAK_DOT: sp(BASE.PEAK_DOT),
  };
}

const Y_TICK_HINT = 5;
const X_TICK_HINT = 6;

/** English grouping, because `STORYBOARD.md` records `language: en`. A number format is part of
 *  the beat, not an incidental string (`static-discipline.md`, "Language"). */
export function formatCount(value: number): string {
  return value.toLocaleString("en-GB");
}

const channels = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (c: number[]) =>
  "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
const mix = (a: string, b: string, t: number) =>
  toHex(channels(a).map((v, i) => v + (channels(b)[i] - v) * t));

/**
 * THE COMPARISON FIELD, DERIVED FROM THE GROUND — never a list of hexes and never `muted` repeated.
 *
 * Doctrine spends the one accent on the subject and draws everything that exists to be compared
 * against it as a step toward the ink (`doctrine/references/visual-system.md`). Five such steps are
 * needed here, and they have to earn their places the way `seriesInks` makes its derived inks earn
 * theirs: each clears the 3:1 non-text floor against the real ground, and each reads apart from the
 * band it touches and from the accent. It walks in fiftieths from the ground rather than taking a
 * hand-picked fraction, so a newsroom that records a light ground gets a ramp that runs the other
 * way with no edit here.
 */
export function comparisonRamp(ground: string, ink: string, accent: string, count: number): string[] {
  const STEPS = 200;
  const ramp: string[] = [];
  let previous = accent;
  for (let step = 1; step <= STEPS && ramp.length < count; step++) {
    const candidate = mix(ground, ink, step / STEPS);
    if (contrast(candidate, ground) < NON_TEXT_CONTRAST_MIN) continue;
    if (!readApart(candidate, previous)) continue;
    ramp.push(candidate);
    previous = candidate;
  }
  if (ramp.length < count)
    throw new Error(
      `this beat draws ${count} comparison bands and the walk from ${ground} toward ${ink} ran out at ` +
        `${ramp.length}: the further steps either fell under the ${NON_TEXT_CONTRAST_MIN}:1 mark floor or read as ` +
        `the band already below them. Fewer bands, or a ground with more room between it and its ink pole.`,
    );
  return ramp;
}

/**
 * Data to coordinates. No colour, no font, no label — the boundary that makes this testable.
 * `stack` cumulatively sums every band below the current one, so the ORDER of `bands` is what
 * decides which band gets the flat, readable baseline. Zero is in the domain because a band's
 * thickness is a length encoding.
 */
export function stackGeometry(
  years: number[],
  bands: Band[],
  { width, height, padding, yTickHint = Y_TICK_HINT, xTickHint = X_TICK_HINT }:
    { width: number; height: number; padding: Padding; yTickHint?: number; xTickHint?: number },
) {
  if (bands.length === 0) throw new Error("a stacked area needs at least one band, got none");
  if (years.length < 2) throw new Error(`a stacked area needs at least two periods, got ${years.length}`);
  for (const band of bands) {
    if (band.values.length !== years.length)
      throw new Error(`band ${JSON.stringify(band.name)} carries ${band.values.length} values for ${years.length} years`);
    if (band.values.some((v) => !Number.isFinite(v) || v < 0))
      throw new Error(`band ${JSON.stringify(band.name)} carries a value a stacked area cannot draw`);
  }

  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const rows = years.map((year, i) =>
    Object.fromEntries([["year", year], ...bands.map((b) => [b.name, b.values[i]])]),
  ) as Record<string, number>[];
  const totals = rows.map((row) => bands.reduce((sum, b) => sum + row[b.name], 0));

  const x = scaleLinear().domain([years[0], years[years.length - 1]]).range([plot.left, plot.right]);
  const y = scaleLinear().domain([0, Math.max(...totals)]).nice().range([plot.bottom, plot.top]);

  const series = stack<Record<string, number>>().keys(bands.map((b) => b.name))(rows);
  const toArea = area<[number, number] & { data: Record<string, number> }>()
    .x((_, i) => x(years[i]))
    .y0((d) => y(d[0]))
    .y1((d) => y(d[1]))
    .digits(1);
  const toTopEdge = line<[number, number]>()
    .x((_, i) => x(years[i]))
    .y((d) => y(d[1]))
    .digits(1);

  const peakIndex = totals.indexOf(Math.max(...totals));
  const step = tickStep(years[0], years[years.length - 1], xTickHint);
  const ticksX: { year: number; x: number }[] = [];
  for (let year = Math.ceil(years[0] / step) * step; year <= years[years.length - 1]; year += step)
    ticksX.push({ year, x: x(year) });

  return {
    plot,
    totals,
    bands: series.map((band, i) => ({
      name: bands[i].name,
      fill: toArea(band as never) ?? "",
      seam: toTopEdge(band as never) ?? "",
      // Where the band's own label points: the middle of its thickness at the last period.
      labelAnchor: (y(band[band.length - 1][0]) + y(band[band.length - 1][1])) / 2,
      last: bands[i].values[bands[i].values.length - 1],
    })),
    peak: { index: peakIndex, year: years[peakIndex], value: totals[peakIndex], x: x(years[peakIndex]), y: y(totals[peakIndex]) },
    end: { year: years[years.length - 1], value: totals[totals.length - 1], y: y(totals[totals.length - 1]) },
    ticksY: y.ticks(yTickHint).map((value) => ({ value, y: y(value) })),
    ticksX,
    xAt: (year: number) => x(year),
  };
}

/** Wrap on the measured width of the real string, never on a character count. */
export function wrap(text: string, maxWidth: number, font: { fontSize: number; fontWeight: number }): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const trial = current ? `${current} ${word}` : word;
    if (current && measureText(trial, font) > maxWidth) {
      lines.push(current);
      current = word;
    } else current = trial;
  }
  return current ? [...lines, current] : lines;
}

export function WildfiresByContinent({
  years,
  bands,
  title,
  note,
  source,
  alt,
  ground,
  accent,
  subject,
  size,
}: {
  years: number[];
  bands: Band[];
  title: string;
  note: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  subject: string;
  size: string;
}) {
  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height, typeScale } = sizeFor(size);
  const stage = stageFor(size);
  const T = tokens(typeScale);
  const INSET = frameInsetFor(size);
  const contentTop = stage.reserved ? stage.top : INSET;
  const sourceBottom = stage.reserved ? stage.bottom : height - INSET;

  const subjectAt = bands.findIndex((b) => b.name === subject);
  if (subjectAt === -1)
    throw new Error(`the subject ${JSON.stringify(subject)} is not one of this beat's bands (${bands.map((b) => b.name).join(", ")})`);
  if (subjectAt !== 0)
    throw new Error(
      `the subject ${JSON.stringify(subject)} is band ${subjectAt + 1} from the bottom. A stacked area is ` +
        `reliably readable at its top edge and its BOTTOM band only, so the subject takes the floor ` +
        `(chart-beat/references/types/area.md) — reorder the bands rather than accenting a band on a moving floor.`,
    );
  const ramp = comparisonRamp(ground, ink, accent, bands.length - 1);
  const fills = [accent, ...ramp];

  const titleLines = wrap(title, width - INSET * 2, T.TITLE);
  const titleBaseline = contentTop + T.TITLE.fontSize;
  const noteBaseline = titleBaseline + (titleLines.length - 1) * T.TITLE.lead + T.TITLE_TO_NOTE + T.NOTE.fontSize;
  const noteLines = wrap(note, width - INSET * 2, T.NOTE);
  const sourceLines = wrap(source, width - INSET * 2, T.SOURCE);
  const sourceBaseline = sourceBottom;

  // BOTH GUTTERS MEASURED FROM THE STRINGS ACTUALLY ABOUT TO BE DRAWN, never a constant.
  const lastOf = (band: Band) => band.values[band.values.length - 1];
  const bandLabels = bands.map((band) =>
    band.name === subject
      ? `${band.name} ${formatCount(lastOf(band))}`
      : `${band.name} ${formatCount(lastOf(band))}`,
  );
  const total = bands.reduce((sum, b) => sum + lastOf(b), 0);
  const subjectShare = Math.round((lastOf(bands[subjectAt]) / total) * 100);
  bandLabels[subjectAt] = `${bands[subjectAt].name} ${formatCount(lastOf(bands[subjectAt]))} — ${subjectShare}% of the total`;
  const tickLabelFor = (value: number, last: boolean) =>
    last ? `${formatCount(value)} fires` : formatCount(value);

  // The y ticks have to be known before the left gutter can be measured, and the scale that
  // produces them depends on the padding. The domain does not: it is [0, max total], nicened.
  const totals = years.map((_, i) => bands.reduce((sum, b) => sum + b.values[i], 0));
  const probeTicks = scaleLinear().domain([0, Math.max(...totals)]).nice().ticks(Y_TICK_HINT);
  const tickLabels = probeTicks.map((v, i, all) => tickLabelFor(v, i === all.length - 1));

  const padding = {
    top: noteBaseline + (noteLines.length - 1) * T.NOTE.lead + T.HEADER_TO_PLOT,
    right: INSET + T.LABEL_GUTTER + Math.max(...bandLabels.map((l) => measureText(l, T.LABEL))),
    bottom:
      height - sourceBaseline + T.SOURCE.fontSize + (sourceLines.length - 1) * T.SOURCE.lead +
      T.X_TICK_DROP + T.X_AXIS_TO_SOURCE_GAP,
    left: INSET + T.Y_TICK_INSET + Math.max(...tickLabels.map((l) => measureText(l, T.AXIS))),
  };

  const g = stackGeometry(years, bands, { width, height, padding });

  // ONE GUTTER, ONE DE-COLLISION PASS. Seven rows share it: the stack's own top edge -- which is the
  // world total, and what the takeaway's second clause is about -- and the six bands beneath it.
  // `decollide` is called ONCE, on one ranking, so a row's label and its value cannot describe
  // different data (its own second property).
  const gutterRows = [
    { text: `Total ${formatCount(g.end.value)}`, anchor: g.end.y },
    ...g.bands.map((band, i) => ({ text: bandLabels[i], anchor: band.labelAnchor })),
  ];
  const labelBand = measureTextBand("Ag", T.LABEL);
  const placed = decollide(gutterRows.map((row) => row.anchor), {
    minGap: labelBand.ascent + labelBand.descent + T.sp(6),
    top: g.plot.top + labelBand.ascent,
    bottom: g.plot.bottom,
  });

  // THE PEAK, NAMED WHERE IT IS. Anchored END, to the LEFT of its own dot, because the headroom
  // above the roof at its highest point is 4% of the plot and no label fits in it. The room to the
  // left is real and is MEASURED here rather than assumed: this throws if the roof at any year the
  // label spans would rise into it.
  const peakLabel = formatCount(g.peak.value);
  const peakLabelWidth = measureText(peakLabel, T.LABEL);
  const peakLabelBand = measureTextBand(peakLabel, T.LABEL);
  const peakLabelRight = g.peak.x - T.PEAK_DOT - T.sp(8);
  const peakLabelBaseline = g.peak.y + T.MARK_BASELINE_NUDGE;
  if (peakLabelRight - peakLabelWidth < g.plot.left)
    throw new Error(
      `the peak label ${JSON.stringify(peakLabel)} needs ${Math.round(peakLabelWidth)}px and only ` +
        `${Math.round(peakLabelRight - g.plot.left)}px are clear to the left of the ${g.peak.year} peak`,
    );
  years.forEach((year, i) => {
    const at = g.xAt(year);
    if (at < peakLabelRight - peakLabelWidth - 1 || at > peakLabelRight + 1) return;
    const roof = g.plot.bottom - ((g.plot.bottom - g.plot.top) * totals[i]) / (probeTicks[probeTicks.length - 1] || 1);
    if (roof < peakLabelBaseline + peakLabelBand.descent)
      throw new Error(
        `the peak label would sit on the stack itself at ${year} (roof at y=${Math.round(roof)}, label foot at ` +
          `y=${Math.round(peakLabelBaseline + peakLabelBand.descent)}) -- a label half on a mark and half on the ` +
          `page has no ink that reads on both`,
      );
  });
  // The roof check above is what establishes that the only thing under this label is the page, so
  // the page is the whole background set here. An empty set is refused by this guard, correctly.
  assertAnnotationReadsOverMarks(
    { what: `the ${g.peak.year} peak label`, colour: ink },
    [ground],
    textContrastFloor(T.LABEL),
  );
  // The gutter is outside the plot, so its background is the page too — but the ink is asserted
  // rather than assumed, because a beat that changes its label colour later should fail here.
  assertAnnotationReadsOverMarks(
    { what: "the right-gutter labels", colour: ink },
    [ground],
    textContrastFloor(T.LABEL),
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
        <text key={l} x={INSET} y={sourceBaseline - (sourceLines.length - 1 - i) * T.SOURCE.lead} fill={muted} fontSize={T.SOURCE.fontSize}>
          {l}
        </text>
      ))}

      {g.ticksY.map((tick, i) => (
        <g key={tick.value}>
          <line x1={g.plot.left} x2={g.plot.right} y1={tick.y} y2={tick.y} stroke={grid} strokeWidth={1} />
          <text x={g.plot.left - T.Y_TICK_INSET} y={tick.y + T.Y_TICK_BASELINE_NUDGE} fill={muted} fontSize={T.AXIS.fontSize} textAnchor="end">
            {tickLabelFor(tick.value, i === g.ticksY.length - 1)}
          </text>
        </g>
      ))}
      {g.ticksX.map((tick) => (
        <text key={tick.year} x={tick.x} y={g.plot.bottom + T.X_TICK_DROP} fill={muted} fontSize={T.AXIS.fontSize} textAnchor="middle">
          {tick.year}
        </text>
      ))}

      {/* Bottom band first, so a seam is drawn over the fill below it and never under it. */}
      {g.bands.map((band, i) => (
        <path key={band.name} d={band.fill} fill={fills[i]} />
      ))}
      {g.bands.map((band, i) => (
        // The seam is the ground itself: adjacent fills of one hue family fuse into a single mass
        // without it (`types/area.md`, "the second failure is a rendering one").
        <path key={`seam-${band.name}`} d={band.seam} fill="none" stroke={ground} strokeWidth={T.SEAM} />
      ))}

      <circle cx={g.peak.x} cy={g.peak.y} r={T.PEAK_DOT} fill={ink} />
      <text
        x={peakLabelRight}
        y={peakLabelBaseline}
        fill={ink}
        fontSize={T.LABEL.fontSize}
        fontWeight={T.LABEL.fontWeight}
        textAnchor="end"
      >
        {peakLabel}
      </text>

      {gutterRows.map((row, i) => (
        <g key={`label-${row.text}`}>
          {placed[i].moved ? (
            <line
              x1={g.plot.right}
              x2={g.plot.right + T.LABEL_AIR - T.sp(2)}
              y1={row.anchor}
              y2={placed[i].y - T.MARK_BASELINE_NUDGE}
              stroke={muted}
              strokeWidth={1}
            />
          ) : null}
          <text
            x={g.plot.right + T.LABEL_AIR}
            y={placed[i].y}
            fill={ink}
            fontSize={T.LABEL.fontSize}
            fontWeight={T.LABEL.fontWeight}
          >
            {row.text}
          </text>
        </g>
      ))}
    </svg>
  );
}
