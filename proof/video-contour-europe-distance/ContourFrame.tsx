/**
 * One frame of « La moitié de l'Europe est à moins de 132 km de la mer » — the title card, then the land swept from
 * every coast, ending on the lines with their numbers (BRIEF.md).
 *
 * THE MAP IS THE CALLER'S (`liveMap`: the live MapTiler map in the composition — the land, the sweep, the lines, their
 * numbers and the farthest point, every one a MapLibre layer; nothing in the Bun tests). Over it, one SVG: the key, the
 * curve, the credit and the title card.
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: every position, size and colour comes from `build.mjs`; what moves is `sceneAt`.
 */

import type { ReactNode, Ref } from "react";
import { sceneAt } from "./scene.mjs";

type Register = { fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; letterSpacing: number; lead: number };
type Line = { text: string; x: number; y: number; width: number };
type Slot = "display" | "eyebrow" | "value" | "axis" | "source";

export type ContourFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  legend: {
    at: { x: number; y: number };
    halo: number;
    valueHalo: number;
    count: { x: number; y: number };
    template: string;
    widths: Record<string, { text: string; width: number }>;
    final: string;
    finalWidth: number;
    swatch: { x: number; y: number; width: number; height: number };
    outside: Line;
  };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: {
    ground: string;
    land: string;
    outside: string;
    tint: string;
    rim: string;
    lines: Record<string, string>;
    text: Record<"eyebrow" | "title" | "count" | "key" | "label" | "median" | "source" | "axis", string>;
  };
  strokes: { line: number; median: number; dot: number };
  /** The curve: the share of the land within each distance of the sea, traced to the sweep's front. */
  chart: { x: number; y: number; width: number; height: number; plot: { left: number; right: number; top: number; bottom: number }; maxKm: number; path: string; area: string; median: { x: number; y: number } };
  layoutInset: { x: number; y: number };
  levels: Array<{ level: number }>;
  medianLevel: number;
  yielding: number[];
  /** Each line's number, seated in Bun on the measured map: drawn by the map, kept here for the tests. */
  labels: Record<string, { text: string; width: number; x: number; y: number; halo: number }>;
  summit: { x: number; y: number; line: Line };
  cameras: { whole: Record<string, number> };
  mapPlan: { layers: Array<{ id: string; bindings?: Record<string, unknown> }> } & Record<string, unknown>;
  /** The sweep's raster on the map's Web Mercator grid: one byte a texel, `1 + distance / stepKm` over the study land. */
  sweep: { cols: number; rows: number; stepKm: number; rimKm: number; coordinates: [number, number][]; bytes: string };
  within: number[];
  deepest: number;
  states: Record<string, number>[];
  timing: unknown;
};

function Word({ line, register, fill, opacity = 1, anchor, halo, measured = true }: { line: Line; register: Register; fill: string; opacity?: number; anchor?: "middle"; halo?: { colour: string; width: number }; measured?: boolean }) {
  return (
    <text
      textAnchor={anchor}
      x={line.x}
      y={line.y}
      fontFamily={register.fontFamily}
      fontSize={register.fontSize}
      fontWeight={register.fontWeight}
      fontStyle={register.fontStyle}
      letterSpacing={register.letterSpacing}
      fill={fill}
      opacity={opacity}
      stroke={halo?.colour}
      strokeWidth={halo?.width}
      strokeLinejoin={halo ? "round" : undefined}
      paintOrder={halo ? "stroke" : undefined}
      data-width={measured ? line.width : undefined}
    >
      {line.text}
    </text>
  );
}

export function ContourFrame(props: ContourFrameProps & { at: number; liveMap: (frame: number) => ReactNode; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, strokes, legend, credit, titleCard } = props;
  const scene = sceneAt(props as never, props.at);
  const counted = scene.count;
  const countText = legend.template.replace("{p}", String(counted.p)).replace("{km}", String(counted.km));

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: frame.width, height: frame.height, background: colours.ground }}>
      {props.liveMap(props.at)}
      <svg ref={props.svgRef} style={{ position: "absolute", left: 0, top: 0 }} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
        {/* ── THE KEY: the count, and « hors mesure ». ── */}
        <g transform={`translate(${legend.at.x} ${legend.at.y})`} opacity={scene.furniture}>
          <Word line={{ text: legend.widths[countText].text, x: legend.count.x, y: legend.count.y, width: legend.widths[countText].width }} register={r.value} fill={colours.text.count} halo={{ colour: colours.ground, width: legend.valueHalo }} />
          <rect x={legend.swatch.x} y={legend.swatch.y} width={legend.swatch.width} height={legend.swatch.height} fill={colours.outside} />
          <Word line={legend.outside} register={r.axis} fill={colours.text.key} halo={{ colour: colours.ground, width: legend.halo }} />
        </g>

        {/* ── THE CURVE: traced to the front, the median's guides once it lands. ── */}
        <g opacity={scene.furniture}>
          <defs>
            <clipPath id="contour-curve">
              <rect x={props.chart.x} y={props.chart.y - strokes.median} width={Math.max(0, scene.chart.head.x - props.chart.x)} height={props.chart.height + 2 * strokes.median} />
            </clipPath>
          </defs>
          <line x1={props.chart.plot.left} x2={props.chart.plot.right} y1={props.chart.plot.bottom} y2={props.chart.plot.bottom} stroke={colours.text.axis} strokeWidth={strokes.line} />
          <line x1={props.chart.plot.left} x2={props.chart.plot.left} y1={props.chart.plot.top} y2={props.chart.plot.bottom} stroke={colours.text.axis} strokeWidth={strokes.line} />
          <g clipPath="url(#contour-curve)" opacity={scene.chart.shown}>
            <path d={props.chart.area} fill={colours.tint} opacity={0.8} />
            <path d={props.chart.path} fill="none" stroke={colours.text.count} strokeWidth={strokes.median} strokeLinejoin="round" />
          </g>
          <g opacity={scene.chart.guides}>
            <path d={`M${props.chart.median.x} ${props.chart.plot.bottom}V${props.chart.median.y}H${props.chart.plot.left}`} fill="none" stroke={colours.text.median} strokeWidth={strokes.line} strokeDasharray={`${4 * strokes.line} ${3 * strokes.line}`} />
          </g>
          <circle cx={scene.chart.head.x} cy={scene.chart.head.y} r={1.6 * strokes.dot} fill={colours.text.count} opacity={scene.chart.shown} />
        </g>

        <g transform={`translate(${credit.at.x} ${credit.at.y})`} opacity={scene.source}>
          {credit.lines.map((line, i) => (
            <Word key={`credit${i}`} line={line} register={r.source} fill={colours.text.source} halo={{ colour: colours.ground, width: credit.halo }} />
          ))}
        </g>

        <g opacity={scene.title}>
          <rect width={frame.width} height={frame.height} fill={colours.ground} />
          <Word line={titleCard.eyebrow} register={r.eyebrow} fill={colours.text.eyebrow} />
          {titleCard.title.map((line, i) => (
            <Word key={`title${i}`} line={line} register={titleCard.register} fill={colours.text.title} />
          ))}
        </g>
      </svg>
    </div>
  );
}
