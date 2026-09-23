/**
 * One frame of « Sept pays européens dépassent 94 % d’électricité bas-carbone, par trois chemins » — the title card, the
 * twelve bars of 100 % grown over the 94 % line and counted, every bar split into its nine cells, the seven regrouped into
 * three routes, the whole matrix back (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { Ref } from "react";
import { blend } from "../video-cartogram-europe-lowcarbon/scene.mjs";
import { sceneAt, STEPPED_WORDS } from "./scene.mjs";

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
type Slot = "display" | "eyebrow" | "value" | "axis" | "annot" | "source";

export type HeatmapFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: {
    ground: string;
    ramp: string[];
    hairline: string;
    lowBar: string;
    fossilBar: string;
    stepped: string;
    outline: string;
    text: Record<"eyebrow" | "title" | "axis" | "ink" | "accent", string>;
  };
  grid: {
    left: number;
    right: number;
    top: number;
    pitch: number;
    gapH: number;
    cellW: number;
    gap: number;
  };
  gapRows: number;
  floor: number;
  sources: Array<{ lowCarbon: boolean }>;
  rows: Array<{
    lowCarbon: number;
    route: number | null;
    routeSlot: number;
    shares: number[];
    cells: Array<{ bin: number }>;
    name: Word & { x: number; dy: number };
    share: Word & { x: number; dy: number };
  }>;
  heads: Line[];
  families: Array<{ name: Line; x1: number; x2: number; y: number }>;
  shareHead: Line;
  floorLine: { x: number; top: number; bottom: number; label: Line };
  /** `caption`: when the frame has no column for the bracket's words, they stand OVER their span instead of
   *  beside it — `labelX` is then the frame's own inset and these are the lifts above the span's top. */
  bracket: { x: number; tick: number; labelX: number; caption: { annot: number; value: number } | null };
  counter: { texts: Record<string, Word>; dy: number; near: number };
  routeNames: Array<Word & { dy: number }>;
  nuclear: { x: number; w: number; pad: number };
  legend: {
    at: { x: number; y: number };
    halo: number;
    swatches: Array<{ x: number; y: number; width: number; height: number }>;
    bornes: Line[];
  };
  strokes: { outline: number; hairline: number };
  halo: { value: number; axis: number; annot: number };
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

/** A bracket over a run of rows, its ticks pointing back at them. */
const bracketPath = (x: number, tick: number, top: number, bottom: number) =>
  `M ${x - tick} ${top} L ${x} ${top} L ${x} ${bottom} L ${x - tick} ${bottom}`;

