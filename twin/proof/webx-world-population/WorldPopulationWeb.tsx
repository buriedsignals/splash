/**
 * The web beat of "World population passed 8 billion in 2023" — the interactive genre.
 *
 * Written fresh from `twin-chart-web/assets/ChartWebSeed.tsx`'s shape for a DIFFERENT mark family:
 * a filled area, zero-anchored (`references/types/area.md`'s own non-negotiable — the fill's AREA
 * is what a reader measures, so unlike a line the value axis always includes zero), not a fitted
 * line scale. Not imported from the static sibling
 * `proof/static-world-population/WorldPopulationArea.tsx` (single-layout, reaches for
 * `#shared/twin-chart-beat/render-still.mjs` directly — neither fits this genre).
 *
 * What hover/tap/keyboard-focus adds: the static frame prints the axis in whole billions (rounded
 * to one decimal) and the crossing/end labels. None of the 224 individual annual readings between
 * 1800 and 2023 has an exact printed value — hover/tap/keyboard focus on any point answers the
 * exact population for that year, to the nearest person as OWID reports it, not the billion-scale
 * rounding the axis and end label use.
 */

import {
  chartGeometry,
  xTickValues,
  billions,
  type Reading,
} from "./population-geometry";

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

/** Declared here, not imported — same "duplicate, do not link" reasoning
 *  `ChartWebSeed.tsx`'s own doc-comment gives for `WebLayout`. */
export type WebLayout = {
  name: "desktop" | "narrow";
  width: number;
  pad: number;
  title: { fontSize: number; fontWeight: number; lead: number };
  subtitle: { fontSize: number; fontWeight: number; lead: number };
  source: { fontSize: number; fontWeight: number; lead: number };
  axis: { fontSize: number };
  label: { fontSize: number; fontWeight: number };
  note: { fontSize: number };
  yTickHint: number;
  xTickHint: number;
  plotMinHeight: number;
  bottomPad: number;
};

export const DESKTOP_LAYOUT: WebLayout = {
  name: "desktop",
  width: 900,
  pad: 40,
  title: { fontSize: 26, fontWeight: 700, lead: 34 },
  subtitle: { fontSize: 14, fontWeight: 400, lead: 20 },
  source: { fontSize: 14, fontWeight: 400, lead: 19 },
  axis: { fontSize: 13 },
  label: { fontSize: 15, fontWeight: 600 },
  note: { fontSize: 13 },
  yTickHint: 5,
  xTickHint: 6,
  plotMinHeight: 340,
  bottomPad: 64,
};

