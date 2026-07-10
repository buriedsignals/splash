// THE one diverging stacked bar / Likert component — ordered survey responses
// per item, centred at 0: negatives left, positives right, a neutral straddling.
// D3 = math (diverging-stacked-geometry.ts), React = DOM, one master `progress`
// grows each segment from the centre outward, staggered by item. responsive=false
// = fixed (video/static); responsive=true = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: WCAG (in-bar label colour picked by
//     REAL contrast ratio against that segment's own fill — a segment has no
//     neutral background to fall back on, unlike a direct label beside a mark) +
//     title=insight + cited source (ChartFrame + checkDivergingStackedConformance),
//     scale via resolveFrame, core/text.truncate, the shared core/legend.
//   - TYPE-specific: the diverging Okabe-Ito sentiment ramp, the centre baseline,
//     and the grow-from-centre reveal.
import { useState } from "react";
import {
  computeDivergingStackedLayout,
  growSegment,
  type DivergingStackedData,
  type DivergingStackedLayout,
} from "./diverging-stacked-geometry";
import { clamp01, easeOutCubic, stagger } from "./core/math";
import { COLORS, FONT, TYPE, DIVERGING_STACKED_COLORS } from "./core/tokens";
import { contrastRatio } from "./core/conformance";
import { ChartFrame } from "./core/ChartFrame";
import type { Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";
import { layoutLegend, legendRowCount } from "./core/legend";
import { truncate } from "./core/text";

export interface DivergingStackedConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  unit: string; // subtitle
  responses: string[];
  neutralIndex?: number;
  items: { label: string; values: number[] }[];
}

