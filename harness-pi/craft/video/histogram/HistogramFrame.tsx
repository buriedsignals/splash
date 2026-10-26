/**
 * One frame of « 6 pays sur 10 émettent moins de 4 tonnes de CO₂ par personne » — the title card, a tick per country along
 * the tonnes axis, every tick falling into its bin as one cell, the 4-tonne cut, the tail's bins stacked onto the 4–8 bin
 * and cut with the first into tenths of the 213, then every bin back in its slot (BRIEF.md).
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
type Word = { text: string; width: number };
type Slot = "display" | "eyebrow" | "value" | "axis" | "source";
type Point = { x: number; y: number };

export type HistogramFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: Point; halo: number; lines: Line[] };
  colours: {
    ground: string;
    grid: string;
    zero: string;
    bar: string;
    cut: string;
    text: Record<"eyebrow" | "title" | "name" | "axis" | "count" | "share", string>;
  };
  baseline: number;
  unit: number;
  barW: number;
  plot: { left: number; right: number };
  rug: { w: number; h: number };
  /** `name` is null on a bin the axis's naming ladder skips at a narrow frame. */
  bins: Array<{ lo: number; hi: number; open: boolean; count: number; x: number; centre: number; name: Line | null }>;
  countries: Array<{ bin: number; j: number; tickX: number }>;
  ticks: Array<{ value: number; y: number; label: Line }>;
  tail: { moving: number[]; base: number[] };
  tailCounts: Record<string, Word>;
  labelGap: number;
  valueDescent: number;
  tenth: number;
  seams: { left: number[]; right: number[] };
  cut: { x: number; top: number };
  share: { count: number; label: Line };
  strokes: { grid: number; zero: number; seam: number; cut: number };
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

export function HistogramFrame(props: HistogramFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, credit, titleCard, bins, barW } = props;
  const scene = sceneAt(props as never, props.at);
  const valueHalo = { colour: colours.ground, width: props.halo.value };
  const yOf = (v: number) => props.baseline - v * props.unit;
  const tailWord = props.tailCounts[scene.tail.key];
  // A seam of the ground is cut out of a column at each tenth, never added to its height.
  const seams = (x: number, values: number[]) =>
    values.map((v) => (
      <line
        key={`seam${x}-${v}`}
        x1={x}
        x2={x + barW}
        y1={yOf(v)}
        y2={yOf(v)}
        stroke={colours.ground}
        strokeWidth={props.strokes.seam}
        opacity={scene.tenths}
      />
    ));

  return (
    <svg
      ref={props.svgRef}
      xmlns="http://www.w3.org/2000/svg"
      width={frame.width}
      height={frame.height}
      viewBox={`0 0 ${frame.width} ${frame.height}`}
    >
      <rect width={frame.width} height={frame.height} fill={colours.ground} />

      <g opacity={scene.counts}>
        {props.ticks.map((t) => (
          <g key={`tick${t.value}`}>
            {t.value === 0 ? null : (
              <line x1={props.plot.left} x2={props.plot.right} y1={t.y} y2={t.y} stroke={colours.grid} strokeWidth={props.strokes.grid} />
            )}
            <Text line={t.label} register={r.axis} fill={colours.text.axis} />
          </g>
        ))}
      </g>
      <g opacity={scene.furniture}>
        <line
          x1={props.plot.left}
          x2={props.plot.right}
          y1={props.baseline}
          y2={props.baseline}
          stroke={colours.zero}
          strokeWidth={props.strokes.zero}
        />
        {bins.map((b) =>
          b.name ? <Text key={`name${b.lo}`} line={b.name} register={r.axis} fill={colours.text.name} /> : null,
        )}
      </g>

      {scene.bars.map((b, i) =>
        b.h > 0 ? <rect key={`bar${i}`} x={b.x} y={b.y} width={barW} height={b.h} fill={colours.bar} /> : null,
      )}
      {scene.cells.map((c, i) =>
        c.opacity > 0 ? (
          <rect key={`cell${i}`} x={c.x} y={c.y} width={c.w} height={c.h} fill={colours.bar} opacity={c.opacity} />
        ) : null,
      )}
      {seams(bins[0].x, props.seams.left)}
      {seams(bins[1].x, props.seams.right)}

      {scene.rule > 0 ? (
        <line
          x1={props.cut.x}
          x2={props.cut.x}
          y1={props.baseline}
          y2={props.baseline + (props.cut.top - props.baseline) * scene.rule}
          stroke={colours.cut}
          strokeWidth={props.strokes.cut}
        />
      ) : null}
      <Text line={props.share.label} register={r.value} fill={colours.text.share} opacity={scene.share} halo={valueHalo} />
      {scene.tail.opacity > 0 ? (
        <Text
          line={{
            ...tailWord,
            x: bins[1].centre - (tailWord.width * WIDER) / 2,
            y: yOf(scene.tail.top) - props.labelGap - props.valueDescent,
          }}
          register={r.value}
          fill={colours.text.count}
          opacity={scene.tail.opacity}
          halo={valueHalo}
        />
      ) : null}

      <g transform={`translate(${credit.at.x} ${credit.at.y})`} opacity={scene.source}>
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
        <Text line={titleCard.eyebrow} register={r.eyebrow} fill={colours.text.eyebrow} />
        {titleCard.title.map((line, i) => (
          <Text key={`title${i}`} line={line} register={titleCard.register} fill={colours.text.title} />
        ))}
      </g>
    </svg>
  );
}
