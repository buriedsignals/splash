// THE one population-pyramid component — two back-to-back bar charts sharing a
// central age axis. D3 = math (population-pyramid-geometry.ts), React = DOM, one
// master `progress` grows every bar from the central zero outward. responsive=false
// = fixed layout (video/static); responsive=true = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: baseline-0 (each side grows from
//     the central zero), Okabe-Ito palette + WCAG + title=insight + source
//     (ChartFrame + conformance), scale via resolveFrame, the shared core/legend.
//   - TYPE-specific: the mirrored geometry + centre gutter, the shared magnitude
//     scale, and the grow-from-centre reveal.
import { useState } from "react";
import {
  computePyramidLayout,
  growPyramidBar,
  type PyramidData,
  type PyramidLayout,
} from "./population-pyramid-geometry";
import { clamp01, easeOutCubic, stagger } from "./core/math";
import { COLORS, FONT, TYPE, OKABE_ITO } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import { resolveFrame } from "./core/format";
import { layoutLegend } from "./core/legend";

export interface PopulationPyramidConfig {
  title: string;
  source: { name: string; url: string };
  unit: string;
  bandField: string;
  leftField: string;
  rightField: string;
  leftLabel: string;
  rightLabel: string;
  rows: Record<string, string | number>[];
}

export interface PopulationPyramidChartProps {
  config: PopulationPyramidConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

const LEFT_COLOR = OKABE_ITO.blue; // group A
const RIGHT_COLOR = OKABE_ITO.orange; // group B

export function PopulationPyramidChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: PopulationPyramidChartProps) {
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
    bottom: 54, // magnitude axis + legend
    left: 18,
  };
  const frame = responsive
    ? { scale: 1, pad: basePad, type: TYPE }
    : resolveFrame(width, height, basePad, scale);
  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;
  const data: PyramidData = {
    bandField: config.bandField,
    leftField: config.leftField,
    rightField: config.rightField,
    rows: config.rows,
  };
  const layout = computePyramidLayout(
    data,
    { width, height, padding },
    { centerGap: 56 * sc },
  );

  const [hover, setHover] = useState<{
    band: number;
    side: "left" | "right";
  } | null>(null);

  const svg = (
    <PyramidSvg
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
    interactive && hover ? (
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

function PyramidSvg({
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
  layout: PyramidLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: PopulationPyramidConfig;
  interactive: boolean;
  hover: { band: number; side: "left" | "right" } | null;
  setHover: (h: { band: number; side: "left" | "right" } | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { innerWidth, innerHeight, leftEdge, rightEdge, bands } = layout;
  const n = bands.length;

  const chrome = easeOutCubic(p / 0.18);
  const bandP = (i: number) => stagger(p, i, n, 0.18, 0.5 / n, 0.35);

  const legend = layoutLegend(
    [config.leftLabel, config.rightLabel],
    [LEFT_COLOR, RIGHT_COLOR],
    innerWidth,
    Math.max(0, innerWidth / 2 - 120 * sc),
    innerHeight + 40 * sc,
    ts.axis * 0.6,
    22 * sc,
    sc,
  ).items;

  const sideRect = (
    b: PyramidLayout["bands"][number],
    side: "left" | "right",
    i: number,
  ) => {
    const g = growPyramidBar(b, side, bandP(i));
    const fill = side === "left" ? LEFT_COLOR : RIGHT_COLOR;
    const focused = interactive && hover?.band === i && hover?.side === side;
    const dim = interactive && hover && !focused;
    const val = side === "left" ? b.leftVal : b.rightVal;
    return (
      <rect
        key={`${side}${i}`}
        className="pyramid-bar"
        x={g.x}
        y={g.y}
        width={g.w}
        height={g.h}
        fill={fill}
        opacity={dim ? 0.5 : 1}
        tabIndex={interactive ? 0 : undefined}
        role={interactive ? "img" : undefined}
        aria-label={
          interactive
            ? `${b.bandLabel} ${side === "left" ? config.leftLabel : config.rightLabel}: ${val} ${config.unit}`
            : undefined
        }
        style={interactive ? { cursor: "pointer" } : undefined}
        onMouseEnter={
          interactive ? () => setHover({ band: i, side }) : undefined
        }
        onMouseLeave={interactive ? () => setHover(null) : undefined}
        onFocus={interactive ? () => setHover({ band: i, side }) : undefined}
        onBlur={interactive ? () => setHover(null) : undefined}
      />
    );
  };

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
        {/* magnitude gridlines, mirrored both sides (wipe in) */}
        <g opacity={chrome * 0.6}>
          {layout.magTicks.map((t, i) => (
            <g key={`g${i}`}>
              <line
                x1={t.leftPos}
                x2={t.leftPos}
                y1={0}
                y2={innerHeight}
                stroke={COLORS.grid}
                strokeWidth={1}
              />
              <line
                x1={t.rightPos}
                x2={t.rightPos}
                y1={0}
                y2={innerHeight}
                stroke={COLORS.grid}
                strokeWidth={1}
              />
            </g>
          ))}
        </g>

        {/* bars */}
        {bands.map((b, i) => (
          <g key={`b${i}`}>
            {sideRect(b, "left", i)}
            {sideRect(b, "right", i)}
            {/* centre age label */}
            <text
              x={(leftEdge + rightEdge) / 2}
              y={b.y + b.h / 2}
              dy="0.32em"
              textAnchor="middle"
              fontSize={ts.axis}
              fontWeight={600}
              fill={COLORS.ink}
              opacity={clamp01(bandP(i) * 1.5)}
            >
              {b.bandLabel}
            </text>
          </g>
        ))}

        {/* magnitude axis labels (positive on both sides) — thinned when the
            ticks are closer than the widest label (big numbers on a narrow plot) */}
        <g opacity={chrome}>
          {(() => {
            const step = layout.half / Math.max(1, layout.magTicks.length - 1);
            const maxW =
              Math.max(...layout.magTicks.map((t) => String(t.mag).length)) *
              ts.source *
              0.6;
            const every = step < maxW ? 2 : 1;
            return layout.magTicks.map((t, i) =>
              t.mag === 0 || i % every !== 0 ? null : (
                <g key={`m${i}`}>
                  <text
                    x={t.leftPos}
                    y={innerHeight + 18 * sc}
                    textAnchor="middle"
                    fontSize={ts.source}
                    fill={COLORS.muted}
                  >
                    {t.mag}
                  </text>
                  <text
                    x={t.rightPos}
                    y={innerHeight + 18 * sc}
                    textAnchor="middle"
                    fontSize={ts.source}
                    fill={COLORS.muted}
                  >
                    {t.mag}
                  </text>
                </g>
              ),
            );
          })()}
        </g>

        {/* legend */}
        <g opacity={chrome}>
          {legend.map((it, i) => (
            <g key={`lg${i}`}>
              <rect
                x={it.x}
                y={it.y - 11 * sc}
                width={13 * sc}
                height={13 * sc}
                rx={2}
                fill={it.color}
              />
              <text
                x={it.x + 19 * sc}
                y={it.y}
                dy="0.32em"
                fontSize={ts.axis}
                fontWeight={600}
                fill={COLORS.ink}
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
  layout: PyramidLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: { band: number; side: "left" | "right" };
  config: PopulationPyramidConfig;
}) {
  const b = layout.bands[hover.band];
  if (!b) return null;
  const val = hover.side === "left" ? b.leftVal : b.rightVal;
  const groupLabel =
    hover.side === "left" ? config.leftLabel : config.rightLabel;
  const tipX = hover.side === "left" ? b.leftX : b.rightX + b.rightW;
  const left = padding.left + tipX;
  const top = padding.top + b.y - 6;
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
      <strong>{val}</strong> <span style={{ opacity: 0.8 }}>{config.unit}</span>
      <div style={{ opacity: 0.7, fontSize: 11 }}>
        {groupLabel} · {b.bandLabel}
      </div>
    </div>
  );
}
