/**
 * One frame of « Le plancher européen est monté de 30 points, le plafond de 2 » — the title card, sixteen chips on the 2000
 * strip, each copy travelling to its 2024 seat, the 2000 span slid onto 2024 pinned to Sweden and overhanging Poland's pin,
 * then both strips whole (BRIEF.md).
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
type Seat = { x: number; row: number; chipY: number };
type Segment = { x0: number; y0: number; x1: number; y1: number };

export type DotStripFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: {
    ground: string;
    rail: string;
    tick: string;
    chip: string;
    accentChip: string;
    leader: string;
    subjectLeader: string;
    ceilingLeader: string;
    span: string;
    guide: string;
    text: Record<
      "eyebrow" | "title" | "muted" | "name" | "accent" | "onChip" | "onAccent",
      string
    >;
  };
  strokes: { hairline: number; rule: number; emphasis: number };
  railH: number;
  spanH: number;
  chipH: number;
  stem: number;
  pxPerPoint: number;
  scale: { left: number; right: number };
  strips: Array<{ rail: number; ticksY: number; labelled: boolean; year: Line }>;
  ticks: Array<{ at: number; major: boolean; label?: Omit<Line, "y"> }>;
  marks: Array<{
    code: string;
    rank: number;
    subject: boolean;
    focus: boolean;
    width: number;
    label: { text: string; width: number; dx: number; dy: number };
    a: Seat;
    b: Seat;
    leader: Segment;
  }>;
  spans: {
    before: { x0: number; x1: number };
    after: { x0: number; x1: number };
    dx: number;
  };
  changes: Array<{ code: string; line: Line }>;
  cutLabel: Line;
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

export function DotStripFrame(
  props: DotStripFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const {
    frame,
    registers: r,
    colours,
    strokes,
    credit,
    titleCard,
    strips,
    chipH,
    stem,
  } = props;
  const scene = sceneAt(props as never, props.at);
  const halo = { colour: colours.ground, width: props.halo };
  const [upper, lower] = strips;

  const chipAt = (
    m: DotStripFrameProps["marks"][number],
    x: number,
    y: number,
    key: string,
  ) => {
    const fill = m.subject ? colours.accentChip : colours.chip;
    return (
      <g key={key} transform={`translate(${x} ${y})`}>
        <rect
          x={-m.width / 2}
          y={0}
          width={m.width}
          height={chipH}
          rx={chipH / 5}
          fill={fill}
        />
        <Text
          line={{
            text: m.label.text,
            width: m.label.width,
            x: m.label.dx,
            y: m.label.dy,
          }}
          register={r.axis}
          fill={m.subject ? colours.text.onAccent : colours.text.onChip}
        />
      </g>
    );
  };
  const stemOf = (
    x: number,
    rail: number,
    chipY: number,
    m: DotStripFrameProps["marks"][number],
  ) => (
    <line
      x1={x}
      x2={x}
      y1={rail}
      y2={chipY + chipH}
      stroke={m.subject ? colours.subjectLeader : colours.leader}
      strokeWidth={m.subject ? strokes.rule : strokes.hairline}
    />
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
        {strips.map((s, i) => (
          <rect
            key={`rail${i}`}
            x={props.scale.left}
            y={s.rail - props.railH / 2}
            width={props.scale.right - props.scale.left}
            height={props.railH}
            fill={colours.rail}
          />
        ))}
      </g>

      {/* THE SPANS lie on the rails, under the ticks: the 2000 field traced, then its copy slid onto 2024. */}
      <rect
        x={props.spans.before.x0}
        y={upper.rail - props.spanH / 2}
        width={Math.max(
          0,
          (props.spans.before.x1 - props.spans.before.x0) * scene.span,
        )}
        height={props.spanH}
        fill={colours.span}
        opacity={scene.span > 0 ? 1 : 0}
      />
      {scene.copy.on ? (
        <g>
          <rect
            x={Math.max(scene.copy.x0, props.spans.after.x0)}
            y={scene.copy.y - props.spanH / 2}
            width={
              scene.copy.x1 -
              Math.max(scene.copy.x0, props.spans.after.x0)
            }
            height={props.spanH}
            fill={colours.span}
          />
          <g opacity={scene.overhang}>
            <rect
              x={scene.copy.x0}
              y={scene.copy.y - props.spanH / 2}
              width={Math.max(
                0,
                props.spans.after.x0 - scene.copy.x0 + 1,
              )}
              height={props.spanH}
              fill={colours.span}
              // one pixel over the seam, so the sliding span reads as one bar
              opacity={1 - scene.turn}
            />
            <rect
              x={scene.copy.x0}
              y={scene.copy.y - props.spanH / 2}
              width={Math.max(
                0,
                props.spans.after.x0 - scene.copy.x0,
              )}
              height={props.spanH}
              fill={colours.guide}
              opacity={scene.turn}
            />
          </g>
        </g>
      ) : null}

      <g opacity={scene.furniture}>
        {strips.map((s, i) => (
          <g key={`ticks${i}`}>
            {props.ticks.map((t, j) => (
              <line
                key={`t${j}`}
                x1={t.at}
                x2={t.at}
                y1={s.rail - props.railH / 2}
                y2={s.rail + (t.major ? props.spanH / 2 : props.railH / 2)}
                stroke={colours.tick}
                strokeWidth={t.major ? strokes.rule : strokes.hairline}
              />
            ))}
            {/* Both strips read the SAME scale, so a frame too short for the corridor between them writes it out
                once: `build.mjs` spends that arrangement rung before it thins the field, and every tick above is
                still drawn on both rails — only the numbers over the upper one go. */}
            {props.ticks.map((t, j) =>
              t.label && s.labelled ? (
                <Text
                  key={`n${j}`}
                  line={{ ...t.label, y: s.ticksY }}
                  register={r.axis}
                  fill={colours.text.muted}
                />
              ) : null,
            )}
            <Text line={s.year} register={r.axis} fill={colours.text.muted} />
          </g>
        ))}
      </g>

      {/* THE LEADERS, under the chips: drawn behind each travelling copy as far as it has gone. */}
      {props.marks.map((m, i) => {
        const s = scene.marks[i];
        if (!s.drawn) return null;
        const emphasised = m.focus ? scene.emphasis : 0;
        return (
          <line
            key={`lead${m.code}`}
            x1={m.leader.x0}
            y1={m.leader.y0}
            x2={s.leaderEnd.x}
            y2={s.leaderEnd.y}
            stroke={
              m.subject
                ? colours.subjectLeader
                : m.focus
                  ? colours.ceilingLeader
                  : colours.leader
            }
            strokeWidth={
              m.focus
                ? strokes.hairline +
                  (strokes.emphasis - strokes.hairline) * emphasised
                : strokes.hairline
            }
            strokeDasharray={
              m.focus && emphasised > 0.5
                ? undefined
                : `${strokes.rule * 3} ${strokes.rule * 3}`
            }
            opacity={1 - s.dim}
          />
        );
      })}

      {/* Every stem before any chip: a stem rising to an upper row passes behind the chips under it, never across a code. */}
      {props.marks.map((m, i) => {
        const s = scene.marks[i];
        return (
          <g key={`stem${m.code}`} opacity={1 - s.dim}>
            <g opacity={scene.furniture}>{stemOf(m.a.x, upper.rail, m.a.chipY, m)}</g>
            {s.copy.on ? <g opacity={s.arrived}>{stemOf(m.b.x, lower.rail, m.b.chipY, m)}</g> : null}
          </g>
        );
      })}
      {props.marks.map((m, i) => {
        const s = scene.marks[i];
        return (
          <g key={`chip${m.code}`} opacity={1 - s.dim}>
            <g opacity={scene.furniture}>{chipAt(m, m.a.x, m.a.chipY, "a")}</g>
            {s.copy.on ? chipAt(m, s.copy.x, s.copy.y, "b") : null}
          </g>
        );
      })}

      {props.changes.map((c) => {
        const subject = props.marks.find((m) => m.code === c.code)!.subject;
        return (
          <Text
            key={`chg${c.code}`}
            line={c.line}
            register={r.value}
            fill={subject ? colours.text.accent : colours.text.name}
            opacity={scene.changes}
            halo={halo}
          />
        );
      })}
      <Text
        line={props.cutLabel}
        register={r.value}
        fill={colours.text.muted}
        opacity={scene.cutLabel}
        halo={halo}
      />

      <g
        transform={`translate(${credit.at.x} ${credit.at.y})`}
        opacity={scene.source}
      >
        {credit.lines.map((line, i) => (
          <Text
            key={`credit${i}`}
            line={line}
            register={r.source}
            fill={colours.text.muted}
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
