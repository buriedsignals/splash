/**
 * One frame of « La population mondiale a dépassé 8 milliards en 2022 » — the title card; the surface filling year by
 * year while the population counts up; the 1800 slice made a unit and copied up its own column until it meets the 2023
 * level, the count climbing to ×8,2; the level run out to 2023; the 8 billion crossing ringed (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { Ref } from "react";
import { sceneAt } from "./scene.mjs";

type Register = { fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; letterSpacing: number; lead: number };
type Line = { text: string; x: number; y: number; width: number };
type Slot = "display" | "eyebrow" | "value" | "axis" | "annot" | "source";

export type PopulationFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: {
    ground: string;
    grid: string;
    surface: string;
    tint: string;
    stack: string;
    rule: string;
    text: Record<"eyebrow" | "title" | "counter" | "axis" | "crossing", string>;
  };
  strokes: { grid: number; rule: number };
  plot: { left: number; top: number; right: number; bottom: number };
  points: Array<{ year: number; x: number; y: number; pop: number }>;
  baseY: number;
  multiple: number;
  unitHeight: number;
  stack: { x: number; width: number };
  level: { x0: number; x1: number; y: number };
  ring: { x: number; y: number; r: number };
  camera: { focus: { x: number; y: number }; target: { x: number; y: number }; scale: number };
  crossingLabel: { text: string; width: number; dx: number; dy: number };
  endLabel: { text: string; width: number; dx: number; dy: number };
  gridLabel: { text: string; width: number; x: number; dy: number };
  ticksY: Array<Line & { baseline: number }>;
  ticksX: Array<Line & { tickX: number }>;
  counter: { at: { x: number; y: number }; texts: Record<string, { text: string; width: number }>; counts: Record<string, { text: string; width: number }> };
  halo: number;
  states: Record<string, number>[];
  timing: unknown;
};

function Word({ line, register, fill, opacity = 1, halo }: { line: Line; register: Register; fill: string; opacity?: number; halo?: { colour: string; width: number } }) {
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

export function PopulationFrame(props: PopulationFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, strokes, plot, credit, titleCard, stack, level, ring } = props;
  const scene = sceneAt(props as never, props.at);
  const halo = { colour: colours.ground, width: props.halo };
  const counterText = props.counter.texts[String(scene.year)];
  const countText = props.counter.counts[scene.count];
  const sep = Math.max(1, strokes.rule);

  return (
    <svg ref={props.svgRef} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
      <rect width={frame.width} height={frame.height} fill={colours.ground} />

      <g opacity={scene.furniture * (1 - scene.zoom)}>
        {props.ticksY.map((t, i) => (
          <Word key={`ty${i}`} line={{ ...t, y: t.baseline }} register={r.axis} fill={colours.text.axis} />
        ))}
        {props.ticksX.map((t, i) => (
          <Word key={`tx${i}`} line={t} register={r.axis} fill={colours.text.axis} />
        ))}
      </g>

      {/* ── THE CAMERA: everything drawn in plot space moves together; strokes keep their screen width. ── */}
      <g transform={scene.transform}>
      <g opacity={scene.furniture}>
        {props.ticksY.map((t, i) => (
          <line key={`gy${i}`} x1={plot.left} x2={plot.right} y1={t.y} y2={t.y} stroke={colours.grid} strokeWidth={strokes.grid} vectorEffect="non-scaling-stroke" />
        ))}
      </g>

      {/* ── THE SURFACE: filled in the accent, stepped back to its tint while the unit is copied, given back at the end. ── */}
      <path d={scene.surface} fill={colours.surface} />
      <path d={scene.surface} fill={colours.tint} opacity={scene.tint} />

      {/* ── THE UNIT AND ITS COPIES: each block one 1800 level, on the plot's own scale, a ground hairline between. ── */}
      <g opacity={scene.unit}>
        {scene.blocks.map((b, i) => (
          <rect key={`b${i}`} x={stack.x} y={b.bottom - b.height} width={stack.width} height={b.height} fill={colours.stack} />
        ))}
        {scene.blocks.slice(1).map((b, i) => (
          <line key={`s${i}`} x1={stack.x} x2={stack.x + stack.width} y1={b.bottom} y2={b.bottom} stroke={colours.ground} strokeWidth={sep} vectorEffect="non-scaling-stroke" />
        ))}
      </g>

      <line x1={level.x0} x2={scene.levelX} y1={level.y} y2={level.y} stroke={colours.rule} strokeWidth={strokes.rule} strokeDasharray={`${4 * strokes.rule} ${3 * strokes.rule}`} vectorEffect="non-scaling-stroke" opacity={scene.level > 0 ? 1 : 0} />
      </g>
      <circle cx={scene.end.x} cy={scene.end.y} r={2.5 * strokes.rule} fill={colours.rule} opacity={scene.level >= 1 ? 1 : 0} />

      <g opacity={scene.named}>
        <circle cx={scene.ring.x} cy={scene.ring.y} r={ring.r} fill="none" stroke={colours.rule} strokeWidth={strokes.rule} />
        <Word line={{ ...props.crossingLabel, x: scene.ring.x + props.crossingLabel.dx, y: scene.ring.y + props.crossingLabel.dy }} register={r.annot} fill={colours.text.crossing} halo={halo} />
        <Word line={{ ...props.endLabel, x: scene.end.x + props.endLabel.dx, y: scene.end.y + props.endLabel.dy }} register={r.annot} fill={colours.text.crossing} halo={halo} />
        <Word line={{ ...props.gridLabel, y: scene.gridline + props.gridLabel.dy }} register={r.axis} fill={colours.text.axis} halo={halo} />
      </g>

      <Word line={{ ...counterText, ...props.counter.at }} register={r.value} fill={colours.text.counter} opacity={scene.counterShown} halo={halo} />
      <Word line={{ ...countText, ...props.counter.at }} register={r.value} fill={colours.text.counter} opacity={scene.unit * (1 - scene.zoom)} halo={halo} />

      <g transform={`translate(${credit.at.x} ${credit.at.y})`} opacity={scene.source}>
        {credit.lines.map((line, i) => (
          <Word key={`credit${i}`} line={line} register={r.source} fill={colours.text.axis} halo={{ colour: colours.ground, width: credit.halo }} />
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
