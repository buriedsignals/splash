// THE one connected-scatter component — two variables' joint trajectory over
// time. D3 = math (connected-scatter-geometry.ts), React = DOM, one master
// `progress` traces the path by cumulative length (the line draw-on, reused) and
// pops dots as the head passes. responsive=false = fixed layout (video/static);
// responsive=true = flow embed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused, not re-solved: position encoding + BOTH-axes-
//     titled (the shared checkScatterConformance), Okabe-Ito accent + WCAG +
//     title=insight + source (ChartFrame + conformance), scale via resolveFrame.
//   - TYPE-specific: the time-ordered path, the cumulative-length draw-on, the
//     dot-pops-as-head-passes reveal, and the start/end direction labels.
import { useState } from "react";
import {
  computeConnectedScatterLayout,
  revealPath,
  type ConnectedScatterData,
  type ConnectedScatterLayout,
} from "./connected-scatter-geometry";
import { clamp01, easeInOutCubic, easeOutCubic } from "./core/math";
import { COLORS, FONT, TYPE, OKABE_ITO } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import { resolveFrame } from "./core/format";

export interface ConnectedScatterConfig {
  title: string;
  source: { name: string; url: string };
  unit: string;
  labelField: string;
  xField: string;
  yField: string;
  xLabel: string;
  yLabel: string;
  rows: Record<string, string | number>[];
}

export interface ConnectedScatterChartProps {
  config: ConnectedScatterConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

const ACCENT = OKABE_ITO.blue;

export function ConnectedScatterChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: ConnectedScatterChartProps) {
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
    right: 24,
    bottom: 56, // x axis + x title
    left: 64, // y axis + y title
  };
  const frame = responsive
    ? { scale: 1, pad: basePad, type: TYPE }
    : resolveFrame(width, height, basePad, scale);
  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;
  const data: ConnectedScatterData = {
    labelField: config.labelField,
    xField: config.xField,
    yField: config.yField,
    rows: config.rows,
  };
  const layout = computeConnectedScatterLayout(data, {
    width,
    height,
    padding,
  });

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <ConnectedScatterSvg
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

