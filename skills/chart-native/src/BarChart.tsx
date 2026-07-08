// THE one bar/column component — sibling of LineChart, same discipline:
// D3 = math (bar-geometry.ts), React = DOM, a single master `progress` drives a
// motion build that is a pure function of progress (shared by static / video).
// responsive=false keeps a fixed absolute layout (video + static, deterministic);
// responsive=true uses a flow layout for the interactive embed.
//
// Motion (per formats/video.md):
//   chrome (value axis + gridlines) wipes in → each bar GROWS from the zero
//   baseline, staggered in reading order → the value label fades/slides as its
//   bar lands. A bar never grows from the middle/top — always from 0.

import { useState } from "react";
import {
  computeBarLayout,
  growBar,
  type BarData,
  type BarDims,
  type Orientation,
  type Sort,
  type BarLayout,
} from "./bar-geometry";
import { formatNumber, clamp01, easeOutCubic, stagger } from "./core/math";
import { COLORS, TYPE, OKABE_ITO } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import { resolveFrameWithHeader } from "./core/format";
import { truncate } from "./core/text";

export interface BarConfig {
  title: string; // = the insight (sentence case)
  source: { name: string; url: string };
  unit: string;
  catField: string;
  valField: string;
  orientation: Orientation;
  sort?: Sort;
  /** optional accent on ONE key bar (≤2 colours, off by default) */
  highlightIndex?: number;
  /** Okabe-Ito hex for the primary series colour. Absent → COLORS.line default. */
  baseColor?: string;
  rows: Record<string, string | number>[];
}

export interface BarChartProps {
  config: BarConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  /** typography/margin scale for non-landscape video canvases (default 1). */
  scale?: number;
  /** embedded = sticky graphic in a chart-scrolly host; suppress own title + source. */
  embedded?: boolean;
}

function paddingFor(orientation: Orientation, responsive: boolean) {
  const top = responsive ? 16 : 64;
  return orientation === "horizontal"
    ? { top, right: 64, bottom: 40, left: 124 } // left: category labels
    : { top, right: 24, bottom: 52, left: 56 }; // bottom: category labels
}

export function BarChart({
  config,
  progress = 1,
  width = 840,
  height = 460,
  interactive = false,
  responsive = false,
  scale = 1,
  embedded = false,
}: BarChartProps) {
  const p = clamp01(progress);
  const basePad = paddingFor(config.orientation, responsive);
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
  const dims: BarDims = { width, height, padding };
  const data: BarData = {
    catField: config.catField,
    valField: config.valField,
    rows: config.rows,
  };
  const layout = computeBarLayout(data, dims, {
    orientation: config.orientation,
    sort: config.sort,
  });

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <BarSvg
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
      embedded={embedded}
    >
      {svg}
    </ChartFrame>
  );
}

function barColor(i: number, highlight?: number, baseColor?: string): string {
  const primary = baseColor ?? COLORS.line;
  if (highlight === undefined) return primary;
  return i === highlight ? OKABE_ITO.orange : COLORS.muted;
}

