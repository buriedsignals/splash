/**
 * One frame of « La moitié du CO₂ suisse depuis 1858 a été émise après 1986 » — the title card, the surface filling
 * year by year while the stock counts up, then split at 1986 into two halves named with their shares (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { Ref } from "react";
import { sceneAt } from "./scene.mjs";

type Register = { fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; letterSpacing: number; lead: number };
type Line = { text: string; x: number; y: number; width: number };
type Slot = "display" | "eyebrow" | "value" | "axis" | "annot" | "source";

export type AreaFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: { ground: string; grid: string; later: string; earlier: string; rule: string; text: Record<"eyebrow" | "title" | "stock" | "axis" | "rule" | "before" | "after", string> };
  strokes: { grid: number; rule: number };
  plot: { left: number; top: number; right: number; bottom: number };
  points: Array<{ year: number; x: number; y: number }>;
  baseY: number;
  ruleX: number;
  ruleYear: Line;
  ticksY: Array<Line & { baseline: number }>;
  ticksX: Array<Line & { tickX: number }>;
  stock: { at: { x: number; y: number }; texts: Record<string, { text: string; width: number }> };
  beforeLabel: Line[];
  afterLabel: Line[];
  halo: number;
  states: Record<string, number>[];
  timing: unknown;
};

function Word({ line, register, fill, opacity = 1, halo }: { line: Line; register: Register; fill: string; opacity?: number; halo?: { colour: string; width: number } }) {
  return (
    <text x={line.x} y={line.y} fontFamily={register.fontFamily} fontSize={register.fontSize} fontWeight={register.fontWeight} fontStyle={register.fontStyle} letterSpacing={register.letterSpacing} fill={fill} opacity={opacity} stroke={halo?.colour} strokeWidth={halo?.width} strokeLinejoin={halo ? "round" : undefined} paintOrder={halo ? "stroke" : undefined} data-width={line.width}>
      {line.text}
    </text>
  );
}

export function AreaFrame(props: AreaFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, strokes, plot, credit, titleCard } = props;
  const scene = sceneAt(props as never, props.at);
  const halo = { colour: colours.ground, width: props.halo };
  const stockText = props.stock.texts[String(scene.year)];

  return (
    <svg ref={props.svgRef} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
      <defs>
        <clipPath id="area-earlier">
          <rect x={0} y={0} width={props.ruleX} height={frame.height} />
        </clipPath>
      </defs>
      <rect width={frame.width} height={frame.height} fill={colours.ground} />

      <g opacity={scene.furniture}>
        {props.ticksY.map((t, i) => (
          <g key={`ty${i}`}>
            <line x1={plot.left} x2={plot.right} y1={t.y} y2={t.y} stroke={colours.grid} strokeWidth={strokes.grid} />
            <Word line={{ ...t, y: t.baseline }} register={r.axis} fill={colours.text.axis} />
          </g>
        ))}
        {props.ticksX.map((t, i) => (
          <Word key={`tx${i}`} line={t} register={r.axis} fill={colours.text.axis} />
        ))}
      </g>

      {/* ── THE SURFACE: filled in the accent, the earlier half stepping back to its tint at the split. ── */}
      <path d={scene.surface} fill={colours.later} />
      <path d={scene.surface} fill={colours.earlier} clipPath="url(#area-earlier)" opacity={scene.split} />
      <g opacity={scene.split}>
        <line x1={props.ruleX} x2={props.ruleX} y1={plot.top} y2={plot.bottom} stroke={colours.rule} strokeWidth={strokes.rule} />
        <Word line={props.ruleYear} register={r.axis} fill={colours.text.rule} halo={halo} />
        {props.beforeLabel.map((l, i) => (
          <Word key={`before${i}`} line={l} register={r.annot} fill={colours.text.before} />
        ))}
        {props.afterLabel.map((l, i) => (
          <Word key={`after${i}`} line={l} register={r.annot} fill={colours.text.after} />
        ))}
      </g>

      <Word line={{ ...stockText, ...props.stock.at }} register={r.value} fill={colours.text.stock} opacity={scene.stockShown} halo={halo} />

      <g transform={`translate(${credit.at.x} ${credit.at.y})`} opacity={scene.source}>
        {credit.lines.map((line, i) => (
          <Word key={`credit${i}`} line={line} register={r.source} fill={colours.text.axis} halo={{ colour: colours.ground, width: credit.halo }} />
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
  );
}
