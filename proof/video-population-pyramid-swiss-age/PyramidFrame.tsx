/**
 * One frame of « Les femmes passent devant les hommes à partir de 60-64 ans » — the title card, the pyramid growing out of
 * the spine, the men's half folding onto the women's, the shared part leaving and the difference sliding to the spine, the
 * camera magnifying it around the spine, the rule at the crossing, then the camera back and the pyramid rebuilt (BRIEF.md).
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
type Fill = "men" | "women" | "common";

export type PyramidFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: {
    ground: string;
    grid: string;
    men: string;
    women: string;
    common: string;
    rule: string;
    text: Record<
      "eyebrow" | "title" | "men" | "women" | "band" | "axis" | "zoom",
      string
    >;
  };
  inset: number;
  spine: { left: number; right: number };
  halfWidth: number;
  unit: number;
  zoomBy: number;
  crossing: number;
  rows: Array<{
    band: string;
    male: number;
    female: number;
    y: number;
    h: number;
    label: Line | null;
  }>;
  plot: { top: number; bottom: number };
  ruleY: number;
  names: Line[];
  ticks: Array<{ value: number; text: string; width: number; scale: string }>;
  tickBaseline: number;
  values: Array<{ row: number; text: string; width: number; y: number }>;
  valueGap: number;
  zoomWord: Line;
  strokes: { grid: number };
  halo: { axis: number; value: number; figure: number };
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

export function PyramidFrame(
  props: PyramidFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const { frame, registers: r, colours, credit, titleCard, spine } = props;
  const scene = sceneAt(props as never, props.at);
  const axisHalo = { colour: colours.ground, width: props.halo.axis };
  const valueHalo = { colour: colours.ground, width: props.halo.value };
  const figureHalo = { colour: colours.ground, width: props.halo.figure };
  const fills: Record<Fill, string> = {
    men: colours.men,
    women: colours.women,
    common: colours.common,
  };
  const ruleReach = props.halfWidth * scene.rule;

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
        {scene.ticks.map((t: any, i: number) =>
          t.opacity > 0 ? (
            <line
              key={`grid${i}`}
              x1={t.x}
              x2={t.x}
              y1={props.plot.top}
              y2={props.plot.bottom}
              stroke={colours.grid}
              strokeWidth={props.strokes.grid}
              opacity={t.opacity}
            />
          ) : null,
        )}
      </g>

      {props.rows.flatMap((row, i) =>
        scene.rows[i].bars.map((b: any, j: number) =>
          b.opacity > 0 && b.w > 0 ? (
            <rect
              key={`bar${i}-${j}`}
              x={b.x}
              y={row.y}
              width={b.w}
              height={row.h}
              fill={fills[b.fill as Fill]}
              opacity={b.opacity}
            />
          ) : null,
        ),
      )}

      {scene.rule > 0 ? (
        <g stroke={colours.rule} strokeWidth={props.strokes.grid * 1.5}>
          <line
            x1={spine.left - ruleReach}
            x2={spine.left}
            y1={props.ruleY}
            y2={props.ruleY}
          />
          <line
            x1={spine.right}
            x2={spine.right + ruleReach}
            y1={props.ruleY}
            y2={props.ruleY}
          />
        </g>
      ) : null}

      <g opacity={scene.furniture}>
        {props.rows.map((row, i) =>
          row.label ? (
            <Text
              key={`band${i}`}
              line={row.label}
              register={r.axis}
              fill={colours.text.band}
              halo={axisHalo}
            />
          ) : null,
        )}
        <Text
          line={props.names[0]}
          register={r.axis}
          fill={colours.text.men}
          halo={axisHalo}
        />
        <Text
          line={props.names[1]}
          register={r.axis}
          fill={colours.text.women}
          halo={axisHalo}
        />
        {scene.ticks.map((t: any, i: number) =>
          t.opacity > 0 ? (
            <Text
              key={`tick${i}`}
              line={{
                text: t.text,
                width: t.width,
                x: t.x - t.width / 2,
                y: props.tickBaseline,
              }}
              register={r.axis}
              fill={colours.text.axis}
              opacity={t.opacity}
            />
          ) : null,
        )}
      </g>

      {scene.values.map((v: any, i: number) =>
        v.opacity > 0 ? (
          <Text
            key={`value${i}`}
            line={v}
            register={r.figure}
            fill={
              v.row < props.crossing ? colours.text.men : colours.text.women
            }
            opacity={v.opacity}
            halo={figureHalo}
          />
        ) : null,
      )}
      {scene.zoomWord > 0 ? (
        <Text
          line={props.zoomWord}
          register={r.value}
          fill={colours.text.zoom}
          opacity={scene.zoomWord}
          halo={valueHalo}
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
