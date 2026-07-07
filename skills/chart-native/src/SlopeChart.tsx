// THE one slope/slopegraph component — a two-period POSITION chart (no baseline-0;
// slope.md rule 1, the explicit opposite of bar). D3 = math (slope-geometry.ts),
// React = DOM, one master `progress` extends each line left→right.
// responsive=false = fixed layout (video/static); responsive=true = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: title=insight + Okabe-Ito accent +
//     source + WCAG (ChartFrame + conformance), scale via resolveFrame, direct
//     labels over a legend.
//   - TYPE-specific: the two-point geometry, the line-extend motion, the
//     position (not length) encoding, and the ≤2-colour neutral-context + one-
//     accent treatment that makes the line that bucks the trend pop. Labels live
//     in the side gutters and de-collide vertically (spreadLabels).
import { useState } from "react";
import {
  computeSlopeLayout,
  extendLine,
  spreadLabels,
  type SlopeData,
  type SlopeLayout,
} from "./slope-geometry";
import { clamp01, easeOutCubic, stagger } from "./core/math";
import { COLORS, FONT, TYPE, SLOPE_LINE_COLORS } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";

export interface SlopeConfig {
  title: string;
  source: { name: string; url: string };
  unit: string;
  labelField: string;
  leftField: string;
  rightField: string;
  leftPeriod: string;
  rightPeriod: string;
  /** the one category to accent (the line that bucks the trend) */
  highlightLabel?: string;
  rows: Record<string, string | number>[];
}

