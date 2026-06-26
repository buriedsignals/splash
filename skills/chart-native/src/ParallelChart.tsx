// THE one parallel-coordinates component — several variables on parallel vertical
// axes (each its own scale); each item is a polyline crossing every axis. D3 =
// math (parallel-geometry.ts), React = DOM, one master `progress` draws the lines
// left→right via a clip wipe. A few items are accented; the rest are context.
// responsive=false = fixed (video/static); responsive=true = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: Okabe-Ito accents + WCAG + title=
//     insight + cited source (ChartFrame + checkParallelConformance), scale via
//     resolveFrame, core/text.truncate, the shared core/legend + legendRowCount.
//   - TYPE-specific: the per-axis scales, the highlight-vs-grey polylines, and the
//     left→right clip-wipe reveal.
import { useState } from "react";
import {
  computeParallelLayout,
  type ParallelData,
  type ParallelLayout,
} from "./parallel-geometry";
import { line, curveLinear } from "d3-shape";
import { clamp01, easeInOutCubic, easeOutCubic } from "./core/math";
import { COLORS, FONT, TYPE, OKABE_ITO } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import { resolveFrame } from "./core/format";
import { layoutLegend, legendRowCount } from "./core/legend";
import { truncate } from "./core/text";

export interface ParallelConfig {
  title: string;
  source: { name: string; url: string };
  unit: string; // subtitle
  dimensions: { key: string; label: string }[];
  highlight?: string[];
  items: Record<string, string | number>[];
}

