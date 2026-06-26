// THE one box plot / box-and-whisker component — a distribution-per-category
// chart: each category's five-number summary (min, Q1, median, Q3, max) drawn as
// a box (the IQR) + a median line + Tukey whiskers (1.5·IQR) + individual outlier
// dots. D3 = math (boxplot-geometry.ts), React = DOM, one master `progress` grows
// each box FROM THE MEDIAN outward. Horizontal (category rows) so long labels fit
// a left gutter. responsive=false = fixed (video/static); responsive=true = flow.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: Okabe-Ito hue + WCAG + title=insight
//     + cited source (ChartFrame + checkBoxplotConformance), scale via resolveFrame,
//     core/text.truncate for the gutter labels.
//   - TYPE-specific: the box+median+whisker+outlier mark, the POSITION value axis
//     (no baseline-0), and the grow-from-median reveal.
import { useState } from "react";
import {
  computeBoxplotLayout,
  growBox,
  type BoxplotData,
  type BoxplotLayout,
} from "./boxplot-geometry";
import { clamp01, easeOutCubic, stagger } from "./core/math";
import { COLORS, FONT, TYPE, OKABE_ITO } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import { resolveFrame } from "./core/format";
import { truncate } from "./core/text";

export interface BoxplotConfig {
  title: string;
  source: { name: string; url: string };
  valueLabel: string; // subtitle / units
  categories: { label: string; values: number[] }[];
}

export interface BoxplotChartProps {
  config: BoxplotConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

const BOX = OKABE_ITO.blue;

const fmt = (v: number) =>
  Number.isInteger(v) ? String(v) : (Math.round(v * 10) / 10).toFixed(1);

export function BoxplotChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: BoxplotChartProps) {
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
    right: 20,
    bottom: 48, // value-axis tick labels, clear of the source line
    left: 120, // category labels in the gutter
  };
  const frame = responsive
    ? { scale: 1, pad: basePad, type: TYPE }
    : resolveFrame(width, height, basePad, scale);
  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;

  const data: BoxplotData = {
    categories: config.categories,
    valueLabel: config.valueLabel,
  };
  const layout = computeBoxplotLayout(data, { width, height, padding });

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <BoxplotSvg
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
      subtitle={config.valueLabel}
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

