// THE one dumbbell / range-plot component — two dots joined by a connector per
// category row; the connector length IS the gap. POSITION encoding (no baseline-0,
// dumbbell.md rule 1, like the slope). D3 = math (dumbbell-geometry.ts), React =
// DOM, one master `progress` opens each gap. responsive=false = fixed layout
// (video/static); responsive=true = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: title=insight + Okabe-Ito + source
//     + WCAG (ChartFrame + conformance), scale via resolveFrame, the shared
//     core/legend, direct value labels.
//   - TYPE-specific: the row geometry, the connector-extend motion, position (not
//     length) encoding, and the two-dot + neutral-connector treatment that makes
//     the gap the subject. Value labels sit on the OUTER side of each dot.
import { useState } from "react";
import {
  computeDumbbellLayout,
  extendConnector,
  type DumbbellData,
  type DumbbellLayout,
} from "./dumbbell-geometry";
import { clamp01, easeOutCubic, labelReveal, stagger } from "./core/math";
import { entranceOf } from "./core/chart-walk";
import { walkEntryOrder, type ConfigWalkBeats } from "./core/walk";
import {
  COLORS,
  TYPE,
  DUMBBELL_DOT_COLORS,
  themeColors,
  tooltipBorder,
} from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import { formatLocaleNumber, type Lang } from "./core/locale";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";
import { layoutLegend, legendRowCount } from "./core/legend";
import { leftLabelGutterPx, wrapLabel, fitSideLabels } from "./core/text";

export interface DumbbellConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  unit: string;
  labelField: string;
  leftField: string;
  rightField: string;
  leftLabel: string; // series A name (legend)
  rightLabel: string; // series B name (legend)
  /** newsroom dark theme (F2 house `theme: dark`): flips the chrome furniture. */
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

