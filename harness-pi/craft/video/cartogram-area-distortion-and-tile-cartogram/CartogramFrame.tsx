/**
 * One frame of « Par pays 65,1 % ; au km² 44,9 % » — a video in SHOTS: the title card, then the map that becomes
 * the cartogram with its key standing on the Atlantic, ending on the cartogram with its credit (BRIEF.md).
 *
 * THE MAP IS THE CALLER'S while the countries are geography (`liveMap`: the live MapTiler map in the composition — the
 * class fills, the hollow country, the borders, the widest country's name, each a MapLibre layer; nothing in the Bun
 * tests). Over it, one SVG: the same countries projected at the map's camera, which rise over the map's fills and then
 * morph into their tiles as a ground rect rises over the basemap; the balance, the key, the codes, the credit, the title.
 *
 * NOTHING HERE IS MEASURED OR CHOSEN. Every word is drawn at the coordinates `build.mjs` measured in Bun, in the
 * register its slot names, and carries that width (`data-width`); every colour comes from the direction through
 * `colours`; what moves at this frame is `sceneAt`.
 */

import type { ReactNode, Ref } from "react";
import { blend, sceneAt } from "./scene.mjs";

type Register = { fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; letterSpacing: number; lead: number };
type Line = { text: string; x: number; y: number; width: number };
type Rect = { x: number; y: number; width: number; height: number };
type Slot = "display" | "eyebrow" | "value" | "axis" | "code" | "source";

export type CartogramFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  legend: {
    at: { x: number; y: number };
    halo: number;
    valueHalo: number;
    width: number;
    height: number;
    swatches: Rect[];
    bornes: Line[];
    missingSwatch: Rect;
    missingLabel: Line;
    /** What the measured map paints under each word, blended to the ground as the basemap leaves. */
    halos: { bornes: string[]; missing: string };
  };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[]; width: number; height: number };
  /** The balance: a 0–100 % beam, its bins, the columns' full height, the pivots' texts. */
  beam: {
    x: number;
    y: number;
    width: number;
    height: number;
    binWidth: number;
    pivotSize: number;
    block: { x: number; y: number; width: number; height: number };
    areaValue: number;
    areaText: { text: string; width: number; baseline: number };
    liveTemplate: string;
    liveTexts: Record<string, number>;
    liveBaseline: number;
  };
  widest: string;
  colours: {
    ground: string;
    beamHalo: string;
    neutral: string;
    border: string;
    classFills: string[];
    missingEdge: string;
    text: Record<"eyebrow" | "title" | "count" | "key" | "source", string>;
  };
  strokes: { border: number; missingDash: number[] };
  countries: Array<{
    iso: string;
    path: string;
    box: { x: number; y: number; w: number; h: number };
    tile: { x: number; y: number; w: number; h: number };
    classIndex: number | null;
    code: { text: string; width: number; x: number; y: number; ink: string };
  }>;
  camera: Record<string, number>;
  mapPlan: { layers: Array<{ id: string; bindings?: Record<string, unknown> }> } & Record<string, unknown>;
  states: Record<string, number>[];
  timing: unknown;
};

function Word({ line, register, fill, opacity = 1, anchor, halo, measured = true }: { line: Line; register: Register; fill: string; opacity?: number; anchor?: "start" | "middle"; halo?: { colour: string; width: number }; measured?: boolean }) {
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
      data-width={measured ? line.width : undefined}
    >
      {line.text}
    </text>
  );
}

