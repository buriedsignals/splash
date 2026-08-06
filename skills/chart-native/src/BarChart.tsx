// THE one bar/column component — sibling of LineChart, same discipline:
// D3 = math (bar-geometry.ts), React = DOM, a single master `progress` drives a
// motion build that is a pure function of progress (shared by static / video).
// responsive=false keeps a fixed absolute layout (video + static, deterministic);
// responsive=true uses a flow layout for the interactive embed.
//
// Motion (per formats/video.md):
//   chrome (value axis + gridlines) wipes in → each bar GROWS from the zero
//   baseline, staggered in reading order → the value label fades/slides as its
//   bar lands. A bar never grows from the middle/top — always from 0.

import { useState } from "react";
import {
  computeBarLayout,
  growBar,
  type BarData,
  type BarDims,
  type Orientation,
  type Sort,
  type BarLayout,
} from "./bar-geometry";
import {
  formatNumber,
  clamp01,
  easeOutCubic,
  labelReveal,
  stagger,
} from "./core/math";
import { walkPositions, BAR_ENTRANCE } from "./core/walk";
import { unitSuffix, type Lang } from "./core/locale";
import {
  COLORS,
  TYPE,
  themeColors,
  type ColorTokens,
  tooltipBorder,
} from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import { resolveFrameWithHeader } from "./core/format";
import {
  textWidth,
  wrapLabel,
  verticalCatLines,
  verticalCatMaxLines,
  bandStepPx,
} from "./core/text";

export interface BarConfig {
  title: string; // = the insight (sentence case)
  source: { name: string; url: string };
  unit: string;
  catField: string;
  valField: string;
  orientation: Orientation;
  sort?: Sort;
  /** optional accent on ONE key bar (≤2 colours, off by default) */
  highlightIndex?: number;
  /** Okabe-Ito hex for the primary series colour. Absent → COLORS.line default. */
  baseColor?: string;
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  /** newsroom dark theme (F2 house `theme: dark`): flips the chrome furniture. */
  themeBg?: string;
  rows: Record<string, string | number>[];
  /** The journalist's confirmed walk (lib/core/production-brief.ts's BriefBeat, threaded whole by
   *  lib/loop/assemble/chart-native.ts). Present ⇒ the bars enter in ITS order rather than in
   *  reading order. Absent ⇒ unchanged, byte for byte.
   *
   *  ★ `text` was NOT declared here when the ordering landed (2026-08-04) — the comment said
   *  "this component needs the ANCHOR only", which was true of ordering and false of the config:
   *  the assembler passes the brief's beats WHOLE, sentences included. The narrow type then
   *  blocked the video from showing the very words the journalist had written. Declared now,
   *  still as a subset of BriefBeat rather than a second copy of it. */
  beats?: readonly {
    x?: string;
    category?: string;
    role?: string;
    text?: string;
  }[];
}

export interface BarChartProps {
  config: BarConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  /** typography/margin scale for non-landscape video canvases (default 1). */
  scale?: number;
  /** embedded = sticky graphic in a chart-scrolly host; suppress own title + source. */
  embedded?: boolean;
}

function paddingFor(orientation: Orientation, responsive: boolean) {
  const top = responsive ? 16 : 64;
  return orientation === "horizontal"
    ? { top, right: 64, bottom: 40, left: 124 } // left: category labels
    : { top, right: 24, bottom: 52, left: 56 }; // bottom: category labels
}

