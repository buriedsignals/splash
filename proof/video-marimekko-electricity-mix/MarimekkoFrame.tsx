/**
 * One frame of « Le charbon, 12 % de l’électricité de six pays, tient dans deux colonnes » — the title card, the whole parting into
 * six columns, each filled with its mix, the coal poured out of them into one strip, then the whole marimekko with Germany's and
 * Poland's coal ringed (BRIEF.md).
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
type Slot = "display" | "eyebrow" | "value" | "axis" | "source";
type TextColour = "eyebrow" | "title" | "name" | "axis" | "onCoal";

export type MarimekkoFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: {
    ground: string;
    fill: Record<string, string>;
    whole: string;
    rule: string;
    ring: string;
    text: Record<TextColour, string>;
  };
  tracked: string;
  rings: string[];
  plotLeft: number;
  plotRight: number;
  plotTop: number;
  plotBottom: number;
  H: number;
  u: number;
  room: number;
  colGap: number;
  gap: number;
  tickH: number;
  braceTop: number;
  columns: Array<{
    key: string;
    total: number;
    cum: number;
    x: number;
    w: number;
    bands: Array<{ key: string; share: number }>;
    name: Line;
    tick: { x1: number; y1: number; x2: number; y2: number } | null;
    totalWord: Line;
    totalTick: { x1: number; y1: number; x2: number; y2: number } | null;
  }>;
  whole: Line;
  strip: {
    top: number;
    h: number;
    pieces: Array<{ key: string; x: number; w: number; name: Line | null }>;
    label: Line;
    namesUnder: boolean;
  };
  legend: Array<{ key: string; from: number | null; mid: number | null; swatch: { x: number; y: number; width: number; height: number } | null; line: Line }>;
  year: Line;
  strokes: { hairline: number; rule: number; ring: number };
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

export function MarimekkoFrame(
  props: MarimekkoFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const { frame, registers: r, colours, credit, titleCard } = props;
  const scene = sceneAt(props as never, props.at);
  const faded = (dim: number) => 1 - (1 - DIMMED) * dim;
  const groundHalo = { colour: colours.ground, width: props.halo.axis };
  const coalAt = props.columns.map((c) =>
    c.bands.findIndex((b) => b.key === props.tracked),
  );

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
        <Text line={props.year} register={r.value} fill={colours.text.name} />
        {props.columns.map((c, i) => (
          <g key={`name${c.key}`} transform={`translate(${scene.columns[i].x - c.x} 0)`}>
            <Text line={c.name} register={r.axis} fill={colours.text.name} />
            {c.tick ? (
              <line
                {...c.tick}
                stroke={colours.rule}
                strokeWidth={props.strokes.hairline}
              />
            ) : null}
          </g>
        ))}
      </g>

      {props.columns.map((c, i) => {
        const s = scene.columns[i];
        return (
          <g key={c.key}>
            {s.base.h > 0 ? (
              <rect
                x={s.x}
                y={s.base.y}
                width={s.w}
                height={s.base.h}
                fill={colours.whole}
              />
            ) : null}
            {s.cells.map((cell, j) =>
              j !== coalAt[i] && cell.h > 0 ? (
                <rect
                  key={cell.key}
                  x={cell.x}
                  y={cell.y}
                  width={cell.w}
                  height={cell.h}
                  fill={colours.fill[cell.key]}
                  opacity={faded(cell.dim)}
                />
              ) : null,
            )}
          </g>
        );
      })}

      {/* The coal over every column: a poured piece crosses the others on its way to the strip. */}
      {props.columns.map((c, i) => {
        const cell = scene.columns[i].cells[coalAt[i]];
        return cell.h > 0 && cell.w > 0 ? (
          <rect
            key={`coal${c.key}`}
            x={cell.x}
            y={cell.y}
            width={cell.w}
            height={cell.h}
            fill={colours.fill[props.tracked]}
          />
        ) : null;
      })}

      {props.columns.map((c, i) => {
        const s = scene.columns[i];
        const y = props.braceTop;
        return s.totals > 0 ? (
          <g key={`total${c.key}`} opacity={s.totals} transform={`translate(${s.x - c.x} 0)`}>
            <path
              d={`M${c.x} ${y} L${c.x} ${y + props.tickH} L${c.x + c.w} ${y + props.tickH} L${c.x + c.w} ${y}`}
              fill="none"
              stroke={colours.rule}
              strokeWidth={props.strokes.hairline}
            />
            {c.totalTick ? (
              <line
                {...c.totalTick}
                stroke={colours.rule}
                strokeWidth={props.strokes.hairline}
              />
            ) : null}
            <Text
              line={c.totalWord}
              register={r.axis}
              fill={colours.text.axis}
            />
          </g>
        ) : null;
      })}
      {scene.wholeLabel > 0 ? (
        <Text
          line={props.whole}
          register={r.axis}
          fill={colours.text.name}
          opacity={scene.wholeLabel}
        />
      ) : null}

      <g opacity={scene.key}>
        {props.legend.map((row) => {
          const isTracked = row.key === props.tracked;
          const last = props.columns.at(-1)!;
          return (
            <g
              key={`key${row.key}`}
              opacity={isTracked ? 1 : faded(scene.focus)}
            >
              {row.swatch ? (
                <rect {...row.swatch} fill={colours.fill[row.key]} />
              ) : (
                <line
                  x1={last.x + last.w}
                  y1={row.from!}
                  x2={row.line.x - props.gap / 3}
                  y2={row.mid!}
                  stroke={colours.rule}
                  strokeWidth={props.strokes.hairline}
                />
              )}
              <Text
                line={row.line}
                register={r.axis}
                fill={isTracked ? colours.text.name : colours.text.axis}
              />
            </g>
          );
        })}
      </g>

      {scene.label > 0 ? (
        <g opacity={scene.label}>
          {props.strip.pieces.map((p) =>
            p.name ? (
              <Text
                key={`piece${p.key}`}
                line={p.name}
                register={r.axis}
                fill={props.strip.namesUnder ? colours.text.name : colours.text.onCoal}
              />
            ) : null,
          )}
          <Text
            line={props.strip.label}
            register={r.axis}
            fill={colours.text.name}
            halo={groundHalo}
          />
        </g>
      ) : null}

      {scene.ring > 0 ? (
        <g opacity={scene.ring}>
          {props.columns
            .filter((c) => props.rings.includes(c.key))
            .map((c) => {
              const h =
                c.bands[coalAt[props.columns.indexOf(c)]].share * props.H;
              const pad = props.gap / 3;
              const box = {
                x: c.x - pad,
                y: props.plotBottom - h - pad,
                width: c.w + 2 * pad,
                height: h + 2 * pad,
                rx: pad,
              };
              return (
                <g key={`ring${c.key}`}>
                  <rect
                    {...box}
                    fill="none"
                    stroke={colours.ground}
                    strokeWidth={props.strokes.ring * 3}
                  />
                  <rect
                    {...box}
                    fill="none"
                    stroke={colours.ring}
                    strokeWidth={props.strokes.ring}
                  />
                </g>
              );
            })}
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
