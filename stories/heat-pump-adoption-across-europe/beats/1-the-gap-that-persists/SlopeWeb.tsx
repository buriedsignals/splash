/**
 * Slope chart — 10 European countries, 2021 vs 2025.
 *
 * Each country is one line between two endpoints. All lines share the accent colour
 * because the subject is the group, not any one country. The finding is in the
 * collective shape: every line slopes up, the vertical spread stays wide.
 *
 * Follows ChartWebSeed's shape: geometry-only SVG (no <text>), all words in HTML
 * overlay, fluid frame via viewBox + preserveAspectRatio="none", fixed CSS type sizes.
 * No filter — the data has no orthogonal dimension to narrow by.
 */

import { scaleLinear } from "d3-scale";
import { extent } from "d3-array";

type Measure = (text: string, font: { fontSize: number; fontWeight?: number }) => number;

type CountryRow = { country: string; iso3: string; year: number; value: number };

type Slope = {
  country: string;
  iso3: string;
  v2021: number;
  v2025: number;
  y2021: number; // SVG y for 2021
  y2025: number; // SVG y for 2025
  x2021: number; // SVG x for 2021
  x2025: number; // SVG x for 2025
  change: number; // percentage-point change
};

type WebFrame = {
  width: number;
  height: number;
  xAxisRowPx: number;
  title: { fontSize: number; fontWeight: number };
  subtitle: { fontSize: number; fontWeight: number };
  source: { fontSize: number; fontWeight: number };
  axis: { fontSize: number };
  label: { fontSize: number; fontWeight: number };
  note: { fontSize: number };
  filter: { fontSize: number };
  yTickHint: number;
  xTickHint: number;
  minGridlineGapPx: number;
};

const UNIT = "%";
const CAVEAT = "Share of households with a heat pump. Synthetic test data.";

export const FRAME: WebFrame = {
  width: 760,
  height: 460,
  xAxisRowPx: 28,
  title: { fontSize: 24, fontWeight: 700 },
  subtitle: { fontSize: 14, fontWeight: 400 },
  source: { fontSize: 13, fontWeight: 400 },
  axis: { fontSize: 12 },
  label: { fontSize: 13, fontWeight: 600 },
  note: { fontSize: 12 },
  filter: { fontSize: 13 },
  yTickHint: 6,
  xTickHint: 2,
  minGridlineGapPx: 20,
};

const POINT_INSET = 6;

/** Parse CSV rows into slope data — one entry per country with 2021 and 2025 values. */
export function parseSlopeData(rows: CountryRow[]): Slope[] {
  const byCountry = new Map<string, CountryRow[]>();
  for (const row of rows) {
    if (!byCountry.has(row.country)) byCountry.set(row.country, []);
    byCountry.get(row.country)!.push(row);
  }
  const slopes: Slope[] = [];
  for (const [country, countryRows] of byCountry) {
    const r2021 = countryRows.find((r) => r.year === 2021);
    const r2025 = countryRows.find((r) => r.year === 2025);
    if (!r2021 || !r2025) continue;
    slopes.push({
      country,
      iso3: r2021.iso3,
      v2021: r2021.value,
      v2025: r2025.value,
      y2021: 0,
      y2025: 0,
      x2021: 0,
      x2025: 0,
      change: r2025.value - r2021.value,
    });
  }
  return slopes.sort((a, b) => b.v2025 - a.v2025);
}

/** Build the geometry: scales, point positions. */
export function slopeGeometry(
  slopes: Slope[],
  { width, height }: { width: number; height: number },
) {
  const allValues = slopes.flatMap((s) => [s.v2021, s.v2025]);
  const yMin = Math.min(...allValues);
  const yMax = Math.max(...allValues);
  const yPad = (yMax - yMin) * 0.08;
  const y = scaleLinear()
    .domain([Math.max(0, yMin - yPad), yMax + yPad])
    .range([height, 0]);

  const xLeft = POINT_INSET + 100;  // room for left labels
  const xRight = width - POINT_INSET - 100; // room for right labels

  for (const s of slopes) {
    s.x2021 = xLeft;
    s.x2025 = xRight;
    s.y2021 = y(s.v2021);
    s.y2025 = y(s.v2025);
  }

  const yTicks = y.ticks(6);
  return { width, height, y, yTicks, xLeft, xRight };
}

