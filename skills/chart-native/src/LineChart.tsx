// THE ONE component. Frame-driven by a single `progress` prop (0 -> 1).
// - static  : rendered at progress=1, screenshotted to PNG (responsive=false).
// - video   : Remotion computes eased progress per frame (responsive=false).
//   Both keep the FIXED absolute layout → pixel-identical, frame-deterministic.
// - interactive : responsive=true → a flow layout (title above the plot, not
//   overlapping it) with a width-aware x-tick count, so it re-lays-out cleanly
//   from mobile to desktop. The geometry is identical; only the container and
//   the reserved title space differ.
//
// D3 does the math (chart-geometry.ts, framework-free); React only renders DOM.
// The component itself has NO clock/randomness — everything is a pure function
// of `progress` (Tom's discipline). The clock lives in InteractiveLineChart.

import { useState } from "react";
import {
  computeChartLayout,
  revealLine,
  revealHead,
  formatNumber,
  clamp01,
  type ChartData,
  type Dims,
  type Layout,
} from "./chart-geometry";
import { COLORS, FONT, TYPE } from "./tokens";

export interface ChartConfig {
  title: string; // = the insight (sentence case)
  source: { name: string; url: string };
  unit: string;
  directLabel: string; // direct label over a legend
  xField: string;
  yField: string;
  xType: "time" | "linear";
  points: Record<string, string | number>[];
}

export interface LineChartProps {
  config: ChartConfig;
  progress?: number; // 0..1 reveal; default 1 (final frame)
  width?: number;
  height?: number;
  /** enable the hover tooltip (interactive build only) */
  interactive?: boolean;
  /** flow layout (title above plot) + width-aware ticks, for the web embed.
   *  false (default) keeps the fixed absolute layout used by video + static. */
  responsive?: boolean;
}

export function LineChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
}: LineChartProps) {
  const p = clamp01(progress);

  // Fixed layout reserves 64px at the top for the in-box title; responsive
  // moves the title OUT of the SVG (into normal flow) so only a small gap stays.
  const padding = {
    top: responsive ? 16 : 64,
    right: 140,
    bottom: 52,
    left: 56,
  };
  const dims: Dims = { width, height, padding };
  const data: ChartData = {
    xField: config.xField,
    yField: config.yField,
    xType: config.xType,
    points: config.points,
  };

  // width-aware tick count so labels never collide on narrow embeds (~1 per 110px)
  const innerW = width - padding.left - padding.right;
  const xTickCount = responsive ? Math.max(2, Math.round(innerW / 110)) : 6;
  const layout = computeChartLayout(data, dims, xTickCount);

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <ChartSvg
      layout={layout}
      padding={padding}
      width={width}
      height={height}
      p={p}
      config={config}
      interactive={interactive}
      hover={hover}
      setHover={setHover}
    />
  );

  const tooltip =
    interactive && hover !== null ? (
      <div
        className="tooltip"
        style={{
          position: "absolute",
          left: padding.left + layout.points[hover].x + 12,
          top: padding.top + layout.points[hover].y - 8,
          background: COLORS.ink,
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
        <strong>{formatNumber(layout.points[hover].rawY)}</strong>{" "}
        <span style={{ opacity: 0.8 }}>{config.unit}</span>
        <div style={{ opacity: 0.7, fontSize: 11 }}>
          {String(layout.points[hover].rawX)}
        </div>
      </div>
    ) : null;

  // ---- Responsive: flow layout (header / chart / source stacked) ----
  if (responsive) {
    return (
      <div style={{ width, background: COLORS.bg, fontFamily: FONT }}>
        <div style={{ padding: `4px ${padding.left}px 0` }}>
          <div
            style={{
              fontSize: TYPE.title,
              fontWeight: 700,
              color: COLORS.ink,
              lineHeight: 1.2,
            }}
          >
            {config.title}
          </div>
          <div
            style={{ fontSize: TYPE.axis, color: COLORS.muted, marginTop: 4 }}
          >
            {config.unit}
          </div>
        </div>
        <div style={{ position: "relative", width, height }}>
          {svg}
          {tooltip}
        </div>
        <div
          style={{
            fontSize: TYPE.source,
            color: COLORS.muted,
            padding: `4px ${padding.left}px 8px`,
          }}
        >
          Source: {config.source.name}
        </div>
      </div>
    );
  }

  // ---- Fixed: the original absolute layout (video + static) ----
  return (
    <div
      style={{
        width,
        height,
        background: COLORS.bg,
        fontFamily: FONT,
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 18,
          left: padding.left,
          right: 24,
          fontSize: TYPE.title,
          fontWeight: 700,
          color: COLORS.ink,
          lineHeight: 1.2,
        }}
      >
        {config.title}
      </div>
      <div
        style={{
          position: "absolute",
          top: 18 + TYPE.title * 1.4,
          left: padding.left,
          fontSize: TYPE.axis,
          color: COLORS.muted,
        }}
      >
        {config.unit}
      </div>
      {svg}
      {tooltip}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: padding.left,
          fontSize: TYPE.source,
          color: COLORS.muted,
        }}
      >
        Source: {config.source.name}
      </div>
    </div>
  );
}

