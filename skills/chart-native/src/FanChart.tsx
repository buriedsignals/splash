// THE one fan chart component — a forecast as a solid HISTORY line plus a central
// estimate and nested confidence bands that widen from "now". D3 = math
// (fan-geometry.ts), React = DOM (d3-shape area/line for the silhouette), one
// master `progress` drives a left→right clip wipe that unfolds the fan.
// responsive=false = fixed (video/static); responsive=true = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: one Okabe-Ito hue + WCAG + title=
//     insight + cited source (ChartFrame + checkFanConformance), scale via
//     resolveFrame.
//   - TYPE-specific: the nested band tints, the "now" rule, the dashed central
//     line, and the clip-wipe reveal that unfolds the fan.
import { useState } from "react";
import { computeFanLayout, type FanData, type FanLayout } from "./fan-geometry";
import { area, line, curveMonotoneX } from "d3-shape";
import {
  clamp01,
  easeInOutCubic,
  easeOutCubic,
  formatNumber,
} from "./core/math";
import { COLORS, FONT, TYPE, OKABE_ITO } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import type { Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";

export interface FanConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  unit: string; // subtitle / value-axis caption
  xField: string;
  levels: number[];
  rows: Record<string, number>[];
}

export interface FanChartProps {
  config: FanConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

const HUE = OKABE_ITO.blue;
// widest band lightest → narrowest darkest
const BAND_OPACITY: Record<number, number> = { 95: 0.13, 80: 0.22, 50: 0.34 };

export function FanChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: FanChartProps) {
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
    bottom: 28, // x captions (source band reserved in resolveFrameWithHeader)
    left: 48, // value-axis labels (abbreviated)
  };
  const frame = resolveFrameWithHeader(
    config.title,
    config.unit,
    width,
    height,
    basePad,
    scale,
    0.6,
    responsive,
  );
  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;

  const data: FanData = {
    xField: config.xField,
    levels: config.levels,
    rows: config.rows,
  };
  const layout = computeFanLayout(data, { width, height, padding });

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <FanSvg
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

