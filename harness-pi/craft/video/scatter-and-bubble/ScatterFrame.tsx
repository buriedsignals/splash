/**
 * One frame of « Au-delà de 30 000 $ par personne, l’espérance de vie tient dans une bande 3 fois plus étroite » — the
 * title card, one column of 165 countries at their ages unfolding along income, the cloud folded against the break into
 * two columns measured by two bars, three copies of the short bar stacked on the long one, then the whole cloud with the
 * bars kept (BRIEF.md).
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
type Span = { x: number; top: number; bottom: number };

export type ScatterFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: {
    ground: string;
    grid: string;
    dot: string;
    mark: string;
    text: Record<"eyebrow" | "title" | "axis" | "count" | "accent", string>;
  };
  dotOpacity: number;
  strokes: { grid: number; rule: number; copy: number };
  radius: number;
  plot: { left: number; right: number; top: number; bottom: number };
  ageTicks: Array<Line & { at: number }>;
  xTicks: Array<Line & { at: number; v: number }>;
  names: { x: Line; y: Line };
  break: { x: number; label: Line };
  members: Array<{
    code: string;
    x: number;
    y: number;
    column: number;
    strip: number;
    order: number;
  }>;
  bars: { long: Span; short: Span };
  barWidth: number;
  copies: Span[];
  spans: { long: Line; short: Line };
  times: Line;
  counter: Record<string, Line>;
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

export function ScatterFrame(
  props: ScatterFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const {
    frame,
    registers: r,
    colours,
    strokes,
    plot,
    credit,
    titleCard,
  } = props;
  const scene = sceneAt(props as never, props.at);
  const halo = { colour: colours.ground, width: props.halo };
  const w = props.barWidth;

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
        {props.ageTicks.map((t, i) => (
          <g key={`age${i}`}>
            <line
              x1={plot.left}
              x2={plot.right}
              y1={t.at}
              y2={t.at}
              stroke={colours.grid}
              strokeWidth={strokes.grid}
            />
            <Text line={t} register={r.axis} fill={colours.text.axis} />
          </g>
        ))}
        {props.xTicks.map((t, i) => (
          <Text
            key={`income${i}`}
            line={t}
            register={r.axis}
            fill={colours.text.axis}
            opacity={scene.incomeTicks}
          />
        ))}
        <Text line={props.names.y} register={r.axis} fill={colours.text.axis} />
        <Text line={props.names.x} register={r.axis} fill={colours.text.axis} />
      </g>

      <g opacity={scene.rule}>
        <line
          x1={props.break.x}
          x2={props.break.x}
          y1={plot.top}
          y2={plot.top + (plot.bottom - plot.top) * scene.rule}
          stroke={colours.mark}
          strokeWidth={strokes.rule}
        />
        <Text
          line={props.break.label}
          register={r.value}
          fill={colours.text.accent}
        />
      </g>

      {/* The bars under the dots: on the whole cloud a bar crossing a country near the break hides none of it. */}
      {scene.bars.values > 0
        ? [scene.bars.long, scene.bars.short].map((b, i) => (
            <rect
              key={`bar${i}`}
              x={b.x}
              y={b.top}
              width={w}
              height={b.bottom - b.top}
              fill={colours.mark}
            />
          ))
        : null}

      <g opacity={scene.furniture}>
        {props.members.map((m, i) => (
          <circle
            key={m.code}
            cx={scene.members[i].x}
            cy={scene.members[i].y}
            r={props.radius}
            fill={colours.dot}
            fillOpacity={props.dotOpacity}
          />
        ))}
      </g>

      {scene.bars.values > 0 ? (
        <g>
          <Text
            line={props.spans.long}
            register={r.value}
            fill={colours.text.accent}
            opacity={scene.bars.values}
            halo={halo}
          />
          <Text
            line={props.spans.short}
            register={r.value}
            fill={colours.text.accent}
            opacity={scene.bars.values}
            halo={halo}
          />
        </g>
      ) : null}

      {scene.copies.map((c, i) =>
        c.on > 0 ? (
          <rect
            key={`copy${i}`}
            x={c.x}
            y={c.top}
            width={w}
            height={c.bottom - c.top}
            fill={colours.mark}
            stroke={colours.ground}
            strokeWidth={strokes.copy}
            opacity={c.on}
          />
        ) : null,
      )}
      {scene.times > 0 ? (
        <Text
          line={props.times}
          register={r.value}
          fill={colours.text.accent}
          opacity={scene.times}
          halo={halo}
        />
      ) : null}

      {scene.counter > 0 ? (
        <Text
          line={props.counter[String(scene.counted)]}
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
