/**
 * One frame of `video-cold2-world-population` — the title card, the story (BRIEF.md, « The choreography »), the credit.
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`. A pure
 * component of its props and `at`, so Bun renders the same markup and holds it to the type floor.
 */

import type { Ref } from "react";
import { sceneAt } from "./scene.mjs";

type Register = { fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; letterSpacing: number; lead: number };
type Line = { text: string; x: number; y: number; width: number };
type Slot = "display" | "eyebrow" | "value" | "axis" | "annot" | "source";

export type WorldPopulationFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: { ground: string; grid: string; accent: string; tint: string; ink: string; text: Record<"eyebrow" | "title" | "source" | "axis" | "value" | "ink", string> };
  strokes: { grid: number; rule: number };
  halo: number;
  states: Record<string, number>[];
  timing: unknown;
  plot: { left: number; right: number; top: number; bottom: number };
  points: { year: number; x: number; y: number }[];
  baseY: number;
  ticksY: (Line & { rule: number })[];
  ticksX: (Line & { tickX: number })[];
  counter: { at: { x: number; y: number }; texts: Record<string, { text: string; width: number }> };
  stack: { origin: { x: number; y: number }; seats: { x: number; y: number }[]; width: number; height: number; count: { at: { x: number; y: number }; texts: { text: string; width: number }[] } };
  crossing: { year: number; dot: { x: number; y: number; r: number }; label: Line };
};

/** Every word the frame draws: set in its register, carrying the width Bun measured (`data-width`) for the read-back. */
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

export function WorldPopulationFrame(props: WorldPopulationFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, credit, titleCard, plot, ticksY, ticksX, counter, stack, crossing } = props;
  const scene = sceneAt(props as never, props.at);

  return (
    <svg ref={props.svgRef} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
      <rect width={frame.width} height={frame.height} fill={colours.ground} />

      <g opacity={scene.furniture}>
        {ticksY.map((t, i) => (
          <g key={`ty${i}`}>
            <line x1={plot.left} x2={plot.right} y1={t.rule} y2={t.rule} stroke={colours.grid} strokeWidth={props.strokes.grid} />
            <Word line={t} register={r.axis} fill={colours.text.axis} />
          </g>
        ))}
        {ticksX.map((t, i) => (
          <Word key={`tx${i}`} line={t} register={r.axis} fill={colours.text.axis} />
        ))}
      </g>

      {scene.surface && (
        <g>
          <path d={scene.surface} fill={colours.accent} />
          <path d={scene.surface} fill={colours.tint} opacity={scene.tint} />
        </g>
      )}

      {scene.fill > 0 && (
        <g opacity={scene.counter}>
          <Word line={{ ...counter.texts[String(scene.year)], ...counter.at }} register={r.value} fill={colours.text.value} halo={{ colour: colours.ground, width: props.halo }} />
        </g>
      )}

      <rect x={stack.origin.x} y={stack.origin.y} width={stack.width} height={stack.height} fill={colours.accent} opacity={scene.lift} stroke={colours.ink} strokeWidth={props.strokes.rule} />

      {scene.blocks.map((b, i) => (
        <rect key={`b${i}`} x={b.x} y={b.y} width={stack.width} height={stack.height} fill={colours.accent} stroke={colours.ground} strokeWidth={props.strokes.rule} />
      ))}
      {scene.count > 0 && (
        <Word line={{ ...stack.count.texts[scene.count], x: stack.count.at.x - stack.count.texts[scene.count].width / 2, y: stack.count.at.y }} register={r.value} fill={colours.text.ink} />
      )}

      <g opacity={scene.named}>
        <circle cx={crossing.dot.x} cy={crossing.dot.y} r={crossing.dot.r} fill={colours.ink} stroke={colours.ground} strokeWidth={props.strokes.rule} />
        <Word line={crossing.label} register={r.annot} fill={colours.text.ink} halo={{ colour: colours.ground, width: props.halo }} />
      </g>

      <g transform={`translate(${credit.at.x} ${credit.at.y})`} opacity={scene.source}>
        {credit.lines.map((line, i) => (
          <Word key={`credit${i}`} line={line} register={r.source} fill={colours.text.source} halo={{ colour: colours.ground, width: credit.halo }} />
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
