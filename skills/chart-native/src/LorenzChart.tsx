// THE one Lorenz curve component — cumulative income share vs population share,
// with the 45° line of equality; the gap = inequality (Gini). D3 = math
// (lorenz-geometry.ts), React = DOM, one master `progress` clips the curves in
// left→right. responsive=false = fixed (video/static); responsive=true = flow.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: Okabe-Ito palette + WCAG + title=
//     insight + cited source (ChartFrame + checkLorenzConformance), scale via
//     resolveFrame.
//   - TYPE-specific: the line of equality, the shaded inequality gap, the Gini
//     labels, and the clip-wipe curve reveal.
import { useState } from "react";
import {
  computeLorenzLayout,
  type LorenzData,
  type LorenzLayout,
} from "./lorenz-geometry";
import { line, area, curveLinear } from "d3-shape";
import { clamp01, easeInOutCubic, easeOutCubic } from "./core/math";
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
import { layoutLegend, legendRowCount } from "./core/legend";

export interface LorenzConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  unit: string; // subtitle
  xLabel: string;
  yLabel: string;
  series: { label: string; points: { x: number; y: number }[] }[];
  /** newsroom house theme GROUND (F2 house `theme`) — every furniture token (ink, muted,
   *  axis, grid, bg) derives from this hex. Undefined = the light default (byte-identical). */
  themeBg?: string;
  /** newsroom house hue (spec `baseColor`): tints the FURNITURE greys (muted/axis/grid) and
   *  the frame's title band toward the house colour. The curves carry the fixed
   *  most-unequal-first Okabe-Ito palette that the comparison depends on, so the hue never
   *  touches them. Undefined = untinted (byte-identical). */
  baseColor?: string;
}