export const NARROW_LAYOUT: WebLayout = {
  name: "narrow",
  width: 360,
  pad: 20,
  title: { fontSize: 17, fontWeight: 700, lead: 22 },
  subtitle: { fontSize: 12, fontWeight: 400, lead: 17 },
  source: { fontSize: 12, fontWeight: 400, lead: 16 },
  axis: { fontSize: 11 },
  label: { fontSize: 13, fontWeight: 600 },
  note: { fontSize: 11 },
  yTickHint: 4,
  xTickHint: 3,
  plotMinHeight: 220,
  bottomPad: 44,
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

export function WorldPopulationWeb({
  data,
  title,
  limits,
  source,
  alt,
  ground,
  accent,
  crossing,
  ink,
  muted,
  grid,
  measure,
  layout,
}: {
  data: Reading[];
  title: string;
  limits: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  /** The year population first crossed 1 billion, found by the runner from the data, not typed
   *  from memory — a muted marker, silent about its own value, same restraint as every other
   *  context marker in this corpus. */
  crossing: { year: number; label: string };
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
  layout: WebLayout;
}) {
  if (data.length < 2)
    throw new Error(
      `an area beat needs at least two readings, got ${data.length}`,
    );

  const { width, pad } = layout;

  const titleLines = wrap(title, width - pad * 2, layout.title, measure);
  const titleBaseline = pad + layout.title.fontSize;
  const limitsLines = wrap(limits, width - pad * 2, layout.subtitle, measure);
  const limitsBaseline =
    titleBaseline +
    (titleLines.length - 1) * layout.title.lead +
    Math.round(layout.title.lead * 0.9);
  const sourceLines = wrap(source, width - pad * 2, layout.source, measure);
  const sourceBaseline =
    limitsBaseline +
    (limitsLines.length - 1) * layout.subtitle.lead +
    Math.round(layout.subtitle.lead * 1.1);

  const last = data[data.length - 1];
  const endLabel = `${last.year} · ${billions(last.population)} billion`;

  const plotTop =
    sourceBaseline +
    (sourceLines.length - 1) * layout.source.lead +
    Math.round(layout.title.lead);
  const plotBottom = plotTop + layout.plotMinHeight;
  const height = plotBottom + layout.bottomPad;

  const rawTicks = chartGeometry(data, {
    width,
    height,
    padding: { top: plotTop, right: 0, bottom: layout.bottomPad, left: 0 },
  }).y.ticks(layout.yTickHint);
  const tickLabels = rawTicks.map((v, i, all) =>
    i === all.length - 1 ? `${billions(v)} B` : billions(v),
  );

  const padding = {
    top: plotTop,
    right: pad + 12 + measure(endLabel, layout.label),
    bottom: layout.bottomPad,
    left:
      pad + 10 + Math.max(...tickLabels.map((l) => measure(l, layout.axis))),
  };

  const { plot, points, areaPath, linePath, zeroY, y } = chartGeometry(data, {
    width,
    height,
    padding,
  });
  const crossingPoint = points.find((p) => p.year === crossing.year);
  const end = points[points.length - 1];
  // The crossing marker's label is centred on its own point, EXCEPT when that would run it past
  // the plot's own edge — real defect, caught by driving the rendered file at the narrow layout:
  // 1805 sits only 5 years into an 1800-2023 span, so the marker's x is a few pixels from
  // `plot.left`, and a centred label there ran clean off the left edge of the frame. Clamped
  // inside the plot, the same rule `proof/webx-wind-vs-solar/GroupedBarWeb.tsx`'s own callout
  // anchor uses.
  const crossingLabelWidth = crossingPoint
    ? measure(crossing.label, layout.note)
    : 0;
  const crossingLabelX = crossingPoint
    ? Math.min(
        Math.max(crossingPoint.x, plot.left + crossingLabelWidth / 2),
        plot.right - crossingLabelWidth / 2,
      )
    : 0;

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
      {limitsLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={limitsBaseline + i * layout.subtitle.lead}
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

      {rawTicks.map((value, i) => (
        <g key={value}>
          <line
            x1={plot.left}
            x2={plot.right}
            y1={y(value)}
            y2={y(value)}
            stroke={value === 0 ? muted : grid}
            strokeWidth={1}
          />
          <text
            x={plot.left - 10}
            y={y(value) + 4}
            fill={muted}
            fontSize={layout.axis.fontSize}
            textAnchor="end"
          >
            {tickLabels[i]}
          </text>
        </g>
      ))}
      {xTickValues(
        data.map((d) => d.year),
        layout.xTickHint,
      ).map((year) => {
        const p = points.find((pt) => pt.year === year);
        if (!p) return null;
        return (
          <text
            key={year}
            x={p.x}
            y={plot.bottom + 24}
            fill={muted}
            fontSize={layout.axis.fontSize}
            textAnchor="middle"
          >
            {year}
          </text>
        );
      })}

      {/* The fill IS the claim: a stock accumulated over time, read as an area
          (`references/types/area.md`). */}
      <path d={areaPath} fill={accent} fillOpacity={0.18} />
      <path
        d={linePath}
        fill="none"
        stroke={accent}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {crossingPoint && (
        <>
          <circle
            cx={crossingPoint.x}
            cy={crossingPoint.y}
            r={3}
            fill={muted}
          />
          <text
            x={crossingLabelX}
            y={crossingPoint.y - 12}
            fill={muted}
            fontSize={layout.note.fontSize}
            textAnchor="middle"
          >
            {crossing.label}
          </text>
        </>
      )}

      <circle cx={end.x} cy={end.y} r={4} fill={accent} />
      <text
        x={plot.right + 10}
        y={end.y + 5}
        fill={accent}
        fontSize={layout.label.fontSize}
        fontWeight={layout.label.fontWeight}
      >
        {endLabel}
      </text>

      {/* Interaction layer: every one of the 224 annual readings is `tabIndex={0}` with its own
          `aria-label`/`data-detail` baked in at build time — reachable with the script absent
          entirely. `assets/interaction.mjs` (unmodified) wires hover/tap/keyboard via nearest-x
          resolution over the shared `.hit-area`. */}
      {points.map((p) => (
        <circle
          key={p.year}
          className="pt"
          cx={p.x}
          cy={p.y}
          r={5}
          fill="transparent"
          stroke="none"
          tabIndex={0}
          role="img"
          aria-label={`${p.year}: ${Math.round(p.population).toLocaleString("en-US")} people`}
          data-year={p.year}
          data-detail={`${p.year} · ${Math.round(p.population).toLocaleString("en-US")}`}
        />
      ))}
      <rect
        className="hit-area"
        x={plot.left}
        y={plot.top}
        width={plot.right - plot.left}
        height={plot.bottom - plot.top}
        fill="transparent"
        pointerEvents="all"
      />
    </svg>
  );
}
