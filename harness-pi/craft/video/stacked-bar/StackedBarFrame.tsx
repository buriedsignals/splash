/**
 * One frame of « L’Espagne a ajouté plus d’électricité bas-carbone que la France depuis 2000 » — the title card, the twelve
 * 2000 levels, the parts added by 2024 stacking on them, five copies of Spain's level laid along France's, the added parts
 * pulled off to zero and the rows re-sorted by gain, then the whole stack with Spain and France ringed (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { Ref } from "react";
import { copyText, countText, sceneAt } from "./scene.mjs";

type Register = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: string;
  letterSpacing: number;
  lead: number;
};
type Line = { text: string; x: number; y: number; width: number };
type Slot = "display" | "eyebrow" | "value" | "axis" | "source";
type Box = { x: number; y: number; w: number; h: number };

export type StackedBarFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: {
    ground: string;
    pale: string;
    full: string;
    ring: string;
    text: Record<"eyebrow" | "title" | "name" | "axis" | "accent" | "onPale", string>;
  };
  adder: string;
  incumbent: string;
  rings: string[];
  copies: number;
  before: string[];
  byGain: string[];
  rows: Array<{
    key: string;
    level: number;
    growth: number;
    total: number;
    thread: boolean;
    name: { text: string; width: number; x: number };
    levelText: { text: string; width: number; x: number };
  }>;
  top: number;
  pitch: number;
  trackH: number;
  left: number;
  right: number;
  max: number;
  countX: number;
  nameShift: number;
  countShift: number;
  countWidths: Record<string, number>;
  copyWidths: Record<string, number>;
  ticks: Line[];
  ringX: number;
  ringW: number;
  unitLine: Line;
  legend: Array<{ swatch: Box; word: Line }>;
  strokes: { ring: number; seam: number };
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

export function StackedBarFrame(
  props: StackedBarFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const { frame, registers: r, colours, credit, titleCard, legend } = props;
  const scene = sceneAt(props as never, props.at);
  const span = props.right - props.left;
  const xOf = (v: number) => props.left + (v / props.max) * span;
  const trackTop = (slot: number) =>
    props.top + slot * props.pitch + (props.pitch - props.trackH) / 2;
  const lastLanded =
    scene.copyCount > 0 ? scene.copies[scene.copyCount - 1] : null;
  const copyLabel = copyText(scene.copyCount);

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
        <Text
          line={props.unitLine}
          register={r.axis}
          fill={colours.text.axis}
        />
        {legend.map((k, i) => (
          <g key={`key${i}`}>
            <rect
              x={k.swatch.x}
              y={k.swatch.y}
              width={k.swatch.w}
              height={k.swatch.h}
              fill={[colours.pale, colours.full][i]}
            />
            <Text line={k.word} register={r.axis} fill={colours.text.axis} />
          </g>
        ))}
        {props.ticks.map((t, i) => (
          <Text
            key={`tick${i}`}
            line={t}
            register={r.axis}
            fill={colours.text.axis}
          />
        ))}
      </g>

      {props.rows.map((row, i) => {
        const s = scene.rows[i];
        const y = trackTop(s.slot);
        const baseline = props.top + s.slot * props.pitch;
        const count = s.count === null ? null : countText(s.count);
        return (
          <g key={row.key} opacity={scene.furniture}>
            {s.level.w > 0 ? (
              <rect
                x={xOf(0)}
                y={y}
                width={xOf(s.level.w) - xOf(0)}
                height={props.trackH}
                fill={colours.pale}
                opacity={s.level.opacity}
              />
            ) : null}
            {s.gain.to > s.gain.from ? (
              <rect
                x={xOf(s.gain.from)}
                y={y}
                width={xOf(s.gain.to) - xOf(s.gain.from)}
                height={props.trackH}
                fill={colours.full}
              />
            ) : null}
            {s.levelText > 0 ? (
              <Text
                line={{ ...row.levelText, y: baseline + props.nameShift }}
                register={r.axis}
                fill={colours.text.axis}
                opacity={s.levelText}
              />
            ) : null}
            <Text
              line={{ ...row.name, y: baseline + props.nameShift }}
              register={r.axis}
              fill={row.thread ? colours.text.accent : colours.text.name}
              opacity={scene.words}
            />
            {count !== null ? (
              <Text
                line={{
                  text: count,
                  width: props.countWidths[count],
                  x: props.countX,
                  y: baseline + props.countShift,
                }}
                register={r.value}
                fill={row.thread ? colours.text.accent : colours.text.axis}
                opacity={scene.words}
              />
            ) : null}
          </g>
        );
      })}

      {/* The copies of the adder's level, over the rows they cross; the seam of the ground stands outside each copy's own length. */}
      <g opacity={scene.copyOpacity}>
        {scene.copies.map((c, k) => (
          <rect
            key={`copy${k}`}
            x={xOf(c.from) - props.strokes.seam / 2}
            y={trackTop(c.slot) - props.strokes.seam / 2}
            width={xOf(c.to) - xOf(c.from) + props.strokes.seam}
            height={props.trackH + props.strokes.seam}
            fill={colours.pale}
            stroke={colours.ground}
            strokeWidth={props.strokes.seam}
          />
        ))}
        {lastLanded ? (
          <Text
            line={{
              text: copyLabel,
              width: props.copyWidths[copyLabel],
              x:
                (xOf(lastLanded.from) +
                  xOf(lastLanded.to) -
                  props.copyWidths[copyLabel]) /
                2,
              y: props.top + lastLanded.slot * props.pitch + props.countShift,
            }}
            register={r.value}
            fill={colours.text.onPale}
          />
        ) : null}
      </g>

      {props.rows.map((row, i) => {
        if (!props.rings.includes(row.key)) return null;
        const y = props.top + scene.rows[i].slot * props.pitch;
        return (
          <rect
            key={`ring${row.key}`}
            x={props.ringX}
            y={y + props.pitch * 0.04}
            width={props.ringW}
            height={props.pitch * 0.92}
            rx={props.pitch * 0.2}
            fill="none"
            stroke={colours.ring}
            strokeWidth={props.strokes.ring}
            opacity={scene.ring}
          />
        );
      })}

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
