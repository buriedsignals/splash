// THE one waterfall / bridge component — a starting total bridges to an ending
// total through signed steps (the flow family). D3 = math (waterfall-geometry.ts),
// React = DOM, one master `progress` builds the bridge step by step. Floating bars
// + connectors carry the running level. responsive=false = fixed layout
// (video/static); responsive=true = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: baseline-0 (geometry countDomain),
//     Okabe-Ito palette + WCAG + title=insight + source (ChartFrame + conformance),
//     scale via resolveFrame, direct labels.
//   - TYPE-specific: the cumulative running-total geometry, the floating bars +
//     connectors, the increase/decrease/total tri-colour, signed delta labels, and
//     the grow-from-the-previous-step reveal.
import { useState } from "react";
import {
  computeWaterfallLayout,
  growWaterfallBar,
  type WaterfallData,
  type WaterfallLayout,
} from "./waterfall-geometry";
import { formatNumber, clamp01, easeOutCubic, stagger } from "./core/math";
import { COLORS, FONT, TYPE, OKABE_ITO } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import { resolveFrame } from "./core/format";

export interface WaterfallConfig {
  title: string;
  source: { name: string; url: string };
  unit: string;
  rows: { label: string; value: number; total?: boolean }[];
}

export interface WaterfallChartProps {
  config: WaterfallConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

const UP = OKABE_ITO.blue; // increase
const DOWN = OKABE_ITO.vermillion; // decrease
const TOTAL = OKABE_ITO.black; // a total (neutral)

const barColor = (b: { isTotal: boolean; sign: 1 | -1 }) =>
  b.isTotal ? TOTAL : b.sign < 0 ? DOWN : UP;
const labelOf = (b: { isTotal: boolean; value: number }) =>
  b.isTotal
    ? formatNumber(b.value)
    : `${b.value > 0 ? "+" : "−"}${formatNumber(Math.abs(b.value))}`;

export function WaterfallChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: WaterfallChartProps) {
  const p = clamp01(progress);
  const s = responsive ? 1 : scale;
  const charsPerLine = Math.max(
    8,
    Math.floor((width - 48 * s) / (TYPE.title * s * 0.52)),
  );
  const titleLines = responsive
    ? Math.max(1, Math.ceil(config.title.length / Math.floor(width / 11)))
    : Math.max(1, Math.ceil(config.title.length / charsPerLine));
  // narrow bars → category labels get rotated (see svg), which need more bottom
  // room. Estimate it here (bar width is independent of the bottom padding).
  const estBw = ((width - (48 + 18) * s) / config.rows.length) * 0.66;
  const maxCatLen = Math.max(...config.rows.map((r) => r.label.length));
  const narrowEst = maxCatLen * TYPE.axis * s * 0.6 > estBw;
  const basePad = {
    top: responsive ? 16 : 53 + titleLines * 27,
    right: 18,
    bottom: narrowEst ? 84 : 52, // rotated labels need more room; clear the source
    left: 48, // count axis
  };
  const frame = responsive
    ? { scale: 1, pad: basePad, type: TYPE }
    : resolveFrame(width, height, basePad, scale);
  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;
  const data: WaterfallData = { rows: config.rows };
  const layout = computeWaterfallLayout(data, { width, height, padding });

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <WaterfallSvg
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
    >
      {svg}
    </ChartFrame>
  );
}

