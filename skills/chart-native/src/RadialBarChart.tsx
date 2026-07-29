// THE one radial-bar / radial-column component — categories around a circle
// (best for CYCLICAL data: hours, months), each bar's LENGTH ∝ value, growing
// from a baseline circle that is value 0 (baseline-0, like the cartesian bar —
// enforced by checkRadialBarConformance). Angle = category, NOT magnitude. Tick
// RINGS + haloed value labels form the radial axis so lengths can be decoded. D3
// = math (radial-bar-geometry.ts), React = DOM, one master `progress` grows the
// bars outward. responsive=false = fixed (video/static); responsive=true = embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused: title=insight + Okabe-Ito + source + WCAG
//     (ChartFrame + checkRadialBarConformance), scale via resolveFrame, core/text.
//   - TYPE-specific: the polar layout, the length=value radial encoding from a 0
//     baseline ring, the tick-ring axis, and the grow-outward reveal.
import { useState } from "react";
import {
  computeRadialBarLayout,
  radialBarPath,
  polar,
  type RadialBarData,
  type RadialBarLayout,
} from "./radial-bar-geometry";
import { clamp01, easeOutCubic, stagger } from "./core/math";
import {
  COLORS,
  FONT,
  TYPE,
  OKABE_ITO,
  themeColors,
  tooltipBorder,
} from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import type { Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";

export interface RadialBarConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  unit: string; // subtitle + value meaning
  categoryField: string;
  valueField: string;
  /** newsroom dark theme — flips the chrome furniture (bg/ink/muted). Default light. */
  themeBg?: string;
  /** subject-fit hue for the ring bars (the orange PEAK accent is unchanged).
   *  Absent → the OKABE_ITO.blue default. */
  baseColor?: string;
  rows: Record<string, string | number>[];
}

export interface RadialBarChartProps {
  config: RadialBarConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

const BASE_COLOR = OKABE_ITO.blue;
const PEAK_COLOR = OKABE_ITO.orange; // the accented peaks

export function RadialBarChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: RadialBarChartProps) {
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
    top: responsive ? 16 : 50 + titleLines * 27,
    right: 16,
    bottom: 16, // rim label margin (source band reserved in resolveFrameWithHeader)
    left: 16,
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

  // reserve a rim band outside the bars for the category (hour) labels
  const labelMargin = ts.axis + 12 * sc;

  const data: RadialBarData = {
    categoryField: config.categoryField,
    valueField: config.valueField,
    rows: config.rows,
  };
  const layout = computeRadialBarLayout(data, {
    width,
    height,
    padding,
    labelMargin,
  });

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <RadialBarSvg
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
      themeBg={config.themeBg}
      baseColor={config.baseColor}
    >
      {svg}
    </ChartFrame>
  );
}

function RadialBarSvg({
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
  layout: RadialBarLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: RadialBarConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { cx, cy, innerR, outerR, bars, ticks } = layout;
  const n = bars.length;
  const C = themeColors(config.themeBg, config.baseColor);
  const chrome = easeOutCubic(p / 0.18);
  const ox = padding.left + cx;
  const oy = padding.top + cy;

  // accent the two tallest bars (the two commute peaks → the "twice a day" story)
  const peakSet = new Set(
    [...bars]
      .sort((a, b) => b.value - a.value)
      .slice(0, 2)
      .map((b) => b.index),
  );

  // label every ~Nth category so ~8 labels survive (no rim crowding)
  const step = Math.max(1, Math.ceil(n / 8));
  const halo = {
    paintOrder: "stroke" as const,
    stroke: C.bg,
    strokeWidth: 3 * sc,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={config.title}
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
      <g transform={`translate(${ox},${oy})`}>
        {/* tick rings + the baseline circle (radial value axis) */}
        <g opacity={chrome}>
          <circle r={innerR} fill="none" stroke={C.axis} strokeWidth={1} />
          {ticks.map((t, i) => (
            <circle
              key={`ring${i}`}
              r={t.r}
              fill="none"
              stroke={C.grid}
              strokeWidth={1}
            />
          ))}
        </g>

        {/* bars (grow outward, staggered clockwise) */}
        <g>
          {bars.map((b) => {
            const grow = stagger(p, b.index, n, 0.15, 0.5 / n, 0.5);
            const isPeak = peakSet.has(b.index);
            const focused = interactive && hover === b.index;
            const dim = interactive && hover !== null && !focused;
            return (
              <path
                key={`b${b.index}`}
                d={radialBarPath(b, 0, 0, innerR, clamp01(grow))}
                fill={isPeak ? PEAK_COLOR : (config.baseColor ?? BASE_COLOR)}
                opacity={dim ? 0.35 : 1}
                tabIndex={interactive ? 0 : undefined}
                role={interactive ? "img" : undefined}
                aria-label={
                  interactive
                    ? `${b.category}: ${b.value} ${config.unit}`
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
            );
          })}
        </g>

        {/* radial value-axis labels along the straight-up spoke (haloed) */}
        <g opacity={chrome}>
          {ticks.map((t, i) => (
            <text
              key={`vt${i}`}
              x={0}
              y={-t.r}
              dy="0.32em"
              textAnchor="middle"
              fontSize={ts.source}
              fill={C.muted}
              style={halo}
            >
              {t.label}
            </text>
          ))}
        </g>

        {/* category (hour) labels around the rim */}
        <g opacity={chrome}>
          {bars.map((b) =>
            b.index % step === 0 ? (
              <text
                key={`c${b.index}`}
                x={polar(0, 0, outerR + 12 * sc, b.aMid).x}
                y={polar(0, 0, outerR + 12 * sc, b.aMid).y}
                dy="0.32em"
                textAnchor="middle"
                fontSize={ts.source}
                fontWeight={600}
                fill={C.ink}
              >
                {b.category}
              </text>
            ) : null,
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
  layout: RadialBarLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: RadialBarConfig;
}) {
  const b = layout.bars.find((x) => x.index === hover);
  if (!b) return null;
  const tip = polar(
    padding.left + layout.cx,
    padding.top + layout.cy,
    b.rValue + 6,
    b.aMid,
  );
  return (
    <div
      className="tooltip"
      style={{
        position: "absolute",
        left: tip.x,
        top: tip.y,
        transform: "translate(-50%,-100%)",
        background: COLORS.ink,
        border: tooltipBorder(config.themeBg),
        color: "#fff",
        padding: "6px 10px",
        borderRadius: 6,
        whiteSpace: "nowrap",
        pointerEvents: "none",
        fontFamily: FONT,
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <strong style={{ fontSize: 13 }}>{b.category}</strong>
      <span style={{ fontSize: 11, opacity: 0.85, marginLeft: 6 }}>
        {b.value} {config.unit}
      </span>
    </div>
  );
}
