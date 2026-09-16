/**
 * One frame of « Par habitant, la Tchéquie accueille 36,1 Ukrainiens pour 1 000 habitants » — the title card, the hex grid
 * classed by count and Germany ringed, then every cell re-classed per inhabitant and Czechia ringed (BRIEF.md).
 *
 * THE MAP IS THE CALLER'S while the countries are geography (`liveMap`: the live MapTiler map in the composition — the
 * hosts' neutral, the hollow origin, the borders, each a MapLibre layer; nothing in the Bun tests). Over it, one SVG: the
 * same countries projected at the map's camera, which rise over the map's fills and then travel into their hexagons as a
 * ground rect rises over the basemap; the codes, the rings, the key column, the credit, the title.
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: paths, positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { ReactNode, Ref } from "react";
import { blend, sceneAt } from "./scene.mjs";

type Register = { fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; letterSpacing: number; lead: number };
type Line = { text: string; x: number; y: number; width: number };
type Measured = { text: string; width: number };
type Slot = "display" | "eyebrow" | "value" | "axis" | "code" | "source";
type Rect = { x: number; y: number; width: number; height: number };

export type HexFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  legend: {
    at: { x: number; y: number };
    largestRow: { x: number; y: number; count: Measured; rate: Measured };
    leaderRow: Line;
    unitRow: { x: number; y: number; count: Measured; rate: Measured };
    swatches: Rect[];
    bornes: { count: Line[]; rate: Line[] };
    originSwatch: Rect;
    originLabel: Line;
    halo: number;
    valueHalo: number;
    /** What the measured map paints under the words up while the map is: blended to the ground as the basemap leaves. */
    halos: { unit: string; origin: string };
  };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: { ground: string; sea: string; land: string; border: string; neutral: string; origin: string; originEdge: string; classFills: string[]; ring: string; text: Record<"eyebrow" | "title" | "figure" | "key" | "source", string> };
  strokes: { gap: number; ring: number; originDash: number[]; hairline: number };
  cells: Array<{ code: string; origin: boolean; countClass: number | null; rateClass: number | null; shape: string; box: { x: number; y: number; w: number; h: number }; cellBox: { x: number; y: number; w: number; h: number }; travelHex: string; d: string; ring: string; label: Line & { inks: Record<"neutral" | "count" | "rate", string> } }>;
  largest: string;
  leader: string;
  camera: Record<string, number>;
  mapPlan: { layers: Array<{ id: string; bindings?: Record<string, unknown> }> } & Record<string, unknown>;
  states: Record<string, number>[];
  timing: unknown;
};

