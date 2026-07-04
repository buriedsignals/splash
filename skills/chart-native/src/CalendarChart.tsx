// THE one calendar heatmap component — one cell per day (weeks in columns,
// weekdays in rows), coloured by a SEQUENTIAL ramp. D3 = math
// (calendar-geometry.ts), React = DOM, one master `progress` fades/scales the
// cells in week by week. responsive=false = fixed (video/static); responsive=true
// = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: the heatmap sequential ramp +
//     monotonic luminance + WCAG + title=insight + cited source (ChartFrame +
//     checkCalendarConformance), scale via resolveFrame.
//   - TYPE-specific: the week×weekday grid, the month/weekday labels, the
//     colourbar, and the chronological fade-in reveal.
import { useState } from "react";
import {
  computeCalendarLayout,
  type CalendarData,
  type CalendarLayout,
} from "./calendar-geometry";
import { clamp01, easeOutCubic, formatNumber } from "./core/math";
import { COLORS, FONT, TYPE } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";

export interface CalendarConfig {
  title: string;
  source: { name: string; url: string };
  unit: string; // subtitle / value unit
  days: { date: string; value: number }[];
}

export interface CalendarChartProps {
  config: CalendarConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

export function CalendarChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: CalendarChartProps) {
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
    top: (responsive ? 16 : 50 + titleLines * 27) + 16, // + month labels band
    right: 18,
    bottom: 60, // colourbar legend (below the full-height grid) + source clearance
    left: 36, // weekday labels
  };
  const frame = resolveFrameWithHeader(config.title, config.unit, width, height, basePad, scale, 0.42, responsive);
  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;

  const data: CalendarData = { unit: config.unit, days: config.days };
  const layout = computeCalendarLayout(data, { width, height, padding });

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <CalendarSvg
      layout={layout}
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
      <Tooltip layout={layout} hover={hover} config={config} />
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

function CalendarSvg({
  layout,
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
  layout: CalendarLayout;
  width: number;
  height: number;
  p: number;
  config: CalendarConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const {
    cells,
    monthLabels,
    weekdayLabels,
    cellW,
    cellH,
    gridX,
    gridY,
    nCols,
    ramp,
    valueDomain,
  } = layout;
  const chrome = easeOutCubic(p / 0.16);

  // chronological wipe: a cell appears once the wipe (by column) reaches it.
  const wipeCol = nCols * easeOutCubic(clamp01((p - 0.05) / 0.85));

  // colourbar geometry (bottom-left)
  const barY = gridY + 7 * cellH + 9 * sc;
  const barX = gridX;
  const barW = Math.min(180 * sc, nCols * cellW * 0.5);
  const barH = 9 * sc;
  const stops = 24;

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={config.title}
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
      <title>{config.title}</title>

      {/* month labels along the top */}
      <g opacity={chrome}>
        {monthLabels.map((m, i) => (
          <text
            key={`m${i}`}
            x={m.x}
            y={gridY - 7 * sc}
            fontSize={ts.source}
            fontWeight={600}
            fill={COLORS.muted}
          >
            {m.label}
          </text>
        ))}
        {/* when cells are tiny (a year on a phone), only Mon/Sun fit without
            colliding; show all four weekday labels once there's room. */}
        {(cellH >= 13 * sc
          ? weekdayLabels
          : weekdayLabels.filter((w) => w.label === "Mon" || w.label === "Sun")
        ).map((w, i) => (
          <text
            key={`w${i}`}
            x={gridX - 7 * sc}
            y={w.y}
            dy="0.32em"
            textAnchor="end"
            fontSize={ts.source}
            fill={COLORS.muted}
          >
            {w.label}
          </text>
        ))}
      </g>

      {/* day cells — appear chronologically (column by column) */}
      {cells.map((c) => {
        // a cell fades in once the chronological wipe reaches its column; nothing
        // is drawn before the wipe starts (no base offset → blank at progress 0).
        const ap = clamp01((wipeCol - c.col) * 1.2);
        if (ap <= 0.01) return null;
        const focused = interactive && hover === c.order;
        return (
          <rect
            key={`c${c.order}`}
            x={c.x}
            y={c.y}
            width={c.w}
            height={c.h}
            rx={1.5 * sc}
            fill={c.color}
            stroke={focused ? COLORS.ink : "none"}
            strokeWidth={focused ? 1.5 * sc : 0}
            opacity={ap}
            tabIndex={interactive ? 0 : undefined}
            role={interactive ? "img" : undefined}
            aria-label={
              interactive
                ? `${c.date}: ${formatNumber(c.value)} ${config.unit}`
                : undefined
            }
            style={
              interactive ? { cursor: "pointer", outline: "none" } : undefined
            }
            onMouseEnter={interactive ? () => setHover(c.order) : undefined}
            onMouseLeave={interactive ? () => setHover(null) : undefined}
            onFocus={interactive ? () => setHover(c.order) : undefined}
            onBlur={interactive ? () => setHover(null) : undefined}
          />
        );
      })}

      {/* colourbar legend */}
      <g opacity={chrome}>
        {Array.from({ length: stops }, (_, i) => (
          <rect
            key={`cb${i}`}
            x={barX + (i / stops) * barW}
            y={barY}
            width={barW / stops + 0.6}
            height={barH}
            fill={ramp(i / (stops - 1))}
          />
        ))}
        <text
          x={barX}
          y={barY + barH + 12 * sc}
          fontSize={ts.source}
          fill={COLORS.muted}
        >
          {formatNumber(valueDomain[0])}
        </text>
        <text
          x={barX + barW}
          y={barY + barH + 12 * sc}
          textAnchor="end"
          fontSize={ts.source}
          fill={COLORS.muted}
        >
          {formatNumber(valueDomain[1])}
        </text>
        <text
          x={barX + barW + 10 * sc}
          y={barY + barH - 0.5 * sc}
          fontSize={ts.source}
          fill={COLORS.muted}
        >
          {config.unit}
        </text>
      </g>
    </svg>
  );
}

function Tooltip({
  layout,
  hover,
  config,
}: {
  layout: CalendarLayout;
  hover: number;
  config: CalendarConfig;
}) {
  const c = layout.cells.find((x) => x.order === hover);
  if (!c) return null;
  const left = c.x + c.w / 2;
  const top = c.y - 6;
  const d = new Date(Date.parse(c.date));
  const label = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
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
      <strong style={{ fontSize: 13 }}>{formatNumber(c.value)}</strong>{" "}
      <span style={{ opacity: 0.8, fontSize: 12 }}>{config.unit}</span>
      <div style={{ opacity: 0.7, fontSize: 11 }}>{label}</div>
    </div>
  );
}
