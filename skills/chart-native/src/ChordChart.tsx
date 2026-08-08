// THE one chord diagram component — a circular flow matrix: each entity's arc ∝
// its total, each ribbon ∝ a pair's flow. D3 = math (chord-geometry.ts: d3-chord
// + d3-shape arc), React = DOM, one master `progress` blooms the figure from the
// centre and fades the ribbons in. responsive=false = fixed (video/static);
// responsive=true = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: Okabe-Ito entity palette + WCAG +
//     title=insight + cited source (ChartFrame + checkChordConformance), scale via
//     resolveFrame, core/text.truncate for arc labels.
//   - TYPE-specific: the circular arc+ribbon layout, the source-coloured ribbons,
//     and the bloom-from-centre reveal.
import { useState } from "react";
import {
  computeChordLayout,
  type ChordData,
  type ChordLayout,
} from "./chord-geometry";
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
import { flowWords, type Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";
import { truncate, textWidth } from "./core/text";

export interface ChordConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  unit: string; // subtitle
  labels: string[];
  matrix: number[][];
  /** newsroom house theme GROUND (F2 house `theme`) — every furniture token (ink, muted,
   *  axis, grid, bg) derives from this hex. Undefined = the light default (byte-identical). */
  themeBg?: string;
  /** newsroom house hue (spec `baseColor`): tints the FURNITURE greys (muted/axis/grid) and
   *  the frame's title band toward the house colour. Entities carry a fixed Okabe-Ito
   *  categorical palette, so the hue never touches the arcs or ribbons — one hue would
   *  collapse the entities it separates. Undefined = untinted (byte-identical). */
  baseColor?: string;
}

export interface ChordChartProps {
  config: ChordConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

/** The entity palette, exported so the produce guard checks the hues the component actually
 *  paints rather than a copy of them. */
export const CHORD_ENTITY_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.green,
  OKABE_ITO.purple,
  OKABE_ITO.vermillion,
  OKABE_ITO.skyblue,
  OKABE_ITO.yellow,
  OKABE_ITO.black,
];