function BoxplotSvg({
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
  layout: BoxplotLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: BoxplotConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { innerWidth, innerHeight, rows } = layout;
  const n = rows.length;

  const chrome = easeOutCubic(p / 0.18);
  const rowP = (i: number) => stagger(p, i, n, 0.18, 0.5 / n, 0.4);

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
        {/* value gridlines + bottom tick labels (wipe in) */}
        <g opacity={chrome * 0.6}>
          {layout.valueTicks.map((t, i) => (
            <line
              key={`g${i}`}
              x1={t.pos}
              x2={t.pos}
              y1={0}
              y2={innerHeight}
              stroke={COLORS.grid}
              strokeWidth={1}
            />
          ))}
        </g>
        <g opacity={chrome}>
          {layout.valueTicks.map((t, i) => (
            <text
              key={`t${i}`}
              x={t.pos}
              y={innerHeight + 18 * sc}
              textAnchor="middle"
              fontSize={ts.source}
              fill={COLORS.muted}
            >
              {t.label}
            </text>
          ))}
        </g>

        {/* one box per category — grows from the median outward */}
        {rows.map((r) => {
          const rp = rowP(r.index);
          const appear = clamp01(rp * 1.6);
          const g = growBox(r, rp);
          const catOp = clamp01(rp * 1.4);
          const outlierOp = clamp01((rp - 0.6) / 0.4);
          const focused = interactive && hover === r.index;
          const dim = interactive && hover !== null && !focused;
          const half = r.h / 2;
          const capH = r.h * 0.5;
          const boxW = Math.max(0, g.q3x - g.q1x);
          const s5 = r.stats;
          return (
            <g key={`r${r.index}`} opacity={dim ? 0.4 : 1}>
              {/* category label in the left gutter */}
              <text
                x={-12 * sc}
                y={r.y}
                dy="0.32em"
                textAnchor="end"
                fontSize={ts.axis}
                fontWeight={focused ? 700 : 400}
                fill={COLORS.ink}
                opacity={catOp}
              >
                {truncate(r.label, padding.left - 16 * sc, ts.axis)}
              </text>

              {/* marks fade+grow in together (invisible at progress 0) */}
              <g opacity={appear}>
                {/* whisker line + caps */}
                <line
                  x1={g.whiskerLoX}
                  x2={g.whiskerHiX}
                  y1={r.y}
                  y2={r.y}
                  stroke={BOX}
                  strokeWidth={1.5 * sc}
                />
                <line
                  x1={g.whiskerLoX}
                  x2={g.whiskerLoX}
                  y1={r.y - capH / 2}
                  y2={r.y + capH / 2}
                  stroke={BOX}
                  strokeWidth={1.5 * sc}
                />
                <line
                  x1={g.whiskerHiX}
                  x2={g.whiskerHiX}
                  y1={r.y - capH / 2}
                  y2={r.y + capH / 2}
                  stroke={BOX}
                  strokeWidth={1.5 * sc}
                />
                {/* the IQR box */}
                <rect
                  x={g.q1x}
                  y={r.y - half}
                  width={boxW}
                  height={r.h}
                  fill={BOX}
                  fillOpacity={0.18}
                  stroke={BOX}
                  strokeWidth={1.5 * sc}
                />
                {/* the median line — the headline statistic */}
                <line
                  x1={r.medianX}
                  x2={r.medianX}
                  y1={r.y - half}
                  y2={r.y + half}
                  stroke={COLORS.ink}
                  strokeWidth={2.5 * sc}
                />
                {/* individual outliers — plotted as their own dots, and (when
                    there are few) LABELLED with their value so a lone dot reads
                    as a data point, not a glitch. Best practice: label the few
                    that matter; rely on hover when many. The label sits on the
                    side with room so it never overflows the card. */}
                {g.outliers.map((o, oi) => {
                  const labelOutlier = r.outliers.length <= 3;
                  const dotR = 3 * sc;
                  const near = o.x > innerWidth - 30 * sc;
                  return (
                    <g key={`o${oi}`}>
                      <circle
                        cx={o.x}
                        cy={r.y}
                        r={dotR}
                        fill="#fff"
                        stroke={BOX}
                        strokeWidth={1.5 * sc}
                        opacity={outlierOp}
                      />
                      {labelOutlier && (
                        <text
                          x={o.x + (near ? -(dotR + 5 * sc) : dotR + 5 * sc)}
                          y={r.y}
                          dy="0.32em"
                          textAnchor={near ? "end" : "start"}
                          fontSize={ts.source}
                          fontWeight={600}
                          fill={COLORS.ink}
                          paintOrder="stroke"
                          stroke="#fff"
                          strokeWidth={3 * sc}
                          strokeLinejoin="round"
                          opacity={outlierOp}
                        >
                          {fmt(o.value)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>

              {/* interactive hit-target over the whole row band */}
              {interactive && (
                <rect
                  x={0}
                  y={r.y - half - 4 * sc}
                  width={innerWidth}
                  height={r.h + 8 * sc}
                  fill="transparent"
                  tabIndex={0}
                  role="img"
                  aria-label={`${r.label}: median ${fmt(s5.median)}, IQR ${fmt(
                    s5.q1,
                  )} to ${fmt(s5.q3)}, range ${fmt(s5.whiskerLo)} to ${fmt(
                    s5.whiskerHi,
                  )}${s5.outliers.length ? `, ${s5.outliers.length} outlier${s5.outliers.length > 1 ? "s" : ""}` : ""} ${config.valueLabel}`}
                  style={{ cursor: "pointer", outline: "none" }}
                  onMouseEnter={() => setHover(r.index)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(r.index)}
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
  layout: BoxplotLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: BoxplotConfig;
}) {
  const r = layout.rows.find((x) => x.index === hover);
  if (!r) return null;
  const s = r.stats;
  const left = padding.left + r.medianX;
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
      <strong style={{ fontSize: 13 }}>{r.label}</strong>
      <div style={{ fontSize: 12, marginTop: 1 }}>
        median <strong>{fmt(s.median)}</strong> · IQR {fmt(s.q1)}–{fmt(s.q3)}
      </div>
      <div style={{ opacity: 0.7, fontSize: 11 }}>
        range {fmt(s.whiskerLo)}–{fmt(s.whiskerHi)}
        {s.outliers.length
          ? s.outliers.length <= 3
            ? ` · outlier${s.outliers.length > 1 ? "s" : ""} ${s.outliers
                .map(fmt)
                .join(", ")}`
            : ` · ${s.outliers.length} outliers`
          : ""}
      </div>
    </div>
  );
}
