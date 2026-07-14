// THE one grouped-bar/column component — several series SIDE BY SIDE per category
// (compare within and across groups). D3 = math (grouped-bar-geometry.ts + the
// shared growBar), React = DOM, one master `progress` drives the rise-from-
// baseline build. responsive=false = fixed layout (video/static); responsive=true
// = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: baseline-0 (geometry valueDomain),
//     the shared growBar motion, the shared core/legend, Okabe-Ito palette + WCAG
//     + title=insight + source (ChartFrame + conformance), scale via resolveFrame.
//   - TYPE-specific: the nested-band geometry (groups of bars) and the staggered
//     per-GROUP reveal. Like the stacked bar, a legend replaces direct labels
//     (grouped-bar.md rule 4).
import { useState } from "react";
import {
  computeGroupedLayout,
  type GroupedData,
  type GroupedLayout,
} from "./grouped-bar-geometry";
import { growBar } from "./bar-geometry";
import { formatNumber, clamp01, easeOutCubic, stagger } from "./core/math";
import {
  COLORS,
  TYPE,
  GROUPED_SERIES_COLORS,
  themeColors,
} from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import type { Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";
import { verticalCatLines, verticalCatMaxLines, bandStepPx } from "./core/text";
import { layoutLegend } from "./core/legend";

export interface GroupedConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  unit: string;
  catField: string;
  seriesFields: string[];
  /** newsroom dark theme — flips the chrome furniture (bg/ink/muted). Default light. */
  dark?: boolean;
  rows: Record<string, string | number>[];
}

