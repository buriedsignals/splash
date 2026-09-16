/**
 * One frame of « L’eau et l’atome portent encore 77 % du bas-carbone européen, mais 10 pays ont basculé » — the title
 * card, the whole block and its total, the seams cutting it into countries, wind and solar rising in every cell, the ten
 * past the middle flooding, the ten packed into France's cell, then the whole treemap with France ringed (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { Ref } from "react";
import { gwText, paysText, sceneAt } from "./scene.mjs";

type Register = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: string;
  letterSpacing: number;
  lead: number;
};
type Line = { text: string; x: number; y: number; width: number };
type Slot = "display" | "eyebrow" | "value" | "annot" | "axis" | "source";
type Rect = { x: number; y: number; w: number; h: number };
type CellLine = { text: string; width: number; dx: number; dy: number; mid: number };

export type TreemapFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: {
    ground: string;
    field: string;
    full: string;
    ring: string;
    midline: string;
    text: Record<
      "eyebrow" | "title" | "onField" | "onFull" | "axis" | "accent",
      string
    >;
  };
  box: Rect;
  totalGw: number;
  biggest: string;
  cells: Array<{
    key: string;
    tipped: boolean;
    countries: number;
    share: number;
    rect: Rect;
    target: Rect | null;
    values: CellLine[];
    names: CellLine[];
    midlineFrom: number;
  }>;
  strip: Rect;
  sum: Line;
  legend: { swatch: Rect; word: Line; countX: number; countY: number };
  counts: Record<string, number>;
  valueCounts: Record<string, number>;
  wholeY: number;
  halo: number;
  strokes: { seam: number; ring: number; midline: number };
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

export function TreemapFrame(
  props: TreemapFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const { frame, registers: r, colours, credit, titleCard, box, legend: key } = props;
  const scene = sceneAt(props as never, props.at);
  const wholeText = gwText(scene.whole.count);
  const countText = paysText(scene.tipped);
  const drawOrder = props.cells
    .map((c, i) => ({ c, s: scene.cells[i] }))
    .sort((a, b) => a.s.moved - b.s.moved);

  return (
    <svg
      ref={props.svgRef}
      xmlns="http://www.w3.org/2000/svg"
      width={frame.width}
      height={frame.height}
      viewBox={`0 0 ${frame.width} ${frame.height}`}
    >
      <rect width={frame.width} height={frame.height} fill={colours.ground} />

      {/* The whole, before the seams: one block, its width the running total. */}
      {scene.split === 0 && scene.whole.w > 0 ? (
        <rect
          x={box.x}
          y={box.y}
          width={scene.whole.w}
          height={box.h}
          fill={colours.field}
        />
      ) : null}

      {scene.split > 0
        ? drawOrder.map(({ c, s }) => {
            const inset = (props.strokes.seam * s.seam) / 2;
            const x = s.rect.x + inset;
            const y = s.rect.y + inset;
            const w = Math.max(s.rect.w - 2 * inset, 0);
            const h = Math.max(s.rect.h - 2 * inset, 0);
            const level = h * Math.min(Math.max(s.level, 0), 1);
            const lines = [
              ...c.values.map((l) => ({ l, reg: r.value })),
              ...c.names.map((l) => ({ l, reg: r.annot })),
            ];
            return (
              <g key={c.key}>
                <rect x={x} y={y} width={w} height={h} fill={colours.field} />
                {level > 0 ? (
                  <rect
                    x={x}
                    y={y + h - level}
                    width={w}
                    height={level}
                    fill={colours.full}
                  />
                ) : null}
                {s.midline > 0 && s.rect.x + c.midlineFrom < x + w ? (
                  <line
                    x1={Math.max(x, s.rect.x + c.midlineFrom)}
                    x2={x + w}
                    y1={y + h / 2}
                    y2={y + h / 2}
                    stroke={colours.midline}
                    strokeWidth={props.strokes.midline}
                    opacity={s.midline}
                  />
                ) : null}
                {s.words > 0
                  ? lines.map(({ l, reg }, i) => (
                      <Text
                        key={`w${i}`}
                        line={{ text: l.text, width: l.width, x: s.rect.x + l.dx, y: s.rect.y + l.dy }}
                        register={reg}
                        fill={s.covered[i] ? colours.text.onFull : colours.text.onField}
                        opacity={s.words}
                        halo={{ colour: s.covered[i] ? colours.full : colours.field, width: props.halo }}
                      />
                    ))
                  : null}
              </g>
            );
          })
        : null}

      {scene.whole.opacity > 0 ? (
        <Text
          line={{
            text: wholeText,
            width: props.valueCounts[wholeText],
            x: box.x + scene.whole.w / 2 - props.valueCounts[wholeText] / 2,
            y: props.wholeY,
          }}
          register={r.value}
          fill={colours.text.onField}
          opacity={scene.whole.opacity}
        />
      ) : null}

      {scene.sum > 0 ? (
        <Text
          line={props.sum}
          register={r.value}
          fill={colours.text.onFull}
          opacity={scene.sum}
          halo={{ colour: colours.full, width: props.halo }}
        />
      ) : null}

      {props.cells.map((c, i) => {
        if (c.key !== props.biggest || scene.ring === 0) return null;
        const inset = props.strokes.seam / 2 + props.strokes.ring / 2;
        return (
          <rect
            key="ring"
            x={c.rect.x + inset}
            y={c.rect.y + inset}
            width={c.rect.w - 2 * inset}
            height={c.rect.h - 2 * inset}
            fill="none"
            stroke={colours.ring}
            strokeWidth={props.strokes.ring}
            opacity={scene.ring * (scene.cells[i].seam > 0 ? 1 : 0)}
          />
        );
      })}

      <g opacity={scene.key}>
        <rect
          x={key.swatch.x}
          y={key.swatch.y}
          width={key.swatch.w}
          height={key.swatch.h}
          fill={colours.full}
        />
        <Text line={key.word} register={r.axis} fill={colours.text.axis} />
        {scene.tipped > 0 ? (
          <Text
            line={{
              text: countText,
              width: props.counts[countText],
              x: key.countX,
              y: key.countY,
            }}
            register={r.value}
            fill={colours.text.accent}
          />
        ) : null}
      </g>

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
