// THE one pie/donut component — a NON-cartesian type (no axes), proving the
// core/ engine isn't cartesian-coupled. D3 = math (pie-geometry.ts: angles +
// d3-shape arc), React = DOM, one master `progress` drives an ANGLE SWEEP.
// responsive=false = fixed layout (video/static); responsive=true = flow.
//
// Recipe step 5 (global vs type): label placement is RADIAL here (type-specific
// mechanism), but it reuses the GLOBAL invariant CHECK (withinBounds + overlaps
// from core/labels) so "in-bounds, no overlap" is enforced the same way as
// every other type. Colour: a few CVD-safe Okabe-Ito hues (pie.md).
import { useState } from "react";
import {
  computePieLayout,
  sweepArc,
  sliceProgress,
  type PieData,
  type PieLayout,
} from "./pie-geometry";
import { formatNumber, clamp01, easeOutCubic } from "./core/math";
import { COLORS, FONT, TYPE, PIE_SLICE_COLORS } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";
import { withinBounds, overlaps, type Box } from "./core/labels";

export interface PieConfig {
  title: string;
  source: { name: string; url: string };
  unit: string; // subtitle (what the whole is)
  labelField: string;
  valueField: string;
  donut?: boolean;
  rows: Record<string, string | number>[];
}

export interface PieChartProps {
  config: PieConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

// a few CVD-safe hues, in reading order (pie.md: ≤5 slices)
const SLICE_COLORS = PIE_SLICE_COLORS;

export function PieChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: PieChartProps) {
  const p = clamp01(progress);
  // Two label strategies (recipe step 5 — type-specific placement, global
  // in-bounds/no-overlap invariant). Fixed layout (static/video) puts labels
  // RADIALLY outside the arc, so it needs wide side margins. Responsive narrow
  // widths can't fit radial labels — they'd collapse the donut and collide with
  // the centre — so we shrink the side margins and move labels to a LEGEND below.
  const legendRowH = 26;
  const legendH = responsive ? config.rows.length * legendRowH + 12 : 0;
  const basePad = responsive
    ? { top: 16, right: 24, bottom: legendH + 16, left: 24 }
    : { top: 80, right: 130, bottom: 64, left: 130 };
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
  const data: PieData = {
    labelField: config.labelField,
    valueField: config.valueField,
    rows: config.rows,
  };
  const layout = computePieLayout(
    data,
    { width, height, padding },
    { donut: config.donut, sort: "desc" },
  );
  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <PieSvg
      layout={layout}
      p={p}
      config={config}
      width={width}
      height={height}
      interactive={interactive}
      responsive={responsive}
      hover={hover}
      setHover={setHover}
      ts={ts}
      sc={sc}
    />
  );

  const tooltip =
    interactive && hover !== null ? (
      <Tooltip layout={layout} hover={hover} config={config} />
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
    >
      {svg}
    </ChartFrame>
  );
}

