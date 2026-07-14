// THE one scatter/bubble component — third cartesian type. Same discipline:
// D3 = math (scatter-geometry.ts), React = DOM, one master `progress` drives a
// motion build that is a pure function of progress. responsive=false keeps the
// fixed absolute layout (video + static); responsive=true is the flow layout.
//
// Motion (per formats/video.md):
//   chrome (both axes + gridlines) wipes in → dots POP IN in place (scale 0→1,
//   slight bloom), staggered left→right → the outlier label fades in last.
//   Dots never fly in — position is the encoding.

import { useState } from "react";
import {
  computeScatterLayout,
  type ScatterData,
  type ScatterDims,
  type ScatterLayout,
} from "./scatter-geometry";
import { formatNumber, clamp01, easeOutCubic, stagger } from "./core/math";
import { COLORS, TYPE, themeColors, tooltipBorder } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import type { Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";
import { placeLabels } from "./core/labels";

export interface ScatterConfig {
  title: string; // the insight (sentence case)
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  xField: string;
  yField: string;
  sizeField?: string;
  labelField?: string;
  xLabel: string; // axis title — what x means
  yLabel: string; // axis title — what y means
  /** the story points to label (by their label value) — the journalist/② names
   *  the few that matter (scatter.md). When set, ONLY these are labelled. */
  annotate?: string[];
  /** fallback when `annotate` is absent: "default" = just the headline outlier
   *  (recommended), "all" = every named point, "none" = no labels. */
  labelPoints?: "default" | "all" | "none";
  /** Okabe-Ito hex for the primary dot colour. Absent → COLORS.line default. */
  baseColor?: string;
  /** newsroom dark theme (F2 house `theme: dark`): flips the chrome furniture. */
  themeBg?: string;
  rows: Record<string, string | number>[];
}

export interface ScatterChartProps {
  config: ScatterConfig;
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

const PADDING = (responsive: boolean) => ({
  top: responsive ? 16 : 64,
  right: 40,
  bottom: 60,
  left: 64,
});

export function ScatterChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
  embedded = false,
}: ScatterChartProps) {
  const p = clamp01(progress);
  const basePad = PADDING(responsive);
  const frame = resolveFrameWithHeader(
    config.title,
    undefined,
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
  const dims: ScatterDims = { width, height, padding };
  const data: ScatterData = {
    xField: config.xField,
    yField: config.yField,
    sizeField: config.sizeField,
    labelField: config.labelField,
    rows: config.rows,
  };
  const layout = computeScatterLayout(data, dims, {
    minR: 5 * sc,
    maxR: 22 * sc,
    dotR: 6 * sc,
  });
  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <ScatterSvg
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
      source={config.source}
      width={width}
      height={height}
      responsive={responsive}
      tooltip={tooltip}
      scale={sc}
      lang={config.lang}
      embedded={embedded}
      themeBg={config.themeBg}
    >
      {svg}
    </ChartFrame>
  );
}

