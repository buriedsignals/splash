/**
 * One frame of « Les émissions de CO2 par personne en France ont culminé dans les années 1970 » — the title card, the
 * readings year by year, each decade gathered into a column and its box drawn out of it and lifted beside it, one median
 * walking the decades up to the peak and down after it, then the whole box plot with the credit (BRIEF.md).
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
type Slot = "display" | "eyebrow" | "value" | "figure" | "axis" | "source";

export type BoxplotFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: {
    ground: string;
    grid: string;
    neutral: string;
    accent: string;
    median: string;
    ring: string;
    text: Record<
      "eyebrow" | "title" | "axis" | "name" | "peak" | "value",
      string
    >;
  };
  inset: number;
  plot: { left: number; right: number; top: number; bottom: number };
  ticks: Array<Line & { value: number; gridY: number }>;
  peak: number;
  decades: Array<{ label: string; cx: number; boxWidth: number; name: Line }>;
  readings: Array<{ year: number; decade: number }>;
  dotR: number;
  ringR: number;
  values: Array<Line & { decade: number }>;
  fillOpacity: { neutral: number; accent: number };
  strokes: { grid: number; rule: number; median: number; walker: number };
  halo: { figure: number };
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

function Box({
  b,
  width,
  stroke,
  fill,
  fillOpacity,
  median,
  strokes,
  opacity,
}: {
  b: any;
  width: number;
  stroke: string;
  fill: string;
  fillOpacity: number;
  median: string;
  strokes: BoxplotFrameProps["strokes"];
  opacity: number;
}) {
  const cap = width * 0.3;
  return (
    <g opacity={opacity}>
      {b.whiskers > 0 ? (
        <g stroke={stroke} strokeWidth={strokes.rule}>
          <line x1={b.x} x2={b.x} y1={b.yQ3} y2={b.yHi} />
          <line x1={b.x} x2={b.x} y1={b.yQ1} y2={b.yLo} />
          <line
            x1={b.x - cap}
            x2={b.x + cap}
            y1={b.yHi}
            y2={b.yHi}
            opacity={b.whiskers}
          />
          <line
            x1={b.x - cap}
            x2={b.x + cap}
            y1={b.yLo}
            y2={b.yLo}
            opacity={b.whiskers}
          />
        </g>
      ) : null}
      <rect
        x={b.x - width / 2}
        y={b.yQ3}
        width={width}
        height={Math.max(b.yQ1 - b.yQ3, 0)}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke={stroke}
        strokeWidth={strokes.rule}
      />
      <line
        x1={b.x - width / 2}
        x2={b.x + width / 2}
        y1={b.yMedian}
        y2={b.yMedian}
        stroke={median}
        strokeWidth={strokes.median}
      />
    </g>
  );
}

export function BoxplotFrame(
  props: BoxplotFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const { frame, registers: r, colours, credit, titleCard, plot } = props;
  const scene = sceneAt(props as never, props.at);
  const figureHalo = { colour: colours.ground, width: props.halo.figure };

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
            x1={plot.left}
            x2={plot.right}
            y1={t.gridY}
            y2={t.gridY}
            stroke={colours.grid}
            strokeWidth={props.strokes.grid}
          />
        ))}
        {props.ticks.map((t, i) => (
          <Text
            key={`tick${i}`}
            line={t}
            register={r.axis}
            fill={colours.text.axis}
          />
        ))}
        {props.decades.map((d, i) => (
          <Text
            key={`name${i}`}
            line={d.name}
            register={r.axis}
            fill={colours.text.name}
          />
        ))}
      </g>

      {scene.boxes.map((b: any, i: number) => {
        const w = props.decades[i].boxWidth;
        return b.opacity > 0 ? (
          <g key={`box${i}`}>
            <Box
              b={b}
              width={w}
              stroke={colours.neutral}
              fill={colours.neutral}
              fillOpacity={props.fillOpacity.neutral}
              median={colours.median}
              strokes={props.strokes}
              opacity={b.opacity * (1 - b.accent)}
            />
            {b.accent > 0 ? (
              <Box
                b={b}
                width={w}
                stroke={colours.accent}
                fill={colours.accent}
                fillOpacity={props.fillOpacity.accent}
                median={colours.text.peak}
                strokes={props.strokes}
                opacity={b.opacity * b.accent}
              />
            ) : null}
          </g>
        ) : null;
      })}

      {scene.dots.map((d: any, i: number) => {
        if (!(d.opacity > 0)) return null;
        const decade = props.readings[i].decade;
        const lit = decade === props.peak ? scene.boxes[decade].accent : 0;
        return (
          <g key={`dot${i}`} opacity={d.opacity}>
            <circle
              cx={d.x}
              cy={d.y}
              r={props.dotR}
              fill="none"
              stroke={colours.neutral}
              strokeWidth={props.strokes.rule}
              opacity={1 - lit}
            />
            {lit > 0 ? (
              <circle
                cx={d.x}
                cy={d.y}
                r={props.dotR}
                fill="none"
                stroke={colours.accent}
                strokeWidth={props.strokes.rule}
                opacity={lit}
              />
            ) : null}
          </g>
        );
      })}

      {scene.boxes.flatMap((b: any, i: number) =>
        b.rings.map((ring: any, j: number) =>
          ring.opacity > 0 ? (
            <circle
              key={`ring${i}-${j}`}
              cx={ring.x}
              cy={ring.y}
              r={props.ringR}
              fill="none"
              stroke={colours.ring}
              strokeWidth={props.strokes.rule}
              opacity={ring.opacity}
            />
          ) : null,
        ),
      )}

      {scene.walker.opacity > 0 ? (
        <line
          x1={scene.walker.x}
          x2={scene.walker.x + scene.walker.w}
          y1={scene.walker.y}
          y2={scene.walker.y}
          stroke={colours.accent}
          strokeWidth={props.strokes.walker}
          opacity={scene.walker.opacity}
        />
      ) : null}

      {scene.values.map((v: any, i: number) =>
        v.opacity > 0 ? (
          <Text
            key={`value${i}`}
            line={v}
            register={r.figure}
            fill={
              v.decade === props.peak ? colours.text.peak : colours.text.value
            }
            opacity={v.opacity}
            halo={figureHalo}
          />
        ) : null,
      )}

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
