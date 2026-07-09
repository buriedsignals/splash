// THE one streamgraph component — a stacked area with NO fixed baseline: bands
// flow around a centred wiggling axis, thickness ∝ value. D3 = math
// (streamgraph-geometry.ts: stack + wiggle offset; d3-shape area for the smooth
// silhouette), React = DOM, one master `progress` grows each band from its own
// centre-line. responsive=false = fixed (video/static); responsive=true = flow.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: Okabe-Ito palette + WCAG (in-band
//     label contrast) + title=insight + cited source (ChartFrame +
//     checkStreamgraphConformance), scale via resolveFrame.
//   - TYPE-specific: the free wiggle baseline, the smooth band silhouettes, the
//     direct in-band labels (no value axis), and the grow-from-centre reveal.
import { useState } from "react";
import {
  computeStreamgraphLayout,
  growStream,
  type StreamgraphData,
  type StreamgraphLayout,
} from "./streamgraph-geometry";
import { area, curveBasis } from "d3-shape";
import { clamp01, easeOutCubic, stagger } from "./core/math";
import { COLORS, FONT, TYPE, OKABE_ITO } from "./core/tokens";
import { relativeLuminance } from "./core/conformance";
import { ChartFrame } from "./core/ChartFrame";
import type { Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";

export interface StreamgraphConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  unit: string; // subtitle
  xField: string;
  seriesFields: string[];
  rows: Record<string, string | number>[];
}

export interface StreamgraphChartProps {
  config: StreamgraphConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

const STREAM_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.green,
  OKABE_ITO.purple,
  OKABE_ITO.vermillion,
  OKABE_ITO.skyblue,
  OKABE_ITO.yellow,
];

const labelColor = (hex: string) =>
  relativeLuminance(hex) < 0.5 ? "#FFFFFF" : COLORS.ink;

export function StreamgraphChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: StreamgraphChartProps) {
  const p = clamp01(progress);
  const s = responsive ? 1 : scale;
  const charsPerLine = Math.max(
    8,
    Math.floor((width - 48 * s) / (TYPE.title * s * 0.52)),
  );
  const titleLines = responsive
    ? Math.max(1, Math.ceil(config.title.length / Math.floor(width / 11)))
    : Math.max(1, Math.ceil(config.title.length / charsPerLine));
  const basePad = {
    top: responsive ? 14 : 50 + titleLines * 27,
    right: 16,
    bottom: 52, // time captions, clear of the source line
    left: 16,
  };
  const frame = resolveFrameWithHeader(config.title, config.unit, width, height, basePad, scale, 0.6, responsive);
  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;

  const data: StreamgraphData = {
    xField: config.xField,
    seriesFields: config.seriesFields,
    rows: config.rows,
  };
  const layout = computeStreamgraphLayout(data, { width, height, padding });

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <StreamgraphSvg
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

function StreamgraphSvg({
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
  layout: StreamgraphLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: StreamgraphConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { innerWidth, innerHeight, bands, xTicks } = layout;
  const n = bands.length;
  const chrome = easeOutCubic(p / 0.16);
  const labelOp = clamp01((p - 0.6) / 0.3);

  const areaGen = area<{ x: number; y0: number; y1: number }>()
    .x((d) => d.x)
    .y0((d) => d.y0)
    .y1((d) => d.y1)
    .curve(curveBasis);

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
        {/* time captions along the bottom (wipe in) */}
        <g opacity={chrome}>
          {xTicks.map((t, i) => (
            <text
              key={`x${i}`}
              x={t.pos}
              y={innerHeight + 20 * sc}
              textAnchor={
                i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"
              }
              fontSize={ts.axis}
              fontWeight={600}
              fill={COLORS.ink}
            >
              {t.label}
            </text>
          ))}
        </g>

        {/* bands — grow from each band's own centre-line */}
        {bands.map((b, bi) => {
          const ap = easeOutCubic(stagger(p, bi, n, 0.12, 0.5 / n, 0.4));
          if (ap <= 0) return null;
          const pts = growStream(b, ap);
          const color = STREAM_COLORS[b.seriesIndex % STREAM_COLORS.length];
          const focused = interactive && hover === b.seriesIndex;
          const dim = interactive && hover !== null && !focused;
          const show = b.labelThickness > 18 * sc;
          // keep the centred label fully inside the plot horizontally.
          const halfW = (b.seriesKey.length * ts.axis * 0.6) / 2;
          const lx = Math.max(
            halfW + 2,
            Math.min(innerWidth - halfW - 2, b.labelX),
          );
          return (
            <g key={`b${b.seriesKey}`} opacity={dim ? 0.45 : 1}>
              <path
                d={areaGen(pts) ?? ""}
                fill={color}
                stroke="#fff"
                strokeWidth={0.8 * sc}
                tabIndex={interactive ? 0 : undefined}
                role={interactive ? "img" : undefined}
                aria-label={
                  interactive
                    ? `${b.seriesKey}: peaks at ${Math.round(b.maxValue)} ${config.unit}`
                    : undefined
                }
                style={
                  interactive
                    ? { cursor: "pointer", outline: "none" }
                    : undefined
                }
                onMouseEnter={
                  interactive ? () => setHover(b.seriesIndex) : undefined
                }
                onMouseLeave={interactive ? () => setHover(null) : undefined}
                onFocus={
                  interactive ? () => setHover(b.seriesIndex) : undefined
                }
                onBlur={interactive ? () => setHover(null) : undefined}
              />
              {show && (
                <text
                  x={lx}
                  y={b.labelY}
                  dy="0.32em"
                  textAnchor="middle"
                  fontSize={ts.axis}
                  fontWeight={700}
                  fill={labelColor(color)}
                  opacity={labelOp}
                  pointerEvents="none"
                >
                  {b.seriesKey}
                </text>
              )}
            </g>
          );
        })}
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
  layout: StreamgraphLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: StreamgraphConfig;
}) {
  const b = layout.bands.find((x) => x.seriesIndex === hover);
  if (!b) return null;
  const left = padding.left + b.labelX;
  const top = padding.top + b.labelY - 14;
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
      <strong style={{ fontSize: 13 }}>{b.seriesKey}</strong>
      <div style={{ opacity: 0.8, fontSize: 11 }}>
        peaks at {Math.round(b.maxValue)} {config.unit}
      </div>
    </div>
  );
}
