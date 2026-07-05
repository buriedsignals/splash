// THE one Sankey / flow component — quantity flowing source → destination through
// columns; ribbon THICKNESS ∝ value, node height = the flow through it. D3 = math
// (sankey-geometry.ts), React = DOM, one master `progress` fades the nodes in by
// column then widens the ribbons. responsive=false = fixed (video/static);
// responsive=true = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: Okabe-Ito ribbon palette + WCAG +
//     title=insight + cited source (ChartFrame + checkSankeyConformance), scale
//     via resolveFrame, core/text.truncate for node labels.
//   - TYPE-specific: the columned flow layout, the source-coloured ribbons, and
//     the column-staggered fade + ribbon-widen reveal.
import { useState } from "react";
import {
  computeSankeyLayout,
  sankeyLinkPath,
  type SankeyData,
  type SankeyLayout,
} from "./sankey-geometry";
import { clamp01, easeOutCubic } from "./core/math";
import { COLORS, FONT, TYPE, OKABE_ITO } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";
import { truncate, textWidth } from "./core/text";

export interface SankeyConfig {
  title: string;
  source: { name: string; url: string };
  unit: string; // subtitle
  rampNodes?: string[]; // categories to colour (in palette order); rest neutral
  nodes: { id: string; label: string; column: number; category?: string }[];
  links: { source: string; target: string; value: number }[];
}

export interface SankeyChartProps {
  config: SankeyConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

const RAMP = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.green,
  OKABE_ITO.purple,
  OKABE_ITO.vermillion,
  OKABE_ITO.skyblue,
];
const NEUTRAL_NODE = "#8A8A8A";
const NEUTRAL_LINK = "#C2C2C2";

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

