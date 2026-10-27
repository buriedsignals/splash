/**
 * One frame of a keyed family's gesture video (interval, multiples, flow, profile): the title card, then the family's
 * scene at the state this frame interpolates between two event states (`keyedStateAt`: eased, a reveal staggered mark
 * by mark), then the credit. Nothing is measured or chosen here: positions and widths come from the runner (Bun).
 */
import type { Ref } from "react";
import { keyedStateAt } from "./gesture-keyed.mjs";
import { KeyedLayer, textAttrs } from "./GestureKeyedPlate.tsx";

type Line = { text: string; x: number; y: number; width: number };

export function GestureKeyedFrame(props: any & { at: number; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: R, titleCard, credit, colours, scene, plotAt, titleInk } = props;
  const state = keyedStateAt({ states: props.states, timing: props.timing, frame: props.at }) as Record<string, number>;
  const T = (line: Line, r: any, fill: string, key: string, extra: Record<string, unknown> = {}) => (
    <text key={key} x={line.x} y={line.y} {...textAttrs(r, fill)} data-width={line.width} {...extra}>
      {line.text}
    </text>
  );
  const halo = { stroke: colours.ground, strokeWidth: credit.halo, strokeLinejoin: "round", paintOrder: "stroke" };
  return (
    <svg ref={props.svgRef} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
      <rect x={0} y={0} width={frame.width} height={frame.height} fill={colours.ground} />
      <g opacity={state.title ?? 0}>
        {T(titleCard.eyebrow, R.eyebrow, titleInk.eyebrow, "eyebrow")}
        {titleCard.title.map((l: Line, i: number) => T(l, titleCard.register, titleInk.title, `t${i}`))}
      </g>
      <g opacity={state.chart ?? 0}>
        <KeyedLayer scene={scene} state={state} colours={colours} regs={R} x={plotAt.x} y={plotAt.y} measured />
      </g>
      <g opacity={state.credit ?? 0} transform={`translate(${credit.at.x} ${credit.at.y})`}>
        {credit.lines.map((l: Line, i: number) => T(l, R.source, colours.text.muted, `c${i}`, halo))}
      </g>
    </svg>
  );
}