function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

/** Stagger labels vertically to avoid overlap. Returns adjusted y positions (in SVG units). */
function staggerLabels(
  slopes: Slope[],
  side: "left" | "right",
  minHeightGap: number,
): Map<string, number> {
  const sorted = [...slopes].sort((a, b) => {
    return side === "left" ? a.y2021 - b.y2021 : a.y2025 - b.y2025;
  });
  const result = new Map<string, number>();
  let lastY = -Infinity;
  for (const s of sorted) {
    const naturalY = side === "left" ? s.y2021 : s.y2025;
    const adjustedY = Math.max(naturalY, lastY + minHeightGap);
    result.set(s.country, adjustedY);
    lastY = adjustedY;
  }
  return result;
}

export function SlopeWeb({
  slopes,
  title,
  source,
  alt,
  ground,
  accent,
  ink,
  muted,
  grid,
  measure,
  frame,
}: {
  slopes: Slope[];
  title: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
  frame: WebFrame;
}) {
  if (slopes.length < 2)
    throw new Error(`slope chart needs at least two countries, got ${slopes.length}`);

  const { width, height, y, yTicks, xLeft, xRight } = slopeGeometry(slopes, {
    width: frame.width,
    height: frame.height,
  });

  // Y-axis label gutter measurement
  const tickLabels = yTicks.map((v) => `${v}${UNIT}`);
  const yGutterPx = 10 + Math.max(...tickLabels.map((l) => measure(l, frame.axis)));

  // Stagger labels on both sides to avoid overlap
  const minLabelGap = 20; // SVG units
  const leftLabels = staggerLabels(slopes, "left", minLabelGap);
  const rightLabels = staggerLabels(slopes, "right", minLabelGap);

  const totalWidth = yGutterPx + frame.width;
  const totalHeight = frame.height + frame.xAxisRowPx;

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--grid" as string]: grid,
        ["--title-size" as string]: `${frame.title.fontSize}px`,
        ["--title-weight" as string]: frame.title.fontWeight,
        ["--subtitle-size" as string]: `${frame.subtitle.fontSize}px`,
        ["--source-size" as string]: `${frame.source.fontSize}px`,
        ["--axis-size" as string]: `${frame.axis.fontSize}px`,
        ["--label-size" as string]: `${frame.label.fontSize}px`,
        ["--label-weight" as string]: frame.label.fontWeight,
        ["--note-size" as string]: `${frame.note.fontSize}px`,
        overflow: "hidden",
      }}
    >
      <div className="chart-header">
        <h2 className="chart-title">{title}</h2>
        <p className="chart-caveat">{CAVEAT}</p>
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: `${yGutterPx}px`,
          ["--x-axis-h" as string]: `${frame.xAxisRowPx}px`,
          aspectRatio: `${totalWidth} / ${totalHeight}`,
        }}
      >
        {/* Y-axis labels */}
        <div className="y-axis">
          {yTicks.map((value) => (
            <span
              key={value}
              className="axis-label y"
              style={{ top: `${pct(y(value), frame.height)}%`, color: muted }}
            >
              {value}{UNIT}
            </span>
          ))}
        </div>

        {/* SVG geometry only — no text */}
        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${frame.width} ${frame.height}`}
          preserveAspectRatio="none"
          fontFamily="Helvetica, Arial, sans-serif"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={frame.width} height={frame.height} fill={ground} />

          {/* Gridlines */}
          {yTicks.map((value) => (
            <line
              key={value}
              x1={0}
              x2={frame.width}
              y1={y(value)}
              y2={y(value)}
              stroke={grid}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Vertical axis lines at 2021 and 2025 */}
          <line x1={xLeft} y1={0} x2={xLeft} y2={frame.height} stroke={muted} strokeWidth={1} opacity={0.3} vectorEffect="non-scaling-stroke" />
          <line x1={xRight} y1={0} x2={xRight} y2={frame.height} stroke={muted} strokeWidth={1} opacity={0.3} vectorEffect="non-scaling-stroke" />

          {/* Slope lines — each country one line with a hoverable twin */}
          {slopes.map((s) => {
            const d = `M ${s.x2021} ${s.y2021} L ${s.x2025} ${s.y2025}`;
            const detail = `${s.country}: ${s.v2021}${UNIT} (2021) → ${s.v2025}${UNIT} (2025) · ${s.change >= 0 ? "+" : ""}${s.change} pp`;
            const label = `${s.country}: ${s.v2021}${UNIT} to ${s.v2025}${UNIT}, ${s.change >= 0 ? "+" : ""}${s.change} percentage points`;
            return (
              <g key={s.iso3}>
                {/* Visible line */}
                <path
                  d={d}
                  fill="none"
                  stroke={accent}
                  strokeWidth={2}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  opacity={0.85}
                />
                {/* Transparent hoverable twin */}
                <path
                  className="line-hit"
                  d={d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  tabIndex={0}
                  role="img"
                  aria-label={label}
                  data-detail={detail}
                />
                {/* Endpoint dots */}
                <circle cx={s.x2021} cy={s.y2021} r={3.5} fill={accent} vectorEffect="non-scaling-stroke" />
                <circle cx={s.x2025} cy={s.y2025} r={3.5} fill={accent} vectorEffect="non-scaling-stroke" />
              </g>
            );
          })}
        </svg>

        {/* HTML overlay — labels for each country at both endpoints */}
        <div className="overlay" aria-hidden="true">
          {slopes.map((s) => {
            const leftY = leftLabels.get(s.country)!;
            const rightY = rightLabels.get(s.country)!;
            return (
              <span key={s.iso3} style={{ position: "absolute", display: "contents" }}>
                <span
                  className="end-label"
                  style={{
                    left: `${pct(s.x2021, frame.width)}%`,
                    top: `${pct(leftY, frame.height)}%`,
                    color: ink,
                    fontSize: "var(--label-size)",
                    fontWeight: "var(--label-weight)",
                    transform: "translate(-100%, -50%) translateX(-8px)",
                    whiteSpace: "nowrap",
                    background: ground,
                    padding: "1px 4px",
                    borderRadius: "2px",
                  }}
                >
                  {s.country} {s.v2021}{UNIT}
                </span>
                <span
                  className="end-label"
                  style={{
                    left: `${pct(s.x2025, frame.width)}%`,
                    top: `${pct(rightY, frame.height)}%`,
                    color: ink,
                    fontSize: "var(--label-size)",
                    fontWeight: "var(--label-weight)",
                    transform: "translate(0, -50%) translateX(8px)",
                    whiteSpace: "nowrap",
                    background: ground,
                    padding: "1px 4px",
                    borderRadius: "2px",
                  }}
                >
                  {s.country} {s.v2025}{UNIT}
                </span>
              </span>
            );
          })}
        </div>

        {/* X-axis labels — just 2021 and 2025 */}
        <div className="x-axis">
          <span
            className="axis-label x"
            style={{ left: `${pct(xLeft, frame.width)}%`, color: muted }}
          >
            2021
          </span>
          <span
            className="axis-label x"
            style={{ left: `${pct(xRight, frame.width)}%`, color: muted }}
          >
            2025
          </span>
        </div>
      </div>

      <p className="chart-source">{source}</p>
    </figure>
  );
}