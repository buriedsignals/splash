// THE one heatmap component — a 2D grid where COLOUR encodes the value (the first
// such type). D3 = math (heatmap-geometry.ts: sequential Blues ramp), React = DOM,
// one master `progress` drives a diagonal fade+scale wave. responsive=false = fixed
// layout (video/static); responsive=true = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: title=insight + source + WCAG (the
//     in-cell label colour is picked by the cell's luminance — the global contrast
//     rule applied per cell), scale via resolveFrame, ChartFrame.
//   - TYPE-specific: the grid geometry, the SEQUENTIAL CVD-safe ramp (NOT the
//     Okabe-Ito categorical palette — colour is the data here), the colourbar
//     legend, and the diagonal-wave reveal.
import { useState } from "react";
import {
  computeHeatmapLayout,
  type HeatmapData,
  type HeatmapLayout,
} from "./heatmap-geometry";
import { clamp01, easeOutCubic } from "./core/math";
import { COLORS, FONT, TYPE } from "./core/tokens";
import { labelInkOnFill } from "./core/conformance";
import { ChartFrame } from "./core/ChartFrame";
import type { Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";

export interface HeatmapConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  unit: string;
  rowField: string;
  colFields: string[];
  rows: Record<string, string | number>[];
}

export interface HeatmapChartProps {
  config: HeatmapConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

// The in-cell value label takes the shared max-contrast pick (labelInkOnFill):
// whichever of white / ink actually wins by REAL contrast against the cell colour —
// the same rule TreemapChart / DivergingStackedChart use for in-mark labels. A fixed
// luminance threshold (the old `< 0.4 ? white : ink`) mis-picks white on mid-tone
// ramp cells where ink is far more legible (e.g. #70b0d7: white 2.4:1 vs ink 7.3:1),
// which snap-contrast fail-hards on. A continuous ramp's mid-tone cell may top out
// below 4.5:1 with EITHER colour — that residue is covered by the large-bold text
// (WCAG SC 1.4.3) below, not by this colour choice.

// In-cell value labels are the ONE place a chart prints text directly on the data
// colour, and colour here spans a full sequential ramp — so a mid-tone cell has NO
// text colour that clears 4.5:1 (neither white nor ink; max-contrast tops out at
// ~4.16:1). WCAG SC 1.4.3 resolves it: LARGE BOLD text (≥14pt = 18.66px, weight ≥700)
// is conformant at 3:1, which the max-contrast fill always clears. So the value labels
// render at ≥18.66px BOLD — legible AND WCAG-conformant across the whole ramp. Knob.
const VALUE_LABEL_MIN_PX = 19; // ≥ WCAG 14pt-bold large-text floor (18.66px)
// A cell narrower than this hides its value label, so the larger bold number never
// clips its cell (snap-label-fit would otherwise fail-hard). Knob.
const VALUE_LABEL_MIN_CELL_PX = 44;

export function HeatmapChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: HeatmapChartProps) {
  const p = clamp01(progress);
  const s = responsive ? 1 : scale;
  const charsPerLine = Math.max(
    8,
    Math.floor((width - 48 * s) / (TYPE.title * s * 0.52)),
  );
  const titleLines = responsive
    ? 1
    : Math.max(1, Math.ceil(config.title.length / charsPerLine));
  const basePad = {
    top: responsive ? 16 : 53 + titleLines * 27,
    right: 16,
    bottom: 68, // column labels + colourbar (source band reserved in resolveFrameWithHeader)
    left: 52, // row labels
  };
  const frame = resolveFrameWithHeader(
    config.title,
    config.unit,
    width,
    height,
    basePad,
    scale,
    0.62,
    responsive,
  );
  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;
  const data: HeatmapData = {
    rowField: config.rowField,
    colFields: config.colFields,
    rows: config.rows,
  };
  const layout = computeHeatmapLayout(data, { width, height, padding });

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <HeatmapSvg
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
    >
      {svg}
    </ChartFrame>
  );
}

