/**
 * One frame of « Tous plus propres chez eux, 5 plus légers en Europe » — the title card, the sixteen 2000 rings, every
 * country travelling to 2024 as the count climbs, the close-up onto the crowd, then the whole again with the five that
 * weigh less picked out and France's two moves (BRIEF.md).
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
type Offset = { text: string; width: number; dx: number; dy: number };
type Leader = { code: string; dx0: number; dy0: number; dx1: number; dy1: number };

export type ConnectedScatterFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: { ground: string; grid: string; context: string; faded: string; picked: string; subject: string; text: Record<"eyebrow" | "title" | "name" | "picked" | "subject" | "axis" | "count", string> };
  strokes: { arc: number; ring: number; grid: number; leg: number };
  dash: number[];
  R: number;
  plot: { left: number; top: number; right: number; bottom: number };
  bowCap: number;
  domain: { whole: number; close: number };
  grid: Array<{ y: number; label: Line }>;
  xTicks: { whole: Array<Word & { v: number }>; close: Array<Word & { v: number }>; y: number };
  xName: Line;
  yName: Line;
  entities: Array<{ code: string; rank: number; from: number; to: number; y0: number; y1: number; names: { whole: Offset | null; close: Offset | null } }>;
  leaders: { whole: Leader[]; close: Leader[] };
  subject: string;
  lighter: string[];
  legs: { from: number[]; corner: number[]; to: number[]; across: Line; up: Line };
  panel: {
    at: { x: number; y: number };
    cleaner: { x: number; y: number };
    lighter: { x: number; y: number };
    key: { cy: number; ring: number; disc: number; years: Line[] };
    counterTexts: { cleaner: Record<string, Word>; lighter: Record<string, Word> };
  };
  halo: { axis: number; value: number };
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

export function ConnectedScatterFrame(props: ConnectedScatterFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, strokes, plot, credit, titleCard, panel, legs, R } = props;
  const scene = sceneAt(props as never, props.at);
  const axisHalo = { colour: colours.ground, width: props.halo.axis };
  const valueHalo = { colour: colours.ground, width: props.halo.value };
  const xOf = (v: number) => plot.left + (v / scene.xMax) * (plot.right - plot.left);
  const markOf = (code: string) => {
    const s = scene.entities[code];
    if (code === props.subject && s.picked > 0) return blend(colours.context, colours.subject, s.picked);
    if (s.picked > 0) return blend(colours.context, colours.picked, s.picked);
    return blend(colours.context, colours.faded, s.stepBack);
  };
  const nameOf = (code: string) => {
    const s = scene.entities[code];
    if (code === props.subject && s.picked > 0) return blend(colours.text.name, colours.text.subject, s.picked);
    return s.picked > 0 ? blend(colours.text.name, colours.text.picked, s.picked) : colours.text.name;
  };
  // Drawn back to front: the stepped-back countries, the others, the five, France.
  const depth = (code: string) => (code === props.subject ? 3 : props.lighter.includes(code) ? 2 : 1);
  const drawn = [...props.entities].sort((a, b) => depth(a.code) - depth(b.code));
  const cleaner = panel.counterTexts.cleaner[String(scene.cleaner)];
  const lighter = panel.counterTexts.lighter[String(scene.lighterCount)];
  const legAt = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const acrossTip = legAt(legs.from, legs.corner, scene.legs.across);
  const upTip = legAt(legs.corner, legs.to, scene.legs.up);
  // One set of ticks at a time: the whole's give way as the camera starts to close, the close-up's land as it settles.
  const tickShown = (set: "whole" | "close", v: number) => (v <= scene.xMax * 1.001 ? (set === "close" ? scene.closeNames : scene.wholeNames) : 0);
  const leaderLines = (set: "whole" | "close", opacityOf: (code: string) => number) =>
    props.leaders[set].map((l) => {
      const p = scene.entities[l.code].point;
      return <line key={`${set}-leader-${l.code}`} x1={p[0] + l.dx0} y1={p[1] + l.dy0} x2={p[0] + l.dx1} y2={p[1] + l.dy1} stroke={colours.text.axis} strokeWidth={strokes.grid} opacity={opacityOf(l.code)} />;
    });

  return (
    <svg ref={props.svgRef} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
      <defs>
        <clipPath id="field">
          <rect x={plot.left - R * 2} y={0} width={plot.right - plot.left + R * 3} height={frame.height} />
        </clipPath>
      </defs>
      <rect width={frame.width} height={frame.height} fill={colours.ground} />
      <g opacity={scene.furniture}>
        {props.grid.map((g, i) => (
          <g key={`grid${i}`}>
            <line x1={plot.left} x2={plot.right} y1={g.y} y2={g.y} stroke={colours.grid} strokeWidth={strokes.grid} />
            <Text line={g.label} register={r.axis} fill={colours.text.axis} />
          </g>
        ))}
        {(["whole", "close"] as const).flatMap((set) =>
          props.xTicks[set].map((t) => <Text key={`${set}-tick${t.v}`} line={{ text: t.text, width: t.width, x: xOf(t.v) - t.width / 2, y: props.xTicks.y }} register={r.axis} fill={colours.text.axis} opacity={tickShown(set, t.v)} />),
        )}
        <Text line={props.yName} register={r.axis} fill={colours.text.axis} />
        <Text line={props.xName} register={r.axis} fill={colours.text.axis} />
      </g>

      <g clipPath="url(#field)" opacity={scene.furniture}>
        {drawn.map((e) => {
          const s = scene.entities[e.code];
          const c = markOf(e.code);
          return (
            <g key={e.code}>
              {s.arc ? <path d={s.arc} fill="none" stroke={c} strokeWidth={strokes.arc} strokeDasharray={props.dash.join(" ")} strokeLinecap="round" /> : null}
              {s.bar.to > s.bar.from + 0.5 ? <line x1={s.bar.from} x2={s.bar.to} y1={s.bar.y} y2={s.bar.y} stroke={c} strokeWidth={R * 1.3} strokeLinecap="round" /> : null}
              <circle cx={s.ring[0]} cy={s.ring[1]} r={R} fill={colours.ground} stroke={c} strokeWidth={strokes.ring} opacity={s.ringShown} />
              <circle cx={s.point[0]} cy={s.point[1]} r={R} fill={c} opacity={s.disc} />
            </g>
          );
        })}
        <g stroke={colours.subject} strokeWidth={strokes.leg} strokeLinecap="round">
          {scene.legs.across > 0 ? <line x1={legs.from[0]} y1={legs.from[1]} x2={acrossTip[0]} y2={acrossTip[1]} /> : null}
          {scene.legs.up > 0 ? <line x1={legs.corner[0]} y1={legs.corner[1]} x2={upTip[0]} y2={upTip[1]} /> : null}
        </g>
      </g>
      <Text line={legs.across} register={r.value} fill={colours.text.subject} opacity={scene.legs.across >= 1 ? 1 : 0} halo={valueHalo} />
      <Text line={legs.up} register={r.value} fill={colours.text.subject} opacity={scene.legs.up >= 1 ? 1 : 0} halo={valueHalo} />

      {leaderLines("whole", (code) => scene.entities[code].whole?.opacity ?? 0)}
      {leaderLines("close", (code) => scene.entities[code].close?.opacity ?? 0)}
      {props.entities.flatMap((e) => {
        const s = scene.entities[e.code];
        return (["whole", "close"] as const).map((set) => {
          const name = e.names[set];
          const seat = s[set];
          if (!name || !seat) return null;
          return <Text key={`${set}-${e.code}`} line={{ text: name.text, width: name.width, x: seat.x, y: seat.y }} register={r.axis} fill={nameOf(e.code)} opacity={seat.opacity} halo={axisHalo} />;
        });
      })}

      <g transform={`translate(${panel.at.x} ${panel.at.y})`} opacity={scene.furniture}>
        <Text line={{ ...cleaner, ...panel.cleaner }} register={r.value} fill={colours.text.count} opacity={scene.travel > 0 ? 1 : 0} halo={valueHalo} />
        <Text line={{ ...lighter, ...panel.lighter }} register={r.value} fill={colours.text.count} opacity={scene.lighterShown} halo={valueHalo} />
        <circle cx={panel.key.ring} cy={panel.key.cy} r={R} fill={colours.ground} stroke={colours.context} strokeWidth={strokes.ring} />
        <circle cx={panel.key.disc} cy={panel.key.cy} r={R} fill={colours.context} />
        {panel.key.years.map((y, i) => (
          <Text key={`year${i}`} line={y} register={r.axis} fill={colours.text.axis} halo={axisHalo} />
        ))}
      </g>

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
