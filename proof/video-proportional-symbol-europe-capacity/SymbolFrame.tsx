/**
 * One frame of « Un centième des sites porte plus d'un tiers de la puissance » — the title card, the hundred largest
 * stations arriving largest first while the counts climb, then the other 8 800 as faint points (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, radii, texts and colours come from `build.mjs`; motion from `sceneAt`.
 * The 8 800 points are one path of zero-length strokes with round caps, so the frame stays light.
 */

import type { Ref } from "react";
import { sceneAt } from "./scene.mjs";

type Register = { fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; letterSpacing: number; lead: number };
type Line = { text: string; x: number; y: number; width: number };
type Measured = { text: string; width: number };
type Slot = "display" | "eyebrow" | "value" | "axis" | "source";

export type SymbolFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  legend: {
    at: { x: number; y: number };
    topRow: { x: number; y: number };
    restRow: { x: number; y: number };
    topTexts: Record<string, Measured>;
    restText: Measured;
    named: Array<{ r: number; cx: number; cy: number; label: Line }>;
    halo: number;
    valueHalo: number;
  };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: { ground: string; sea: string; land: string; circle: string; point: string; text: Record<"eyebrow" | "title" | "top" | "rest" | "key", string> };
  strokes: { circle: number; hairline: number };
  land: string[];
  top: Array<{ x: number; y: number; r: number }>;
  rest: string;
  pointR: number;
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

export function SymbolFrame(props: SymbolFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, strokes, legend: key, credit, titleCard } = props;
  const scene = sceneAt(props as never, props.at);

  return (
    <svg ref={props.svgRef} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
      <rect width={frame.width} height={frame.height} fill={colours.sea} />
      {props.land.map((d, i) => (
        <path key={`land${i}`} d={d} fill={colours.land} stroke={colours.sea} strokeWidth={strokes.hairline} strokeLinejoin="round" />
      ))}
      <path d={props.rest} fill="none" stroke={colours.point} strokeWidth={2 * props.pointR} strokeLinecap="round" opacity={scene.rest} />
      {/* ── THE HUNDRED: hollow, the smallest drawn last so its outline is never under a larger one. ── */}
      {props.top
        .map((c, k) => ({ c, k }))
        .reverse()
        .map(({ c, k }) => (
          <circle key={`c${k}`} cx={c.x} cy={c.y} r={c.r * (0.6 + 0.4 * scene.circles[k])} fill="none" stroke={colours.circle} strokeWidth={strokes.circle} opacity={scene.circles[k]} />
        ))}

      <g transform={`translate(${key.at.x} ${key.at.y})`} opacity={scene.furniture}>
        <Word line={{ ...key.topTexts[String(scene.arrived)], ...key.topRow }} register={r.value} fill={colours.text.top} opacity={Math.min(1, scene.circles[0] * 3)} halo={{ colour: colours.sea, width: key.valueHalo }} />
        <Word line={{ ...key.restText, ...key.restRow }} register={r.value} fill={colours.text.rest} opacity={scene.rest} halo={{ colour: colours.sea, width: key.valueHalo }} />
        {key.named.map((n, i) => (
          <g key={`named${i}`}>
            <circle cx={n.cx} cy={n.cy} r={n.r} fill="none" stroke={colours.circle} strokeWidth={strokes.circle} />
            <Word line={n.label} register={r.axis} fill={colours.text.key} halo={{ colour: colours.sea, width: key.halo }} />
          </g>
        ))}
      </g>

      <g transform={`translate(${credit.at.x} ${credit.at.y})`} opacity={scene.source}>
        {credit.lines.map((line, i) => (
          <Word key={`credit${i}`} line={line} register={r.source} fill={colours.text.key} halo={{ colour: colours.sea, width: credit.halo }} />
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
