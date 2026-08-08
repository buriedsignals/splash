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
import { clamp01, easeOutCubic, stagger } from "./core/math";
import {
  COLORS,
  FONT,
  TYPE,
  OKABE_ITO,
  themeColors,
  tooltipBorder,
} from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import { wrapLabel } from "./core/text";
import { localizeValueLabel, type Lang } from "./core/locale";
import {
  formatAtGrain,
  parseIsoDate,
} from "../../../lib/core/date-locale";
import { timeChartCopy } from "../../../lib/core/time-chart-copy";
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

// ★ THE COLOUR DECISION, AND WHY IT IS NOT RED/GREEN.
//
// A candlestick is the one chart type in this engine whose colours carry a MARKET CONVENTION
// the reader brings with them — and that convention is INVERTED between markets. In Western
// markets green is a rising period and red a falling one; in China, Taiwan, Japan and South
// Korea RED is rising and green is falling (the Japanese hand-drawn originals used red for the
// up day, which is where both conventions descend from). A red/green candlestick therefore
// says the opposite thing to two different readers, and neither can tell which one they are
// looking at. Splash finishes deliverables read by a general newsroom audience, not by traders
// who know which exchange's convention a chart follows.
//
// So the type refuses the convention entirely and uses the Okabe-Ito pair every other type
// uses: blue and orange. That is CVD-safe (red/green is the canonical pair a deuteranope
// cannot separate — a second, independent reason not to use it) and, decisively, it carries NO
// market meaning in either convention, so it cannot be misread as one. The price of leaving
// the convention is that the colours no longer explain themselves — which is why this type
// always draws a LEGEND naming both directions AND glossing what "up" means, in the
// deliverable's language. See knowledge/references/chart/types/candlestick.md.
const UP = OKABE_ITO.blue;
const DOWN = OKABE_ITO.orange;
// Height reserved below the date axis for that legend. It is not optional furniture: without
// it the two hues are an unexplained convention, which is the defect the hue choice creates.
// Height reserved below the date axis for the swatch row. The gloss line under it is measured
// and reserved separately, because it WRAPS: at 360px "Anstieg = Schluss ≥ Eröffnung · Rückgang
// = Schluss < Eröffnung" ran 76px past the card and snap-label-fit failed the interactive
// produce. It is not a line that may be dropped on a phone — it is what makes the two hues
// mean anything to a reader who brings no market convention — so it wraps instead.
const DIRECTION_LEGEND_H = 30;
const DIRECTION_NOTE_LINE_H = 15;
/** The two direction hues, EXPORTED so the produce-time guard checks the pair the component
 *  actually paints rather than a copy of them — [up, down]. */
export const CANDLE_DIRECTION_COLORS = [UP, DOWN] as const;

/** A period's own date, written at the grain the journalist supplied and in the deliverable's
 *  language; a date the shared parser does not accept (a bare "Q1") passes through verbatim. */
function periodDate(raw: string, lang?: Lang): string {
  const d = parseIsoDate(raw);
  return d ? formatAtGrain(d, lang) : raw;
}

/**
 * A candle's accessible name — the ONLY content a screen-reader user gets from this chart, and
 * until now four English words wrapped around four unlocalized digit strings, sitting
 * underneath a correctly French `altInsight`. Both halves come from the tables now.
 */
