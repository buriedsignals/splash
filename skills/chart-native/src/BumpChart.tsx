// THE one bump chart component — a ranking-over-time race: each item is a line
// through its rank (1 = top) at every period; the read is the crossings. D3 =
// math (bump-geometry.ts), React = DOM, one master `progress` draws the lines
// left → right. A few tracked items are accented; the rest are neutral context.
// responsive=false = fixed (video/static); responsive=true = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: Okabe-Ito accents + WCAG + title=
//     insight + cited source (ChartFrame + checkBumpConformance), scale via
//     resolveFrame, core/text.truncate for the end labels.
//   - TYPE-specific: the rank grid (1 at top), the highlight-vs-grey lines, and
//     the left → right line-draw reveal.
import { useState } from "react";
import {
  computeBumpLayout,
  drawBumpPath,
  resolveBumpAccents,
  type BumpData,
  type BumpLayout,
} from "./bump-geometry";
import { clamp01, easeInOutCubic, easeOutCubic } from "./core/math";
import { COLORS, FONT, TYPE } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import type { Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";
import { truncate, textWidth } from "./core/text";

export interface BumpConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  valueLabel: string; // subtitle (what the rank means)
  periods: string[];
  highlight?: string[];
  /** subject-fit hue for a SINGLE tracked line (the accent the journalist approved in
   *  the spec). Absent → the BUMP_ACCENT_COLORS default. Painted on the LINE/mark; every
   *  end label stays COLORS.ink ("label carries the value, mark carries the hue"). */
  baseColor?: string;
  /** subject-fit hues for MULTIPLE tracked lines, in highlight order. Absent slots
   *  fall back to the BUMP_ACCENT_COLORS default. */
  seriesColors?: string[];
  items: { label: string; ranks: number[] }[];
}