export function BarChart({
  config,
  progress = 1,
  width = 840,
  height = 460,
  interactive = false,
  responsive = false,
  scale = 1,
  embedded = false,
}: BarChartProps) {
  const p = clamp01(progress);
  const basePad = paddingFor(config.orientation, responsive);
  // Scrolly host (embedded): each walked bar's direct value label must read
  // complete on its own, so a SHORT unit is appended ("34,2 %"); the standalone
  // static/video/interactive renders keep bare numbers — their frame states the
  // unit once in the subtitle right above the plot (QA Wave 8, aging scrolly).
  const valueSuffix = embedded ? unitSuffix(config.unit, config.lang) : "";
  // Horizontal category labels sit in the LEFT gutter; the fixed 124px default clips
  // long names ("Administration générale et finances…"). Widen the gutter to fit the
  // LONGEST label (measured at the pre-scale base axis font, since basePad is scaled by
  // resolveFrame afterwards), but never past ~45% of the width — beyond that the
  // truncate() safety net trims with an ellipsis rather than starving the plot. A
  // short-label chart's longest label is < 124px, so max() keeps the 124 default and
  // its layout is unchanged.
  if (config.orientation === "horizontal") {
    const longest = config.rows.reduce(
      (m, r) => Math.max(m, textWidth(String(r[config.catField]), TYPE.axis)),
      0,
    );
    basePad.left = Math.max(basePad.left, Math.min(width * 0.5, longest + 18));
    // The value label rides the bar end into the RIGHT gutter; a unit-suffixed
    // label ("34,2 %") is wider than the bare number the fixed 64px default was
    // sized for. Widen the gutter to the widest suffixed label (measured at the
    // pre-scale base axis font, like the left gutter above). Suffix-less renders
    // keep the 64px default — their layout is unchanged.
    if (valueSuffix) {
      const widestVal = config.rows.reduce(
        (m, r) =>
          Math.max(
            m,
            textWidth(
              formatNumber(Number(r[config.valField]), config.lang) +
                valueSuffix,
              TYPE.axis,
            ),
          ),
        0,
      );
      basePad.right = Math.max(basePad.right, widestVal + 12);
    }
  } else {
    // Vertical columns: a category label that is wider than its (narrow) column
    // WRAPS onto ≤2 lines (verticalCatLines) rather than truncating to a stub — the
    // portrait/9:16 bug. Reserve the extra line(s) in the bottom margin BEFORE the
    // frame is resolved, using the exact band step the layout will use. innerWidth
    // is exact here: resolveFrame only ever adds to top/bottom (tall-canvas
    // centring), never to left/right, so basePad.left/right scale straight through.
    const innerW = width - (basePad.left + basePad.right) * scale;
    const step = bandStepPx(innerW, config.rows.length);
    const lines = verticalCatMaxLines(
      config.rows.map((r) => String(r[config.catField])),
      step,
      TYPE.axis * scale,
    );
    // pre-scale extra rows (resolveFrame multiplies basePad by scale); one label row
    // is already budgeted in paddingFor's bottom, so reserve (lines − 1) more.
    basePad.bottom += (lines - 1) * TYPE.axis * 1.15;
  }
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
  const dims: BarDims = { width, height, padding };
  const data: BarData = {
    catField: config.catField,
    valField: config.valField,
    rows: config.rows,
  };
  const layout = computeBarLayout(data, dims, {
    orientation: config.orientation,
    sort: config.sort,
    lang: config.lang,
  });

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <BarSvg
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
      valueSuffix={valueSuffix}
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
      embedded={embedded}
      lang={config.lang}
      themeBg={config.themeBg}
      baseColor={config.baseColor}
    >
      {svg}
    </ChartFrame>
  );
}

function barColor(
  i: number,
  C: ColorTokens,
  highlight?: number,
  baseColor?: string,
): string {
  const primary = baseColor ?? C.line;
  if (highlight === undefined) return primary;
  // The highlight NEVER overrides the subject hue: the highlighted bar keeps the
  // PRIMARY (the spec's subject-fit baseColor, or the default), and the emphasis
  // comes from MUTING the context bars. Hardcoding an accent here discarded the
  // approved baseColor — a tourism story's #CC79A7 shipped orange (QA Wave 8).
  return i === highlight ? primary : C.muted;
}

