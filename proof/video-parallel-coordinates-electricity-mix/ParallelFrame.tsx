/**
 * One frame of « 2 pays sur 16 ont plus de 25 % de nucléaire et plus de 20 % d’éolien » — the title card, Finland's bar
 * standing up on the seven rails, sixteen lines, the nuclear–wind gap opened and a floor swept up each rail, then the whole
 * chart with the pair in the accent (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { Ref } from "react";
import { blend } from "../video-cartogram-europe-lowcarbon/scene.mjs";
import { KEPT, sceneAt } from "./scene.mjs";

type Register = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: string;
  letterSpacing: number;
  lead: number;
};
type Text = { text: string; width: number };
type Line = Text & { x: number; y: number };
type Slot = "display" | "eyebrow" | "axis" | "value" | "source";

export type ParallelFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: {
    ground: string;
    rail: string;
    field: string;
    lit: string;
    pair: string;
    floor: string;
    text: Record<
      "eyebrow" | "title" | "name" | "pair" | "rail" | "count",
      string
    >;
  };
  strokes: {
    line: number;
    pair: number;
    rail: number;
    floor: number;
    connector: number;
  };
  camera: {
    whole: { left: number; step: number };
    close: { left: number; step: number };
  };
  scale: number;
  top: number;
  foot: number;
  headerBaseline: number;
  axes: Text[];
  bar: {
    x0: number;
    splitGap: number;
    thickness: number;
    pieces: Array<{ axis: number | null; cum: number; len: number }>;
    name: Line;
    hundred: Line;
  };
  floors: Array<{
    axis: number;
    value: number;
    side: "left" | "right";
    texts: Record<string, Text>;
  }>;
  tick: number;
  gap: number;
  shift: number;
  lines: Array<{
    code: string;
    name: string;
    values: number[];
    pair: boolean;
    shown: boolean;
    drawRank: number | null;
    ys: number[];
    seat: Text & { axis: number; anchor: string; off: number; y: number };
    close: (Text & { dx: number; cy: number; y: number }) | null;
  }>;
  counter: { texts: Record<string, Text>; x: number; y: number };
  halo: number;
  states: Record<string, number>[];
  timing: unknown;
};

function Word({
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

const pathOf = (points: number[][]) =>
  `M${points.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" L")}`;

export function ParallelFrame(
  props: ParallelFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const { frame, registers: r, colours, strokes, credit, titleCard } = props;
  const scene = sceneAt(props as never, props.at);
  const halo = { colour: colours.ground, width: props.halo };
  // The stepped-back lines under the kept ones, the pair over everything.
  const order = props.lines
    .map((_, i) => i)
    .sort(
      (a, b) =>
        Number(props.lines[a].pair) - Number(props.lines[b].pair) ||
        scene.lines[b].stepBack - scene.lines[a].stepBack,
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

      {scene.rails.map((rail, i) => (
        <g key={`rail${i}`} opacity={rail.opacity}>
          <line
            x1={rail.x}
            x2={rail.x}
            y1={props.top}
            y2={props.foot}
            stroke={colours.rail}
            strokeWidth={strokes.rail}
          />
          <Word
            line={{
              ...props.axes[i],
              x: rail.x - props.axes[i].width / 2,
              y: props.headerBaseline,
            }}
            register={r.axis}
            fill={colours.text.rail}
          />
        </g>
      ))}

      {order.map((i) => {
        const d = props.lines[i];
        const s = scene.lines[i];
        if (s.points.length < 2) return null;
        const base =
          s.lit > 0 ? blend(colours.field, colours.lit, s.lit) : colours.field;
        const stroke =
          s.accent > 0 ? blend(base, colours.pair, s.accent) : base;
        const width =
          strokes.line +
          (strokes.pair - strokes.line) * Math.max(s.accent, s.lit);
        return (
          <path
            key={d.code}
            d={pathOf(s.points)}
            fill="none"
            stroke={stroke}
            strokeWidth={width}
            strokeLinejoin="round"
            opacity={1 - (1 - KEPT) * s.stepBack}
          />
        );
      })}

      {scene.pieces.map((p, k) =>
        p.opacity > 0 &&
        p.width > 0 &&
        Math.hypot(p.x2 - p.x1, p.y2 - p.y1) > 0 ? (
          <line
            key={`piece${k}`}
            x1={p.x1}
            y1={p.y1}
            x2={p.x2}
            y2={p.y2}
            stroke={p.axis === null ? colours.rail : colours.lit}
            strokeWidth={p.width}
            opacity={p.opacity}
          />
        ) : null,
      )}
      <Word
        line={props.bar.hundred}
        register={r.axis}
        fill={colours.text.name}
        opacity={scene.hundred}
      />

      {scene.floors.map((f, i) => {
        const spec = props.floors[i];
        const text = spec.texts[f.label];
        const x =
          spec.side === "right"
            ? f.x + props.tick / 2 + props.gap / 2
            : f.x - props.tick / 2 - props.gap / 2 - text.width;
        return (
          <g key={`floor${i}`} opacity={f.opacity}>
            <line
              x1={f.x - props.tick / 2}
              x2={f.x + props.tick / 2}
              y1={f.y}
              y2={f.y}
              stroke={colours.floor}
              strokeWidth={strokes.floor}
            />
            <Word
              line={{ ...text, x, y: f.y + props.shift }}
              register={r.axis}
              fill={colours.text.count}
              halo={halo}
            />
          </g>
        );
      })}

      {order.map((i) => {
        const d = props.lines[i];
        const s = scene.lines[i];
        const kept = 1 - (1 - KEPT) * s.stepBack;
        const fill = s.accent > 0.5 ? colours.text.pair : colours.text.name;
        return (
          <g key={`names${d.code}`} opacity={kept}>
            {s.name.opacity > 0 ? (
              <Word
                line={{ ...d.seat, x: s.name.x, y: s.name.y }}
                register={r.axis}
                fill={fill}
                opacity={s.name.opacity}
                halo={halo}
              />
            ) : null}
            {s.close && d.close && s.close.opacity > 0 ? (
              <g opacity={s.close.opacity}>
                <line
                  x1={s.close.x + d.close.width + props.gap / 4}
                  x2={s.close.x + d.close.dx}
                  y1={s.close.cy}
                  y2={d.ys[0]}
                  stroke={colours.rail}
                  strokeWidth={strokes.connector}
                />
                <Word
                  line={{ ...d.close, x: s.close.x, y: s.close.y }}
                  register={r.axis}
                  fill={fill}
                  halo={halo}
                />
              </g>
            ) : null}
          </g>
        );
      })}

      {scene.counter > 0 ? (
        <Word
          line={{
            ...props.counter.texts[String(scene.count)],
            x: props.counter.x,
            y: props.counter.y,
          }}
          register={r.value}
          fill={colours.text.count}
          opacity={scene.counter}
          halo={halo}
        />
      ) : null}

      <g
        transform={`translate(${credit.at.x} ${credit.at.y})`}
        opacity={scene.source}
      >
        {credit.lines.map((line, i) => (
          <Word
            key={`credit${i}`}
            line={line}
            register={r.source}
            fill={colours.text.name}
            halo={{ colour: colours.ground, width: credit.halo }}
          />
        ))}
      </g>

      <g opacity={scene.title}>
        <rect width={frame.width} height={frame.height} fill={colours.ground} />
        <Word
          line={titleCard.eyebrow}
          register={r.eyebrow}
          fill={colours.text.eyebrow}
        />
        {titleCard.title.map((line, i) => (
          <Word
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
