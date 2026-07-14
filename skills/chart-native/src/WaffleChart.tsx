// THE one waffle / square-pie component — a grid of cells where each cell is one
// unit (1%), coloured by category: a concrete, countable part-to-whole. D3 = math
// (waffle-geometry.ts: largest-remainder allocation), React = DOM, one master
// `progress` fills the cells in order (the container fills). responsive=false =
// fixed (video/static); responsive=true = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: Okabe-Ito categorical palette +
//     WCAG + title=insight + cited source (ChartFrame + checkWaffleConformance),
//     scale via resolveFrame, the shared core/legend.
//   - TYPE-specific: the cell grid (1 cell = 1 unit), the largest-remainder
//     rounding, and the fill-in-order reveal.
import { useState } from "react";
import {
  computeWaffleLayout,
  type WaffleData,
  type WaffleLayout,
} from "./waffle-geometry";
import { clamp01, easeOutCubic, stagger } from "./core/math";
import {
  COLORS,
  FONT,
  TYPE,
  WAFFLE_CATEGORY_COLORS,
  themeColors, tooltipBorder } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import type { Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";
import { layoutLegend, legendRowCount } from "./core/legend";

export interface WaffleConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  unit: string; // subtitle / what one square is
  gridN?: number;
  /** newsroom dark theme — flips the chrome furniture (bg/ink/muted). Default light. */
  dark?: boolean;
  items: { label: string; value: number }[];
}

export interface WaffleChartProps {
  config: WaffleConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

const WAFFLE_COLORS = WAFFLE_CATEGORY_COLORS;

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

export function WaffleChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: WaffleChartProps) {
  const p = clamp01(progress);
  const s = responsive ? 1 : scale;
  const charsPerLine = Math.max(
    8,
    Math.floor((width - 48 * s) / (TYPE.title * s * 0.52)),
  );
  const titleLines = responsive
    ? Math.max(1, Math.ceil(config.title.length / Math.floor(width / 11)))
    : Math.max(1, Math.ceil(config.title.length / charsPerLine));
  // reserve bottom for however many rows the value legend wraps to at this width.
  const LEG_ROW = 22;
  const legendRows = legendRowCount(
    config.items.map((it) => `${it.label} ${fmt(it.value)}`),
    width - 36,
    TYPE.axis * 0.6,
    LEG_ROW,
  );
  const basePad = {
    top: responsive ? 14 : 50 + titleLines * 27,
    right: 18,
    bottom: 22 + legendRows * LEG_ROW, // legend rows (source band reserved in resolveFrameWithHeader)
    left: 18,
  };
  const frame = resolveFrameWithHeader(
    config.title,
    config.unit,
    width,
    height,
    basePad,
    scale,
    0.62,
    responsive,
  );
  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;

  const colorOf = (i: number) => WAFFLE_COLORS[i % WAFFLE_COLORS.length];

  const data: WaffleData = { items: config.items, gridN: config.gridN };
  const layout = computeWaffleLayout(data, { width, height, padding });

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <WaffleSvg
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
      dark={!!config.dark}
    >
      {svg}
    </ChartFrame>
  );
}

function WaffleSvg({
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
  layout: WaffleLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: WaffleConfig;
  colorOf: (i: number) => string;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { cells, categories, gridN, gridX, gridY, cellStep } = layout;
  const n = cells.length;
  const chrome = easeOutCubic(p / 0.16);
  const C = themeColors(!!config.dark);

  const legend = layoutLegend(
    categories.map((c) => `${c.label} ${fmt(c.value)}`),
    categories.map((c) => colorOf(c.index)),
    width - padding.left - padding.right,
    padding.left,
    gridY + gridN * cellStep + 16 * sc,
    ts.axis * 0.6,
    22 * sc,
    sc,
  ).items;

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={config.title}
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
      {/* cells fill in order (the container fills) */}
      {cells.map((c) => {
        const ap = easeOutCubic(stagger(p, c.index, n, 0.1, 0.55 / n, 0.25));
        if (ap <= 0.01) return null;
        const color = colorOf(c.categoryIndex);
        const dim = interactive && hover !== null && hover !== c.categoryIndex;
        const sz = c.size * (0.55 + 0.45 * ap);
        const off = (c.size - sz) / 2;
        return (
          <rect
            key={`c${c.index}`}
            x={c.x + off}
            y={c.y + off}
            width={sz}
            height={sz}
            rx={2 * sc}
            fill={color}
            opacity={ap * (dim ? 0.3 : 1)}
            style={interactive ? { cursor: "pointer" } : undefined}
            onMouseEnter={
              interactive ? () => setHover(c.categoryIndex) : undefined
            }
            onMouseLeave={interactive ? () => setHover(null) : undefined}
          />
        );
      })}

      {/* category legend + a transparent per-category hit-strip over its cells */}
      <g opacity={chrome}>
        {legend.map((it, i) => (
          <g
            key={`lg${i}`}
            style={interactive ? { cursor: "pointer" } : undefined}
            tabIndex={interactive ? 0 : undefined}
            role={interactive ? "img" : undefined}
            aria-label={
              interactive
                ? `${categories[i].label}: ${fmt(categories[i].value)}, ${categories[i].cells}% (${categories[i].cells} squares)`
                : undefined
            }
            onMouseEnter={interactive ? () => setHover(i) : undefined}
            onMouseLeave={interactive ? () => setHover(null) : undefined}
            onFocus={interactive ? () => setHover(i) : undefined}
            onBlur={interactive ? () => setHover(null) : undefined}
          >
            <rect
              x={it.x}
              y={it.y - 11 * sc}
              width={13 * sc}
              height={13 * sc}
              rx={2}
              fill={it.color}
              opacity={hover !== null && hover !== i ? 0.4 : 1}
            />
            <text
              x={it.x + 19 * sc}
              y={it.y}
              dy="0.32em"
              fontSize={ts.axis}
              fontWeight={600}
              fill={C.ink}
              opacity={hover !== null && hover !== i ? 0.4 : 1}
            >
              {it.text}
            </text>
          </g>
        ))}
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
  layout: WaffleLayout;
  hover: number;
  config: WaffleConfig;
  colorOf: (i: number) => string;
}) {
  const cat = layout.categories[hover];
  if (!cat) return null;
  // anchor at the centre of this category's cells
  const own = layout.cells.filter((c) => c.categoryIndex === hover);
  if (!own.length) return null;
  const cx = own.reduce((s, c) => s + c.x, 0) / own.length;
  const cy = own.reduce((s, c) => s + c.y, 0) / own.length;
  return (
    <div
      className="tooltip"
      style={{
        position: "absolute",
        left: cx,
        top: cy,
        transform: "translate(-50%,-100%)",
        background: COLORS.ink,
        border: tooltipBorder(config.dark),
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
      <strong style={{ color: "#fff", fontSize: 13 }}>{cat.label}</strong>{" "}
      <span style={{ fontSize: 13 }}>{fmt(cat.value)}</span>
      <div style={{ opacity: 0.7, fontSize: 11 }}>
        {cat.cells} of 100 squares
      </div>
    </div>
  );
}