export interface ParallelChartProps {
  config: ParallelConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

const ACCENTS = [OKABE_ITO.blue, OKABE_ITO.orange, OKABE_ITO.green];

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

export function ParallelChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: ParallelChartProps) {
  const p = clamp01(progress);
  const s = responsive ? 1 : scale;
  const charsPerLine = Math.max(
    8,
    Math.floor((width - 48 * s) / (TYPE.title * s * 0.52)),
  );
  const titleLines = responsive
    ? Math.max(1, Math.ceil(config.title.length / Math.floor(width / 11)))
    : Math.max(1, Math.ceil(config.title.length / charsPerLine));

  const accentOf = new Map<string, string>();
  (config.highlight ?? []).forEach((label, i) =>
    accentOf.set(label, ACCENTS[i % ACCENTS.length]),
  );
  const colorOf = (label: string, hl: boolean) =>
    hl ? (accentOf.get(label) ?? ACCENTS[0]) : COLORS.muted;

  const LEG_ROW = 20;
  const legendRows = legendRowCount(
    config.highlight ?? [],
    width - 40,
    TYPE.axis * 0.6,
    LEG_ROW,
  );
  const basePad = {
    top: (responsive ? 16 : 50 + titleLines * 27) + 18, // + axis-name band
    right: 16,
    bottom: 30 + (config.highlight?.length ? legendRows * LEG_ROW + 24 : 0),
    left: 16,
  };
  const frame = responsive
    ? { scale: 1, pad: basePad, type: TYPE }
    : resolveFrame(width, height, basePad, scale, 0.6);
  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;

  const data: ParallelData = {
    dimensions: config.dimensions,
    items: config.items,
    highlight: config.highlight,
  };
  const layout = computeParallelLayout(data, { width, height, padding });

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <ParallelSvg
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

function ParallelSvg({
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
  layout: ParallelLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: ParallelConfig;
  colorOf: (label: string, hl: boolean) => string;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { innerWidth, innerHeight, axes, lines } = layout;
  const chrome = easeOutCubic(p / 0.18);
  const reveal = easeInOutCubic(p);
  const clipW = innerWidth * reveal + 1;
  const clipId = "parallel-wipe";

  const lineGen = line<{ x: number; y: number }>()
    .x((d) => d.x)
    .y((d) => d.y)
    .curve(curveLinear);

  const highlights = config.highlight ?? [];
  const legend = layoutLegend(
    highlights,
    highlights.map((_, i) => ACCENTS[i % ACCENTS.length]),
    innerWidth,
    0,
    innerHeight + 34 * sc,
    ts.axis * 0.6,
    20 * sc,
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
      <title>{config.title}</title>
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={-padding.top} width={clipW} height={height} />
        </clipPath>
      </defs>
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* axes + names + end values (fade in) */}
        <g opacity={chrome}>
          {axes.map((a, i) => (
            <g key={`ax${i}`}>
              <line
                x1={a.x}
                x2={a.x}
                y1={0}
                y2={innerHeight}
                stroke={COLORS.axis}
                strokeWidth={1}
              />
              <text
                x={a.x}
                y={-10 * sc}
                textAnchor={
                  i === 0 ? "start" : i === axes.length - 1 ? "end" : "middle"
                }
                fontSize={ts.axis}
                fontWeight={700}
                fill={COLORS.ink}
              >
                {truncate(
                  a.label,
                  (innerWidth / Math.max(1, axes.length - 1)) * 0.62,
                  ts.axis,
                )}
              </text>
              <text
                x={a.x + (i === 0 ? 4 : i === axes.length - 1 ? -4 : 4) * sc}
                y={a.yTop - 4 * sc}
                textAnchor={i === axes.length - 1 ? "end" : "start"}
                fontSize={ts.source}
                fill={COLORS.muted}
              >
                {fmt(a.maxVal)}
              </text>
              <text
                x={a.x + (i === 0 ? 4 : i === axes.length - 1 ? -4 : 4) * sc}
                y={a.yBottom + 12 * sc}
                textAnchor={i === axes.length - 1 ? "end" : "start"}
                fontSize={ts.source}
                fill={COLORS.muted}
              >
                {fmt(a.minVal)}
              </text>
            </g>
          ))}
        </g>

        {/* polylines — drawn left→right; highlighted on top */}
        <g clipPath={`url(#${clipId})`}>
          {[...lines]
            .sort((a, b) => Number(a.highlighted) - Number(b.highlighted))
            .map((ln) => {
              const color = colorOf(ln.label, ln.highlighted);
              const focused = interactive && hover === ln.index;
              const dim =
                (interactive && hover !== null && !focused) ||
                (!ln.highlighted && hover === null);
              const w = (ln.highlighted ? 2.4 : 1.3) * sc;
              return (
                <g
                  key={`ln${ln.index}`}
                  opacity={dim ? (ln.highlighted ? 0.55 : 0.3) : 1}
                >
                  <path
                    d={lineGen(ln.points) ?? ""}
                    fill="none"
                    stroke={color}
                    strokeWidth={focused ? w + 1 : w}
                    strokeLinejoin="round"
                  />
                  {interactive && (
                    <path
                      d={lineGen(ln.points) ?? ""}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={12 * sc}
                      tabIndex={0}
                      role="img"
                      aria-label={`${ln.label}: ${config.dimensions.map((d) => `${d.label} ${config.items[ln.index][d.key]}`).join(", ")}`}
                      style={{ cursor: "pointer", outline: "none" }}
                      onMouseEnter={() => setHover(ln.index)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(ln.index)}
                      onBlur={() => setHover(null)}
                    />
                  )}
                </g>
              );
            })}
        </g>

        {/* legend below */}
        <g opacity={chrome}>
          {legend.map((it, i) => (
            <g key={`lg${i}`}>
              <line
                x1={it.x}
                x2={it.x + 16 * sc}
                y1={it.y}
                y2={it.y}
                stroke={it.color}
                strokeWidth={3 * sc}
              />
              <text
                x={it.x + 22 * sc}
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
  layout: ParallelLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: ParallelConfig;
  colorOf: (label: string, hl: boolean) => string;
}) {
  const ln = layout.lines.find((x) => x.index === hover);
  if (!ln) return null;
  const mid = ln.points[Math.floor(ln.points.length / 2)];
  const left = padding.left + mid.x;
  const top = padding.top + mid.y - 12;
  const item = config.items[hover];
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
      <strong
        style={{ color: colorOf(ln.label, ln.highlighted), fontSize: 13 }}
      >
        {ln.label}
      </strong>
      <div style={{ fontSize: 11, opacity: 0.85, marginTop: 1 }}>
        {config.dimensions.map((d) => `${d.label} ${item[d.key]}`).join(" · ")}
      </div>
    </div>
  );
}