export function SankeyChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: SankeyChartProps) {
  const p = clamp01(progress);
  const s = responsive ? 1 : scale;
  const charsPerLine = Math.max(
    8,
    Math.floor((width - 48 * s) / (TYPE.title * s * 0.52)),
  );
  const titleLines = responsive
    ? Math.max(1, Math.ceil(config.title.length / Math.floor(width / 11)))
    : Math.max(1, Math.ceil(config.title.length / charsPerLine));

  // colour map: ramp categories get an Okabe-Ito hue; everything else neutral.
  const catColor = new Map<string, number>();
  (config.rampNodes ?? []).forEach((c, i) => catColor.set(c, i));
  const nodeColor = (cat?: string) =>
    cat != null && catColor.has(cat)
      ? RAMP[catColor.get(cat)! % RAMP.length]
      : NEUTRAL_NODE;
  const linkColor = (cat?: string) =>
    cat != null && catColor.has(cat)
      ? RAMP[catColor.get(cat)! % RAMP.length]
      : NEUTRAL_LINK;

  const columns = [...new Set(config.nodes.map((n) => n.column))].sort(
    (a, b) => a - b,
  );
  const lastCol = columns[columns.length - 1];
  const catById = new Map(config.nodes.map((n) => [n.id, n.category]));

  // gutters for the end-column labels ("Wind 38" left, "Homes 40" right).
  const leftLabels = config.nodes.filter((n) => n.column === columns[0]);
  const rightLabels = config.nodes.filter((n) => n.column === lastCol);
  // reserve for "Label NN" (the value is appended) + the gap to the node bar.
  const estLabel = (n: { label: string }) => textWidth(n.label, TYPE.axis) + 44;
  const leftGutter = Math.min(
    Math.max(40, ...leftLabels.map(estLabel)),
    width * 0.24,
  );
  const rightGutter = Math.min(
    Math.max(40, ...rightLabels.map(estLabel)),
    width * 0.24,
  );

  const basePad = {
    top: responsive ? 28 : 50 + titleLines * 27, // headroom for middle labels
    right: rightGutter,
    bottom: 30, // clear the source line below the bottom node label
    left: leftGutter,
  };
  const frame = resolveFrameWithHeader(config.title, config.unit, width, height, basePad, scale, 0.62, responsive);
  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;

  const data: SankeyData = { nodes: config.nodes, links: config.links };
  const layout = computeSankeyLayout(
    data,
    { width, height, padding },
    {
      nodeWidth: 13 * sc,
      nodeGap: 14 * sc,
    },
  );

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <SankeySvg
      layout={layout}
      padding={padding}
      width={width}
      height={height}
      p={p}
      config={config}
      columns={columns}
      lastCol={lastCol}
      catById={catById}
      nodeColor={nodeColor}
      linkColor={linkColor}
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
        catById={catById}
        linkColor={linkColor}
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

function SankeySvg({
  layout,
  padding,
  width,
  height,
  p,
  config,
  columns,
  lastCol,
  catById,
  nodeColor,
  linkColor,
  interactive,
  hover,
  setHover,
  ts,
  sc,
}: {
  layout: SankeyLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: SankeyConfig;
  columns: number[];
  lastCol: number;
  catById: Map<string, string | undefined>;
  nodeColor: (cat?: string) => string;
  linkColor: (cat?: string) => string;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { nodes, links } = layout;
  const nCol = columns.length;
  const colIndex = new Map(columns.map((c, i) => [c, i]));
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // column-staggered node fade; ribbon widen after both endpoints land.
  const nodeAppear = (col: number) =>
    easeOutCubic(clamp01((p - (colIndex.get(col) ?? 0) * 0.12) / 0.26));
  const linkAppear = (srcCol: number, tgtCol: number) => {
    const start =
      Math.max(colIndex.get(srcCol) ?? 0, colIndex.get(tgtCol) ?? 0) * 0.12 +
      0.12;
    return easeOutCubic(clamp01((p - start) / 0.4));
  };
  const labelOp = clamp01((p - 0.5) / 0.3);

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
        {/* ribbons first (behind the node bars) */}
        {links.map((lk, i) => {
          const srcCat = catById.get(lk.source);
          const col = linkColor(srcCat);
          const sCol = nodeById.get(lk.source)!.column;
          const tCol = nodeById.get(lk.target)!.column;
          const ap = linkAppear(sCol, tCol);
          if (ap <= 0) return null;
          const focused = interactive && hover === i;
          const dim = interactive && hover !== null && !focused;
          return (
            <path
              key={`lk${i}`}
              d={sankeyLinkPath(lk)}
              fill="none"
              stroke={col}
              strokeWidth={Math.max(0.5, lk.width * ap)}
              strokeOpacity={focused ? 0.85 : dim ? 0.18 : 0.45}
              tabIndex={interactive ? 0 : undefined}
              role={interactive ? "img" : undefined}
              aria-label={
                interactive
                  ? `${nodeById.get(lk.source)!.label} to ${nodeById.get(lk.target)!.label}: ${fmt(lk.value)} ${config.unit}`
                  : undefined
              }
              style={
                interactive ? { cursor: "pointer", outline: "none" } : undefined
              }
              onMouseEnter={interactive ? () => setHover(i) : undefined}
              onMouseLeave={interactive ? () => setHover(null) : undefined}
              onFocus={interactive ? () => setHover(i) : undefined}
              onBlur={interactive ? () => setHover(null) : undefined}
            />
          );
        })}

        {/* node bars + labels */}
        {nodes.map((nd) => {
          const ap = nodeAppear(nd.column);
          if (ap <= 0) return null;
          const fill = nodeColor(nd.category);
          const isFirst = nd.column === columns[0];
          const isLast = nd.column === lastCol;
          const cy = nd.y + nd.h / 2;
          // labels: first column to the left, last column to the right, middle above.
          const labelText = `${nd.label} ${fmt(nd.value)}`;
          let lx: number;
          let anchor: "start" | "end" | "middle";
          let ly = cy;
          if (isFirst) {
            lx = nd.x - 7 * sc;
            anchor = "end";
          } else if (isLast) {
            lx = nd.x + nd.w + 7 * sc;
            anchor = "start";
          } else {
            lx = nd.x + nd.w / 2;
            anchor = "middle";
            ly = nd.y - 7 * sc;
          }
          const room = isFirst
            ? padding.left - 12 * sc
            : isLast
              ? padding.right - 12 * sc
              : 160 * sc;
          return (
            <g key={`nd${nd.id}`} opacity={ap}>
              <rect
                x={nd.x}
                y={nd.y}
                width={nd.w}
                height={nd.h}
                rx={1.5 * sc}
                fill={fill}
              />
              <text
                x={lx}
                y={ly}
                dy={anchor === "middle" ? undefined : "0.32em"}
                textAnchor={anchor}
                fontSize={ts.axis}
                fontWeight={600}
                fill={COLORS.ink}
                opacity={labelOp}
                paintOrder="stroke"
                stroke="#fff"
                strokeWidth={3 * sc}
                strokeLinejoin="round"
              >
                {truncate(labelText, room, ts.axis)}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function Tooltip({
  layout,
  padding,
  hover,
  config,
  catById,
  linkColor,
}: {
  layout: SankeyLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: SankeyConfig;
  catById: Map<string, string | undefined>;
  linkColor: (cat?: string) => string;
}) {
  const lk = layout.links[hover];
  if (!lk) return null;
  const nodeById = new Map(layout.nodes.map((n) => [n.id, n]));
  const left = padding.left + (lk.x0 + lk.x1) / 2;
  const top = padding.top + (lk.y0 + lk.y1) / 2 - 8;
  const color = linkColor(catById.get(lk.source));
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
      <strong style={{ fontSize: 13 }}>{fmt(lk.value)}</strong>{" "}
      <span style={{ fontSize: 12, opacity: 0.85 }}>{config.unit}</span>
      <div style={{ fontSize: 11, marginTop: 1 }}>
        <span style={{ color }}>{nodeById.get(lk.source)!.label}</span> →{" "}
        {nodeById.get(lk.target)!.label}
      </div>
    </div>
  );
}
