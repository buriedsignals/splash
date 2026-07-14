// THE one stacked-area component — the CONTINUOUS sibling of the stacked bar:
// filled bands stacked on a continuous time x. D3 = math (stacked-area-geometry.ts:
// d3-shape area), React = DOM, one master `progress` drives a left→right wipe of
// the whole stack (a growing clip). responsive=false = fixed layout (video/static);
// responsive=true = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: baseline-0 (geometry valueDomain),
//     title=insight + Okabe-Ito palette + source + WCAG (ChartFrame + conformance),
//     scale via resolveFrame, the shared core/labels spreadLabels de-collision,
//     direct labels over a legend.
//   - TYPE-specific: the stacked-area geometry and the left→right wipe motion.
import { useState } from "react";
import {
  computeStackedAreaLayout,
  type StackedAreaData,
  type StackedAreaLayout,
} from "./stacked-area-geometry";
import { clamp01, easeInOutCubic, easeOutCubic } from "./core/math";
import {
  COLORS,
  FONT,
  TYPE,
  STACKED_AREA_COLORS,
  themeColors, tooltipBorder } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import type { Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";
import { spreadLabels } from "./core/labels";
import { endLabelGutterPx, truncate, textWidth , seriesLabelFromColumn } from "./core/text";

export interface StackedAreaConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  unit: string;
  xField: string;
  seriesFields: string[]; // stacking order, bottom → top
  rows: Record<string, string | number>[];
  /** newsroom dark theme (F2 house `theme: dark`) — flips the furniture. The band
   *  palette (STACKED_AREA_COLORS) has no black, so it is theme-independent. */
  themeBg?: string;
}

export interface StackedAreaChartProps {
  config: StackedAreaConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

// categorical band colours, in stacking order — all Okabe-Ito (CVD-safe).
const AREA_COLORS = STACKED_AREA_COLORS;

export function StackedAreaChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: StackedAreaChartProps) {
  const p = clamp01(progress);
  const s = responsive ? 1 : scale;
  const charsPerLine = Math.max(
    8,
    Math.floor((width - 48 * s) / (TYPE.title * s * 0.52)),
  );
  const titleLines = responsive
    ? 1
    : Math.max(1, Math.ceil(config.title.length / charsPerLine));
  // Right-edge band labels are "name value" (bold). Reserve the gutter from the
  // WIDEST actual label so a long series name never clips (the "Renouvelables 280"
  // → "Renouvelables 28" bug); floor at the sample's 116 so short-label charts keep
  // their layout. Measure from the x-SORTED last row (matching the geometry's
  // rendered lastValue, parsed.sort by x) so a newest-first CSV can't undersize it.
  // Cap at ~42% of the canvas (never below the floor) so a pathological series name
  // can't collapse the plot; over-cap labels are truncated at render (value kept).
  // UNSCALED font/gap — resolveFrame scales the whole basePad by `s`.
  const sortedRows = [...config.rows].sort(
    (a, b) => Number(a[config.xField]) - Number(b[config.xField]),
  );
  const lastRow = sortedRows[sortedRows.length - 1] ?? {};
  const bandLabels = config.seriesFields.map((f) => `${seriesLabelFromColumn(f)} ${lastRow[f] ?? ""}`);
  const basePad = {
    top: responsive ? 16 : 53 + titleLines * 27,
    right: Math.min(
      endLabelGutterPx(bandLabels, TYPE.axis, {
        gapPx: 8,
        floorPx: 116,
        bold: true,
      }),
      Math.max(116, (width * 0.42) / s),
    ),
    bottom: 32, // year axis (source band reserved in resolveFrameWithHeader)
    left: 44, // % axis
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
  const data: StackedAreaData = {
    xField: config.xField,
    seriesFields: config.seriesFields,
    rows: config.rows,
  };
  // fewer x ticks on a narrow plot so the year labels never collide.
  const innerW = width - padding.left - padding.right;
  const xTickHint = Math.max(2, Math.min(6, Math.floor(innerW / 120)));
  const layout = computeStackedAreaLayout(
    data,
    { width, height, padding },
    xTickHint,
  );

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <StackedAreaSvg
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
      themeBg={config.themeBg}
    >
      {svg}
    </ChartFrame>
  );
}

