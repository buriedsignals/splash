// THE one candlestick / OHLC component — each period as a wick (high→low) + body
// (open→close), coloured up vs down. D3 = math (candlestick-geometry.ts), React =
// DOM, one master `progress` draws the candles left→right (wick draws, body grows
// from the open). responsive=false = fixed (video/static); responsive=true = flow.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: Okabe-Ito direction colours + WCAG
//     + title=insight + cited source (ChartFrame + checkCandlestickConformance),
//     scale via resolveFrame.
//   - TYPE-specific: the wick+body mark, the up/down colouring, and the
//     left→right grow-from-open reveal.
import { useState } from "react";
import {
  computeCandlestickLayout,
  growCandleBody,
  type CandlestickData,
  type CandlestickLayout,
} from "./candlestick-geometry";
import { clamp01, easeOutCubic, stagger, formatNumber } from "./core/math";
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

export interface CandlestickConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  unit: string; // subtitle
  priceLabel: string;
  periods: {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
  }[];
  /** newsroom house theme GROUND (F2 house `theme`) — every furniture token (ink, muted,
   *  axis, grid, bg) derives from this hex. Undefined = the light default (byte-identical). */
  themeBg?: string;
  /** newsroom house hue (spec `baseColor`): tints the FURNITURE greys (muted/axis/grid) and
   *  the frame's title band toward the house colour. Candles are coloured by DIRECTION
   *  (up/down), so the hue never touches them. Undefined = untinted (byte-identical). */
  baseColor?: string;
}

export interface CandlestickChartProps {
  config: CandlestickConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

const UP = OKABE_ITO.blue;
const DOWN = OKABE_ITO.orange;

export function CandlestickChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: CandlestickChartProps) {
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
    right: 16,
    bottom: 28, // date axis (source band reserved in resolveFrameWithHeader)
    left: 48, // price axis
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

  const data: CandlestickData = { periods: config.periods };
  const layout = computeCandlestickLayout(data, { width, height, padding });

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <CandlestickSvg
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

function CandlestickSvg({
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
  layout: CandlestickLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: CandlestickConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { innerWidth, innerHeight, candles, priceTicks, dateTicks } = layout;
  const C = themeColors(config.themeBg, config.baseColor);
  const n = candles.length;
  const chrome = easeOutCubic(p / 0.16);
  const candleP = (i: number) =>
    easeOutCubic(stagger(p, i, n, 0.1, 0.6 / n, 0.3));

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={config.title}
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* price gridlines + labels + date axis (fade in) */}
        <g opacity={chrome}>
          {priceTicks.map((t, i) => (
            <g key={`y${i}`}>
              <line
                x1={0}
                x2={innerWidth}
                y1={t.pos}
                y2={t.pos}
                stroke={C.grid}
                strokeWidth={1}
              />
              <text
                x={-8 * sc}
                y={t.pos}
                dy="0.32em"
                textAnchor="end"
                fontSize={ts.source}
                fill={C.muted}
              >
                {formatNumber(Number(t.label), config.lang)}
              </text>
            </g>
          ))}
          {dateTicks.map((t, i) => (
            <text
              key={`x${i}`}
              x={t.pos}
              y={innerHeight + 18 * sc}
              textAnchor="middle"
              fontSize={ts.source}
              fill={C.muted}
            >
              {t.label}
            </text>
          ))}
        </g>

        {/* candles — wick draws then body grows from the open, left→right */}
        {candles.map((c) => {
          const ap = candleP(c.index);
          if (ap <= 0.01) return null;
          const color = c.up ? UP : DOWN;
          const focused = interactive && hover === c.index;
          const dim = interactive && hover !== null && !focused;
          // wick draws from the open outward to high/low
          const wickHi = c.openY + (c.highY - c.openY) * ap;
          const wickLo = c.openY + (c.lowY - c.openY) * ap;
          const body = growCandleBody(c, ap);
          const bh = Math.max(0.6, body.bottom - body.top);
          return (
            <g key={`c${c.index}`} opacity={dim ? 0.4 : 1}>
              <line
                x1={c.cx}
                x2={c.cx}
                y1={wickHi}
                y2={wickLo}
                stroke={color}
                strokeWidth={1.4 * sc}
              />
              <rect
                x={c.bodyX}
                y={body.top}
                width={c.bodyW}
                height={bh}
                fill={color}
                stroke={color}
                strokeWidth={1}
              />
              {interactive && (
                <rect
                  x={c.bodyX - c.bodyW * 0.25}
                  y={0}
                  width={c.bodyW * 1.5}
                  height={innerHeight}
                  fill="transparent"
                  tabIndex={0}
                  role="img"
                  aria-label={`${config.periods[c.index].date}: open ${config.periods[c.index].open}, high ${config.periods[c.index].high}, low ${config.periods[c.index].low}, close ${config.periods[c.index].close}`}
                  style={{ cursor: "pointer", outline: "none" }}
                  onMouseEnter={() => setHover(c.index)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(c.index)}
                  onBlur={() => setHover(null)}
                />
              )}
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
}: {
  layout: CandlestickLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: CandlestickConfig;
}) {
  const c = layout.candles.find((x) => x.index === hover);
  const d = config.periods[hover];
  if (!c || !d) return null;
  const left = padding.left + c.cx;
  const top = padding.top + Math.min(c.highY, c.bodyTop) - 8;
  const color = c.up ? UP : DOWN;
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
      <span aria-hidden="true" style={{ color, marginRight: 4 }}>
        ■
      </span>
      <strong style={{ color: "#fff", fontSize: 13 }}>{d.date}</strong>{" "}
      <span style={{ fontSize: 12 }}>
        {d.close >= d.open ? "▲" : "▼"} {formatNumber(d.close, config.lang)}
      </span>
      <div style={{ opacity: 0.75, fontSize: 11 }}>
        O {formatNumber(d.open, config.lang)} · H{" "}
        {formatNumber(d.high, config.lang)} · L{" "}
        {formatNumber(d.low, config.lang)} · C{" "}
        {formatNumber(d.close, config.lang)}
      </div>
    </div>
  );
}