export interface DumbbellChartProps {
  config: DumbbellConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

const LEFT_COLOR = DUMBBELL_DOT_COLORS[0]; // series A dot
const RIGHT_COLOR = DUMBBELL_DOT_COLORS[1]; // series B dot

export function DumbbellChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: DumbbellChartProps) {
  const p = clamp01(progress);
  const s = responsive ? 1 : scale;
  const charsPerLine = Math.max(
    8,
    Math.floor((width - 48 * s) / (TYPE.title * s * 0.52)),
  );
  const titleLines = responsive
    ? 1
    : Math.max(1, Math.ceil(config.title.length / charsPerLine));
  const legendRowUnscaled = 22;
  const PAD_RIGHT = 60; // outer value label of the rightmost dot
  const PAD_LEFT_FLOOR = 124; // category labels — the short-sample gutter (only GROW)
  // Size the left gutter to the WIDEST category name (leftLabelGutterPx, the same
  // label-driven treatment Fix E gave the slope) — the fixed 124 clipped a long
  // occupational name ("Professions intermédiaires de la santé et du travail social")
  // ~230-350px off the frame's LEFT edge at every width. Floor at the sample's 124
  // (short-label charts keep their layout), cap at ~42% of the canvas (a pathological
  // name WRAPS onto ≤2 lines at render — DumbbellSvg below — never truncates the data).
  const catLabels = config.rows.map((r) => String(r[config.labelField]));
  const PAD_LEFT = leftLabelGutterPx(catLabels, TYPE.axis, {
    gapPx: 12,
    floorPx: PAD_LEFT_FLOOR,
    width,
    scale: s,
  });
  // The below-plot legend WRAPS on a narrow embed (layoutLegend, same charW/
  // availWidth as the render below) — reserve a bottom row per wrapped line, or
  // the extra row paints past the card ("Men" bottom-clipped 11.16px at 360px,
  // caught by snap-label-fit). Same shared pre-reserve every legend-bearing
  // type uses (legendRowCount, cf. DotStripChart / ArcChart).
  const legendRows = legendRowCount(
    [config.leftLabel, config.rightLabel],
    width - (PAD_LEFT + PAD_RIGHT) * s,
    TYPE.axis * s * 0.6,
    legendRowUnscaled * s,
  );
  const basePad = {
    top: responsive ? 16 : 53 + titleLines * 27,
    right: PAD_RIGHT,
    bottom: 28 + legendRows * legendRowUnscaled, // legend rows (source band reserved in resolveFrameWithHeader)
    left: PAD_LEFT,
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
  const data: DumbbellData = {
    labelField: config.labelField,
    leftField: config.leftField,
    rightField: config.rightField,
    rows: config.rows,
  };
  // reserve room at each edge for the outer value labels so the min/max dot's
  // label never collides with the category gutter (caught at 360px).
  const maxValLen = Math.max(
    ...config.rows.flatMap((r) => [
      String(r[config.leftField]).length,
      String(r[config.rightField]).length,
    ]),
  );
  const labelInset = maxValLen * ts.axis * 0.6 + 14 * sc;
  const layout = computeDumbbellLayout(
    data,
    { width, height, padding },
    "gap-desc",
    labelInset,
  );

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <DumbbellSvg
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

function DumbbellSvg({
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
  layout: DumbbellLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: DumbbellConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const C = themeColors(config.themeBg, config.baseColor);
  // neutral gap CONNECTOR — furniture-grade scaffolding (the guard exempts it from
  // palette membership), so it flips with the theme's muted furniture: near-invisible
  // as #6B6B6B on the dark bg, so use the lighter dark muted.
  const CONNECTOR = C.muted;
  const { innerWidth, innerHeight, rows } = layout;
  const n = rows.length;

  const chrome = easeOutCubic(p / 0.18);
  // The entrance schedule is READ from the walk registry, never retyped here: the video
  // caption reads the same one, and two copies of it is a sentence over the wrong subject.
  const E = entranceOf("dumbbell");
  // The confirmed walk leads: the subjects the journalist named enter first, in their order.
  // Built from the LAID-OUT labels, not from `config.rows` — this geometry sorts, and a
  // permutation over the unsorted rows addresses positions the component never renders.
  // Identity without a walk, so an un-storyboarded chart is byte-identical.
  const entry = walkEntryOrder(
    rows.map((r) => r.rawLabel),
    config.beats,
  );
  const rowP = (i: number) => stagger(p, entry(i), n, E.start, E.step(n), E.span);

  const legendTop = innerHeight + 32 * sc;
  const legend = layoutLegend(
    [config.leftLabel, config.rightLabel],
    [LEFT_COLOR, RIGHT_COLOR],
    innerWidth,
    0,
    legendTop,
    ts.axis * 0.6,
    22 * sc,
    sc,
  ).items;

  // localize via lib/core (French deliverable: "2.1" → "2,1"), not a re-implementation.
  const fmt = (v: number) => formatLocaleNumber(v, config.lang);
  const dot = (r: number) => (interactive ? 6 : 5) * sc * r;

  // Category gutter labels: the gutter (padding.left) is sized to the widest name but
  // CAPPED (~42%) so the plot isn't starved, so a genuinely extreme occupational name
  // wraps to ≥2 lines. fitSideLabels picks the largest font at which every wrapped block
  // fits ITS ROW (the band step) and the full name fits without truncation — so a wrapped
  // 2-line name never overflows its row into the next (no black-on-black) and the data is
  // never cut. Short names stay one line at the full axis font (no regression).
  const catBudget = padding.left - 12 * sc;
  const catFit = fitSideLabels(
    rows.map((r) => r.rawLabel),
    catBudget,
    layout.bandStep,
    ts.axis,
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
        {/* faint vertical gridlines for reference (no labels — dots carry values) */}
        <g opacity={chrome * 0.5}>
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

        {/* one row per category */}
        {rows.map((r) => {
          const rp = rowP(r.index);
          const leftOp = clamp01(rp / 0.18);
          // dumbbell.md rule 4 — BOTH endpoints carry a value label at EVERY frame.
          // They fade in early with the row (shared `labelReveal` knob) and ride the
          // two ANIMATED dot ends so they stay anchored to visible geometry through the
          // reveal. The old gate (rp-0.6)/0.4 hid the last-staggered rows' labels (and
          // second dot) mid-build. At p=1 endX === r.xRight, so minSide/maxSide are the
          // final dot extremes (byte-identical).
          const labelOp = labelReveal(rp);
          const endX = extendConnector(r, rp);
          const focused = interactive && hover === r.index;
          const dim = interactive && hover !== null && !focused;
          // outer placement: value label sits on the far side of each (animated) dot.
          const minSide = Math.min(r.xLeft, endX);
          const maxSide = Math.max(r.xLeft, endX);
          const leftIsMin = r.xLeft <= r.xRight;
          return (
            <g
              key={`r${r.index}`}
              opacity={dim ? 0.35 : 1}
              tabIndex={interactive ? 0 : undefined}
              role={interactive ? "img" : undefined}
              aria-label={
                interactive
                  ? `${r.rawLabel}: ${config.leftLabel} ${fmt(r.leftVal)}, ${config.rightLabel} ${fmt(r.rightVal)} ${config.unit} (gap ${Math.abs(r.gap)})`
                  : undefined
              }
              style={interactive ? { cursor: "pointer" } : undefined}
              onMouseEnter={interactive ? () => setHover(r.index) : undefined}
              onMouseLeave={interactive ? () => setHover(null) : undefined}
              onFocus={interactive ? () => setHover(r.index) : undefined}
              onBlur={interactive ? () => setHover(null) : undefined}
            >
              {/* category label in the left gutter — wrapped onto ≤ catFit.maxLines lines
                  at catFit.font so a long name renders in FULL (never truncated) and its
                  block fits the row (never colliding with the neighbouring row's label). */}
              {(() => {
                const catLines = wrapLabel(
                  r.rawLabel,
                  catBudget,
                  catFit.font,
                  catFit.maxLines,
                );
                const catY0 =
                  r.y - ((catLines.length - 1) * catFit.lineHeight) / 2;
                return catLines.map((ln, li) => (
                  <text
                    key={`cat${r.index}-${li}`}
                    x={-12 * sc}
                    y={catY0 + li * catFit.lineHeight}
                    dy="0.32em"
                    textAnchor="end"
                    fontSize={catFit.font}
                    fill={C.ink}
                    opacity={leftOp}
                  >
                    {ln}
                  </text>
                ));
              })()}
              {/* connector (the gap) — extends from the first dot */}
              <line
                className="dumbbell-row"
                x1={r.xLeft}
                y1={r.y}
                x2={endX}
                y2={r.y}
                stroke={CONNECTOR}
                strokeWidth={3 * sc}
                opacity={leftOp}
              />
              {/* first dot (left field) */}
              <circle
                className="dumbbell-dot"
                cx={r.xLeft}
                cy={r.y}
                r={dot(1)}
                fill={LEFT_COLOR}
                opacity={leftOp}
              />
              {/* second dot (right field) rides the connector head; both value labels
                  ride the two animated dot ends. Each carries its own reveal opacity
                  (fades in early with the row) — so the reveal is per-element, like the
                  rest of the bar family, and the gap "opens up" with its values in view. */}
              <circle
                className="dumbbell-dot"
                cx={endX}
                cy={r.y}
                r={dot(1)}
                fill={RIGHT_COLOR}
                opacity={labelOp}
              />
              {/* outer value labels in ink; the dots + legend carry the series colour */}
              <text
                x={minSide - 9 * sc}
                y={r.y}
                dy="0.32em"
                textAnchor="end"
                fontSize={ts.axis}
                fontWeight={600}
                fill={C.ink}
                opacity={labelOp}
              >
                {fmt(leftIsMin ? r.leftVal : r.rightVal)}
              </text>
              <text
                x={maxSide + 9 * sc}
                y={r.y}
                dy="0.32em"
                textAnchor="start"
                fontSize={ts.axis}
                fontWeight={600}
                fill={C.ink}
                opacity={labelOp}
              >
                {fmt(leftIsMin ? r.rightVal : r.leftVal)}
              </text>
            </g>
          );
        })}

        {/* series legend under the plot (fades in with the chrome) */}
        <g className="chart-legend" opacity={chrome}>
          {legend.map((it, i) => (
            <g key={`lg${i}`}>
              <circle cx={it.x + 6 * sc} cy={it.y} r={6 * sc} fill={it.color} />
              <text
                x={it.x + 18 * sc}
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
  layout: DumbbellLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: DumbbellConfig;
}) {
  const r = layout.rows.find((x) => x.index === hover);
  if (!r) return null;
  const left = padding.left + (r.xLeft + r.xRight) / 2;
  const top = padding.top + r.y - 12;
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
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <strong>{r.rawLabel}</strong>{" "}
      <span style={{ opacity: 0.8 }}>
        {config.leftLabel} {formatLocaleNumber(r.leftVal, config.lang)} ·{" "}
        {config.rightLabel} {formatLocaleNumber(r.rightVal, config.lang)}
      </span>
      <div style={{ opacity: 0.7, fontSize: 11 }}>
        gap {formatLocaleNumber(Math.abs(r.gap), config.lang)} {config.unit}
      </div>
    </div>
  );
}
