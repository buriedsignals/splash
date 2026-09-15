/**
 * One frame of « 72 réacteurs sur 8 900 centrales bas-carbone » — the title card, then the stations arriving fuel by
 * fuel, the 72 named, every dot growing into its weight, ending on the weighted map (BRIEF.md).
 *
 * THE MAP IS THE CALLER'S (`liveMap`: the live MapTiler map in the composition — the land and every station, each fuel
 * and size a MapLibre layer; nothing in the Bun tests). Over it, one SVG: the key, the credit and the title card.
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, sizes, texts and colours come from `build.mjs`; motion from `sceneAt`.
 * The count texts the frame can show were each measured in Bun; the frame draws one of them.
 */

import type { ReactNode, Ref } from "react";
import { sceneAt } from "./scene.mjs";

type Register = { fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; letterSpacing: number; lead: number };
type Line = { text: string; x: number; y: number; width: number };
type Measured = { text: string; width: number };
type Slot = "display" | "eyebrow" | "value" | "axis" | "source";
type Symbol = { cx: number; cy: number; label: Measured & { x: number; y: number } };

export type DotFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  legend: {
    at: { x: number; y: number };
    halo: number;
    valueHalo: number;
    rows: Record<"stations" | "nuclear" | "power", { x: number; y: number }>;
    symbols: Record<"dot" | "ring" | "reference", Symbol>;
    stationTexts: Record<string, Measured>;
    powerTexts: Record<string, Measured>;
    nuclearText: Measured;
    referenceR: number;
    /** The nuclear share on one 0–100 % bar. */
    bar: { x: number; y: number; width: number; height: number };
  };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: { ground: string; sea: string; land: string; dot: string; back: string; subject: string; text: Record<"eyebrow" | "title" | "count" | "subject" | "key" | "source", string> };
  strokes: { hairline: number; ring: number };
  fuels: Array<{ fuel: string; n: number }>;
  subjectFuel: string;
  cameras: { whole: Record<string, number> };
  mapPlan: { layers: Array<{ id: string; bindings?: Record<string, unknown> }> } & Record<string, unknown>;
  dotR: number;
  ringR: number;
  total: number;
  shareCapacity: number;
  shareCapacityExact: number;
  shareSites: number;
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


export function DotFrame(props: DotFrameProps & { at: number; liveMap: (frame: number) => ReactNode; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, strokes, legend: key, credit, titleCard } = props;
  const scene = sceneAt(props as never, props.at);
  const stationsText = key.stationTexts[String(scene.stations)];
  const powerText = key.powerTexts[String(scene.power)];
  const bar = key.bar;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: frame.width, height: frame.height, background: colours.sea }}>
      {props.liveMap(props.at)}
      <svg ref={props.svgRef} style={{ position: "absolute", left: 0, top: 0 }} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>

      {/* ── THE KEY: the three counts, the dot, the ring, the size reference. ── */}
      <g transform={`translate(${key.at.x} ${key.at.y})`} opacity={scene.furniture}>
        <Word line={{ ...stationsText, ...key.rows.stations }} register={r.value} fill={colours.text.count} opacity={scene.stationsShown} halo={{ colour: colours.sea, width: key.valueHalo }} />
        <Word line={{ ...key.nuclearText, ...key.rows.nuclear }} register={r.value} fill={colours.text.subject} opacity={scene.named} halo={{ colour: colours.sea, width: key.valueHalo }} />
        <g opacity={scene.bar.shown}>
          <rect x={bar.x} y={bar.y} width={bar.width} height={bar.height} fill={colours.back} />
          <rect x={bar.x} y={bar.y} width={(bar.width * scene.bar.share) / 100} height={bar.height} fill={colours.subject} />
          <line x1={bar.x + (bar.width * props.shareSites) / 100} x2={bar.x + (bar.width * props.shareSites) / 100} y1={bar.y - 0.4 * bar.height} y2={bar.y + 1.4 * bar.height} stroke={colours.subject} strokeWidth={strokes.hairline * 1.5} />
        </g>
        <Word line={{ ...powerText, ...key.rows.power }} register={r.value} fill={colours.text.subject} opacity={scene.powerShown} halo={{ colour: colours.sea, width: key.valueHalo }} />
        <circle cx={key.symbols.dot.cx} cy={key.symbols.dot.cy} r={props.dotR * 1.6} fill={colours.dot} />
        <Word line={key.symbols.dot.label} register={r.axis} fill={colours.text.key} halo={{ colour: colours.sea, width: key.halo }} />
        <g opacity={scene.named}>
          <circle cx={key.symbols.ring.cx} cy={key.symbols.ring.cy} r={props.dotR * 1.6} fill={colours.subject} />
          <circle cx={key.symbols.ring.cx} cy={key.symbols.ring.cy} r={props.ringR} fill="none" stroke={colours.subject} strokeWidth={strokes.ring} />
          <Word line={key.symbols.ring.label} register={r.axis} fill={colours.text.key} halo={{ colour: colours.sea, width: key.halo }} />
        </g>
        <g opacity={scene.powerShown}>
          <circle cx={key.symbols.reference.cx} cy={key.symbols.reference.cy} r={key.referenceR} fill="none" stroke={colours.text.key} strokeWidth={strokes.ring} />
          <Word line={key.symbols.reference.label} register={r.axis} fill={colours.text.key} halo={{ colour: colours.sea, width: key.halo }} />
        </g>
      </g>

      <g transform={`translate(${credit.at.x} ${credit.at.y})`} opacity={scene.source}>
        {credit.lines.map((line, i) => (
          <Word key={`credit${i}`} line={line} register={r.source} fill={colours.text.source} halo={{ colour: colours.sea, width: credit.halo }} />
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