function BarSvg({
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
  valueSuffix,
}: {
  layout: BarLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: BarConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
  /** short-unit suffix appended to each direct value label ("" outside the
   *  embedded scrolly host / for long units) — see BarChart body. */
  valueSuffix: string;
}) {
  const C = themeColors(config.themeBg, config.baseColor);
  const { innerWidth, innerHeight, orientation, bars } = layout;
  const horizontal = orientation === "horizontal";
  const n = bars.length;
  // vertical band step (centre-to-centre) — the wrap budget for a centered category
  // label. Read from the laid-out bars so it matches the geometry exactly.
  const bandStep = n > 1 ? bars[1].x - bars[0].x : innerWidth;

  // chrome wipe (gridlines + baseline) over the first ~18% of the timeline
  const chrome = easeOutCubic(p / 0.18);
  // Each bar grows from the baseline, staggered — in READING order by default, and in the
  // JOURNALIST'S order when they confirmed a walk (sub-project ④, chart track). Before this,
  // a bar video ignored a walk the journalist had written and validated: the plan reached the
  // config and changed nothing on screen, one engine over from the same defect in map-native's
  // reveals. With no walk `walkPositions` returns the index itself, so a chart nobody
  // storyboarded is byte-identical to before.
  const entryOrder = walkPositions(
    config.rows.map((r) => String(r[config.catField])),
    config.beats,
  );
  const barP = (i: number) =>
    stagger(
      p,
      entryOrder[i] ?? i,
      n,
      BAR_ENTRANCE.start,
      BAR_ENTRANCE.step(n),
      BAR_ENTRANCE.span,
    );

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={config.title}
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* value-axis gridlines (wipe in) */}
        <g opacity={chrome}>
          {layout.valueTicks.map((t, i) =>
            horizontal ? (
              <line
                key={`g${i}`}
                x1={t.pos}
                x2={t.pos}
                y1={0}
                y2={innerHeight}
                stroke={C.grid}
                strokeWidth={1}
              />
            ) : (
              <line
                key={`g${i}`}
                x1={0}
                x2={innerWidth}
                y1={t.pos}
                y2={t.pos}
                stroke={C.grid}
                strokeWidth={1}
              />
            ),
          )}
          {/* value-axis tick labels — horizontal bars drop them (every bar has a
              direct value label → axis is redundant, bar.md rule 4); vertical
              keeps the left y-axis labels (conventional, no source collision). */}
          {layout.valueTicks.map((t, i) =>
            horizontal ? null : (
              <text
                key={`vt${i}`}
                x={-10 * sc}
                y={t.pos}
                dy="0.32em"
                textAnchor="end"
                fontSize={ts.axis}
                fill={C.muted}
              >
                {t.label}
              </text>
            ),
          )}
        </g>

        {/* bars + category labels + value labels */}
        {bars.map((b, i) => {
          const g = growBar(b, barP(i), orientation);
          const fill = barColor(i, C, config.highlightIndex, config.baseColor);
          const grown = barP(i);
          // bar.md rule 4 — EVERY bar carries its direct value label, at EVERY frame it
          // is drawn (not just the p=1 hold). The label rides the bar's ANIMATED end
          // (below) and fades in with the bar's own growth, reaching full opacity once
          // the bar is meaningfully present (~15% grown). The old gate (grown-0.65)/0.35
          // hid the last-staggered smallest bars' labels until ~97% growth, so a mid-
          // build video still (frame 140/240 ≈ progress 0.64) shipped the two smallest
          // bars label-less. Full opacity at progress 1 is unchanged. The ramp is the
          // shared bar-family knob (core/math `labelReveal`) so every type inherits it.
          const labelOp = labelReveal(grown);
          const catOp = clamp01(grown * 1.6);
          // category label position (always at the bar's band centre)
          const cat = horizontal
            ? {
                x: -10 * sc,
                y: b.y + b.h / 2,
                anchor: "end" as const,
                dy: "0.32em",
              }
            : {
                x: b.x + b.w / 2,
                y: innerHeight + 20 * sc,
                anchor: "middle" as const,
                dy: "0",
              };
          // category label: horizontal labels live in the (widened) left gutter and
          // WRAP onto ≤2 lines if the longest still exceeds the capped gutter — never a
          // single clipped line. Vertical labels WRAP onto ≤2 lines to the band step
          // (verticalCatLines) so a long name under a narrow column is never truncated
          // to a stub on a portrait/9:16 canvas — the same never-truncate rule.
          const catLines = horizontal
            ? wrapLabel(String(b.rawCat), padding.left - 14 * sc, ts.axis, 2)
            : verticalCatLines(String(b.rawCat), bandStep, ts.axis);
          const catLineH = ts.axis * 1.15;
          // horizontal: centre the wrapped block on the band. vertical: stack DOWN
          // from the first row (just below the axis).
          const catY0 = horizontal
            ? cat.y - ((catLines.length - 1) * catLineH) / 2
            : cat.y;
          // value label at the ANIMATED end of the bar (rides the growing edge, so it is
          // always OUTSIDE the bar — never clipped inside a too-short bar — and "rises as
          // its bar lands"). Uses `g` (the drawn rect at this frame), not the final `b`;
          // at progress 1, g === b, so the static/hold layout is unchanged.
          const val = horizontal
            ? {
                x: g.x + g.w + 6 * sc,
                y: b.y + b.h / 2,
                anchor: "start" as const,
                dy: "0.32em",
              }
            : {
                x: b.x + b.w / 2,
                y: g.y - 6 * sc,
                anchor: "middle" as const,
                dy: "0",
              };

          return (
            <g key={`bar${i}`}>
              <rect
                className="bar"
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
                    ? `${b.rawCat}: ${formatNumber(b.rawVal, config.lang)} ${config.unit}`
                    : undefined
                }
                style={interactive ? { cursor: "pointer" } : undefined}
                onMouseEnter={interactive ? () => setHover(i) : undefined}
                onMouseLeave={interactive ? () => setHover(null) : undefined}
                onFocus={interactive ? () => setHover(i) : undefined}
                onBlur={interactive ? () => setHover(null) : undefined}
              />
              {catLines.map((ln, li) => (
                <text
                  key={`cat${i}-${li}`}
                  className="cat-label"
                  x={cat.x}
                  y={catY0 + li * catLineH}
                  dy={horizontal ? "0.32em" : cat.dy}
                  textAnchor={cat.anchor}
                  fontSize={ts.axis}
                  fill={C.ink}
                  opacity={catOp}
                >
                  {ln}
                </text>
              ))}
              <text
                x={val.x}
                y={val.y}
                dy={val.dy}
                textAnchor={val.anchor}
                fontSize={ts.axis}
                fontWeight={600}
                // the label carries the VALUE (always ink for WCAG contrast); the
                // MARK carries the hue. Emphasis on a highlighted bar stays on the
                // bar fill + the bold weight, never on a low-contrast text colour.
                fill={C.ink}
                opacity={labelOp}
              >
                {formatNumber(b.rawVal, config.lang) + valueSuffix}
              </text>
            </g>
          );
        })}

        {/* zero baseline (drawn last, over the gridlines) */}
        <g opacity={chrome}>
          {horizontal ? (
            <line
              x1={bars[0]?.base ?? 0}
              x2={bars[0]?.base ?? 0}
              y1={0}
              y2={innerHeight}
              stroke={C.axis}
              strokeWidth={1}
            />
          ) : (
            <line
              x1={0}
              x2={innerWidth}
              y1={bars[0]?.base ?? innerHeight}
              y2={bars[0]?.base ?? innerHeight}
              stroke={C.axis}
              strokeWidth={1}
            />
          )}
        </g>
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
  layout: BarLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: BarConfig;
}) {
  const b = layout.bars[hover];
  const horizontal = layout.orientation === "horizontal";
  const left = padding.left + (horizontal ? b.x + b.w : b.x + b.w / 2) + 12;
  const top = padding.top + (horizontal ? b.y + b.h / 2 : b.y) - 8;
  return (
    <div
      className="tooltip"
      style={{
        position: "absolute",
        left,
        top,
        background: COLORS.ink,
        border: tooltipBorder(config.themeBg),
        color: "#fff",
        padding: "6px 10px",
        borderRadius: 6,
        fontSize: 13,
        whiteSpace: "nowrap",
        pointerEvents: "none",
        transform: "translateY(-100%)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <strong>{formatNumber(b.rawVal, config.lang)}</strong>{" "}
      <span style={{ opacity: 0.8 }}>{config.unit}</span>
      <div style={{ opacity: 0.7, fontSize: 11 }}>{String(b.rawCat)}</div>
    </div>
  );
}
