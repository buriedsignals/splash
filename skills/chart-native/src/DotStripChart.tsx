// THE one dot-strip component — one horizontal strip per category, every raw
// observation a dot placed by VALUE on a shared x axis (position encoding, no
// baseline-0, dot-strip rule 1). Overlap is shown by transparency + a tiny
// deterministic jitter — NOT a dodge (that is the beeswarm). A neutral vertical
// tick marks each category mean so the eye gets a reference. D3 = math
// (dot-strip-geometry.ts), React = DOM, one master `progress` wipes the dots in
// left→right. responsive=false = fixed (video/static); responsive=true = embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: title=insight + Okabe-Ito + source
//     + WCAG (ChartFrame + checkDotStripConformance), scale via resolveFrame, the
//     shared core/legend + legendRowCount, core/text.truncate.
//   - TYPE-specific: the per-category strip, the position (not length) encoding,
//     the transparency-overlap dots with mean tick, and the left→right clip wipe.
import { useState } from "react";
import {
  computeDotStripLayout,
  dotJitter,
  type DotStripData,
  type DotStripLayout,
} from "./dot-strip-geometry";
import { clamp01, easeInOutCubic, easeOutCubic } from "./core/math";
import { COLORS, FONT, TYPE, OKABE_ITO } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";
import { legendRowCount } from "./core/legend";
import { truncate } from "./core/text";

export interface DotStripConfig {
  title: string;
  source: { name: string; url: string };
  unit: string; // subtitle + value-axis meaning
  categoryField: string;
  valueField: string;
  summaryLabel?: string; // legend text for the mean tick
  rows: Record<string, string | number>[];
}

export interface DotStripChartProps {
  config: DotStripConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

const DOT_COLOR = OKABE_ITO.blue; // the single data colour
const MEAN_COLOR = COLORS.ink; // neutral reference marker

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

export function DotStripChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: DotStripChartProps) {
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
    [config.summaryLabel ?? "Mean", "Individual value"],
    width - 40,
    TYPE.axis * 0.6,
    LEG_ROW,
  );
  const basePad = {
    top: responsive ? 16 : 50 + titleLines * 27,
    right: 22,
    // value-axis tick labels (~18) + legend rows + source-line clearance (~38)
    bottom: 18 + legendRows * LEG_ROW + 38,
    left: 104, // category labels
  };
  const frame = resolveFrameWithHeader(config.title, config.unit, width, height, basePad, scale, undefined, responsive);
  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;

  const data: DotStripData = {
    categoryField: config.categoryField,
    valueField: config.valueField,
    rows: config.rows,
  };
  const layout = computeDotStripLayout(data, { width, height, padding });

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <DotStripSvg
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

