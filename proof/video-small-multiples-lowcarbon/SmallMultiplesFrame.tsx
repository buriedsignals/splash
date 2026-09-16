/**
 * One frame of « Les seize ont tous progressé, et ceux qui partaient de plus bas le plus » — the title card, sixteen 2000
 * bars in one row cut into sixteen panels, each 2024 bar sliding out of its 2000 bar and rising, the parts added dropped
 * to the baseline and the panels re-sorted by their start, then the whole grid with Denmark and Sweden ringed (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { Ref } from "react";
import { countText, sceneAt } from "./scene.mjs";

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

export type SmallMultiplesFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: {
    ground: string;
    pale: string;
    full: string;
    rule: string;
    ring: string;
    text: Record<"eyebrow" | "title" | "name" | "axis" | "accent", string>;
  };
  before: string[];
  byStart: string[];
  rings: string[];
  rows: Array<{
    key: string;
    from: number;
    to: number;
    delta: number;
    thread: boolean;
    name: { text: string; width: number };
    ring: Box;
  }>;
  ceiling: number;
  cells: Array<{ x: number; top: number }>;
  seats: Array<{ x: number; top: number }>;
  barsH: number;
  barW: number;
  barGap: number;
  overhang: number;
  slotW: number;
  textDx: number;
  nameBaseline: number;
  countBaseline: number;
  countWidths: Record<string, number>;
  unitLine: Line;
  legend: Array<{ swatch: Box; word: Line }>;
  strokes: { ring: number; rule: number };
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

export function SmallMultiplesFrame(
  props: SmallMultiplesFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const { frame, registers: r, colours, credit, titleCard, legend } = props;
  const scene = sceneAt(props as never, props.at);
  const hOf = (v: number) => (v / props.ceiling) * props.barsH;
  const pairW = 2 * props.barW + props.barGap;

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
      </g>

      {props.rows.map((row, i) => {
        const s = scene.rows[i];
        const ruleX =
          -(props.slotW - props.barW) / 2 +
          (-props.overhang + (props.slotW - props.barW) / 2) * s.cut;
        const ruleW =
          props.slotW + (pairW + 2 * props.overhang - props.slotW) * s.cut;
        const count = s.count === null ? null : countText(s.count);
        const levelH = hOf(s.level);
        return (
          <g
            key={row.key}
            transform={`translate(${s.x} ${s.top})`}
            opacity={scene.furniture}
          >
            <line
              x1={ruleX}
              x2={ruleX + ruleW}
              y1={props.barsH + props.strokes.rule / 2}
              y2={props.barsH + props.strokes.rule / 2}
              stroke={colours.rule}
              strokeWidth={props.strokes.rule}
            />
            {levelH > 0 ? (
              <rect
                x={0}
                y={props.barsH - levelH}
                width={props.barW}
                height={levelH}
                fill={colours.pale}
              />
            ) : null}
            {s.copy ? (
              <g
                transform={`translate(${s.copy.slide * (props.barW + props.barGap)} 0)`}
              >
                <rect
                  x={0}
                  y={props.barsH - hOf(s.copy.lower.h)}
                  width={props.barW}
                  height={hOf(s.copy.lower.h)}
                  fill={colours.full}
                  opacity={s.copy.lower.opacity}
                />
                {s.copy.gain.to > s.copy.gain.from ? (
                  <rect
                    x={0}
                    y={props.barsH - hOf(s.copy.gain.to)}
                    width={props.barW}
                    height={
                      hOf(s.copy.gain.to) -
                      // Joined to a whole lower part of the same ink, the added part is drawn down to the baseline over
                      // it, so the join leaves no anti-aliased seam; the drawn extent is the same.
                      (s.copy.gain.from >= s.copy.lower.h - 1e-9 ? 0 : hOf(s.copy.gain.from))
                    }
                    fill={colours.full}
                  />
                ) : null}
              </g>
            ) : null}
            {s.name > 0 ? (
              <Text
                line={{ ...row.name, x: props.textDx, y: props.nameBaseline }}
                register={r.axis}
                fill={row.thread ? colours.text.accent : colours.text.name}
                opacity={s.name}
              />
            ) : null}
            {count !== null ? (
              <Text
                line={{
                  text: count,
                  width: props.countWidths[count],
                  x: props.textDx,
                  y: props.countBaseline,
                }}
                register={r.value}
                fill={row.thread ? colours.text.accent : colours.text.axis}
                opacity={s.words}
              />
            ) : null}
            {props.rings.includes(row.key) ? (
              <rect
                x={row.ring.x}
                y={row.ring.y}
                width={row.ring.w}
                height={row.ring.h}
                rx={props.barW * 0.3}
                fill="none"
                stroke={colours.ring}
                strokeWidth={props.strokes.ring}
                opacity={scene.ring}
              />
            ) : null}
          </g>
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
