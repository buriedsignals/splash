// THE one sunburst component — a radial hierarchy: the centre is the whole, each
// ring out is a level, each arc's ANGLE ∝ its value. D3 = math
// (sunburst-geometry.ts + d3-shape arc), React = DOM, one master `progress` sweeps
// the rings open from the centre. responsive=false = fixed (video/static);
// responsive=true = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: Okabe-Ito branch palette + WCAG
//     (in-arc label colour by luminance) + title=insight + cited source (ChartFrame
//     + checkSunburstConformance), scale via resolveFrame, core/legend.
//   - TYPE-specific: the radial partition, the depth-lightened branch colours, and
//     the sweep-from-centre reveal.
import { useState } from "react";
import {
  computeSunburstLayout,
  sweepArcEnd,
  type SunburstData,
  type SunburstLayout,
} from "./sunburst-geometry";
import { arc as d3arc } from "d3-shape";
import {
  clamp01,
  easeOutCubic,
  easeInOutCubic,
  formatNumber,
} from "./core/math";
import { COLORS, FONT, TYPE, OKABE_ITO } from "./core/tokens";
import { relativeLuminance } from "./core/conformance";
import { ChartFrame } from "./core/ChartFrame";
import type { Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";
import { layoutLegend, legendRowCount } from "./core/legend";
import { truncate } from "./core/text";

export interface SunburstConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  unit: string; // subtitle
  root: {
    label: string;
    children: { label: string; value?: number; children?: unknown[] }[];
  };
}

export interface SunburstChartProps {
  config: SunburstConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

const BRANCH_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.green,
  OKABE_ITO.purple,
  OKABE_ITO.vermillion,
  OKABE_ITO.skyblue,
  OKABE_ITO.yellow,
];

