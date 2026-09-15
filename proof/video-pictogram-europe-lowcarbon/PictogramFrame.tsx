/**
 * One frame of « L'Europe électrique est aux deux bouts : 6 pays seulement au milieu » — the title card, forty squares
 * standing on the low-carbon axis, the axis parted at 60 and 75 %, each part settled into its block and counted, « 6 pays »
 * ringed (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { Ref } from "react";
import { sceneAt } from "./scene.mjs";

type Register = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: string;
  letterSpacing: number;
  lead: number;
};
type Line = { text: string; x: number; y: number; width: number };
type Word = { text: string; width: number };
type Slot = "display" | "eyebrow" | "value" | "axis" | "source";
type Point = { x: number; y: number };

export type PictogramFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: Point; halo: number; lines: Line[] };
  colours: {
    ground: string;
    grid: string;
    ramp: string[];
    zero: string;
    cut: string;
    ring: string;
    text: Record<"eyebrow" | "title" | "axis" | "cut" | "count", string>;
  };
  cell: number;
  most: number;
  squares: Array<{
    code: string;
    block: number;
    k: number;
    share: number;
    classIndex: number;
    x: number;
    y: number;
  }>;
  slots: Point[];
  finals: Point[];
  /** Where the furniture stands, read by `layoutAt`; the frame takes only the words from it. */
  layout: { ends: { zero: Word; hundred: Word }; counters: Array<{ words: Record<string, Word> }> } & Record<string, unknown>;
  cutWords: Array<Word & { half: number }>;
  ring: { x: number; y: number; w: number; h: number };
  strokes: { zero: number; cut: number; square: number; ring: number };
  halo: { value: number };
  states: Record<string, number>[];
  timing: unknown;
};

function Text({
  line,
  register,
  fill,
  opacity = 1,
  halo,
}: {
  line: Line;
  register: Register;
  fill: string;
  opacity?: number;
  halo?: { colour: string; width: number };
}) {
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

const WIDER = 1.02;

export function PictogramFrame(
  props: PictogramFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const { frame, registers: r, colours, credit, titleCard } = props;
  const scene = sceneAt(props as never, props.at);
  // Moving squares drawn last, over the ones at rest.
  const order = scene.squares
    .map((_: unknown, i: number) => i)
    .sort(
      (a: number, b: number) =>
        Number(scene.squares[a].resting === false) -
        Number(scene.squares[b].resting === false),
    );

  return (
    <svg
      ref={props.svgRef}
      xmlns="http://www.w3.org/2000/svg"
      width={frame.width}
      height={frame.height}
      viewBox={`0 0 ${frame.width} ${frame.height}`}
    >
      <rect width={frame.width} height={frame.height} fill={colours.ground} />

      <g opacity={scene.furniture}>
        {scene.segments.map(([a, b]: number[], i: number) => (
          <line key={`axis${i}`} x1={a} x2={b} y1={scene.baseline} y2={scene.baseline} stroke={colours.zero} strokeWidth={props.strokes.zero} />
        ))}
        <Text line={{ ...props.layout.ends.zero, ...scene.ends.zero }} register={r.axis} fill={colours.text.axis} />
        <Text line={{ ...props.layout.ends.hundred, ...scene.ends.hundred }} register={r.axis} fill={colours.text.axis} />
      </g>

      {order.map((i: number) => {
        const s = scene.squares[i];
        const sq = props.squares[i];
        return s.opacity > 0 ? (
          <rect
            key={sq.code}
            x={s.x}
            y={s.y}
            width={s.side}
            height={s.side}
            fill={colours.ramp[sq.classIndex]}
            stroke={colours.grid}
            strokeWidth={props.strokes.square}
            opacity={s.opacity}
          />
        ) : null;
      })}

      {scene.cutsRise > 0
        ? scene.cuts.map((c: { x: number; top: number }, i: number) => (
            <g key={`cut${i}`}>
              <line
                x1={c.x}
                x2={c.x}
                y1={scene.baseline}
                y2={scene.baseline + (c.top - scene.baseline) * scene.cutsRise}
                stroke={colours.cut}
                strokeWidth={props.strokes.cut}
              />
              <Text line={{ ...props.cutWords[i], ...scene.cutWords[i] }} register={r.axis} fill={colours.text.cut} opacity={scene.cutsOpacity} />
            </g>
          ))
        : null}

      {scene.counters.map((c: { block: number; key: string; opacity: number; x: number; y: number }) => {
        const word = props.layout.counters[c.block].words[c.key];
        return c.opacity > 0 ? (
          <Text
            key={`count${c.block}`}
            line={{ ...word, x: c.x - (word.width * WIDER) / 2, y: c.y }}
            register={r.value}
            fill={colours.text.count}
            opacity={c.opacity}
            halo={{ colour: colours.ground, width: props.halo.value }}
          />
        ) : null;
      })}
      {scene.ring > 0 ? (
        <rect
          x={props.ring.x}
          y={props.ring.y}
          width={props.ring.w}
          height={props.ring.h}
          rx={props.ring.h / 2}
          fill="none"
          stroke={colours.ring}
          strokeWidth={props.strokes.ring}
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - scene.ring}
        />
      ) : null}

      <g
        transform={`translate(${credit.at.x} ${credit.at.y})`}
        opacity={scene.source}
      >
        {credit.lines.map((line, i) => (
          <Text
            key={`credit${i}`}
            line={line}
            register={r.source}
            fill={colours.text.axis}
            halo={{ colour: colours.ground, width: credit.halo }}
          />
        ))}
      </g>

      <g opacity={scene.title}>
        <rect width={frame.width} height={frame.height} fill={colours.ground} />
        <Text
          line={titleCard.eyebrow}
          register={r.eyebrow}
          fill={colours.text.eyebrow}
        />
        {titleCard.title.map((line, i) => (
          <Text
            key={`title${i}`}
            line={line}
            register={titleCard.register}
            fill={colours.text.title}
          />
        ))}
      </g>
    </svg>
  );
}
