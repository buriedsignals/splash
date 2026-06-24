// THE ONE component. Frame-driven by a single `progress` prop (0 -> 1).
// - static  : rendered at progress=1, screenshotted to PNG.
// - interactive : hydrated in the browser, progress=1, hover tooltip.
// - video   : a Remotion composition computes eased progress per frame and
//             passes it here. The component itself has NO clock/randomness —
//             everything is a pure function of `progress` (Tom's discipline).
//
// D3 does the math (chart-geometry.ts, framework-free); React only renders DOM.

import { useState } from "react";
import {
  computeChartLayout,
  linePath,
  revealLine,
  revealHead,
  formatNumber,
  clamp01,
  type ChartData,
  type Dims,
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
}

const DIMS = (width: number, height: number): Dims => ({
  width,
  height,
  padding: { top: 64, right: 140, bottom: 52, left: 56 },
});

export function LineChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
}: LineChartProps) {
  const p = clamp01(progress);
  const dims = DIMS(width, height);
  const data: ChartData = {
    xField: config.xField,
    yField: config.yField,
    xType: config.xType,
    points: config.points,
  };
  const layout = computeChartLayout(data, dims);
  const { padding } = dims;

  const revealed = revealLine(layout, p);
  const head = revealHead(layout, p);
  const lastPoint = layout.points[layout.points.length - 1];

  // alt text = the insight, not the structure (WCAG 1.1.1)
  const alt = config.title;

  const [hover, setHover] = useState<number | null>(null);

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
      {/* Insight title */}
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
      {/* subtitle: unit */}
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

      <svg
        width={width}
        height={height}
        role="img"
        aria-label={alt}
        style={{ position: "absolute", inset: 0 }}
      >
        <title>{alt}</title>
        <g transform={`translate(${padding.left},${padding.top})`}>
          {/* y grid + labels */}
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
          {/* x labels */}
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
          {/* baseline */}
          <line
            x1={0}
            x2={layout.innerWidth}
            y1={layout.innerHeight}
            y2={layout.innerHeight}
            stroke={COLORS.axis}
            strokeWidth={1}
          />

          {/* the revealed line */}
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

          {/* draw-head (the moving tip during the reveal) */}
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

          {/* direct label at the line's end (replaces a legend) — fades in as the
              reveal completes so it isn't floating over empty space mid-animation */}
          <g opacity={interpolateLabel(p)}>
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r={4}
              fill={COLORS.line}
            />
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

          {/* interactive hover targets + tooltip */}
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

      {/* HTML tooltip overlay (interactive) */}
      {interactive && hover !== null && (
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
      )}

      {/* source */}
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

// the direct label fades in over the last 15% of the reveal
function interpolateLabel(p: number): number {
  if (p < 0.85) return 0;
  return clamp01((p - 0.85) / 0.15);
}
