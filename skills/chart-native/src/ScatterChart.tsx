// THE one scatter/bubble component — third cartesian type. Same discipline:
// D3 = math (scatter-geometry.ts), React = DOM, one master `progress` drives a
// motion build that is a pure function of progress. responsive=false keeps the
// fixed absolute layout (video + static); responsive=true is the flow layout.
//
// Motion (knowledge/references/chart/types/scatter.md + formats/video.md):
//   chrome (both axes + gridlines) wipes in → dots POP IN in place (scale 0→1,
//   slight bloom), staggered left→right → the outlier label fades in last.
//   Dots never fly in — position is the encoding.

import { useState } from "react";
import {
  computeScatterLayout,
  type ScatterData,
  type ScatterDims,
  type ScatterLayout,
} from "./scatter-geometry";
import { formatNumber, clamp01, easeOutCubic, stagger } from "./core/math";
import { COLORS, FONT, TYPE } from "./core/tokens";

export interface ScatterConfig {
  title: string; // the insight (sentence case)
  source: { name: string; url: string };
  xField: string;
  yField: string;
  sizeField?: string;
  labelField?: string;
  xLabel: string; // axis title — what x means
  yLabel: string; // axis title — what y means
  /** which dots get a text label. "auto" (default) = all when ≤12 named points,
   *  else just the outlier. "all" | "outliers" | "none" force it. */
  labelPoints?: "auto" | "all" | "outliers" | "none";
  rows: Record<string, string | number>[];
}

export interface ScatterChartProps {
  config: ScatterConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
}

const PADDING = (responsive: boolean) => ({
  top: responsive ? 16 : 64,
  right: 40,
  bottom: 60,
  left: 64,
});

export function ScatterChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
}: ScatterChartProps) {
  const p = clamp01(progress);
  const padding = PADDING(responsive);
  const dims: ScatterDims = { width, height, padding };
  const data: ScatterData = {
    xField: config.xField,
    yField: config.yField,
    sizeField: config.sizeField,
    labelField: config.labelField,
    rows: config.rows,
  };
  const layout = computeScatterLayout(data, dims);
  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <ScatterSvg
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
      <Tooltip
        layout={layout}
        padding={padding}
        hover={hover}
        config={config}
      />
    ) : null;

  if (responsive) {
    return (
      <div style={{ width, background: COLORS.bg, fontFamily: FONT }}>
        <div style={{ padding: "4px 24px 0" }}>
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
        </div>
        <div style={{ position: "relative", width, height }}>
          {svg}
          {tooltip}
        </div>
        <div
          style={{
            fontSize: TYPE.source,
            color: COLORS.muted,
            padding: "4px 24px 8px",
          }}
        >
          Source:{" "}
          {config.source.url ? (
            <a
              href={config.source.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: COLORS.muted }}
            >
              {config.source.name}
            </a>
          ) : (
            config.source.name
          )}
        </div>
      </div>
    );
  }

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
          left: 24,
          right: 24,
          fontSize: TYPE.title,
          fontWeight: 700,
          color: COLORS.ink,
          lineHeight: 1.2,
        }}
      >
        {config.title}
      </div>
      {svg}
      {tooltip}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 24,
          fontSize: TYPE.source,
          color: COLORS.muted,
        }}
      >
        Source: {config.source.name}
      </div>
    </div>
  );
}