export interface LorenzChartProps {
  config: LorenzConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

// most-unequal curve first → vermillion (the alarming one); comparison → blue.
const CURVE_COLORS = [OKABE_ITO.vermillion, OKABE_ITO.blue, OKABE_ITO.green];

export function LorenzChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: LorenzChartProps) {
  const p = clamp01(progress);
  const s = responsive ? 1 : scale;
  const charsPerLine = Math.max(
    8,
    Math.floor((width - 48 * s) / (TYPE.title * s * 0.52)),
  );
  const titleLines = responsive
    ? Math.max(1, Math.ceil(config.title.length / Math.floor(width / 11)))
    : Math.max(1, Math.ceil(config.title.length / charsPerLine));
  // reserve bottom for the x-axis ticks + caption AND the (wrapping) legend rows.
  const giniLabels = config.series.map((s) => `${s.label} · Gini 0.00`);
  const LEG_ROW = 20;
  const legendRows = legendRowCount(
    giniLabels,
    width - 70,
    TYPE.axis * 0.6,
    LEG_ROW,
  );
  const basePad = {
    top: responsive ? 14 : 50 + titleLines * 27,
    right: 18,
    bottom: 48 + legendRows * LEG_ROW, // x ticks + caption + legend rows (source band reserved in resolveFrameWithHeader)
    left: 52, // y axis + label
  };
  const frame = resolveFrameWithHeader(
    config.title,
    config.unit,
    width,
    height,
    basePad,
    scale,
    0.78,
    responsive,
  );
  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;

  const data: LorenzData = {
    xLabel: config.xLabel,
    yLabel: config.yLabel,
    series: config.series,
  };
  const layout = computeLorenzLayout(data, { width, height, padding });

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <LorenzSvg
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

function LorenzSvg({
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
  layout: LorenzLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: LorenzConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { innerWidth, innerHeight, series, equality, xTicks, yTicks } = layout;
  const C = themeColors(config.themeBg, config.baseColor);
  const chrome = easeOutCubic(p / 0.18);
  const reveal = easeInOutCubic(p);
  const clipW = innerWidth * reveal + 1;
  const clipId = "lorenz-wipe";

  const lineGen = line<{ x: number; y: number }>()
    .x((d) => d.x)
    .y((d) => d.y)
    .curve(curveLinear);
  // gap area: between the FIRST (most unequal) curve and the diagonal.
  const gapGen = area<{ x: number; y: number }>()
    .x((d) => d.x)
    .y0((d) => equality.y0 + ((equality.y1 - equality.y0) * d.x) / innerWidth) // the diagonal at this x
    .y1((d) => d.y)
    .curve(curveLinear);

  const color = (i: number) => CURVE_COLORS[i % CURVE_COLORS.length];
  // hover columns at decile boundaries (from the first series' x positions)
  const cols = series[0].points;

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
          <rect x={0} y={-padding.top} width={clipW} height={height} />
        </clipPath>
      </defs>
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* axes + gridlines + labels (fade in) */}
        <g opacity={chrome}>
          {yTicks.map((t, i) => (
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
          {xTicks.map((t, i) => (
            <text
              key={`x${i}`}
              x={t.pos}
              y={innerHeight + 16 * sc}
              textAnchor="middle"
              fontSize={ts.source}
              fill={C.muted}
            >
              {t.label}
            </text>
          ))}
          <text
            x={innerWidth / 2}
            y={innerHeight + 30 * sc}
            textAnchor="middle"
            fontSize={ts.axis}
            fill={C.muted}
          >
            {truncate(config.xLabel, innerWidth, ts.axis)}
          </text>
          <text
            transform={`translate(${-38 * sc},${innerHeight / 2}) rotate(-90)`}
            textAnchor="middle"
            fontSize={ts.axis}
            fill={C.muted}
          >
            {truncate(config.yLabel, innerHeight, ts.axis)}
          </text>
          {/* legend BELOW the plot (a line swatch + label · Gini per curve) */}
          {layoutLegend(
            series.map((srs) => `${srs.label} · Gini ${srs.gini.toFixed(2)}`),
            series.map((srs) => color(srs.index)),
            innerWidth,
            0,
            innerHeight + 52 * sc,
            ts.axis * 0.6,
            20 * sc,
            sc,
          ).items.map((it, i) => (
            <g key={`lg${i}`}>
              <line
                x1={it.x}
                x2={it.x + 18 * sc}
                y1={it.y}
                y2={it.y}
                stroke={it.color}
                strokeWidth={3 * sc}
              />
              <text
                x={it.x + 24 * sc}
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

        {/* clipped data: gap → equality line → curves → labels */}
        <g clipPath={`url(#${clipId})`}>
          <path
            d={gapGen(series[0].points) ?? ""}
            fill={color(0)}
            fillOpacity={0.12}
          />
          <line
            x1={equality.x0}
            y1={equality.y0}
            x2={equality.x1}
            y2={equality.y1}
            stroke={C.muted}
            strokeWidth={1.5 * sc}
            strokeDasharray={`${5 * sc} ${4 * sc}`}
          />
          {/* "line of equality" running ALONG the diagonal, lifted into the empty
              upper-left triangle so it never collides with the converging curves */}
          <text
            transform={`translate(${equality.x0 + (equality.x1 - equality.x0) * 0.34},${equality.y0 + (equality.y1 - equality.y0) * 0.34}) rotate(${(Math.atan2(equality.y1 - equality.y0, equality.x1 - equality.x0) * 180) / Math.PI})`}
            y={-7 * sc}
            textAnchor="middle"
            fontSize={ts.source}
            fill={C.muted}
          >
            line of equality
          </text>

          {series.map((srs) => (
            <path
              key={`s${srs.index}`}
              d={lineGen(srs.points) ?? ""}
              fill="none"
              stroke={color(srs.index)}
              strokeWidth={2.6 * sc}
            />
          ))}
        </g>

        {/* interactive hover columns (deciles) */}
        {interactive &&
          cols.map((c, i) => {
            if (i === 0) return null;
            const x0 = cols[i - 1].x;
            const focused = hover === i;
            return (
              <g key={`hit${i}`}>
                {focused && (
                  <line
                    x1={c.x}
                    x2={c.x}
                    y1={0}
                    y2={innerHeight}
                    stroke={C.ink}
                    strokeWidth={1}
                    opacity={0.3}
                  />
                )}
                <rect
                  x={x0}
                  y={0}
                  width={c.x - x0}
                  height={innerHeight}
                  fill="transparent"
                  tabIndex={0}
                  role="img"
                  aria-label={ariaFor(config, i)}
                  style={{ cursor: "pointer", outline: "none" }}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                />
              </g>
            );
          })}
      </g>
    </svg>
  );
}

function ariaFor(config: LorenzConfig, i: number): string {
  const pop = Math.round(config.series[0].points[i].x * 100);
  const parts = config.series
    .map((s) => `${s.label} ${Math.round(s.points[i].y * 100)}%`)
    .join(", ");
  return `poorest ${pop}% of households: ${parts} of income`;
}

function Tooltip({
  layout,
  padding,
  hover,
  config,
}: {
  layout: LorenzLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: LorenzConfig;
}) {
  const pop = config.series[0].points[hover].x;
  const left = padding.left + layout.series[0].points[hover].x;
  const top = padding.top + 14;
  return (
    <div
      className="tooltip"
      style={{
        position: "absolute",
        left,
        top,
        transform: "translate(-50%,0)",
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
      <strong style={{ fontSize: 13 }}>poorest {Math.round(pop * 100)}%</strong>
      {config.series.map((srs, i) => (
        <div
          key={i}
          style={{ fontSize: 12, color: CURVE_COLORS[i % CURVE_COLORS.length] }}
        >
          {srs.label}: {Math.round(srs.points[hover].y * 100)}% of income
        </div>
      ))}
    </div>
  );
}
