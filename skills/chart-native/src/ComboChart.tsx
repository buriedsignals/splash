// THE one line+column combo (dual-axis) component — columns read against the
// LEFT axis (length, baseline-0), a line reads against an INDEPENDENT right axis
// (a rate). Each series is coloured to its own axis and BOTH axes are labelled, so
// the dual axis informs rather than misleads (checkComboConformance). D3 = math
// (combo-geometry.ts), React = DOM; one master `progress` grows the columns and
// wipes the line in left→right. responsive=false = fixed (video/static).
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused: title=insight + Okabe-Ito + source + WCAG
//     (ChartFrame + checkComboConformance), scale via resolveFrame, core/legend.
//   - TYPE-specific: the two independent axes, the column(left)/line(right) split,
//     each series coloured to its axis, and the grow-up + wipe-in reveal.
import { useState } from "react";
import {
  computeComboLayout,
  type ComboData,
  type ComboLayout,
} from "./combo-geometry";
import { line as d3line, curveMonotoneX } from "d3-shape";
import { clamp01, easeInOutCubic, easeOutCubic, stagger } from "./core/math";
import {
  COLORS,
  FONT,
  TYPE,
  OKABE_ITO,
  themeColors,
  tooltipBorder,
} from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import type { Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";
import { truncate } from "./core/text";

export interface ComboConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  unit: string;
  categoryField: string;
  columnField: string;
  lineField: string;
  leftAxisLabel: string;
  rightAxisLabel: string;
  columnSeriesLabel: string;
  lineSeriesLabel: string;
  rows: Record<string, string | number>[];
  /** newsroom house theme GROUND (F2 house `theme`) — every furniture token (ink, muted,
   *  axis, grid, bg) derives from this hex. Undefined = the light default (byte-identical). */
  themeBg?: string;
  /** newsroom house hue (spec `baseColor`): tints the FURNITURE greys (muted/axis/grid) and
   *  the frame's title band toward the house colour. The two series carry the fixed
   *  axis-coded Okabe-Ito pair (column blue / line orange) that the dual-axis rule
   *  depends on, so the hue never touches them. Undefined = untinted (byte-identical). */
  baseColor?: string;
}

export interface ComboChartProps {
  config: ComboConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

const COLUMN_COLOR = OKABE_ITO.blue;
const LINE_COLOR = OKABE_ITO.orange;

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

export function ComboChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: ComboChartProps) {
  const p = clamp01(progress);
  const s = responsive ? 1 : scale;
  const charsPerLine = Math.max(
    8,
    Math.floor((width - 48 * s) / (TYPE.title * s * 0.52)),
  );
  const titleLines = responsive
    ? Math.max(1, Math.ceil(config.title.length / Math.floor(width / 11)))
    : Math.max(1, Math.ceil(config.title.length / charsPerLine));

  const LEG_ROW = 22;
  const basePad = {
    top: responsive ? 16 : 50 + titleLines * 27,
    right: 56, // right-axis tick labels + axis title
    bottom: 24 + LEG_ROW + 24, // category labels + legend + source
    left: 56, // left-axis tick labels + axis title
  };
  const frame = resolveFrameWithHeader(config.title, config.unit, width, height, basePad, scale, undefined, responsive);
  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;

  const data: ComboData = {
    categoryField: config.categoryField,
    columnField: config.columnField,
    lineField: config.lineField,
    rows: config.rows,
  };
  const layout = computeComboLayout(data, { width, height, padding });

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <ComboSvg
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
      baseColor={config.baseColor}
    >
      {svg}
    </ChartFrame>
  );
}

