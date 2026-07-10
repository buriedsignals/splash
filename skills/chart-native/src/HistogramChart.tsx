// THE one histogram component — the DISTRIBUTION of one continuous variable.
// D3 = math (histogram-geometry.ts: d3 bin), React = DOM, one master `progress`
// drives a grow-from-baseline build. Bars TOUCH (no gap) — the defining rule
// vs a bar chart. responsive=false = fixed layout (video/static); responsive=true
// = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: baseline-0 (count is a length),
//     Okabe-Ito data colour + WCAG + title=insight + source (ChartFrame +
//     conformance), scale via resolveFrame.
//   - TYPE-specific: the binning geometry, the touching-bars rule, the median
//     annotation, and the left→right grow reveal.
import { useState } from "react";
import {
  computeHistogramLayout,
  growHistBar,
  type HistogramData,
  type HistogramLayout,
} from "./histogram-geometry";
import { clamp01, easeOutCubic, stagger } from "./core/math";
import { COLORS, FONT, TYPE, OKABE_ITO } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import type { Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";

export interface HistogramConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  unit: string;
  valueField: string;
  binWidth?: number;
  rows: Record<string, string | number>[];
}

export interface HistogramChartProps {
  config: HistogramConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

const BAR = COLORS.line; // single distribution colour (Okabe-Ito blue)
const MEDIAN = OKABE_ITO.vermillion; // the one accent

export function HistogramChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: HistogramChartProps) {
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
    top: responsive ? 16 : 53 + titleLines * 27,
    right: 18,
    bottom: 30, // bin-edge axis (source band reserved in resolveFrameWithHeader)
    left: 40, // count axis
  };
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
  const data: HistogramData = {
    valueField: config.valueField,
    rows: config.rows,
  };
  const layout = computeHistogramLayout(
    data,
    { width, height, padding },
    { binWidth: config.binWidth },
  );

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <HistogramSvg
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

function HistogramSvg({
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
  layout: HistogramLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: HistogramConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { innerWidth, innerHeight, base, bars, median, medianX } = layout;
  const n = bars.length;

  const chrome = easeOutCubic(p / 0.18);
  const barP = (i: number) => stagger(p, i, n, 0.18, 0.5 / n, 0.35);
  const medianOp = clamp01((p - 0.75) / 0.25);
  // show every other bin-edge label if they would crowd
  const edgeStep =
    innerWidth / Math.max(1, layout.edgeTicks.length - 1) < 34 * sc ? 2 : 1;

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
        {/* count-axis gridlines + labels (wipe in) */}
        <g opacity={chrome}>
          {layout.countTicks.map((t, i) => (
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
                x={-8 * sc}
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

        {/* bars — touching, grow from the baseline, staggered left→right */}
        {bars.map((b, i) => {
          if (b.count === 0) return null;
          const g = growHistBar(b, barP(i));
          const focused = interactive && hover === i;
          const dim = interactive && hover !== null && !focused;
          return (
            <rect
              key={`b${i}`}
              className="hist-bar"
              x={g.x}
              y={g.y}
              width={Math.max(0, g.w - 1 * sc)} // hairline gap to read bin edges
              height={g.h}
              fill={BAR}
              opacity={dim ? 0.55 : 1}
              tabIndex={interactive ? 0 : undefined}
              role={interactive ? "img" : undefined}
              aria-label={
                interactive
                  ? `${b.x0} to ${b.x1} ${config.unit}: ${b.count}`
                  : undefined
              }
              style={interactive ? { cursor: "pointer" } : undefined}
              onMouseEnter={interactive ? () => setHover(i) : undefined}
              onMouseLeave={interactive ? () => setHover(null) : undefined}
              onFocus={interactive ? () => setHover(i) : undefined}
              onBlur={interactive ? () => setHover(null) : undefined}
            />
          );
        })}

        {/* zero baseline */}
        <line
          x1={0}
          x2={innerWidth}
          y1={base}
          y2={base}
          stroke={COLORS.axis}
          strokeWidth={1}
          opacity={chrome}
        />

        {/* bin-edge value labels */}
        <g opacity={chrome}>
          {layout.edgeTicks.map((t, i) =>
            i % edgeStep === 0 ? (
              <text
                key={`e${i}`}
                x={t.pos}
                y={innerHeight + 20 * sc}
                textAnchor="middle"
                fontSize={ts.axis}
                fill={COLORS.ink}
              >
                {t.label}
              </text>
            ) : null,
          )}
        </g>

        {/* median annotation — dashed accent line + white-haloed label */}
        <g opacity={medianOp}>
          <line
            x1={medianX}
            x2={medianX}
            y1={base}
            y2={2 * sc}
            stroke={MEDIAN}
            strokeWidth={2 * sc}
            strokeDasharray={`${5 * sc} ${3 * sc}`}
          />
          <text
            x={medianX}
            y={-2 * sc}
            textAnchor="middle"
            fontSize={ts.axis}
            fontWeight={700}
            fill={COLORS.ink}
            stroke="#fff"
            strokeWidth={3 * sc}
            style={{ paintOrder: "stroke" }}
          >
            median {Math.round(median)} {config.unit}
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
  layout: HistogramLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: HistogramConfig;
}) {
  const b = layout.bars[hover];
  const left = padding.left + b.x + b.w / 2;
  const top = padding.top + b.y - 8;
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
        fontSize: 13,
        whiteSpace: "nowrap",
        pointerEvents: "none",
        fontFamily: FONT,
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <strong>{b.count}</strong>{" "}
      <span style={{ opacity: 0.8 }}>
        in {b.x0}–{b.x1} {config.unit}
      </span>
    </div>
  );
}
