// THE one beeswarm / strip-plot component — every data point on ONE value axis,
// dodged vertically so none overlap (the "show your data" distribution chart). D3
// = math (beeswarm-geometry.ts: tangent-packing), React = DOM, one master
// `progress` scales each dot's radius from 0, staggered along the value axis.
// responsive=false = fixed (video/static); responsive=true = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: Okabe-Ito category palette + WCAG +
//     title=insight + cited source (ChartFrame + checkBeeswarmConformance), scale
//     via resolveFrame, the shared core/legend.
//   - TYPE-specific: the collision-avoidance dodge, the decorative (centred)
//     perpendicular axis, and the scale-in-from-nothing reveal.
import { useState } from "react";
import {
  computeBeeswarmLayout,
  type BeeswarmData,
  type BeeswarmLayout,
} from "./beeswarm-geometry";
import { clamp01, easeOutCubic, stagger } from "./core/math";
import {
  COLORS,
  themeColors,
  FONT,
  TYPE,
  OKABE_ITO,
  BEESWARM_CATEGORY_COLORS, tooltipBorder } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import { formatLocaleNumber, type Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";
import { layoutLegend } from "./core/legend";

export interface BeeswarmConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  /** newsroom dark theme — flips the chart chrome to the dark furniture set. */
  themeBg?: string;
  valueLabel: string; // subtitle / units
  categories?: string[];
  /** Okabe-Ito hex for a SINGLE-HUE swarm (no categories) — the subject-fit colour.
   *  Absent → OKABE_ITO.blue. Ignored when `categories` is set (the palette drives colour). */
  baseColor?: string;
  /** point labels the story calls out (the outliers that "break away") — rendered
   *  larger with a direct name+value label in ink, so they read without a hover. */
  highlight?: string[];
  /** the chart subject (e.g. "housing rents") — carried for the produce-time subject-fit
   *  guard; not rendered. A single-hue swarm on a blue-family hue for a non-blue subject fails. */
  subject?: string;
  points: { value: number; label?: string; category?: string }[];
}

export interface BeeswarmChartProps {
  config: BeeswarmConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

// shared with the produce-time conformance resolver (core/tokens.ts) so both
// stay in sync — one palette, not two.
const SWARM_COLORS = BEESWARM_CATEGORY_COLORS;

export function BeeswarmChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: BeeswarmChartProps) {
  const p = clamp01(progress);
  const s = responsive ? 1 : scale;
  const charsPerLine = Math.max(
    8,
    Math.floor((width - 48 * s) / (TYPE.title * s * 0.52)),
  );
  const titleLines = responsive
    ? Math.max(1, Math.ceil(config.title.length / Math.floor(width / 11)))
    : Math.max(1, Math.ceil(config.title.length / charsPerLine));
  const hasLegend = (config.categories?.length ?? 0) > 0;
  const basePad = {
    top: responsive ? 14 : 50 + titleLines * 27,
    right: 24,
    bottom: 40 + (hasLegend ? 24 : 0), // value ticks + (optional) legend
    left: 24,
  };
  const frame = resolveFrameWithHeader(
    config.title,
    config.valueLabel,
    width,
    height,
    basePad,
    scale,
    0.5,
    responsive,
  );
  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;
  const radius = 4.5 * sc;

  const colorIndex = new Map<string, number>();
  (config.categories ?? []).forEach((c, i) => colorIndex.set(c, i));
  // single-hue swarm → the subject-fit baseColor (or the Okabe-Ito blue default);
  // categorical swarm → the per-category palette.
  const singleHue = config.baseColor ?? OKABE_ITO.blue;
  const colorOf = (cat?: string) =>
    cat != null && colorIndex.has(cat)
      ? SWARM_COLORS[colorIndex.get(cat)! % SWARM_COLORS.length]
      : singleHue;

  const data: BeeswarmData = {
    valueLabel: config.valueLabel,
    points: config.points,
    categories: config.categories,
  };
  const layout = computeBeeswarmLayout(
    data,
    { width, height, padding },
    radius,
  );

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <BeeswarmSvg
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
        colorOf={colorOf}
      />
    ) : null;

  return (
    <ChartFrame
      title={config.title}
      subtitle={config.valueLabel}
      source={config.source}
      width={width}
      height={height}
      responsive={responsive}
      tooltip={tooltip}
      scale={sc}
      lang={config.lang}
      themeBg={config.themeBg}
    >
      {svg}
    </ChartFrame>
  );
}

