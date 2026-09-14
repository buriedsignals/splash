/**
 * One frame of « En 2024, la Suisse a émis moins de CO₂ sur son territoire qu'en 1967 » — the title card, then the line
 * tracing 1950 → 2024 through the 1967 rule, the peak marked, 2024 ringed (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { Ref } from "react";
import { sceneAt } from "./scene.mjs";

type Register = { fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; letterSpacing: number; lead: number };
type Line = { text: string; x: number; y: number; width: number };
type Slot = "display" | "eyebrow" | "value" | "axis" | "annot" | "source";

export type LineFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: { ground: string; grid: string; line: string; rule: string; text: Record<"eyebrow" | "title" | "tip" | "axis" | "annot", string> };
  strokes: { line: number; grid: number; rule: number; dash: number[] };
  plot: { left: number; top: number; right: number; bottom: number };
  points: Array<{ year: number; x: number; y: number }>;
  peak: { x: number; y: number; year: number; label: Line };
  end: { x: number; y: number };
  referenceY: number;
  referenceLabel: Line;
  ticksY: Array<Line & { y: number; baseline: number }>;
  ticksX: Array<Line & { tickX: number }>;
  tipTexts: Record<string, { text: string; width: number }>;
  tipOffset: number;
  tipBaselineShift: number;
  dotR: number;
  peakYear: number;
  halo: number;
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

export function LineFrame(props: LineFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, strokes, plot, credit, titleCard } = props;
  const scene = sceneAt(props as never, props.at);
  const tipText = props.tipTexts[String(scene.tip.year)];
  const halo = { colour: colours.ground, width: props.halo };

  return (
    <svg ref={props.svgRef} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
      <rect width={frame.width} height={frame.height} fill={colours.ground} />

      {/* ── THE FURNITURE ── */}
      <g opacity={scene.furniture}>
        {props.ticksY.map((t, i) => (
          <g key={`ty${i}`}>
            <line x1={plot.left} x2={plot.right} y1={t.y} y2={t.y} stroke={colours.grid} strokeWidth={strokes.grid} />
            <Word line={{ ...t, y: t.baseline }} register={r.axis} fill={colours.text.axis} />
          </g>
        ))}
        {props.ticksX.map((t, i) => (
          <g key={`tx${i}`}>
            <line x1={t.tickX} x2={t.tickX} y1={plot.bottom} y2={plot.bottom + props.dotR * 2} stroke={colours.rule} strokeWidth={strokes.grid} />
            <Word line={t} register={r.axis} fill={colours.text.axis} />
          </g>
        ))}
        <line x1={plot.left} x2={plot.right} y1={props.referenceY} y2={props.referenceY} stroke={colours.rule} strokeWidth={strokes.rule} strokeDasharray={strokes.dash.join(" ")} />
        <Word line={props.referenceLabel} register={r.annot} fill={colours.text.annot} halo={halo} />
      </g>

      {/* ── THE LINE, traced ── */}
      <path d={scene.path} fill="none" stroke={colours.line} strokeWidth={strokes.line} strokeLinejoin="round" strokeLinecap="round" />
      <g opacity={scene.peak}>
        <circle cx={props.peak.x} cy={props.peak.y} r={props.dotR} fill={colours.text.annot} />
        <Word line={props.peak.label} register={r.annot} fill={colours.text.annot} halo={halo} />
      </g>
      <g opacity={scene.tip.shown}>
        <circle cx={scene.tip.x} cy={scene.tip.y} r={props.dotR * (1 + 0.3 * scene.subject)} fill={colours.line} />
        <Word line={{ ...tipText, x: scene.tip.x + props.tipOffset, y: scene.tip.y + props.tipBaselineShift }} register={r.value} fill={colours.text.tip} halo={halo} />
      </g>
      <circle cx={props.end.x} cy={props.end.y} r={props.dotR * 3} fill="none" stroke={colours.line} strokeWidth={strokes.rule} opacity={scene.subject} />

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