function WaterfallSvg({
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
  layout: WaterfallLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: WaterfallConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { innerWidth, innerHeight, base, bars } = layout;
  const n = bars.length;

  const chrome = easeOutCubic(p / 0.18);
  const barP = (i: number) => stagger(p, i, n, 0.18, 0.5 / n, 0.35);

  // narrow bars (mobile / portrait): category + value labels are wider than the
  // bar → rotate the categories and drop value labels INSIDE the bar, vertical.
  const bw = bars[0]?.w ?? 0;
  const maxCatLen = Math.max(...bars.map((b) => b.label.length));
  const narrow = maxCatLen * ts.axis * 0.6 > bw;

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
        {/* count-axis gridlines + labels (wipe in) */}
        <g opacity={chrome}>
          {layout.countTicks.map((t, i) => (
            <g key={`g${i}`}>
              <line
                x1={0}
                x2={innerWidth}
                y1={t.pos}
                y2={t.pos}
                stroke={COLORS.grid}
                strokeWidth={1}
              />
              <text
                x={-8 * sc}
                y={t.pos}
                dy="0.32em"
                textAnchor="end"
                fontSize={ts.axis}
                fill={COLORS.muted}
              >
                {t.label}
              </text>
            </g>
          ))}
        </g>

        {/* connectors carrying the running level to the next step (behind bars) */}
        {bars.slice(0, -1).map((b, i) => {
          const op = clamp01((barP(i) - 0.55) / 0.3);
          const next = bars[i + 1];
          return (
            <line
              key={`conn${i}`}
              x1={b.x + b.w}
              x2={next.x}
              y1={b.connectorY}
              y2={b.connectorY}
              stroke={COLORS.muted}
              strokeWidth={1}
              strokeDasharray={`${3 * sc} ${3 * sc}`}
              opacity={op * 0.8}
            />
          );
        })}

        {/* floating bars + category + signed value labels */}
        {bars.map((b, i) => {
          const g = growWaterfallBar(b, barP(i));
          const fill = barColor(b);
          const grown = barP(i);
          const labelOp = clamp01((grown - 0.6) / 0.4);
          const catOp = clamp01(grown * 1.5);
          const focused = interactive && hover === i;
          const dim = interactive && hover !== null && !focused;
          const topY = Math.min(b.startY, b.endY);
          return (
            <g key={`bar${i}`} opacity={dim ? 0.55 : 1}>
              <rect
                className="waterfall-bar"
                x={g.x}
                y={g.y}
                width={g.w}
                height={g.h}
                fill={fill}
                rx={1}
                tabIndex={interactive ? 0 : undefined}
                role={interactive ? "img" : undefined}
                aria-label={
                  interactive
                    ? `${b.label}: ${labelOf(b)} ${config.unit}`
                    : undefined
                }
                style={interactive ? { cursor: "pointer" } : undefined}
                onMouseEnter={interactive ? () => setHover(i) : undefined}
                onMouseLeave={interactive ? () => setHover(null) : undefined}
                onFocus={interactive ? () => setHover(i) : undefined}
                onBlur={interactive ? () => setHover(null) : undefined}
              />
              {/* signed value label — above the bar when wide, else VERTICAL
                  inside the bar (white) so narrow bars don't collide */}
              {narrow ? (
                <text
                  transform={`rotate(-90 ${b.x + b.w / 2} ${Math.max(b.startY, b.endY) - 6 * sc})`}
                  x={b.x + b.w / 2}
                  y={Math.max(b.startY, b.endY) - 6 * sc}
                  textAnchor="start"
                  fontSize={ts.axis * 0.9}
                  fontWeight={700}
                  fill="#fff"
                  opacity={labelOp}
                >
                  {labelOf(b)}
                </text>
              ) : (
                <text
                  x={b.x + b.w / 2}
                  y={topY - 6 * sc}
                  textAnchor="middle"
                  fontSize={ts.axis}
                  fontWeight={700}
                  fill={fill}
                  opacity={labelOp}
                >
                  {labelOf(b)}
                </text>
              )}
              {/* category label under the plot — rotated when bars are narrow */}
              {narrow ? (
                <text
                  transform={`rotate(-40 ${b.x + b.w / 2} ${innerHeight + 16 * sc})`}
                  x={b.x + b.w / 2}
                  y={innerHeight + 16 * sc}
                  textAnchor="end"
                  fontSize={ts.axis}
                  fill={COLORS.ink}
                  opacity={catOp}
                >
                  {b.label}
                </text>
              ) : (
                <text
                  x={b.x + b.w / 2}
                  y={innerHeight + 20 * sc}
                  textAnchor="middle"
                  fontSize={ts.axis}
                  fill={COLORS.ink}
                  opacity={catOp}
                >
                  {b.label}
                </text>
              )}
            </g>
          );
        })}

        {/* zero baseline */}
        <line
          x1={0}
          x2={innerWidth}
          y1={base}
          y2={base}
          stroke={COLORS.axis}
          strokeWidth={1}
          opacity={chrome}
        />
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
  layout: WaterfallLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: WaterfallConfig;
}) {
  const b = layout.bars[hover];
  const left = padding.left + b.x + b.w / 2;
  const top = padding.top + Math.min(b.startY, b.endY) - 8;
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
        fontSize: 13,
        whiteSpace: "nowrap",
        pointerEvents: "none",
        fontFamily: FONT,
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <strong>{labelOf(b)}</strong>{" "}
      <span style={{ opacity: 0.8 }}>{config.unit}</span>
      <div style={{ opacity: 0.7, fontSize: 11 }}>
        {b.label}
        {b.isTotal ? "" : ` · running ${formatNumber(b.endVal)}`}
      </div>
    </div>
  );
}
