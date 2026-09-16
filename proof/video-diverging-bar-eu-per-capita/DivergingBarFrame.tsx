/**
 * One frame of « La Croatie est le seul pays de l'UE à émettre plus de CO₂ par personne qu'en 1990 » — the title card, the
 * 1990 levels, every level going to 2024 with the part lost left pale, the parts lost sliding across the zero line into
 * the changes, the camera closing ×250 onto the zero line where Croatia's rise becomes a length, then pulling back
 * (BRIEF.md).
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

export type DivergingBarFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: { ground: string; grid: string; level: string; lost: string; fall: string; rise: string; faded: string; ring: string; text: Record<"eyebrow" | "title" | "name" | "axis" | "value" | "rise" | "count", string> };
  subject: string;
  rows: Array<{ key: string; from: number; to: number; change: number; column: number; y: number; box: { x: number; y: number; w: number; h: number }; name: Line; value: Word & { y: number } }>;
  columns: Array<{ x0: number; start: number; end: number; zero: number; middle: number; top: number; bottom: number }>;
  barH: number;
  unit: number;
  zoomBy: number;
  zoomWord: Word & { y: number };
  counts: Record<string, Word>;
  year: Line;
  countAt: { x: number; y: number };
  unitLine: Line;
  gap: number;
  strokes: { zero: number; ring: number; rise: number };
  halo: { value: number; axis: number };
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

const WIDER = 1.02;

export function DivergingBarFrame(props: DivergingBarFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, credit, titleCard } = props;
  const scene = sceneAt(props as never, props.at);
  const axisHalo = { colour: colours.ground, width: props.halo.axis };
  const count = props.counts[String(scene.landed)];
  // A fall's change is read only on the whole scale: the camera sends its tip out of the frame.
  const fallsReadable = scene.flip >= 1 ? Math.max(0, 1 - scene.camera * 8) : 0;

  return (
    <svg ref={props.svgRef} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
      <defs>
        {props.columns.map((c, i) => (
          <clipPath key={`clip${i}`} id={`column${i}`}>
            <rect x={c.start} y={0} width={c.end - c.start} height={frame.height} />
          </clipPath>
        ))}
      </defs>
      <rect width={frame.width} height={frame.height} fill={colours.ground} />
      <g opacity={scene.furniture}>
        <Text line={props.unitLine} register={r.axis} fill={colours.text.axis} />
        {props.rows.map((row, i) => (
          <Text key={`name${i}`} line={row.name} register={r.axis} fill={row.key === props.subject ? colours.text.name : blend(colours.text.name, colours.text.axis, scene.rows[i].stepBack)} opacity={1 - 0.4 * scene.rows[i].stepBack} />
        ))}
      </g>
      {scene.counting ? null : <Text line={props.year} register={r.value} fill={colours.text.count} opacity={scene.furniture} />}
      {scene.landed > 0 ? <Text line={{ ...count, ...props.countAt }} register={r.value} fill={colours.text.count} /> : null}

      {props.columns.map((c, ci) => (
        <g key={`column${ci}`} clipPath={`url(#column${ci})`}>
          {props.rows.map((row, i) => {
            if (row.column !== ci) return null;
            const s = scene.rows[i];
            const rises = row.change > 0;
            const partFill = rises ? colours.rise : blend(blend(colours.lost, colours.fall, scene.flip), colours.faded, s.stepBack);
            return (
              <g key={row.key}>
                {s.level.w > 0 && s.level.opacity > 0 ? <rect x={s.level.x} y={row.y} width={s.level.w} height={props.barH} fill={colours.level} opacity={s.level.opacity} /> : null}
                {s.part.shown ? <rect x={s.part.x} y={row.y} width={rises ? Math.max(s.part.w, props.strokes.rise * scene.flip) : s.part.w} height={props.barH} fill={partFill} /> : null}
              </g>
            );
          })}
          <line x1={c.start + (scene.rows.find((_, i) => props.rows[i].column === ci)!.zero - c.start) * scene.flip} x2={c.start + (scene.rows.find((_, i) => props.rows[i].column === ci)!.zero - c.start) * scene.flip} y1={c.top} y2={c.bottom} stroke={colours.grid} strokeWidth={props.strokes.zero} opacity={scene.furniture} />
        </g>
      ))}

      {props.rows.map((row, i) => {
        const s = scene.rows[i];
        if (row.change > 0) {
          if (!(scene.flip >= 1)) return null;
          return <Text key={`value${i}`} line={{ ...row.value, x: Math.max(s.tip, s.zero + props.strokes.rise) + props.gap / 2 }} register={r.axis} fill={colours.text.rise} halo={axisHalo} />;
        }
        if (!(fallsReadable > 0)) return null;
        return <Text key={`value${i}`} line={{ ...row.value, x: s.tip - props.gap / 2 - row.value.width * WIDER }} register={r.axis} fill={colours.text.value} opacity={fallsReadable * (1 - 0.6 * s.stepBack)} />;
      })}
      {props.rows.map((row) => {
        if (row.key !== props.subject) return null;
        const c = props.columns[row.column];
        const x = c.middle + props.gap;
        return <Text key="zoom" line={{ ...props.zoomWord, x, y: props.zoomWord.y }} register={r.value} fill={colours.text.count} opacity={scene.camera} halo={{ colour: colours.ground, width: props.halo.value }} />;
      })}
      {props.rows.map((row) =>
        row.key === props.subject ? <rect key="ring" x={row.box.x} y={row.box.y} width={row.box.w} height={row.box.h} rx={row.box.h / 2} fill="none" stroke={colours.ring} strokeWidth={props.strokes.ring} opacity={scene.ring} /> : null,
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