export function CartogramFrame(props: CartogramFrameProps & { at: number; liveMap: (frame: number) => ReactNode; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, strokes, legend: key, credit, titleCard, beam } = props;
  const scene = sceneAt(props as never, props.at);
  const dash = strokes.missingDash.join(" ");

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: frame.width, height: frame.height, background: colours.ground }}>
    {props.liveMap(props.at)}
    <svg ref={props.svgRef} style={{ position: "absolute", left: 0, top: 0 }} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
      {/* ── THE STORY: the live map under this SVG; the basemap fading out as the countries leave geography. ── */}
      <rect width={frame.width} height={frame.height} fill={colours.ground} opacity={scene.basemapOut} />
      {props.countries.map((c) => {
        const s = scene.countries[c.iso];
        const missing = c.classIndex === null;
        const fill = missing ? colours.ground : s.fill;
        if (s.shape === 0 && s.tile === 0) return null;
        return (
          <g key={c.iso} opacity={s.opacity}>
            <g transform={s.transform}>
              <path d={c.path} fill={fill} stroke={missing ? colours.missingEdge : colours.border} strokeWidth={strokes.border} strokeDasharray={missing ? dash : undefined} strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={s.shape} />
              <rect x={c.box.x} y={c.box.y} width={c.box.w} height={c.box.h} fill={fill} stroke={missing ? colours.missingEdge : colours.border} strokeWidth={strokes.border} strokeDasharray={missing ? dash : undefined} vectorEffect="non-scaling-stroke" opacity={s.tile} />
            </g>
          </g>
        );
      })}
      {props.countries.map((c) => (
        <Word key={`code-${c.iso}`} line={{ text: c.code.text, x: c.code.x, y: c.code.y, width: c.code.width }} register={r.code} fill={c.code.ink} opacity={scene.codes} anchor="middle" />
      ))}

      {/* ── THE BALANCE: every country a column at its share, its height its weight; the pivots under the means. ── */}
      <g opacity={scene.furniture}>
        {props.countries.map((c) => {
          const col = scene.columns[c.iso];
          if (!col || c.classIndex === null) return null;
          const s = scene.countries[c.iso];
          return <rect key={`column-${c.iso}`} x={col.x} y={col.y} width={Math.max(0, col.w - strokes.border)} height={col.h} fill={s.fill ?? colours.neutral} opacity={s.opacity * scene.swatches[c.classIndex]} />;
        })}
        <line x1={beam.x} x2={beam.x + beam.width} y1={beam.y} y2={beam.y} stroke={colours.text.key} strokeWidth={strokes.border} />
      </g>
      {[
        { pivot: scene.pivots.area, fill: colours.text.key, text: beam.areaText.text, width: beam.areaText.width, baseline: beam.areaText.baseline },
        { pivot: scene.pivots.live, fill: colours.text.count, text: scene.pivots.live.text, width: beam.liveTexts[scene.pivots.live.text] ?? 0, baseline: beam.liveBaseline },
      ].map(({ pivot, fill, text, width, baseline }, i) => {
        const x = Math.min(Math.max(pivot.x - width / 2, beam.block.x), beam.block.x + beam.block.width - width);
        return (
          <g key={`pivot${i}`} opacity={pivot.opacity}>
            <path d={`M${pivot.x} ${beam.y}L${pivot.x - beam.pivotSize / 2} ${beam.y + beam.pivotSize}L${pivot.x + beam.pivotSize / 2} ${beam.y + beam.pivotSize}Z`} fill={fill} />
            <Word line={{ text, x, y: baseline, width }} register={r.value} fill={fill} halo={{ colour: scene.beamGround, width: key.valueHalo }} />
          </g>
        );
      })}

      {/* ── THE KEY: the class key, standing on the sea, then on the ground. ── */}
      <g transform={`translate(${key.at.x} ${key.at.y})`} opacity={scene.furniture}>
        {key.swatches.map((s, i) => (
          <rect key={`swatch${i}`} x={s.x} y={s.y} width={s.width} height={s.height} fill={colours.classFills[i]} opacity={scene.swatches[i]} />
        ))}
        {key.bornes.map((line, i) => (
          <Word key={`borne${i}`} line={line} register={r.axis} fill={colours.text.key} opacity={scene.swatches[i]} halo={{ colour: blend(key.halos.bornes[i], colours.ground, scene.morph), width: key.halo }} />
        ))}
        <rect x={key.missingSwatch.x} y={key.missingSwatch.y} width={key.missingSwatch.width} height={key.missingSwatch.height} fill={colours.ground} stroke={colours.missingEdge} strokeWidth={strokes.border} strokeDasharray={dash} />
        <Word line={key.missingLabel} register={r.axis} fill={colours.text.key} halo={{ colour: blend(key.halos.missing, colours.ground, scene.morph), width: key.halo }} />
      </g>

      {/* ── NO END CARD: the credit on the cartogram the video ends on. ── */}
      <g transform={`translate(${credit.at.x} ${credit.at.y})`} opacity={scene.source}>
        {credit.lines.map((line, i) => (
          <Word key={`credit${i}`} line={line} register={r.source} fill={colours.text.source} halo={{ colour: colours.ground, width: credit.halo }} />
        ))}
      </g>

      {/* ── THE TITLE CARD: frame 0, alone on the ground. ── */}
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