export function HeatmapFrame(
  props: HeatmapFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const {
    frame,
    registers: r,
    colours,
    credit,
    titleCard,
    grid,
    legend,
    bracket,
  } = props;
  const scene = sceneAt(props as never, props.at);
  const cellH = grid.pitch - grid.gap;
  const ground = colours.ground;
  const halo = (width: number) => ({ colour: ground, width });
  const count = props.counter.texts[String(scene.count)];

  return (
    <svg
      ref={props.svgRef}
      xmlns="http://www.w3.org/2000/svg"
      width={frame.width}
      height={frame.height}
      viewBox={`0 0 ${frame.width} ${frame.height}`}
    >
      <rect width={frame.width} height={frame.height} fill={ground} />

      {/* THE MATRIX'S FURNITURE: families, heads, the share column's head, the key. */}
      <g opacity={scene.grid}>
        {props.families.map((f, i) => (
          <g key={`family${i}`}>
            <line
              x1={f.x1}
              x2={f.x2}
              y1={f.y}
              y2={f.y}
              stroke={colours.text.axis}
              strokeWidth={props.strokes.hairline * 2}
            />
            <Text line={f.name} register={r.annot} fill={colours.text.axis} />
          </g>
        ))}
        {props.heads.map((h, i) => (
          <Text
            key={`head${i}`}
            line={h}
            register={r.axis}
            fill={colours.text.axis}
          />
        ))}
        <Text
          line={props.shareHead}
          register={r.axis}
          fill={colours.text.axis}
        />
        <g transform={`translate(${legend.at.x} ${legend.at.y})`}>
          {legend.swatches.map((s, i) => (
            <rect
              key={`swatch${i}`}
              x={s.x}
              y={s.y}
              width={s.width}
              height={s.height}
              fill={colours.ramp[i]}
              stroke={colours.hairline}
              strokeWidth={props.strokes.hairline}
            />
          ))}
          {legend.bornes.map((b, i) => (
            <Text
              key={`borne${i}`}
              line={b}
              register={r.axis}
              fill={colours.text.axis}
              halo={halo(legend.halo)}
            />
          ))}
        </g>
      </g>

      {/* THE 94 % LINE, gone as the bars split. */}
      <g opacity={scene.floor}>
        <line
          x1={props.floorLine.x}
          x2={props.floorLine.x}
          y1={props.floorLine.top}
          y2={props.floorLine.bottom}
          stroke={colours.outline}
          strokeWidth={props.strokes.outline * 0.6}
          strokeDasharray={`${props.strokes.outline * 3} ${props.strokes.outline * 2}`}
        />
        <Text
          line={props.floorLine.label}
          register={r.axis}
          fill={colours.text.ink}
          halo={halo(props.halo.axis)}
        />
      </g>

      {props.rows.map((row, i) => {
        const s = scene.rows[i];
        if (!(s.grown > 0)) return null;
        const words = 1 - STEPPED_WORDS * s.stepped;
        return (
          <g key={`row${i}`}>
            <Text
              line={{ ...row.name, y: s.y + row.name.dy }}
              register={r.axis}
              fill={colours.text.axis}
              opacity={Math.min(1, s.grown * 4) * words}
            />
            {row.cells.map((cell, j) => {
              const c = s.cells[j];
              const inset = grid.gap;
              const w = (c.folded > 0 ? c.w : c.visible) - inset;
              if (!(w > 0)) return null;
              const bar = props.sources[j].lowCarbon
                ? colours.lowBar
                : colours.fossilBar;
              const fill = blend(
                blend(bar, colours.ramp[cell.bin], c.folded),
                colours.stepped,
                s.stepped,
              );
              return (
                <rect
                  key={`cell${j}`}
                  x={c.x}
                  y={s.y}
                  width={w}
                  height={cellH}
                  fill={fill}
                  stroke={colours.hairline}
                  strokeWidth={props.strokes.hairline}
                  strokeOpacity={c.folded}
                />
              );
            })}
            <Text
              line={{ ...row.share, y: s.y + row.share.dy }}
              register={r.value}
              fill={
                row.route === null ? colours.text.axis : colours.text.accent
              }
              opacity={scene.grid * words}
            />
          </g>
        );
      })}

      {/* THE NUCLEAR COLUMN OF THE SEVEN, RINGED while the routes are named: empty, middle, dark. */}
      <g opacity={scene.ring.opacity}>
        {(["halo", "line"] as const).map((layer) => (
          <rect
            key={`ring-${layer}`}
            x={props.nuclear.x - props.nuclear.pad}
            y={scene.ring.top - props.nuclear.pad}
            width={props.nuclear.w + 2 * props.nuclear.pad}
            height={scene.ring.bottom - scene.ring.top + 2 * props.nuclear.pad}
            fill="none"
            stroke={layer === "halo" ? ground : colours.outline}
            strokeWidth={props.strokes.outline * (layer === "halo" ? 3 : 1)}
            strokeLinejoin="round"
          />
        ))}
      </g>

      {/* THE BRACKET OVER THE SEVEN, and the count beside it; the three routes' brackets and names take its place. */}
      <path
        d={bracketPath(
          bracket.x,
          bracket.tick,
          scene.whole.top,
          scene.whole.bottom,
        )}
        fill="none"
        stroke={colours.text.accent}
        strokeWidth={props.strokes.outline}
        opacity={scene.whole.opacity}
      />
      {count ? (
        <Text
          line={{
            ...count,
            x: scene.counterX,
            y: bracket.caption ? scene.whole.top - bracket.caption.value : (scene.whole.top + scene.whole.bottom) / 2 + props.counter.dy,
          }}
          register={r.value}
          fill={colours.text.accent}
          opacity={scene.counting}
          halo={halo(props.halo.value)}
        />
      ) : null}
      {scene.brackets.map((b, g) => (
        <g key={`route${g}`} opacity={b.opacity}>
          <path
            d={bracketPath(bracket.x, bracket.tick, b.top, b.bottom)}
            fill="none"
            stroke={colours.text.accent}
            strokeWidth={props.strokes.outline}
          />
          <Text
            line={{
              ...props.routeNames[g],
              x: bracket.labelX,
              y: bracket.caption ? b.top - bracket.caption.annot : (b.top + b.bottom) / 2 + props.routeNames[g].dy,
            }}
            register={r.annot}
            fill={colours.text.accent}
            halo={halo(props.halo.annot)}
          />
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
            halo={halo(credit.halo)}
          />
        ))}
      </g>

      <g opacity={scene.title}>
        <rect width={frame.width} height={frame.height} fill={ground} />
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
