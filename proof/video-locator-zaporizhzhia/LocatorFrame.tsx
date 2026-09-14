/**
 * One frame of « La plus grosse centrale bas-carbone d'Europe est en Ukraine » — the title card, Europe with Ukraine
 * named and the station ringed, the camera closing in, the places named, the station named and counted (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: shapes, cameras, positions, texts and colours come from `build.mjs`; motion from
 * `sceneAt`. The station and settlement marks are placed through the camera at this frame.
 */

import type { Ref } from "react";
import { sceneAt } from "./scene.mjs";

type Register = { fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; letterSpacing: number; lead: number };
type Line = { text: string; x: number; y: number; width: number };
type Box = { x: number; y: number; w: number; h: number };
type Slot = "display" | "eyebrow" | "value" | "area" | "settlement" | "water" | "source";

export type LocatorFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; haloColour: string; lines: Line[] };
  colours: { ground: string; sea: string; land: string; story: string; border: string; ring: string; text: Record<"eyebrow" | "title" | "area" | "settlement" | "water" | "station" | "source", string> };
  strokes: { border: number; ring: number };
  seaBox: Box;
  shapes: Array<{ iso: string; d: string }>;
  cameras: { overview: Box; closeUp: Box };
  project: { station: number[]; places: number[][] };
  overviewName: Line & { halo: number };
  names: Array<Line & { key: string; kind: string; halo: number; haloColour: string }>;
  waters: Array<Line & { key: string; halo: number }>;
  station: { lines: { name: Line; capacity: { x: number; y: number }; halo: number; haloColour: string }; capacityTexts: Record<string, { text: string; width: number }>; dotR: number };
  capacity: number;
  rings: { far: number; near: number };
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

export function LocatorFrame(props: LocatorFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, strokes, credit, titleCard, station } = props;
  const scene = sceneAt(props as never, props.at);
  const vb = scene.viewBox;
  const onStage = ([x, y]: number[]) => ({ x: ((x - vb.x) / vb.w) * frame.width, y: ((y - vb.y) / vb.h) * frame.height });
  const s = onStage(props.project.station);
  const ringR = props.rings.far + (props.rings.near - props.rings.far) * scene.zoom;
  const capacity = station.capacityTexts[String(scene.capacity)];

  return (
    <svg ref={props.svgRef} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
      <svg width={frame.width} height={frame.height} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="none">
        <rect x={props.seaBox.x} y={props.seaBox.y} width={props.seaBox.w} height={props.seaBox.h} fill={colours.sea} />
        {props.shapes.map((sh) => (
          <path key={sh.iso} d={sh.d} fill={colours.land} stroke={colours.border} strokeWidth={strokes.border} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        ))}
        {props.shapes
          .filter((sh) => sh.iso === "UKR")
          .map((sh) => (
            <path key="story" d={sh.d} fill={colours.story} stroke={colours.border} strokeWidth={strokes.border} vectorEffect="non-scaling-stroke" opacity={scene.country} />
          ))}
      </svg>

      {/* ── THE CONTINENT'S NAME, gone as the camera leaves. ── */}
      <Word line={props.overviewName} register={r.area} fill={colours.text.area} opacity={scene.country * (1 - Math.min(1, scene.zoom * 3))} halo={{ colour: colours.story, width: props.overviewName.halo }} />

      {/* ── THE CLOSE-UP'S PLACES: dots through the camera, names once it has settled. ── */}
      <g opacity={scene.names}>
        {props.project.places.map((p, i) => {
          const at = onStage(p);
          return <circle key={`dot${i}`} cx={at.x} cy={at.y} r={station.dotR} fill={colours.land} stroke={colours.text.settlement} strokeWidth={strokes.border * 1.5} />;
        })}
        {props.waters.map((w) => (
          <Word key={w.key} line={w} register={r.water} fill={colours.text.water} halo={{ colour: colours.sea, width: w.halo }} />
        ))}
        {props.names.map((n) => (
          <Word key={n.key} line={n} register={n.kind === "area" ? r.area : r.settlement} fill={n.kind === "area" ? colours.text.area : colours.text.settlement} halo={{ colour: n.haloColour, width: n.halo }} />
        ))}
      </g>

      {/* ── THE STATION ── */}
      <circle cx={s.x} cy={s.y} r={ringR} fill="none" stroke={colours.ring} strokeWidth={strokes.ring} opacity={scene.country} />
      <circle cx={s.x} cy={s.y} r={station.dotR * 1.8} fill={colours.ring} opacity={scene.country} />
      <g opacity={Math.min(1, scene.subject * 3)}>
        <Word line={station.lines.name} register={r.value} fill={colours.text.station} halo={{ colour: station.lines.haloColour, width: station.lines.halo }} />
        <Word line={{ ...capacity, ...station.lines.capacity }} register={r.value} fill={colours.text.station} halo={{ colour: station.lines.haloColour, width: station.lines.halo }} />
      </g>

      <g transform={`translate(${credit.at.x} ${credit.at.y})`} opacity={scene.source}>
        {credit.lines.map((line, i) => (
          <Word key={`credit${i}`} line={line} register={r.source} fill={colours.text.source} halo={{ colour: credit.haloColour, width: credit.halo }} />
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
