// THE one pictogram / isotype component — magnitude as a COUNT of equal icons,
// one row per category, each icon a fixed unit (e.g. 1 figure = 10,000 people).
// Icon count ∝ value; every icon is the SAME size (count, never size, encodes the
// value — checkPictogramConformance), the last icon clipped to the remainder, and
// a visible key states the unit. D3 = math (pictogram-geometry.ts), React = DOM;
// one master `progress` fills the icons left→right. responsive=false = fixed.
//
// Recipe step 5 (global vs type):
//   - GLOBAL invariants reused: title=insight + Okabe-Ito + source + WCAG
//     (ChartFrame + checkPictogramConformance), scale via resolveFrame,
//     formatNumber, core/text.
//   - TYPE-specific: the icon grid, count=value/unit with a partial last icon, the
//     equal-size rule, the stated unit key, and the fill-left→right reveal.
import { useState } from "react";
import {
  computePictogramLayout,
  iconFill,
  type PictogramData,
  type PictogramLayout,
} from "./pictogram-geometry";
import {
  clamp01,
  easeInOutCubic,
  easeOutCubic,
  formatNumber,
} from "./core/math";
import { COLORS, FONT, TYPE, OKABE_ITO } from "./core/tokens";
import { ChartFrame } from "./core/ChartFrame";
import { resolveFrame, resolveFrameWithHeader } from "./core/format";
import { truncate } from "./core/text";

export interface PictogramConfig {
  title: string;
  source: { name: string; url: string };
  unit: string; // subtitle
  categoryField: string;
  valueField: string;
  unitPerIcon: number;
  iconNoun: string; // e.g. "residents" — used in the key and tooltip
  rows: Record<string, string | number>[];
}

export interface PictogramChartProps {
  config: PictogramConfig;
  progress?: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  responsive?: boolean;
  scale?: number;
}

const ICON_COLOR = OKABE_ITO.blue;

// one isotype figure (head + body) inside a [x, x+size] × [y, y+size] box
function Figure({
  x,
  y,
  size,
  color,
  opacity,
  clipId,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
  clipId?: string;
}) {
  return (
    <g opacity={opacity} clipPath={clipId ? `url(#${clipId})` : undefined}>
      <circle
        cx={x + size / 2}
        cy={y + size * 0.17}
        r={size * 0.15}
        fill={color}
      />
      <rect
        x={x + size * 0.25}
        y={y + size * 0.36}
        width={size * 0.5}
        height={size * 0.58}
        rx={size * 0.17}
        fill={color}
      />
    </g>
  );
}

