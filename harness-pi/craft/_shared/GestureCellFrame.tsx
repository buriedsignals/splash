/**
 * One frame of a Cell-grid GESTURE video (heatmap-matrix or calendar-heatmap): the title card, the grid arriving with
 * its key, and whatever the beat's three gestures have laid by this frame — outlines (the accent for a highlight, the
 * ink for a ring or a run, over a ground halo), cutoff dots, two compared cells joined by a rule, cells stepping back,
 * rows moving — each gesture's note on its caption line, then the credit.
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from gesture-cell-video-build.mjs; motion from
 * `cellSceneAt` (gesture-cell-video.mjs). The hue is the scale: no gesture recolours a cell.
 */

import type { Ref } from "react";
import { cellSceneAt } from "./gesture-cell-video.mjs";

type Register = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: string;
  letterSpacing: number;
  lead: number;
};
type Line = { text: string; x: number; y: number; width: number };

export type GestureCellFrameProps = {
  frame: { width: number; height: number };
  registers: Record<
    "display" | "eyebrow" | "value" | "axis" | "annot" | "source",
    Register
  >;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: any;
  layout: {
    plotLeft: number;
    plotTop: number;
    cellW: number;
    cellH: number;
    cols: number;
  };
  cells: Array<{ id: number; r: number; c: number; bin: number }>;
  rowLabels: Array<Line & { dy: number }>;
  heads: Line[];
  key: {
    swatches: Array<{ x: number; y: number; width: number; height: number }>;
    breaks: Line[];
    unit: Line;
  };
  captions: Array<{ item: number; lines: Line[] }>;
  marks: {
    outlines: Array<{
      k: number;
      kind: string;
      rects: any[];
      segs: Array<{ r: number; c0: number; c1: number }>;
    }>;
    dots: Array<{ k: number; cells: number[] }>;
    compares: Array<{ k: number; a: number; b: number }>;
    moves: boolean;
  };
  strokes: { rule: number; hairline: number };
  [key: string]: unknown;
};

function Text({
  line,
  register,
  fill,
  opacity = 1,
}: {
  line: Line;
  register: Register;
  fill: string;
  opacity?: number;
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
      data-width={line.width}
    >
      {line.text}
    </text>
  );
}

