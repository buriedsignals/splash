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
  spreadLabelsBounded,
  type SlopeData,
  type SlopeLayout,
} from "./slope-geometry";
import { clamp01, easeOutCubic, stagger } from "./core/math";
import {
  COLORS,
  FONT,
  TYPE,
  SLOPE_LINE_COLORS,
  themeColors,
  tooltipBorder,
} from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import { localizeValueLabel, type Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";
import {
  leftLabelGutterPx,
  endLabelGutterPx,
  wrapLabel,
  fitSideLabels,
} from "./core/text";

export interface SlopeConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  unit: string;
  labelField: string;
  leftField: string;
  rightField: string;
  leftPeriod: string;
  rightPeriod: string;
  /** the one category to accent (the line that bucks the trend) */
  highlightLabel?: string;
  /** newsroom dark theme (F2 house `theme: dark`): flips the chrome furniture. */
  themeBg?: string;
  /** newsroom house hue (spec `baseColor`): tints the FURNITURE greys (muted/axis/grid) and
   *  the frame's title band toward the house colour. This chart encodes with a fixed
   *  categorical/role palette, so the hue never touches its marks — colouring them with one
   *  hue would collapse the categories it separates. Undefined = untinted (byte-identical). */
  baseColor?: string;
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
  // Left labels are END-anchored "name value" (e.g. "Cadres 38"); the right labels
  // are the bare value ("52"/"52,4"). The SAME expression the SVG renders with
  // (localizeValueLabel — integer stays bare, a decimal keeps one place, then
  // config.lang's separators), so the gutters are sized from the exact strings drawn.
  const fmtVal = (v: number) => localizeValueLabel(v, config.lang);
  const leftLabelStrings = config.rows.map(
    (r) =>
      `${String(r[config.labelField])} ${fmtVal(Number(r[config.leftField]))}`,
  );
  const rightLabelStrings = config.rows.map((r) =>
    fmtVal(Number(r[config.rightField])),
  );
  // Size the left gutter to the WIDEST "name value" label so a long category name
  // renders in FULL — the fixed basePad.left:138 clipped "Professions intermédiaires 22"
  // off the frame's left edge, and the pipeline's fallback was to SHORTEN the data field
  // ("Interm.") to fit, mutilating the data. Floor at the sample's 138 (short-label
  // charts keep their layout), cap at ~42% of the canvas (a pathological name WRAPS to 2
  // lines at render, never truncates the data). bold:true so even the highlighted (700)
  // line's label fits. Size the right gutter from the actual value strings the same way
  // (floored at the sample's 86) so a large value can't clip either. UNSCALED font/gap +
  // scale — resolveFrame multiplies the whole basePad by scale, cancelling the factor.
  const basePad = {
    top: responsive ? 16 : 53 + titleLines * 27,
    right: Math.min(
      endLabelGutterPx(rightLabelStrings, TYPE.axis, {
        gapPx: 10,
        floorPx: 86,
      }),
      Math.max(86, (width * 0.3) / s),
    ),
    bottom: 32, // period captions (source band reserved in resolveFrameWithHeader)
    left: leftLabelGutterPx(leftLabelStrings, TYPE.axis, {
      gapPx: 10,
      floorPx: 138,
      width,
      scale: s,
      bold: true,
    }),
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
      lang={config.lang}
      themeBg={config.themeBg}
      baseColor={config.baseColor}
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
  const fmt = (v: number) => localizeValueLabel(v, config.lang);
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
      <strong>{l.rawLabel}</strong>{" "}
      <span style={{ opacity: 0.8 }}>
        {config.leftPeriod} {fmt(l.leftVal)} → {config.rightPeriod}{" "}
        {fmt(l.rightVal)}
      </span>
      <div style={{ opacity: 0.7, fontSize: 11 }}>
        {arrow} {fmt(Math.abs(delta))} {config.unit}
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
  const C = themeColors(config.themeBg, config.baseColor);
  // neutral CONTEXT line (slope.md rule 4) — furniture-grade scaffolding (the guard
  // calls it "exempt like the axis"), so it flips with the theme's muted furniture:
  // #6B6B6B on white → the lighter dark muted on the dark bg (else near-invisible).
  const CONTEXT = C.muted;
  const { innerWidth, innerHeight, leftX, rightX, lines } = layout;
  const n = lines.length;

  const chrome = easeOutCubic(p / 0.18);
  const lineP = (i: number) => stagger(p, i, n, 0.18, 0.5 / n, 0.4);

  const isHi = (l: { rawLabel: string }) =>
    config.highlightLabel != null && l.rawLabel === config.highlightLabel;

  const fmt = (v: number) => localizeValueLabel(v, config.lang);

  // Left "name value" labels: the gutter (padding.left) is sized to the widest label
  // (leftLabelGutterPx) but CAPPED so the plot isn't starved, so a genuinely extreme name
  // wraps to ≥2 lines. fitSideLabels picks the largest font at which every wrapped block
  // fits its vertical slot (innerHeight/n) AND the full "name value" fits without
  // truncation — so the ≤2-line block neither collides with its neighbour (the black-on-
  // black failure the fixed 16px gap allowed) nor drops the trailing value to an ellipsis.
  const leftBudget = padding.left - 10 * sc;
  const leftFulls = lines.map((l) => `${l.rawLabel} ${fmt(l.leftVal)}`);
  const leftFit = fitSideLabels(
    leftFulls,
    leftBudget,
    innerHeight / Math.max(1, n),
    ts.axis,
    { widthFactor: config.highlightLabel != null ? 1.08 : 1 },
  );

  // de-collide the end labels vertically in each gutter (spreadLabels). The left gutter
  // spreads by the WRAPPED-BLOCK gap (≥ its single-line 16px floor); the right value
  // labels are always one line, so they keep the single-line 16px gap.
  const leftMinGap = Math.max(16 * sc, leftFit.minGap);
  const rightMinGap = 16 * sc;
  // A 2-line block is centred on its spread-y, so an extreme-value row (the topmost /
  // bottommost line) would push half a block ABOVE the plot into the subtitle band, or
  // BELOW it into the period captions. Reserve half a block at each end so every wrapped
  // block stays inside [0, innerHeight] — clear of both the header and the captions.
  const leftHalfBlock = (leftFit.maxLines * leftFit.lineHeight) / 2;
  const leftBandTop = Math.min(leftHalfBlock, innerHeight / 2);
  const leftBandBot = Math.max(leftBandTop, innerHeight - leftHalfBlock);
  const leftYs = spreadLabelsBounded(
    lines.map((l) => ({ index: l.index, y: l.y1 })),
    leftMinGap,
    leftBandTop,
    leftBandBot,
  );
  const rightYs = spreadLabels(
    lines.map((l) => ({ index: l.index, y: l.y2 })),
    rightMinGap,
    innerHeight,
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
        {/* light value axis (a few horizontal guides) — fades in */}
        <g opacity={chrome * 0.6}>
          {layout.valueTicks.map((t, i) => (
            <line
              key={`g${i}`}
              x1={0}
              x2={innerWidth}
              y1={t.pos}
              y2={t.pos}
              stroke={C.grid}
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
                stroke={C.axis}
                strokeWidth={1}
              />
              <text
                x={c.x}
                y={innerHeight + 22 * sc}
                textAnchor="middle"
                fontSize={ts.axis}
                fontWeight={600}
                fill={C.ink}
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
            // Left "name value" label: wrap at the shared fit's font + line budget so
            // the full string always fits (leftFit.maxLines never truncates the data) and
            // the block is short enough for its de-collided slot (no black-on-black). Bold
            // (highlighted) labels are ~8% wider than the 0.6 estimate, so measure at
            // 1.08·font — leftFit already reserved that headroom in maxLines.
            const leftFull = `${l.rawLabel} ${fmt(l.leftVal)}`;
            const leftWrapFont = hi ? leftFit.font * 1.08 : leftFit.font;
            const leftLines = wrapLabel(
              leftFull,
              leftBudget,
              leftWrapFont,
              leftFit.maxLines,
            );
            const leftLineH = leftFit.lineHeight;
            const leftY0 = ly - ((leftLines.length - 1) * leftLineH) / 2;
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
                {/* left endpoint + wrapped "name value" label — fades in from nothing */}
                <g opacity={leftOp}>
                  <circle
                    cx={l.x1}
                    cy={l.y1}
                    r={(hi ? 4 : 3) * sc}
                    fill={color}
                  />
                  {leftLines.map((ln, li) => (
                    <text
                      key={`ll${l.index}-${li}`}
                      x={l.x1 - 10 * sc}
                      y={leftY0 + li * leftLineH}
                      dy="0.32em"
                      textAnchor="end"
                      fontSize={leftFit.font}
                      fontWeight={hi ? 700 : 400}
                      fill={C.ink}
                    >
                      {ln}
                    </text>
                  ))}
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
                    fill={C.ink}
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