// lighten a hex toward white by t (deeper rings = lighter)
function lighten(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  const mix = (c: number) => Math.round(c + (255 - c) * t);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

const labelColor = (hex: string) =>
  relativeLuminance(hex) < 0.5 ? "#FFFFFF" : COLORS.ink;

export function SunburstChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: SunburstChartProps) {
  const p = clamp01(progress);
  const s = responsive ? 1 : scale;
  const charsPerLine = Math.max(
    8,
    Math.floor((width - 48 * s) / (TYPE.title * s * 0.52)),
  );
  const titleLines = responsive
    ? Math.max(1, Math.ceil(config.title.length / Math.floor(width / 11)))
    : Math.max(1, Math.ceil(config.title.length / charsPerLine));
  const LEG_ROW = 20;
  const legendRows = legendRowCount(
    config.root.children.map((c) => c.label),
    width - 28,
    TYPE.axis * 0.6,
    LEG_ROW,
  );
  const basePad = {
    top: responsive ? 14 : 50 + titleLines * 27,
    right: 14,
    bottom: 18 + legendRows * LEG_ROW, // branch legend rows (source band reserved in resolveFrameWithHeader)
    left: 14,
  };
  const frame = resolveFrameWithHeader(
    config.title,
    config.unit,
    width,
    height,
    basePad,
    scale,
    1,
    responsive,
  );
  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;

  const data: SunburstData = {
    unit: config.unit,
    root: config.root as unknown as SunburstData["root"],
  };
  const layout = computeSunburstLayout(data, { width, height, padding });

  const [hover, setHover] = useState<number | null>(null);
  const branchColor = (i: number) => BRANCH_COLORS[i % BRANCH_COLORS.length];

  const svg = (
    <SunburstSvg
      layout={layout}
      width={width}
      height={height}
      p={p}
      config={config}
      branchColor={branchColor}
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
        hover={hover}
        config={config}
        branchColor={branchColor}
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

function SunburstSvg({
  layout,
  width,
  height,
  p,
  config,
  branchColor,
  interactive,
  hover,
  setHover,
  ts,
  sc,
}: {
  layout: SunburstLayout;
  width: number;
  height: number;
  p: number;
  config: SunburstConfig;
  branchColor: (i: number) => string;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { cx, cy, radius, ringW, arcs, centerLabel } = layout;
  const chrome = easeOutCubic(p / 0.16);
  const labelOp = clamp01((p - 0.55) / 0.35);

  // rings sweep in order (inner first): a per-depth sub-window of progress
  const maxDepth = Math.max(...arcs.map((a) => a.depth));
  const sweep = (depth: number) => {
    const start = ((depth - 1) / maxDepth) * 0.45;
    return easeInOutCubic(clamp01((p - start) / 0.55));
  };

  const arcGen = d3arc<{ x0: number; x1: number; y0: number; y1: number }>()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .innerRadius((d) => d.y0)
    .outerRadius((d) => d.y1)
    .padAngle(0.004);

  const branchLabels = config.root.children.map((c) => c.label);

  const legend = layoutLegend(
    branchLabels,
    branchLabels.map((_, i) => branchColor(i)),
    width - 28,
    14,
    cy + radius + 18 * sc,
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
      <g transform={`translate(${cx},${cy})`}>
        {arcs.map((a, i) => {
          const end = sweepArcEnd(a, sweep(a.depth));
          if (end - a.x0 < 0.001) return null;
          const fill = lighten(branchColor(a.branch), (a.depth - 1) * 0.42);
          const focused = interactive && hover === i;
          const dim = interactive && hover !== null && !focused;
          const d = arcGen({ x0: a.x0, x1: end, y0: a.y0, y1: a.y1 }) ?? "";
          // label only when the arc holds it without overlapping neighbours: the
          // angular SLOT at the label radius must clear the (radial) text height,
          // and the text is truncated to the ring's radial width.
          const angSpan = a.x1 - a.x0;
          const lr = (a.y0 + a.y1) / 2;
          const ringWpx = a.y1 - a.y0;
          const slotPx = angSpan * lr;
          const showLabel = slotPx > 17 * sc && ringWpx > 22 * sc;
          const arcLabel = truncate(a.label, ringWpx - 8 * sc, ts.source);
          const lx = Math.sin(a.midAngle) * lr;
          const ly = -Math.cos(a.midAngle) * lr;
          const deg = (a.midAngle * 180) / Math.PI;
          const flip = deg > 90 && deg < 270;
          return (
            <g key={`a${i}`} opacity={dim ? 0.4 : 1}>
              <path
                d={d}
                fill={fill}
                stroke="#fff"
                strokeWidth={1 * sc}
                tabIndex={interactive ? 0 : undefined}
                role={interactive ? "img" : undefined}
                aria-label={
                  interactive
                    ? `${a.label}: ${formatNumber(a.value, config.lang)} ${config.unit}, ${Math.round(a.share * 100)}%`
                    : undefined
                }
                style={
                  interactive
                    ? { cursor: "pointer", outline: "none" }
                    : undefined
                }
                onMouseEnter={interactive ? () => setHover(i) : undefined}
                onMouseLeave={interactive ? () => setHover(null) : undefined}
                onFocus={interactive ? () => setHover(i) : undefined}
                onBlur={interactive ? () => setHover(null) : undefined}
              />
              {showLabel && (
                <text
                  transform={`translate(${lx},${ly}) rotate(${deg - 90 + (flip ? 180 : 0)})`}
                  textAnchor="middle"
                  dy="0.32em"
                  fontSize={ts.source}
                  fontWeight={600}
                  fill={labelColor(fill)}
                  opacity={labelOp}
                  pointerEvents="none"
                >
                  {arcLabel}
                </text>
              )}
            </g>
          );
        })}
        {/* centre total */}
        <g opacity={chrome} textAnchor="middle" pointerEvents="none">
          <text
            y={-2 * sc}
            fontSize={ts.axis}
            fontWeight={700}
            fill={COLORS.ink}
          >
            {centerLabel}
          </text>
        </g>
      </g>

      {/* branch legend below the wheel */}
      <g opacity={chrome}>
        {legend.map((it, i) => (
          <g key={`lg${i}`}>
            <rect
              x={it.x}
              y={it.y - 10 * sc}
              width={12 * sc}
              height={12 * sc}
              rx={2}
              fill={it.color}
            />
            <text
              x={it.x + 17 * sc}
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
    </svg>
  );
}

function Tooltip({
  layout,
  hover,
  config,
  branchColor,
}: {
  layout: SunburstLayout;
  hover: number;
  config: SunburstConfig;
  branchColor: (i: number) => string;
}) {
  const a = layout.arcs[hover];
  if (!a) return null;
  const lr = (a.y0 + a.y1) / 2;
  const left = layout.cx + Math.sin(a.midAngle) * lr;
  const top = layout.cy - Math.cos(a.midAngle) * lr - 8;
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
      <span
        aria-hidden="true"
        style={{ color: branchColor(a.branch), marginRight: 4 }}
      >
        ■
      </span>
      <strong style={{ color: "#fff", fontSize: 13 }}>{a.label}</strong>{" "}
      <span style={{ fontSize: 13 }}>{formatNumber(a.value, config.lang)}</span>
      <div style={{ opacity: 0.75, fontSize: 11 }}>
        {Math.round(a.share * 100)}% of the whole
      </div>
    </div>
  );
}
