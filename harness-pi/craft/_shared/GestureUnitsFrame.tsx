/**
 * One frame of a Units-family GESTURE video (histogram or pictogram, `props.variant`): the title card; one row per
 * group — its name in the gutter, its units landing at one pace (a bar growing, squares filling, one square size for
 * every block), its count once every unit has landed —; and whatever the beat's three gestures have laid by this
 * frame — accents, rings, a step-back, a compare's copy, a bracket with its climbing figure, a rule at an edge, a
 * count on a caption line, the notes — then the credit.
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneUnitsAt`.
 */

import type { Ref } from "react";
import { sceneUnitsAt } from "./gesture-units-video.mjs";

type Register = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: string;
  letterSpacing: number;
  lead: number;
};
type Line = { text: string; x: number; y: number; width: number };

export type GestureUnitsFrameProps = {
  variant: "histogram" | "pictogram-isotype";
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
    unit: string;
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
    x0: number;
    span: number;
    right: number;
    max: number;
    cell: number;
    perLine: number;
    gap: number;
    captionLead: number;
    content: { left: number; right: number };
    plotTop: number;
    plotBottom: number;
  };
  rows: Array<{
    key: string;
    count: number;
    top: number;
    band: number;
    mid: number;
    bandTop: number;
    bandHeight: number;
    labelled: boolean;
    countText: { text: string; width: number };
    countY: number;
    names: Line[];
    notes: { item: number; text: string; width: number }[];
  }>;
  captions: {
    item: number;
    kind: string;
    lines: { text: string; width: number }[];
    y: number;
  }[];
  bracketLabels: {
    item: number;
    note: { text: string; width: number } | null;
    x: number;
  }[];
  ruleLabels: { item: number; x: number; line: { text: string; width: number } }[];
  unitLine: Line | null;
  countWidths: Record<string, number>;
  strokes: { rule: number; grid: number };
  dash: number[];
  halo: { value: number; axis: number; annot: number };
  [key: string]: unknown;
};

