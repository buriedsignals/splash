// THE one lollipop / dot-plot component — a ranking/magnitude chart with far less
// ink than a bar: a stem from the zero baseline to a dot. D3 = math
// (lollipop-geometry.ts), React = DOM, one master `progress` grows each stem.
// responsive=false = fixed layout (video/static); responsive=true = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: baseline-0 (geometry valueDomain),
//     Okabe-Ito palette + WCAG + title=insight + source (ChartFrame + the SHARED
//     checkBarConformance — a lollipop is a bar variant), scale via resolveFrame,
//     direct labels.
//   - TYPE-specific: the stem+dot mark and the grow-from-baseline reveal; one
//     optional accent on the headline row.
import { useState } from "react";
import {
  computeLollipopLayout,
  growStem,
  type LollipopData,
  type LollipopLayout,
} from "./lollipop-geometry";
import { clamp01, easeOutCubic, labelReveal, stagger } from "./core/math";
import {
  COLORS,
  themeColors,
  FONT,
  TYPE,
  OKABE_ITO,
  tooltipBorder,
} from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import { localizeValueLabel, type Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";
import { truncate, leftLabelGutterPx } from "./core/text";

export interface LollipopConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  /** newsroom dark theme — flips the chart chrome to the dark furniture set. */
  themeBg?: string;
  unit: string;
  catField: string;
  valField: string;
  /** optional accent on ONE key row (the headline subject) */
  highlightLabel?: string;
  /** subject-fit hue for the neutral stems/dots (the highlight keeps its vermillion
   *  accent). Absent → the OKABE_ITO.blue default. */
  baseColor?: string;
  /** subject-fit hue for the highlighted row. Absent → the OKABE_ITO.vermillion default. */
  accent?: string;
  rows: Record<string, string | number>[];
}

