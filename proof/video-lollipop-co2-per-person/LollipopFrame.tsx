/**
 * One frame of « La Chine a triplé son CO₂ par personne, l'écart avec les États-Unis est passé de 7,5 à 1,7 » — the title
 * card, the six 2000 stems, copies of China's stem stacked beside the American one (×7,5), every stem travelling to 2023
 * as the copies grow and fewer fit (×1,7), then the whole chart with China ringed (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { Ref } from "react";
import { blend } from "../video-cartogram-europe-lowcarbon/scene.mjs";
import { oneText, sceneAt } from "./scene.mjs";

type Register = { fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; letterSpacing: number; lead: number };
type Line = { text: string; x: number; y: number; width: number };
type Slot = "display" | "eyebrow" | "value" | "axis" | "source";

export type LollipopFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: { ground: string; grid: string; past: string; present: string; faded: string; ring: string; text: Record<"eyebrow" | "title" | "past" | "present" | "name" | "axis" | "count", string> };
  subject: string;
  other: string;
  pairs: Array<{ centreX: number; code: string; before: number; after: number; pastX: number; presentX: number; name: Line; dates: Line[] }>;
  baseline: number;
  unit: number;
  R: number;
  zero: { left: number; right: number };
  ratioWidths: Record<string, number>;
  unitLine: Line;
  valueWidths: Record<string, number>;
  valueRise: number;
  copies: number;
  stackGap: number;
  stackW: number;
  seam: number;
  strokes: { stem: number; ring: number; grid: number };
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

export function LollipopFrame(props: LollipopFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, credit, titleCard } = props;
  const scene = sceneAt(props as never, props.at);
  const valueHalo = { colour: colours.ground, width: props.halo.value };
  const lolly = (x: number, v: number, colour: string, textColour: string, key: string, opacity: number, valueShown = 1) => {
    const y = props.baseline - v * props.unit;
    const text = oneText(v);
    const width = props.valueWidths[text];
    return (
      <g key={key}>
        <line x1={x} x2={x} y1={props.baseline} y2={y} stroke={colour} strokeWidth={props.strokes.stem} />
        <circle cx={x} cy={y} r={props.R} fill={colour} />
        <Text line={{ text, width, x: x - width / 2, y: y - props.valueRise }} register={r.value} fill={textColour} opacity={opacity * valueShown} halo={valueHalo} />
      </g>
    );
  };
  const ratio = oneText(scene.ratio);

  return (
    <svg ref={props.svgRef} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
      <rect width={frame.width} height={frame.height} fill={colours.ground} />
      <g opacity={scene.furniture}>
        <line x1={props.zero.left} x2={props.zero.right} y1={props.baseline} y2={props.baseline} stroke={colours.grid} strokeWidth={props.strokes.grid} />
        <Text line={props.unitLine} register={r.axis} fill={colours.text.axis} />
        {props.pairs.map((p, i) => (
          <g key={`labels${i}`}>
            <Text line={p.name} register={r.axis} fill={blend(colours.text.name, colours.text.axis, scene.pairs[i].stepBack)} opacity={1 - 0.4 * scene.pairs[i].stepBack} />
            {p.dates.map((d, j) => (
              <Text key={`date${j}`} line={d} register={r.axis} fill={colours.text.axis} opacity={scene.pairs[i].pastShown} />
            ))}
          </g>
        ))}
      </g>

      {props.pairs.flatMap((p, i) => {
        const s = scene.pairs[i];
        if (!(s.up > 0)) return [];
        const kept = 1 - 0.7 * s.stepBack;
        return [
          s.pastShown ? lolly(s.pastX, s.past, blend(colours.past, colours.faded, s.stepBack), colours.text.past, `past${i}`, kept) : null,
          lolly(s.x, s.present, blend(colours.present, colours.faded, s.stepBack), colours.text.present, `present${i}`, kept, p.code === props.other ? 1 - scene.ratioShown : 1),
        ];
      })}

      {scene.copies.map((c, k) =>
        c.h > 0 ? <rect key={`copy${k}`} x={c.x} y={props.baseline - c.low - c.h} width={props.stackW} height={Math.max(0, c.h - props.seam)} fill={colours.present} opacity={c.opacity} /> : null,
      )}
      {scene.ratioShown > 0 ? <Text line={{ text: `×${ratio}`, width: props.ratioWidths[ratio], x: scene.stackX + props.stackW / 2 - props.ratioWidths[ratio] / 2, y: scene.ratioY - props.valueRise + props.R }} register={r.value} fill={colours.text.count} opacity={scene.ratioShown} halo={valueHalo} /> : null}

      {props.pairs.map((p, i) =>
        p.code === props.subject ? (
          <circle key="ring" cx={scene.pairs[i].x} cy={props.baseline - scene.pairs[i].present * props.unit} r={props.R * 2} fill="none" stroke={colours.ring} strokeWidth={props.strokes.ring} opacity={scene.ring} />
        ) : null,
      )}

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