function BarSvg({
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
  layout: BarLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: BarConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { innerWidth, innerHeight, orientation, bars } = layout;
  const horizontal = orientation === "horizontal";
  const n = bars.length;

  // chrome wipe (gridlines + baseline) over the first ~18% of the timeline
  const chrome = easeOutCubic(p / 0.18);
  // each bar grows from the baseline, staggered in reading order
  const barP = (i: number) => stagger(p, i, n, 0.18, 0.5 / n, 0.35);

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
        {/* value-axis gridlines (wipe in) */}
        <g opacity={chrome}>
          {layout.valueTicks.map((t, i) =>
            horizontal ? (
              <line
                key={`g${i}`}
                x1={t.pos}
                x2={t.pos}
                y1={0}
                y2={innerHeight}
                stroke={COLORS.grid}
                strokeWidth={1}
              />
            ) : (
              <line
                key={`g${i}`}
                x1={0}
                x2={innerWidth}
                y1={t.pos}
                y2={t.pos}
                stroke={COLORS.grid}
                strokeWidth={1}
              />
            ),
          )}
          {/* value-axis tick labels — horizontal bars drop them (every bar has a
              direct value label → axis is redundant, bar.md rule 4); vertical
              keeps the left y-axis labels (conventional, no source collision). */}
          {layout.valueTicks.map((t, i) =>
            horizontal ? null : (
              <text
                key={`vt${i}`}
                x={-10 * sc}
                y={t.pos}
                dy="0.32em"
                textAnchor="end"
                fontSize={ts.axis}
                fill={COLORS.muted}
              >
                {t.label}
              </text>
            ),
          )}
        </g>

        {/* bars + category labels + value labels */}
        {bars.map((b, i) => {
          const g = growBar(b, barP(i), orientation);
          const fill = barColor(i, config.highlightIndex, config.baseColor);
          const grown = barP(i);
          const labelOp = clamp01((grown - 0.65) / 0.35);
          const catOp = clamp01(grown * 1.6);
          // category label position (always at the bar's band centre)
          const cat = horizontal
            ? {
                x: -10 * sc,
                y: b.y + b.h / 2,
                anchor: "end" as const,
                dy: "0.32em",
              }
            : {
                x: b.x + b.w / 2,
                y: innerHeight + 20 * sc,
                anchor: "middle" as const,
                dy: "0",
              };
          // value label at the END of the bar
          const val = horizontal
            ? {
                x: b.x + b.w + 6 * sc,
                y: b.y + b.h / 2,
                anchor: "start" as const,
                dy: "0.32em",
              }
            : {
                x: b.x + b.w / 2,
                y: b.y - 6 * sc,
                anchor: "middle" as const,
                dy: "0",
              };

          return (
            <g key={`bar${i}`}>
              <rect
                className="bar"
                x={g.x}
                y={g.y}
                width={g.w}
                height={g.h}
                fill={fill}
                rx={1}
                tabIndex={interactive ? 0 : undefined}
                role={interactive ? "img" : undefined}
                aria-label={
                  interactive
                    ? `${b.rawCat}: ${formatNumber(b.rawVal)} ${config.unit}`
                    : undefined
                }
                style={interactive ? { cursor: "pointer" } : undefined}
                onMouseEnter={interactive ? () => setHover(i) : undefined}
                onMouseLeave={interactive ? () => setHover(null) : undefined}
                onFocus={interactive ? () => setHover(i) : undefined}
                onBlur={interactive ? () => setHover(null) : undefined}
              />
              <text
                x={cat.x}
                y={cat.y}
                dy={cat.dy}
                textAnchor={cat.anchor}
                fontSize={ts.axis}
                fill={COLORS.ink}
                opacity={catOp}
              >
                {truncate(
                  String(b.rawCat),
                  horizontal ? padding.left - 14 * sc : b.w,
                  ts.axis,
                )}
              </text>
              <text
                x={val.x}
                y={val.y}
                dy={val.dy}
                textAnchor={val.anchor}
                fontSize={ts.axis}
                fontWeight={600}
                // the label carries the VALUE (always ink for WCAG contrast); the
                // MARK carries the hue. Emphasis on a highlighted bar stays on the
                // bar fill + the bold weight, never on a low-contrast text colour.
                fill={COLORS.ink}
                opacity={labelOp}
              >
                {formatNumber(b.rawVal)}
              </text>
            </g>
          );
        })}

        {/* zero baseline (drawn last, over the gridlines) */}
        <g opacity={chrome}>
          {horizontal ? (
            <line
              x1={bars[0]?.base ?? 0}
              x2={bars[0]?.base ?? 0}
              y1={0}
              y2={innerHeight}
              stroke={COLORS.axis}
              strokeWidth={1}
            />
          ) : (
            <line
              x1={0}
              x2={innerWidth}
              y1={bars[0]?.base ?? innerHeight}
              y2={bars[0]?.base ?? innerHeight}
              stroke={COLORS.axis}
              strokeWidth={1}
            />
          )}
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
  layout: BarLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: BarConfig;
}) {
  const b = layout.bars[hover];
  const horizontal = layout.orientation === "horizontal";
  const left = padding.left + (horizontal ? b.x + b.w : b.x + b.w / 2) + 12;
  const top = padding.top + (horizontal ? b.y + b.h / 2 : b.y) - 8;
  return (
    <div
      className="tooltip"
      style={{
        position: "absolute",
        left,
        top,
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
      <strong>{formatNumber(b.rawVal)}</strong>{" "}
      <span style={{ opacity: 0.8 }}>{config.unit}</span>
      <div style={{ opacity: 0.7, fontSize: 11 }}>{String(b.rawCat)}</div>
    </div>
  );
}
