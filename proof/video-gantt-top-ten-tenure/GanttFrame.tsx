/**
 * One frame of « Six pays n'ont jamais quitté le top 10 des émetteurs depuis 1990 » — the title card, the sixteen rows, the
 * bars growing year by year as the count of the 1990 ten who never left falls, then the six picked out (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { Ref } from "react";
import { blend } from "../video-cartogram-europe-lowcarbon/scene.mjs";
import { sceneAt } from "./scene.mjs";

type Register = { fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; letterSpacing: number; lead: number };
type Line = { text: string; x: number; y: number; width: number };
type Word = { text: string; width: number };
type Slot = "display" | "eyebrow" | "value" | "axis" | "source";

export type GanttFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: { ground: string; track: string; grid: string; bar: string; kept: string; faded: string; text: Record<"eyebrow" | "title" | "name" | "kept" | "axis" | "count", string> };
  plot: { left: number; top: number; right: number; bottom: number };
  first: number;
  last: number;
  yearWidth: number;
  rows: Array<{ key: string; throughout: boolean; member: boolean; leftAt: number | null; runs: Array<{ from: number; to: number }>; y: number; h: number; trackY: number; trackH: number; name: Line }>;
  ticks: Line[];
  neverLeft: number[];
  counts: Record<string, Word>;
  countAt: { x: number; y: number };
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

export function GanttFrame(props: GanttFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, credit, titleCard, plot } = props;
  const scene = sceneAt(props as never, props.at);
  const xOf = (year: number) => plot.left + (year - props.first) * props.yearWidth;
  const count = props.counts[String(scene.neverLeft)];
  const barOf = (kept: boolean) => (kept ? blend(colours.bar, colours.kept, scene.focus) : blend(colours.bar, colours.faded, scene.focus));
  const nameOf = (kept: boolean, out: number) => (kept ? blend(colours.text.name, colours.text.kept, scene.focus) : blend(colours.text.name, colours.text.axis, Math.max(out, scene.focus)));

  return (
    <svg ref={props.svgRef} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
      <rect width={frame.width} height={frame.height} fill={colours.ground} />
      <g opacity={scene.furniture}>
        {props.rows.map((row) => (
          <rect key={`track-${row.key}`} x={plot.left} y={row.trackY} width={plot.right - plot.left} height={row.trackH} fill={colours.track} />
        ))}
        <line x1={plot.left} x2={plot.right} y1={plot.bottom} y2={plot.bottom} stroke={colours.grid} strokeWidth={props.strokes.grid} />
        {props.ticks.map((t, i) => (
          <Text key={`tick${i}`} line={t} register={r.axis} fill={colours.text.axis} />
        ))}
        {props.rows.map((row, i) => (
          <Text key={`name-${row.key}`} line={row.name} register={r.axis} fill={nameOf(row.throughout, scene.out[i])} opacity={row.throughout ? 1 : 1 - 0.4 * scene.focus} />
        ))}
      </g>

      {props.rows.flatMap((row, i) =>
        scene.bars[i].map((b, j) => <rect key={`bar-${row.key}-${j}`} x={xOf(b.from)} y={row.y} width={(b.to - b.from) * props.yearWidth} height={row.h} fill={barOf(row.throughout)} />),
      )}

      <Text line={{ ...count, ...props.countAt }} register={r.value} fill={colours.text.count} opacity={scene.counting} halo={{ colour: colours.ground, width: props.halo.value }} />

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
