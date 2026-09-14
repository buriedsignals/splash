/**
 * One frame of « La Chine a émis plus de CO₂ que les cinq pays suivants réunis » — the title card, the world's emissions as
 * one bar with the ten largest inside it, the ten falling out into their rows, the scale closing onto them, the next five
 * lining up under China short of its end, then Germany sliding into the gap (BRIEF.md).
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
  colours: { ground: string; grid: string; column: string; first: string; tenth: string; faded: string; rule: string; text: Record<"eyebrow" | "title" | "name" | "axis" | "first" | "count", string> };
  left: number;
  units: { world: number; ten: number };
  seam: number;
  world: number;
  worldY: number;
  worldName: Line;
  pileY: number;
  gapY: number;
  barH: number;
  bars: Array<{ value: number; y: number; inWorld: number; stacked: number | null; before: number; tenth: boolean; name: Line }>;
  pileNames: Array<Line & { leader: { x1: number; y1: number; x2: number; y2: number } | null }>;
  tenthName: Line;
  bracket: { x: number; y1: number; y2: number; tick: number };
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
  const firstEnd = props.left + props.bars[0].value * scene.unit;
  const sumText = withUnit(valueText(scene.sum));
  const pileFront = Math.max(props.left + scene.sum * scene.unit, ...props.bars.map((b, i) => (b.stacked !== null && scene.bars[i].move > 0.5 ? scene.bars[i].x + scene.bars[i].w : 0)));
  const worldGoing = 1 - Math.min(1, scene.bars[0].fall * 3);

  return (
    <svg ref={props.svgRef} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
      <defs>
        <clipPath id="plot">
          <rect x={props.left} y={0} width={frame.width - props.left} height={frame.height} />
        </clipPath>
      </defs>
      <rect width={frame.width} height={frame.height} fill={colours.ground} />
      <g opacity={scene.furniture}>
        <line x1={props.left} x2={props.left} y1={props.worldY - props.barH * 0.3} y2={props.bars[props.bars.length - 1].y + props.barH * 1.3} stroke={colours.grid} strokeWidth={props.strokes.grid} />
        <Text line={props.worldName} register={r.axis} fill={colours.text.name} opacity={worldGoing} />
        {props.bars.map((b, i) => {
          const s = scene.bars[i];
          const out = b.tenth ? 0 : s.move;
          const faded = (after(i) && !b.tenth) || (b.tenth && scene.back > 0) ? scene.stepBack : 0;
          return <Text key={`name${i}`} line={b.name} register={r.axis} fill={blend(colours.text.name, colours.text.axis, faded)} opacity={s.landed * (1 - out) * (b.tenth ? 1 - s.slide : 1)} />;
        })}
      </g>

      <g clipPath="url(#plot)">
        {/* The rest of the world: what stays up once the ten have fallen out, running out of the frame as the scale closes. */}
        {scene.world.restW > 0 ? <rect x={scene.world.restX} y={props.worldY} width={scene.world.restW} height={props.barH} fill={colours.faded} /> : null}
        {props.bars.map((b, i) => {
          const s = scene.bars[i];
          if (!(s.w > 0)) return null;
          const fill = i === 0 ? colours.first : after(i) && !b.tenth ? blend(colours.column, colours.faded, scene.stepBack) : b.tenth ? blend(blend(colours.column, colours.faded, scene.stepBack), colours.tenth, s.slide) : colours.column;
          // Inside the world bar, a seam of the ground parts each of the ten from the next.
          const seam = s.fall < 1 && i > 0 ? props.seam * (1 - s.fall) : 0;
          return <rect key={`bar${i}`} x={s.x + seam} y={s.y} width={Math.max(0, s.w - seam)} height={props.barH} fill={fill} />;
        })}
      </g>
      <Text line={count(withUnit(valueText(props.world)), props.left + props.world * props.units.world * scene.world.shown + props.countGap, props.worldY + props.barH / 2 + props.valueShift)} register={r.value} fill={colours.text.count} opacity={scene.world.shown >= 1 ? worldGoing : 0} halo={valueHalo} />
      {props.bars.map((b, i) => {
        const s = scene.bars[i];
        if (!(s.landed && scene.camera > 0)) return null;
        const text = withUnit(valueText(b.value));
        const opacity = scene.camera * (b.stacked !== null ? Math.max(0, 1 - s.move * 4) : b.tenth ? (1 - 0.6 * scene.stepBack) * Math.max(0, 1 - s.slide * 4) * (scene.tenth > 0 && scene.back === 0 ? 0 : 1) : after(i) ? 1 - 0.6 * scene.stepBack : 1);
        return opacity > 0 ? <Text key={`count${i}`} line={count(text, s.x + s.w + props.countGap, b.y + props.barH / 2 + props.valueShift)} register={r.value} fill={i === 0 ? colours.text.first : colours.text.count} opacity={opacity} halo={valueHalo} /> : null;
      })}

      <line x1={firstEnd} x2={firstEnd} y1={props.rows.first} y2={props.rows.pile} stroke={colours.rule} strokeWidth={props.strokes.rule} strokeDasharray={props.dash.join(" ")} opacity={scene.stacking * (1 - scene.back)} />
      {props.pileNames.map((p, j) => {
        const i = props.bars.findIndex((b) => b.stacked === j);
        const opacity = Math.max(0, scene.bars[i].move * 4 - 3);
        return (
          <g key={`pile${j}`} opacity={opacity * (1 - Math.min(1, scene.back * 4))}>
            {p.leader ? <line x1={p.leader.x1} y1={p.leader.y1} x2={p.leader.x2} y2={p.leader.y2} stroke={colours.text.axis} strokeWidth={props.strokes.grid} /> : null}
            <Text line={p} register={r.axis} fill={colours.text.name} halo={axisHalo} />
          </g>
        );
      })}
      {scene.landed > 0 && scene.sumShown > 0 ? <Text line={count(sumText, pileFront + props.countGap, props.pileY + props.barH / 2 + props.valueShift)} register={r.value} fill={colours.text.count} opacity={scene.sumShown} halo={valueHalo} /> : null}
      <Text line={props.tenthName} register={r.axis} fill={colours.text.name} opacity={Math.max(0, scene.tenth * 4 - 3)} halo={axisHalo} />
      <g opacity={scene.bracket}>
        <path d={`M${props.bracket.x} ${props.bracket.y1}h${props.bracket.tick}V${props.bracket.y2}h${-props.bracket.tick}`} fill="none" stroke={colours.text.count} strokeWidth={props.strokes.grid * 1.6} transform={`translate(${-props.bracket.tick} 0)`} />
        <Text line={count(withUnit(valueText(props.combined)), props.bracket.x + props.countGap, (props.bracket.y1 + props.bracket.y2) / 2 + props.valueShift)} register={r.value} fill={colours.text.count} halo={valueHalo} />
      </g>

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
