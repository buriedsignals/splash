// THE one Marimekko / mosaic component — part-to-whole in 2-D: column WIDTH = the
// column's share, segment HEIGHT = the series' within-column share, so a cell's
// AREA is its joint share. D3 = math (marimekko-geometry.ts), React = DOM, one
// master `progress` fades/scales the cells in by column. responsive=false = fixed
// layout (video/static); responsive=true = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: Okabe-Ito categorical palette + WCAG
//     (in-cell label colour by cell luminance) + title=insight + source (ChartFrame
//     + conformance), scale via resolveFrame, the shared core/legend.
//   - TYPE-specific: the variable-width × stacked geometry (area = joint share),
//     the top column-share labels, and the column-by-column fade/scale reveal.
import { useState } from "react";
import {
  computeMarimekkoLayout,
  type MarimekkoData,
  type MarimekkoLayout,
} from "./marimekko-geometry";
import { clamp01, easeOutCubic, stagger } from "./core/math";
import {
  COLORS,
  FONT,
  TYPE,
  OKABE_ITO,
  themeColors,
  tooltipBorder,
} from "./core/tokens";
import { labelInkOnFill } from "./core/conformance";
import { ChartFrame } from "./core/ChartFrame";
import type { Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";
import { layoutLegend } from "./core/legend";

export interface MarimekkoConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  unit: string;
  seriesFields: string[];
  columns: { label: string; weight: number; values: number[] }[];
  /** newsroom house theme GROUND (F2 house `theme`) — every furniture token (ink, muted,
   *  axis, grid, bg) derives from this hex. Undefined = the light default (byte-identical). */
  themeBg?: string;
  /** newsroom house hue (spec `baseColor`): tints the FURNITURE greys (muted/axis/grid) and
   *  the frame's title band toward the house colour. Cells carry the fixed Okabe-Ito series
   *  palette (and their in-cell percent label is picked per-fill by labelInkOnFill, which is
   *  theme-independent), so the hue never touches them. Undefined = untinted. */
  baseColor?: string;
}

export interface MarimekkoChartProps {
  config: MarimekkoConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

// Exported so the WCAG in-fill-label guard (label-ink-on-fill.test) binds the
// max-contrast invariant to the REAL painted palette, catching a future hue that
// clears neither white nor ink — mirrors tokens.ts's TREEMAP_GROUP_COLORS pattern.
export const MK_COLORS = [
  OKABE_ITO.green,
  OKABE_ITO.orange,
  OKABE_ITO.blue,
  OKABE_ITO.purple,
  OKABE_ITO.skyblue,
];

export function MarimekkoChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: MarimekkoChartProps) {
  const p = clamp01(progress);
  const s = responsive ? 1 : scale;
  const charsPerLine = Math.max(
    8,
    Math.floor((width - 48 * s) / (TYPE.title * s * 0.52)),
  );
  const titleLines = responsive
    ? Math.max(1, Math.ceil(config.title.length / Math.floor(width / 11)))
    : Math.max(1, Math.ceil(config.title.length / charsPerLine));
  const legendRowUnscaled = 22;
  // narrow columns can't hold a horizontal top label → rotate them (and reserve
  // a taller top band). Estimate against the column widths (independent of top).
  const estInnerW = width - 32 * s;
  const totalWeight = config.columns.reduce((a, c) => a + c.weight, 0);
  const minColW = Math.min(
    ...config.columns.map((c) => (c.weight / totalWeight) * estInnerW),
  );
  const maxColLabelLen = Math.max(
    ...config.columns.map((c) => c.label.length + 5), // " 100%"
  );
  // when columns are too narrow for a horizontal label, STAGGER the labels onto
  // two rows so adjacent (narrow) columns never collide.
  const staggerColLabels = minColW < maxColLabelLen * TYPE.axis * s * 0.6;
  const colBand = staggerColLabels ? 42 : 22;
  const basePad = {
    top: (responsive ? 16 : 53 + titleLines * 27) + colBand,
    right: 16,
    bottom: 62, // legend (≈32 below the plot, up to 2 rows) — source band reserved in resolveFrameWithHeader
    left: 16,
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
  const data: MarimekkoData = {
    seriesFields: config.seriesFields,
    columns: config.columns,
  };
  const layout = computeMarimekkoLayout(data, { width, height, padding });

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <MarimekkoSvg
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
      legendRowUnscaled={legendRowUnscaled}
      staggerColLabels={staggerColLabels}
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
      themeBg={config.themeBg}
      baseColor={config.baseColor}
    >
      {svg}
    </ChartFrame>
  );
}

