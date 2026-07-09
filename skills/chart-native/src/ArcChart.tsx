// THE one arc-diagram component — nodes on a baseline (a 1-D ordering is the
// editorial choice), each relationship an arc rising above the line. Link weight
// → stroke width; node degree → node radius (area). Arcs that cross a group
// boundary are brought forward (the "cross-party" subject); within-group arcs sit
// back. Arc height is CAPPED in geometry so a wide link can't escape the plot. D3
// = math (arc-geometry.ts), React = DOM, one master `progress` sweeps each arc
// open. responsive=false = fixed (video/static); responsive=true = embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused: title=insight + Okabe-Ito + source + WCAG
//     (ChartFrame + checkArcConformance), scale via resolveFrame, core/text.
//   - TYPE-specific: the baseline node layout, the weight→width arcs, the
//     within/cross-group emphasis, and the sweep-open reveal.
import { useState } from "react";
import {
  computeArcLayout,
  arcPath,
  NODE_R_MAX,
  type ArcData,
  type ArcLayout,
} from "./arc-geometry";
import { clamp01, easeInOutCubic, easeOutCubic, stagger } from "./core/math";
import { COLORS, FONT, TYPE, OKABE_ITO } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import type { Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";
import { layoutLegend, legendRowCount } from "./core/legend";
import { truncate } from "./core/text";

export interface ArcConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  unit: string; // subtitle
  nodes: { id: string; label: string; group?: string }[];
  links: { source: string; target: string; value: number }[];
}

export interface ArcChartProps {
  config: ArcConfig;
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
  OKABE_ITO.vermillion,
  OKABE_ITO.purple,
  OKABE_ITO.skyblue,
  OKABE_ITO.yellow,
  OKABE_ITO.black,
];

