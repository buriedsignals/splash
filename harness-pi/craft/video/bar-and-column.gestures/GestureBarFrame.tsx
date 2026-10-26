/**
 * One frame of a bar-and-column GESTURE video: the title card, the bars on one scale from one zero rule, and whatever
 * the beat's three gestures have laid by this frame — accents, rings, a step-back, a zoomed or rescaled scale, a new
 * order, a compare's copy, a bracket with its climbing figure, a reference rule, a count, the notes — then the credit.
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { Ref } from "react";
import { blend, sceneAt } from "./scene.mjs";

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

// The props are build.mjs's, read as data: the arithmetic over them is scene.mjs's.
export type GestureBarFrameProps = {
  frame: { width: number; height: number };
  registers: Record<
    "display" | "eyebrow" | "value" | "axis" | "annot" | "source",
    Register
  >;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: {
    ground: string;
    grid: string;
    column: string;
    first: string;
    copy: string;
    faded: string;
    rule: string;
    ring: string;
    text: Record<
      "eyebrow" | "title" | "name" | "axis" | "first" | "count",
      string
    >;
  };
  layout: {
    plotTop: number;
    plotBottom: number;
    barH: number;
    gap: number;
    tick: number;
    content: { left: number; right: number };
  };
  rows: Array<{
    key: string;
    name: Word & { x: number };
    value: number;
    count: Word;
    labelled: boolean;
  }>;
  scope: Line | null;
  countWidths: Record<string, number>;
  strokes: { rule: number; grid: number };
  dash: number[];
  halo: { value: number; axis: number; annot: number };
  [key: string]: unknown;
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

export function GestureBarFrame(
  props: GestureBarFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const { frame, registers: r, colours, credit, titleCard, layout: L } = props;
  const scene = sceneAt(props as never, props.at) as any;
  const halo = (width: number) => ({ colour: colours.ground, width });
  const figure = (text: string, x: number, y: number): Line => ({
    text,
    x,
    y,
    width: props.countWidths[text],
  });

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
        <line
          x1={scene.x0}
          x2={scene.x0}
          y1={L.plotTop - L.gap / 2}
          y2={L.plotBottom}
          stroke={colours.grid}
          strokeWidth={props.strokes.grid}
        />
        {props.rows.map((row, i) => {
          const s = scene.rows[i];
          if (!row.labelled) return null;
          const fill = blend(
            blend(colours.text.name, colours.text.first, s.accent),
            colours.text.axis,
            s.back,
          );
          return (
            <Text
              key={`name${i}`}
              line={{ ...row.name, y: s.nameY }}
              register={r.axis}
              fill={fill}
            />
          );
        })}
        {props.scope ? (
          <Text line={props.scope} register={r.axis} fill={colours.text.axis} />
        ) : null}
      </g>

      {props.rows.map((row, i) => {
        const s = scene.rows[i];
        if (!(s.barW > 0)) return null;
        const inked = blend(
          colours.faded,
          blend(colours.column, colours.first, s.accent),
          s.inked,
        );
        return (
          <rect
            key={`bar${i}`}
            x={s.barX}
            y={s.barY}
            width={s.barW}
            height={L.barH}
            fill={blend(inked, colours.faded, s.back)}
          />
        );
      })}
      {scene.copies.map((c: any, j: number) => (
        <rect
          key={`copy${j}`}
          x={c.x}
          y={c.y}
          width={c.width}
          height={c.height}
          fill={colours.copy}
        />
      ))}
      {props.rows.map((row, i) => {
        const s = scene.rows[i];
        return s.ring > 0 ? (
          <rect
            key={`ring${i}`}
            x={s.barX - L.gap / 3}
            y={s.barY - L.gap / 3}
            width={s.barW + (2 * L.gap) / 3}
            height={L.barH + (2 * L.gap) / 3}
            fill="none"
            stroke={colours.ring}
            strokeWidth={props.strokes.rule}
            opacity={s.ring}
          />
        ) : null;
      })}
      {scene.rules.map((rule: any) => (
        <line
          key={`rule${rule.index}`}
          x1={rule.x}
          x2={rule.x}
          y1={rule.y1}
          y2={rule.y2}
          stroke={colours.rule}
          strokeWidth={props.strokes.rule}
          strokeDasharray={props.dash.join(" ")}
        />
      ))}

      {props.rows.map((row, i) => {
        const s = scene.rows[i];
        if (!row.labelled || !(s.countOpacity > 0)) return null;
        const fill = blend(colours.text.count, colours.text.first, s.accent);
        return (
          <Text
            key={`count${i}`}
            line={{
              text: row.count.text,
              width: row.count.width,
              x: s.countX,
              y: s.countY,
            }}
            register={r.value}
            fill={fill}
            opacity={s.countOpacity}
            halo={halo(props.halo.value)}
          />
        );
      })}
      {scene.rows.flatMap((s: any, i: number) =>
        s.notes.map((note: any) =>
          note.opacity > 0 ? (
            <Text
              key={`note${i}-${note.item}`}
              line={{
                text: note.text,
                width: note.width,
                x: note.x,
                y: s.countY,
              }}
              register={r.annot}
              fill={colours.text.name}
              opacity={note.opacity}
              halo={halo(props.halo.annot)}
            />
          ) : null,
        ),
      )}

      {scene.brackets.map((b: any) => (
        <g key={`bracket${b.index}`}>
          <line
            x1={b.spineX}
            x2={b.spineX}
            y1={b.y1}
            y2={b.reach}
            stroke={colours.text.count}
            strokeWidth={props.strokes.grid * 1.6}
          />
          {b.ticks.map((y: number, j: number) => (
            <line
              key={`tick${j}`}
              x1={b.spineX - L.tick}
              x2={b.spineX}
              y1={y}
              y2={y}
              stroke={colours.text.count}
              strokeWidth={props.strokes.grid * 1.6}
            />
          ))}
          {b.figure ? (
            <Text
              line={figure(b.figure, b.labelX, b.labelY)}
              register={r.value}
              fill={colours.text.count}
              halo={halo(props.halo.value)}
            />
          ) : null}
          {b.note ? (
            <Text
              line={{
                text: b.note.text,
                width: b.note.width,
                x: b.labelX,
                y: b.labelY,
              }}
              register={r.annot}
              fill={colours.text.count}
              halo={halo(props.halo.annot)}
            />
          ) : null}
        </g>
      ))}

      {scene.captions.map((c: any) => (
        <g key={`caption${c.item}`}>
          {c.figure ? (
            <Text
              line={figure(c.figure, L.content.left, c.y)}
              register={r.value}
              fill={colours.text.count}
            />
          ) : null}
          {c.opacity > 0
            ? c.lines.map((line: Word, j: number) => (
                <Text
                  key={`cap${j}`}
                  line={{
                    ...line,
                    x: L.content.left + (c.dx ?? 0),
                    y: c.y + j * (L as any).captionLead,
                  }}
                  register={r.annot}
                  fill={colours.text.name}
                  opacity={c.opacity}
                />
              ))
            : null}
        </g>
      ))}

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