export interface LollipopChartProps {
  config: LollipopConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

const BASE = OKABE_ITO.blue; // neutral series colour
const ACCENT = OKABE_ITO.vermillion; // the one highlight

export function LollipopChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: LollipopChartProps) {
  // integer stays bare ("52", not "52.0"), a decimal keeps one place, then both
  // take config.lang's separators — the ONE expression lives in core/locale.
  const fmt = (v: number) => localizeValueLabel(v, config.lang);
  const p = clamp01(progress);
  const s = responsive ? 1 : scale;
  const charsPerLine = Math.max(
    8,
    Math.floor((width - 48 * s) / (TYPE.title * s * 0.52)),
  );
  const titleLines = responsive
    ? Math.max(1, Math.ceil(config.title.length / Math.floor(width / 11)))
    : Math.max(1, Math.ceil(config.title.length / charsPerLine));
  // Size the left gutter to the WIDEST category name (leftLabelGutterPx, like slope/dumbbell) so a
  // long name is shown in full instead of truncated to the fixed 124; floor at 124 (short-label
  // charts keep their layout), cap at ~42% of the canvas; an over-cap name is truncated at render.
  const catLabels = config.rows.map((r) => String(r[config.catField]));
  const PAD_LEFT = leftLabelGutterPx(catLabels, TYPE.axis, {
    gapPx: 16,
    floorPx: 124,
    width,
    scale: s,
  });
  const basePad = {
    top: responsive ? 16 : 53 + titleLines * 27,
    right: 18,
    bottom: 24,
    left: PAD_LEFT, // category labels — measured to the widest, floored at 124
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
  const data: LollipopData = {
    catField: config.catField,
    valField: config.valField,
    rows: config.rows,
  };
  // reserve px for the value label at the rightmost dot so it never overflows.
  const maxLabelLen = Math.max(
    ...config.rows.map((r) => fmt(Number(r[config.valField])).length),
  );
  const labelInset = maxLabelLen * ts.axis * 0.6 + 16 * sc;
  const layout = computeLollipopLayout(
    data,
    { width, height, padding },
    "desc",
    labelInset,
  );

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <LollipopSvg
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

function LollipopSvg({
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
  layout: LollipopLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: LollipopConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  // integer stays bare ("52", not "52.0"), a decimal keeps one place, then both
  // take config.lang's separators — the ONE expression lives in core/locale.
  const fmt = (v: number) => localizeValueLabel(v, config.lang);
  const C = themeColors(config.themeBg, config.baseColor);
  const { innerWidth, innerHeight, rows } = layout;
  const n = rows.length;

  const chrome = easeOutCubic(p / 0.18);
  const rowP = (i: number) => stagger(p, i, n, 0.18, 0.5 / n, 0.35);
  const isHi = (r: { rawCat: string }) =>
    config.highlightLabel != null && r.rawCat === config.highlightLabel;

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={config.title}
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* light value gridlines (wipe in) */}
        <g opacity={chrome * 0.6}>
          {layout.valueTicks.map((t, i) => (
            <line
              key={`g${i}`}
              x1={t.pos}
              x2={t.pos}
              y1={0}
              y2={innerHeight}
              stroke={C.grid}
              strokeWidth={1}
            />
          ))}
        </g>

        {/* rows: stem + dot + category + value label */}
        {rows.map((r) => {
          const rp = rowP(r.index);
          const endX = growStem(r, rp);
          const hi = isHi(r);
          // the neutral stems/dots honour the subject-fit hue; the highlighted row
          // keeps the vermillion accent. Absent baseColor → the OKABE_ITO.blue default.
          const color = hi
            ? (config.accent ?? ACCENT)
            : (config.baseColor ?? BASE);
          // lollipop.md rule 4 — EVERY dot carries its value label at EVERY frame. It
          // fades in early with the stem (shared `labelReveal` knob) and rides the
          // stem's ANIMATED head `endX` (right of the dot, always outside) so it never
          // floats detached at the final dot while the stem is still short. The old
          // gate (rp-0.6)/0.4 hid the last-staggered rows' labels mid-build. At p=1
          // endX === r.dotX (byte-identical).
          const labelOp = labelReveal(rp);
          const catOp = clamp01(rp * 1.4);
          // the dot pops in as the stem lands — invisible at the start (otherwise
          // every dot sits visible on the baseline before its row animates).
          const dotOp = clamp01((rp - 0.5) / 0.35);
          const focused = interactive && hover === r.index;
          const dim = interactive && hover !== null && !focused;
          const dotR = (hi ? 7 : 6) * sc;
          return (
            <g
              key={`r${r.index}`}
              opacity={dim ? 0.4 : 1}
              tabIndex={interactive ? 0 : undefined}
              role={interactive ? "img" : undefined}
              aria-label={
                interactive
                  ? `${r.rawCat}: ${fmt(r.value)} ${config.unit}`
                  : undefined
              }
              style={interactive ? { cursor: "pointer" } : undefined}
              onMouseEnter={interactive ? () => setHover(r.index) : undefined}
              onMouseLeave={interactive ? () => setHover(null) : undefined}
              onFocus={interactive ? () => setHover(r.index) : undefined}
              onBlur={interactive ? () => setHover(null) : undefined}
            >
              {/* category label in the left gutter */}
              <text
                x={-12 * sc}
                y={r.y}
                dy="0.32em"
                textAnchor="end"
                fontSize={ts.axis}
                fontWeight={hi ? 700 : 400}
                fill={C.ink}
                opacity={catOp}
              >
                {truncate(r.rawCat, padding.left - 16 * sc, ts.axis)}
              </text>
              {/* stem */}
              <line
                className="lollipop-stem"
                x1={r.baseX}
                y1={r.y}
                x2={endX}
                y2={r.y}
                stroke={color}
                strokeWidth={(hi ? 3 : 2) * sc}
                opacity={0.55}
              />
              {/* dot — pops in at the stem head, invisible until the stem lands */}
              <circle
                className="lollipop-dot"
                cx={endX}
                cy={r.y}
                r={dotR}
                fill={color}
                opacity={dotOp}
              />
              {/* value label at the dot — rides the stem's animated head */}
              <text
                x={endX + dotR + 6 * sc}
                y={r.y}
                dy="0.32em"
                textAnchor="start"
                fontSize={ts.axis}
                fontWeight={700}
                fill={C.ink}
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
  layout: LollipopLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: LollipopConfig;
}) {
  const fmt = (v: number) => localizeValueLabel(v, config.lang);
  const r = layout.rows.find((x) => x.index === hover);
  if (!r) return null;
  const left = padding.left + r.dotX;
  const top = padding.top + r.y - 10;
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
        fontSize: 13,
        whiteSpace: "nowrap",
        pointerEvents: "none",
        fontFamily: FONT,
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <strong>{fmt(r.value)}</strong>{" "}
      <span style={{ opacity: 0.8 }}>{config.unit}</span>
      <div style={{ opacity: 0.7, fontSize: 11 }}>{r.rawCat}</div>
    </div>
  );
}