export function ArcChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: ArcChartProps) {
  const p = clamp01(progress);
  const s = responsive ? 1 : scale;
  const charsPerLine = Math.max(
    8,
    Math.floor((width - 48 * s) / (TYPE.title * s * 0.52)),
  );
  const titleLines = responsive
    ? Math.max(1, Math.ceil(config.title.length / Math.floor(width / 11)))
    : Math.max(1, Math.ceil(config.title.length / charsPerLine));

  // distinct groups in node order → one Okabe-Ito colour each
  const groups: string[] = [];
  for (const n of config.nodes) {
    const g = n.group ?? "—";
    if (!groups.includes(g)) groups.push(g);
  }
  const colorOf = (group?: string) =>
    GROUP_COLORS[
      Math.max(0, groups.indexOf(group ?? "—")) % GROUP_COLORS.length
    ];

  const LEG_ROW = 20;
  const legendRows = legendRowCount(
    groups,
    width - 40,
    TYPE.axis * 0.6,
    LEG_ROW,
  );
  const basePad = {
    top: responsive ? 16 : 50 + titleLines * 27,
    right: 22,
    // legend rows + source clearance (node labels live INSIDE the plot, in the
    // baseline inset reserved below — see baselineInset)
    bottom: legendRows * LEG_ROW + 40,
    left: 22,
  };
  const frame = resolveFrameWithHeader(config.title, config.unit, width, height, basePad, scale, undefined, responsive);
  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;

  // a node label sits `labelClear` below the baseline; the baseline is raised by
  // `baselineInset` so even the LARGEST dot (NODE_R_MAX) can't overlap its label,
  // for any data or scale (correct by construction, not by audit luck).
  const labelClear = NODE_R_MAX * sc + ts.source * 0.85 + 4 * sc;
  const baselineInset = labelClear + ts.source * 0.35;

  const data: ArcData = { nodes: config.nodes, links: config.links };
  const layout = computeArcLayout(
    data,
    { width, height, padding },
    { baselineInset },
  );

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <ArcSvg
      layout={layout}
      padding={padding}
      width={width}
      height={height}
      p={p}
      config={config}
      colorOf={colorOf}
      groups={groups}
      interactive={interactive}
      hover={hover}
      setHover={setHover}
      ts={ts}
      sc={sc}
      labelClear={labelClear}
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

function ArcSvg({
  layout,
  padding,
  width,
  height,
  p,
  config,
  colorOf,
  groups,
  interactive,
  hover,
  setHover,
  ts,
  sc,
  labelClear,
}: {
  layout: ArcLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: ArcConfig;
  colorOf: (group?: string) => string;
  groups: string[];
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
  labelClear: number; // px below the baseline for the node label baseline
}) {
  const { innerWidth, innerHeight, baseY, nodes, links } = layout;
  const chrome = easeOutCubic(p / 0.18);
  const reveal = easeInOutCubic(p);
  const groupOfNode = new Map(config.nodes.map((n) => [n.id, n.group ?? "—"]));
  const nodeIndex = new Map(nodes.map((n, i) => [n.id, i]));

  // smallest adjacent gap → label truncation budget (no overlap at any width)
  let minGap = innerWidth;
  for (let i = 1; i < nodes.length; i++)
    minGap = Math.min(minGap, nodes[i].x - nodes[i - 1].x);
  const labelBudget = minGap * 0.94;

  const legendTop = innerHeight + 20 * sc;
  const legend = layoutLegend(
    groups,
    groups.map((g) => colorOf(g)),
    innerWidth,
    0,
    legendTop,
    ts.axis * 0.6,
    20 * sc,
    sc,
  ).items;

  const isCross = (l: { source: string; target: string }) =>
    groupOfNode.get(l.source) !== groupOfNode.get(l.target);

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
        {/* baseline */}
        <line
          x1={0}
          x2={innerWidth}
          y1={baseY}
          y2={baseY}
          stroke={COLORS.axis}
          strokeWidth={1}
          opacity={chrome}
        />

        {/* arcs — within-group sit back, cross-group come forward (the subject) */}
        <g fill="none">
          {links
            .map((l, i) => ({ l, i, cross: isCross(l) }))
            .sort((a, b) => Number(a.cross) - Number(b.cross))
            .map(({ l, i, cross }) => {
              const si = nodeIndex.get(l.source);
              const ti = nodeIndex.get(l.target);
              const touched =
                interactive && hover !== null && (hover === si || hover === ti);
              const dim = interactive && hover !== null && !touched;
              return (
                <path
                  key={`a${i}`}
                  d={arcPath(l, baseY, reveal)}
                  stroke={cross ? COLORS.ink : COLORS.muted}
                  strokeWidth={l.width * sc}
                  // butt cap: a zero-length arc at progress 0 draws NOTHING (a
                  // round cap would paint a foot-dot — the reveal-from-nothing bug)
                  strokeLinecap="butt"
                  opacity={
                    (dim ? 0.12 : cross ? 0.55 : 0.28) * (touched ? 1.6 : 1)
                  }
                />
              );
            })}
        </g>

        {/* nodes on the baseline, coloured by group */}
        <g>
          {nodes.map((n, i) => {
            const np = stagger(
              p,
              i,
              nodes.length,
              0.2,
              0.5 / nodes.length,
              0.4,
            );
            const focused = interactive && hover === i;
            const dim = interactive && hover !== null && !focused;
            return (
              <g
                key={`n${n.id}`}
                opacity={dim ? 0.4 : 1}
                tabIndex={interactive ? 0 : undefined}
                role={interactive ? "img" : undefined}
                aria-label={
                  interactive
                    ? `${n.label} (${groupOfNode.get(n.id)}): ${n.degree} ${config.unit}`
                    : undefined
                }
                style={interactive ? { cursor: "pointer" } : undefined}
                onMouseEnter={interactive ? () => setHover(i) : undefined}
                onMouseLeave={interactive ? () => setHover(null) : undefined}
                onFocus={interactive ? () => setHover(i) : undefined}
                onBlur={interactive ? () => setHover(null) : undefined}
              >
                <circle
                  cx={n.x}
                  cy={baseY}
                  r={n.r * sc * clamp01(np / 0.3)}
                  fill={colorOf(n.group)}
                  stroke="#FFFFFF"
                  strokeWidth={1 * sc}
                />
                <text
                  x={n.x}
                  y={baseY + labelClear}
                  textAnchor="middle"
                  fontSize={ts.source}
                  fontWeight={600}
                  fill={COLORS.ink}
                  opacity={clamp01((np - 0.4) / 0.4)}
                >
                  {truncate(n.label, labelBudget, ts.source)}
                </text>
              </g>
            );
          })}
        </g>

        {/* group legend */}
        <g className="chart-legend" opacity={chrome}>
          {legend.map((it, i) => (
            <g key={`lg${i}`}>
              <circle cx={it.x + 6 * sc} cy={it.y} r={6 * sc} fill={it.color} />
              <text
                x={it.x + 18 * sc}
                y={it.y}
                dy="0.32em"
                fontSize={ts.axis}
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
  layout: ArcLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: ArcConfig;
}) {
  const n = layout.nodes[hover];
  if (!n) return null;
  const group = config.nodes[hover]?.group ?? "";
  const left = padding.left + n.x;
  const top = padding.top + layout.baseY - 14;
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
      <strong style={{ fontSize: 13 }}>{n.label}</strong>
      <div style={{ fontSize: 11, opacity: 0.85, marginTop: 1 }}>
        {group} · {n.degree} {config.unit}
      </div>
    </div>
  );
}
