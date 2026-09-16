/**
 * One frame of « 4,5 millions d'Ukrainiens sous protection temporaire » — the title card, then the bands tracing out of
 * Ukraine host by host, the top two picked out, ending on the flow map (BRIEF.md).
 *
 * THE MAP IS THE CALLER'S (`liveMap`: the live MapTiler map in the composition — the land, every band, the node and the
 * hosts' names, each a MapLibre layer; nothing in the Bun tests). Over it, one SVG: the key, the credit and the title card.
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`. A
 * count's text is picked by its number from the texts Bun measured.
 */

import type { ReactNode, Ref } from "react";
import { sceneAt } from "./scene.mjs";

type Register = { fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; letterSpacing: number; lead: number };
type Line = { text: string; x: number; y: number; width: number };
type Measured = { text: string; width: number };
type Slot = "display" | "eyebrow" | "value" | "axis" | "source";

export type FlowFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  legend: {
    at: { x: number; y: number };
    width: number;
    height: number;
    peopleRow: { x: number; y: number };
    shareRow: { x: number; y: number };
    peopleTexts: Record<string, Measured>;
    shareTexts: Record<string, Measured>;
    scale: Array<{ width: number; x: number; cy: number; length: number; label: Line }>;
    halo: number;
    valueHalo: number;
  };
  credit: { at: { x: number; y: number }; width: number; height: number; halo: number; lines: Line[] };
  colours: { ground: string; land: string; band: string; subjectBand: string; node: string; text: Record<"eyebrow" | "title" | "count" | "subject" | "name" | "key", string> };
  strokes: { node: number };
  bands: Array<{ code: string; people: number; top: boolean; subject: boolean; drawn: boolean; width: number }>;
  cameras: { whole: Record<string, number> };
  mapPlan: { layers: Array<{ id: string; bindings?: Record<string, unknown> }> } & Record<string, unknown>;
  topTwoShare: number;
  total: number;
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

export function FlowFrame(props: FlowFrameProps & { at: number; liveMap: (frame: number) => ReactNode; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, legend: key, credit, titleCard } = props;
  const scene = sceneAt(props as never, props.at);

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: frame.width, height: frame.height, background: colours.ground }}>
      {props.liveMap(props.at)}
      <svg ref={props.svgRef} style={{ position: "absolute", left: 0, top: 0 }} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
      {/* ── THE KEY: the people, the top two's share, the width scale. ── */}
      <g transform={`translate(${key.at.x} ${key.at.y})`} opacity={scene.furniture}>
        <Word line={{ ...key.peopleTexts[String(scene.arrived)], ...key.peopleRow }} register={r.value} fill={colours.text.count} opacity={scene.countShown} halo={{ colour: colours.ground, width: key.valueHalo }} />
        <Word line={{ ...key.shareTexts[String(scene.share)], ...key.shareRow }} register={r.value} fill={colours.text.subject} opacity={scene.shareShown} halo={{ colour: colours.ground, width: key.valueHalo }} />
        {key.scale.map((s, i) => (
          <g key={`scale${i}`}>
            <line x1={s.x} y1={s.cy} x2={s.x + s.length} y2={s.cy} stroke={colours.band} strokeWidth={s.width} />
            <Word line={s.label} register={r.axis} fill={colours.text.key} halo={{ colour: colours.ground, width: key.halo }} />
          </g>
        ))}
      </g>

      <g transform={`translate(${credit.at.x} ${credit.at.y})`} opacity={scene.source}>
        {credit.lines.map((line, i) => (
          <Word key={`credit${i}`} line={line} register={r.source} fill={colours.text.key} halo={{ colour: colours.ground, width: credit.halo }} />
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
    </div>
  );
}
