/**
 * One frame of « En 2000 les États-Unis émettaient un quart du CO₂ mondial et la Chine un septième ; en 2023, c'est
 * l'inverse » — the title card, the world's 2000 ring traced, the 2023 ring grown out of it on one tonnes scale, the world
 * split into six rings keeping every arc's angle, China's number ringed (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { Ref } from "react";
import { arcPath, sceneAt } from "./scene.mjs";

type Register = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: string;
  letterSpacing: number;
  lead: number;
};
type Line = { text: string; x: number; y: number; width: number };
type Slot = "display" | "eyebrow" | "axis" | "value" | "annot" | "source";

export type DonutFrameProps = {
  frame: { width: number; height: number };
  inset: number;
  slot: number;
  valueBand: number;
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: {
    ground: string;
    past: string;
    present: string;
    track: string;
    text: Record<"eyebrow" | "title" | "name" | "muted" | "accent", string>;
  };
  strokes: { ring: number };
  world: {
    x: number;
    y: number;
    r0: number;
    r1: number;
    width: number;
    seam: number;
    pxPerGt: number;
    labels: {
      before: Array<Line & { code: string }>;
      after: Array<Line & { code: string }>;
    };
    centre: { before: Line; after: Line };
  };
  small: { outer: number; inner: number; width: number; holeRing: number };
  countries: Array<{
    code: string;
    subject: boolean;
    gt0: number;
    gt1: number;
    share0: number;
    share1: number;
    seat: { x: number; y: number };
    hole: Line;
    name: Line;
    tonnes: Line[];
  }>;
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

type Arc = {
  x: number;
  y: number;
  r: number;
  start: number;
  drawn: number;
  width: number;
  seam: number;
  opacity: number;
};
function ArcMark({ arc, stroke }: { arc: Arc; stroke: string }) {
  const d = arc.opacity > 0 ? arcPath(arc) : null;
  return d ? (
    <path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={arc.width}
      strokeLinecap="butt"
      opacity={arc.opacity}
    />
  ) : null;
}

export function DonutFrame(
  props: DonutFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const {
    frame,
    registers: r,
    colours,
    world,
    small,
    credit,
    titleCard,
  } = props;
  const scene = sceneAt(props as never, props.at);

  return (
    <svg
      ref={props.svgRef}
      xmlns="http://www.w3.org/2000/svg"
      width={frame.width}
      height={frame.height}
      viewBox={`0 0 ${frame.width} ${frame.height}`}
    >
      <rect width={frame.width} height={frame.height} fill={colours.ground} />

      {scene.tracks > 0 ? (
        <circle
          cx={world.x}
          cy={world.y}
          r={world.r0}
          fill="none"
          stroke={colours.track}
          strokeWidth={world.width}
          opacity={scene.tracks}
        />
      ) : null}
      {scene.copy > 0 ? (
        <circle
          cx={world.x}
          cy={world.y}
          r={scene.worldR}
          fill="none"
          stroke={colours.track}
          strokeWidth={world.width}
          opacity={scene.copy}
        />
      ) : null}

      {props.countries.map((c, i) => {
        const shown = scene.arcs[i].arrived;
        return shown > 0 ? (
          <g key={`tracks${c.code}`} opacity={shown}>
            <circle
              cx={c.seat.x}
              cy={c.seat.y}
              r={small.outer}
              fill="none"
              stroke={colours.track}
              strokeWidth={small.width}
            />
            <circle
              cx={c.seat.x}
              cy={c.seat.y}
              r={small.inner}
              fill="none"
              stroke={colours.track}
              strokeWidth={small.width}
            />
          </g>
        ) : null;
      })}

      {props.countries.map((c, i) => (
        <g key={`arcs${c.code}`}>
          <ArcMark arc={scene.arcs[i].before} stroke={colours.past} />
          <ArcMark arc={scene.arcs[i].after} stroke={colours.present} />
        </g>
      ))}

      {props.countries.map((c, i) => {
        const shown = scene.arcs[i].arrived;
        return shown > 0 ? (
          <g key={`words${c.code}`} opacity={shown}>
            <Text
              line={c.hole}
              register={r.value}
              fill={c.subject ? colours.text.accent : colours.text.name}
            />
            <Text
              line={c.name}
              register={r.annot}
              fill={c.subject ? colours.text.accent : colours.text.muted}
            />
            {c.tonnes.map((line, k) => (
              <Text
                key={`t${k}`}
                line={line}
                register={r.axis}
                fill={colours.text.muted}
              />
            ))}
          </g>
        ) : null;
      })}

      {props.countries
        .filter((c) => c.subject)
        .map((c) => (
          <circle
            key={`ring${c.code}`}
            cx={c.seat.x}
            cy={c.seat.y}
            r={small.holeRing}
            fill="none"
            stroke={colours.present}
            strokeWidth={props.strokes.ring}
            opacity={scene.ring}
          />
        ))}

      {scene.labels.before > 0
        ? world.labels.before.map((l) => (
            <Text
              key={`b${l.code}`}
              line={l}
              register={r.value}
              fill={colours.text.muted}
              opacity={scene.labels.before}
            />
          ))
        : null}
      {scene.labels.after > 0
        ? world.labels.after.map((l) => (
            <Text
              key={`a${l.code}`}
              line={l}
              register={r.value}
              fill={colours.text.name}
              opacity={scene.labels.after}
            />
          ))
        : null}
      {scene.centre.before > 0 ? (
        <Text
          line={world.centre.before}
          register={r.value}
          fill={colours.text.muted}
          opacity={scene.centre.before}
        />
      ) : null}
      {scene.centre.after > 0 ? (
        <Text
          line={world.centre.after}
          register={r.value}
          fill={colours.text.accent}
          opacity={scene.centre.after}
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