export interface DivergingStackedChartProps {
  config: DivergingStackedConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

// diverging Okabe-Ito ramp: warm (negative) → neutral grey → cool (positive).
// The colour for response i is chosen by its position relative to the neutral.
const NEG = DIVERGING_STACKED_COLORS.neg;
const POS = DIVERGING_STACKED_COLORS.pos;
const NEUTRAL = DIVERGING_STACKED_COLORS.neutral;

// Pick whichever of white/ink clears the higher REAL contrast against this exact
// segment fill — a luminance-threshold heuristic (e.g. "< 0.5 → white") picks a
// winner by brightness but never checks it actually clears 4.5:1; the Okabe-Ito
// sentiment hues span a mid-luminance band (orange/skyblue) where white alone
// fails WCAG against them (same bug class fixed for treemap's cell text).
const labelColor = (hex: string) =>
  contrastRatio(hex, "#FFFFFF") >= contrastRatio(hex, COLORS.ink)
    ? "#FFFFFF"
    : COLORS.ink;

export function DivergingStackedChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: DivergingStackedChartProps) {
  const p = clamp01(progress);
  const s = responsive ? 1 : scale;
  const charsPerLine = Math.max(
    8,
    Math.floor((width - 48 * s) / (TYPE.title * s * 0.52)),
  );
  const titleLines = responsive
    ? Math.max(1, Math.ceil(config.title.length / Math.floor(width / 11)))
    : Math.max(1, Math.ceil(config.title.length / charsPerLine));
  // reserve bottom for the percent ticks AND however many rows the response
  // legend wraps to at this width (long Likert labels wrap on a phone).
  const LEG_ROW = 20;
  const legendRows = legendRowCount(
    config.responses,
    width - 130 - 20,
    TYPE.source * 0.6,
    LEG_ROW,
  );
  const basePad = {
    top: responsive ? 14 : 50 + titleLines * 27,
    right: 20,
    bottom: 32 + legendRows * LEG_ROW, // ticks + legend rows (source band reserved in resolveFrameWithHeader)
    left: 130, // item labels in the gutter
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

  // colour map per response index (relative to the neutral).
  const R = config.responses.length;
  const neutral = config.neutralIndex;
  const leftEnd = neutral ?? Math.floor(R / 2);
  const rightStart = neutral != null ? neutral + 1 : leftEnd;
  const colorOf = (i: number): string => {
    if (neutral != null && i === neutral) return NEUTRAL;
    if (i < leftEnd) {
      // closest-to-neutral = lighter (orange); farthest = vermillion
      const depth = leftEnd - 1 - i; // 0 = closest
      return NEG[Math.min(NEG.length - 1, NEG.length - 1 - depth)] ?? NEG[0];
    }
    const depth = i - rightStart; // 0 = closest
    return POS[Math.min(POS.length - 1, depth)] ?? POS[POS.length - 1];
  };

  const data: DivergingStackedData = {
    responses: config.responses,
    neutralIndex: config.neutralIndex,
    items: config.items,
  };
  const layout = computeDivergingStackedLayout(data, {
    width,
    height,
    padding,
  });

  const [hover, setHover] = useState<{ row: number; seg: number } | null>(null);

  const svg = (
    <DSSvg
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

function DSSvg({
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
  layout: DivergingStackedLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: DivergingStackedConfig;
  colorOf: (i: number) => string;
  interactive: boolean;
  hover: { row: number; seg: number } | null;
  setHover: (h: { row: number; seg: number } | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { innerWidth, innerHeight, centerX, rows, pctTicks } = layout;
  const n = rows.length;
  const chrome = easeOutCubic(p / 0.16);
  const rowP = (i: number) =>
    easeOutCubic(stagger(p, i, n, 0.16, 0.5 / n, 0.4));

  const legend = layoutLegend(
    config.responses,
    config.responses.map((_, i) => colorOf(i)),
    innerWidth,
    0,
    innerHeight + 32 * sc,
    ts.source * 0.6,
    20 * sc,
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
      <title>{config.title}</title>
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* percent gridlines + bottom tick labels (wipe in) */}
        <g opacity={chrome * 0.6}>
          {pctTicks.map((t, i) => (
            <line
              key={`g${i}`}
              x1={t.pos}
              x2={t.pos}
              y1={0}
              y2={innerHeight}
              stroke={t.label === "0%" ? COLORS.axis : COLORS.grid}
              strokeWidth={t.label === "0%" ? 1.5 : 1}
            />
          ))}
        </g>
        <g opacity={chrome}>
          {pctTicks.map((t, i) => (
            <text
              key={`tk${i}`}
              x={t.pos}
              y={innerHeight + 16 * sc}
              textAnchor="middle"
              fontSize={ts.source}
              fill={COLORS.muted}
            >
              {t.label}
            </text>
          ))}
        </g>

        {/* rows of diverging segments — grow from the centre outward */}
        {rows.map((r) => {
          const rp = rowP(r.index);
          const catOp = clamp01(rp * 1.4);
          return (
            <g key={`r${r.index}`}>
              {/* item label in the left gutter */}
              <text
                x={-12 * sc}
                y={r.y}
                dy="0.32em"
                textAnchor="end"
                fontSize={ts.axis}
                fill={COLORS.ink}
                opacity={catOp}
              >
                {truncate(r.label, padding.left - 16 * sc, ts.axis)}
              </text>
              {r.segments.map((seg, si) => {
                const g = growSegment(seg, centerX, rp);
                const x = Math.min(g.x0, g.x1);
                const w = Math.abs(g.x1 - g.x0);
                if (w < 0.5) return null;
                const fill = colorOf(seg.responseIndex);
                const focused =
                  interactive && hover?.row === r.index && hover?.seg === si;
                const dim = interactive && hover !== null && !focused;
                const showPct = w > 26 * sc && r.h > 16 * sc && seg.value >= 8;
                return (
                  <g key={`s${si}`} opacity={dim ? 0.55 : 1}>
                    <rect
                      x={x}
                      y={r.y - r.h / 2}
                      width={w}
                      height={r.h}
                      fill={fill}
                      tabIndex={interactive ? 0 : undefined}
                      role={interactive ? "img" : undefined}
                      aria-label={
                        interactive
                          ? `${r.label}, ${config.responses[seg.responseIndex]}: ${seg.value}%`
                          : undefined
                      }
                      style={
                        interactive
                          ? { cursor: "pointer", outline: "none" }
                          : undefined
                      }
                      onMouseEnter={
                        interactive
                          ? () => setHover({ row: r.index, seg: si })
                          : undefined
                      }
                      onMouseLeave={
                        interactive ? () => setHover(null) : undefined
                      }
                      onFocus={
                        interactive
                          ? () => setHover({ row: r.index, seg: si })
                          : undefined
                      }
                      onBlur={interactive ? () => setHover(null) : undefined}
                    />
                    {showPct && (
                      <text
                        x={x + w / 2}
                        y={r.y}
                        dy="0.32em"
                        textAnchor="middle"
                        fontSize={ts.source}
                        fontWeight={600}
                        fill={labelColor(fill)}
                        opacity={clamp01((rp - 0.6) / 0.4)}
                        pointerEvents="none"
                      >
                        {Math.round(seg.value)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* response legend below the bars, in order */}
        <g opacity={chrome}>
          {legend.map((it, i) => (
            <g key={`lg${i}`}>
              <rect
                x={it.x}
                y={it.y - 9 * sc}
                width={12 * sc}
                height={12 * sc}
                rx={2}
                fill={it.color}
              />
              <text
                x={it.x + 17 * sc}
                y={it.y}
                dy="0.32em"
                fontSize={ts.source}
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
  colorOf,
}: {
  layout: DivergingStackedLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: { row: number; seg: number };
  config: DivergingStackedConfig;
  colorOf: (i: number) => string;
}) {
  const r = layout.rows.find((x) => x.index === hover.row);
  const seg = r?.segments[hover.seg];
  if (!r || !seg) return null;
  const x = (Math.min(seg.x0, seg.x1) + Math.max(seg.x0, seg.x1)) / 2;
  const left = padding.left + x;
  const top = padding.top + r.y - r.h / 2 - 8;
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
      <strong style={{ fontSize: 13 }}>{seg.value}%</strong>{" "}
      <span
        aria-hidden="true"
        style={{ color: colorOf(seg.responseIndex), marginRight: 4 }}
      >
        ■
      </span>
      <span style={{ color: "#fff", fontSize: 12 }}>
        {config.responses[seg.responseIndex]}
      </span>
      <div style={{ opacity: 0.7, fontSize: 11 }}>{r.label}</div>
    </div>
  );
}
