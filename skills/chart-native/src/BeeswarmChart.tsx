// THE one beeswarm / strip-plot component — every data point on ONE value axis,
// dodged vertically so none overlap (the "show your data" distribution chart). D3
// = math (beeswarm-geometry.ts: tangent-packing), React = DOM, one master
// `progress` scales each dot's radius from 0, staggered along the value axis.
// responsive=false = fixed (video/static); responsive=true = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: Okabe-Ito category palette + WCAG +
//     title=insight + cited source (ChartFrame + checkBeeswarmConformance), scale
//     via resolveFrame, the shared core/legend.
//   - TYPE-specific: the collision-avoidance dodge, the decorative (centred)
//     perpendicular axis, and the scale-in-from-nothing reveal.
import { useState } from "react";
import {
  computeBeeswarmLayout,
  type BeeswarmData,
  type BeeswarmLayout,
} from "./beeswarm-geometry";
import { clamp01, easeOutCubic, stagger } from "./core/math";
import { COLORS, FONT, TYPE, OKABE_ITO } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import { resolveFrame } from "./core/format";
import { layoutLegend } from "./core/legend";

export interface BeeswarmConfig {
  title: string;
  source: { name: string; url: string };
  valueLabel: string; // subtitle / units
  categories?: string[];
  points: { value: number; label?: string; category?: string }[];
}

export interface BeeswarmChartProps {
  config: BeeswarmConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

const SWARM_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.green,
  OKABE_ITO.purple,
  OKABE_ITO.vermillion,
];

export function BeeswarmChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: BeeswarmChartProps) {
  const p = clamp01(progress);
  const s = responsive ? 1 : scale;
  const charsPerLine = Math.max(
    8,
    Math.floor((width - 48 * s) / (TYPE.title * s * 0.52)),
  );
  const titleLines = responsive
    ? Math.max(1, Math.ceil(config.title.length / Math.floor(width / 11)))
    : Math.max(1, Math.ceil(config.title.length / charsPerLine));
  const hasLegend = (config.categories?.length ?? 0) > 0;
  const basePad = {
    top: responsive ? 14 : 50 + titleLines * 27,
    right: 24,
    bottom: 40 + (hasLegend ? 24 : 0), // value ticks + (optional) legend
    left: 24,
  };
  const frame = responsive
    ? { scale: 1, pad: basePad, type: TYPE }
    : resolveFrame(width, height, basePad, scale, 0.5);
  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;
  const radius = 4.5 * sc;

  const colorIndex = new Map<string, number>();
  (config.categories ?? []).forEach((c, i) => colorIndex.set(c, i));
  const colorOf = (cat?: string) =>
    cat != null && colorIndex.has(cat)
      ? SWARM_COLORS[colorIndex.get(cat)! % SWARM_COLORS.length]
      : OKABE_ITO.blue;

  const data: BeeswarmData = {
    valueLabel: config.valueLabel,
    points: config.points,
    categories: config.categories,
  };
  const layout = computeBeeswarmLayout(
    data,
    { width, height, padding },
    radius,
  );

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <BeeswarmSvg
      layout={layout}
      padding={padding}
      width={width}
      height={height}
      p={p}
      config={config}
      colorOf={colorOf}
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
        colorOf={colorOf}
      />
    ) : null;

  return (
    <ChartFrame
      title={config.title}
      subtitle={config.valueLabel}
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

function BeeswarmSvg({
  layout,
  padding,
  width,
  height,
  p,
  config,
  colorOf,
  interactive,
  hover,
  setHover,
  ts,
  sc,
}: {
  layout: BeeswarmLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: BeeswarmConfig;
  colorOf: (cat?: string) => string;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { innerWidth, innerHeight, nodes, valueTicks, radius } = layout;
  const n = nodes.length;
  const chrome = easeOutCubic(p / 0.16);

  const legend =
    config.categories && config.categories.length
      ? layoutLegend(
          config.categories,
          config.categories.map((c) => colorOf(c)),
          innerWidth,
          0,
          innerHeight + 36 * sc,
          ts.axis * 0.6,
          22 * sc,
          sc,
        ).items
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
        {/* value gridlines + bottom tick labels (wipe in) */}
        <g opacity={chrome * 0.6}>
          {valueTicks.map((t, i) => (
            <line
              key={`g${i}`}
              x1={t.pos}
              x2={t.pos}
              y1={0}
              y2={innerHeight}
              stroke={COLORS.grid}
              strokeWidth={1}
            />
          ))}
        </g>
        <g opacity={chrome}>
          {valueTicks.map((t, i) => (
            <text
              key={`t${i}`}
              x={t.pos}
              y={innerHeight + 18 * sc}
              textAnchor="middle"
              fontSize={ts.source}
              fill={COLORS.muted}
            >
              {t.label}
            </text>
          ))}
        </g>

        {/* the swarm — dots scale in from nothing, staggered along the value axis */}
        {nodes.map((nd) => {
          const ap = easeOutCubic(stagger(p, nd.order, n, 0.15, 0.6 / n, 0.3));
          const color = colorOf(nd.category);
          const focused = interactive && hover === nd.index;
          const dim = interactive && hover !== null && !focused;
          return (
            <circle
              key={`d${nd.index}`}
              cx={nd.x}
              cy={nd.y}
              r={radius * ap * (focused ? 1.35 : 1)}
              fill={color}
              fillOpacity={dim ? 0.35 : 0.9}
              stroke="#fff"
              strokeWidth={0.8 * sc}
              tabIndex={interactive ? 0 : undefined}
              role={interactive ? "img" : undefined}
              aria-label={
                interactive
                  ? `${nd.label ? nd.label + ", " : ""}${nd.category ? nd.category + ", " : ""}${nd.value} ${config.valueLabel}`
                  : undefined
              }
              style={
                interactive ? { cursor: "pointer", outline: "none" } : undefined
              }
              onMouseEnter={interactive ? () => setHover(nd.index) : undefined}
              onMouseLeave={interactive ? () => setHover(null) : undefined}
              onFocus={interactive ? () => setHover(nd.index) : undefined}
              onBlur={interactive ? () => setHover(null) : undefined}
            />
          );
        })}

        {/* category legend below the swarm */}
        <g opacity={chrome}>
          {legend.map((it, i) => (
            <g key={`lg${i}`}>
              <circle
                cx={it.x + 6 * sc}
                cy={it.y - 4 * sc}
                r={6 * sc}
                fill={it.color}
              />
              <text
                x={it.x + 18 * sc}
                y={it.y}
                fontSize={ts.axis}
                fontWeight={600}
                fill={COLORS.ink}
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
  colorOf,
}: {
  layout: BeeswarmLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: BeeswarmConfig;
  colorOf: (cat?: string) => string;
}) {
  const nd = layout.nodes.find((x) => x.index === hover);
  if (!nd) return null;
  const left = padding.left + nd.x;
  const top = padding.top + nd.y - layout.radius - 8;
  const color = colorOf(nd.category);
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
        whiteSpace: "nowrap",
        pointerEvents: "none",
        fontFamily: FONT,
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <strong style={{ fontSize: 13 }}>{nd.value}</strong>
      {nd.category && (
        <span style={{ color, fontSize: 12 }}> · {nd.category}</span>
      )}
      {nd.label && <div style={{ opacity: 0.7, fontSize: 11 }}>{nd.label}</div>}
    </div>
  );
}
