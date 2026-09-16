/**
 * One frame of « La Pologne a gagné 5,0 ans d’espérance de vie depuis 2000, les États-Unis 2,5 » — the title card, ten rows
 * ranked by their 2000 level, every dot travelling to 2023, the rows re-ranked by gain and every gain pulled onto one start
 * line, then the whole dumbbell with Poland's row ringed (BRIEF.md).
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
type Slot = "display" | "eyebrow" | "axis" | "value" | "source";
type Word = { text: string; width: number; x: number; dy: number };

export type DumbbellFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: {
    ground: string;
    grid: string;
    past: string;
    present: string;
    connector: string;
    guide: string;
    ring: string;
    text: Record<
      "eyebrow" | "title" | "name" | "muted" | "pair" | "count",
      string
    >;
  };
  strokes: { connector: number; axis: number; guide: number; ring: number };
  plot: {
    left: number;
    right: number;
    top: number;
    foot: number;
    axisY: number;
  };
  ring: { x: number; width: number; height: number; rx: number };
  ticks: Array<Line & { at: number }>;
  rows: Array<{
    key: string;
    levelRank: number;
    gainRank: number;
    pair: boolean;
    subject: boolean;
    a: { x: number };
    b: { x: number };
    name: Word;
    gain: Word;
  }>;
  slots: number[];
  start: number;
  legend: { dots: Array<{ x: number; y: number }>; labels: Line[] };
  counter: Record<string, Line>;
  dotR: number;
  halo: number;
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

export function DumbbellFrame(
  props: DumbbellFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const {
    frame,
    registers: r,
    colours,
    strokes,
    plot,
    credit,
    titleCard,
    dotR,
  } = props;
  const scene = sceneAt(props as never, props.at);
  const halo = { colour: colours.ground, width: props.halo };
  const ringed = props.rows.findIndex((d) => d.subject);

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
        {props.ticks.map((t, i) => (
          <line
            key={`grid${i}`}
            x1={t.at}
            x2={t.at}
            y1={plot.top}
            y2={plot.axisY}
            stroke={colours.grid}
            strokeWidth={strokes.axis}
            opacity={0.5}
          />
        ))}
        <line
          x1={plot.left - dotR}
          x2={plot.right + dotR}
          y1={plot.axisY}
          y2={plot.axisY}
          stroke={colours.grid}
          strokeWidth={strokes.axis}
        />
        {props.ticks.map((t, i) => (
          <Text
            key={`tick${i}`}
            line={t}
            register={r.axis}
            fill={colours.text.muted}
          />
        ))}
        <circle
          cx={props.legend.dots[0].x}
          cy={props.legend.dots[0].y}
          r={dotR}
          fill={colours.past}
        />
        <Text
          line={props.legend.labels[0]}
          register={r.axis}
          fill={colours.text.muted}
        />
      </g>
      <g opacity={scene.later}>
        <circle
          cx={props.legend.dots[1].x}
          cy={props.legend.dots[1].y}
          r={dotR}
          fill={colours.present}
        />
        <Text
          line={props.legend.labels[1]}
          register={r.axis}
          fill={colours.text.pair}
        />
      </g>

      <line
        x1={props.start}
        x2={props.start}
        y1={plot.top}
        y2={plot.foot}
        stroke={colours.guide}
        strokeWidth={strokes.guide}
        opacity={scene.guide}
      />

      {ringed >= 0 ? (
        <rect
          x={props.ring.x}
          y={scene.rows[ringed].y - props.ring.height / 2}
          width={props.ring.width}
          height={props.ring.height}
          rx={props.ring.rx}
          fill="none"
          stroke={colours.ring}
          strokeWidth={strokes.ring}
          opacity={scene.ring}
        />
      ) : null}

      {props.rows.map((d, i) => {
        const s = scene.rows[i];
        return (
          <g key={d.key}>
            <g opacity={scene.furniture * (1 - 0.7 * s.stepBack)}>
              {s.travelled ? (
                <line
                  x1={d.a.x}
                  x2={s.dotX}
                  y1={s.y}
                  y2={s.y}
                  stroke={colours.connector}
                  strokeWidth={strokes.connector}
                  strokeLinecap="round"
                />
              ) : null}
              <circle cx={d.a.x} cy={s.y} r={dotR} fill={colours.past} />
              {s.travelled ? (
                <circle cx={s.dotX} cy={s.y} r={dotR} fill={colours.present} />
              ) : null}
            </g>
            <Text
              line={{ ...d.name, y: s.y + d.name.dy }}
              register={r.axis}
              fill={
                d.subject && scene.ring > 0.5
                  ? colours.text.pair
                  : colours.text.name
              }
              opacity={scene.furniture * (1 - s.nameDim)}
              halo={halo}
            />
            <Text
              line={{ ...d.gain, y: s.y + d.gain.dy }}
              register={r.value}
              fill={d.pair ? colours.text.pair : colours.text.muted}
              opacity={s.gainShown}
            />
          </g>
        );
      })}
      {props.rows.map((d, i) => {
        const s = scene.rows[i];
        return s.copy.on ? (
          <line
            key={`copy${d.key}`}
            x1={s.copy.x0}
            x2={s.copy.x1}
            y1={s.y}
            y2={s.y}
            stroke={colours.present}
            strokeWidth={strokes.connector}
            strokeLinecap="round"
          />
        ) : null;
      })}

      {scene.counter > 0 ? (
        <Text
          line={props.counter[String(scene.rose)]}
          register={r.value}
          fill={colours.text.count}
          opacity={scene.counter}
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
            fill={colours.text.muted}
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