export interface GroupedBarChartProps {
  config: GroupedConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

// categorical series colours — all Okabe-Ito (CVD-safe). ≤3 series (grouped-bar.md).
const GROUP_COLORS = GROUPED_SERIES_COLORS;

export function GroupedBarChart({
  config,
  progress = 1,
  width = 840,
  height = 460,
  interactive = false,
  responsive = false,
  scale = 1,
}: GroupedBarChartProps) {
  const p = clamp01(progress);
  const s = responsive ? 1 : scale;
  const leftAxis = 52;
  const sideRight = 16;
  const charsPerLine = Math.max(
    8,
    Math.floor((width - 48 * s) / (TYPE.title * s * 0.52)),
  );
  const titleLines = responsive
    ? 1
    : Math.max(1, Math.ceil(config.title.length / charsPerLine));
  const legendRowUnscaled = 22;
  const charW = TYPE.axis * s * 0.6;
  const { rows: legendRows } = layoutLegend(
    config.seriesFields,
    GROUP_COLORS,
    width - (leftAxis + sideRight) * s,
    0,
    0,
    charW,
    legendRowUnscaled * s,
  );
  // A group's category label is centred under the group and WRAPS onto ≤2 lines
  // (verticalCatLines, shared bar-family rule) rather than truncating to a stub on a
  // narrow/portrait canvas. Reserve the extra row(s) here, above the legend, using
  // the band step the layout will use (innerWidth is exact — left/right scale
  // straight through resolveFrame). 0 extra when every label fits on one line.
  const catExtraRows =
    verticalCatMaxLines(
      config.rows.map((r) => String(r[config.catField])),
      bandStepPx(width - (leftAxis + sideRight) * s, config.rows.length),
      TYPE.axis * s,
    ) - 1;
  const basePad = {
    top: responsive ? 16 : 53 + titleLines * 27,
    right: sideRight,
    // category labels (+ wrapped rows) + legend rows (source band reserved in
    // resolveFrameWithHeader)
    bottom:
      44 + legendRows * legendRowUnscaled + catExtraRows * TYPE.axis * 1.15,
    left: leftAxis,
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
  const data: GroupedData = {
    catField: config.catField,
    seriesFields: config.seriesFields,
    rows: config.rows,
  };
  const layout = computeGroupedLayout(data, { width, height, padding });

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <GroupedSvg
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
      dark={!!config.dark}
    >
      {svg}
    </ChartFrame>
  );
}

function GroupedSvg({
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
  layout: GroupedLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: GroupedConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { innerWidth, innerHeight, base, bars, columns } = layout;
  const nCols = columns.length;
  const C = themeColors(!!config.dark);

  const chrome = easeOutCubic(p / 0.18);
  // stagger across GROUPS (reading order); series within a group rise together.
  const groupP = (ci: number) => stagger(p, ci, nCols, 0.18, 0.5 / nCols, 0.35);

  // band step (centre-to-centre) → wrap budget for a centred category label.
  const colStep =
    nCols > 1 ? columns[1].center - columns[0].center : innerWidth;
  const catLineH = ts.axis * 1.15;
  const catLinesByCol = columns.map((c) =>
    verticalCatLines(String(c.rawCat), colStep, ts.axis),
  );
  const catExtraRows = Math.max(0, ...catLinesByCol.map((l) => l.length - 1));
  // legend sits below the (possibly wrapped) category labels so it never overlaps a
  // 2-line name.
  const legendTop = innerHeight + 40 * sc + catExtraRows * catLineH;
  const legend = layoutLegend(
    config.seriesFields,
    GROUP_COLORS,
    innerWidth,
    0,
    legendTop,
    ts.axis * 0.6,
    22 * sc,
  ).items;

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={config.title}
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* value-axis gridlines + labels (wipe in) */}
        <g opacity={chrome}>
          {layout.valueTicks.map((t, i) => (
            <g key={`g${i}`}>
              <line
                x1={0}
                x2={innerWidth}
                y1={t.pos}
                y2={t.pos}
                stroke={C.grid}
                strokeWidth={1}
              />
              <text
                x={-10 * sc}
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
        </g>

        {/* grouped bars — each grows from the baseline, staggered by group */}
        {bars.map((b, i) => {
          const gp = groupP(b.catIndex);
          const g = growBar(b, gp, "vertical");
          const focused = interactive && hover === i;
          const dim = interactive && hover !== null && !focused;
          return (
            <rect
              key={`b${i}`}
              className="grouped-bar"
              x={g.x}
              y={g.y}
              width={g.w}
              height={g.h}
              fill={GROUP_COLORS[b.seriesIndex % GROUP_COLORS.length]}
              rx={1}
              opacity={dim ? 0.6 : 1}
              tabIndex={interactive ? 0 : undefined}
              role={interactive ? "img" : undefined}
              aria-label={
                interactive
                  ? `${b.rawCat} ${b.seriesKey}: ${formatNumber(b.rawVal, config.lang)} ${config.unit}`
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

        {/* category labels under each group centre — wrapped onto ≤2 lines (never a
            truncated stub), stacked downward from just below the axis */}
        {columns.map((c, ci) => {
          const op = clamp01(groupP(ci) * 1.6);
          return (
            <g key={`c${ci}`}>
              {catLinesByCol[ci].map((ln, li) => (
                <text
                  key={li}
                  className="cat-label"
                  x={c.center}
                  y={innerHeight + 20 * sc + li * catLineH}
                  textAnchor="middle"
                  fontSize={ts.axis}
                  fill={C.ink}
                  opacity={op}
                >
                  {ln}
                </text>
              ))}
            </g>
          );
        })}

        {/* zero baseline */}
        <line
          x1={0}
          x2={innerWidth}
          y1={base}
          y2={base}
          stroke={C.axis}
          strokeWidth={1}
          opacity={chrome}
        />

        {/* series legend under the plot (fades in with the chrome) */}
        <g className="chart-legend" opacity={chrome}>
          {legend.map((it, i) => (
            <g key={`lg${i}`}>
              <rect
                x={it.x}
                y={it.y - 11 * sc}
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
}: {
  layout: GroupedLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: GroupedConfig;
}) {
  const b = layout.bars[hover];
  const left = padding.left + b.x + b.w / 2 + 12;
  const top = padding.top + b.y - 8;
  return (
    <div
      className="tooltip"
      style={{
        position: "absolute",
        left,
        top,
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
      <strong>{formatNumber(b.rawVal, config.lang)}</strong>{" "}
      <span style={{ opacity: 0.8 }}>{config.unit}</span>
      <div style={{ opacity: 0.7, fontSize: 11 }}>
        {String(b.rawCat)} · {b.seriesKey}
      </div>
    </div>
  );
}