export function GestureCellFrame(
  props: GestureCellFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const {
    frame,
    registers: r,
    colours,
    credit,
    titleCard,
    layout: L,
    marks,
  } = props;
  const scene = cellSceneAt(props as never, props.at) as any;
  const yOf = (row: number) => L.plotTop + scene.slots[row] * L.cellH;
  const byId = new Map(props.cells.map((c) => [c.id, c]));
  const box = (id: number) => {
    const c = byId.get(id)!;
    return {
      x: L.plotLeft + c.c * L.cellW,
      y: yOf(c.r),
      width: L.cellW,
      height: L.cellH,
    };
  };
  const halo = props.strokes.rule * 4;
  const outlineRects = (
    o: GestureCellFrameProps["marks"]["outlines"][number],
  ) =>
    marks.moves
      ? o.segs.map((s) => ({
          x: L.plotLeft + s.c0 * L.cellW,
          y: yOf(s.r),
          width: (s.c1 - s.c0 + 1) * L.cellW,
          height: L.cellH,
        }))
      : o.rects;

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
        {props.legend.swatches.map((s, i) => (
          <rect
            key={`sw${i}`}
            {...s}
            fill={colours.ramp[i]}
            stroke={colours.edge}
            strokeWidth={props.strokes.hairline}
          />
        ))}
        {props.legend.breaks.map((b, i) => (
          <Text
            key={`br${i}`}
            line={b}
            register={r.axis}
            fill={colours.text.axis}
          />
        ))}
        <Text
          line={props.legend.unit}
          register={r.axis}
          fill={colours.text.axis}
        />
        {props.heads.map((h, i) => (
          <Text
            key={`h${i}`}
            line={h}
            register={r.axis}
            fill={colours.text.axis}
          />
        ))}
        {props.rowLabels.map((l, i) => (
          <Text
            key={`rl${i}`}
            line={{ ...l, y: yOf(i) + l.dy }}
            register={r.axis}
            fill={colours.text.name}
          />
        ))}
        {props.rowLabels.map((_, row) =>
          Array.from({ length: L.cols }, (_, c) => (
            <rect
              key={`seat${row}-${c}`}
              x={L.plotLeft + c * L.cellW}
              y={yOf(row)}
              width={L.cellW}
              height={L.cellH}
              fill={colours.missing}
              stroke={colours.edge}
              strokeWidth={props.strokes.hairline}
            />
          )),
        )}
      </g>

      {props.cells.map((c, i) => (
        <rect
          key={`c${c.id}`}
          x={L.plotLeft + c.c * L.cellW}
          y={yOf(c.r)}
          width={L.cellW}
          height={L.cellH}
          fill={colours.ramp[c.bin]}
          stroke={colours.edge}
          strokeWidth={props.strokes.hairline}
          opacity={scene.cells[i]}
        />
      ))}

      {marks.dots.map((d) => (
        <g key={`dots${d.k}`} opacity={scene.g[d.k]}>
          {d.cells.map((id) => {
            const b = box(id);
            const rr = Math.min(b.width, b.height) * 0.14;
            return (
              <circle
                key={id}
                cx={b.x + b.width / 2}
                cy={b.y + b.height / 2}
                r={rr}
                fill={colours.ink}
                stroke={colours.ground}
                strokeWidth={props.strokes.hairline * 2}
              />
            );
          })}
        </g>
      ))}
      {marks.outlines.map((o) => (
        <g key={`o${o.k}-${o.kind}`} opacity={scene.g[o.k]}>
          {outlineRects(o).map((q: any, j: number) => (
            <g key={j}>
              <rect
                {...q}
                fill="none"
                stroke={colours.ground}
                strokeWidth={halo}
              />
              <rect
                {...q}
                fill="none"
                stroke={o.kind === "accent" ? colours.accent : colours.ink}
                strokeWidth={
                  props.strokes.rule * (o.kind === "ring" ? 1.2 : 1.6)
                }
                strokeDasharray={
                  o.kind === "ring"
                    ? `${props.strokes.rule * 5} ${props.strokes.rule * 3}`
                    : undefined
                }
              />
            </g>
          ))}
        </g>
      ))}
      {marks.compares.map((m) => {
        const a = box(m.a);
        const b = box(m.b);
        const ca = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
        const cb = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
        return (
          <g key={`cmp${m.k}`} opacity={scene.g[m.k]}>
            {[a, b].map((q, j) => (
              <g key={j}>
                <rect
                  {...q}
                  fill="none"
                  stroke={colours.ground}
                  strokeWidth={halo}
                />
                <rect
                  {...q}
                  fill="none"
                  stroke={j === 0 ? colours.accent : colours.ink}
                  strokeWidth={props.strokes.rule * 1.6}
                />
              </g>
            ))}
            <line
              x1={ca.x}
              y1={ca.y}
              x2={cb.x}
              y2={cb.y}
              stroke={colours.ground}
              strokeWidth={halo}
            />
            <line
              x1={ca.x}
              y1={ca.y}
              x2={cb.x}
              y2={cb.y}
              stroke={colours.ink}
              strokeWidth={props.strokes.rule}
            />
          </g>
        );
      })}

      {props.captions.map((c) =>
        c.lines.map((line, j) => (
          <Text
            key={`cap${c.item}-${j}`}
            line={line}
            register={r.annot}
            fill={colours.text.name}
            opacity={scene.g[c.item]}
          />
        )),
      )}

      <g opacity={scene.source}>
        {credit.lines.map((line, i) => (
          <g
            key={`credit${i}`}
            transform={`translate(${credit.at.x} ${credit.at.y})`}
          >
            <Text line={line} register={r.source} fill={colours.text.axis} />
          </g>
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
