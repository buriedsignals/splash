// THE one diverging-bar component — SIGNED values around a centred zero (the
// deviation family). D3 = math (diverging-bar-geometry.ts), React = DOM, one
// master `progress` grows each bar from the zero line outward. responsive=false =
// fixed layout (video/static); responsive=true = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: baseline-0 (geometry valueDomain
//     includes 0), Okabe-Ito palette + WCAG + title=insight + source (ChartFrame +
//     conformance), scale via resolveFrame, direct labels.
//   - TYPE-specific: the centred-zero geometry, the two-colour-by-sign treatment,
//     signed value labels, and the grow-from-zero-outward reveal.
import { useState } from "react";
import {
  computeDivergingLayout,
  growDivBar,
  type DivergingData,
  type DivergingLayout,
} from "./diverging-bar-geometry";
import { clamp01, easeOutCubic, labelReveal, stagger } from "./core/math";
import { entranceOf } from "./core/chart-walk";
import { walkEntryOrder, type ConfigWalkBeats } from "./core/walk";
import {
  COLORS,
  FONT,
  TYPE,
  DIVERGING_SIGN_COLORS,
  themeColors,
  tooltipBorder,
} from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import type { Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";
import { truncate, leftLabelGutterPx } from "./core/text";

export interface DivergingBarConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  unit: string;
  catField: string;
  valField: string;
  /** newsroom dark theme — flips the chrome furniture (bg/ink/muted). Default light. */
  themeBg?: string;
  /** newsroom house hue (spec `baseColor`): tints the FURNITURE greys (muted/axis/grid) and
   *  the frame's title band toward the house colour. This chart encodes with a fixed
   *  categorical/role palette, so the hue never touches its marks — colouring them with one
   *  hue would collapse the categories it separates. Undefined = untinted (byte-identical). */
  baseColor?: string;
  rows: Record<string, string | number>[];

  /** The journalist's confirmed walk, when this element carries one. Present ⇒ the subjects
   *  enter in ITS order and the video caption shows each step's sentence. Absent ⇒
   *  unchanged, byte for byte. */
  beats?: ConfigWalkBeats;
}

export interface DivergingBarChartProps {
  config: DivergingBarConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

const POS = DIVERGING_SIGN_COLORS[0]; // positive sign
const NEG = DIVERGING_SIGN_COLORS[1]; // negative sign

const signed = (v: number) => (v > 0 ? `+${v}` : `${v}`);

export function DivergingBarChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: DivergingBarChartProps) {
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
  // long name is shown in full instead of truncated to the fixed 124; floor at 124, cap at ~42% of
  // the canvas; an over-cap name is truncated at render.
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
    bottom: 28,
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
  const data: DivergingData = {
    catField: config.catField,
    valField: config.valField,
    rows: config.rows,
  };
  // reserve px for the longest signed value label at each end so it never runs
  // off the edge or into the category gutter (caught at 360px).
  const maxLabelLen = Math.max(
    ...config.rows.map((r) => signed(Number(r[config.valField])).length),
  );
  const labelInset = maxLabelLen * ts.axis * 0.6 + 12 * sc;
  const layout = computeDivergingLayout(
    data,
    { width, height, padding },
    "desc",
    labelInset,
  );

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <DivergingSvg
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

function DivergingSvg({
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
  layout: DivergingLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: DivergingBarConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { innerWidth, innerHeight, zeroX, bars } = layout;
  const n = bars.length;
  const C = themeColors(config.themeBg, config.baseColor);

  const chrome = easeOutCubic(p / 0.18);
  // The entrance schedule is READ from the walk registry, never retyped here: the video
  // caption reads the same one, and two copies of it is a sentence over the wrong subject.
  const E = entranceOf("diverging");
  // The confirmed walk leads: the subjects the journalist named enter first, in their order.
  // Built from the LAID-OUT labels, not from `config.rows` — this geometry sorts, and a
  // permutation over the unsorted rows addresses positions the component never renders.
  // Identity without a walk, so an un-storyboarded chart is byte-identical.
  const entry = walkEntryOrder(
    bars.map((r) => r.rawCat),
    config.beats,
  );
  const barP = (i: number) => stagger(p, entry(i), n, E.start, E.step(n), E.span);

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={config.title}
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* bars + category + signed value labels */}
        {bars.map((b, i) => {
          const g = growDivBar(b, barP(i));
          const fill = b.sign < 0 ? NEG : POS;
          const grown = barP(i);
          // diverging-bar.md rule 4 — EVERY bar carries its signed value label at
          // EVERY frame it is drawn. The label rides the bar's ANIMATED outer tip
          // (from the drawn rect `g`, not the final `b`) so it stays just beyond the
          // growing edge — always OUTSIDE the bar, never clipped — and fades in early
          // with the bar (shared `labelReveal` knob). The old gate (grown-0.65)/0.35
          // hid the last-staggered bars' labels until ~97% growth, so a mid-build
          // still shipped them label-less. At p=1 g's tip === b.xTip (byte-identical).
          const labelOp = labelReveal(grown);
          const catOp = clamp01(grown * 1.4);
          const focused = interactive && hover === i;
          const dim = interactive && hover !== null && !focused;
          // value label at the OUTER tip, on the side the bar points to (animated)
          const gTip = b.sign < 0 ? g.x : g.x + g.w;
          const vx = b.sign < 0 ? gTip - 6 * sc : gTip + 6 * sc;
          const vAnchor = b.sign < 0 ? "end" : "start";
          return (
            <g key={`bar${i}`} opacity={dim ? 0.55 : 1}>
              <rect
                className="diverging-bar"
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
                    ? `${b.rawCat}: ${signed(b.value)} ${config.unit}`
                    : undefined
                }
                style={interactive ? { cursor: "pointer" } : undefined}
                onMouseEnter={interactive ? () => setHover(i) : undefined}
                onMouseLeave={interactive ? () => setHover(null) : undefined}
                onFocus={interactive ? () => setHover(i) : undefined}
                onBlur={interactive ? () => setHover(null) : undefined}
              />
              {/* category label in the left gutter */}
              <text
                x={-12 * sc}
                y={b.y + b.h / 2}
                dy="0.32em"
                textAnchor="end"
                fontSize={ts.axis}
                fill={C.ink}
                opacity={catOp}
              >
                {truncate(b.rawCat, padding.left - 16 * sc, ts.axis)}
              </text>
              {/* signed value label at the outer tip */}
              <text
                x={vx}
                y={b.y + b.h / 2}
                dy="0.32em"
                textAnchor={vAnchor}
                fontSize={ts.axis}
                fontWeight={700}
                fill={C.ink}
                opacity={labelOp}
              >
                {signed(b.value)}
              </text>
            </g>
          );
        })}

        {/* the centred ZERO line — the strongest reference (drawn over the bars) */}
        <line
          x1={zeroX}
          x2={zeroX}
          y1={-4 * sc}
          y2={innerHeight + 4 * sc}
          stroke={C.ink}
          strokeWidth={1.5 * sc}
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
  layout: DivergingLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: DivergingBarConfig;
}) {
  const b = layout.bars[hover];
  const left = padding.left + (b.sign < 0 ? b.xZero : b.xTip) + 8;
  const top = padding.top + b.y - 6;
  return (
    <div
      className="tooltip"
      style={{
        position: "absolute",
        left,
        top,
        transform: "translateY(-100%)",
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
      <strong>{signed(b.value)}</strong>{" "}
      <span style={{ opacity: 0.8 }}>{config.unit}</span>
      <div style={{ opacity: 0.7, fontSize: 11 }}>{b.rawCat}</div>
    </div>
  );
}