function ScatterSvg({
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
  layout: ScatterLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: ScatterConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const C = themeColors(config.themeBg);
  const { innerWidth, innerHeight, points } = layout;
  const dotColor = config.baseColor ?? C.line;
  const n = points.length;
  const chrome = easeOutCubic(p / 0.18);
  // dots pop in, staggered LEFT→RIGHT along x (the eye reads the spread building
  // from the origin) — rank by screen x, independent of row order.
  const xRank = new Array<number>(n);
  points
    .map((pt, i) => ({ i, x: pt.x }))
    .sort((a, b) => a.x - b.x)
    .forEach((o, r) => (xRank[o.i] = r));
  const popP = (i: number) => stagger(p, xRank[i], n, 0.18, 0.5 / n, 0.4);
  // a mild bloom: overshoot mid-pop, settle to 1
  const bloom = (s: number) => s * (1 + 0.16 * Math.sin(clamp01(s) * Math.PI));
  const labelOpacity = clamp01((p - 0.85) / 0.15);

  // WHICH points to label (scatter.md "label the few that matter, not all"):
  //  - config.annotate (the journalist/② names the story points) → those;
  //  - labelPoints "all"/"none" → escape hatches;
  //  - default → just the headline outlier (the max-y point). Never all.
  const strategy = config.labelPoints ?? "default";
  const outlier = points.reduce(
    (mi, pt, i, a) => (pt.rawY > a[mi].rawY ? i : mi),
    0,
  );
  const annotateSet = config.annotate ? new Set(config.annotate) : null;
  const candidates: number[] = annotateSet
    ? points
        .map((pt, i) => (pt.label && annotateSet.has(pt.label) ? i : -1))
        .filter((i) => i >= 0)
    : strategy === "none"
      ? []
      : strategy === "all"
        ? points.map((pt, i) => (pt.label ? i : -1)).filter((i) => i >= 0)
        : points[outlier]?.label
          ? [outlier]
          : [];

  // Label placement is a GLOBAL concern → core/labels.placeLabels guarantees the
  // invariant (in-bounds, no overlap with a bubble or another label). Scatter
  // only supplies the TYPE-SPECIFIC inputs: which points to label, the marks to
  // avoid (every bubble), and the plot bounds.
  const placedLabels = placeLabels(
    candidates.map((idx) => ({
      id: idx,
      text: points[idx].label ?? "",
      ax: points[idx].x,
      ay: points[idx].y,
      r: points[idx].r,
      priority: points[idx].rawY,
      // An EXPLICITLY-requested highlight (config.annotate) must never be silently
      // dropped by the collision placer — if crowded, offset it rather than skip it.
      // The auto "default outlier" is not required (a lone label never contends).
      required: annotateSet !== null,
    })),
    points.map((pt) => ({
      x0: pt.x - pt.r,
      x1: pt.x + pt.r,
      y0: pt.y - pt.r,
      y1: pt.y + pt.r,
    })),
    {
      bounds: { x0: 0, x1: innerWidth, y0: 0, y1: innerHeight },
      charW: ts.axis * 0.6,
      lh: 18 * sc,
    },
  );

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={config.title}
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* chrome: gridlines + axis ticks + axis titles */}
        <g opacity={chrome}>
          {layout.yTicks.map((t, i) => (
            <g key={`y${i}`}>
              <line
                x1={0}
                x2={innerWidth}
                y1={t.pos}
                y2={t.pos}
                stroke={C.grid}
                strokeWidth={1}
              />
              <text
                x={-10}
                y={t.pos}
                dy="0.32em"
                textAnchor="end"
                fontSize={ts.axis}
                fill={C.muted}
              >
                {t.label}
              </text>
            </g>
          ))}
          {layout.xTicks.map((t, i) => (
            <text
              key={`x${i}`}
              x={t.pos}
              y={innerHeight + 20}
              textAnchor="middle"
              fontSize={ts.axis}
              fill={C.muted}
            >
              {t.label}
            </text>
          ))}
          {/* axis titles (what the numbers mean) */}
          <text
            x={innerWidth / 2}
            y={innerHeight + 44}
            textAnchor="middle"
            fontSize={ts.axis}
            fontWeight={600}
            fill={C.muted}
          >
            {config.xLabel}
          </text>
          <text
            x={-10}
            y={-6}
            textAnchor="start"
            fontSize={ts.axis}
            fontWeight={600}
            fill={C.muted}
          >
            {config.yLabel}
          </text>
          <line
            x1={0}
            x2={0}
            y1={0}
            y2={innerHeight}
            stroke={C.axis}
            strokeWidth={1}
          />
          <line
            x1={0}
            x2={innerWidth}
            y1={innerHeight}
            y2={innerHeight}
            stroke={C.axis}
            strokeWidth={1}
          />
        </g>

        {/* dots — pop in place */}
        {points.map((pt, i) => {
          const s = bloom(popP(i));
          const r = pt.r * s;
          const focused = interactive && hover === i;
          return (
            <circle
              key={`d${i}`}
              className="scatter-dot"
              cx={pt.x}
              cy={pt.y}
              r={r}
              fill={dotColor}
              fillOpacity={0.72}
              stroke={focused ? "#fff" : "none"}
              strokeWidth={focused ? 2 : 0}
              tabIndex={interactive ? 0 : undefined}
              role={interactive ? "img" : undefined}
              aria-label={interactive ? pointAria(pt, config) : undefined}
              style={interactive ? { cursor: "pointer" } : undefined}
              onMouseEnter={interactive ? () => setHover(i) : undefined}
              onMouseLeave={interactive ? () => setHover(null) : undefined}
              onFocus={interactive ? () => setHover(i) : undefined}
              onBlur={interactive ? () => setHover(null) : undefined}
            />
          );
        })}

        {/* point labels (fade in last) — collision-placed; offset labels in a
            dense cluster get a thin LEADER LINE back to their dot */}
        {placedLabels.map(({ id, x, y, anchor, leader }) => (
          <g key={`lbl${id}`} opacity={labelOpacity}>
            {leader && (
              <line
                x1={leader.x1}
                y1={leader.y1}
                x2={leader.x2}
                y2={leader.y2}
                stroke={dotColor}
                strokeWidth={1}
                strokeOpacity={0.55}
              />
            )}
            <text
              x={x}
              y={y}
              dy="0.32em"
              textAnchor={anchor}
              fontSize={ts.axis}
              fontWeight={600}
              // #3 — the point-label TEXT is ink for WCAG contrast; the coloured DOT (and its
              // leader line) carry the hue. Painting labels in `dotColor` failed contrast for a
              // subject-fit hue and forced the producer back to the default blue.
              fill={C.ink}
            >
              {points[Number(id)].label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function pointAria(
  pt: { rawX: number; rawY: number; rawSize?: number; label?: string },
  config: ScatterConfig,
): string {
  const base = `${pt.label ? pt.label + ": " : ""}${config.xLabel} ${formatNumber(pt.rawX, config.lang)}, ${config.yLabel} ${formatNumber(pt.rawY, config.lang)}`;
  return pt.rawSize !== undefined
    ? `${base}, ${config.sizeField} ${formatNumber(pt.rawSize, config.lang)}`
    : base;
}

function Tooltip({
  layout,
  padding,
  hover,
  config,
}: {
  layout: ScatterLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: ScatterConfig;
}) {
  const pt = layout.points[hover];
  return (
    <div
      className="tooltip"
      style={{
        position: "absolute",
        left: padding.left + pt.x + 12,
        top: padding.top + pt.y - 8,
        background: COLORS.ink,
        border: tooltipBorder(config.themeBg),
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
      {pt.label && <strong>{pt.label}</strong>}
      <div style={{ opacity: 0.85 }}>
        {config.xLabel}: {formatNumber(pt.rawX, config.lang)}
      </div>
      <div style={{ opacity: 0.85 }}>
        {config.yLabel}: {formatNumber(pt.rawY, config.lang)}
      </div>
    </div>
  );
}
