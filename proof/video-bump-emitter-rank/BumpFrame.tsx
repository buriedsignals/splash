/**
 * One frame of « L'Inde est passée du 8e au 3e rang mondial des émetteurs de CO₂ » — the title card, the 1990 top ten,
 * every line advancing year by year with India's rank riding its tip and each pass ringed, then India and the three it
 * passed picked out (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { Ref } from "react";
import { sceneAt } from "./scene.mjs";

type Register = { fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; letterSpacing: number; lead: number };
type Line = { text: string; x: number; y: number; width: number };
type Slot = "display" | "eyebrow" | "value" | "axis" | "source";
type Role = "subject" | "passed" | "other";

export type BumpFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: { ground: string; grid: string; subject: string; passed: string; other: string; text: Record<"eyebrow" | "title" | "subject" | "passed" | "other" | "axis", string> };
  strokes: { line: number; subject: number; grid: number };
  plot: { left: number; top: number; right: number; bottom: number };
  xs: number[];
  rows: number[];
  tracks: Array<{ key: string; role: Role; ys: Array<number | null> }>;
  subject: string;
  leftNames: Array<Line & { entity: string; role: Role }>;
  rightNames: Array<Line & { entity: string; role: Role }>;
  tipTexts: Record<string, { text: string; width: number }>;
  tipNames: Record<string, { text: string; width: number }>;
  nameShift: number;
  yearTexts: Record<string, { text: string; width: number }>;
  yearAt: { right: number; y: number };
  firstYear: number;
  gap: number;
  tipRanks: Array<number | null>;
  tipOffset: number;
  tipRise: number;
  passes: Array<{ entity: string; index: number; x: number; y: number }>;
  ticks: Line[];
  dotR: number;
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

export function BumpFrame(props: BumpFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, strokes, plot, credit, titleCard } = props;
  const scene = sceneAt(props as never, props.at);
  const halo = { colour: colours.ground, width: props.halo };
  const stepped = (role: Role) => (role === "other" ? 1 - 0.7 * scene.focus : 1);
  // The countries India passed look like any other until the focus picks them out: never before the proof.
  const shown = (role: Role): Role => (role === "passed" && scene.focus < 0.5 ? "other" : role);
  const order: Role[] = ["other", "passed", "subject"];
  const tipRank = props.tipRanks[scene.tipIndex];

  return (
    <svg ref={props.svgRef} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
      <rect width={frame.width} height={frame.height} fill={colours.ground} />
      <g transform={scene.transform}>
      <g opacity={scene.furniture}>
        {props.rows.map((y, i) => (
          <line key={`row${i}`} x1={plot.left} x2={plot.right} y1={y} y2={y} stroke={colours.grid} strokeWidth={strokes.grid} />
        ))}
        {props.ticks.map((t, i) => (
          <Word key={`tick${i}`} line={t} register={r.axis} fill={colours.text.axis} />
        ))}
        {props.leftNames.map((n) => (
          <Word key={`l-${n.entity}`} line={n} register={r.axis} fill={colours.text[shown(n.role)]} opacity={stepped(n.role)} />
        ))}
      </g>

      {order.flatMap((role) =>
        props.tracks
          .filter((t) => t.role === role)
          .map((t) => <path key={t.key} d={scene.paths[t.key]} fill="none" stroke={colours[shown(role)]} strokeWidth={role === "subject" ? strokes.subject : strokes.line} strokeLinejoin="round" strokeLinecap="round" opacity={stepped(role)} />),
      )}
      {props.passes.map((p, i) => (
        <circle key={`pass${i}`} cx={p.x} cy={p.y} r={props.dotR * 3.5} fill="none" stroke={colours.subject} strokeWidth={strokes.grid * 2} opacity={scene.passes[i]} />
      ))}
      {scene.tip && tipRank !== null ? (
        <Word line={{ ...props.tipTexts[String(tipRank)], x: scene.tip.x + props.tipOffset, y: scene.tip.y - props.tipRise }} register={r.value} fill={colours.text.subject} opacity={scene.tipShown} halo={halo} />
      ) : null}
      {props.tracks.map((t) => {
        const at = scene.tips[t.key];
        const name = props.tipNames[t.key];
        if (!at || !name || !(scene.camera > 0)) return null;
        return <Word key={`tip-${t.key}`} line={{ ...name, x: at.x + props.gap, y: at.y + props.nameShift }} register={r.axis} fill={colours.text[shown(t.role)]} opacity={scene.camera * stepped(t.role)} halo={halo} />;
      })}
      <g opacity={scene.arrived * (1 - scene.camera)}>
        {props.rightNames.map((n) => (
          <Word key={`r-${n.entity}`} line={n} register={r.axis} fill={colours.text[shown(n.role)]} opacity={stepped(n.role)} />
        ))}
      </g>
      </g>

      {scene.camera > 0 ? (() => {
        const year = props.yearTexts[String(props.firstYear + Math.min(scene.tipIndex, props.xs.length - 1))];
        return year ? <Word line={{ ...year, x: props.yearAt.right - year.width * 1.02, y: props.yearAt.y }} register={r.value} fill={colours.text.passed} opacity={scene.camera} halo={halo} /> : null;
      })() : null}

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
