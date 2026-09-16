/**
 * One frame of « En France, le nucléaire pèse plus que le fossile et le renouvelable réunis » — the title card, the six whole
 * mixes grown from one left edge, each slid until its nuclear sits astride the anchor, France's bar parted and its two sides
 * laid end to end under its nuclear, then the whole chart with France's nuclear ringed (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { Ref } from "react";
import { DIMMED, sceneAt } from "./scene.mjs";

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
type TextColour =
  | "eyebrow"
  | "title"
  | "name"
  | "subject"
  | "axis"
  | "renewable"
  | "onCentre"
  | "sum";

export type DivergingStackFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: {
    ground: string;
    fill: Record<string, string>;
    edge: string;
    anchor: string;
    ring: string;
    text: Record<TextColour, string>;
  };
  subject: string;
  rows: Array<{
    key: string;
    fossil: number;
    centre: number;
    renewable: number;
    mid: number;
    y: number;
    segments: Array<{
      key: string;
      group: "left" | "centre" | "right";
      share: number;
    }>;
    name: Line;
    leftTotal: Word & { y: number };
    rightTotal: Word & { y: number };
    centreValue: (Word & { y: number }) | null;
  }>;
  plotLeft: number;
  anchor: number;
  unit: number;
  barH: number;
  lift: number;
  gap: number;
  plot: { top: number; bottom: number };
  year: Line;
  hundred: Line;
  sides: Record<"left" | "centre" | "right", Line>;
  sum: Word;
  strokes: { anchor: number; edge: number; ring: number };
  halo: { axis: number };
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

export function DivergingStackFrame(
  props: DivergingStackFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const { frame, registers: r, colours, credit, titleCard } = props;
  const scene = sceneAt(props as never, props.at);
  const subjectAt = props.rows.findIndex((row) => row.key === props.subject);
  const centreHalo = { colour: colours.fill.Nuclear, width: props.halo.axis };
  const groundHalo = { colour: colours.ground, width: props.halo.axis };
  const shift = (row: DivergingStackFrameProps["rows"][number]) =>
    row.name.y - row.mid;
  const settled = scene.rows[subjectAt].nuclear;

  return (
    <svg
      ref={props.svgRef}
      xmlns="http://www.w3.org/2000/svg"
      width={frame.width}
      height={frame.height}
      viewBox={`0 0 ${frame.width} ${frame.height}`}
    >
      <rect width={frame.width} height={frame.height} fill={colours.ground} />

      <Text
        line={props.year}
        register={r.value}
        fill={colours.text.name}
        opacity={scene.furniture}
      />
      {scene.hundred > 0 ? (
        <Text
          line={props.hundred}
          register={r.axis}
          fill={colours.text.axis}
          opacity={scene.hundred}
        />
      ) : null}
      {scene.sides > 0 ? (
        <g opacity={scene.sides}>
          <Text
            line={props.sides.left}
            register={r.axis}
            fill={colours.text.axis}
          />
          <Text
            line={props.sides.centre}
            register={r.axis}
            fill={colours.text.axis}
          />
          <Text
            line={props.sides.right}
            register={r.axis}
            fill={colours.text.renewable}
          />
        </g>
      ) : null}

      {/* The anchor, UNDER the bars: it shows between the rows and in the gap France's bar parts into, and never cuts a
          nuclear share printed on the anchor. */}
      <line
        x1={props.anchor}
        x2={props.anchor}
        y1={props.plot.top}
        y2={props.plot.bottom}
        stroke={colours.anchor}
        strokeWidth={props.strokes.anchor}
        opacity={scene.anchor}
      />

      {props.rows.map((row, i) => {
        const s = scene.rows[i];
        const nuclear = s.segments.find((seg) => seg.group === "centre")!;
        return (
          <g key={row.key} opacity={1 - (1 - DIMMED) * s.dim}>
            {s.segments.map((seg) =>
              seg.w > 0 ? (
                <rect
                  key={seg.key}
                  x={seg.x}
                  y={seg.y}
                  width={seg.w}
                  height={props.barH}
                  fill={colours.fill[seg.key]}
                />
              ) : null,
            )}
            {nuclear.w > 0 ? (
              <rect
                x={nuclear.x}
                y={nuclear.y}
                width={nuclear.w}
                height={props.barH}
                fill="none"
                stroke={colours.edge}
                strokeWidth={props.strokes.edge}
              />
            ) : null}
          </g>
        );
      })}

      {props.rows.map((row, i) => {
        const s = scene.rows[i];
        const isSubject = row.key === props.subject;
        const faded = 1 - (1 - DIMMED) * s.dim;
        return (
          <g key={`words${row.key}`} opacity={faded}>
            <Text
              line={row.name}
              register={r.axis}
              fill={isSubject ? colours.text.subject : colours.text.name}
              opacity={scene.furniture}
            />
            {s.leftTotal.opacity > 0 ? (
              <Text
                line={{
                  ...row.leftTotal,
                  x: s.leftTotal.x - row.leftTotal.width * WIDER,
                }}
                register={r.axis}
                fill={colours.text.axis}
                opacity={s.leftTotal.opacity}
              />
            ) : null}
            {s.rightTotal.opacity > 0 ? (
              <Text
                line={{ ...row.rightTotal, x: s.rightTotal.x }}
                register={r.axis}
                fill={isSubject ? colours.text.renewable : colours.text.axis}
                opacity={s.rightTotal.opacity}
              />
            ) : null}
            {row.centreValue && s.centreValue.opacity > 0 ? (
              <Text
                line={{
                  ...row.centreValue,
                  x: s.centreValue.x - (row.centreValue.width * WIDER) / 2,
                  y: row.centreValue.y + s.centreValue.dy,
                }}
                register={r.axis}
                fill={colours.text.onCentre}
                opacity={s.centreValue.opacity}
                halo={centreHalo}
              />
            ) : null}
          </g>
        );
      })}

      {scene.sum.opacity > 0 ? (
        <g opacity={scene.sum.opacity}>
          <line
            x1={scene.sum.x - props.gap / 2}
            x2={scene.sum.x - props.gap / 2}
            y1={scene.sum.top + props.barH}
            y2={scene.sum.y + props.barH}
            stroke={colours.anchor}
            strokeWidth={props.strokes.edge}
          />
          <Text
            line={{
              ...props.sum,
              x: scene.sum.x,
              y: scene.sum.y + props.barH / 2 + shift(props.rows[subjectAt]),
            }}
            register={r.axis}
            fill={colours.text.sum}
            halo={groundHalo}
          />
        </g>
      ) : null}

      {scene.ring > 0 ? (
        <rect
          x={settled.x}
          y={props.rows[subjectAt].y - props.gap / 3}
          width={settled.w}
          height={props.barH + (2 * props.gap) / 3}
          rx={props.gap / 3}
          fill="none"
          stroke={colours.ring}
          strokeWidth={props.strokes.ring}
          opacity={scene.ring}
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
