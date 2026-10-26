/**
 * One frame of « La plus grosse centrale bas-carbone d'Europe est en Ukraine » — the title card, Europe with Ukraine
 * named and the station ringed, the camera closing in, the places named, the station named and counted (BRIEF.md).
 *
 * THE MAP IS THE CALLER'S (`liveMap`: the live MapTiler map in the composition — Ukraine's tint, its regions, the borders,
 * the station's ring and dot, every place and its name, each a MapLibre layer; nothing in the Bun tests). Over it, one
 * SVG: the station's name and its capacity counting up, the credit and the title card.
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { ReactNode, Ref } from "react";
import { sceneAt } from "./scene.mjs";

type Register = { fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; letterSpacing: number; lead: number };
type Line = { text: string; x: number; y: number; width: number };
type Slot = "display" | "eyebrow" | "value" | "source";

export type LocatorFrameProps = {
  frame: { width: number; height: number };
  /** The ground band under the map — the square frame's own composition (`build.mjs`, `bandFor`); `null` elsewhere. */
  band: { x: number; y: number; width: number; height: number } | null;
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; haloColour: string; lines: Line[] };
  colours: { ground: string; text: Record<"eyebrow" | "title" | "station" | "source", string> } & Record<string, unknown>;
  station: { lines: { name: Line; capacity: { x: number; y: number }; halo: number; haloColour: string }; capacityTexts: Record<string, { text: string; width: number }> };
  cameras: { whole: Record<string, number>; closeUp: Record<string, number> };
  mapPlan: { layers: Array<{ id: string; bindings?: Record<string, unknown> }> } & Record<string, unknown>;
  capacity: number;
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

export function LocatorFrame(props: LocatorFrameProps & { at: number; liveMap: (frame: number) => ReactNode; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, credit, titleCard, station, band } = props;
  const scene = sceneAt(props as never, props.at);
  const capacity = station.capacityTexts[String(scene.capacity)];

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: frame.width, height: frame.height, background: colours.ground }}>
      {props.liveMap(props.at)}
      <svg ref={props.svgRef} style={{ position: "absolute", left: 0, top: 0 }} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
        {/* ── THE GROUND BAND: the square frame's foot, the credit on the direction's own ground rather than on a
            surface of the map. It is drawn over the live map because the map is mounted on the WHOLE frame and
            measured there; the two cameras are fitted and raised into the band above it (`map-plan.mjs`,
            `camerasOf`), so what this covers is the ground that fit left over, not a slice taken off the map. ── */}
        {band ? <rect x={band.x} y={band.y} width={band.width} height={band.height} fill={colours.ground} /> : null}

        {/* ── THE STATION'S NAME AND ITS CAPACITY, counted in measured texts. ── */}
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
    </div>
  );
}