function Word({ line, register, fill, opacity = 1, anchor, halo }: { line: Line; register: Register; fill: string; opacity?: number; anchor?: "middle"; halo?: { colour: string; width: number } }) {
  return (
    <text
      textAnchor={anchor}
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

export function HexFrame(props: HexFrameProps & { at: number; liveMap: (frame: number) => ReactNode; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, strokes, legend: key, credit, titleCard } = props;
  const scene = sceneAt(props as never, props.at);
  const ringOf = (code: string) => props.cells.find((c) => c.code === code)!.ring;
  const dash = strokes.originDash.join(" ");
  const keyHalo = (under: string) => ({ colour: blend(under, colours.ground, scene.basemapOut), width: key.halo });

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: frame.width, height: frame.height, background: colours.ground }}>
    {props.liveMap(props.at)}
    <svg ref={props.svgRef} style={{ position: "absolute", left: 0, top: 0 }} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
      {/* ── THE STORY: the live map under this SVG; the basemap fading out as the countries leave geography. ── */}
      <rect width={frame.width} height={frame.height} fill={colours.ground} opacity={scene.basemapOut} />

      {/* ── THE GRID: each country from its shape on the map into its hexagon, then the cells ── */}
      {scene.morph < 1
        ? props.cells.map((c) =>
            scene.shape === 0 && scene.cell === 0 ? null : (
              <g key={c.code} transform={scene.travel[c.code]}>
                {c.shape ? <path d={c.shape} fill={scene.fills[c.code]} stroke={c.origin ? colours.originEdge : colours.border} strokeWidth={strokes.hairline} strokeDasharray={c.origin ? dash : undefined} strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={scene.shape} /> : null}
                <path d={c.travelHex} fill={scene.fills[c.code]} stroke={c.origin ? colours.originEdge : colours.ground} strokeWidth={c.origin ? strokes.hairline : strokes.gap} strokeDasharray={c.origin ? dash : undefined} strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={scene.cell} />
              </g>
            ),
          )
        : props.cells.map((c) => (
            <path key={c.code} d={c.d} fill={scene.fills[c.code]} stroke={c.origin ? colours.originEdge : colours.ground} strokeWidth={c.origin ? strokes.hairline : strokes.gap} strokeDasharray={c.origin ? dash : undefined} strokeLinejoin="round" />
          ))}
      <g opacity={scene.codes}>
        {props.cells.map((c) => (
          <Word key={`code-${c.code}`} line={c.label} register={r.code} fill={c.label.inks[scene.inkStage[c.code] as "neutral" | "count" | "rate"]} anchor="middle" />
        ))}
      </g>
      <path d={ringOf(props.largest)} fill="none" stroke={colours.ring} strokeWidth={strokes.ring} strokeLinejoin="round" opacity={scene.largest * (1 - 0.35 * scene.leader)} />
      <path d={ringOf(props.leader)} fill="none" stroke={colours.ring} strokeWidth={strokes.ring} strokeLinejoin="round" opacity={scene.leader} />

      {/* ── THE KEY COLUMN ── */}
      <g transform={`translate(${key.at.x} ${key.at.y})`} opacity={scene.furniture}>
        <Word line={{ ...key.largestRow.count, x: key.largestRow.x, y: key.largestRow.y }} register={r.value} fill={colours.text.figure} opacity={scene.largest * (1 - scene.rate)} />
        <Word line={{ ...key.largestRow.rate, x: key.largestRow.x, y: key.largestRow.y }} register={r.value} fill={colours.text.figure} opacity={scene.largest * scene.rate} />
        <Word line={key.leaderRow} register={r.value} fill={colours.text.figure} opacity={scene.leader} />
        <Word line={{ ...key.unitRow.count, x: key.unitRow.x, y: key.unitRow.y }} register={r.axis} fill={colours.text.key} opacity={1 - scene.rate} halo={keyHalo(key.halos.unit)} />
        <Word line={{ ...key.unitRow.rate, x: key.unitRow.x, y: key.unitRow.y }} register={r.axis} fill={colours.text.key} opacity={scene.rate} halo={keyHalo(key.halos.unit)} />
        {key.swatches.map((s, i) => (
          <rect key={`swatch${i}`} x={s.x} y={s.y} width={s.width} height={s.height} fill={colours.classFills[i]} opacity={scene.swatches[i]} />
        ))}
        {key.bornes.count.map((b, i) => (
          <Word key={`count${i}`} line={b} register={r.axis} fill={colours.text.key} opacity={scene.swatches[i + 1] * (1 - scene.rate)} />
        ))}
        {key.bornes.rate.map((b, i) => (
          <Word key={`rate${i}`} line={b} register={r.axis} fill={colours.text.key} opacity={scene.rate} />
        ))}
        <rect x={key.originSwatch.x} y={key.originSwatch.y} width={key.originSwatch.width} height={key.originSwatch.height} fill={colours.origin} stroke={colours.originEdge} strokeWidth={strokes.hairline} strokeDasharray={dash} />
        <Word line={key.originLabel} register={r.axis} fill={colours.text.key} halo={keyHalo(key.halos.origin)} />
      </g>

      <g transform={`translate(${credit.at.x} ${credit.at.y})`} opacity={scene.source}>
        {credit.lines.map((line, i) => (
          <Word key={`credit${i}`} line={line} register={r.source} fill={colours.text.source} />
        ))}
      </g>

      <g opacity={scene.title}>
        <rect width={frame.width} height={frame.height} fill={colours.ground} />
        <Word line={titleCard.eyebrow} register={r.eyebrow} fill={colours.text.eyebrow} />
        {titleCard.title.map((line, i) => (
          <Word key={`title${i}`} line={line} register={titleCard.register} fill={colours.text.title} />
        ))}
      </g>
    </svg>
    </div>
  );
}
