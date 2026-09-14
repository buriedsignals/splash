/**
 * One frame of « La moitié de l'Europe est à moins de 132 km de la mer » — the title card, then the land swept from
 * every coast, ending on the lines with their numbers (BRIEF.md).
 *
 * THE LAYERS, the scrolly's: the study land and the land outside the measurement at the bottom; the swept fill a
 * canvas over them, painted from the field's raster at this frame's level, its front in the rim's colour; one SVG on
 * top paints the sea (the frame minus every land ring) so the 6 km cells never show a staircase on the water, then
 * the lines, the numbers, the farthest point, the key, the credit and the title card.
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: every position, size and colour comes from `build.mjs`; what moves is `sceneAt`.
 */

import { type Ref, useLayoutEffect, useMemo, useRef } from "react";
import { sceneAt } from "./scene.mjs";

type Register = { fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; letterSpacing: number; lead: number };
type Line = { text: string; x: number; y: number; width: number };
type Slot = "display" | "eyebrow" | "value" | "axis" | "source";

export type ContourFrameProps = {
  frame: { width: number; height: number };
  viewBox: { x: number; y: number; w: number; h: number };
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
    text: Record<"eyebrow" | "title" | "count" | "key" | "label" | "median" | "source", string>;
  };
  strokes: { line: number; median: number; dot: number };
  land: { study: string[]; other: string[] };
  lines: Array<{ level: number; d: string }>;
  levels: Array<{ level: number }>;
  medianLevel: number;
  yielding: number[];
  labels: Record<string, { text: string; width: number; x: number; y: number; halo: number }>;
  summit: { x: number; y: number; line: Line };
  raster: { x: number; y: number; width: number; height: number; cols: number; rows: number; stepKm: number; bytes: string; rimKm: number };
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

const rgb = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));

/** The swept fill at `level`: a raster cell is filled when its distance to the sea is under the level, the last
 *  `rimKm` in the rim's colour so an edge is seen advancing. */
function Sweep({ raster, level, tint, rim, opacity, front }: { raster: ContourFrameProps["raster"]; level: number; tint: string; rim: string; opacity: number; front: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const bytes = useMemo(() => Uint8Array.from(atob(raster.bytes), (c) => c.charCodeAt(0)), [raster.bytes]);
  useLayoutEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const image = ctx.createImageData(raster.cols, raster.rows);
    const px = image.data;
    const [tr, tg, tb] = rgb(tint);
    const [rr, rg, rb] = rgb(rim);
    for (let i = 0, j = 0; i < bytes.length; i++, j += 4) {
      const b = bytes[i];
      if (b === 0) continue;
      const inside = level - (b - 1) * raster.stepKm;
      if (inside < 0) continue;
      const edge = front && inside < raster.rimKm;
      px[j] = edge ? rr : tr;
      px[j + 1] = edge ? rg : tg;
      px[j + 2] = edge ? rb : tb;
      px[j + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
  }, [bytes, level, tint, rim, front, raster]);
  return <canvas ref={canvas} width={raster.cols} height={raster.rows} style={{ position: "absolute", left: raster.x, top: raster.y, width: raster.width, height: raster.height, opacity }} />;
}

export function ContourFrame(props: ContourFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, viewBox: vb, registers: r, colours, strokes, legend, credit, titleCard } = props;
  const scene = sceneAt(props as never, props.at);
  const vbAttr = `${vb.x} ${vb.y} ${vb.w} ${vb.h}`;
  const counted = scene.count;
  const countText = legend.template.replace("{p}", String(counted.p)).replace("{km}", String(counted.km));
  const allLand = [...props.land.study, ...props.land.other].join("");
  const sea = `M${vb.x} ${vb.y}h${vb.w}v${vb.h}h${-vb.w}Z${allLand}`;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: frame.width, height: frame.height, background: colours.ground }}>
      <svg style={{ position: "absolute", left: 0, top: 0 }} width={frame.width} height={frame.height} viewBox={vbAttr} preserveAspectRatio="none">
        {props.land.other.map((d, i) => (
          <path key={`other${i}`} d={d} fill={colours.outside} />
        ))}
        {props.land.study.map((d, i) => (
          <path key={`study${i}`} d={d} fill={colours.land} />
        ))}
      </svg>
      <Sweep raster={props.raster} level={scene.level} tint={colours.tint} rim={colours.rim} opacity={scene.tint} front={scene.level < props.deepest} />
      <svg ref={props.svgRef} style={{ position: "absolute", left: 0, top: 0 }} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
        <svg width={frame.width} height={frame.height} viewBox={vbAttr} preserveAspectRatio="none">
          <path d={sea} fill={colours.ground} fillRule="evenodd" />
          {props.land.other.map((d, i) => (
            <path key={`other-top${i}`} d={d} fill={colours.outside} />
          ))}
          {props.lines.map(({ level, d }) => (
            <path key={`line${level}`} d={d} fill="none" stroke={colours.lines[level]} strokeWidth={level === props.medianLevel ? strokes.median : strokes.line} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity={scene.lines[level]} />
          ))}
        </svg>
        {props.levels.map(({ level }) => {
          const label = props.labels[level];
          if (!label) return null;
          const median = level === props.medianLevel;
          return <Word key={`label${level}`} line={label} register={r.axis} fill={median ? colours.text.median : colours.text.label} opacity={scene.labels[level]} anchor="middle" halo={{ colour: colours.land, width: label.halo }} />;
        })}
        <g opacity={scene.summit}>
          <circle cx={props.summit.x} cy={props.summit.y} r={strokes.dot} fill={colours.text.median} stroke={colours.land} strokeWidth={strokes.line} />
          <circle cx={props.summit.x} cy={props.summit.y} r={2.2 * strokes.dot} fill="none" stroke={colours.text.median} strokeWidth={strokes.line} />
          <Word line={props.summit.line} register={r.value} fill={colours.text.median} halo={{ colour: colours.land, width: legend.valueHalo }} />
        </g>

        {/* ── THE KEY: the count, and « hors mesure ». ── */}
        <g transform={`translate(${legend.at.x} ${legend.at.y})`} opacity={scene.furniture}>
          <Word line={{ text: legend.widths[countText].text, x: legend.count.x, y: legend.count.y, width: legend.widths[countText].width }} register={r.value} fill={colours.text.count} halo={{ colour: colours.ground, width: legend.valueHalo }} />
          <rect x={legend.swatch.x} y={legend.swatch.y} width={legend.swatch.width} height={legend.swatch.height} fill={colours.outside} />
          <Word line={legend.outside} register={r.axis} fill={colours.text.key} halo={{ colour: colours.ground, width: legend.halo }} />
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
