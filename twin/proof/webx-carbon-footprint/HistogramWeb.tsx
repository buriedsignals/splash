/**
 * The web beat of "Six in ten countries emit under 4 tonnes of CO2 per person" — the interactive
 * genre.
 *
 * Written fresh from `twin-chart-web/assets/ChartWebSeed.tsx`'s two-layout / baked-in-interaction
 * shape, for a DIFFERENT mark family: contiguous, edge-to-edge bins
 * (`references/types/histogram.md`). Not imported from the static sibling
 * `proof/static-carbon-footprint-spread/CarbonFootprintHistogram.tsx` (single-layout, reaches for
 * `#shared/twin-chart-beat/render-still.mjs` directly).
 *
 * The question the task brief poses by name for this type — "what does hovering a bin reveal that
 * the bars do not already show?" — is answered here with the one thing a histogram's bars
 * genuinely cannot carry: WHICH countries fall in a given bin. The bar's height already states the
 * count as a shape (and the axis lets a reader estimate it); what it cannot state is membership —
 * a reader looking at the rightmost bar (24-40 t/capita) can see "a handful of countries" but has
 * no way to know which ones without leaving the chart. Hover, tap or keyboard focus on any of the
 * ten bins reveals its exact count AND the full, sorted list of countries in it — never the same
 * count restated, and never fabricated (every name comes straight from the frozen CSV's own
 * `Entity` column, grouped in `render-web.mjs`, not typed by hand).
 */

import { histogramGeometry, type Bin } from "./histogram-geometry";

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

export type WebLayout = {
  name: "desktop" | "narrow";
  width: number;
  pad: number;
  title: { fontSize: number; fontWeight: number; lead: number };
  subtitle: { fontSize: number; fontWeight: number; lead: number };
  source: { fontSize: number; fontWeight: number; lead: number };
  axis: { fontSize: number };
  axisTitle: { fontSize: number; fontWeight: number };
  note: { fontSize: number; fontWeight: number };
  yTickHint: number;
  plotMinHeight: number;
  bottomPad: number;
};

export const DESKTOP_LAYOUT: WebLayout = {
  name: "desktop",
  width: 900,
  pad: 40,
  title: { fontSize: 25, fontWeight: 700, lead: 32 },
  subtitle: { fontSize: 14, fontWeight: 400, lead: 20 },
  source: { fontSize: 14, fontWeight: 400, lead: 19 },
  axis: { fontSize: 13 },
  axisTitle: { fontSize: 13, fontWeight: 600 },
  note: { fontSize: 13, fontWeight: 700 },
  yTickHint: 5,
  plotMinHeight: 300,
  bottomPad: 52,
};

export const NARROW_LAYOUT: WebLayout = {
  name: "narrow",
  width: 360,
  pad: 20,
  title: { fontSize: 16, fontWeight: 700, lead: 21 },
  subtitle: { fontSize: 11, fontWeight: 400, lead: 15 },
  source: { fontSize: 11, fontWeight: 400, lead: 14 },
  axis: { fontSize: 10 },
  axisTitle: { fontSize: 10, fontWeight: 600 },
  note: { fontSize: 10, fontWeight: 700 },
  yTickHint: 4,
  plotMinHeight: 220,
  bottomPad: 40,
};

export const LAYOUTS: WebLayout[] = [DESKTOP_LAYOUT, NARROW_LAYOUT];

function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
  measure: Measure,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const trial = line ? `${line} ${word}` : word;
    if (line && measure(trial, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...lines, line] : lines;
}

