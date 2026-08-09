/**
 * The web beat of "Life expectancy in Switzerland rose 15 years since 1950" — the interactive
 * genre. Written fresh from `twin-chart-web/assets/ChartWebSeed.tsx`'s shape (two SSR'd layouts, a
 * fitted line scale, a reference rule, a muted context marker, a direct end-label, per-reading
 * hover/tap/keyboard detail) for THIS beat's own numbers — not imported from the seed, not a
 * parameterised copy of it, per the seed's own "REPLACE ME, do not parameterise me" header. Not
 * imported from the static sibling `proof/more-line-swiss-life-expectancy/LifeExpectancyLine.tsx`
 * either: that file is single-layout and reaches for `#shared/twin-chart-beat/render-still.mjs`
 * directly, neither of which fits this genre's two-layout / props-supplied-furniture shape
 * (`web-discipline.md`, "Responsive behaviour").
 *
 * What hover/tap/keyboard-focus adds here: the static frame prints exactly three numbers — the
 * 1950 reference (68.9), the year life expectancy first reached 80 (a muted marker, silent about
 * its own value), and the 2023 end label (84.0). Every one of the OTHER 72 annual readings between
 * 1950 and 2023 — including both COVID-era dips in 2020 and 2022 — has no printed value at all on
 * the static frame; hover/tap/keyboard focus on any of the 74 points answers exactly that question,
 * on demand, never printed by default (`web-discipline.md`, "What hover reveals").
 */

import { chartGeometry, xTickValues, fr, type Reading } from "./life-geometry";

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

/** Declared here, not imported from `ChartWebSeed.tsx` — no `#shared/*` vendoring path exists for
 *  a compile-time-only type (that file's own doc-comment gives the reasoning in full); duplicate,
 *  do not link. */
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
  minGridlineGapPx: number;
  plotMinHeight: number;
  bottomPad: number;
};

