/**
 * One frame of « Pologne : +17,3 points de bas-carbone depuis 2015, toujours la seule sous la moitié » — the title card, six
 * tracks, the 2015 bars then the 2024 bars extending on from them as each gain counts, the rows re-sorting by gain one at a
 * time, then the 50 % line and every row but Poland stepping back (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { Ref } from "react";
import { blend } from "../video-cartogram-europe-lowcarbon/scene.mjs";
import { gainText, sceneAt } from "./scene.mjs";

type Register = { fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; letterSpacing: number; lead: number };
type Line = { text: string; x: number; y: number; width: number };
type Slot = "display" | "eyebrow" | "value" | "axis" | "source";
type Box = { x: number; y: number; w: number; h: number };

export type BulletFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: { ground: string; track: string; pale: string; thin: string; faded: string; half: string; text: Record<"eyebrow" | "title" | "name" | "axis" | "gain", string> };
  moved: string;
  steps: string[][];
  rows: Array<{ key: string; before: number; after: number; name: { text: string; width: number; x: number } }>;
  top: number;
  pitch: number;
  trackH: number;
  paleH: number;
  thinH: number;
  left: number;
  right: number;
  gainX: number;
  nameShift: number;
  gainShift: number;
  gainWidths: Record<string, number>;
  ticks: Line[];
  halfX: number;
  unitLine: Line;
  legend: { pale: Box; thin: Box; dates: Line[] };
  strokes: { half: number };
  dash: number[];
  halo: { value: number };
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

export function BulletFrame(props: BulletFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, credit, titleCard, legend: key } = props;
  const scene = sceneAt(props as never, props.at);
  const span = props.right - props.left;
  const trackTop = (slot: number) => props.top + slot * props.pitch + (props.pitch - props.trackH) / 2;

  return (
    <svg ref={props.svgRef} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
      <rect width={frame.width} height={frame.height} fill={colours.ground} />
      <g opacity={scene.furniture}>
        <Text line={props.unitLine} register={r.axis} fill={colours.text.axis} />
        <rect x={key.pale.x} y={key.pale.y} width={key.pale.w} height={key.pale.h} fill={colours.pale} />
        <rect x={key.thin.x} y={key.thin.y} width={key.thin.w} height={key.thin.h} fill={colours.thin} />
        {key.dates.map((d, i) => (
          <Text key={`date${i}`} line={d} register={r.axis} fill={colours.text.axis} />
        ))}
        {props.ticks.map((t, i) => (
          <Text key={`tick${i}`} line={t} register={r.axis} fill={colours.text.axis} />
        ))}
      </g>

      {/* The climbing row last, over the rows it passes, its words haloed. */}
      {[...props.rows.keys()].sort((a, b) => Number(scene.rows[a].climbing) - Number(scene.rows[b].climbing)).map((i) => {
        const row = props.rows[i];
        const s = scene.rows[i];
        const halo = s.climbing ? { colour: colours.ground, width: props.halo.value } : undefined;
        const y = trackTop(s.slot);
        const mid = y + props.trackH / 2;
        const gain = `${gainText(s.gain)}${NB}pts`;
        return (
          <g key={row.key} opacity={scene.furniture}>
            <rect x={props.left} y={y} width={span} height={props.trackH} fill={colours.track} />
            {s.pale > 0 ? <rect x={props.left} y={mid - props.paleH / 2} width={(s.pale / 100) * span} height={props.paleH} fill={blend(colours.pale, colours.faded, s.stepBack)} /> : null}
            {s.thin > 0 ? <rect x={props.left} y={mid - props.thinH / 2} width={(s.thin / 100) * span} height={props.thinH} fill={blend(colours.thin, colours.faded, s.stepBack)} /> : null}
            <Text line={{ ...row.name, y: props.top + s.slot * props.pitch + props.nameShift }} register={r.axis} fill={blend(colours.text.name, colours.text.axis, s.stepBack)} opacity={1 - 0.4 * s.stepBack} halo={halo} />
            {s.shown ? <Text line={{ text: gain, width: props.gainWidths[gain], x: props.gainX, y: props.top + s.slot * props.pitch + props.gainShift }} register={r.value} fill={colours.text.gain} opacity={1 - 0.7 * s.stepBack} halo={halo} /> : null}
          </g>
        );
      })}

      <line x1={props.halfX} x2={props.halfX} y1={props.top} y2={props.top + props.rows.length * props.pitch} stroke={colours.half} strokeWidth={props.strokes.half} strokeDasharray={props.dash.join(" ")} opacity={scene.half} />

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
