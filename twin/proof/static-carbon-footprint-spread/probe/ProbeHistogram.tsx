/**
 * TASK 0 PROBE — a copy of `../CarbonFootprintHistogram.tsx`, parameterised by frame and type
 * scale and CHANGED IN NO OTHER WAY. `probe.mjs` diffs the two files, so the size of that diff IS
 * measurement #4 of the probe: "did anything outside {typeScale, tick hints, collision thresholds}
 * need editing?". Not a beat; nothing ships from here.
 *
 * FROZEN 2026-08-10, and the beat has moved on since. `../CarbonFootprintHistogram.tsx` now derives
 * the median rule's ink from the bars it crosses (`annotation-ink.mjs`) — this copy still strokes it
 * `accent`, at the 1.20:1 that change exists to remove. That is deliberate: a probe records a
 * measurement of a question already answered, and re-rendering it rewrites the record it exists to
 * hold. Nothing reads these four SVGs but `MEASUREMENTS.md` and `VERDICT.md`, and
 * `annotation-reads-over-what-it-crosses.test.ts` skips every `*probe*` directory for the same
 * reason. Whoever next takes the size work here brings this copy forward with it.
 *
 * Beat: "Most countries emit under 4 tonnes of CO2 per person" (histogram).
 *
 * Written fresh from `ChartSeed.tsx`'s shape for a type whose bars are contiguous SLICES OF ONE
 * CONTINUUM, not discrete categories (`references/types/histogram.md`) — the sheet's own warning
 * that removing the gap between bars is what tells the reader "this is one variable's shape," and
 * putting a gap back in would lie about contiguity that isn't there. Bar height is a count, so the
 * zero-baseline rule applies exactly as it does to any bar family member.
 */

import { scaleLinear } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/chart-beat/render-still.mjs";

export type Bin = { lo: number; hi: number; count: number };

// The 900x560 tokens, kept verbatim as the base. `tokens(typeScale)` multiplies every one of them
// and rounds to an integer, so `measureText`'s cache keys stay stable.
const BASE = {
  PAD: 40,
  TITLE: { fontSize: 25, fontWeight: 700, lead: 32 },
  SUBTITLE: { fontSize: 14, fontWeight: 400, lead: 20 },
  SOURCE: { fontSize: 14, fontWeight: 400 },
  AXIS: { fontSize: 13, fontWeight: 400 },
  AXIS_TITLE: { fontSize: 13, fontWeight: 600 },
  NOTE: { fontSize: 13, fontWeight: 700 },
};

