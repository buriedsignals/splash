// THE one violin component — one horizontal band per category; a Gaussian KDE of
// its values, mirrored around the band centre, draws the silhouette. Value on x
// (POSITION encoding, no baseline-0, violin rule 1). Each violin is normalised to
// the same max width so SHAPES compare; an inner IQR bar + a white median tick
// give the eye references (this is what keeps a violin honest vs a boxplot). D3 =
// math (violin-geometry.ts), React = DOM, one master `progress` inflates the
// half-width from 0. responsive=false = fixed (video/static); true = embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: title=insight + Okabe-Ito + source
//     + WCAG (ChartFrame + checkViolinConformance), scale via resolveFrame, the
//     shared core/legend + legendRowCount, core/text.truncate.
//   - TYPE-specific: the KDE silhouette path, the same-max-width normalisation,
//     the IQR + median overlay, and the inflate-from-spine reveal.
import { useState } from "react";
import {
  computeViolinLayout,
  type ViolinData,
  type ViolinLayout,
} from "./violin-geometry";
import { area, curveCatmullRom } from "d3-shape";
import { clamp01, easeInOutCubic, easeOutCubic } from "./core/math";
import { COLORS, themeColors, FONT, TYPE, OKABE_ITO, tooltipBorder } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import type { Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";
import { truncate, textWidth } from "./core/text";

export interface ViolinConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  /** newsroom dark theme — flips the chart chrome to the dark furniture set. */
  dark?: boolean;
  unit: string; // subtitle + value-axis meaning
  summaryLabel?: string; // legend text for the median tick
  categories: { label: string; values: number[] }[];
}

export interface ViolinChartProps {
  config: ViolinConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

const FILL = OKABE_ITO.blue;

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

export function ViolinChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: ViolinChartProps) {
  const p = clamp01(progress);
  const s = responsive ? 1 : scale;
  const charsPerLine = Math.max(
    8,
    Math.floor((width - 48 * s) / (TYPE.title * s * 0.52)),
  );
  const titleLines = responsive
    ? Math.max(1, Math.ceil(config.title.length / Math.floor(width / 11)))
    : Math.max(1, Math.ceil(config.title.length / charsPerLine));

  // Two legend items (median/IQR glyph + density swatch). Measure them in base
  // units against the base plot width to decide if they wrap onto a 2nd row; the
  // ratio is scale-invariant, so this one boolean is correct at every viewport.
  const LEG_ROW = 20;
  const PAD_LEFT = 104;
  const PAD_RIGHT = 24;
  const medianText = config.summaryLabel ?? "Median";
  const legLabelA = `${medianText} & middle half`;
  const legLabelB = "Density of values";
  const legWidthA = 18 + 8 + textWidth(legLabelA, TYPE.axis);
  const legWidthB = 26 + 8 + textWidth(legLabelB, TYPE.axis);
  const legendTwoRows =
    legWidthA + 22 + legWidthB > width - PAD_LEFT - PAD_RIGHT;
  const legendRows = legendTwoRows ? 2 : 1;
  const basePad = {
    top: responsive ? 16 : 50 + titleLines * 27,
    right: PAD_RIGHT,
    // value-axis tick labels (~18) + legend rows + source-line clearance (~38)
    bottom: 18 + legendRows * LEG_ROW + 38,
    left: PAD_LEFT, // category labels
  };
  const frame = resolveFrameWithHeader(
    config.title,
    config.unit,
    width,
    height,
    basePad,
    scale,
    undefined,
    responsive,
  );
  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;

  const data: ViolinData = { categories: config.categories };
  const layout = computeViolinLayout(data, { width, height, padding });

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <ViolinSvg
      layout={layout}
      padding={padding}
      width={width}
      height={height}
      p={p}
      config={config}
      interactive={interactive}
      hover={hover}
      setHover={setHover}
      ts={ts}
      sc={sc}
      legLabelA={legLabelA}
      legLabelB={legLabelB}
      legWidthA={legWidthA}
      legendTwoRows={legendTwoRows}
      legRow={LEG_ROW}
    />
  );

  const tooltip =
    interactive && hover !== null ? (
      <Tooltip
        layout={layout}
        padding={padding}
        hover={hover}
        config={config}
      />
    ) : null;

  return (
    <ChartFrame
      title={config.title}
      subtitle={config.unit}
      source={config.source}
      width={width}
      height={height}
      responsive={responsive}
      tooltip={tooltip}
      scale={sc}
      lang={config.lang}
      dark={!!config.dark}
    >
      {svg}
    </ChartFrame>
  );
}

