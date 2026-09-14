/**
 * One frame of « Les seize pays ont tous gagné du bas-carbone depuis 2000 — un seul a doublé la France » — the title card,
 * the sixteen 2000 values on their rail, every line travelling to 2024, then France and Finland picked out and their
 * crossing ringed (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { Ref } from "react";
import { sceneAt } from "./scene.mjs";

type Register = { fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; letterSpacing: number; lead: number };
type Line = { text: string; x: number; y: number; width: number };
type Slot = "display" | "eyebrow" | "axis" | "source";
type End = Line & { cy: number };

export type SlopeFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: { ground: string; rail: string; line: string; pair: string; text: Record<"eyebrow" | "title" | "label" | "pair" | "rail", string> };
  strokes: { line: number; pair: number; rail: number; connector: number };
  rail: { left: number; right: number; top: number; foot: number };
  railLabels: Line[];
  lines: Array<{ key: string; pair: boolean; a: { x: number; y: number }; b: { x: number; y: number }; left: End; right: End }>;
  cross: { x: number; y: number };
  dotR: number;
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

export function SlopeFrame(props: SlopeFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, strokes, rail, credit, titleCard } = props;
  const scene = sceneAt(props as never, props.at);
  const halo = { colour: colours.ground, width: props.halo };
  // The pair is drawn last, over the others.
  const ordered = [...props.lines].sort((a, b) => Number(a.pair) - Number(b.pair));

  return (
    <svg ref={props.svgRef} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
      <rect width={frame.width} height={frame.height} fill={colours.ground} />
      <g opacity={scene.furniture}>
        {[rail.left, rail.right].map((x, i) => (
          <line key={`rail${i}`} x1={x} x2={x} y1={rail.top} y2={rail.foot} stroke={colours.rail} strokeWidth={strokes.rail} />
        ))}
        {props.railLabels.map((l, i) => (
          <Word key={`rl${i}`} line={l} register={r.axis} fill={colours.text.rail} />
        ))}
      </g>

      {ordered.map((d) => {
        const stepped = d.pair ? 1 : 1 - 0.7 * scene.focus;
        const pairInk = d.pair ? scene.focus : 0;
        const stroke = d.pair && scene.focus > 0 ? colours.pair : colours.line;
        const tip = { x: d.a.x + (d.b.x - d.a.x) * scene.travel, y: d.a.y + (d.b.y - d.a.y) * scene.travel };
        return (
          <g key={d.key} opacity={stepped}>
            <g opacity={scene.furniture}>
              <line x1={d.left.x + d.left.width + props.dotR} x2={d.a.x} y1={d.left.cy} y2={d.a.y} stroke={colours.rail} strokeWidth={strokes.connector} />
              <circle cx={d.a.x} cy={d.a.y} r={props.dotR} fill={stroke} />
              <Word line={d.left} register={r.axis} fill={pairInk > 0.5 ? colours.text.pair : colours.text.label} />
            </g>
            <line x1={d.a.x} y1={d.a.y} x2={tip.x} y2={tip.y} stroke={stroke} strokeWidth={d.pair ? strokes.line + (strokes.pair - strokes.line) * pairInk : strokes.line} strokeLinecap="round" opacity={scene.travel > 0 ? 1 : 0} />
            <g opacity={scene.arrived}>
              <line x1={d.b.x} x2={d.right.x - props.dotR} y1={d.b.y} y2={d.right.cy} stroke={colours.rail} strokeWidth={strokes.connector} />
              <circle cx={d.b.x} cy={d.b.y} r={props.dotR} fill={stroke} />
              <Word line={d.right} register={r.axis} fill={pairInk > 0.5 ? colours.text.pair : colours.text.label} />
            </g>
          </g>
        );
      })}
      <circle cx={props.cross.x} cy={props.cross.y} r={props.dotR * 5} fill="none" stroke={colours.pair} strokeWidth={strokes.rail * 2} opacity={scene.focus} />

      <g transform={`translate(${credit.at.x} ${credit.at.y})`} opacity={scene.source}>
        {credit.lines.map((line, i) => (
          <Word key={`credit${i}`} line={line} register={r.source} fill={colours.text.label} halo={{ colour: colours.ground, width: credit.halo }} />
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