function ScatterSvg({
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
  layout: ScatterLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: ScatterConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
}) {
  const { innerWidth, innerHeight, points } = layout;
  const n = points.length;
  const chrome = easeOutCubic(p / 0.18);
  // dots pop in, staggered LEFT→RIGHT along x (the eye reads the spread building
  // from the origin) — rank by screen x, independent of row order.
  const xRank = new Array<number>(n);
  points
    .map((pt, i) => ({ i, x: pt.x }))
    .sort((a, b) => a.x - b.x)
    .forEach((o, r) => (xRank[o.i] = r));
  const popP = (i: number) => stagger(p, xRank[i], n, 0.18, 0.5 / n, 0.4);
  // a mild bloom: overshoot mid-pop, settle to 1
  const bloom = (s: number) => s * (1 + 0.16 * Math.sin(clamp01(s) * Math.PI));
  const labelOpacity = clamp01((p - 0.85) / 0.15);

  // Which points to label. With few named points (≤12) a static can't rely on
  // hover, so label them ALL (scatter.md "label the few that matter" → here the
  // few IS all). With many, label only the headline outlier to avoid clutter.
  const strategy = config.labelPoints ?? "auto";
  const outlier = points.reduce(
    (mi, pt, i, a) => (pt.rawY > a[mi].rawY ? i : mi),
    0,
  );
  const labeled: number[] =
    strategy === "none"
      ? []
      : strategy === "all" || (strategy === "auto" && n <= 12)
        ? points.map((pt, i) => (pt.label ? i : -1)).filter((i) => i >= 0)
        : points[outlier]?.label
          ? [outlier]
          : [];

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
        {/* chrome: gridlines + axis ticks + axis titles */}
        <g opacity={chrome}>
          {layout.yTicks.map((t, i) => (
            <g key={`y${i}`}>
              <line
                x1={0}
                x2={innerWidth}
                y1={t.pos}
                y2={t.pos}
                stroke={COLORS.grid}
                strokeWidth={1}
              />
              <text
                x={-10}
                y={t.pos}
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
              x={t.pos}
              y={innerHeight + 20}
              textAnchor="middle"
              fontSize={TYPE.axis}
              fill={COLORS.muted}
            >
              {t.label}
            </text>
          ))}
          {/* axis titles (what the numbers mean) */}
          <text
            x={innerWidth / 2}
            y={innerHeight + 44}
            textAnchor="middle"
            fontSize={TYPE.axis}
            fontWeight={600}
            fill={COLORS.muted}
          >
            {config.xLabel}
          </text>
          <text
            x={-10}
            y={-6}
            textAnchor="start"
            fontSize={TYPE.axis}
            fontWeight={600}
            fill={COLORS.muted}
          >
            {config.yLabel}
          </text>
          <line
            x1={0}
            x2={0}
            y1={0}
            y2={innerHeight}
            stroke={COLORS.axis}
            strokeWidth={1}
          />
          <line
            x1={0}
            x2={innerWidth}
            y1={innerHeight}
            y2={innerHeight}
            stroke={COLORS.axis}
            strokeWidth={1}
          />
        </g>

        {/* dots — pop in place */}
        {points.map((pt, i) => {
          const s = bloom(popP(i));
          const r = pt.r * s;
          const focused = interactive && hover === i;
          return (
            <circle
              key={`d${i}`}
              className="scatter-dot"
              cx={pt.x}
              cy={pt.y}
              r={r}
              fill={COLORS.line}
              fillOpacity={0.72}
              stroke={focused ? "#fff" : "none"}
              strokeWidth={focused ? 2 : 0}
              tabIndex={interactive ? 0 : undefined}
              role={interactive ? "img" : undefined}
              aria-label={interactive ? pointAria(pt, config) : undefined}
              style={interactive ? { cursor: "pointer" } : undefined}
              onMouseEnter={interactive ? () => setHover(i) : undefined}
              onMouseLeave={interactive ? () => setHover(null) : undefined}
              onFocus={interactive ? () => setHover(i) : undefined}
              onBlur={interactive ? () => setHover(null) : undefined}
            />
          );
        })}

        {/* point labels (fade in last) — each flips to the left of its dot when
            it would overflow the right edge (narrow embeds) */}
        {labeled.map((idx) => {
          const pt = points[idx];
          const flip = pt.x + pt.r + 70 > innerWidth;
          return (
            <text
              key={`lbl${idx}`}
              x={flip ? pt.x - pt.r - 6 : pt.x + pt.r + 6}
              y={pt.y}
              dy="0.32em"
              textAnchor={flip ? "end" : "start"}
              fontSize={TYPE.axis}
              fontWeight={600}
              fill={COLORS.line}
              opacity={labelOpacity}
            >
              {pt.label}
            </text>
          );
        })}
      </g>
    </svg>
  );
}

function pointAria(
  pt: { rawX: number; rawY: number; rawSize?: number; label?: string },
  config: ScatterConfig,
): string {
  const base = `${pt.label ? pt.label + ": " : ""}${config.xLabel} ${formatNumber(pt.rawX)}, ${config.yLabel} ${formatNumber(pt.rawY)}`;
  return pt.rawSize !== undefined
    ? `${base}, ${config.sizeField} ${formatNumber(pt.rawSize)}`
    : base;
}

function Tooltip({
  layout,
  padding,
  hover,
  config,
}: {
  layout: ScatterLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: ScatterConfig;
}) {
  const pt = layout.points[hover];
  return (
    <div
      className="tooltip"
      style={{
        position: "absolute",
        left: padding.left + pt.x + 12,
        top: padding.top + pt.y - 8,
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
      {pt.label && <strong>{pt.label}</strong>}
      <div style={{ opacity: 0.85 }}>
        {config.xLabel}: {formatNumber(pt.rawX)}
      </div>
      <div style={{ opacity: 0.85 }}>
        {config.yLabel}: {formatNumber(pt.rawY)}
      </div>
    </div>
  );
}