function blend(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16));
  return `#${pa
    .map((v, i) =>
      Math.round(v + (pb[i] - v) * t)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

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

export function GestureUnitsFrame(
  props: GestureUnitsFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const {
    frame,
    registers: r,
    colours,
    credit,
    titleCard,
    layout: L,
    variant,
  } = props;
  const scene = sceneUnitsAt(props as never, props.at) as any;
  const halo = (width: number) => ({ colour: colours.ground, width });
  const figure = (text: string, x: number, y: number): Line => ({
    text,
    x,
    y,
    width: props.countWidths[text],
  });
  const cellAt = (row: GestureUnitsFrameProps["rows"][number], k: number) => ({
    x: L.x0 + (k % L.perLine) * L.cell,
    y: row.bandTop + Math.floor(k / L.perLine) * L.cell,
  });
  const endAt = (k: number) =>
    variant === "histogram"
      ? L.x0 + (k / L.max) * L.span
      : L.x0 + Math.min(k, L.perLine) * L.cell;

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
          x1={L.x0}
          x2={L.x0}
          y1={L.plotTop - L.gap / 2}
          y2={L.plotBottom}
          stroke={colours.grid}
          strokeWidth={props.strokes.grid}
        />
        {props.unitLine ? (
          <Text
            line={props.unitLine}
            register={r.axis}
            fill={colours.text.axis}
          />
        ) : null}
        {props.rows.map((row, i) => {
          const s = scene.rows[i];
          if (!row.labelled) return null;
          const fill = blend(
            blend(colours.text.name, colours.text.first, s.accent),
            colours.text.axis,
            s.back,
          );
          return row.names.map((line, j) => (
            <Text
              key={`name${i}-${j}`}
              line={line}
              register={r.axis}
              fill={fill}
            />
          ));
        })}
      </g>

      {props.rows.map((row, i) => {
        const s = scene.rows[i];
        const fill = blend(
          blend(colours.unit, colours.first, s.accent),
          colours.faded,
          s.back,
        );
        if (variant === "histogram")
          return s.landed > 0 ? (
            <rect
              key={`mark${i}`}
              x={L.x0}
              y={row.top}
              width={Math.max(0, s.end - L.x0)}
              height={row.band}
              fill={fill}
            />
          ) : null;
        return Array.from({ length: Math.floor(s.landed) }, (_, k) => {
          const c = cellAt(row, k);
          return (
            <rect
              key={`u${i}-${k}`}
              x={c.x + L.cell * 0.07}
              y={c.y + L.cell * 0.07}
              width={L.cell * 0.86}
              height={L.cell * 0.86}
              fill={fill}
            />
          );
        });
      })}
      {scene.copies.map((c: any, j: number) => {
        const row = props.rows[c.row];
        if (variant === "histogram")
          return (
            <rect
              key={`copy${j}`}
              x={L.x0}
              y={row.top + row.band * 0.55}
              width={Math.max(0, endAt(c.shown) - L.x0)}
              height={row.band * 0.45}
              fill={colours.copy}
            />
          );
        return Array.from({ length: Math.floor(c.shown) }, (_, k) => {
          const p = cellAt(row, k);
          return (
            <rect
              key={`copy${j}-${k}`}
              x={p.x + L.cell * 0.2}
              y={p.y + L.cell * 0.2}
              width={L.cell * 0.6}
              height={L.cell * 0.6}
              fill="none"
              stroke={colours.copy}
              strokeWidth={props.strokes.rule}
            />
          );
        });
      })}
      {props.rows.map((row, i) => {
        const s = scene.rows[i];
        return s.ring > 0 ? (
          <rect
            key={`ring${i}`}
            x={L.x0 - L.gap / 3}
            y={row.bandTop - L.gap / 3}
            width={Math.max(L.gap, endAt(row.count) - L.x0) + (2 * L.gap) / 3}
            height={row.bandHeight + (2 * L.gap) / 3}
            fill="none"
            stroke={colours.ring}
            strokeWidth={props.strokes.rule}
            opacity={s.ring}
          />
        ) : null;
      })}
      {scene.rules.map((rule: any) => {
        const label = props.ruleLabels.find((l) => l.item === rule.index)!;
        return (
          <g key={`rule${rule.index}`} opacity={rule.opacity}>
            <line
              x1={L.x0 - L.gap}
              x2={rule.reach}
              y1={rule.y}
              y2={rule.y}
              stroke={colours.rule}
              strokeWidth={props.strokes.rule}
              strokeDasharray={props.dash.join(" ")}
            />
            <Text
              line={{
                ...label.line,
                x: label.x,
                y: rule.y + r.annot.fontSize * 0.35,
              }}
              register={r.annot}
              fill={colours.text.first}
              halo={halo(props.halo.annot)}
            />
          </g>
        );
      })}

      {props.rows.map((row, i) => {
        const s = scene.rows[i];
        if (!row.labelled || !(s.countOpacity > 0)) return null;
        const fill = blend(colours.text.count, colours.text.first, s.accent);
        return (
          <Text
            key={`count${i}`}
            line={{ ...row.countText, x: s.countX, y: row.countY }}
            register={r.value}
            fill={fill}
            opacity={s.countOpacity * (1 - 0.6 * s.back)}
            halo={halo(props.halo.value)}
          />
        );
      })}
      {props.rows.flatMap((row, i) => {
        const s = scene.rows[i];
        let x = s.countX + row.countText.width * 1.02 + L.gap;
        return s.notes.map((note: any) => {
          const at = x;
          x += note.width * 1.02 + L.gap;
          return note.opacity > 0 ? (
            <Text
              key={`note${i}-${note.item}`}
              line={{
                text: note.text,
                width: note.width,
                x: at,
                y: row.countY,
              }}
              register={r.annot}
              fill={colours.text.name}
              opacity={note.opacity}
              halo={halo(props.halo.annot)}
            />
          ) : null;
        });
      })}

      {scene.brackets.map((b: any) => (
        <g key={`bracket${b.index}`}>
          <path
            d={`M${b.x - L.gap / 2},${b.y1} H${b.x} V${b.reach}${b.reach >= b.y2 - 0.5 ? ` H${b.x - L.gap / 2}` : ""}`}
            fill="none"
            stroke={colours.text.count}
            strokeWidth={props.strokes.grid * 1.8}
          />
          {b.figure ? (
            <Text
              line={figure(
                b.figure,
                b.x + L.gap,
                (b.y1 + b.y2) / 2 + r.value.fontSize * 0.35,
              )}
              register={r.value}
              fill={colours.text.count}
              halo={halo(props.halo.value)}
            />
          ) : null}
          {b.note ? (
            <Text
              line={{
                ...b.note,
                x: b.x + L.gap,
                y: (b.y1 + b.y2) / 2 + r.annot.fontSize * 0.35,
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
            ? c.lines.map(
                (line: { text: string; width: number }, j: number) => (
                  <Text
                    key={`cap${j}`}
                    line={{
                      ...line,
                      x: L.content.left,
                      y: c.y + j * L.captionLead,
                    }}
                    register={r.annot}
                    fill={colours.text.name}
                    opacity={c.opacity}
                  />
                ),
              )
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
