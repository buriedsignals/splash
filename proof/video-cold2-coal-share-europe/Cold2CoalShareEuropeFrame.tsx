/**
 * One frame of `video-cold2-coal-share-europe` — the title card, then the live map on the whole frame under an SVG overlay: the story
 * (BRIEF.md, « The choreography »), the credit on the open sea.
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: every coordinate is `build.mjs`'s, what moves is `sceneAt`'s, the map is
 * `liveMap`'s. A pure component of its props and `at`, so Bun renders the same markup (with no map) and holds it to the
 * type floor.
 */

import type { ReactNode, Ref } from "react";
import { sceneAt } from "./scene.mjs";

type Register = { fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; letterSpacing: number; lead: number };
type Line = { text: string; x: number; y: number; width: number };
type Rect = { x: number; y: number; width: number; height: number };
type Slot = "display" | "eyebrow" | "value" | "axis" | "annot" | "area" | "feature" | "source";

export type Cold2CoalShareEuropeFrameProps = {
  frame: { width: number; height: number };
  stage: Rect;
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: {
    ground: string; sea: string; land: string; accent: string; text: Record<"eyebrow" | "title" | "source", string>;
    classFills: string[]; ink: string; track: string; gauge: string; half: string; keyText: string;
  };
  strokes: { border: number; rule: number };
  halo: number;
  cameras: unknown;
  mapPlan: unknown;
  states: Record<string, number>[];
  timing: unknown;
  legend: {
    at: { x: number; y: number }; halo: number; valueHalo: number; halfIndex: number;
    counters: Line[][]; swatches: Rect[]; bornes: Line[]; missingSwatch: Rect; missingLabel: Line;
  };
  names: Array<{
    code: string; box: Rect; name: Line; gauge: Rect & { notch: number };
    shares: Array<{ fill: number; text: string }>; shareAt: { x: number; y: number }; shareWidths: number[];
  }>;
  ringName: Line;
  clock: { x: number; y: number; widths: number[]; texts: string[] };
  classTable: Record<string, number[]>;
  yearCount: number;
  classCount: number;
};

/** Every word the overlay draws: set in its register, carrying the width Bun measured (`data-width`) for the read-back. */
export function Word({ line, register, fill, opacity = 1, halo }: { line: Line; register: Register; fill: string; opacity?: number; halo?: { colour: string; width: number } }) {
  return (
    <text
      x={line.x}
      y={line.y}
      fontFamily={register.fontFamily}
      fontSize={register.fontSize}
      fontWeight={register.fontWeight}
      fontStyle={register.fontStyle}
      letterSpacing={register.letterSpacing}
      fill={fill}
      opacity={opacity}
      stroke={halo?.colour}
      strokeWidth={halo?.width}
      strokeLinejoin={halo ? "round" : undefined}
      paintOrder={halo ? "stroke" : undefined}
      data-width={line.width}
    >
      {line.text}
    </text>
  );
}

export function Cold2CoalShareEuropeFrame(props: Cold2CoalShareEuropeFrameProps & { at: number; svgRef?: Ref<SVGSVGElement>; liveMap: (frame: number) => ReactNode }) {
  const { frame, registers: r, colours, credit, titleCard } = props;
  const scene = sceneAt(props as never, props.at);

  return (
    <div style={{ position: "relative", width: frame.width, height: frame.height, background: colours.sea }}>
      {props.liveMap(props.at)}
      <svg ref={props.svgRef} xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", inset: 0 }} width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
        {/* ════ THE STORY: the key over the Atlantic, the close-up's year, names and gauges, Poland named with its ring. ════ */}
        <g transform={`translate(${props.legend.at.x} ${props.legend.at.y})`} opacity={scene.furniture}>
          {props.legend.counters.map((row, i) => (
            <Word key={`counter${i}`} line={row[scene.year]} register={r.value} fill={colours.keyText} halo={{ colour: colours.sea, width: props.legend.valueHalo }} />
          ))}
          {props.legend.swatches.map((sw, i) => (
            <rect key={`swatch${i}`} x={sw.x} y={sw.y} width={sw.width} height={sw.height} fill={colours.classFills[i]} opacity={scene.swatches[i]} />
          ))}
          {props.legend.bornes.map((b, i) => (
            <Word key={`borne${i}`} line={b} register={r.axis} fill={i === props.legend.halfIndex ? colours.half : colours.keyText} halo={{ colour: colours.sea, width: props.legend.halo }} />
          ))}
          <rect x={props.legend.missingSwatch.x} y={props.legend.missingSwatch.y} width={props.legend.missingSwatch.width} height={props.legend.missingSwatch.height} fill={colours.land} />
          <Word line={props.legend.missingLabel} register={r.axis} fill={colours.keyText} halo={{ colour: colours.sea, width: props.legend.halo }} />
        </g>

        <g opacity={scene.names}>
          <Word line={{ text: props.clock.texts[scene.year], x: props.clock.x, y: props.clock.y, width: props.clock.widths[scene.year] }} register={r.value} fill={colours.keyText} halo={{ colour: colours.sea, width: props.halo }} />
          {props.names.map((n) => {
            const reading = n.shares[scene.year];
            return (
              <g key={`name-${n.code}`}>
                <Word line={n.name} register={r.feature} fill={colours.ink} halo={{ colour: colours.ground, width: props.halo }} />
                <rect x={n.gauge.x - props.halo / 2} y={n.gauge.y - props.halo / 2} width={n.gauge.width + props.halo} height={n.gauge.height + props.halo} fill={colours.ground} />
                <rect x={n.gauge.x} y={n.gauge.y} width={n.gauge.width} height={n.gauge.height} fill={colours.track} />
                <rect x={n.gauge.x} y={n.gauge.y} width={n.gauge.width * reading.fill} height={n.gauge.height} fill={colours.gauge} />
                <rect x={n.gauge.x + n.gauge.width * n.gauge.notch - 1.5} y={n.gauge.y - n.gauge.height * 0.6} width={3} height={n.gauge.height * 2.2} fill={colours.ink} />
                <Word line={{ text: reading.text, x: n.shareAt.x, y: n.shareAt.y, width: n.shareWidths[scene.year] }} register={r.area} fill={colours.ink} halo={{ colour: colours.ground, width: props.halo }} />
              </g>
            );
          })}
        </g>

        <g opacity={scene.ring}>
          <Word line={props.ringName} register={r.feature} fill={colours.ink} halo={{ colour: colours.ground, width: props.halo }} />
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