function BeeswarmSvg({
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
  layout: BeeswarmLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: BeeswarmConfig;
  colorOf: (cat?: string) => string;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const C = themeColors(config.themeBg);
  const { innerWidth, innerHeight, nodes, valueTicks, radius } = layout;
  const n = nodes.length;
  const chrome = easeOutCubic(p / 0.16);
  const hiSet = new Set(config.highlight ?? []);
  // the named outliers, left→right — the direct-label layer stacks them on
  // alternating rows in this order so adjacent labels don't collide.
  const hiNodes = nodes
    .filter((nd) => nd.label != null && hiSet.has(nd.label))
    .sort((a, b) => a.x - b.x);

  const legend =
    config.categories && config.categories.length
      ? layoutLegend(
          config.categories,
          config.categories.map((c) => colorOf(c)),
          innerWidth,
          0,
          innerHeight + 36 * sc,
          ts.axis * 0.6,
          22 * sc,
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
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* value gridlines + bottom tick labels (wipe in) */}
        <g opacity={chrome * 0.6}>
          {valueTicks.map((t, i) => (
            <line
              key={`g${i}`}
              x1={t.pos}
              x2={t.pos}
              y1={0}
              y2={innerHeight}
              stroke={C.grid}
              strokeWidth={1}
            />
          ))}
        </g>
        <g opacity={chrome}>
          {valueTicks.map((t, i) => (
            <text
              key={`t${i}`}
              x={t.pos}
              y={innerHeight + 18 * sc}
              textAnchor="middle"
              fontSize={ts.source}
              fill={C.muted}
            >
              {t.label}
            </text>
          ))}
        </g>

        {/* the swarm — dots scale in from nothing, staggered along the value axis.
            The story's named outliers ("break away" points) render LARGER + fully
            opaque so they read at a glance; their name+value label is drawn below. */}
        {nodes.map((nd) => {
          const ap = easeOutCubic(stagger(p, nd.order, n, 0.15, 0.6 / n, 0.3));
          const color = colorOf(nd.category);
          const focused = interactive && hover === nd.index;
          const dim = interactive && hover !== null && !focused;
          const isHi = nd.label != null && hiSet.has(nd.label);
          return (
            <circle
              key={`d${nd.index}`}
              cx={nd.x}
              cy={nd.y}
              r={radius * ap * (focused ? 1.35 : isHi ? 1.55 : 1)}
              fill={color}
              fillOpacity={dim ? 0.35 : isHi ? 1 : 0.9}
              stroke={isHi ? C.ink : C.bg}
              strokeWidth={(isHi ? 1.4 : 0.8) * sc}
              tabIndex={interactive ? 0 : undefined}
              role={interactive ? "img" : undefined}
              aria-label={
                interactive
                  ? `${nd.label ? nd.label + ", " : ""}${nd.category ? nd.category + ", " : ""}${nd.value} ${config.valueLabel}`
                  : undefined
              }
              style={
                interactive ? { cursor: "pointer", outline: "none" } : undefined
              }
              onMouseEnter={interactive ? () => setHover(nd.index) : undefined}
              onMouseLeave={interactive ? () => setHover(null) : undefined}
              onFocus={interactive ? () => setHover(nd.index) : undefined}
              onBlur={interactive ? () => setHover(null) : undefined}
            />
          );
        })}

        {/* direct labels for the named outliers — name + value in INK (WCAG: the label
            carries the value, the mark carries the hue), with a white halo so they stay
            legible over neighbouring dots. Static/video only; interactive uses the hover
            tooltip (which the highlighted dots also enlarge for). Placement is EDGE-AWARE
            (anchor flips so a right-edge outlier's label extends inward, never clipping)
            and adjacent outliers are stacked on alternating rows so their labels don't
            collide. The value is the FULL localized number (a precise callout, not the
            abbreviated axis form). */}
        {!interactive &&
          hiNodes.map((nd, k) => {
            const lap = clamp01(
              (stagger(p, nd.order, n, 0.15, 0.6 / n, 0.3) - 0.5) / 0.5,
            );
            const nearRight = nd.x > innerWidth - 90 * sc;
            const nearLeft = nd.x < 90 * sc;
            const anchor = nearRight ? "end" : nearLeft ? "start" : "middle";
            const dx = nearRight ? -6 * sc : nearLeft ? 6 * sc : 0;
            // stack adjacent outliers on alternating rows to avoid label overlap
            const rowLift = (k % 2) * (ts.axis + 6 * sc);
            return (
              <text
                key={`hi${nd.index}`}
                x={nd.x + dx}
                y={nd.y - radius * 1.55 - 6 * sc - rowLift}
                textAnchor={anchor}
                fontSize={ts.axis}
                fontWeight={700}
                fill={C.ink}
                stroke={C.bg}
                strokeWidth={3 * sc}
                paintOrder="stroke"
                opacity={lap}
              >
                {`${nd.label} ${formatLocaleNumber(nd.value, config.lang)}`}
              </text>
            );
          })}

        {/* category legend below the swarm */}
        <g opacity={chrome}>
          {legend.map((it, i) => (
            <g key={`lg${i}`}>
              <circle
                cx={it.x + 6 * sc}
                cy={it.y - 4 * sc}
                r={6 * sc}
                fill={it.color}
              />
              <text
                x={it.x + 18 * sc}
                y={it.y}
                fontSize={ts.axis}
                fontWeight={600}
                fill={C.ink}
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
  colorOf,
}: {
  layout: BeeswarmLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: BeeswarmConfig;
  colorOf: (cat?: string) => string;
}) {
  const nd = layout.nodes.find((x) => x.index === hover);
  if (!nd) return null;
  const left = padding.left + nd.x;
  const top = padding.top + nd.y - layout.radius - 8;
  const color = colorOf(nd.category);
  return (
    <div
      className="tooltip"
      style={{
        position: "absolute",
        left,
        top,
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
      <strong style={{ fontSize: 13 }}>{nd.value}</strong>
      {nd.category && (
        <span style={{ fontSize: 12 }}>
          {" "}
          ·{" "}
          <span aria-hidden="true" style={{ color, marginRight: 4 }}>
            ■
          </span>
          <span style={{ color: "#fff" }}>{nd.category}</span>
        </span>
      )}
      {nd.label && <div style={{ opacity: 0.7, fontSize: 11 }}>{nd.label}</div>}
    </div>
  );
}
