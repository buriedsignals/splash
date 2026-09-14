/**
 * One frame of « Par habitant, la Tchéquie accueille 36,1 Ukrainiens pour 1 000 habitants » — the title card, the hex grid
 * classed by count and Germany ringed, then every cell re-classed per inhabitant and Czechia ringed (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: paths, positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { Ref } from "react";
import { sceneAt } from "./scene.mjs";

type Register = { fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; letterSpacing: number; lead: number };
type Line = { text: string; x: number; y: number; width: number };
type Measured = { text: string; width: number };
type Slot = "display" | "eyebrow" | "value" | "axis" | "code" | "source";
type Rect = { x: number; y: number; width: number; height: number };

export type HexFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  legend: {
    at: { x: number; y: number };
    largestRow: { x: number; y: number; count: Measured; rate: Measured };
    leaderRow: Line;
    unitRow: { x: number; y: number; count: Measured; rate: Measured };
    swatches: Rect[];
    bornes: { count: Line[]; rate: Line[] };
    originSwatch: Rect;
    originLabel: Line;
    halo: number;
    valueHalo: number;
  };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: { ground: string; neutral: string; origin: string; originEdge: string; classFills: string[]; ring: string; text: Record<"eyebrow" | "title" | "figure" | "key" | "source", string> };
  strokes: { gap: number; ring: number; originDash: number[]; hairline: number };
  cells: Array<{ code: string; origin: boolean; countClass: number | null; rateClass: number | null; d: string; ring: string; label: Line & { inks: Record<"neutral" | "count" | "rate", string> } }>;
  largest: string;
  leader: string;
  states: Record<string, number>[];
  timing: unknown;
};

function Word({ line, register, fill, opacity = 1, anchor }: { line: Line; register: Register; fill: string; opacity?: number; anchor?: "middle" }) {
  return (
    <text textAnchor={anchor} x={line.x} y={line.y} fontFamily={register.fontFamily} fontSize={register.fontSize} fontWeight={register.fontWeight} fontStyle={register.fontStyle} letterSpacing={register.letterSpacing} fill={fill} opacity={opacity} data-width={line.width}>
      {line.text}
    </text>
  );
}

export function HexFrame(props: HexFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, strokes, legend: key, credit, titleCard } = props;
  const scene = sceneAt(props as never, props.at);
  const ringOf = (code: string) => props.cells.find((c) => c.code === code)!.ring;

  return (
    <svg ref={props.svgRef} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
      <rect width={frame.width} height={frame.height} fill={colours.ground} />

      {/* ── THE GRID ── */}
      <g opacity={scene.furniture}>
        {props.cells.map((c) => (
          <path key={c.code} d={c.d} fill={scene.fills[c.code]} stroke={c.origin ? colours.originEdge : colours.ground} strokeWidth={c.origin ? strokes.hairline : strokes.gap} strokeDasharray={c.origin ? strokes.originDash.join(" ") : undefined} strokeLinejoin="round" />
        ))}
        {props.cells.map((c) => (
          <Word key={`code-${c.code}`} line={c.label} register={r.code} fill={c.label.inks[scene.inkStage[c.code] as "neutral" | "count" | "rate"]} anchor="middle" />
        ))}
      </g>
      <path d={ringOf(props.largest)} fill="none" stroke={colours.ring} strokeWidth={strokes.ring} strokeLinejoin="round" opacity={scene.largest * (1 - 0.35 * scene.leader)} />
      <path d={ringOf(props.leader)} fill="none" stroke={colours.ring} strokeWidth={strokes.ring} strokeLinejoin="round" opacity={scene.leader} />

      {/* ── THE KEY COLUMN ── */}
      <g transform={`translate(${key.at.x} ${key.at.y})`} opacity={scene.furniture}>
        <Word line={{ ...key.largestRow.count, x: key.largestRow.x, y: key.largestRow.y }} register={r.value} fill={colours.text.figure} opacity={scene.largest * (1 - scene.rate)} />
        <Word line={{ ...key.largestRow.rate, x: key.largestRow.x, y: key.largestRow.y }} register={r.value} fill={colours.text.figure} opacity={scene.largest * scene.rate} />
        <Word line={key.leaderRow} register={r.value} fill={colours.text.figure} opacity={scene.leader} />
        <Word line={{ ...key.unitRow.count, x: key.unitRow.x, y: key.unitRow.y }} register={r.axis} fill={colours.text.key} opacity={1 - scene.rate} />
        <Word line={{ ...key.unitRow.rate, x: key.unitRow.x, y: key.unitRow.y }} register={r.axis} fill={colours.text.key} opacity={scene.rate} />
        {key.swatches.map((s, i) => (
          <rect key={`swatch${i}`} x={s.x} y={s.y} width={s.width} height={s.height} fill={colours.classFills[i]} opacity={scene.swatches[i]} />
        ))}
        {key.bornes.count.map((b, i) => (
          <Word key={`count${i}`} line={b} register={r.axis} fill={colours.text.key} opacity={scene.swatches[i + 1] * (1 - scene.rate)} />
        ))}
        {key.bornes.rate.map((b, i) => (
          <Word key={`rate${i}`} line={b} register={r.axis} fill={colours.text.key} opacity={scene.rate} />
        ))}
        <rect x={key.originSwatch.x} y={key.originSwatch.y} width={key.originSwatch.width} height={key.originSwatch.height} fill={colours.origin} stroke={colours.originEdge} strokeWidth={strokes.hairline} strokeDasharray={strokes.originDash.join(" ")} />
        <Word line={key.originLabel} register={r.axis} fill={colours.text.key} />
      </g>

      <g transform={`translate(${credit.at.x} ${credit.at.y})`} opacity={scene.source}>
        {credit.lines.map((line, i) => (
          <Word key={`credit${i}`} line={line} register={r.source} fill={colours.text.source} />
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