// The chart itself — identical geometry for every format/layout.
function ChartSvg({
  layout,
  padding,
  width,
  height,
  p,
  config,
  interactive,
  hover,
  setHover,
}: {
  layout: Layout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: ChartConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
}) {
  const revealed = revealLine(layout, p);
  const head = revealHead(layout, p);
  const lastPoint = layout.points[layout.points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={config.title}
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
      <title>{config.title}</title>
      <g transform={`translate(${padding.left},${padding.top})`}>
        {layout.yTicks.map((t, i) => (
          <g key={`y${i}`}>
            <line
              x1={0}
              x2={layout.innerWidth}
              y1={t.y}
              y2={t.y}
              stroke={COLORS.grid}
              strokeWidth={1}
            />
            <text
              x={-10}
              y={t.y}
              dy="0.32em"
              textAnchor="end"
              fontSize={TYPE.axis}
              fill={COLORS.muted}
            >
              {t.label}
            </text>
          </g>
        ))}
        {layout.xTicks.map((t, i) => (
          <text
            key={`x${i}`}
            x={t.x}
            y={layout.innerHeight + 22}
            textAnchor="middle"
            fontSize={TYPE.axis}
            fill={COLORS.muted}
          >
            {t.label}
          </text>
        ))}
        <line
          x1={0}
          x2={layout.innerWidth}
          y1={layout.innerHeight}
          y2={layout.innerHeight}
          stroke={COLORS.axis}
          strokeWidth={1}
        />

        {revealed && (
          <path
            className="series-line"
            d={revealed}
            fill="none"
            stroke={COLORS.line}
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {p > 0 && p < 1 && (
          <>
            <circle
              cx={head.x}
              cy={head.y}
              r={9}
              fill={COLORS.headGlow}
              opacity={0.25}
            />
            <circle
              cx={head.x}
              cy={head.y}
              r={4.5}
              fill={COLORS.head}
              stroke={COLORS.line}
              strokeWidth={2}
            />
          </>
        )}

        <g opacity={interpolateLabel(p)}>
          <circle cx={lastPoint.x} cy={lastPoint.y} r={4} fill={COLORS.line} />
          <text
            x={lastPoint.x + 10}
            y={lastPoint.y}
            dy="0.32em"
            fontSize={TYPE.label}
            fontWeight={600}
            fill={COLORS.line}
          >
            {config.directLabel}
          </text>
          <text
            x={lastPoint.x + 10}
            y={lastPoint.y + 16}
            dy="0.32em"
            fontSize={TYPE.axis}
            fill={COLORS.muted}
          >
            {formatNumber(lastPoint.rawY)}
          </text>
        </g>

        {interactive &&
          layout.points.map((pt, i) => (
            <circle
              key={`hit${i}`}
              cx={pt.x}
              cy={pt.y}
              r={14}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        {interactive && hover !== null && (
          <g pointerEvents="none">
            <circle
              cx={layout.points[hover].x}
              cy={layout.points[hover].y}
              r={5}
              fill={COLORS.line}
              stroke="#fff"
              strokeWidth={2}
            />
          </g>
        )}
      </g>
    </svg>
  );
}

// the direct label fades in over the last 15% of the reveal
function interpolateLabel(p: number): number {
  if (p < 0.85) return 0;
  return clamp01((p - 0.85) / 0.15);
}