export function HistogramWeb({
  bins,
  title,
  subtitle,
  source,
  alt,
  ground,
  accent,
  median,
  medianLabel,
  ink,
  muted,
  grid,
  measure,
  layout,
}: {
  bins: Bin[];
  title: string;
  subtitle: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  median: number;
  medianLabel: string;
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
  layout: WebLayout;
}) {
  if (bins.length < 3)
    throw new Error(
      `a histogram beat needs at least three bins to show a shape, got ${bins.length}`,
    );

  const { width, pad } = layout;

  const titleLines = wrap(title, width - pad * 2, layout.title, measure);
  const titleBaseline = pad + layout.title.fontSize;
  const subtitleLines = wrap(
    subtitle,
    width - pad * 2,
    layout.subtitle,
    measure,
  );
  const subtitleBaseline =
    titleBaseline +
    (titleLines.length - 1) * layout.title.lead +
    Math.round(layout.title.lead * 0.9);
  const sourceLines = wrap(source, width - pad * 2, layout.source, measure);
  const sourceBaseline =
    subtitleBaseline +
    (subtitleLines.length - 1) * layout.subtitle.lead +
    Math.round(layout.subtitle.lead * 1.1);

  const plotTop =
    sourceBaseline +
    (sourceLines.length - 1) * layout.source.lead +
    Math.round(layout.title.lead);
  const plotBottom = plotTop + layout.plotMinHeight;
  const height = plotBottom + layout.bottomPad;

  const tickLabels = histogramGeometry(bins, {
    width,
    height,
    padding: { top: 0, right: pad + 8, bottom: 0, left: pad },
  })
    .y.ticks(layout.yTickHint)
    .map((v, i, all) => (i === all.length - 1 ? `${v} countries` : `${v}`));

  const padding = {
    top: plotTop,
    right: pad + 8,
    bottom: layout.bottomPad,
    left:
      pad + 10 + Math.max(...tickLabels.map((l) => measure(l, layout.axis))),
  };

  const { plot, bars, x, ticksY } = histogramGeometry(bins, {
    width,
    height,
    padding,
  });
  const medianX = x(median);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="chart"
      data-layout={layout.name}
      fontFamily="Helvetica, Arial, sans-serif"
    >
      {/* No root role="img" — ten individually-focusable bins below need their own names. */}
      <desc>{alt}</desc>
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {titleLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={titleBaseline + i * layout.title.lead}
          fill={ink}
          fontSize={layout.title.fontSize}
          fontWeight={layout.title.fontWeight}
        >
          {line}
        </text>
      ))}
      {subtitleLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={subtitleBaseline + i * layout.subtitle.lead}
          fill={muted}
          fontSize={layout.subtitle.fontSize}
        >
          {line}
        </text>
      ))}
      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={sourceBaseline + i * layout.source.lead}
          fill={muted}
          fontSize={layout.source.fontSize}
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
            x={plot.left - 10}
            y={tick.y + 4}
            fill={muted}
            fontSize={layout.axis.fontSize}
            textAnchor="end"
          >
            {tickLabels[i]}
          </text>
        </g>
      ))}

      {/* Bars sit edge-to-edge — contiguous slices of one continuous variable, not discrete
          categories (`references/types/histogram.md`). */}
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
      {bars.map((b) => (
        <text
          key={`label-${b.lo}`}
          // The label names the bin's LOWER EDGE (`b.lo`), so it is drawn at that edge. Found
          // independently in this copy and in `static-carbon-footprint-spread`'s — the same line,
          // the same defect, in two files with no shared code. A histogram's ticks are boundaries
          // between bins, never marks on top of them.
          x={b.x}
          y={plot.bottom + 20}
          fill={muted}
          fontSize={layout.axis.fontSize}
          textAnchor="middle"
        >
          {b.lo}
        </text>
      ))}
      <text
        x={plot.right}
        y={plot.bottom + 20}
        fill={muted}
        fontSize={layout.axis.fontSize}
        textAnchor="middle"
      >
        {bins[bins.length - 1].hi}
      </text>
      <text
        x={(plot.left + plot.right) / 2}
        y={height - Math.round(layout.bottomPad * 0.3)}
        fill={muted}
        fontSize={layout.axisTitle.fontSize}
        fontWeight={layout.axisTitle.fontWeight}
        textAnchor="middle"
      >
        CO2 emissions per capita (tonnes/year)
      </text>

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
        x={medianX + 8}
        y={plot.top + 16}
        fill={ink}
        fontSize={layout.note.fontSize}
        fontWeight={layout.note.fontWeight}
      >
        {medianLabel}
      </text>

      {/* Interaction layer: one direct hit target per bin, `tabIndex={0}` and `aria-label`
          baked in at build time — every bin's exact count AND the full list of member countries
          is reachable with the script absent entirely. */}
      {bars.map((b) => (
        <rect
          key={`hit-${b.lo}`}
          className="bin-hit"
          x={b.x}
          y={plot.top}
          width={b.width}
          height={plot.bottom - plot.top}
          fill="transparent"
          tabIndex={0}
          role="img"
          aria-label={`${b.lo} to ${b.hi} tonnes: ${b.count} ${b.count === 1 ? "country" : "countries"} — ${b.entities.join(", ") || "none"}`}
          data-detail={`${b.lo}–${b.hi} t: ${b.count} ${b.count === 1 ? "country" : "countries"} — ${b.entities.join(", ") || "none"}`}
        />
      ))}
    </svg>
  );
}