function ComboSvg({
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
  layout: ComboLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: ComboConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const {
    innerWidth,
    innerHeight,
    columns,
    linePoints,
    leftTicks,
    rightTicks,
  } = layout;
  const C = themeColors(config.themeBg, config.baseColor);
  const n = columns.length;
  const chrome = easeOutCubic(p / 0.18);
  const wipe = easeInOutCubic(p);
  const clipId = "combo-wipe";

  // narrow bands → rotate the category labels so they never collide
  const bw = columns[0]?.w ?? 0;
  const maxCatLen = Math.max(...columns.map((c) => c.category.length), 1);
  // horizontal category labels with a CADENCE: show every `labelStep`-th so the
  // shown labels (each truncated to its slot) never collide — no rotation, so they
  // also can't run into the rotated axis titles. Robust for any label length.
  const bandStep = n > 0 ? innerWidth / n : innerWidth;
  const labelStep = Math.max(
    1,
    Math.ceil((maxCatLen * ts.source * 0.58) / bandStep),
  );
  const labelSlot = bandStep * labelStep * 0.9;

  const lineGen = d3line<{ cx: number; cy: number }>()
    .x((d) => d.cx)
    .y((d) => d.cy)
    .curve(curveMonotoneX);

  const legendY = innerHeight + 30 * sc;

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={config.title}
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect
            x={0}
            y={-padding.top}
            width={innerWidth * wipe + 1}
            height={height}
          />
        </clipPath>
      </defs>
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* left-axis gridlines + tick labels (blue-tinted to match the columns) */}
        <g opacity={chrome}>
          {leftTicks.map((t, i) => (
            <g key={`lt${i}`}>
              <line
                x1={0}
                x2={innerWidth}
                y1={t.y}
                y2={t.y}
                stroke={C.grid}
                strokeWidth={1}
              />
              <text
                x={-8 * sc}
                y={t.y}
                dy="0.32em"
                textAnchor="end"
                fontSize={ts.source}
                fill={COLUMN_COLOR}
              >
                {t.label}
              </text>
            </g>
          ))}
          {/* right-axis tick labels (orange-tinted to match the line) */}
          {rightTicks.map((t, i) => (
            <text
              key={`rt${i}`}
              x={innerWidth + 8 * sc}
              y={t.y}
              dy="0.32em"
              textAnchor="start"
              fontSize={ts.source}
              fill={LINE_COLOR}
            >
              {t.label}
            </text>
          ))}
        </g>

        {/* columns (grow up from the baseline, staggered) */}
        <g>
          {columns.map((c) => {
            const grow = clamp01(stagger(p, c.index, n, 0.12, 0.4 / n, 0.5));
            const h = c.h * grow;
            const focused = interactive && hover === c.index;
            const dim = interactive && hover !== null && !focused;
            return (
              <rect
                key={`c${c.index}`}
                x={c.x}
                y={innerHeight - h}
                width={c.w}
                height={h}
                fill={COLUMN_COLOR}
                opacity={dim ? 0.4 : 1}
                tabIndex={interactive ? 0 : undefined}
                role={interactive ? "img" : undefined}
                aria-label={
                  interactive
                    ? `${c.category}: ${c.value} ${config.columnSeriesLabel}, ${fmt(linePoints[c.index].value)} ${config.lineSeriesLabel}`
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
            );
          })}
        </g>

        {/* line (right axis) — wipes in left→right, dots ride the wipe */}
        <g clipPath={`url(#${clipId})`}>
          <path
            d={lineGen(linePoints) ?? ""}
            fill="none"
            stroke={LINE_COLOR}
            strokeWidth={2.6 * sc}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {linePoints.map((pt) => (
            <circle
              key={`lp${pt.index}`}
              cx={pt.cx}
              cy={pt.cy}
              r={3.2 * sc}
              fill={LINE_COLOR}
              stroke="#FFFFFF"
              strokeWidth={1 * sc}
            />
          ))}
        </g>

        {/* category labels — horizontal, every labelStep-th, truncated to slot */}
        <g opacity={chrome}>
          {columns.map((c) =>
            c.index % labelStep === 0 ? (
              <text
                key={`x${c.index}`}
                x={c.x + c.w / 2}
                y={innerHeight + 16 * sc}
                textAnchor="middle"
                fontSize={ts.source}
                fill={C.ink}
              >
                {truncate(c.category, labelSlot, ts.source)}
              </text>
            ) : null,
          )}
        </g>

        {/* axis titles, colour-coded to their series */}
        <g opacity={chrome}>
          <text
            transform={`rotate(-90 ${-padding.left + 14 * sc} ${innerHeight / 2})`}
            x={-padding.left + 14 * sc}
            y={innerHeight / 2}
            textAnchor="middle"
            fontSize={ts.source}
            fontWeight={700}
            fill={COLUMN_COLOR}
          >
            {truncate(config.leftAxisLabel, innerHeight, ts.source)}
          </text>
          <text
            transform={`rotate(90 ${innerWidth + padding.right - 14 * sc} ${innerHeight / 2})`}
            x={innerWidth + padding.right - 14 * sc}
            y={innerHeight / 2}
            textAnchor="middle"
            fontSize={ts.source}
            fontWeight={700}
            fill={LINE_COLOR}
          >
            {truncate(config.rightAxisLabel, innerHeight, ts.source)}
          </text>
        </g>

        {/* legend: column swatch + line swatch */}
        <g className="chart-legend" opacity={chrome}>
          <rect
            x={0}
            y={legendY - 6 * sc}
            width={12 * sc}
            height={12 * sc}
            fill={COLUMN_COLOR}
          />
          <text
            x={18 * sc}
            y={legendY}
            dy="0.32em"
            fontSize={ts.axis}
            fontWeight={600}
            fill={C.ink}
          >
            {config.columnSeriesLabel}
          </text>
          {(() => {
            const lx =
              (18 + config.columnSeriesLabel.length * ts.axis * 0.62 + 24) * sc;
            return (
              <>
                <line
                  x1={lx}
                  x2={lx + 18 * sc}
                  y1={legendY}
                  y2={legendY}
                  stroke={LINE_COLOR}
                  strokeWidth={2.6 * sc}
                />
                <circle
                  cx={lx + 9 * sc}
                  cy={legendY}
                  r={3.2 * sc}
                  fill={LINE_COLOR}
                />
                <text
                  x={lx + 24 * sc}
                  y={legendY}
                  dy="0.32em"
                  fontSize={ts.axis}
                  fontWeight={600}
                  fill={C.ink}
                >
                  {config.lineSeriesLabel}
                </text>
              </>
            );
          })()}
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
  layout: ComboLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: ComboConfig;
}) {
  const c = layout.columns[hover];
  const pt = layout.linePoints[hover];
  if (!c) return null;
  const left = padding.left + c.x + c.w / 2;
  const top = padding.top + Math.min(c.y, pt.cy) - 12;
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
      <strong style={{ fontSize: 13 }}>{c.category}</strong>
      <div style={{ fontSize: 11, opacity: 0.9, marginTop: 1 }}>
        <span style={{ color: "#8AB6D6" }}>■</span> {c.value}{" "}
        {config.columnSeriesLabel} · <span style={{ color: "#F0B860" }}>●</span>{" "}
        {fmt(pt.value)} {config.lineSeriesLabel}
      </div>
    </div>
  );
}
