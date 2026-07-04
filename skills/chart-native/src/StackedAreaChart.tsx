// THE one stacked-area component — the CONTINUOUS sibling of the stacked bar:
// filled bands stacked on a continuous time x. D3 = math (stacked-area-geometry.ts:
// d3-shape area), React = DOM, one master `progress` drives a left→right wipe of
// the whole stack (a growing clip). responsive=false = fixed layout (video/static);
// responsive=true = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: baseline-0 (geometry valueDomain),
//     title=insight + Okabe-Ito palette + source + WCAG (ChartFrame + conformance),
//     scale via resolveFrame, the shared core/labels spreadLabels de-collision,
//     direct labels over a legend.
//   - TYPE-specific: the stacked-area geometry and the left→right wipe motion.
import { useState } from "react";
import {
  computeStackedAreaLayout,
  type StackedAreaData,
  type StackedAreaLayout,
} from "./stacked-area-geometry";
import { clamp01, easeInOutCubic, easeOutCubic } from "./core/math";
import { COLORS, FONT, TYPE, OKABE_ITO } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";
import { spreadLabels } from "./core/labels";

export interface StackedAreaConfig {
  title: string;
  source: { name: string; url: string };
  unit: string;
  xField: string;
  seriesFields: string[]; // stacking order, bottom → top
  rows: Record<string, string | number>[];
}

export interface StackedAreaChartProps {
  config: StackedAreaConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

// categorical band colours, in stacking order — all Okabe-Ito (CVD-safe).
const AREA_COLORS = [
  OKABE_ITO.skyblue,
  OKABE_ITO.orange,
  OKABE_ITO.blue,
  OKABE_ITO.green,
  OKABE_ITO.purple,
];

export function StackedAreaChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: StackedAreaChartProps) {
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
    right: 116, // right-edge band labels (name + value)
    bottom: 52, // year axis, clear of the source line below
    left: 44, // % axis
  };
  const frame = resolveFrameWithHeader(config.title, config.unit, width, height, basePad, scale, undefined, responsive);
  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;
  const data: StackedAreaData = {
    xField: config.xField,
    seriesFields: config.seriesFields,
    rows: config.rows,
  };
  // fewer x ticks on a narrow plot so the year labels never collide.
  const innerW = width - padding.left - padding.right;
  const xTickHint = Math.max(2, Math.min(6, Math.floor(innerW / 120)));
  const layout = computeStackedAreaLayout(
    data,
    { width, height, padding },
    xTickHint,
  );

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <StackedAreaSvg
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
    >
      {svg}
    </ChartFrame>
  );
}

function StackedAreaSvg({
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
  layout: StackedAreaLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: StackedAreaConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { innerWidth, innerHeight, bands } = layout;

  const chrome = easeOutCubic(p / 0.18);
  const wipe = easeInOutCubic(p); // left→right reveal of the whole stack
  const labelOp = clamp01((p - 0.7) / 0.3);
  const clipW = Math.max(0.001, innerWidth * wipe);

  // de-collide the right-edge band labels (global core/labels mechanism).
  const minGap = 17 * sc;
  const labelYs = spreadLabels(
    bands.map((b) => ({ index: b.seriesIndex, y: b.labelY })),
    minGap,
    innerHeight,
  );

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={config.title}
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
      <title>{config.title}</title>
      <defs>
        <clipPath id="sa-clip">
          <rect x={0} y={-4} width={clipW} height={innerHeight + 8} />
        </clipPath>
      </defs>
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* y gridlines + % labels (wipe in) */}
        <g opacity={chrome}>
          {layout.valueTicks.map((t, i) => (
            <g key={`g${i}`}>
              <line
                x1={0}
                x2={innerWidth}
                y1={t.pos}
                y2={t.pos}
                stroke={COLORS.grid}
                strokeWidth={1}
              />
              <text
                x={-10 * sc}
                y={t.pos}
                dy="0.32em"
                textAnchor="end"
                fontSize={ts.axis}
                fill={COLORS.muted}
              >
                {t.label}
              </text>
            </g>
          ))}
        </g>

        {/* stacked bands — revealed left→right by the growing clip */}
        <g clipPath="url(#sa-clip)">
          {bands.map((b) => {
            const focused = interactive && hover === b.seriesIndex;
            const dim = interactive && hover !== null && !focused;
            return (
              <path
                key={`b${b.seriesIndex}`}
                className="stacked-area-band"
                d={b.path}
                fill={AREA_COLORS[b.seriesIndex % AREA_COLORS.length]}
                opacity={dim ? 0.45 : 0.82}
                tabIndex={interactive ? 0 : undefined}
                role={interactive ? "img" : undefined}
                aria-label={
                  interactive
                    ? `${b.seriesKey}: ${b.lastValue} ${config.unit} in the latest year`
                    : undefined
                }
                style={interactive ? { cursor: "pointer" } : undefined}
                onMouseEnter={
                  interactive ? () => setHover(b.seriesIndex) : undefined
                }
                onMouseLeave={interactive ? () => setHover(null) : undefined}
                onFocus={
                  interactive ? () => setHover(b.seriesIndex) : undefined
                }
                onBlur={interactive ? () => setHover(null) : undefined}
              />
            );
          })}
          {/* thin white separator on each band's top edge → distinct layers */}
          {bands.map((b) => (
            <path
              key={`sep${b.seriesIndex}`}
              d={b.topLine}
              fill="none"
              stroke="#fff"
              strokeWidth={1.5 * sc}
              strokeLinejoin="round"
            />
          ))}
        </g>

        {/* y gridlines redrawn OVER the (now semi-transparent) bands as faint
            white lines, so the value reference stays readable through the fills */}
        <g opacity={chrome * 0.45}>
          {layout.valueTicks.map((t, i) => (
            <line
              key={`og${i}`}
              x1={0}
              x2={innerWidth}
              y1={t.pos}
              y2={t.pos}
              stroke="#fff"
              strokeWidth={1}
            />
          ))}
        </g>

        {/* x (year) axis labels */}
        <g opacity={chrome}>
          {layout.xTicks.map((t, i) => (
            <text
              key={`x${i}`}
              x={t.pos}
              y={innerHeight + 22 * sc}
              textAnchor="middle"
              fontSize={ts.axis}
              fill={COLORS.ink}
            >
              {t.label}
            </text>
          ))}
        </g>

        {/* right-edge direct band labels (name + latest value), fade in last */}
        <g opacity={labelOp}>
          {bands.map((b) => (
            <text
              key={`l${b.seriesIndex}`}
              x={innerWidth + 8 * sc}
              y={labelYs.get(b.seriesIndex) ?? b.labelY}
              dy="0.32em"
              textAnchor="start"
              fontSize={ts.axis}
              fontWeight={700}
              fill={AREA_COLORS[b.seriesIndex % AREA_COLORS.length]}
            >
              {b.seriesKey} {b.lastValue}
            </text>
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
  layout: StackedAreaLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: StackedAreaConfig;
}) {
  const b = layout.bands.find((x) => x.seriesIndex === hover);
  if (!b) return null;
  const left = padding.left + layout.innerWidth + 8;
  const top = padding.top + b.labelY - 8;
  return (
    <div
      className="tooltip"
      style={{
        position: "absolute",
        left,
        top,
        transform: "translateY(-100%)",
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
      <strong>{b.seriesKey}</strong>{" "}
      <span style={{ opacity: 0.8 }}>
        {b.lastValue} {config.unit}
      </span>
    </div>
  );
}
