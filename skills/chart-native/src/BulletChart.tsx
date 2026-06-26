// THE one bullet component — a measure vs a target on a backdrop of qualitative
// bands (the accountability "did it hit the target" chart). D3 = math
// (bullet-geometry.ts), React = DOM, one master `progress` grows each measure.
// responsive=false = fixed layout (video/static); responsive=true = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: baseline-0 (measure from zero),
//     Okabe-Ito measure colour + WCAG + title=insight + source (ChartFrame +
//     conformance), scale via resolveFrame, direct value labels.
//   - TYPE-specific: the qualitative bands (neutral greys — context, not data),
//     the target marker, per-row normalisation, and the grow-from-zero reveal.
//     Editorial touch: the measure is coloured by whether it HIT its target.
import { useState } from "react";
import {
  computeBulletLayout,
  growMeasure,
  type BulletData,
  type BulletLayout,
} from "./bullet-geometry";
import { clamp01, easeOutCubic, stagger } from "./core/math";
import { COLORS, FONT, TYPE, OKABE_ITO } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import { resolveFrame } from "./core/format";
import { truncate } from "./core/text";

export interface BulletConfig {
  title: string;
  source: { name: string; url: string };
  unit: string;
  rows: {
    label: string;
    unit: string;
    value: number;
    target: number;
    max: number;
    bands: number[];
  }[];
}

export interface BulletChartProps {
  config: BulletConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

const HIT = OKABE_ITO.blue; // met the target
const MISS = OKABE_ITO.vermillion; // missed the target

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

export function BulletChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: BulletChartProps) {
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
    top: responsive ? 16 : 53 + titleLines * 27,
    right: 18,
    bottom: 16,
    left: 150, // KPI labels + units in the gutter
  };
  const frame = responsive
    ? { scale: 1, pad: basePad, type: TYPE }
    : resolveFrame(width, height, basePad, scale);
  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;
  const data: BulletData = { rows: config.rows };
  const maxValLen = Math.max(...config.rows.map((r) => fmt(r.value).length));
  const labelInset = maxValLen * ts.axis * 0.6 + 14 * sc;
  const layout = computeBulletLayout(
    data,
    { width, height, padding },
    labelInset,
  );

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <BulletSvg
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

function BulletSvg({
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
  layout: BulletLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: BulletConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { rows } = layout;
  const n = rows.length;

  const chrome = easeOutCubic(p / 0.18);
  const rowP = (i: number) => stagger(p, i, n, 0.18, 0.5 / n, 0.35);

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
        {rows.map((r, i) => {
          const rp = rowP(i);
          const mEnd = growMeasure(r, rp);
          const color = r.hitTarget ? HIT : MISS;
          const labelOp = clamp01((rp - 0.6) / 0.4);
          const focused = interactive && hover === i;
          const dim = interactive && hover !== null && !focused;
          return (
            <g
              key={`r${i}`}
              opacity={dim ? 0.5 : 1}
              tabIndex={interactive ? 0 : undefined}
              role={interactive ? "img" : undefined}
              aria-label={
                interactive
                  ? `${r.label}: ${fmt(r.value)} ${r.unit}, target ${fmt(r.target)} — ${r.hitTarget ? "met" : "missed"}`
                  : undefined
              }
              style={interactive ? { cursor: "pointer" } : undefined}
              onMouseEnter={interactive ? () => setHover(i) : undefined}
              onMouseLeave={interactive ? () => setHover(null) : undefined}
              onFocus={interactive ? () => setHover(i) : undefined}
              onBlur={interactive ? () => setHover(null) : undefined}
            >
              {/* qualitative bands (neutral context, fade in with chrome) */}
              <g opacity={chrome}>
                {r.bands.map((b, bi) => (
                  <rect
                    key={`band${bi}`}
                    x={b.x}
                    y={r.y}
                    width={b.w}
                    height={r.h}
                    fill={b.shade}
                  />
                ))}
              </g>

              {/* measure bar (grows from zero) */}
              <rect
                className="bullet-measure"
                x={0}
                y={r.measureY}
                width={mEnd}
                height={r.measureH}
                fill={color}
                rx={1}
              />

              {/* target marker (already there to be measured against) */}
              <line
                x1={r.targetX}
                x2={r.targetX}
                y1={r.y + r.h * 0.12}
                y2={r.y + r.h * 0.88}
                stroke={COLORS.ink}
                strokeWidth={2.5 * sc}
                opacity={chrome}
              />

              {/* KPI label + unit in the gutter */}
              <text
                x={-12 * sc}
                y={r.y + r.h * 0.4}
                dy="0.32em"
                textAnchor="end"
                fontSize={ts.axis}
                fontWeight={700}
                fill={COLORS.ink}
                opacity={chrome}
              >
                {truncate(r.label, padding.left - 16 * sc, ts.axis)}
              </text>
              <text
                x={-12 * sc}
                y={r.y + r.h * 0.4 + 15 * sc}
                dy="0.32em"
                textAnchor="end"
                fontSize={ts.source}
                fill={COLORS.muted}
                opacity={chrome}
              >
                {truncate(r.unit, padding.left - 16 * sc, ts.source)}
              </text>

              {/* measure value label at the bar end — white halo so it stays
                  legible even when it sits right over the target tick */}
              <text
                x={r.valueX + 7 * sc}
                y={r.measureY + r.measureH / 2}
                dy="0.32em"
                textAnchor="start"
                fontSize={ts.axis}
                fontWeight={700}
                fill={color}
                stroke="#fff"
                strokeWidth={3 * sc}
                style={{ paintOrder: "stroke" }}
                opacity={labelOp}
              >
                {fmt(r.value)}
              </text>
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
  layout: BulletLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: BulletConfig;
}) {
  const r = layout.rows[hover];
  const left = padding.left + r.targetX;
  const top = padding.top + r.y - 4;
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
      <strong>{fmt(r.value)}</strong>{" "}
      <span style={{ opacity: 0.8 }}>{r.unit}</span>
      <div style={{ opacity: 0.7, fontSize: 11 }}>
        {r.label} · target {fmt(r.target)} · {r.hitTarget ? "met ✓" : "missed"}
      </div>
    </div>
  );
}
