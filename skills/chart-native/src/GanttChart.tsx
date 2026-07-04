// THE one Gantt / timeline component — each item is a horizontal bar spanning
// start → end on a shared, to-scale time axis; rows in start order. D3 = math
// (gantt-geometry.ts: scaleTime), React = DOM, one master `progress` grows each
// bar from its start, staggered by row. responsive=false = fixed (video/static);
// responsive=true = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: Okabe-Ito group palette + WCAG +
//     title=insight + cited source (ChartFrame + checkGanttConformance), scale
//     via resolveFrame, core/text.truncate + the shared core/legend.
//   - TYPE-specific: the to-scale time axis, the duration bars, and the
//     grow-from-start reveal.
import { useState } from "react";
import {
  computeGanttLayout,
  growGanttBar,
  type GanttData,
  type GanttLayout,
} from "./gantt-geometry";
import { clamp01, easeOutCubic, stagger } from "./core/math";
import { COLORS, FONT, TYPE, OKABE_ITO } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";
import { layoutLegend, legendRowCount } from "./core/legend";
import { truncate } from "./core/text";

export interface GanttConfig {
  title: string;
  source: { name: string; url: string };
  unit: string; // subtitle / time-axis caption
  categories?: string[];
  items: { label: string; start: string; end: string; category?: string }[];
}

export interface GanttChartProps {
  config: GanttConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

const GROUP_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.green,
  OKABE_ITO.purple,
  OKABE_ITO.vermillion,
  OKABE_ITO.skyblue,
];

export function GanttChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: GanttChartProps) {
  const p = clamp01(progress);
  const s = responsive ? 1 : scale;
  const charsPerLine = Math.max(
    8,
    Math.floor((width - 48 * s) / (TYPE.title * s * 0.52)),
  );
  const titleLines = responsive
    ? Math.max(1, Math.ceil(config.title.length / Math.floor(width / 11)))
    : Math.max(1, Math.ceil(config.title.length / charsPerLine));
  // reserve bottom for the time ticks AND however many rows the group legend
  // wraps to at this width (long group labels wrap on a phone).
  const cats = config.categories ?? [];
  const LEG_ROW = 20;
  const legendRows = cats.length
    ? legendRowCount(cats, width - 150 - 20, TYPE.source * 0.6, LEG_ROW)
    : 0;
  const basePad = {
    top: responsive ? 14 : 50 + titleLines * 27,
    right: 20,
    bottom: 32 + (cats.length ? legendRows * LEG_ROW + 20 : 0), // ticks + legend + clearance
    left: 150, // row labels in the gutter
  };
  const frame = resolveFrameWithHeader(config.title, config.unit, width, height, basePad, scale, 0.62, responsive);
  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;

  const colorIndex = new Map<string, number>();
  (config.categories ?? []).forEach((c, i) => colorIndex.set(c, i));
  const colorOf = (cat?: string) =>
    cat != null && colorIndex.has(cat)
      ? GROUP_COLORS[colorIndex.get(cat)! % GROUP_COLORS.length]
      : OKABE_ITO.blue;

  const data: GanttData = { items: config.items };
  const layout = computeGanttLayout(data, { width, height, padding });

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <GanttSvg
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

function GanttSvg({
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
  layout: GanttLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: GanttConfig;
  colorOf: (cat?: string) => string;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { innerWidth, innerHeight, bars, timeTicks } = layout;
  const n = bars.length;
  const chrome = easeOutCubic(p / 0.16);
  const rowP = (i: number) =>
    easeOutCubic(stagger(p, i, n, 0.14, 0.5 / n, 0.4));

  const legend =
    config.categories && config.categories.length
      ? layoutLegend(
          config.categories,
          config.categories.map((c) => colorOf(c)),
          innerWidth,
          0,
          innerHeight + 34 * sc,
          ts.source * 0.6,
          20 * sc,
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
        {/* time gridlines + bottom captions (wipe in) */}
        <g opacity={chrome * 0.6}>
          {timeTicks.map((t, i) => (
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
          {timeTicks.map((t, i) => (
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

        {/* bars — grow from start; row label in the gutter */}
        {bars.map((b) => {
          const rp = rowP(b.order);
          const endX = growGanttBar(b, rp);
          const w = Math.max(0, endX - b.x0);
          const color = colorOf(b.category);
          const focused = interactive && hover === b.index;
          const dim = interactive && hover !== null && !focused;
          const catOp = clamp01(rp * 1.4);
          return (
            <g key={`b${b.index}`} opacity={dim ? 0.5 : 1}>
              <text
                x={-12 * sc}
                y={b.y}
                dy="0.32em"
                textAnchor="end"
                fontSize={ts.axis}
                fill={COLORS.ink}
                opacity={catOp}
              >
                {truncate(b.label, padding.left - 16 * sc, ts.axis)}
              </text>
              <rect
                x={b.x0}
                y={b.y - b.h / 2}
                width={w}
                height={b.h}
                rx={3 * sc}
                fill={color}
                tabIndex={interactive ? 0 : undefined}
                role={interactive ? "img" : undefined}
                aria-label={
                  interactive
                    ? `${b.label}: ${config.items.find((it) => it.label === b.label)?.start} to ${config.items.find((it) => it.label === b.label)?.end}`
                    : undefined
                }
                style={
                  interactive
                    ? { cursor: "pointer", outline: "none" }
                    : undefined
                }
                onMouseEnter={interactive ? () => setHover(b.index) : undefined}
                onMouseLeave={interactive ? () => setHover(null) : undefined}
                onFocus={interactive ? () => setHover(b.index) : undefined}
                onBlur={interactive ? () => setHover(null) : undefined}
              />
            </g>
          );
        })}

        {/* group legend below the timeline */}
        <g opacity={chrome}>
          {legend.map((it, i) => (
            <g key={`lg${i}`}>
              <rect
                x={it.x}
                y={it.y - 9 * sc}
                width={12 * sc}
                height={12 * sc}
                rx={2}
                fill={it.color}
              />
              <text
                x={it.x + 17 * sc}
                y={it.y}
                dy="0.32em"
                fontSize={ts.source}
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
}: {
  layout: GanttLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: GanttConfig;
}) {
  const b = layout.bars.find((x) => x.index === hover);
  if (!b) return null;
  const item = config.items.find((it) => it.label === b.label);
  const left = padding.left + (b.x0 + b.x1) / 2;
  const top = padding.top + b.y - b.h / 2 - 8;
  const months = Math.max(1, Math.round(b.durationDays / 30.4));
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
      <strong style={{ fontSize: 13 }}>{b.label}</strong>
      <div style={{ fontSize: 12, marginTop: 1 }}>
        {item?.start} → {item?.end}
      </div>
      <div style={{ opacity: 0.7, fontSize: 11 }}>
        ≈ {months} month{months > 1 ? "s" : ""}
      </div>
    </div>
  );
}
