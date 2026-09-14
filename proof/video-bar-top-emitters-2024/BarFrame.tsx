/**
 * One frame of « La Chine a émis plus de CO₂ que les cinq pays suivants réunis » — the title card, the ten names, the bars
 * growing from the tenth to the first as each counts its value, then the next five lining up end to end under the first,
 * their sum counting (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { Ref } from "react";
import { blend } from "../video-cartogram-europe-lowcarbon/scene.mjs";
import { sceneAt, valueText } from "./scene.mjs";

type Register = { fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; letterSpacing: number; lead: number };
type Line = { text: string; x: number; y: number; width: number };
type Slot = "display" | "eyebrow" | "value" | "axis" | "source";

export type BarFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: { ground: string; grid: string; column: string; first: string; faded: string; rule: string; text: Record<"eyebrow" | "title" | "name" | "axis" | "first" | "count", string> };
  left: number;
  unit: number;
  seam: number;
  pileY: number;
  barH: number;
  bars: Array<{ value: number; y: number; stacked: number | null; before: number; name: Line }>;
  pileNames: Array<Line & { leader: { x1: number; y1: number; x2: number; y2: number } | null }>;
  firstEnd: number;
  rows: { first: number; pile: number };
  combined: number;
  countWidths: Record<string, number>;
  countGap: number;
  valueShift: number;
  strokes: { rule: number; grid: number };
  dash: number[];
  halo: { value: number; axis: number };
  states: Record<string, number>[];
  timing: unknown;
};

function Text({ line, register, fill, opacity = 1, halo }: { line: Line; register: Register; fill: string; opacity?: number; halo?: { colour: string; width: number } }) {
  return (
    <text x={line.x} y={line.y} fontFamily={register.fontFamily} fontSize={register.fontSize} fontWeight={register.fontWeight} fontStyle={register.fontStyle} letterSpacing={register.letterSpacing} fill={fill} opacity={opacity} stroke={halo?.colour} strokeWidth={halo?.width} strokeLinejoin={halo ? "round" : undefined} paintOrder={halo ? "stroke" : undefined} data-width={line.width}>
      {line.text}
    </text>
  );
}

const NB = "\u00A0";
const withUnit = (text: string) => `${text}${NB}Gt`;

export function BarFrame(props: BarFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, credit, titleCard } = props;
  const scene = sceneAt(props as never, props.at);
  const valueHalo = { colour: colours.ground, width: props.halo.value };
  const axisHalo = { colour: colours.ground, width: props.halo.axis };
  const count = (text: string, x: number, y: number) => ({ text, width: props.countWidths[text], x, y });
  const after = (i: number) => i > 0 && props.bars[i].stacked === null;
  const sumText = withUnit(valueText(scene.sum));
  /** The sum stands past the pile's front: the blocks landed, and a block about to land. */
  const pileFront = Math.max(props.left + scene.sum * props.unit, ...props.bars.map((b, i) => (b.stacked !== null && scene.bars[i].move > 0.5 ? scene.bars[i].x + scene.bars[i].w : 0)));

  return (
    <svg ref={props.svgRef} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
      <rect width={frame.width} height={frame.height} fill={colours.ground} />
      <g opacity={scene.furniture}>
        <line x1={props.left} x2={props.left} y1={props.rows.first - props.barH * 0.3} y2={props.bars[props.bars.length - 1].y + props.barH * 1.3} stroke={colours.grid} strokeWidth={props.strokes.grid} />
        {props.bars.map((b, i) => (
          <Text key={`name${i}`} line={b.name} register={r.axis} fill={after(i) ? blend(colours.text.name, colours.text.axis, scene.stepBack) : colours.text.name} opacity={1 - scene.bars[i].move} />
        ))}
      </g>

      {props.bars.map((b, i) => {
        const s = scene.bars[i];
        const fill = i === 0 ? colours.first : after(i) ? blend(colours.column, colours.faded, scene.stepBack) : colours.column;
        return s.w > 0 ? <rect key={`bar${i}`} x={s.x} y={s.y} width={s.w} height={props.barH} fill={fill} /> : null;
      })}
      {props.bars.map((b, i) => {
        const s = scene.bars[i];
        if (!(s.up > 0)) return null;
        const text = withUnit(valueText(s.count));
        const opacity = b.stacked === null ? (after(i) ? 1 - 0.6 * scene.stepBack : 1) : Math.max(0, 1 - s.move * 4);
        return <Text key={`count${i}`} line={count(text, props.left + s.w + props.countGap, b.y + props.barH / 2 + props.valueShift)} register={r.value} fill={i === 0 ? colours.text.first : colours.text.count} opacity={opacity} halo={valueHalo} />;
      })}

      <line x1={props.firstEnd} x2={props.firstEnd} y1={props.rows.first} y2={props.rows.pile} stroke={colours.rule} strokeWidth={props.strokes.rule} strokeDasharray={props.dash.join(" ")} opacity={scene.stacking} />
      {props.pileNames.map((p, j) => {
        const bar = props.bars.find((b) => b.stacked === j);
        const landed = bar ? scene.bars[props.bars.indexOf(bar)].move : 0;
        const opacity = Math.max(0, landed * 4 - 3);
        return (
          <g key={`pile${j}`} opacity={opacity}>
            {p.leader ? <line x1={p.leader.x1} y1={p.leader.y1} x2={p.leader.x2} y2={p.leader.y2} stroke={colours.text.axis} strokeWidth={props.strokes.grid} /> : null}
            <Text line={p} register={r.axis} fill={colours.text.name} halo={axisHalo} />
          </g>
        );
      })}
      <Text line={count(sumText, pileFront + props.countGap, props.pileY + props.barH / 2 + props.valueShift)} register={r.value} fill={colours.text.count} opacity={scene.landed > 0 ? 1 : 0} halo={valueHalo} />

      <g transform={`translate(${credit.at.x} ${credit.at.y})`} opacity={scene.source}>
        {credit.lines.map((line, i) => (
          <Text key={`credit${i}`} line={line} register={r.source} fill={colours.text.axis} halo={{ colour: colours.ground, width: credit.halo }} />
        ))}
      </g>

      <g opacity={scene.title}>
        <rect width={frame.width} height={frame.height} fill={colours.ground} />
        <Text line={titleCard.eyebrow} register={r.eyebrow} fill={colours.text.eyebrow} />
        {titleCard.title.map((line, i) => (
          <Text key={`title${i}`} line={line} register={titleCard.register} fill={colours.text.title} />
        ))}
      </g>
    </svg>
  );
}