function PieSvg({
  layout,
  p,
  config,
  width,
  height,
  interactive,
  responsive,
  hover,
  setHover,
  ts,
  sc,
}: {
  layout: PieLayout;
  p: number;
  config: PieConfig;
  width: number;
  height: number;
  interactive: boolean;
  responsive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { cx, cy, radius, innerRadius, total, slices } = layout;

  // Radial label placement (type-specific) + the GLOBAL invariant check.
  // Only the FIXED layout uses radial labels; responsive renders a legend below.
  const charW = ts.axis * 0.58;
  const lh = 18 * sc;
  const bounds: Box = { x0: 8, x1: width - 8, y0: 8, y1: height - 8 };
  const placedBoxes: Box[] = [];
  const labels = responsive
    ? []
    : ([...slices]
        .sort((a, b) => b.share - a.share)
        .map((s) => {
          const text = `${s.rawLabel} ${Math.round(s.share * 100)}%`;
          const w = text.length * charW + 6;
          const ax = cx + s.labelX; // anchor just outside the arc
          const ay = cy + s.labelY;
          const anchor: "start" | "end" = s.side === "right" ? "start" : "end";
          const x0 = anchor === "start" ? ax : ax - w;
          const box: Box = { x0, x1: x0 + w, y0: ay - lh / 2, y1: ay + lh / 2 };
          if (!withinBounds(box, bounds)) return null;
          if (placedBoxes.some((b) => overlaps(box, b))) return null;
          placedBoxes.push(box);
          return {
            index: s.index,
            x: ax,
            y: ay,
            anchor,
            text,
            fade: sliceProgress(s, p),
          };
        })
        .filter(Boolean) as {
        index: number;
        x: number;
        y: number;
        anchor: "start" | "end";
        text: string;
        fade: number;
      }[]);

  // Legend (responsive only): a stacked colour-chip list in the reserved bottom
  // band, sorted by share desc — each row fades in with its wedge.
  const legendRowH = 26;
  const legendItems = responsive
    ? [...slices]
        .sort((a, b) => b.share - a.share)
        .map((s, row) => ({
          index: s.index,
          color: SLICE_COLORS[s.index % SLICE_COLORS.length],
          text: `${s.rawLabel} ${Math.round(s.share * 100)}%`,
          y: height - (slices.length - row) * legendRowH - 8,
          fade: sliceProgress(s, p),
        }))
    : [];

  const centerNumber = clamp01((p - 0.85) / 0.15); // donut total fades in last

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={config.title}
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
      <title>{config.title}</title>
      {/* wedges (swept) — centred at (cx, cy) */}
      <g transform={`translate(${cx},${cy})`}>
        {slices.map((s, i) => {
          const d = sweepArc(s, p, radius, innerRadius);
          if (!d) return null;
          const focused = interactive && hover === s.index;
          return (
            <path
              key={`w${i}`}
              className="pie-slice"
              d={d}
              fill={SLICE_COLORS[i % SLICE_COLORS.length]}
              stroke="#fff"
              strokeWidth={2 * sc}
              opacity={interactive && hover !== null && !focused ? 0.65 : 1}
              tabIndex={interactive ? 0 : undefined}
              role={interactive ? "img" : undefined}
              aria-label={
                interactive
                  ? `${s.rawLabel}: ${Math.round(s.share * 100)}% (${formatNumber(s.value)})`
                  : undefined
              }
              style={interactive ? { cursor: "pointer" } : undefined}
              onMouseEnter={interactive ? () => setHover(s.index) : undefined}
              onMouseLeave={interactive ? () => setHover(null) : undefined}
              onFocus={interactive ? () => setHover(s.index) : undefined}
              onBlur={interactive ? () => setHover(null) : undefined}
            />
          );
        })}
        {/* donut centre = the total, fades in last */}
        {config.donut && (
          <g opacity={centerNumber} textAnchor="middle">
            <text
              y={-2 * sc}
              fontSize={ts.title}
              fontWeight={700}
              fill={COLORS.ink}
            >
              {formatNumber(total)}
            </text>
            <text y={18 * sc} fontSize={ts.axis} fill={COLORS.muted}>
              {config.unit}
            </text>
          </g>
        )}
      </g>
      {/* outside labels — name + %, fade in with their wedge (fixed layout) */}
      {labels.map((l) => (
        <text
          key={`l${l.index}`}
          x={l.x}
          y={l.y}
          dy="0.32em"
          textAnchor={l.anchor}
          fontSize={ts.axis}
          fontWeight={600}
          fill={COLORS.ink}
          opacity={l.fade}
        >
          {l.text}
        </text>
      ))}
      {/* legend below the donut (responsive layout) — chip + name + % */}
      {legendItems.map((it) => (
        <g key={`lg${it.index}`} className="chart-legend" opacity={it.fade}>
          <rect
            x={24}
            y={it.y - 11}
            width={13}
            height={13}
            rx={2}
            fill={it.color}
          />
          <text
            x={44}
            y={it.y}
            dy="0.32em"
            fontSize={ts.axis}
            fontWeight={600}
            fill={COLORS.ink}
          >
            {it.text}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Tooltip({
  layout,
  hover,
  config,
}: {
  layout: PieLayout;
  hover: number;
  config: PieConfig;
}) {
  const s = layout.slices.find((x) => x.index === hover);
  if (!s) return null;
  const left = layout.cx + s.labelX;
  const top = layout.cy + s.labelY;
  return (
    <div
      className="tooltip"
      style={{
        position: "absolute",
        left,
        top,
        transform: "translate(-50%,-130%)",
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
      <strong>{s.rawLabel}</strong> {Math.round(s.share * 100)}%
      <div style={{ opacity: 0.7, fontSize: 11 }}>{formatNumber(s.value)}</div>
    </div>
  );
}
