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
  type ChartData,
  type Dims,
  type Layout,
} from "./chart-geometry";
import {
  formatNumber,
  clamp01,
  easeInOutCubic,
  easeOutCubic,
  stagger,
} from "./core/math";
import { COLORS, TYPE } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import { resolveFrame } from "./core/format";

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
  /** typography/margin scale for non-landscape video canvases (default 1). */
  scale?: number;
}

export function LineChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: LineChartProps) {
  const p = clamp01(progress);

  // Fixed layout reserves 64px at the top for the in-box title; responsive
  // moves the title OUT of the SVG (into normal flow). On a square/portrait
  // video canvas, resolveFrame scales the type/margins and centres the plot.
  // Right gutter is SIZED to the direct label so it can never overflow the
  // chart — the label is drawn at the line's end + a gap, inside this margin.
  // (resolveFrame scales both the gutter and the label by the same factor, so
  // the fit holds at any aspect/scale. The label is the widest of the two lines.)
  const labelGutter = 10 + config.directLabel.length * TYPE.label * 0.66 + 16;
  const basePad = {
    top: responsive ? 16 : 64,
    right: Math.max(140, labelGutter),
    bottom: 52,
    left: 56,
  };
  const frame = responsive
    ? { scale: 1, pad: basePad, type: TYPE }
    : resolveFrame(width, height, basePad, scale);
  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;
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

  // The motion build is staged inside ChartSvg as pure functions of the master
  // `progress` (p, LINEAR time): axes wipe in → line draws (head sweeps the
  // x-labels in) → direct label slides in. The line has its OWN ease-in-out over
  // a wide window [0.30, 0.95] so it draws slowly and smoothly (soft start/stop),
  // independent of the other phases — the master is linear, each phase eases itself.
  const lineProgress = easeInOutCubic((p - 0.3) / 0.65); // window 0.30 → 0.95

  const svg = (
    <ChartSvg
      layout={layout}
      padding={padding}
      width={width}
      height={height}
      p={p}
      lineProgress={lineProgress}
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

// The chart itself — identical geometry for every format/layout.
function ChartSvg({
  layout,
  padding,
  width,
  height,
  p,
  lineProgress,
  config,
  interactive,
  hover,
  setHover,
  ts,
  sc,
}: {
  layout: Layout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  lineProgress: number;
  config: ChartConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const lp = lineProgress;
  const revealed = revealLine(layout, lp);
  const head = revealHead(layout, lp);
  const lastPoint = layout.points[layout.points.length - 1];
  const { innerWidth, innerHeight } = layout;

  // --- motion build (all pure functions of the master progress `p`) ---
  // baseline draws left→right first; gridlines wipe in, staggered top→bottom.
  const baseW = innerWidth * easeOutCubic(p / 0.18);
  const nY = layout.yTicks.length;
  // x-axis labels pop in (fade + rise) as the line's draw-head sweeps PAST them
  // — the ramp starts at 0 only once the head crosses the tick, so the first
  // label (which sits under the head before the line starts) is hidden, not
  // pre-visible. A short tail guarantees every label is full by the end (the
  // last tick coincides with the head's final position, so the sweep alone
  // would leave it at 0).
  const xLabelReveal = (tickX: number) =>
    Math.max(clamp01((head.x - tickX) / 28), clamp01((p - 0.9) / 0.05));
  // direct label slides in from the point just after the line completes.
  const labelOpacity = clamp01((p - 0.92) / 0.08);

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
        {/* gridlines: horizontal wipe from the left, staggered bottom→top */}
        {layout.yTicks.map((t, i) => {
          const w = stagger(p, nY - 1 - i, nY, 0.02, 0.03, 0.22);
          const lo = stagger(p, nY - 1 - i, nY, 0.06, 0.03, 0.16);
          return (
            <g key={`y${i}`}>
              <line
                x1={0}
                x2={innerWidth * w}
                y1={t.y}
                y2={t.y}
                stroke={COLORS.grid}
                strokeWidth={1}
              />
              <text
                x={-10 * sc}
                y={t.y}
                dy="0.32em"
                textAnchor="end"
                fontSize={ts.axis}
                fill={COLORS.muted}
                opacity={lo}
                transform={`translate(${-(1 - lo) * 8},0)`}
              >
                {t.label}
              </text>
            </g>
          );
        })}
        {/* x labels: fade + rise, triggered by the sweeping draw-head */}
        {layout.xTicks.map((t, i) => {
          const o = xLabelReveal(t.x);
          return (
            <text
              key={`x${i}`}
              x={t.x}
              y={innerHeight + 22 * sc}
              textAnchor="middle"
              fontSize={ts.axis}
              fill={COLORS.muted}
              opacity={o}
              transform={`translate(0,${(1 - o) * 8})`}
            >
              {t.label}
            </text>
          );
        })}
        {/* baseline draws left→right, first */}
        <line
          x1={0}
          x2={baseW}
          y1={innerHeight}
          y2={innerHeight}
          stroke={COLORS.axis}
          strokeWidth={1}
        />

        {revealed && (
          <path
            className="series-line"
            d={revealed}
            fill="none"
            stroke={COLORS.line}
            strokeWidth={3 * sc}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {lp > 0 && lp < 1 && (
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

        <g
          opacity={labelOpacity}
          transform={`translate(${(1 - labelOpacity) * -12},0)`}
        >
          <circle cx={lastPoint.x} cy={lastPoint.y} r={4} fill={COLORS.line} />
          <text
            x={lastPoint.x + 10 * sc}
            y={lastPoint.y}
            dy="0.32em"
            fontSize={ts.label}
            fontWeight={600}
            fill={COLORS.line}
          >
            {config.directLabel}
          </text>
          <text
            x={lastPoint.x + 10 * sc}
            y={lastPoint.y + 16 * sc}
            dy="0.32em"
            fontSize={ts.axis}
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
              tabIndex={0}
              role="img"
              aria-label={`${pt.rawX}: ${formatNumber(pt.rawY)} ${config.unit}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
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