function ConnectedScatterSvg({
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
  layout: ConnectedScatterLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: ConnectedScatterConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { innerWidth, innerHeight, points, totalLen } = layout;

  const chrome = easeOutCubic(p / 0.18);
  const draw = easeInOutCubic(p);
  const { path, head } = revealPath(layout, draw);
  const first = points[0];
  const last = points[points.length - 1];
  // a dot is full once the head reaches it (fades in over the 0.06 of draw just
  // before, so the LAST dot — frac=1 — is fully visible at draw=1). The FIRST dot
  // (frac=0) is special-cased to pop a touch AFTER the start, not at draw=0, so
  // nothing shows before the trace begins.
  const dotOp = (pt: { index: number; cum: number }) =>
    pt.index === 0
      ? clamp01((draw - 0.04) / 0.05)
      : clamp01((draw - pt.cum / totalLen) / 0.06 + 1);
  const endLabelOp = clamp01((draw - 0.92) / 0.08);
  const startLabelOp = clamp01((draw - 0.04) / 0.06);

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
        {/* gridlines + axes (wipe in) */}
        <g opacity={chrome * 0.6}>
          {layout.yTicks.map((t, i) => (
            <line
              key={`gy${i}`}
              x1={0}
              x2={innerWidth}
              y1={t.pos}
              y2={t.pos}
              stroke={COLORS.grid}
              strokeWidth={1}
            />
          ))}
        </g>
        <g opacity={chrome}>
          {layout.yTicks.map((t, i) => (
            <text
              key={`yt${i}`}
              x={-10 * sc}
              y={t.pos}
              dy="0.32em"
              textAnchor="end"
              fontSize={ts.axis}
              fill={COLORS.muted}
            >
              {t.label}
            </text>
          ))}
          {layout.xTicks.map((t, i) => (
            <text
              key={`xt${i}`}
              x={t.pos}
              y={innerHeight + 20 * sc}
              textAnchor="middle"
              fontSize={ts.axis}
              fill={COLORS.muted}
            >
              {t.label}
            </text>
          ))}
          {/* axis titles */}
          <text
            x={innerWidth / 2}
            y={innerHeight + 42 * sc}
            textAnchor="middle"
            fontSize={ts.axis}
            fontWeight={600}
            fill={COLORS.ink}
          >
            {config.xLabel}
          </text>
          <text
            transform={`translate(${-46 * sc},${innerHeight / 2}) rotate(-90)`}
            textAnchor="middle"
            fontSize={ts.axis}
            fontWeight={600}
            fill={COLORS.ink}
          >
            {config.yLabel}
          </text>
        </g>

        {/* the trajectory path (drawing on) */}
        <path
          className="connected-path"
          d={path}
          fill="none"
          stroke={ACCENT}
          strokeWidth={2.5 * sc}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* dots — pop in as the head passes */}
        {points.map((pt) => (
          <circle
            key={`d${pt.index}`}
            cx={pt.cx}
            cy={pt.cy}
            r={(interactive ? 6 : 5) * sc}
            fill={ACCENT}
            opacity={dotOp(pt)}
            tabIndex={interactive ? 0 : undefined}
            role={interactive ? "img" : undefined}
            aria-label={
              interactive
                ? `${pt.label}: ${config.xLabel} ${pt.xVal}, ${config.yLabel} ${pt.yVal}`
                : undefined
            }
            style={interactive ? { cursor: "pointer" } : undefined}
            onMouseEnter={interactive ? () => setHover(pt.index) : undefined}
            onMouseLeave={interactive ? () => setHover(null) : undefined}
            onFocus={interactive ? () => setHover(pt.index) : undefined}
            onBlur={interactive ? () => setHover(null) : undefined}
          />
        ))}

        {/* draw-head — only WHILE tracing (hidden before it starts and once the
            trajectory lands, so the start shows nothing and the end shows the
            real last dot, not the head) */}
        {draw > 0.01 && draw < 0.995 && (
          <circle
            cx={head.x}
            cy={head.y}
            r={4 * sc}
            fill={COLORS.head}
            stroke={ACCENT}
            strokeWidth={2 * sc}
          />
        )}

        {/* start + end direction labels — placed INTO the plot (start to the
            right of its dot so it clears the y-axis; end to the left so it clears
            the right edge), with a white halo to sit cleanly over the path. */}
        <text
          x={first.cx + 12 * sc}
          y={first.cy}
          dy="0.32em"
          textAnchor="start"
          fontSize={ts.axis}
          fontWeight={700}
          fill={COLORS.ink}
          stroke="#fff"
          strokeWidth={3 * sc}
          style={{ paintOrder: "stroke" }}
          opacity={startLabelOp}
        >
          {first.label}
        </text>
        <text
          x={last.cx - 12 * sc}
          y={last.cy}
          dy="0.32em"
          textAnchor="end"
          fontSize={ts.axis}
          fontWeight={700}
          fill={ACCENT}
          stroke="#fff"
          strokeWidth={3 * sc}
          style={{ paintOrder: "stroke" }}
          opacity={endLabelOp}
        >
          {last.label}
        </text>
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
  layout: ConnectedScatterLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: ConnectedScatterConfig;
}) {
  const pt = layout.points[hover];
  const left = padding.left + pt.cx;
  const top = padding.top + pt.cy - 10;
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
      <strong>{pt.label}</strong>
      <div style={{ opacity: 0.8, fontSize: 11 }}>
        {config.xLabel}: {pt.xVal}
      </div>
      <div style={{ opacity: 0.8, fontSize: 11 }}>
        {config.yLabel}: {pt.yVal}
      </div>
    </div>
  );
}