export function ChordChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: ChordChartProps) {
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
    right: 12,
    bottom: 14,
    left: 12,
  };
  const frame = resolveFrameWithHeader(
    config.title,
    config.unit,
    width,
    height,
    basePad,
    scale,
    1,
    responsive,
  );
  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;

  const data: ChordData = { labels: config.labels, matrix: config.matrix };
  const arcW = 12 * sc;
  // The label sits `arcW + 8` outside the ring and is drawn at `ts.axis`. Horizontally it needs
  // its own WIDTH; vertically only a line. Measured here — the geometry stays pure — from the
  // labels this chart actually carries, so a ring of short names gets a bigger circle than a
  // ring of long ones instead of both getting the smaller of the two.
  const labelPx = Math.max(
    0,
    ...config.labels.map((l) => textWidth(l, ts.axis)),
  );
  const layout = computeChordLayout(
    data,
    { width, height, padding },
    {
      arcWidth: arcW,
      labelGutterX: arcW + 8 * sc + labelPx,
      labelGutterY: arcW + 8 * sc + ts.axis,
    },
  );

  const [hover, setHover] = useState<number | null>(null);
  const colorOf = (i: number) => CHORD_ENTITY_COLORS[i % CHORD_ENTITY_COLORS.length];

  const svg = (
    <ChordSvg
      layout={layout}
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
        hover={hover}
        config={config}
        colorOf={colorOf}
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

function ChordSvg({
  layout,
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
  layout: ChordLayout;
  width: number;
  height: number;
  p: number;
  config: ChordConfig;
  colorOf: (i: number) => string;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { cx, cy, radius, groups, ribbons } = layout;
  const C = themeColors(config.themeBg, config.baseColor);
  const nR = ribbons.length;
  const chrome = easeOutCubic(p / 0.18);
  const bloom = 0.45 + 0.55 * easeOutCubic(clamp01((p - 0.05) / 0.45));
  const labelOp = clamp01((p - 0.55) / 0.35);

  // a ribbon connects to the hovered entity?
  const touches = (r: { source: number; target: number }) =>
    hover === null || r.source === hover || r.target === hover;

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={config.title}
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
      {/* bloom-from-centre: scale the arcs + ribbons group about the centre */}
      <g transform={`translate(${cx},${cy}) scale(${bloom})`} opacity={chrome}>
        {/* ribbons (behind the arcs) */}
        {ribbons.map((r) => {
          const ap = easeOutCubic(stagger(p, r.index, nR, 0.15, 0.5 / nR, 0.4));
          if (ap <= 0.01) return null;
          const on = touches(r);
          return (
            <path
              key={`r${r.index}`}
              d={r.path}
              fill={colorOf(r.source)}
              fillOpacity={(on ? 0.62 : 0.12) * ap}
              stroke="#fff"
              strokeWidth={0.4 * sc}
            />
          );
        })}
        {/* group arcs */}
        {groups.map((g) => {
          const dim = interactive && hover !== null && hover !== g.index;
          return (
            <path
              key={`g${g.index}`}
              className="chord-arc"
              d={g.arcPath}
              fill={colorOf(g.index)}
              opacity={dim ? 0.4 : 1}
              tabIndex={interactive ? 0 : undefined}
              role={interactive ? "img" : undefined}
              aria-label={
                interactive
                  ? `${g.label}: ${Math.round(g.value)} ${config.unit}`
                  : undefined
              }
              style={
                interactive ? { cursor: "pointer", outline: "none" } : undefined
              }
              onMouseEnter={interactive ? () => setHover(g.index) : undefined}
              onMouseLeave={interactive ? () => setHover(null) : undefined}
              onFocus={interactive ? () => setHover(g.index) : undefined}
              onBlur={interactive ? () => setHover(null) : undefined}
            />
          );
        })}
      </g>

      {/* arc labels (outside the scaled group so they don't distort) */}
      <g opacity={labelOp}>
        {groups.map((g) => {
          const lx = cx + g.labelX;
          const ly = cy + g.labelY;
          const dim = interactive && hover !== null && hover !== g.index;
          return (
            <text
              key={`l${g.index}`}
              x={lx}
              y={ly}
              dy="0.32em"
              textAnchor={g.side === "right" ? "start" : "end"}
              fontSize={ts.axis}
              fontWeight={600}
              fill={C.ink}
              opacity={dim ? 0.4 : 1}
            >
              {truncate(
                g.label,
                g.side === "right" ? width - lx - 6 : lx - 6,
                ts.axis,
              )}
            </text>
          );
        })}
      </g>
    </svg>
  );
}

function Tooltip({
  layout,
  hover,
  config,
  colorOf,
}: {
  layout: ChordLayout;
  hover: number;
  config: ChordConfig;
  colorOf: (i: number) => string;
}) {
  const g = layout.groups.find((x) => x.index === hover);
  if (!g) return null;
  const words = flowWords(config.lang);
  const left = layout.cx + g.labelX;
  const top = layout.cy + g.labelY - 10;
  // top partners by flow (out + in)
  const partners = config.labels
    .map((label, j) => ({
      label,
      flow: (config.matrix[hover]?.[j] ?? 0) + (config.matrix[j]?.[hover] ?? 0),
    }))
    .filter((x, j) => j !== hover && x.flow > 0)
    .sort((a, b) => b.flow - a.flow)
    .slice(0, 3);
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
      <span
        aria-hidden="true"
        style={{ color: colorOf(hover), marginRight: 4 }}
      >
        ■
      </span>
      <strong style={{ color: "#fff", fontSize: 13 }}>{g.label}</strong>{" "}
      <span style={{ fontSize: 12 }}>
        {Math.round(g.value)} {words.outgoing}
      </span>
      <div style={{ opacity: 0.75, fontSize: 11 }}>
        {words.mostWith}{" "}
        {partners.map((pp) => `${pp.label} (${pp.flow})`).join(", ")}
      </div>
    </div>
  );
}