function ViolinSvg({
  layout,
  padding,
  width,
  height,
  p,
  config,
  interactive,
  hover,
  setHover,
  ts,
  sc,
  legLabelA,
  legLabelB,
  legWidthA,
  legendTwoRows,
  legRow,
}: {
  layout: ViolinLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: ViolinConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
  legLabelA: string;
  legLabelB: string;
  legWidthA: number; // base-unit width of item A (glyph + label)
  legendTwoRows: boolean;
  legRow: number;
}) {
  const C = themeColors(!!config.dark);
  // the inner median tick punches the BACKGROUND colour through the (dark→light on
  // dark theme) IQR bar, so it flips with the theme — a fixed white would vanish on
  // the light IQR bar the dark theme produces, and its legend swatch would too.
  const MEDIAN = C.bg;
  const { innerWidth, innerHeight, rows } = layout;
  const chrome = easeOutCubic(p / 0.18);
  const inflate = easeInOutCubic(p); // half-width grows from the spine
  const labelW = padding.left - 12 * sc;

  // d3 area: x across the silhouette, y0/y1 mirrored about the band centre.
  const violinPath = (r: ViolinLayout["rows"][number]) =>
    area<{ x: number; halfW: number }>()
      .x((d) => d.x)
      .y0((d) => r.y + d.halfW * inflate)
      .y1((d) => r.y - d.halfW * inflate)
      .curve(curveCatmullRom)(r.silhouette) ?? "";

  const legY = innerHeight + 36 * sc;
  // item B starts after A on the same row, or on a second row beneath it.
  const itemBx = legendTwoRows ? 0 : (legWidthA + 22) * sc;
  const itemBy = legendTwoRows ? legY + legRow * sc : legY;

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={config.title}
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* faint vertical gridlines + value-axis labels */}
        <g opacity={chrome}>
          {layout.valueTicks.map((t, i) => (
            <g key={`g${i}`}>
              <line
                x1={t.pos}
                x2={t.pos}
                y1={0}
                y2={innerHeight}
                stroke={C.grid}
                strokeWidth={1}
              />
              <text
                x={t.pos}
                y={innerHeight + 16 * sc}
                textAnchor="middle"
                fontSize={ts.source}
                fill={C.muted}
              >
                {t.label}
              </text>
            </g>
          ))}
        </g>

        {/* category labels in the left gutter */}
        <g opacity={chrome}>
          {rows.map((r) => (
            <text
              key={`c${r.index}`}
              x={-12 * sc}
              y={r.y}
              dy="0.32em"
              textAnchor="end"
              fontSize={ts.axis}
              fontWeight={600}
              fill={C.ink}
            >
              {truncate(r.label, labelW, ts.axis)}
            </text>
          ))}
        </g>

        {/* one violin per category (inflates from the spine, fades with chrome) */}
        <g opacity={chrome}>
          {rows.map((r) => {
            const focused = interactive && hover === r.index;
            const dim = interactive && hover !== null && !focused;
            const iqrH = Math.min(r.bandH * 0.12, 7 * sc) * inflate;
            const medH = r.bandH * 0.34 * inflate;
            return (
              <g
                key={`r${r.index}`}
                opacity={dim ? 0.3 : 1}
                tabIndex={interactive ? 0 : undefined}
                role={interactive ? "img" : undefined}
                aria-label={
                  interactive
                    ? `${r.label}: ${r.n} values, median ${fmt(r.median)}, middle half ${fmt(r.q1)} to ${fmt(r.q3)} ${config.unit}`
                    : undefined
                }
                style={interactive ? { cursor: "pointer" } : undefined}
                onMouseEnter={interactive ? () => setHover(r.index) : undefined}
                onMouseLeave={interactive ? () => setHover(null) : undefined}
                onFocus={interactive ? () => setHover(r.index) : undefined}
                onBlur={interactive ? () => setHover(null) : undefined}
              >
                {/* the KDE silhouette */}
                <path
                  d={violinPath(r)}
                  fill={FILL}
                  fillOpacity={0.85}
                  stroke={FILL}
                  strokeWidth={1 * sc}
                  strokeLinejoin="round"
                />
                {/* inner IQR bar (q1→q3) — the dark reference rectangle */}
                <rect
                  x={r.q1X}
                  y={r.y - iqrH}
                  width={Math.max(0, r.q3X - r.q1X)}
                  height={iqrH * 2}
                  fill={C.ink}
                  opacity={0.85}
                />
                {/* white median tick */}
                <line
                  x1={r.medianX}
                  x2={r.medianX}
                  y1={r.y - medH}
                  y2={r.y + medH}
                  stroke={MEDIAN}
                  strokeWidth={2.5 * sc}
                />
              </g>
            );
          })}
        </g>

        {/* legend: item A = median tick over the IQR bar; item B = silhouette
            swatch. B flows after A, or wraps to a second row on narrow widths. */}
        <g className="chart-legend" opacity={chrome}>
          {/* item A: dark IQR bar with the white median tick on top */}
          <rect
            x={-2 * sc}
            y={legY - 7 * sc}
            width={4 * sc}
            height={14 * sc}
            fill={C.ink}
            opacity={0.85}
          />
          <line
            x1={0}
            x2={0}
            y1={legY - 7 * sc}
            y2={legY + 7 * sc}
            stroke={MEDIAN}
            strokeWidth={2.5 * sc}
          />
          <text
            x={12 * sc}
            y={legY}
            dy="0.32em"
            fontSize={ts.axis}
            fontWeight={600}
            fill={C.ink}
          >
            {legLabelA}
          </text>
          {/* item B: silhouette swatch */}
          <ellipse
            cx={itemBx + 10 * sc}
            cy={itemBy}
            rx={10 * sc}
            ry={6 * sc}
            fill={FILL}
            fillOpacity={0.85}
          />
          <text
            x={itemBx + 26 * sc}
            y={itemBy}
            dy="0.32em"
            fontSize={ts.axis}
            fontWeight={600}
            fill={C.ink}
          >
            {legLabelB}
          </text>
        </g>
      </g>
    </svg>
  );
}

function Tooltip({
  layout,
  padding,
  hover,
  config,
}: {
  layout: ViolinLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: ViolinConfig;
}) {
  const r = layout.rows.find((x) => x.index === hover);
  if (!r) return null;
  const left = padding.left + r.medianX;
  const top = padding.top + r.y - r.bandH * 0.5 - 12;
  return (
    <div
      className="tooltip"
      style={{
        position: "absolute",
        left,
        top,
        transform: "translate(-50%,-100%)",
        background: COLORS.ink,
        border: tooltipBorder(config.dark),
        color: "#fff",
        padding: "6px 10px",
        borderRadius: 6,
        whiteSpace: "nowrap",
        pointerEvents: "none",
        fontFamily: FONT,
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <strong style={{ fontSize: 13 }}>{r.label}</strong>
      <div style={{ fontSize: 11, opacity: 0.85, marginTop: 1 }}>
        {r.n} values · median {fmt(r.median)} · middle half {fmt(r.q1)}–
        {fmt(r.q3)} {config.unit}
      </div>
    </div>
  );
}
