// THE one radar / spider component — a POLAR multi-axis profile: N axes radiate
// from the centre, each series is a polygon joining its value on every axis, so
// the SHAPE is the read. D3 = math (radar-geometry.ts: polar layout, shared
// radial scale from centre=0), React = DOM, one master `progress` fades the
// chrome in then grows each polygon FROM THE CENTRE outward (vertex by centre).
// responsive=false = fixed layout (video/static); responsive=true = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: Okabe-Ito categorical palette +
//     WCAG (ink/muted text) + title=insight + cited source (ChartFrame +
//     checkRadarConformance), scale via resolveFrame, core/text.truncate for
//     axis labels on narrow canvases.
//   - TYPE-specific: the polar layout (axes from centre, one radial scale), the
//     translucent-fill polygons + outline, the concentric ring scale, and the
//     grow-from-centre reveal.
import { useState } from "react";
import {
  computeRadarLayout,
  growRadar,
  type RadarData,
  type RadarLayout,
} from "./radar-geometry";
import { clamp01, easeOutCubic, stagger } from "./core/math";
import {
  COLORS,
  FONT,
  TYPE,
  OKABE_ITO,
  themeColors,
  tooltipBorder,
} from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import type { Lang } from "./core/locale";
import { resolveFrame } from "./core/format";
import { truncate, textWidth } from "./core/text";

export interface RadarConfig {
  title: string;
  source: { name: string; url: string };
  /** deliverable language — localizes number separators + "Source". Default English. */
  lang?: Lang;
  unit: string; // subtitle (what the score is)
  max: number;
  axes: string[];
  series: { label: string; values: number[] }[];
  /** newsroom house theme GROUND (F2 house `theme`) — every furniture token (ink, muted,
   *  axis, grid, bg) derives from this hex. Undefined = the light default (byte-identical). */
  themeBg?: string;
  /** newsroom house hue (spec `baseColor`): tints the FURNITURE greys (muted/axis/grid) and
   *  the frame's title band toward the house colour. The ≤3 series carry the fixed Okabe-Ito
   *  palette that keeps the overlapping profiles apart, so the hue never touches them.
   *  Undefined = untinted (byte-identical). */
  baseColor?: string;
}

