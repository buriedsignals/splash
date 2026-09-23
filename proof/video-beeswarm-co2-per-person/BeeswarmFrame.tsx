/**
 * One frame of « Les 6 pays au-dessus de 20 t de CO₂ par personne pèsent 0,6 % de l’humanité » — the title card, one world
 * disc at the average bursting into its 213 countries, the six beyond 20 t ringed and their copies merged inside the
 * world's outline, then the whole swarm with the tail bracketed (BRIEF.md).
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
type Slot = "display" | "eyebrow" | "axis" | "value" | "name" | "source";

export type BeeswarmFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: {
    ground: string;
    field: string;
    mark: string;
    rule: string;
    text: Record<"eyebrow" | "title" | "name" | "muted" | "accent", string>;
  };
  strokes: { rule: number; ring: number; outline: number };
  band: { top: number; bottom: number; midline: number };
  ticks: Array<Line & { at: number }>;
  mean: { x: number; label: Line };
  world: { x: number; y: number; r: number; label: Line };
  radiusPerRootPerson: number;
  members: Array<{
    code: string;
    people: number;
    tonnes: number;
    x: number;
    y: number;
    r: number;
    ring: number;
    order: number;
    high: boolean;
    highRank: number;
    name?: Line;
  }>;
  compare: { x: number; y: number; share: Line };
  bracket: {
    x0: number;
    x1: number;
    y: number;
    tick: number;
    label: Line;
    share: Line;
  };
  counter: Record<string, Line>;
  halo: number;
  /** The names' own halo: the naming ladder may set them in the axis voice, and a halo is the register's. */
  nameHalo: number;
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

export function BeeswarmFrame(
  props: BeeswarmFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const {
    frame,
    registers: r,
    colours,
    strokes,
    band,
    credit,
    titleCard,
    bracket,
  } = props;
  const scene = sceneAt(props as never, props.at);
  const halo = { colour: colours.ground, width: props.halo };
  const nameHalo = { colour: colours.ground, width: props.nameHalo };
  const highs = props.members.filter((m) => m.high);

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
          <Text
            key={`tick${i}`}
            line={t}
            register={r.axis}
            fill={colours.text.muted}
          />
        ))}
        <line
          x1={props.mean.x}
          x2={props.mean.x}
          y1={band.top}
          y2={band.bottom}
          stroke={colours.rule}
          strokeWidth={strokes.rule}
        />
        <Text
          line={props.mean.label}
          register={r.axis}
          fill={colours.text.muted}
        />
        {scene.world.r > 0 ? (
          <circle
            cx={props.world.x}
            cy={props.world.y}
            r={scene.world.r}
            fill={colours.field}
          />
        ) : null}
      </g>

      {props.members.map((m, i) => {
        const s = scene.members[i];
        return s.shown ? (
          <circle key={m.code} cx={s.x} cy={s.y} r={m.r} fill={colours.field} />
        ) : null;
      })}

      <g opacity={scene.ring}>
        {highs.map((m) => (
          <circle
            key={`ring${m.code}`}
            cx={m.x}
            cy={m.y}
            r={m.ring}
            fill="none"
            stroke={colours.mark}
            strokeWidth={strokes.ring}
          />
        ))}
        <path
          d={`M ${bracket.x0} ${bracket.y - bracket.tick} V ${bracket.y} H ${bracket.x1} V ${bracket.y - bracket.tick}`}
          fill="none"
          stroke={colours.mark}
          strokeWidth={strokes.ring}
        />
        <Text
          line={bracket.label}
          register={r.value}
          fill={colours.text.accent}
          halo={halo}
        />
      </g>

      {props.members.map((m, i) =>
        m.name ? (
          <Text
            key={`name${m.code}`}
            line={m.name}
            register={r.name}
            fill={colours.text.name}
            opacity={scene.members[i].arrived}
            halo={nameHalo}
          />
        ) : null,
      )}
      {scene.world.label > 0 ? (
        <Text
          line={props.world.label}
          register={r.value}
          fill={colours.text.name}
          opacity={scene.furniture * scene.world.label}
          halo={halo}
        />
      ) : null}

      <circle
        cx={scene.ghost.x}
        cy={scene.ghost.y}
        r={scene.ghost.r}
        fill="none"
        stroke={colours.mark}
        strokeWidth={strokes.outline}
        opacity={scene.ghost.opacity}
      />
      {scene.merged.r > 0 ? (
        <circle
          cx={props.compare.x}
          cy={props.compare.y}
          r={scene.merged.r}
          fill={colours.mark}
        />
      ) : null}
      {highs.map((m, k) => {
        const s = scene.copies[k];
        return s.on ? (
          <circle
            key={`copy${m.code}`}
            cx={s.x}
            cy={s.y}
            r={m.r}
            fill={colours.mark}
          />
        ) : null;
      })}
      <Text
        line={{ ...props.compare.share, x: scene.share.x, y: scene.share.y }}
        register={r.value}
        fill={colours.text.accent}
        opacity={scene.share.opacity}
        halo={halo}
      />

      {scene.counter > 0 ? (
        <Text
          line={props.counter[String(scene.counted)]}
          register={r.value}
          fill={colours.text.name}
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