function HeatmapSvg({
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
  layout: HeatmapLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: HeatmapConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { innerWidth, innerHeight, cells, rowLabels, colLabels } = layout;
  const nRows = rowLabels.length;
  const nCols = colLabels.length;
  const maxWave = Math.max(1, nRows - 1 + (nCols - 1));

  const chrome = easeOutCubic(p / 0.18);
  // only label cells wide enough to hold the (large, bold, WCAG-conformant) number
  const showValues = layout.cellW > VALUE_LABEL_MIN_CELL_PX * sc;
  const valueFontPx = Math.max(ts.axis, VALUE_LABEL_MIN_PX * sc);

  // colourbar geometry — RIGHT-aligned under the grid so it clears the source
  // line (which sits bottom-left).
  const barW = Math.min(220 * sc, innerWidth * 0.5);
  const barH = 12 * sc;
  const barX = innerWidth - barW;
  const barY = innerHeight + 34 * sc;
  const [lo, hi] = layout.valueDomain;

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={config.title}
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
      <defs>
        <linearGradient id="heat-grad" x1="0" x2="1" y1="0" y2="0">
          {layout.rampStops.map((c, i) => (
            <stop
              key={i}
              offset={`${(i / (layout.rampStops.length - 1)) * 100}%`}
              stopColor={c}
            />
          ))}
        </linearGradient>
      </defs>
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* cells — diagonal fade + scale wave */}
        {cells.map((cell, i) => {
          const wave = (cell.rowIndex + cell.colIndex) / maxWave;
          const a = easeOutCubic(clamp01((p - 0.1 - wave * 0.5) / 0.32));
          const cs = 0.55 + 0.45 * a; // scale from the cell centre
          const cw = (cell.w - 2 * sc) * cs;
          const ch = (cell.h - 2 * sc) * cs;
          const cx = cell.x + sc + (cell.w - 2 * sc - cw) / 2;
          const cy = cell.y + sc + (cell.h - 2 * sc - ch) / 2;
          const focused = interactive && hover === i;
          const dim = interactive && hover !== null && !focused;
          return (
            <g key={`c${i}`} opacity={a * (dim ? 0.5 : 1)}>
              <rect
                className="heat-cell"
                x={cx}
                y={cy}
                width={cw}
                height={ch}
                rx={2 * sc}
                fill={cell.color}
                stroke={focused ? COLORS.ink : "none"}
                strokeWidth={focused ? 2 * sc : 0}
                tabIndex={interactive ? 0 : undefined}
                role={interactive ? "img" : undefined}
                aria-label={
                  interactive
                    ? `${cell.rowLabel} ${cell.colLabel}: ${cell.value} ${config.unit}`
                    : undefined
                }
                style={interactive ? { cursor: "pointer" } : undefined}
                onMouseEnter={interactive ? () => setHover(i) : undefined}
                onMouseLeave={interactive ? () => setHover(null) : undefined}
                onFocus={interactive ? () => setHover(i) : undefined}
                onBlur={interactive ? () => setHover(null) : undefined}
              />
              {showValues && (
                <text
                  x={cell.x + cell.w / 2}
                  y={cell.y + cell.h / 2}
                  dy="0.32em"
                  textAnchor="middle"
                  fontSize={valueFontPx}
                  fontWeight={700}
                  fill={labelInkOnFill(cell.color)}
                  pointerEvents="none"
                >
                  {cell.value}
                </text>
              )}
            </g>
          );
        })}

        {/* row labels (left) */}
        <g opacity={chrome}>
          {rowLabels.map((lab, r) => (
            <text
              key={`r${r}`}
              x={-10 * sc}
              y={r * layout.cellH + layout.cellH / 2}
              dy="0.32em"
              textAnchor="end"
              fontSize={ts.axis}
              fill={COLORS.ink}
            >
              {lab}
            </text>
          ))}
          {/* column labels (under the grid) — shorten to the start value on
              narrow cells so a range label like "00-04" never collides */}
          {colLabels.map((lab, c) => (
            <text
              key={`cl${c}`}
              x={c * layout.cellW + layout.cellW / 2}
              y={innerHeight + 18 * sc}
              textAnchor="middle"
              fontSize={ts.axis}
              fill={COLORS.ink}
            >
              {layout.cellW < 64 * sc ? lab.split("-")[0] : lab}
            </text>
          ))}
        </g>

        {/* colourbar legend (right-aligned): unit caption left of the bar,
            min/max under its ends */}
        <g opacity={chrome}>
          <text
            x={barX - 10 * sc}
            y={barY + barH / 2}
            dy="0.32em"
            textAnchor="end"
            fontSize={ts.source}
            fill={COLORS.muted}
          >
            {config.unit}
          </text>
          <rect
            x={barX}
            y={barY}
            width={barW}
            height={barH}
            fill="url(#heat-grad)"
            rx={2 * sc}
          />
          <text
            x={barX}
            y={barY + barH + 13 * sc}
            textAnchor="start"
            fontSize={ts.source}
            fill={COLORS.muted}
          >
            {lo}
          </text>
          <text
            x={barX + barW}
            y={barY + barH + 13 * sc}
            textAnchor="end"
            fontSize={ts.source}
            fill={COLORS.muted}
          >
            {hi}
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
  layout: HeatmapLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: HeatmapConfig;
}) {
  const cell = layout.cells[hover];
  if (!cell) return null;
  const left = padding.left + cell.x + cell.w / 2;
  const top = padding.top + cell.y - 6;
  return (
    <div
      className="tooltip"
      style={{
        position: "absolute",
        left,
        top,
        transform: "translate(-50%,-100%)",
        background: COLORS.ink,
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
      <strong>{cell.value}</strong>{" "}
      <span style={{ opacity: 0.8 }}>{config.unit}</span>
      <div style={{ opacity: 0.7, fontSize: 11 }}>
        {cell.rowLabel} · {cell.colLabel}
      </div>
    </div>
  );
}
