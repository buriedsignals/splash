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
import {
  formatNumber,
  clamp01,
  easeOutCubic,
  labelReveal,
  stagger,
} from "./core/math";
import {
  COLORS,
  FONT,
  TYPE,
  themeColors,
  themeWaterfallColors,
} from "./core/tokens";
import {
  truncate,
  rotatedLabelDescentPx,
  rotatedLabelFitPx,
  ROTATED_TICK_MAX_CHARS,
  ROTATED_TICK_ANGLE_DEG,
} from "./core/text";
import { ChartFrame } from "./core/ChartFrame";
import type { Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";

export interface WaterfallConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  unit: string;
  rows: { label: string; value: number; total?: boolean }[];
  /** newsroom dark theme (F2 house `theme: dark`) — flips the furniture + swaps the
   *  role palette's black TOTAL for a light neutral (themeWaterfallColors). */
  dark?: boolean;
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

// role palette order: [increase, decrease, total]. Resolved per-render via
// themeWaterfallColors(config.dark) so the black TOTAL flips to a light neutral on
// the dark theme (it would vanish on the near-black bg otherwise).

// Rotated (−40°) category-label furniture, shared by the margin reservation
// (WaterfallChart) and the per-tick truncation (WaterfallSvg) so the two can't
// drift. UNSCALED (px at scale 1); resolveFrame scales the reserved margin, and the
// SVG re-applies `sc`.
const ROTATED_TICK_OFFSET = 16; // the rotate pivot sits this far below the plot
const ROTATED_SOURCE_CLEARANCE = 12 + TYPE.source + 12; // source pad + font + gap
// The rotated labels never eat more than this fraction of the canvas height — so a
// long name shortens the LABEL (via truncation) instead of collapsing the PLOT. On
// a short landscape canvas (article-web renders at 600×338) this caps the label; on
// a tall portrait canvas it is slack and the full ROTATED_TICK_MAX_CHARS cap wins.
const MAX_ROTATED_BOTTOM_FRAC = 0.38;
const SAFE_LEFT = 4; // keep a rotated label's START ≥ this many px from the edge
// Rotated category labels render a step SMALLER than the axis font: on a short
// landscape canvas the vertical budget is tight, and a smaller glyph fits more
// characters in the same descent — enough to tell common-prefix names apart
// ("Ministère de l'Éduc…" vs "…l'Écon…") instead of an identical "Ministère d…".
const ROTATED_LABEL_FONT_SCALE = 0.8;

const barColor = (
  b: { isTotal: boolean; sign: 1 | -1 },
  roleColors: readonly string[],
) => (b.isTotal ? roleColors[2] : b.sign < 0 ? roleColors[1] : roleColors[0]);
const labelOf = (b: { isTotal: boolean; value: number }, lang?: Lang) =>
  b.isTotal
    ? formatNumber(b.value, lang)
    : `${b.value > 0 ? "+" : "−"}${formatNumber(Math.abs(b.value), lang)}`;

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
  // Bottom room for the −40° rotated category labels so they clear the source line.
  // basePad is UNSCALED (resolveFrame scales it), so measure with the unscaled axis
  // font. The ideal reservation fits a ROTATED_TICK_MAX_CHARS-capped label, but is
  // itself CAPPED at MAX_ROTATED_BOTTOM_FRAC of the canvas so a long name shortens
  // the label (WaterfallSvg truncates to whatever descent the margin actually gives)
  // rather than collapsing the plot. Source clearance is guaranteed either way.
  const rotatedLabelPxEst =
    Math.min(maxCatLen, ROTATED_TICK_MAX_CHARS) *
    TYPE.axis *
    ROTATED_LABEL_FONT_SCALE *
    0.6;
  const idealRotatedBottom =
    ROTATED_TICK_OFFSET +
    rotatedLabelDescentPx(rotatedLabelPxEst) +
    ROTATED_SOURCE_CLEARANCE;
  const rotatedBottom = Math.ceil(
    Math.min(idealRotatedBottom, height * MAX_ROTATED_BOTTOM_FRAC),
  );
  const basePad = {
    // +20 headroom (fixed) so a value label above the tallest bar clears the
    // absolute subtitle.
    top: responsive ? 16 : 53 + titleLines * 27 + 20,
    right: 18,
    bottom: narrowEst ? rotatedBottom : 72, // rotated labels clear the source
    left: 48, // count axis
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
    // Waterfall already reserves the source band inside basePad.bottom
    // (ROTATED_SOURCE_CLEARANCE), and derives its rotated-label descent budget from
    // that reservation — opt out of the frame's reserve so it is not counted twice.
    false,
  );
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
      lang={config.lang}
      dark={!!config.dark}
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
  const C = themeColors(!!config.dark);
  const roleColors = themeWaterfallColors(!!config.dark);

  const chrome = easeOutCubic(p / 0.18);
  const barP = (i: number) => stagger(p, i, n, 0.18, 0.5 / n, 0.35);

  // narrow bars (mobile / portrait): category + value labels are wider than the
  // bar → rotate the categories and drop value labels INSIDE the bar, vertical.
  const bw = bars[0]?.w ?? 0;
  const maxCatLen = Math.max(...bars.map((b) => b.label.length));
  const narrow = maxCatLen * ts.axis * 0.6 > bw;
  // Rotated category labels are truncated (ellipsis at END → readable START kept) to
  // the SMALLEST of three budgets, so a long name never runs off the left edge and
  // never collides with the source:
  //   • readability cap  — ROTATED_TICK_MAX_CHARS.
  //   • horizontal (per-tick) — keep the far START end at x ≥ SAFE_LEFT.
  //   • vertical — the label's descent must fit the reserved bottom margin ABOVE the
  //     source. Derived from the actual scaled padding.bottom so it self-matches
  //     whatever WaterfallChart reserved (which the fraction cap may have trimmed).
  const catFont = ts.axis * ROTATED_LABEL_FONT_SCALE;
  const rotatedMaxPx = ROTATED_TICK_MAX_CHARS * catFont * 0.6;
  const rotatedDescentBudget = Math.max(
    0,
    padding.bottom - (ROTATED_TICK_OFFSET + ROTATED_SOURCE_CLEARANCE) * sc,
  );
  const rotatedVerticalMaxPx =
    rotatedDescentBudget / Math.sin((ROTATED_TICK_ANGLE_DEG * Math.PI) / 180);

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={config.title}
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
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
                stroke={C.grid}
                strokeWidth={1}
              />
              <text
                x={-8 * sc}
                y={t.pos}
                dy="0.32em"
                textAnchor="end"
                fontSize={ts.axis}
                fill={C.muted}
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
              stroke={C.muted}
              strokeWidth={1}
              strokeDasharray={`${3 * sc} ${3 * sc}`}
              opacity={op * 0.8}
            />
          );
        })}

        {/* floating bars + category + signed value labels */}
        {bars.map((b, i) => {
          const g = growWaterfallBar(b, barP(i), 2.5 * sc);
          const fill = barColor(b, roleColors);
          const grown = barP(i);
          // waterfall.md rule 4 — EVERY step carries its value label at EVERY frame.
          // It fades in early with the bar (shared `labelReveal` knob) and rides the
          // bar's ANIMATED top so it sits just above the growing edge, never floating
          // detached above a stub. The old gate (grown-0.6)/0.4 hid the last-staggered
          // steps' labels mid-build. `animTop` converges to the true top at p=1, so the
          // static/hold render is byte-identical.
          const labelOp = labelReveal(grown);
          const catOp = clamp01(grown * 1.5);
          const focused = interactive && hover === i;
          const dim = interactive && hover !== null && !focused;
          // final top — drives the vertical/horizontal label DECISION (progress-independent)
          const topY = Math.min(b.startY, b.endY);
          // animated top — the label rides this (= topY at p=1)
          const animTop = Math.min(
            b.startY,
            b.startY + (b.endY - b.startY) * grown,
          );
          // a vertical above-bar label (kept vertical so narrow neighbouring bars
          // don't collide horizontally) only fits if there is enough room ABOVE
          // the bar top to clear the frame/title; otherwise fall back to the
          // OUTSIDE-above horizontal ink label (tiny steps, or tall bars with
          // little headroom above them).
          const valLabelW =
            labelOf(b, config.lang).length * ts.axis * 0.9 * 0.6;
          const labelVertical = narrow && topY > valLabelW + 10 * sc;
          // rotated category label truncated to fit its diagonal footprint (see above)
          const catTickX = padding.left + b.x + b.w / 2;
          const catLabel = narrow
            ? truncate(
                b.label,
                Math.min(
                  rotatedMaxPx,
                  rotatedVerticalMaxPx,
                  rotatedLabelFitPx(catTickX, SAFE_LEFT * sc),
                ),
                catFont,
              )
            : b.label;
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
                    ? `${b.label}: ${labelOf(b, config.lang)} ${config.unit}`
                    : undefined
                }
                style={interactive ? { cursor: "pointer" } : undefined}
                onMouseEnter={interactive ? () => setHover(i) : undefined}
                onMouseLeave={interactive ? () => setHover(null) : undefined}
                onFocus={interactive ? () => setHover(i) : undefined}
                onBlur={interactive ? () => setHover(null) : undefined}
              />
              {/* signed value label — VERTICAL, on the white paper ABOVE the bar,
                  only when narrow AND there's room to clear the frame; otherwise
                  the plain horizontal ink label above it (handles tiny steps and
                  tall bars). Always ink: the label carries the value, the mark
                  carries the hue (WCAG — white-on-vermillion inside the bar was
                  3.87:1, below 4.5:1). */}
              {labelVertical ? (
                <text
                  transform={`rotate(-90 ${b.x + b.w / 2} ${animTop - 6 * sc})`}
                  x={b.x + b.w / 2}
                  y={animTop - 6 * sc}
                  textAnchor="start"
                  fontSize={ts.axis * 0.9}
                  fontWeight={700}
                  fill={C.ink}
                  opacity={labelOp}
                >
                  {labelOf(b, config.lang)}
                </text>
              ) : (
                <text
                  x={b.x + b.w / 2}
                  y={animTop - 6 * sc}
                  textAnchor="middle"
                  fontSize={ts.axis}
                  fontWeight={700}
                  fill={C.ink}
                  opacity={labelOp}
                >
                  {labelOf(b, config.lang)}
                </text>
              )}
              {/* category label under the plot — rotated when bars are narrow. The
                  label is END-anchored and truncated (readable START kept) to fit the
                  reserved bottom margin, so it clears the source and never clips the
                  left edge; a step-smaller font fits more of a long name. */}
              {narrow ? (
                <text
                  transform={`rotate(-${ROTATED_TICK_ANGLE_DEG} ${b.x + b.w / 2} ${innerHeight + ROTATED_TICK_OFFSET * sc})`}
                  x={b.x + b.w / 2}
                  y={innerHeight + ROTATED_TICK_OFFSET * sc}
                  textAnchor="end"
                  fontSize={catFont}
                  fill={C.ink}
                  opacity={catOp}
                >
                  {catLabel}
                </text>
              ) : (
                <text
                  x={b.x + b.w / 2}
                  y={innerHeight + 20 * sc}
                  textAnchor="middle"
                  fontSize={ts.axis}
                  fill={C.ink}
                  opacity={catOp}
                >
                  {catLabel}
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
          stroke={C.axis}
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
      <strong>{labelOf(b, config.lang)}</strong>{" "}
      <span style={{ opacity: 0.8 }}>{config.unit}</span>
      <div style={{ opacity: 0.7, fontSize: 11 }}>
        {b.label}
        {b.isTotal ? "" : ` · running ${formatNumber(b.endVal, config.lang)}`}
      </div>
    </div>
  );
}