export interface RadarChartProps {
  config: RadarConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

// ≤3 series (radar.md) — translucent fill + solid outline keeps overlaps legible.
const RADAR_COLORS = [OKABE_ITO.blue, OKABE_ITO.orange, OKABE_ITO.green];

export function RadarChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: RadarChartProps) {
  const p = clamp01(progress);
  const s = responsive ? 1 : scale; // wrap-estimate scale only
  // The axis labels radiate to the rim, so the plot reserves a side gutter =
  // the widest label + a gap. But that gutter must never swallow the whole
  // canvas (a narrow phone) — cap it at ~26% of the width and let truncate()
  // shorten any label that no longer fits. Base values are UNSCALED for the
  // fixed layout (resolveFrame scales them); the responsive branch is px-exact.
  const labelWBase = Math.max(
    ...config.axes.map((a) => textWidth(a, TYPE.axis)),
  );
  const gutterFixed = Math.min(labelWBase + 12, (width / scale) * 0.26);
  const gutterResp = Math.min(labelWBase + 12, width * 0.26);
  const labelLineU = TYPE.axis + 10;
  const legendBandU = TYPE.axis + 22;
  // reserve the (possibly wrapping) title block + subtitle so the TOP axis label
  // clears the header in the fixed layout (where title is drawn over the plot).
  const charsPerLine = Math.max(
    8,
    Math.floor((width - 48 * s) / (TYPE.title * s * 0.52)),
  );
  const titleLines = Math.max(1, Math.ceil(config.title.length / charsPerLine));
  const headerH = 18 + titleLines * 27 + 16;
  const basePadFixed = {
    top: headerH + labelLineU,
    right: gutterFixed,
    bottom: 26 + labelLineU + legendBandU, // bottom label + legend (source = ChartFrame)
    left: gutterFixed,
  };
  const basePadResp = {
    top: 10 + labelLineU,
    right: gutterResp,
    bottom: 10 + labelLineU + legendBandU,
    left: gutterResp,
  };
  const frame = responsive
    ? { scale: 1, pad: basePadResp, type: TYPE }
    : resolveFrame(width, height, basePadFixed, scale, 1); // 1 = keep it circular

  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;

  const data: RadarData = {
    axes: config.axes,
    max: config.max,
    series: config.series,
  };
  const layout = computeRadarLayout(data, { width, height, padding });

  // Two independent interactions (radar.md): hovering a VERTEX shows that
  // point's value (the expected radar gesture); hovering a LEGEND item just
  // brings a series forward (dims the others). The active series — for dimming —
  // is whichever a vertex hover or a legend hover names.
  const [hoverPt, setHoverPt] = useState<{ si: number; vi: number } | null>(
    null,
  );
  const [focusSeries, setFocusSeries] = useState<number | null>(null);
  const activeSeries = hoverPt ? hoverPt.si : focusSeries;

  const svg = (
    <RadarSvg
      layout={layout}
      width={width}
      height={height}
      p={p}
      config={config}
      interactive={interactive}
      activeSeries={activeSeries}
      setHoverPt={setHoverPt}
      setFocusSeries={setFocusSeries}
      ts={ts}
      sc={sc}
    />
  );

  const tooltip =
    interactive && hoverPt !== null ? (
      <Tooltip layout={layout} hoverPt={hoverPt} config={config} />
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

function RadarSvg({
  layout,
  width,
  height,
  p,
  config,
  interactive,
  activeSeries,
  setHoverPt,
  setFocusSeries,
  ts,
  sc,
}: {
  layout: RadarLayout;
  width: number;
  height: number;
  p: number;
  config: RadarConfig;
  interactive: boolean;
  activeSeries: number | null;
  setHoverPt: (h: { si: number; vi: number } | null) => void;
  setFocusSeries: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { cx, cy, radius, axes, series, rings, max } = layout;
  const C = themeColors(config.themeBg, config.baseColor);
  const gap = 8 * sc;

  // reveal: chrome (spokes + rings + axis labels + legend) fades in first; then
  // each polygon grows from the centre, staggered by series.
  const chrome = easeOutCubic(p / 0.18);
  const nS = series.length;
  const seriesP = (si: number) => stagger(p, si, nS, 0.16, 0.16, 0.6);

  const charW = ts.axis * 0.6;

  // ring scale labels along the upper vertical spoke — inner rings only (the rim
  // value is implied by the axis labels). On a small radius the rings crowd, so
  // keep a label only when it clears the previous kept one (no text overlap).
  const ringMinGap = ts.source + 5;
  const ringLabels: { r: number; value: number }[] = [];
  let lastRingY = Infinity;
  for (const ring of rings) {
    if (ring.value >= max) continue;
    const y = -ring.r;
    if (lastRingY - y < ringMinGap) continue;
    ringLabels.push(ring);
    lastRingY = y;
  }
  const legendY = cy + radius + gap + ts.axis + 16 * sc;

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={config.title}
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
      <g transform={`translate(${cx},${cy})`}>
        {/* chrome: concentric rings, spokes, ring scale labels, axis labels */}
        <g opacity={chrome}>
          {/* rings (light gridlines) */}
          {rings.map((ring, i) => (
            <circle
              key={`ring${i}`}
              cx={0}
              cy={0}
              r={ring.r}
              fill="none"
              stroke={C.grid}
              strokeWidth={1}
            />
          ))}
          {/* outer rim */}
          <circle
            cx={0}
            cy={0}
            r={radius}
            fill="none"
            stroke={C.axis}
            strokeWidth={1}
          />
          {/* spokes */}
          {axes.map((ax, i) => (
            <line
              key={`spoke${i}`}
              x1={0}
              y1={0}
              x2={ax.ex}
              y2={ax.ey}
              stroke={C.axis}
              strokeWidth={1}
            />
          ))}
          {/* ring scale labels — along the UPPER vertical spoke, inner rings
              only (the rim value is implied), offset right with a white halo so
              they read over the gridlines without colliding with the top label */}
          {ringLabels.map((ring, i) => (
            <text
              key={`rv${i}`}
              x={4 * sc}
              y={-ring.r}
              dy="0.32em"
              fontSize={ts.source}
              fill={C.muted}
              paintOrder="stroke"
              stroke={C.bg}
              strokeWidth={3 * sc}
              strokeLinejoin="round"
            >
              {ring.value}
            </text>
          ))}
          {/* axis labels at the spoke ends */}
          {axes.map((ax, i) => {
            const anchor =
              ax.side === "right"
                ? "start"
                : ax.side === "left"
                  ? "end"
                  : "middle";
            const lx =
              ax.ex +
              (ax.side === "right" ? gap : ax.side === "left" ? -gap : 0);
            // vertical: centre-anchored top/bottom labels clear the rim; sided
            // labels sit on the spoke line.
            const ly =
              ax.side === "center"
                ? ax.ey + (ax.ey < 0 ? -gap : gap + ts.axis * 0.7)
                : ax.ey;
            // the gutter reserves maxLabelW; truncate defensively so a stray long
            // label can never spill out of the card.
            const room =
              ax.side === "center"
                ? radius * 1.6
                : ax.side === "right"
                  ? width - (cx + lx) - 2 * sc
                  : cx + lx - 2 * sc;
            return (
              <text
                key={`al${i}`}
                x={lx}
                y={ly}
                dy={ax.side === "center" ? undefined : "0.32em"}
                textAnchor={anchor}
                fontSize={ts.axis}
                fontWeight={600}
                fill={C.ink}
              >
                {truncate(ax.label, room, ts.axis)}
              </text>
            );
          })}
        </g>

        {/* series polygons — grow from the centre, staggered */}
        {series.map((ser, si) => {
          const sp = clamp01(seriesP(si));
          const pts = growRadar(ser, sp);
          const color = RADAR_COLORS[si % RADAR_COLORS.length];
          const focused = interactive && activeSeries === si;
          const dim = interactive && activeSeries !== null && !focused;
          const d = pts.map((v) => `${v.x},${v.y}`).join(" ");
          return (
            <g key={`s${si}`} opacity={dim ? 0.3 : 1}>
              <polygon
                points={d}
                fill={color}
                fillOpacity={0.22 * sp}
                stroke={color}
                strokeWidth={(focused ? 3 : 2) * sc}
                strokeLinejoin="round"
                opacity={sp}
              />
              {pts.map((v, vi) => (
                <circle
                  key={`v${si}-${vi}`}
                  cx={v.x}
                  cy={v.y}
                  r={3.2 * sc * sp}
                  fill={color}
                  stroke={C.bg}
                  strokeWidth={1.2 * sc}
                />
              ))}
            </g>
          );
        })}

        {/* interactive vertex hit-targets — a generous transparent disc over each
            vertex so a small dot is easy to hover/focus; shows that point's value */}
        {interactive &&
          series.map((ser, si) => {
            const sp = clamp01(seriesP(si));
            if (sp < 0.99) return null; // only once landed (no hover mid-reveal)
            return ser.vertices.map((v, vi) => (
              <circle
                key={`hit${si}-${vi}`}
                cx={v.x}
                cy={v.y}
                r={13 * sc}
                fill="transparent"
                tabIndex={0}
                role="img"
                aria-label={`${config.series[si].label}, ${config.axes[vi]}: ${v.value} of ${max}`}
                style={{ cursor: "pointer", outline: "none" }}
                onMouseEnter={() => setHoverPt({ si, vi })}
                onMouseLeave={() => setHoverPt(null)}
                onFocus={() => setHoverPt({ si, vi })}
                onBlur={() => setHoverPt(null)}
              />
            ));
          })}
      </g>

      {/* legend — chip + series name, centred below the circle (fixed/responsive
          alike), fading in with the chrome */}
      <Legend
        series={config.series.map((s) => s.label)}
        ink={C.ink}
        cx={cx}
        y={legendY}
        ts={ts}
        sc={sc}
        charW={charW}
        chrome={chrome}
        interactive={interactive}
        activeSeries={activeSeries}
        setFocusSeries={setFocusSeries}
      />
    </svg>
  );
}

function Legend({
  series,
  ink,
  cx,
  y,
  ts,
  sc,
  charW,
  chrome,
  interactive,
  activeSeries,
  setFocusSeries,
}: {
  series: string[];
  /** the ground-derived furniture ink, resolved once by RadarSvg and threaded down */
  ink: string;
  cx: number;
  y: number;
  ts: { axis: number };
  sc: number;
  charW: number;
  chrome: number;
  interactive: boolean;
  activeSeries: number | null;
  setFocusSeries: (i: number | null) => void;
}) {
  const chip = 13 * sc;
  const gapAfterChip = 6 * sc;
  const gapBetween = 20 * sc;
  // lay items out left→right, then centre the whole row on cx.
  const widths = series.map((s) => chip + gapAfterChip + s.length * charW);
  const total =
    widths.reduce((a, w) => a + w, 0) + gapBetween * (series.length - 1);
  let x = cx - total / 2;
  return (
    <g className="chart-legend" opacity={chrome}>
      {series.map((label, i) => {
        const color = RADAR_COLORS[i % RADAR_COLORS.length];
        const dim = interactive && activeSeries !== null && activeSeries !== i;
        const itemX = x;
        x += widths[i] + gapBetween;
        return (
          <g
            key={`lg${i}`}
            opacity={dim ? 0.4 : 1}
            style={interactive ? { cursor: "pointer" } : undefined}
            onMouseEnter={interactive ? () => setFocusSeries(i) : undefined}
            onMouseLeave={interactive ? () => setFocusSeries(null) : undefined}
          >
            <rect
              x={itemX}
              y={y - chip * 0.8}
              width={chip}
              height={chip}
              rx={2}
              fill={color}
            />
            <text
              x={itemX + chip + gapAfterChip}
              y={y}
              dy="0.32em"
              fontSize={ts.axis}
              fontWeight={600}
              fill={ink}
            >
              {label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Tooltip({
  layout,
  hoverPt,
  config,
}: {
  layout: RadarLayout;
  hoverPt: { si: number; vi: number };
  config: RadarConfig;
}) {
  const ser = layout.series[hoverPt.si];
  if (!ser) return null;
  // anchor the tooltip ON the hovered vertex — it shows that one point's value.
  const vertex = ser.vertices[hoverPt.vi];
  const axis = layout.axes[hoverPt.vi];
  const left = layout.cx + vertex.x;
  const top = layout.cy + vertex.y;
  const color = RADAR_COLORS[hoverPt.si % RADAR_COLORS.length];
  return (
    <div
      className="tooltip"
      style={{
        position: "absolute",
        left,
        top,
        transform: "translate(-50%,-130%)",
        background: COLORS.ink,
        border: tooltipBorder(config.themeBg),
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
      <strong style={{ color: "#fff", fontSize: 13 }}>
        {config.series[hoverPt.si].label}
      </strong>
      <div style={{ fontSize: 12, marginTop: 1 }}>
        {axis.label}{" "}
        <strong>
          {vertex.value} / {layout.max}
        </strong>
      </div>
    </div>
  );
}