function FanSvg({
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
  layout: FanLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: FanConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const {
    innerWidth,
    innerHeight,
    history,
    central,
    bands,
    nowX,
    xTicks,
    yTicks,
  } = layout;
  const chrome = easeOutCubic(p / 0.18);
  const reveal = easeInOutCubic(p);
  const clipW = innerWidth * reveal + 1;
  const clipId = "fan-wipe";

  const bandArea = area<{ x: number; loY: number; hiY: number }>()
    .x((d) => d.x)
    .y0((d) => d.loY)
    .y1((d) => d.hiY)
    .curve(curveMonotoneX);
  const lineGen = line<{ x: number; y: number }>()
    .x((d) => d.x)
    .y((d) => d.y)
    .curve(curveMonotoneX);

  // bands widest → narrowest (paint order: 95 behind, 50 front)
  const ordered = [...bands].sort((a, b) => b.level - a.level);
  const stepHalf =
    xTicks.length > 1 ? (xTicks[1].pos - xTicks[0].pos) / 2 : innerWidth;

  // show x captions greedily with a minimum pixel gap; always keep the last,
  // dropping any earlier caption that would crowd it.
  const minGap = 42 * sc;
  const shownX = new Set<number>();
  let lastPos = -Infinity;
  xTicks.forEach((t, i) => {
    if (t.pos - lastPos >= minGap) {
      shownX.add(i);
      lastPos = t.pos;
    }
  });
  const finalPos = xTicks[xTicks.length - 1].pos;
  for (const i of [...shownX])
    if (i !== xTicks.length - 1 && finalPos - xTicks[i].pos < minGap)
      shownX.delete(i);
  shownX.add(xTicks.length - 1);

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
        {/* y gridlines + value labels (fade in) */}
        <g opacity={chrome}>
          {yTicks.map((t, i) => (
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
                x={-8 * sc}
                y={t.pos}
                dy="0.32em"
                textAnchor="end"
                fontSize={ts.source}
                fill={COLORS.muted}
              >
                {formatNumber(Number(t.label), config.lang)}
              </text>
            </g>
          ))}
        </g>

        {/* clipped data: bands → now rule → central → history → x captions */}
        <g clipPath={`url(#${clipId})`}>
          {ordered.map((b) => (
            <path
              key={`band${b.level}`}
              d={bandArea(b.points) ?? ""}
              fill={HUE}
              fillOpacity={BAND_OPACITY[b.level] ?? 0.2}
            />
          ))}

          {/* "now" rule */}
          <line
            x1={nowX}
            x2={nowX}
            y1={0}
            y2={innerHeight}
            stroke={COLORS.muted}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <text
            x={nowX + 5 * sc}
            y={9 * sc}
            fontSize={ts.source}
            fontWeight={600}
            fill={COLORS.muted}
          >
            projection →
          </text>

          {/* central forecast (dashed, subordinate) */}
          <path
            d={lineGen(central) ?? ""}
            fill="none"
            stroke={HUE}
            strokeWidth={2 * sc}
            strokeDasharray={`${6 * sc} ${4 * sc}`}
            opacity={0.85}
          />
          {/* history (solid, primary) */}
          <path
            d={lineGen(history) ?? ""}
            fill="none"
            stroke={HUE}
            strokeWidth={2.6 * sc}
          />

          {/* x captions (thinned to a readable spacing) */}
          {xTicks.map((t, i) =>
            shownX.has(i) ? (
              <text
                key={`x${i}`}
                x={t.pos}
                y={innerHeight + 18 * sc}
                textAnchor={
                  i === xTicks.length - 1 ? "end" : i === 0 ? "start" : "middle"
                }
                fontSize={ts.source}
                fill={COLORS.muted}
              >
                {t.label}
              </text>
            ) : null,
          )}
        </g>

        {/* interactive per-year hover columns */}
        {interactive &&
          xTicks.map((t, i) => {
            const focused = hover === i;
            return (
              <g key={`hit${i}`}>
                {focused && (
                  <line
                    x1={t.pos}
                    x2={t.pos}
                    y1={0}
                    y2={innerHeight}
                    stroke={COLORS.ink}
                    strokeWidth={1}
                    opacity={0.3}
                  />
                )}
                <rect
                  x={t.pos - stepHalf}
                  y={0}
                  width={stepHalf * 2}
                  height={innerHeight}
                  fill="transparent"
                  tabIndex={0}
                  role="img"
                  aria-label={ariaFor(config, i)}
                  style={{ cursor: "pointer", outline: "none" }}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                />
              </g>
            );
          })}
      </g>
    </svg>
  );
}

function ariaFor(config: FanConfig, i: number): string {
  const r = config.rows[i];
  const yr = r[config.xField];
  if (r.actual != null) return `${yr}: ${r.actual} (actual)`;
  const hi = config.levels[config.levels.length - 1];
  return `${yr}: central ${r.central}, ${hi}% range ${r[`lo${hi}`]} to ${r[`hi${hi}`]}`;
}

function Tooltip({
  layout,
  padding,
  hover,
  config,
}: {
  layout: FanLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: FanConfig;
}) {
  const r = config.rows[hover];
  if (!r) return null;
  const tick = layout.xTicks[hover];
  const left = padding.left + tick.pos;
  const top = padding.top + 16;
  const isActual = r.actual != null;
  const outer = config.levels[config.levels.length - 1];
  return (
    <div
      className="tooltip"
      style={{
        position: "absolute",
        left,
        top,
        transform: "translate(-50%,0)",
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
      <strong style={{ fontSize: 13 }}>{r[config.xField]}</strong>
      {isActual ? (
        <div style={{ fontSize: 12 }}>{r.actual} (actual)</div>
      ) : (
        <>
          <div style={{ fontSize: 12 }}>central {r.central}</div>
          <div style={{ opacity: 0.7, fontSize: 11 }}>
            {outer}% range {r[`lo${outer}`]}–{r[`hi${outer}`]}
          </div>
        </>
      )}
    </div>
  );
}
