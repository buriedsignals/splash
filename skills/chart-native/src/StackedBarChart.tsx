// THE one stacked-bar/column component — extends the bar discipline to several
// series summed per column. D3 = math (stacked-bar-geometry.ts), React = DOM, a
// single master `progress` drives a motion build that is a pure function of
// progress (shared by static / video). responsive=false keeps a fixed absolute
// layout (video + static); responsive=true uses a flow layout for the embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: baseline-0 (geometry valueDomain),
//     Okabe-Ito palette + WCAG + title=insight + source (ChartFrame + conformance),
//     scale via resolveFrame.
//   - TYPE-specific: the stack geometry, the rise-from-baseline motion, and the
//     LEGEND (stacked is the one type where a legend beats direct labels —
//     stacked-bar.md rule 4). The legend sits UNDER the plot (clear of the header)
//     and wraps to fit any width, so it never collides on mobile or in portrait.
import { useState } from "react";
import {
  computeStackedLayout,
  growSegment,
  type StackedData,
  type StackedLayout,
} from "./stacked-bar-geometry";
import { formatNumber, clamp01, easeOutCubic, stagger } from "./core/math";
import {
  COLORS,
  TYPE,
  STACKED_SERIES_COLORS,
  themeColors,
  themeStackedColors, tooltipBorder } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import type { Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";
import { layoutLegend } from "./core/legend";
import { verticalCatLines, verticalCatMaxLines, bandStepPx , seriesLabelFromColumn } from "./core/text";

export interface StackedConfig {
  title: string; // = the insight (sentence case)
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  unit: string;
  catField: string;
  seriesFields: string[]; // stacking order, bottom → top
  rows: Record<string, string | number>[];
  /** newsroom dark theme (F2 house `theme: dark`) — flips the furniture + swaps the
   *  palette's black series for a light neutral (themeStackedColors). Default light. */
  themeBg?: string;
  /** newsroom house hue (spec `baseColor`): tints the FURNITURE greys (muted/axis/grid) and
   *  the frame's title band toward the house colour. This chart encodes with a fixed
   *  categorical/role palette, so the hue never touches its marks — colouring them with one
   *  hue would collapse the categories it separates. Undefined = untinted (byte-identical). */
  baseColor?: string;
}

export interface StackedBarChartProps {
  config: StackedConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

// categorical series colours, in stacking order — all Okabe-Ito (CVD-safe).
// Extracted to core/tokens.ts (STACKED_SERIES_COLORS) so the produce-time
// conformance guard derives the SAME colours.
const SERIES_COLORS = STACKED_SERIES_COLORS;

export function StackedBarChart({
  config,
  progress = 1,
  width = 840,
  height = 460,
  interactive = false,
  responsive = false,
  scale = 1,
}: StackedBarChartProps) {
  const p = clamp01(progress);
  // `scale` is known directly (1 for landscape/responsive, ~1.7 for square /
  // portrait) so we can size the legend wrap before resolveFrame runs.
  const s = responsive ? 1 : scale;
  const leftAxis = 44;
  const sideRight = 16;
  // Non-responsive: the absolute title+subtitle header sits over the plot, so the
  // top gridline ("100") must clear it. The title wraps to 2 lines on square /
  // portrait (narrower relative width) — estimate the line count and reserve the
  // matching top padding so the subtitle never collides with the axis.
  const charsPerLine = Math.max(
    8,
    Math.floor((width - 48 * s) / (TYPE.title * s * 0.52)),
  );
  const titleLines = responsive
    ? 1
    : Math.max(1, Math.ceil(config.title.length / charsPerLine));
  const baseTop = responsive ? 16 : 53 + titleLines * 27;
  const legendRowUnscaled = 22;
  const charW = TYPE.axis * s * 0.6;
  const availLegendW = width - (leftAxis + sideRight) * s;
  const { rows: legendRows } = layoutLegend(
    config.seriesFields.map(seriesLabelFromColumn),
    SERIES_COLORS,
    availLegendW,
    0,
    0,
    charW,
    legendRowUnscaled * s,
  );
  // A column's category label is centred under the column and WRAPS onto ≤2 lines
  // (verticalCatLines, shared bar-family rule) rather than truncating/overflowing on
  // a narrow/portrait canvas. Reserve the extra row(s) above the legend, using the
  // band step the layout will use. 0 extra when every label fits on one line.
  const catExtraRows =
    verticalCatMaxLines(
      config.rows.map((r) => String(r[config.catField])),
      bandStepPx(width - (leftAxis + sideRight) * s, config.rows.length),
      TYPE.axis * s,
    ) - 1;
  // unscaled bottom padding (resolveFrame multiplies by scale): the wrapped category
  // labels, then the legend 40 below the plot, then every legend row. The
  // source-footer band is reserved once in resolveFrameWithHeader, so the legend
  // never collides with the source.
  const basePad = {
    top: baseTop,
    right: sideRight,
    bottom:
      44 + legendRows * legendRowUnscaled + catExtraRows * TYPE.axis * 1.15,
    left: leftAxis,
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
  const data: StackedData = {
    catField: config.catField,
    seriesFields: config.seriesFields,
    rows: config.rows,
  };
  const layout = computeStackedLayout(data, { width, height, padding });

  const [hover, setHover] = useState<{ col: number; seg: number } | null>(null);

  const svg = (
    <StackedSvg
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
    />
  );

  const tooltip =
    interactive && hover ? (
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
      themeBg={config.themeBg}
      baseColor={config.baseColor}
    >
      {svg}
    </ChartFrame>
  );
}

function StackedSvg({
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
}: {
  layout: StackedLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: StackedConfig;
  interactive: boolean;
  hover: { col: number; seg: number } | null;
  setHover: (h: { col: number; seg: number } | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { innerWidth, innerHeight, base, columns } = layout;
  const n = columns.length;
  const C = themeColors(config.themeBg, config.baseColor);
  const seriesColors = themeStackedColors(config.themeBg);

  const chrome = easeOutCubic(p / 0.18);
  const colP = (i: number) => stagger(p, i, n, 0.18, 0.5 / n, 0.35);

  // all totals equal (a 100% share story) → the per-column total is constant and
  // would be noise; show it only when totals actually differ.
  const totals = columns.map((c) => c.total);
  const totalsVary = Math.max(...totals) - Math.min(...totals) > 0.5;

  // band step (centre-to-centre) → wrap budget for a centred category label.
  const colStep =
    columns.length > 1 ? columns[1].bandX - columns[0].bandX : innerWidth;
  const catLineH = ts.axis * 1.15;
  const catLinesByCol = columns.map((c) =>
    verticalCatLines(String(c.rawCat), colStep, ts.axis),
  );
  const catExtraRows = Math.max(0, ...catLinesByCol.map((l) => l.length - 1));
  // legend UNDER the plot, in plot-g coords (so it tracks the centred band on
  // tall canvases). Sits below the (possibly wrapped) category labels so it never
  // overlaps a 2-line name. Wrapped to the plot width; rows match the reserved padding.
  const legendTop = innerHeight + 40 * sc + catExtraRows * catLineH;
  const legend = layoutLegend(
    config.seriesFields.map(seriesLabelFromColumn),
    seriesColors,
    innerWidth,
    0,
    legendTop,
    ts.axis * 0.6,
    22 * sc,
  ).items;

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={config.title}
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* value-axis gridlines + labels (wipe in) */}
        <g opacity={chrome}>
          {layout.valueTicks.map((t, i) => (
            <g key={`g${i}`}>
              <line
                x1={0}
                x2={innerWidth}
                y1={t.pos}
                y2={t.pos}
                stroke={C.grid}
                strokeWidth={1}
              />
              <text
                x={-10 * sc}
                y={t.pos}
                dy="0.32em"
                textAnchor="end"
                fontSize={ts.axis}
                fill={C.muted}
              >
                {t.label}
              </text>
            </g>
          ))}
        </g>

        {/* stacked columns — each whole stack rises from the baseline, staggered */}
        {columns.map((col, ci) => {
          const cp = colP(ci);
          const catOp = clamp01(cp * 1.6);
          const totalOp = totalsVary ? clamp01((cp - 0.7) / 0.3) : 0;
          return (
            <g key={`col${ci}`}>
              {col.segments.map((seg, si) => {
                const r = growSegment(seg, col, base, cp);
                if (!r) return null;
                const focused =
                  interactive && hover?.col === ci && hover?.seg === si;
                const dim = interactive && hover && !focused;
                return (
                  <rect
                    key={`s${si}`}
                    className="stack-seg"
                    x={r.x}
                    y={r.y}
                    width={r.w}
                    height={r.h}
                    fill={seriesColors[seg.seriesIndex % seriesColors.length]}
                    opacity={dim ? 0.6 : 1}
                    tabIndex={interactive ? 0 : undefined}
                    role={interactive ? "img" : undefined}
                    aria-label={
                      interactive
                        ? `${col.rawCat} ${seg.seriesKey}: ${formatNumber(seg.value, config.lang)} ${config.unit}`
                        : undefined
                    }
                    style={interactive ? { cursor: "pointer" } : undefined}
                    onMouseEnter={
                      interactive
                        ? () => setHover({ col: ci, seg: si })
                        : undefined
                    }
                    onMouseLeave={
                      interactive ? () => setHover(null) : undefined
                    }
                    onFocus={
                      interactive
                        ? () => setHover({ col: ci, seg: si })
                        : undefined
                    }
                    onBlur={interactive ? () => setHover(null) : undefined}
                  />
                );
              })}
              {/* category (e.g. year) label under the column — wrapped onto ≤2 lines
                  (never a truncated/overflowing stub), stacked downward */}
              {catLinesByCol[ci].map((ln, li) => (
                <text
                  key={`cat${li}`}
                  className="cat-label"
                  x={col.bandX + col.bandW / 2}
                  y={innerHeight + 20 * sc + li * catLineH}
                  textAnchor="middle"
                  fontSize={ts.axis}
                  fill={C.ink}
                  opacity={catOp}
                >
                  {ln}
                </text>
              ))}
              {/* column total on top (only when totals carry meaning) */}
              {totalsVary && (
                <text
                  x={col.bandX + col.bandW / 2}
                  y={
                    base -
                    col.segments.reduce((acc, g) => acc + g.h, 0) -
                    6 * sc
                  }
                  textAnchor="middle"
                  fontSize={ts.axis}
                  fontWeight={700}
                  fill={C.ink}
                  opacity={totalOp}
                >
                  {formatNumber(col.total, config.lang)}
                </text>
              )}
            </g>
          );
        })}

        {/* zero baseline (over the gridlines) */}
        <line
          x1={0}
          x2={innerWidth}
          y1={base}
          y2={base}
          stroke={C.axis}
          strokeWidth={1}
          opacity={chrome}
        />

        {/* series legend under the plot (fades in with the chrome) */}
        <g className="chart-legend" opacity={chrome}>
          {legend.map((it, i) => (
            <g key={`lg${i}`}>
              <rect
                x={it.x}
                y={it.y - 11 * sc}
                width={13 * sc}
                height={13 * sc}
                rx={2}
                fill={it.color}
              />
              <text
                x={it.x + 19 * sc}
                y={it.y}
                dy="0.32em"
                fontSize={ts.axis}
                fontWeight={600}
                fill={C.ink}
              >
                {it.text}
              </text>
            </g>
          ))}
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
  layout: StackedLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: { col: number; seg: number };
  config: StackedConfig;
}) {
  const col = layout.columns[hover.col];
  const seg = col.segments[hover.seg];
  const left = padding.left + seg.x + seg.w / 2 + 12;
  const top = padding.top + seg.y - 8;
  const share = col.total > 0 ? Math.round((seg.value / col.total) * 100) : 0;
  return (
    <div
      className="tooltip"
      style={{
        position: "absolute",
        left,
        top,
        background: COLORS.ink,
        border: tooltipBorder(config.themeBg),
        color: "#fff",
        padding: "6px 10px",
        borderRadius: 6,
        fontSize: 13,
        whiteSpace: "nowrap",
        pointerEvents: "none",
        transform: "translateY(-100%)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <strong>{seg.seriesKey}</strong> {formatNumber(seg.value, config.lang)}{" "}
      <span style={{ opacity: 0.8 }}>{config.unit}</span>
      <div style={{ opacity: 0.7, fontSize: 11 }}>
        {String(col.rawCat)} · {share}% of total
      </div>
    </div>
  );
}