export interface BumpChartProps {
  config: BumpConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

export function BumpChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: BumpChartProps) {
  const p = clamp01(progress);
  const s = responsive ? 1 : scale;
  const charsPerLine = Math.max(
    8,
    Math.floor((width - 48 * s) / (TYPE.title * s * 0.52)),
  );
  const titleLines = responsive
    ? Math.max(1, Math.ceil(config.title.length / Math.floor(width / 11)))
    : Math.max(1, Math.ceil(config.title.length / charsPerLine));

  // accent colour per highlighted item, in highlight order — resolved through the
  // shared path so the spec's subject-fit colour (baseColor for one tracked line,
  // seriesColors for several) reaches the bump chart, falling back to the default
  // palette only when the spec provides none.
  const accents = resolveBumpAccents(config.highlight, {
    baseColor: config.baseColor,
    seriesColors: config.seriesColors,
  });
  const accentOf = new Map<string, string>();
  (config.highlight ?? []).forEach((label, i) =>
    accentOf.set(label, accents[i]),
  );
  const colorOf = (label: string, highlighted: boolean) =>
    highlighted ? (accentOf.get(label) ?? accents[0]) : COLORS.muted;

  // right gutter = the widest END label (capped) + the dot + a gap.
  const labelWBase = Math.max(
    ...config.items.map((it) => textWidth(it.label, TYPE.axis)),
  );
  const rightGutter = Math.min(
    labelWBase + 18,
    (width / (responsive ? 1 : scale)) * 0.3,
  );
  const basePad = {
    top: responsive ? 14 : 50 + titleLines * 27,
    right: rightGutter,
    bottom: 30, // period captions (source band reserved in resolveFrameWithHeader)
    left: 26, // rank numbers
  };
  const frame = resolveFrameWithHeader(
    config.title,
    config.valueLabel,
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

  const data: BumpData = {
    periods: config.periods,
    items: config.items,
    highlight: config.highlight,
  };
  const layout = computeBumpLayout(data, { width, height, padding });

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <BumpSvg
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
      subtitle={config.valueLabel}
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

function BumpSvg({
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
  layout: BumpLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: BumpConfig;
  colorOf: (label: string, highlighted: boolean) => string;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { innerWidth, innerHeight, lines, periodsX, rankAxis } = layout;
  const chrome = easeOutCubic(p / 0.16);
  const drawProg = easeInOutCubic(clamp01((p - 0.12) / 0.73));
  const labelOp = clamp01((p - 0.82) / 0.18);

  const path = (pts: { x: number; y: number }[]) =>
    pts.length ? "M" + pts.map((q) => `${q.x},${q.y}`).join("L") : "";

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={config.title}
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* chrome: rank rows (light) + rank numbers + period captions */}
        <g opacity={chrome}>
          {rankAxis.map((r) => (
            <line
              key={`rl${r.rank}`}
              x1={0}
              x2={innerWidth}
              y1={r.y}
              y2={r.y}
              stroke={COLORS.grid}
              strokeWidth={1}
            />
          ))}
          {rankAxis.map((r) => (
            <text
              key={`rn${r.rank}`}
              x={-10 * sc}
              y={r.y}
              dy="0.32em"
              textAnchor="end"
              fontSize={ts.source}
              fill={COLORS.muted}
            >
              {r.rank}
            </text>
          ))}
          {periodsX.map((pp, i) => (
            <text
              key={`pc${i}`}
              x={pp.x}
              y={innerHeight + 20 * sc}
              textAnchor={
                i === 0 ? "start" : i === periodsX.length - 1 ? "end" : "middle"
              }
              fontSize={ts.axis}
              fontWeight={600}
              fill={COLORS.ink}
            >
              {pp.label}
            </text>
          ))}
        </g>

        {/* lines — drawn left → right; highlighted on top, context behind */}
        {[...lines]
          .sort((a, b) => Number(a.highlighted) - Number(b.highlighted))
          .map((ln) => {
            const drawn = drawBumpPath(ln.points, drawProg);
            const color = colorOf(ln.label, ln.highlighted);
            const focused = interactive && hover === ln.index;
            const dim =
              (interactive && hover !== null && !focused) ||
              (!ln.highlighted && hover === null);
            const w = (ln.highlighted ? 3 : 1.5) * sc;
            const xMin = ln.points[0].x;
            const xSpan = ln.points[ln.points.length - 1].x - xMin || 1;
            return (
              <g
                key={`ln${ln.index}`}
                opacity={dim ? (ln.highlighted ? 0.5 : 0.32) : 1}
              >
                <path
                  d={path(drawn)}
                  fill="none"
                  stroke={color}
                  strokeWidth={focused ? w + 1 : w}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {/* a dot per period — invisible until the line-draw starts, then
                    each pops just as the sweep reaches it (the last dot lands full
                    at the end). Nothing is drawn while drawProg is 0. */}
                {ln.points.map((pt, pi) => {
                  const frac = (pt.x - xMin) / xSpan;
                  const op =
                    drawProg <= 0
                      ? 0
                      : clamp01((drawProg - frac + 0.08) / 0.06);
                  return (
                    <circle
                      key={`d${pi}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={(ln.highlighted ? 4 : 2.5) * sc}
                      fill={color}
                      opacity={op}
                    />
                  );
                })}
                {/* end label at the last period */}
                <text
                  x={ln.points[ln.points.length - 1].x + 10 * sc}
                  y={ln.points[ln.points.length - 1].y}
                  dy="0.32em"
                  textAnchor="start"
                  fontSize={ts.axis}
                  fontWeight={ln.highlighted ? 700 : 400}
                  fill={COLORS.ink}
                  opacity={labelOp}
                >
                  {truncate(ln.label, padding.right - 14 * sc, ts.axis)}
                </text>

                {/* interactive hit-target: a fat transparent line over the path */}
                {interactive && (
                  <path
                    d={path(ln.points)}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={16 * sc}
                    tabIndex={0}
                    role="img"
                    aria-label={`${ln.label}: rank ${ln.startRank} in ${config.periods[0]}, rank ${ln.endRank} in ${config.periods[config.periods.length - 1]}`}
                    style={{ cursor: "pointer", outline: "none" }}
                    onMouseEnter={() => setHover(ln.index)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(ln.index)}
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
  colorOf,
}: {
  layout: BumpLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: BumpConfig;
  colorOf: (label: string, highlighted: boolean) => string;
}) {
  const ln = layout.lines.find((x) => x.index === hover);
  if (!ln) return null;
  const last = ln.points[ln.points.length - 1];
  // anchor to the upper-left of the end point so it never spills off the right
  // edge; but for a TOP-rank line (y near 0) flip BELOW so it isn't clipped above.
  const nearTop = last.y < 48;
  const left = padding.left + last.x;
  const top = padding.top + last.y + (nearTop ? 14 : -12);
  const color = colorOf(ln.label, ln.highlighted);
  return (
    <div
      className="tooltip"
      style={{
        position: "absolute",
        left,
        top,
        transform: `translate(-100%,${nearTop ? "0%" : "-100%"})`,
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
      <span aria-hidden="true" style={{ color, marginRight: 4 }}>
        ■
      </span>
      <strong style={{ color: "#fff", fontSize: 13 }}>{ln.label}</strong>
      <div style={{ fontSize: 11, opacity: 0.85, marginTop: 1 }}>
        {config.periods
          .map((per, i) => `${per} #${ln.points[i].rank}`)
          .join(" · ")}
      </div>
    </div>
  );
}
