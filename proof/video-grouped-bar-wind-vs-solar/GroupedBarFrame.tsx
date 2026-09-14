/**
 * One frame of « Dans 5 de ces 6 pays l'éolien devance le solaire, la Suisse est l'exception » — the title card, each
 * country's whole electricity as one column, every other source fading, wind and solar sliding down side by side, the scale
 * closing onto them, wind's level carried across to solar group after group as the lead is counted, then everything but
 * the exception stepping back (BRIEF.md).
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
  colours: { ground: string; grid: string; wind: string; solar: string; faded: string; ring: string; others: string[]; text: Record<"eyebrow" | "title" | "wind" | "solar" | "name" | "axis" | "count", string> };
  subject: string;
  groups: Array<{ name: string; wind: number; solar: number; mix: Array<{ source: string; share: number }>; colX: number; windX: number; solarX: number; label: Line }>;
  barW: number;
  colW: number;
  units: { whole: number; close: number };
  seam: number;
  baseline: number;
  left: number;
  right: number;
  series: Line[];
  swatches: Array<{ x: number; y: number; size: number }>;
  leads: Record<string, Word>;
  leadAt: { x: number; y: number };
  shareWidths: Record<string, number>;
  shareGap: number;
  ring: { x: number; y: number; w: number; h: number; r: number };
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
        const others = s.segments.filter((seg) => seg.fade < 1 && seg.h > 0 && seg.source !== "Wind" && seg.source !== "Solar");
        return [
          ...others.map((seg, j) => (
            <rect key={`other${i}-${seg.source}`} x={g.colX} y={seg.y + props.seam / 2} width={props.colW} height={Math.max(0, seg.h - props.seam / 2)} fill={colours.others[j % 2]} opacity={1 - seg.fade} />
          )),
          ...(["wind", "solar"] as const).map((key) => {
            const b = s[key];
            if (!(b.h > 0)) return null;
            return <rect key={`${key}${i}`} x={b.x} y={b.y} width={b.w} height={b.h} fill={blend(colours[key], colours.faded, s.stepBack)} />;
          }),
        ];
      })}

      {props.groups.map((g, i) => {
        const s = scene.groups[i];
        if (!(s.level.reach > 0 && scene.levels > 0)) return null;
        const x1 = g.windX;
        const x2 = g.windX + (g.solarX + props.barW - g.windX) * s.level.reach;
        return <line key={`level${i}`} x1={x1} x2={x2} y1={s.level.y} y2={s.level.y} stroke={colours.text.wind} strokeWidth={props.strokes.grid * 2} strokeDasharray={`${props.seam * 2} ${props.seam * 1.5}`} opacity={scene.levels * (1 - 0.8 * s.stepBack)} />;
      })}

      {props.groups.flatMap((g, i) => {
        const s = scene.groups[i];
        if (!(s.shares > 0)) return [];
        return (["wind", "solar"] as const).map((key) => {
          const b = s[key];
          const text = shareText(b.value);
          const width = props.shareWidths[text];
          return <Text key={`share${key}${i}`} line={{ text, width, x: b.x + b.w / 2 - width / 2, y: b.y - props.shareGap }} register={r.value} fill={colours.text[key]} opacity={s.shares * (1 - 0.7 * s.stepBack)} halo={valueHalo} />;
        });
      })}

      <rect x={props.ring.x} y={props.ring.y} width={props.ring.w} height={props.ring.h} rx={props.ring.r} fill="none" stroke={colours.ring} strokeWidth={props.strokes.grid * 2.5} opacity={scene.ring} />
      {scene.counting ? <Text line={{ ...lead, ...props.leadAt }} register={r.value} fill={colours.text.count} halo={valueHalo} /> : null}

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
