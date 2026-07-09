// THE one treemap component — a space-filling part-to-whole: each cell's AREA is
// proportional to its value, coloured by group. D3 = math (treemap-geometry.ts:
// squarified), React = DOM, one master `progress` scales each cell in from its
// centre, largest first. responsive=false = fixed (video/static); responsive=true
// = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: Okabe-Ito group palette + WCAG
//     (in-cell label colour picked by REAL contrast ratio against the cell's own
//     fill — a cell has no neutral background to fall back on, unlike a direct
//     label beside a mark, so the label picks whichever of white/ink clears
//     4.5:1 against THAT fill) + title=insight + cited source (ChartFrame +
//     checkTreemapConformance), scale via resolveFrame, the shared core/legend +
//     core/text.truncate.
//   - TYPE-specific: the squarified tiling (area = value) and the scale-in reveal.
import { useState } from "react";
import {
  computeTreemapLayout,
  type TreemapData,
  type TreemapLayout,
} from "./treemap-geometry";
import { clamp01, easeOutCubic, stagger, formatNumber } from "./core/math";
import {
  COLORS,
  FONT,
  TYPE,
  OKABE_ITO,
  TREEMAP_GROUP_COLORS,
} from "./core/tokens";
import { contrastRatio } from "./core/conformance";
import { ChartFrame } from "./core/ChartFrame";
import type { Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";
import { layoutLegend } from "./core/legend";
import { truncate } from "./core/text";

export interface TreemapConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  unit: string; // subtitle (what the area measures)
  categories?: string[];
  items: { label: string; value: number; category?: string }[];
}

export interface TreemapChartProps {
  config: TreemapConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

// Pick whichever of white/ink clears the higher real contrast against this
// exact cell fill — a luminance-threshold heuristic (e.g. "< 0.45 → white")
// picks a WINNER by brightness but never checks it actually clears 4.5:1; the
// Okabe-Ito group hues span a mid-luminance band (orange/green/purple) where
// white alone fails WCAG against them. Both options are pre-verified ≥4.5:1
// for every TREEMAP_GROUP_COLORS hue (see tokens.ts).
const cellText = (hex: string) =>
  contrastRatio(hex, "#FFFFFF") >= contrastRatio(hex, COLORS.ink)
    ? "#FFFFFF"
    : COLORS.ink;

export function TreemapChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: TreemapChartProps) {
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
    right: 12,
    bottom: 12 + (hasLegend ? 46 : 0), // legend band, clear of the source line
    left: 12,
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

  const colorIndex = new Map<string, number>();
  (config.categories ?? []).forEach((c, i) => colorIndex.set(c, i));
  const colorOf = (cat?: string) =>
    cat != null && colorIndex.has(cat)
      ? TREEMAP_GROUP_COLORS[colorIndex.get(cat)! % TREEMAP_GROUP_COLORS.length]
      : OKABE_ITO.blue;

  const data: TreemapData = {
    unit: config.unit,
    items: config.items,
    categories: config.categories,
  };
  const layout = computeTreemapLayout(data, { width, height, padding });

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <TreemapSvg
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

function TreemapSvg({
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
  layout: TreemapLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: TreemapConfig;
  colorOf: (cat?: string) => string;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { innerWidth, innerHeight, cells, total } = layout;
  const n = cells.length;
  const chrome = easeOutCubic(p / 0.16);
  const cellP = (order: number) =>
    easeOutCubic(stagger(p, order, n, 0.1, 0.5 / n, 0.4));

  const legend =
    config.categories && config.categories.length
      ? layoutLegend(
          config.categories,
          config.categories.map((c) => colorOf(c)),
          innerWidth,
          0,
          innerHeight + 22 * sc,
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
      <title>{config.title}</title>
      <g transform={`translate(${padding.left},${padding.top})`}>
        {cells.map((c) => {
          const ap = cellP(c.order);
          if (ap <= 0) return null;
          const cw = Math.max(0, c.w * ap - 2 * sc);
          const ch = Math.max(0, c.h * ap - 2 * sc);
          const cx = c.x + (c.w - cw) / 2;
          const cy = c.y + (c.h - ch) / 2;
          const fill = colorOf(c.category);
          const focused = interactive && hover === c.index;
          const dim = interactive && hover !== null && !focused;
          const labelOp = clamp01((ap - 0.6) / 0.4);
          const showName = cw > 46 * sc && ch > 24 * sc;
          const showValue = cw > 54 * sc && ch > 42 * sc;
          const tcol = cellText(fill);
          const pad = 7 * sc;
          return (
            <g key={`c${c.index}`} opacity={dim ? 0.55 : 1}>
              <rect
                x={cx}
                y={cy}
                width={cw}
                height={ch}
                rx={2 * sc}
                fill={fill}
                tabIndex={interactive ? 0 : undefined}
                role={interactive ? "img" : undefined}
                aria-label={
                  interactive
                    ? `${c.label}: ${formatNumber(c.value, config.lang)} ${config.unit}, ${Math.round(c.share * 100)}%`
                    : undefined
                }
                style={
                  interactive
                    ? { cursor: "pointer", outline: "none" }
                    : undefined
                }
                onMouseEnter={interactive ? () => setHover(c.index) : undefined}
                onMouseLeave={interactive ? () => setHover(null) : undefined}
                onFocus={interactive ? () => setHover(c.index) : undefined}
                onBlur={interactive ? () => setHover(null) : undefined}
              />
              {showName && (
                <text
                  x={cx + pad}
                  y={cy + pad + ts.axis * 0.9}
                  fontSize={ts.axis}
                  fontWeight={700}
                  fill={tcol}
                  opacity={labelOp}
                  pointerEvents="none"
                >
                  {truncate(c.label, cw - 2 * pad, ts.axis)}
                </text>
              )}
              {showValue && (
                <text
                  x={cx + pad}
                  y={cy + pad + ts.axis * 0.9 + ts.source + 6 * sc}
                  fontSize={ts.source}
                  fill={tcol}
                  opacity={labelOp * 0.85}
                  pointerEvents="none"
                >
                  {truncate(
                    `${formatNumber(c.value, config.lang)} · ${Math.round(c.share * 100)}%`,
                    cw - 2 * pad,
                    ts.source,
                  )}
                </text>
              )}
            </g>
          );
        })}

        {/* group legend below the tiles */}
        <g opacity={chrome}>
          {legend.map((it, i) => (
            <g key={`lg${i}`}>
              <rect
                x={it.x}
                y={it.y - 10 * sc}
                width={13 * sc}
                height={13 * sc}
                rx={2}
                fill={it.color}
              />
              <text
                x={it.x + 19 * sc}
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
  layout: TreemapLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: TreemapConfig;
}) {
  const c = layout.cells.find((x) => x.index === hover);
  if (!c) return null;
  const left = padding.left + c.x + c.w / 2;
  const top = padding.top + c.y + c.h / 2 - 8;
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
      <strong style={{ fontSize: 13 }}>{c.label}</strong>
      <div style={{ fontSize: 12, marginTop: 1 }}>
        {formatNumber(c.value, config.lang)} {config.unit}
      </div>
      <div style={{ opacity: 0.7, fontSize: 11 }}>
        {Math.round(c.share * 100)}% of the whole
      </div>
    </div>
  );
}