export function tokens(typeScale: number) {
  const px = (v: number) => Math.round(v * typeScale);
  return {
    // PROBE FINDING. The eleven bare spacing literals in this component's layout arithmetic (28,
    // 22, 34 between the header blocks; 8/24/6/10 in the padding; 20/4/16/8/10 at the marks) are
    // every bit as much 900x560 tuning as the font sizes are, and leaving them unscaled is what
    // collided the title with the subtitle at 1920x1080 on the probe's first run. `sp()` is the
    // same multiplier applied to them; nothing here is a new layout.
    sp: px,
    PAD: px(BASE.PAD),
    TITLE: {
      ...BASE.TITLE,
      fontSize: px(BASE.TITLE.fontSize),
      lead: px(BASE.TITLE.lead),
    },
    SUBTITLE: {
      ...BASE.SUBTITLE,
      fontSize: px(BASE.SUBTITLE.fontSize),
      lead: px(BASE.SUBTITLE.lead),
    },
    SOURCE: { ...BASE.SOURCE, fontSize: px(BASE.SOURCE.fontSize) },
    AXIS: { ...BASE.AXIS, fontSize: px(BASE.AXIS.fontSize) },
    AXIS_TITLE: { ...BASE.AXIS_TITLE, fontSize: px(BASE.AXIS_TITLE.fontSize) },
    NOTE: { ...BASE.NOTE, fontSize: px(BASE.NOTE.fontSize) },
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

/** Pure geometry: bins to bar rectangles, edge-to-edge on the variable's own real unit (never bin
 *  index), height a zero-anchored count. */
export function histogramGeometry(
  bins: Bin[],
  {
    width,
    height,
    padding,
    yTickHint,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    yTickHint: number;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const x = scaleLinear()
    .domain([bins[0].lo, bins[bins.length - 1].hi])
    .range([plot.left, plot.right]);
  const y = scaleLinear()
    .domain([0, Math.max(...bins.map((b) => b.count))])
    .nice()
    .range([plot.bottom, plot.top]);

  const bars = bins.map((b) => ({
    lo: b.lo,
    hi: b.hi,
    count: b.count,
    x: x(b.lo),
    width: x(b.hi) - x(b.lo),
    y: y(b.count),
    height: y(0) - y(b.count),
  }));

  return {
    plot,
    bars,
    x,
    y,
    ticksY: y.ticks(yTickHint).map((v) => ({ value: v, y: y(v) })),
  };
}

export function ProbeHistogram({
  bins,
  title,
  limits,
  source,
  alt,
  ground,
  accent,
  median,
  medianLabel,
  width,
  height,
  typeScale,
  yTickHint = 5,
  xTickEvery = 1,
}: {
  bins: Bin[];
  title: string;
  limits: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  median: number;
  medianLabel: string;
  width: number;
  height: number;
  typeScale: number;
  yTickHint?: number;
  xTickEvery?: number;
}) {
  if (bins.length < 3)
    throw new Error(
      "a histogram beat needs at least three bins to show a shape, got " +
        bins.length,
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const { sp, PAD, TITLE, SUBTITLE, SOURCE, AXIS, AXIS_TITLE, NOTE } =
    tokens(typeScale);

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const limitsLines = wrap(limits, width - PAD * 2, SUBTITLE);
  const limitsBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + sp(28);
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN — the LAST line lands on `height - PAD`. See
  // chart-beat/references/static-discipline.md, "The source on the frame's bottom margin."
  const sourceBaseline =
    height - PAD - (sourceLines.length - 1) * SUBTITLE.lead;
  // The plot starts below the LAST HEADER line, never below the source.
  const plotTop =
    limitsBaseline + (limitsLines.length - 1) * SUBTITLE.lead + sp(34);
  // The x-axis title sits directly above the credit block, which now owns the bottom margin.
  const axisTitleBaseline = sourceBaseline - SOURCE.fontSize - sp(8);

  const tickLabels = scaleLinear()
    .domain([0, Math.max(...bins.map((b) => b.count))])
    .nice()
    .ticks(yTickHint)
    .map((v, i, all) => (i === all.length - 1 ? `${v} countries` : `${v}`));

  const padding = {
    top: plotTop,
    right: PAD + sp(8),
    // Derived from where the axis title now sits: the tick-label band below the plot's floor has
    // to end above the axis title's ink. Reproduces the old reserve exactly when there is no
    // credit block to clear.
    bottom: height - axisTitleBaseline + AXIS_TITLE.fontSize + sp(30),
    left:
      PAD + sp(10) + Math.max(...tickLabels.map((l) => measureText(l, AXIS))),
  };

  const { plot, bars, x, ticksY } = histogramGeometry(bins, {
    width,
    height,
    padding,
    yTickHint,
  });
  const medianX = x(median);

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
            x={plot.left - sp(10)}
            y={tick.y + sp(4)}
            fill={muted}
            fontSize={AXIS.fontSize}
            textAnchor="end"
          >
            {tickLabels[i]}
          </text>
        </g>
      ))}

      {/* Bars sit edge-to-edge — no gap between bins, because the bins are contiguous slices of
          one continuous variable, not discrete categories (`references/types/histogram.md`). */}
      {bars.map((b) => (
        <rect
          key={b.lo}
          x={b.x}
          y={b.y}
          width={Math.max(b.width - 1, 0)}
          height={b.height}
          fill={muted}
        />
      ))}
      {bars
        .filter((_, i) => i % xTickEvery === 0)
        .map((b) => (
          <text
            key={`label-${b.lo}`}
            // The label names the bin's LOWER EDGE (`b.lo`), so it is drawn at that edge — not at
            // `b.x + b.width / 2`, which is where it used to sit. A histogram's ticks are boundaries
            // between bins, never marks on top of them, and the half-bin offset made the axis lie:
            // the median rule, drawn correctly at x=184.4, read against the printed labels as ≈1.1 t
            // while its own label said "Median: 3.1 t". The final tick was already at the true right
            // edge, which is why the last gap rendered half-width and the two labels collided at
            // 375px — the visible symptom of an axis that was wrong everywhere else too.
            x={b.x}
            y={plot.bottom + sp(20)}
            fill={muted}
            fontSize={AXIS.fontSize}
            textAnchor="middle"
          >
            {b.lo}
          </text>
        ))}
      <text
        x={plot.right}
        y={plot.bottom + sp(20)}
        fill={muted}
        fontSize={AXIS.fontSize}
        textAnchor="middle"
      >
        {bins[bins.length - 1].hi}
      </text>
      <text
        x={(plot.left + plot.right) / 2}
        y={axisTitleBaseline}
        fill={muted}
        fontSize={AXIS_TITLE.fontSize}
        fontWeight={AXIS_TITLE.fontWeight}
        textAnchor="middle"
      >
        CO2 emissions per capita (tonnes/year)
      </text>

      {/* The median: one accent colour, not the bars' own fill repeated as a second signal
          (`references/types/histogram.md`'s own worked example). Label in ink — a colour safe as
          a bar fill is not automatically safe as text, the same lesson the doctrine's own vermillion
          case teaches. */}
      <line
        x1={medianX}
        x2={medianX}
        y1={plot.top}
        y2={plot.bottom}
        stroke={accent}
        strokeWidth={2}
        strokeDasharray="6 4"
      />
      <text
        x={medianX + sp(8)}
        y={plot.top + sp(16)}
        fill={ink}
        fontSize={NOTE.fontSize}
        fontWeight={NOTE.fontWeight}
      >
        {medianLabel}
      </text>
    </svg>
  );
}