export interface SlopeChartProps {
  config: SlopeConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

const CONTEXT = SLOPE_LINE_COLORS[0]; // neutral context line (slope.md rule 4)
const ACCENT = SLOPE_LINE_COLORS[1]; // the one editorial line

export function SlopeChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: SlopeChartProps) {
  const p = clamp01(progress);
  const s = responsive ? 1 : scale;
  // top padding clears the absolute header (title wraps to 2 lines on square /
  // portrait); same line-estimate as the stacked bar.
  const charsPerLine = Math.max(
    8,
    Math.floor((width - 48 * s) / (TYPE.title * s * 0.52)),
  );
  const titleLines = responsive
    ? 1
    : Math.max(1, Math.ceil(config.title.length / charsPerLine));
  const basePad = {
    top: responsive ? 16 : 53 + titleLines * 27,
    right: 86, // right value labels
    bottom: 56, // period captions, clear of the source line below
    left: 138, // category name + left value labels
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
  const data: SlopeData = {
    labelField: config.labelField,
    leftField: config.leftField,
    rightField: config.rightField,
    rows: config.rows,
  };
  const layout = computeSlopeLayout(data, { width, height, padding });

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <SlopeSvg
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

function Tooltip({
  layout,
  padding,
  hover,
  config,
}: {
  layout: SlopeLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: SlopeConfig;
}) {
  const l = layout.lines.find((x) => x.index === hover);
  if (!l) return null;
  const left = padding.left + (l.x1 + l.x2) / 2;
  const top = padding.top + (l.y1 + l.y2) / 2 - 12;
  const delta = l.rightVal - l.leftVal;
  const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "▬";
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
      <strong>{l.rawLabel}</strong>{" "}
      <span style={{ opacity: 0.8 }}>
        {config.leftPeriod} {l.leftVal.toFixed(1)} → {config.rightPeriod}{" "}
        {l.rightVal.toFixed(1)}
      </span>
      <div style={{ opacity: 0.7, fontSize: 11 }}>
        {arrow} {Math.abs(delta).toFixed(1)} {config.unit}
      </div>
    </div>
  );
}

function SlopeSvg({
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
  layout: SlopeLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: SlopeConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { innerWidth, innerHeight, leftX, rightX, lines } = layout;
  const n = lines.length;

  const chrome = easeOutCubic(p / 0.18);
  const lineP = (i: number) => stagger(p, i, n, 0.18, 0.5 / n, 0.4);

  const isHi = (l: { rawLabel: string }) =>
    config.highlightLabel != null && l.rawLabel === config.highlightLabel;

  // de-collide the end labels vertically in each gutter (spreadLabels).
  const minGap = 16 * sc;
  const leftYs = spreadLabels(
    lines.map((l) => ({ index: l.index, y: l.y1 })),
    minGap,
    innerHeight,
  );
  const rightYs = spreadLabels(
    lines.map((l) => ({ index: l.index, y: l.y2 })),
    minGap,
    innerHeight,
  );

  const fmt = (v: number) => v.toFixed(1);

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
        {/* light value axis (a few horizontal guides) — fades in */}
        <g opacity={chrome * 0.6}>
          {layout.valueTicks.map((t, i) => (
            <line
              key={`g${i}`}
              x1={0}
              x2={innerWidth}
              y1={t.pos}
              y2={t.pos}
              stroke={COLORS.grid}
              strokeWidth={1}
            />
          ))}
        </g>

        {/* the two period columns + captions (fade in) */}
        <g opacity={chrome}>
          {[
            { x: leftX, label: config.leftPeriod },
            { x: rightX, label: config.rightPeriod },
          ].map((c, i) => (
            <g key={`p${i}`}>
              <line
                x1={c.x}
                x2={c.x}
                y1={0}
                y2={innerHeight}
                stroke={COLORS.axis}
                strokeWidth={1}
              />
              <text
                x={c.x}
                y={innerHeight + 22 * sc}
                textAnchor="middle"
                fontSize={ts.axis}
                fontWeight={600}
                fill={COLORS.ink}
              >
                {c.label}
              </text>
            </g>
          ))}
        </g>

        {/* slope lines — accent drawn last so it sits on top */}
        {[...lines]
          .sort((a, b) => Number(isHi(a)) - Number(isHi(b)))
          .map((l) => {
            const lp = lineP(l.index);
            const end = extendLine(l, lp);
            const hi = isHi(l);
            const color = hi ? ACCENT : CONTEXT;
            const focused = interactive && hover === l.index;
            const dim = interactive && hover !== null && !focused;
            const labelOp = clamp01((lp - 0.6) / 0.4);
            // left endpoint + label appear FROM NOTHING as the line starts (the
            // reveal grammar: left point shows first, then the line extends).
            const leftOp = clamp01(lp / 0.18);
            const ly = leftYs.get(l.index) ?? l.y1;
            const ry = rightYs.get(l.index) ?? l.y2;
            return (
              <g
                key={`l${l.index}`}
                opacity={dim ? 0.35 : 1}
                tabIndex={interactive ? 0 : undefined}
                role={interactive ? "img" : undefined}
                aria-label={
                  interactive
                    ? `${l.rawLabel}: ${fmt(l.leftVal)} in ${config.leftPeriod} → ${fmt(l.rightVal)} in ${config.rightPeriod} ${config.unit}`
                    : undefined
                }
                style={interactive ? { cursor: "pointer" } : undefined}
                onMouseEnter={interactive ? () => setHover(l.index) : undefined}
                onMouseLeave={interactive ? () => setHover(null) : undefined}
                onFocus={interactive ? () => setHover(l.index) : undefined}
                onBlur={interactive ? () => setHover(null) : undefined}
              >
                <line
                  className="slope-line"
                  x1={l.x1}
                  y1={l.y1}
                  x2={end.x}
                  y2={end.y}
                  stroke={color}
                  strokeWidth={(hi ? 3 : 2) * sc}
                  opacity={leftOp}
                />
                {/* left endpoint + "name value" — fades in from nothing */}
                <g opacity={leftOp}>
                  <circle
                    cx={l.x1}
                    cy={l.y1}
                    r={(hi ? 4 : 3) * sc}
                    fill={color}
                  />
                  <text
                    x={l.x1 - 10 * sc}
                    y={ly}
                    dy="0.32em"
                    textAnchor="end"
                    fontSize={ts.axis}
                    fontWeight={hi ? 700 : 400}
                    fill={COLORS.ink}
                  >
                    {l.rawLabel} {fmt(l.leftVal)}
                  </text>
                </g>
                {/* right endpoint (appears as the line lands) + value */}
                <g opacity={labelOp}>
                  <circle
                    cx={l.x2}
                    cy={l.y2}
                    r={(hi ? 4 : 3) * sc}
                    fill={color}
                  />
                  <text
                    x={l.x2 + 10 * sc}
                    y={ry}
                    dy="0.32em"
                    textAnchor="start"
                    fontSize={ts.axis}
                    fontWeight={hi ? 700 : 600}
                    fill={COLORS.ink}
                  >
                    {fmt(l.rightVal)}
                  </text>
                </g>
              </g>
            );
          })}
      </g>
    </svg>
  );
}
