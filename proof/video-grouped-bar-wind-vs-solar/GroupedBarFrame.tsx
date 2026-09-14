/**
 * One frame of « Dans 5 de ces 6 pays l'éolien devance le solaire, la Suisse est l'exception » — the title card, the six
 * groups, wind rising across them, then solar beside it group by group as the lead is counted, then everything but the
 * exception stepping back (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { Ref } from "react";
import { blend } from "../video-cartogram-europe-lowcarbon/scene.mjs";
import { sceneAt, shareText } from "./scene.mjs";

type Register = { fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; letterSpacing: number; lead: number };
type Line = { text: string; x: number; y: number; width: number };
type Word = { text: string; width: number };
type Slot = "display" | "eyebrow" | "value" | "axis" | "source";

export type GroupedBarFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: { ground: string; grid: string; wind: string; solar: string; faded: string; text: Record<"eyebrow" | "title" | "wind" | "solar" | "name" | "axis" | "count", string> };
  subject: string;
  groups: Array<{ name: string; wind: number; solar: number; windX: number; solarX: number; label: Line }>;
  barW: number;
  baseline: number;
  unit: number;
  left: number;
  right: number;
  series: Line[];
  swatches: Array<{ x: number; y: number; size: number }>;
  leads: Record<string, Word>;
  leadAt: { x: number; y: number };
  shareWidths: Record<string, number>;
  shareGap: number;
  strokes: { grid: number };
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

export function GroupedBarFrame(props: GroupedBarFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, credit, titleCard } = props;
  const scene = sceneAt(props as never, props.at);
  const valueHalo = { colour: colours.ground, width: props.halo.value };
  const lead = props.leads[String(scene.lead)];

  return (
    <svg ref={props.svgRef} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
      <rect width={frame.width} height={frame.height} fill={colours.ground} />
      <g opacity={scene.furniture}>
        <line x1={props.left} x2={props.right} y1={props.baseline} y2={props.baseline} stroke={colours.grid} strokeWidth={props.strokes.grid} />
        <rect x={props.swatches[0].x} y={props.swatches[0].y} width={props.swatches[0].size} height={props.swatches[0].size} fill={colours.wind} />
        <rect x={props.swatches[1].x} y={props.swatches[1].y} width={props.swatches[1].size} height={props.swatches[1].size} fill={colours.solar} />
        <Text line={props.series[0]} register={r.axis} fill={colours.text.wind} />
        <Text line={props.series[1]} register={r.axis} fill={colours.text.solar} />
        <Text line={props.series[2]} register={r.axis} fill={colours.text.axis} />
        {props.groups.map((g, i) => (
          <Text key={`name${i}`} line={g.label} register={r.axis} fill={blend(colours.text.name, colours.text.axis, scene.groups[i].stepBack)} opacity={1 - 0.4 * scene.groups[i].stepBack} />
        ))}
      </g>

      {props.groups.flatMap((g, i) => {
        const s = scene.groups[i];
        return (["wind", "solar"] as const).map((key) => {
          const up = s[key];
          if (!(up > 0)) return null;
          const v = g[key] * up;
          const h = v * props.unit;
          const x = key === "wind" ? g.windX : g.solarX;
          const text = shareText(v);
          const width = props.shareWidths[text];
          return (
            <g key={`${key}${i}`}>
              <rect x={x} y={props.baseline - h} width={props.barW} height={h} fill={blend(colours[key], colours.faded, s.stepBack)} />
              <Text line={{ text, width, x: x + props.barW / 2 - width / 2, y: props.baseline - h - props.shareGap }} register={r.value} fill={colours.text[key]} opacity={1 - 0.7 * s.stepBack} halo={valueHalo} />
            </g>
          );
        });
      })}

      <Text line={{ ...lead, ...props.leadAt }} register={r.value} fill={colours.text.count} opacity={scene.counting} halo={valueHalo} />

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