function candleAria(config: CandlestickConfig, i: number): string {
  const d = config.periods[i];
  const f = (v: number) => localizeValueLabel(v, config.lang);
  return timeChartCopy(config.lang).ohlcAria(
    periodDate(d.date, config.lang),
    f(d.open),
    f(d.high),
    f(d.low),
    f(d.close),
  );
}

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
  const PAD_LEFT = 48; // price axis
  const PAD_RIGHT = 16;
  const copy = timeChartCopy(config.lang);
  // Measured at the SAME inner width the svg draws at, so the reserved height and the rendered
  // block can never disagree.
  const noteLines = wrapLabel(
    copy.directionNote(copy.up, copy.down),
    width - PAD_LEFT - PAD_RIGHT,
    TYPE.source * 0.92,
    2,
  );
  const basePad = {
    // The price-axis label sits ABOVE the axis (horizontal), not rotated up its side: a
    // rotated axis title is the one label the label-fit snap cannot measure, and this one is
    // required by the guard (`priceLabel`), so it must be visible at every width.
    top: (responsive ? 14 : 50 + titleLines * 27) + 14,
    right: PAD_RIGHT,
    // date axis + the direction legend + however many lines its gloss wraps to
    // (source band reserved in resolveFrameWithHeader)
    bottom: 28 + DIRECTION_LEGEND_H + noteLines.length * DIRECTION_NOTE_LINE_H,
    left: PAD_LEFT,
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
  const layout = computeCandlestickLayout(
    data,
    { width, height, padding },
    { lang: config.lang },
  );

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <CandlestickSvg
      noteLines={noteLines}
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
  noteLines,
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
  noteLines: string[];
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
  const copy = timeChartCopy(config.lang);
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
                {t.label}
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
          {/* the price-axis label — declared in the config, required by the guard, and until
              now never drawn: the chart shipped an unlabelled price axis while
              checkCandlestickConformance passed on the field nobody rendered. */}
          <text
            x={-8 * sc}
            y={-10 * sc}
            textAnchor="start"
            fontSize={ts.source}
            fill={C.muted}
          >
            {config.priceLabel}
          </text>
        </g>

        {/* the direction legend — the two hues carry NO market convention (see UP/DOWN
            above), so the chart names them itself rather than assuming the reader brings
            one, and glosses what "up" means so no convention is needed at all. */}
        <g opacity={chrome}>
          {[
            { color: UP, text: copy.up },
            { color: DOWN, text: copy.down },
          ].map((it, i) => (
            <g key={`dl${i}`} transform={`translate(${i * 110 * sc},0)`}>
              <rect
                x={0}
                y={innerHeight + 30 * sc}
                width={12 * sc}
                height={12 * sc}
                rx={2}
                fill={it.color}
              />
              <text
                x={17 * sc}
                y={innerHeight + 36 * sc}
                dy="0.32em"
                fontSize={ts.source}
                fontWeight={600}
                fill={C.ink}
              >
                {it.text}
              </text>
            </g>
          ))}
          {noteLines.map((line, i) => (
            <text
              key={`dn${i}`}
              x={0}
              y={innerHeight + (52 + i * DIRECTION_NOTE_LINE_H) * sc}
              dy="0.32em"
              fontSize={ts.source * 0.92}
              fill={C.muted}
            >
              {line}
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
                className="candle-body"
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
                  aria-label={candleAria(config, c.index)}
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
  const { ohlc } = timeChartCopy(config.lang);
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
      <strong style={{ color: "#fff", fontSize: 13 }}>
        {periodDate(d.date, config.lang)}
      </strong>{" "}
      <span style={{ fontSize: 12 }}>
        {d.close >= d.open ? "▲" : "▼"} {localizeValueLabel(d.close, config.lang)}
      </span>
      {/* the four OHLC words, not their English initials: Italian's *massimo* and *minimo*
          both start with M, so an initial row prints the same letter for the two opposite
          ends of the period's range. And a PRICE prints the figure, never an abbreviation
          of it — "5,2k" for 5 230 hides the very movement a candlestick is drawn to show. */}
      <div style={{ opacity: 0.75, fontSize: 11 }}>
        {ohlc.open} {localizeValueLabel(d.open, config.lang)} · {ohlc.high}{" "}
        {localizeValueLabel(d.high, config.lang)} · {ohlc.low}{" "}
        {localizeValueLabel(d.low, config.lang)} · {ohlc.close}{" "}
        {localizeValueLabel(d.close, config.lang)}
      </div>
    </div>
  );
}
