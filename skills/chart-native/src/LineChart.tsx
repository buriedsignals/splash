// THE ONE component. Frame-driven by a single `progress` prop (0 -> 1).
// - static  : rendered at progress=1, screenshotted to PNG (responsive=false).
// - video   : Remotion computes eased progress per frame (responsive=false).
//   Both keep the FIXED absolute layout → pixel-identical, frame-deterministic.
// - interactive : responsive=true → a flow layout (title above the plot, not
//   overlapping it) with a width-aware x-tick count, so it re-lays-out cleanly
//   from mobile to desktop. The geometry is identical; only the container and
//   the reserved title space differ.
//
// D3 does the math (chart-geometry.ts, framework-free); React only renders DOM.
// The component itself has NO clock/randomness — everything is a pure function
// of `progress` (Tom's discipline). The clock lives in InteractiveLineChart.

import { useState } from "react";
import {
  computeChartLayout,
  revealLine,
  revealHead,
  type ChartData,
  type Dims,
  type Layout,
} from "./chart-geometry";
import {
  formatNumber,
  clamp01,
  easeInOutCubic,
  easeOutCubic,
  stagger,
} from "./core/math";
import { COLORS, TYPE } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import type { Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";

export interface ChartConfig {
  title: string; // = the insight (sentence case)
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  unit: string;
  directLabel: string; // direct label over a legend
  xField: string;
  yField: string;
  xType: "time" | "linear";
  /** Okabe-Ito hex for the primary series colour. Absent → COLORS.line default. */
  baseColor?: string;
  points: Record<string, string | number>[];
}

export interface LineChartProps {
  config: ChartConfig;
  progress?: number; // 0..1 reveal; default 1 (final frame)
  width?: number;
  height?: number;
  /** enable the hover tooltip (interactive build only) */
  interactive?: boolean;
  /** flow layout (title above plot) + width-aware ticks, for the web embed.
   *  false (default) keeps the fixed absolute layout used by video + static. */
  responsive?: boolean;
  /** typography/margin scale for non-landscape video canvases (default 1). */
  scale?: number;
  /** embedded = a sticky graphic in a scroll host (chart-scrolly). The AXES render
   *  statically (fully visible at progress 0, so the frame is there before the line
   *  draws) and the line reveal is LINEAR in `progress` (no video ease/window), so the
   *  drawn head position tracks the scroll exactly; title + source are suppressed (the
   *  host owns them). Default false → the video/static reveal is unchanged. */
  embedded?: boolean;
  /** embedded only: reveal the line up to this FRACTIONAL data-point index (0 = the
   *  first point / empty, n-1 = full). LineChart converts it to the exact path-length
   *  fraction using ITS OWN responsive layout — so the drawn head lands on the point at
   *  ANY width, and the host never needs to know the pixel geometry. Overrides `progress`
   *  for the line reveal when set. */
  revealTo?: number;
}

export function LineChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
  embedded = false,
  revealTo,
}: LineChartProps) {
  const p = clamp01(progress);

  // Fixed layout reserves 64px at the top for the in-box title; responsive
  // moves the title OUT of the SVG (into normal flow). On a square/portrait
  // video canvas, resolveFrame scales the type/margins and centres the plot.
  // Right gutter is SIZED to the direct label so it can never overflow the
  // chart — the label is drawn at the line's end + a gap, inside this margin.
  // (resolveFrame scales both the gutter and the label by the same factor, so
  // the fit holds at any aspect/scale. The label is the widest of the two lines.)
  const labelGutter = 10 + config.directLabel.length * TYPE.label * 0.66 + 16;
  const basePad = {
    top: responsive ? 16 : 64,
    right: Math.max(140, labelGutter),
    bottom: 52,
    left: 56,
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
  const dims: Dims = { width, height, padding };
  const data: ChartData = {
    xField: config.xField,
    yField: config.yField,
    xType: config.xType,
    points: config.points,
  };

  // width-aware tick count so labels never collide on narrow embeds (~1 per 110px)
  const innerW = width - padding.left - padding.right;
  const xTickCount = responsive ? Math.max(2, Math.round(innerW / 110)) : 6;
  const layout = computeChartLayout(data, dims, xTickCount, config.lang);

  const [hover, setHover] = useState<number | null>(null);

  // The motion build is staged inside ChartSvg as pure functions of the master
  // `progress` (p, LINEAR time): axes wipe in → line draws (head sweeps the
  // x-labels in) → direct label slides in. The line has its OWN ease-in-out over
  // a wide window [0.30, 0.95] so it draws slowly and smoothly (soft start/stop),
  // independent of the other phases — the master is linear, each phase eases itself.
  // Video/static: the line eases over a [0.30, 0.95] window (after the axes wipe in).
  // Embedded (scroll host): the line is LINEAR in progress. When `revealTo` (a fractional
  // data-point index) is given, resolve it to the exact path-length fraction using THIS
  // layout's cumLength — so the head lands on the point at any responsive width, no matter
  // the host's dims.
  const revealFraction =
    revealTo != null
      ? (() => {
          const cum = layout.cumLength;
          const total = layout.totalLength || 1;
          const last = cum.length - 1;
          const fi = Math.max(0, Math.min(last, revealTo));
          const i0 = Math.floor(fi);
          const len =
            i0 >= last
              ? cum[last]
              : cum[i0] + (cum[i0 + 1] - cum[i0]) * (fi - i0);
          return len / total;
        })()
      : p;
  const lineProgress = embedded
    ? revealFraction
    : easeInOutCubic((p - 0.3) / 0.65); // window 0.30 → 0.95

  const svg = (
    <ChartSvg
      layout={layout}
      padding={padding}
      width={width}
      height={height}
      p={p}
      lineProgress={lineProgress}
      config={config}
      interactive={interactive}
      hover={hover}
      setHover={setHover}
      ts={ts}
      sc={sc}
      staticAxes={embedded}
    />
  );

  const tooltip =
    interactive && hover !== null ? (
      <div
        className="tooltip"
        style={{
          position: "absolute",
          left: padding.left + layout.points[hover].x + 12,
          top: padding.top + layout.points[hover].y - 8,
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
        <strong>{formatNumber(layout.points[hover].rawY, config.lang)}</strong>{" "}
        <span style={{ opacity: 0.8 }}>{config.unit}</span>
        <div style={{ opacity: 0.7, fontSize: 11 }}>
          {String(layout.points[hover].rawX)}
        </div>
      </div>
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
      embedded={embedded}
    >
      {svg}
    </ChartFrame>
  );
}

// The chart itself — identical geometry for every format/layout.
function ChartSvg({
  layout,
  padding,
  width,
  height,
  p,
  lineProgress,
  config,
  interactive,
  hover,
  setHover,
  ts,
  sc,
  staticAxes = false,
}: {
  layout: Layout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  lineProgress: number;
  config: ChartConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
  /** render the axes/gridlines/labels at FULL visibility regardless of `p` (embedded
   *  scroll host: the frame is present before the line draws). Default false = wipe-in. */
  staticAxes?: boolean;
}) {
  const lp = lineProgress;
  const revealed = revealLine(layout, lp);
  const head = revealHead(layout, lp);
  const lastPoint = layout.points[layout.points.length - 1];
  const { innerWidth, innerHeight } = layout;
  const lineColor = config.baseColor ?? COLORS.line;

  // --- motion build (all pure functions of the master progress `p`) ---
  // baseline draws left→right first; gridlines wipe in, staggered top→bottom.
  const baseW = staticAxes ? innerWidth : innerWidth * easeOutCubic(p / 0.18);
  const nY = layout.yTicks.length;
  // x-axis labels pop in (fade + rise) as the line's draw-head sweeps PAST them
  // — the ramp starts at 0 only once the head crosses the tick, so the first
  // label (which sits under the head before the line starts) is hidden, not
  // pre-visible. A short tail guarantees every label is full by the end (the
  // last tick coincides with the head's final position, so the sweep alone
  // would leave it at 0).
  const xLabelReveal = (tickX: number) =>
    staticAxes
      ? 1
      : Math.max(clamp01((head.x - tickX) / 28), clamp01((p - 0.9) / 0.05));
  // direct label slides in from the point just after the LINE ITSELF completes —
  // gated on `lp` (the line's own reveal fraction), not the master `p`. Embedded/
  // scrolly holds `p` at its default (1) while `lp` tracks the scroll-driven
  // `revealTo`; gating on `p` there made the label visible from the first frame,
  // regardless of how much line was actually drawn. Video shares the same window
  // as the line's own draw ([0.30, 0.95] via lp), so the label now finishes
  // fading in exactly as the line lands, instead of racing ahead of it.
  const labelOpacity = clamp01((lp - 0.92) / 0.08);

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={config.title}
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* gridlines: horizontal wipe from the left, staggered bottom→top */}
        {layout.yTicks.map((t, i) => {
          const w = staticAxes
            ? 1
            : stagger(p, nY - 1 - i, nY, 0.02, 0.03, 0.22);
          const lo = staticAxes
            ? 1
            : stagger(p, nY - 1 - i, nY, 0.06, 0.03, 0.16);
          return (
            <g key={`y${i}`}>
              <line
                x1={0}
                x2={innerWidth * w}
                y1={t.y}
                y2={t.y}
                stroke={COLORS.grid}
                strokeWidth={1}
              />
              <text
                x={-10 * sc}
                y={t.y}
                dy="0.32em"
                textAnchor="end"
                fontSize={ts.axis}
                fill={COLORS.muted}
                opacity={lo}
                transform={`translate(${-(1 - lo) * 8},0)`}
              >
                {t.label}
              </text>
            </g>
          );
        })}
        {/* x labels: fade + rise, triggered by the sweeping draw-head */}
        {layout.xTicks.map((t, i) => {
          const o = xLabelReveal(t.x);
          return (
            <text
              key={`x${i}`}
              x={t.x}
              y={innerHeight + 22 * sc}
              textAnchor="middle"
              fontSize={ts.axis}
              fill={COLORS.muted}
              opacity={o}
              transform={`translate(0,${(1 - o) * 8})`}
            >
              {t.label}
            </text>
          );
        })}
        {/* baseline draws left→right, first */}
        <line
          x1={0}
          x2={baseW}
          y1={innerHeight}
          y2={innerHeight}
          stroke={COLORS.axis}
          strokeWidth={1}
        />

        {revealed && (
          <path
            className="series-line"
            d={revealed}
            fill="none"
            stroke={lineColor}
            strokeWidth={3 * sc}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {lp > 0 && lp < 1 && (
          <>
            <circle
              cx={head.x}
              cy={head.y}
              r={9}
              fill={COLORS.headGlow}
              opacity={0.25}
            />
            <circle
              cx={head.x}
              cy={head.y}
              r={4.5}
              fill={COLORS.head}
              stroke={lineColor}
              strokeWidth={2}
            />
          </>
        )}

        {/* end-point dot + name/value label — anchored at `head`, the line's OWN
            current tip (identical to `lastPoint` once lp reaches 1), so it can
            never sit ahead of where the line has actually drawn to. */}
        <g
          opacity={labelOpacity}
          transform={`translate(${(1 - labelOpacity) * -12},0)`}
        >
          <circle cx={head.x} cy={head.y} r={4} fill={lineColor} />
          <text
            x={head.x + 10 * sc}
            y={head.y}
            dy="0.32em"
            fontSize={ts.label}
            fontWeight={600}
            // #3 — the direct-label TEXT carries the series name in ink; the coloured
            // line-end DOT (above) carries the hue. Painting this text in `lineColor` failed
            // WCAG for a subject-fit hue (vermillion 3.87:1, green 3.42:1) — which forced the
            // producer back to the default blue, the one hue the KB warns against defaulting to.
            fill={COLORS.ink}
          >
            {config.directLabel}
          </text>
          <text
            x={head.x + 10 * sc}
            y={head.y + 16 * sc}
            dy="0.32em"
            fontSize={ts.axis}
            fill={COLORS.muted}
          >
            {formatNumber(lastPoint.rawY, config.lang)}
          </text>
        </g>

        {interactive &&
          layout.points.map((pt, i) => (
            <circle
              key={`hit${i}`}
              cx={pt.x}
              cy={pt.y}
              r={14}
              fill="transparent"
              style={{ cursor: "pointer" }}
              tabIndex={0}
              role="img"
              aria-label={`${pt.rawX}: ${formatNumber(pt.rawY, config.lang)} ${config.unit}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            />
          ))}
        {interactive && hover !== null && (
          <g pointerEvents="none">
            <circle
              cx={layout.points[hover].x}
              cy={layout.points[hover].y}
              r={5}
              fill={lineColor}
              stroke="#fff"
              strokeWidth={2}
            />
          </g>
        )}
      </g>
    </svg>
  );
}
