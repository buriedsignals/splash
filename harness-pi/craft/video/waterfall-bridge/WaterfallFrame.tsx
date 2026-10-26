/**
 * One frame of « L'Allemagne a produit 143 TWh d'électricité de moins en 2024 qu'en 2015 » — the title card, the 2015 total
 * carried to 2024, both cut into their members, the copy's members going to 2024, the part gained and the parts lost
 * sliding onto the running total, the seams closing and the net change bracketed (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { Ref } from "react";
import { sceneAt, tenthsKey } from "./scene.mjs";

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

export type WaterfallFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: Point; halo: number; lines: Line[] };
  colours: {
    ground: string;
    grid: string;
    zero: string;
    connector: string;
    total: string;
    step: string;
    text: Record<
      "eyebrow" | "title" | "name" | "axis" | "total" | "step",
      string
    >;
  };
  baseline: number;
  unit: number;
  barW: number;
  slots: Array<{ x: number; centre: number }>;
  plot: { left: number; right: number };
  stack: string[];
  opening: number;
  closing: number;
  members: Array<{
    key: string;
    from: number;
    to: number;
    change: number;
    name: Word & { beside: Point; seat: Point };
  }>;
  steps: Array<{ key: string; from: number; to: number }>;
  ticks: Array<{ value: number; y: number; label: Line }>;
  years: Line[];
  counts: Record<string, Word>;
  totalGap: number;
  stepLabels: Line[];
  bracket: {
    left: number;
    right: number;
    y: number;
    tick: number;
    label: Line;
  };
  strokes: {
    grid: number;
    zero: number;
    seam: number;
    connector: number;
    dash: number[];
    bracket: number;
  };
  halo: { value: number; axis: number };
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

export function WaterfallFrame(
  props: WaterfallFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const {
    frame,
    registers: r,
    colours,
    credit,
    titleCard,
    slots,
    barW,
  } = props;
  const scene = sceneAt(props as never, props.at);
  const valueHalo = { colour: colours.ground, width: props.halo.value };
  const axisHalo = { colour: colours.ground, width: props.halo.axis };
  const yOf = (v: number) => props.baseline - v * props.unit;
  const centred = (word: Word, x: number, y: number): Line => ({
    ...word,
    x: x - (word.width * WIDER) / 2,
    y,
  });
  const count = props.counts[scene.countKey];
  const opening = props.counts[tenthsKey(props.opening)];
  // A seam of the ground is cut out of a total at each boundary between its members, never added to its height.
  const seams = (x: number, segments: Array<{ y: number; h: number }>) =>
    segments
      .slice(1)
      .map((seg, i) => (
        <line
          key={`seam${x}-${i}`}
          x1={x}
          x2={x + barW}
          y1={seg.y + seg.h}
          y2={seg.y + seg.h}
          stroke={colours.ground}
          strokeWidth={props.strokes.seam}
          opacity={scene.seams}
        />
      ));
  // The connectors, each drawn once the step it leads to has landed: from the level a bar ends on to the next slot.
  const connectorLevels = props.steps.map((s) => s.from);

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
        {props.ticks.map((t) => (
          <g key={`tick${t.value}`}>
            <line
              x1={props.plot.left}
              x2={props.plot.right}
              y1={t.y}
              y2={t.y}
              stroke={t.value === 0 ? colours.zero : colours.grid}
              strokeWidth={
                t.value === 0 ? props.strokes.zero : props.strokes.grid
              }
            />
            <Text line={t.label} register={r.axis} fill={colours.text.axis} />
          </g>
        ))}
        <Text
          line={props.years[0]}
          register={r.axis}
          fill={colours.text.name}
        />
      </g>
      <Text
        line={props.years[1]}
        register={r.axis}
        fill={colours.text.name}
        opacity={
          scene.copy.shown
            ? Math.min(
                1,
                (scene.copy.x - slots[0].x) / (slots[4].x - slots[0].x),
              )
            : 0
        }
      />

      {connectorLevels.map((level, k) => (
        <line
          key={`link${k}`}
          x1={slots[k].x + barW}
          x2={slots[k + 1].x}
          y1={yOf(level)}
          y2={yOf(level)}
          stroke={colours.connector}
          strokeWidth={props.strokes.connector}
          strokeDasharray={props.strokes.dash.join(" ")}
          opacity={scene.connectors[k]}
        />
      ))}
      <line
        x1={slots[3].x + barW}
        x2={slots[4].x}
        y1={yOf(props.closing)}
        y2={yOf(props.closing)}
        stroke={colours.connector}
        strokeWidth={props.strokes.connector}
        strokeDasharray={props.strokes.dash.join(" ")}
        opacity={scene.connectors[props.steps.length - 1]}
      />

      {scene.opening.h > 0 ? (
        <rect
          x={scene.opening.x}
          y={scene.opening.y}
          width={barW}
          height={scene.opening.h}
          fill={colours.total}
        />
      ) : null}
      {scene.copy.shown ? (
        <rect
          x={scene.copy.x}
          y={scene.copy.y}
          width={barW}
          height={scene.copy.h}
          fill={colours.total}
        />
      ) : null}
      {seams(slots[0].x, scene.stack2015)}
      {scene.copy.shown ? seams(scene.copy.x, scene.copy.segments) : null}

      {scene.parts.map((p) =>
        p.light > 0 ? (
          <rect
            key={`part-${p.key}`}
            x={p.x}
            y={p.y}
            width={barW}
            height={p.h}
            fill={colours.step}
            opacity={p.light}
          />
        ) : null,
      )}

      <Text
        line={centred(
          opening,
          slots[0].centre,
          scene.opening.y - props.totalGap,
        )}
        register={r.value}
        fill={colours.text.total}
        opacity={scene.opening.label}
        halo={valueHalo}
      />
      {scene.copy.shown ? (
        <Text
          line={centred(
            count,
            scene.copy.x + barW / 2,
            scene.copy.y - props.totalGap,
          )}
          register={r.value}
          fill={colours.text.total}
          halo={valueHalo}
        />
      ) : null}
      {props.stepLabels.map((line, k) =>
        scene.labels[k] > 0 ? (
          <Text
            key={`step${k}`}
            line={line}
            register={r.value}
            fill={colours.text.step}
            opacity={scene.labels[k]}
            halo={valueHalo}
          />
        ) : null,
      )}

      {props.members.map((m, i) => (
        <Text
          key={`name-${m.key}`}
          line={{ ...m.name, ...scene.names[i] }}
          register={r.axis}
          fill={colours.text.name}
          opacity={scene.names[i].opacity}
          halo={axisHalo}
        />
      ))}

      {scene.bracket > 0 ? (
        <g>
          <line
            x1={props.bracket.left}
            x2={
              props.bracket.left +
              (props.bracket.right - props.bracket.left) * scene.bracket
            }
            y1={props.bracket.y}
            y2={props.bracket.y}
            stroke={colours.zero}
            strokeWidth={props.strokes.bracket}
          />
          <line
            x1={props.bracket.left}
            x2={props.bracket.left}
            y1={props.bracket.y - props.bracket.tick}
            y2={props.bracket.y + props.bracket.tick}
            stroke={colours.zero}
            strokeWidth={props.strokes.bracket}
          />
          <line
            x1={props.bracket.right}
            x2={props.bracket.right}
            y1={props.bracket.y - props.bracket.tick}
            y2={props.bracket.y + props.bracket.tick}
            stroke={colours.zero}
            strokeWidth={props.strokes.bracket}
            opacity={scene.bracket >= 1 ? 1 : 0}
          />
          <Text
            line={props.bracket.label}
            register={r.value}
            fill={colours.text.total}
            opacity={Math.max(0, scene.bracket * 2 - 1)}
            halo={valueHalo}
          />
        </g>
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