export function PictogramChart({
  config,
  progress = 1,
  width = 840,
  height = 480,
  interactive = false,
  responsive = false,
  scale = 1,
}: PictogramChartProps) {
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
    top: responsive ? 16 : 50 + titleLines * 27,
    right: 52, // row value labels
    bottom: 30 + 30, // unit key + source clearance
    left: 120, // category labels
  };
  const frame = resolveFrameWithHeader(config.title, config.unit, width, height, basePad, scale, undefined, responsive);
  const padding = frame.pad;
  const ts = frame.type;
  const sc = frame.scale;

  const data: PictogramData = {
    categoryField: config.categoryField,
    valueField: config.valueField,
    unitPerIcon: config.unitPerIcon,
    rows: config.rows,
  };
  const layout = computePictogramLayout(data, { width, height, padding });

  const [hover, setHover] = useState<number | null>(null);

  const svg = (
    <PictogramSvg
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

function PictogramSvg({
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
  layout: PictogramLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  p: number;
  config: PictogramConfig;
  interactive: boolean;
  hover: number | null;
  setHover: (i: number | null) => void;
  ts: { title: number; axis: number; label: number; source: number };
  sc: number;
}) {
  const { innerWidth, innerHeight, rows, iconSize, cellW, maxCols } = layout;
  const chrome = easeOutCubic(p / 0.18);
  const reveal = easeInOutCubic(p);
  const labelW = padding.left - 12 * sc;
  const keyY = innerHeight + 20 * sc;

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={config.title}
      style={{ position: "absolute", inset: 0, display: "block" }}
    >
      <title>{config.title}</title>
      <defs>
        {rows.map((r) =>
          r.frac > 0 ? (
            <clipPath key={`clip${r.index}`} id={`pico-partial-${r.index}`}>
              <rect
                x={r.fullIcons * cellW}
                y={r.y - iconSize / 2}
                width={iconSize * r.frac}
                height={iconSize}
              />
            </clipPath>
          ) : null,
        )}
      </defs>
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* one row of figures per category */}
        {rows.map((r) => {
          const focused = interactive && hover === r.index;
          const dim = interactive && hover !== null && !focused;
          const top = r.y - iconSize / 2;
          const figs = [];
          for (let c = 0; c < r.fullIcons; c++) {
            const op = clamp01((reveal * maxCols - c) / 0.7);
            if (op <= 0) continue;
            figs.push(
              <Figure
                key={`f${r.index}-${c}`}
                x={c * cellW}
                y={top}
                size={iconSize}
                color={ICON_COLOR}
                opacity={op}
              />,
            );
          }
          if (r.frac > 0) {
            const c = r.fullIcons;
            const op = clamp01((reveal * maxCols - c) / 0.7);
            if (op > 0)
              figs.push(
                <Figure
                  key={`f${r.index}-partial`}
                  x={c * cellW}
                  y={top}
                  size={iconSize}
                  color={ICON_COLOR}
                  opacity={op}
                  clipId={`pico-partial-${r.index}`}
                />,
              );
          }
          return (
            <g
              key={`r${r.index}`}
              opacity={dim ? 0.4 : 1}
              tabIndex={interactive ? 0 : undefined}
              role={interactive ? "img" : undefined}
              aria-label={
                interactive
                  ? `${r.category}: ${formatNumber(r.value)} ${config.iconNoun}`
                  : undefined
              }
              style={
                interactive ? { cursor: "pointer", outline: "none" } : undefined
              }
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
                fontWeight={600}
                fill={COLORS.ink}
                opacity={chrome}
              >
                {truncate(r.category, labelW, ts.axis)}
              </text>
              {figs}
              {/* row value label, lands as the row fills */}
              <text
                x={r.count * cellW + 8 * sc}
                y={r.y}
                dy="0.32em"
                textAnchor="start"
                fontSize={ts.source}
                fontWeight={600}
                fill={COLORS.muted}
                opacity={clamp01((reveal * maxCols - r.count) / 0.6)}
              >
                {formatNumber(r.value)}
              </text>
            </g>
          );
        })}

        {/* the unit key — makes "each figure = N" explicit (chart-legend) */}
        <g className="chart-legend" opacity={chrome}>
          <Figure
            x={0}
            y={keyY - iconSize / 2}
            size={Math.min(iconSize, 18 * sc)}
            color={ICON_COLOR}
            opacity={1}
          />
          <text
            x={Math.min(iconSize, 18 * sc) + 8 * sc}
            y={keyY}
            dy="0.32em"
            fontSize={ts.axis}
            fontWeight={600}
            fill={COLORS.ink}
          >
            = {formatNumber(layout.unitPerIcon)} {config.iconNoun}
          </text>
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
  layout: PictogramLayout;
  padding: { top: number; right: number; bottom: number; left: number };
  hover: number;
  config: PictogramConfig;
}) {
  const r = layout.rows.find((x) => x.index === hover);
  if (!r) return null;
  const left = padding.left + (r.count * layout.cellW) / 2;
  const top = padding.top + r.y - layout.iconSize / 2 - 10;
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
      <strong style={{ fontSize: 13 }}>{r.category}</strong>
      <span style={{ fontSize: 11, opacity: 0.85, marginLeft: 6 }}>
        {formatNumber(r.value)} {config.iconNoun}
      </span>
    </div>
  );
}