export const DESKTOP_LAYOUT: WebLayout = {
  name: "desktop",
  width: 900,
  pad: 40,
  title: { fontSize: 24, fontWeight: 700, lead: 30 },
  subtitle: { fontSize: 14, fontWeight: 400, lead: 20 },
  source: { fontSize: 14, fontWeight: 400, lead: 19 },
  axis: { fontSize: 13 },
  label: { fontSize: 15, fontWeight: 600 },
  note: { fontSize: 13 },
  yTickHint: 5,
  xTickHint: 6,
  minGridlineGapPx: 20,
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
  minGridlineGapPx: 16,
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

export function LifeExpectancyWeb({
  data,
  title,
  source,
  alt,
  ground,
  accent,
  subject,
  referenceYear,
  crossingYear,
  ink,
  muted,
  grid,
  measure,
  layout,
}: {
  data: Reading[];
  title: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  subject: string;
  /** The level the reference rule holds the reader's eye against — this beat's own claim is
   *  measured from 1950, so the reference is 1950, not a generic "first reading" default. */
  referenceYear: number;
  /** The year life expectancy first reached 80, found by the story's own runner from the data
   *  (never hand-typed) — a muted marker, silent about its own value, exactly the restraint
   *  `web-discipline.md` keeps for the seed's own peak marker. */
  crossingYear: number;
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
  layout: WebLayout;
}) {
  if (data.length < 2)
    throw new Error(
      `a line beat needs at least two readings, got ${data.length}`,
    );

  const { width, pad } = layout;

  const titleLines = wrap(title, width - pad * 2, layout.title, measure);
  const titleBaseline = pad + layout.title.fontSize;
  const sourceLines = wrap(source, width - pad * 2, layout.source, measure);
  const sourceBaseline =
    titleBaseline +
    (titleLines.length - 1) * layout.title.lead +
    Math.round(layout.title.lead * 0.9);

  const last = data[data.length - 1];
  const endLabel = `${subject} ${fr(last.value)} (${last.year})`;

  const plotTop =
    sourceBaseline +
    (sourceLines.length - 1) * layout.source.lead +
    Math.round(layout.title.lead);
  const plotBottom = plotTop + layout.plotMinHeight;
  const height = plotBottom + layout.bottomPad;

  const referenceReading = data.find((d) => d.year === referenceYear);
  if (!referenceReading)
    throw new Error(`referenceYear ${referenceYear} is not in the data`);
  const referenceValue = referenceReading.value;

  const gridScale = chartGeometry(data, {
    width,
    height,
    padding: { top: plotTop, right: 0, bottom: layout.bottomPad, left: 0 },
  }).y;
  const referenceYProvisional = gridScale(referenceValue);
  const regularTicks = gridScale
    .ticks(layout.yTickHint)
    .filter(
      (v) =>
        Math.abs(gridScale(v) - referenceYProvisional) >=
        layout.minGridlineGapPx,
    );
  const tickValues = [...regularTicks, referenceValue].sort((a, b) => a - b);
  const topValue = Math.max(...tickValues);
  // Round ticks (from d3's own `.ticks()`) print as whole numbers; the reference tick is the raw
  // 1950 reading itself (68.9133...), rounded to one decimal for display the same way every other
  // printed value in this beat is — an unrounded float here was a real defect caught by driving
  // the rendered file, not a hypothetical: "68.9133" printed next to the round "70"/"75"/"80" ticks.
  const tickLabels = tickValues.map((v) => {
    const label = Number.isInteger(v) ? `${v}` : fr(v);
    return v === topValue ? `${label} years` : label;
  });

  const padding = {
    top: plotTop,
    right: pad + 12 + measure(endLabel, layout.label),
    bottom: layout.bottomPad,
    left:
      pad + 10 + Math.max(...tickLabels.map((l) => measure(l, layout.axis))),
  };

  const { plot, points, path, y } = chartGeometry(data, {
    width,
    height,
    padding,
  });

  const referenceY = y(referenceValue);
  const crossingPoint = points.find((p) => p.year === crossingYear);
  const end = points[points.length - 1];

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
      {/* No root role="img" — this genre's departure from the static genre's a11y pattern
          (`web-discipline.md`): every one of the 74 points below needs its own name. */}
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

      {tickValues.map((value) => (
        <g key={value}>
          {value === referenceValue ? null : (
            <line
              x1={plot.left}
              x2={plot.right}
              y1={y(value)}
              y2={y(value)}
              stroke={grid}
              strokeWidth={1}
            />
          )}
          <text
            x={plot.left - 10}
            y={y(value) + 4}
            fill={muted}
            fontSize={layout.axis.fontSize}
            textAnchor="end"
          >
            {tickLabels[tickValues.indexOf(value)]}
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

      <line
        x1={plot.left}
        x2={plot.right}
        y1={referenceY}
        y2={referenceY}
        stroke={muted}
        strokeWidth={1}
        strokeDasharray="5 4"
      />
      {/* Anchored at the RIGHT end of the dashed rule, not the left — the reference year (1950)
          IS this series' first data point, so the curve itself starts exactly at referenceY,
          right at the plot's left edge. A label placed there collided with both the curve's own
          start and the y-axis tick label beneath it, caught by driving the rendered file (not
          hypothetical): the curve is well clear of the reference line by the time it reaches the
          plot's right edge, for every year in this series. */}
      <text
        x={plot.right - 4}
        y={referenceY - 8}
        fill={muted}
        fontSize={layout.note.fontSize}
        textAnchor="end"
      >
        {referenceYear} level
      </text>

      <path
        d={path}
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
            x={crossingPoint.x}
            y={crossingPoint.y - 10}
            fill={muted}
            fontSize={layout.note.fontSize}
            textAnchor="middle"
          >
            first year past 80
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

      {/* Interaction layer: every one of the 74 readings is `tabIndex={0}` with its own
          `aria-label`/`data-detail` baked in at build time — reachable with the script absent
          entirely. `assets/interaction.mjs` (this skill's own, unmodified) wires hover/tap/keyboard
          via nearest-x resolution over the shared `.hit-area`. */}
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
          aria-label={`${p.year}: ${fr(p.value)} years`}
          data-year={p.year}
          data-detail={`${p.year} · ${fr(p.value)} years`}
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