function DotStripSvg({
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
  layout: DotStripLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: DotStripConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { innerWidth, innerHeight, rows } = layout;
  const chrome = easeOutCubic(p / 0.18);
  const reveal = easeInOutCubic(p);
  const clipW = innerWidth * reveal + 1;
  const clipId = "dot-strip-wipe";

  const dotR = (interactive ? 5 : 4.5) * sc;
  const labelW = padding.left - 12 * sc;

  // legend sits under the value-axis ticks
  const legY = innerHeight + 36 * sc;
  const meanText = config.summaryLabel ?? "Mean";

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
        {/* faint vertical gridlines + value-axis labels (dots carry the values) */}
        <g opacity={chrome}>
          {layout.valueTicks.map((t, i) => (
            <g key={`g${i}`}>
              <line
                x1={t.pos}
                x2={t.pos}
                y1={0}
                y2={innerHeight}
                stroke={COLORS.grid}
                strokeWidth={1}
              />
              <text
                x={t.pos}
                y={innerHeight + 16 * sc}
                textAnchor="middle"
                fontSize={ts.source}
                fill={COLORS.muted}
              >
                {t.label}
              </text>
            </g>
          ))}
        </g>

        {/* category labels in the left gutter (fade in with the chrome) */}
        <g opacity={chrome}>
          {rows.map((r) => (
            <text
              key={`c${r.index}`}
              x={-12 * sc}
              y={r.y}
              dy="0.32em"
              textAnchor="end"
              fontSize={ts.axis}
              fontWeight={600}
              fill={COLORS.ink}
            >
              {truncate(r.category, labelW, ts.axis)}
            </text>
          ))}
        </g>

        {/* dots + mean ticks — revealed left→right by the clip wipe */}
        <g clipPath={`url(#${clipId})`}>
          {rows.map((r) => {
            const focused = interactive && hover === r.index;
            const dim = interactive && hover !== null && !focused;
            return (
              <g
                key={`r${r.index}`}
                opacity={dim ? 0.3 : 1}
                tabIndex={interactive ? 0 : undefined}
                role={interactive ? "img" : undefined}
                aria-label={
                  interactive
                    ? `${r.category}: ${r.dots.length} pupils, ${fmt(r.min)} to ${fmt(r.max)} ${config.unit}, mean ${fmt(r.mean)}`
                    : undefined
                }
                style={interactive ? { cursor: "pointer" } : undefined}
                onMouseEnter={interactive ? () => setHover(r.index) : undefined}
                onMouseLeave={interactive ? () => setHover(null) : undefined}
                onFocus={interactive ? () => setHover(r.index) : undefined}
                onBlur={interactive ? () => setHover(null) : undefined}
              >
                {/* the raw observations — overlap shown by transparency */}
                {r.dots.map((d, di) => (
                  <circle
                    key={`d${di}`}
                    cx={d.x}
                    cy={r.y + dotJitter(d.value, di, r.bandH)}
                    r={dotR}
                    fill={DOT_COLOR}
                    fillOpacity={0.55}
                    stroke="#FFFFFF"
                    strokeWidth={0.75 * sc}
                  />
                ))}
                {/* the category mean — a neutral vertical reference tick */}
                <line
                  x1={r.meanX}
                  x2={r.meanX}
                  y1={r.y - r.bandH * 0.42}
                  y2={r.y + r.bandH * 0.42}
                  stroke={MEAN_COLOR}
                  strokeWidth={2 * sc}
                />
              </g>
            );
          })}
        </g>

        {/* legend: the mean tick + an individual dot (fades in with chrome) */}
        <g className="chart-legend" opacity={chrome}>
          <line
            x1={0}
            x2={0}
            y1={legY - 6 * sc}
            y2={legY + 6 * sc}
            stroke={MEAN_COLOR}
            strokeWidth={2 * sc}
          />
          <text
            x={10 * sc}
            y={legY}
            dy="0.32em"
            fontSize={ts.axis}
            fontWeight={600}
            fill={COLORS.ink}
          >
            {meanText}
          </text>
          <circle
            cx={(meanText.length * ts.axis * 0.62 + 30) * sc}
            cy={legY}
            r={dotR}
            fill={DOT_COLOR}
            fillOpacity={0.55}
            stroke="#FFFFFF"
            strokeWidth={0.75 * sc}
          />
          <text
            x={(meanText.length * ts.axis * 0.62 + 42) * sc}
            y={legY}
            dy="0.32em"
            fontSize={ts.axis}
            fontWeight={600}
            fill={COLORS.ink}
          >
            Individual pupil
          </text>
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
  layout: DotStripLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: DotStripConfig;
}) {
  const r = layout.rows.find((x) => x.index === hover);
  if (!r) return null;
  const left = padding.left + r.meanX;
  const top = padding.top + r.y - r.bandH * 0.42 - 12;
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
      <strong style={{ fontSize: 13 }}>{r.category}</strong>
      <div style={{ fontSize: 11, opacity: 0.85, marginTop: 1 }}>
        {r.dots.length} pupils · {fmt(r.min)}–{fmt(r.max)} · mean {fmt(r.mean)}{" "}
        {config.unit}
      </div>
    </div>
  );
}