function StackedAreaSvg({
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
  layout: StackedAreaLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: StackedAreaConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { innerWidth, innerHeight, bands } = layout;
  const C = themeColors(config.themeBg);

  const chrome = easeOutCubic(p / 0.18);
  const wipe = easeInOutCubic(p); // left→right reveal of the whole stack
  const labelOp = clamp01((p - 0.7) / 0.3);
  const clipW = Math.max(0.001, innerWidth * wipe);

  // de-collide the right-edge band labels (global core/labels mechanism).
  const minGap = 17 * sc;
  const labelYs = spreadLabels(
    bands.map((b) => ({ index: b.seriesIndex, y: b.labelY })),
    minGap,
    innerHeight,
  );

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={config.title}
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
      <defs>
        <clipPath id="sa-clip">
          <rect x={0} y={-4} width={clipW} height={innerHeight + 8} />
        </clipPath>
      </defs>
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* y gridlines + % labels (wipe in) */}
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

        {/* stacked bands — revealed left→right by the growing clip */}
        <g clipPath="url(#sa-clip)">
          {bands.map((b) => {
            const focused = interactive && hover === b.seriesIndex;
            const dim = interactive && hover !== null && !focused;
            return (
              <path
                key={`b${b.seriesIndex}`}
                className="stacked-area-band"
                d={b.path}
                fill={AREA_COLORS[b.seriesIndex % AREA_COLORS.length]}
                opacity={dim ? 0.45 : 0.82}
                tabIndex={interactive ? 0 : undefined}
                role={interactive ? "img" : undefined}
                aria-label={
                  interactive
                    ? `${b.seriesKey}: ${b.lastValue} ${config.unit} in the latest year`
                    : undefined
                }
                style={interactive ? { cursor: "pointer" } : undefined}
                onMouseEnter={
                  interactive ? () => setHover(b.seriesIndex) : undefined
                }
                onMouseLeave={interactive ? () => setHover(null) : undefined}
                onFocus={
                  interactive ? () => setHover(b.seriesIndex) : undefined
                }
                onBlur={interactive ? () => setHover(null) : undefined}
              />
            );
          })}
          {/* thin white separator on each band's top edge → distinct layers */}
          {bands.map((b) => (
            <path
              key={`sep${b.seriesIndex}`}
              d={b.topLine}
              fill="none"
              stroke="#fff"
              strokeWidth={1.5 * sc}
              strokeLinejoin="round"
            />
          ))}
        </g>

        {/* y gridlines redrawn OVER the (now semi-transparent) bands as faint
            white lines, so the value reference stays readable through the fills */}
        <g opacity={chrome * 0.45}>
          {layout.valueTicks.map((t, i) => (
            <line
              key={`og${i}`}
              x1={0}
              x2={innerWidth}
              y1={t.pos}
              y2={t.pos}
              stroke="#fff"
              strokeWidth={1}
            />
          ))}
        </g>

        {/* x (year) axis labels */}
        <g opacity={chrome}>
          {layout.xTicks.map((t, i) => (
            <text
              key={`x${i}`}
              x={t.pos}
              y={innerHeight + 22 * sc}
              textAnchor="middle"
              fontSize={ts.axis}
              fill={C.ink}
            >
              {t.label}
            </text>
          ))}
        </g>

        {/* right-edge direct band labels (name + latest value), fade in last.
            TEXT is always COLORS.ink (WCAG-safe) — the label carries the value,
            the band's fill carries the hue (same rule as the vermillion fix).
            The gutter is sized to fit these labels (basePad.right); only a capped
            pathological name truncates — the NAME clips (ellipsis), value kept. */}
        <g opacity={labelOp}>
          {bands.map((b) => {
            // bold-aware widths (matches the 1.08 factor endLabelGutterPx reserved
            // with) so the gutter that fits a label never truncates it, and a capped
            // pathological name truncates to the actual bold width, value kept.
            const boldFont = ts.axis * 1.08;
            const valueStr = ` ${b.lastValue}`;
            const availPx = padding.right - 8 * sc;
            const name = truncate(
              b.seriesKey,
              availPx - textWidth(valueStr, boldFont),
              boldFont,
            );
            return (
              <text
                key={`l${b.seriesIndex}`}
                x={innerWidth + 8 * sc}
                y={labelYs.get(b.seriesIndex) ?? b.labelY}
                dy="0.32em"
                textAnchor="start"
                fontSize={ts.axis}
                fontWeight={700}
                fill={C.ink}
              >
                {name}
                {valueStr}
              </text>
            );
          })}
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
  layout: StackedAreaLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: StackedAreaConfig;
}) {
  const b = layout.bands.find((x) => x.seriesIndex === hover);
  if (!b) return null;
  const left = padding.left + layout.innerWidth + 8;
  const top = padding.top + b.labelY - 8;
  return (
    <div
      className="tooltip"
      style={{
        position: "absolute",
        left,
        top,
        transform: "translateY(-100%)",
        background: COLORS.ink,
        border: tooltipBorder(config.themeBg),
        color: "#fff",
        padding: "6px 10px",
        borderRadius: 6,
        fontSize: 13,
        whiteSpace: "nowrap",
        pointerEvents: "none",
        fontFamily: FONT,
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <strong>{b.seriesKey}</strong>{" "}
      <span style={{ opacity: 0.8 }}>
        {b.lastValue} {config.unit}
      </span>
    </div>
  );
}