function MarimekkoSvg({
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
  staggerColLabels,
}: {
  layout: MarimekkoLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: MarimekkoConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
  legendRowUnscaled: number;
  staggerColLabels: boolean;
}) {
  const { innerWidth, innerHeight, cols, cells } = layout;
  const C = themeColors(config.themeBg, config.baseColor);
  const n = cols.length;

  const chrome = easeOutCubic(p / 0.18);
  const colP = (ci: number) => stagger(p, ci, n, 0.18, 0.5 / n, 0.35);

  const legend = layoutLegend(
    config.seriesFields,
    MK_COLORS,
    innerWidth,
    0,
    innerHeight + 32 * sc,
    ts.axis * 0.6,
    22 * sc,
    sc,
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
        {/* cells — fade + scale in, column by column */}
        {cells.map((cell, i) => {
          const a = easeOutCubic(colP(cell.colIndex));
          const cs = 0.6 + 0.4 * a;
          const cw = (cell.w - 1.5 * sc) * cs;
          const ch = (cell.h - 1.5 * sc) * cs;
          const ccx = cell.x + (cell.w - cw) / 2;
          const ccy = cell.y + (cell.h - ch) / 2;
          const fill = MK_COLORS[cell.seriesIndex % MK_COLORS.length];
          const focused = interactive && hover === i;
          const dim = interactive && hover !== null && !focused;
          const showPct = cell.w > 42 * sc && cell.h > 22 * sc;
          return (
            <g key={`c${i}`} opacity={a * (dim ? 0.55 : 1)}>
              <rect
                className="mosaic-cell"
                x={ccx}
                y={ccy}
                width={cw}
                height={ch}
                fill={fill}
                stroke="#fff"
                strokeWidth={1.5 * sc}
                tabIndex={interactive ? 0 : undefined}
                role={interactive ? "img" : undefined}
                aria-label={
                  interactive
                    ? `${cell.colLabel} ${cell.seriesKey}: ${Math.round(cell.share * 100)}% of the channel`
                    : undefined
                }
                style={interactive ? { cursor: "pointer" } : undefined}
                onMouseEnter={interactive ? () => setHover(i) : undefined}
                onMouseLeave={interactive ? () => setHover(null) : undefined}
                onFocus={interactive ? () => setHover(i) : undefined}
                onBlur={interactive ? () => setHover(null) : undefined}
              />
              {showPct && (
                <text
                  x={cell.x + cell.w / 2}
                  y={cell.y + cell.h / 2}
                  dy="0.32em"
                  textAnchor="middle"
                  fontSize={ts.axis}
                  fontWeight={600}
                  fill={labelInkOnFill(fill)}
                  pointerEvents="none"
                >
                  {Math.round(cell.share * 100)}%
                </text>
              )}
            </g>
          );
        })}

        {/* column-share labels along the top — horizontal; on narrow columns they
            stagger onto two rows so adjacent labels never collide, and each is
            clamped inside the plot so the edge columns don't overflow. */}
        {cols.map((c, ci) => {
          const cxm = c.x + c.w / 2;
          const txt = `${c.label} ${Math.round(c.widthShare * 100)}%`;
          const halfW = (txt.length * ts.axis * 0.6) / 2;
          const xc = staggerColLabels
            ? Math.max(halfW, Math.min(innerWidth - halfW, cxm))
            : cxm;
          const yc = staggerColLabels
            ? ci % 2 === 0
              ? -28 * sc
              : -11 * sc
            : -9 * sc;
          return (
            <text
              key={`cl${ci}`}
              x={xc}
              y={yc}
              textAnchor="middle"
              fontSize={ts.axis}
              fontWeight={700}
              fill={C.ink}
              opacity={colP(ci)}
            >
              {txt}
            </text>
          );
        })}

        {/* series legend below the mosaic */}
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
  layout: MarimekkoLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: MarimekkoConfig;
}) {
  const cell = layout.cells[hover];
  const col = layout.cols[cell.colIndex];
  const overall = col.widthShare * cell.share;
  const left = padding.left + cell.x + cell.w / 2;
  const top = padding.top + cell.y + cell.h / 2 - 8;
  return (
    <div
      className="tooltip"
      style={{
        position: "absolute",
        left,
        top,
        transform: "translate(-50%,-100%)",
        background: COLORS.ink,
        border: tooltipBorder(config.themeBg),
        color: "#fff",
        padding: "6px 10px",
        borderRadius: 6,
        fontSize: 13,
        whiteSpace: "nowrap",
        pointerEvents: "none",
        fontFamily: FONT,
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <strong>{cell.seriesKey}</strong>{" "}
      <span style={{ opacity: 0.8 }}>
        {Math.round(cell.share * 100)}% of {cell.colLabel}
      </span>
      <div style={{ opacity: 0.7, fontSize: 11 }}>
        {Math.round(overall * 100)}% of all spend
      </div>
    </div>
  );
}
