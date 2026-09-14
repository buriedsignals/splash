/**
 * One frame of « Par pays 65,1 % ; au km² 44,9 % » — a video in SHOTS: the title card, then the map that becomes
 * the cartogram with its key standing on the Atlantic, ending on the cartogram with its credit (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN. Every word is drawn at the coordinates `build.mjs` measured in Bun, in the
 * register its slot names, and carries that width (`data-width`); every colour comes from the direction through
 * `colours`; what moves at this frame is `sceneAt`.
 */

import type { Ref } from "react";
import { sceneAt } from "./scene.mjs";

type Register = { fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; letterSpacing: number; lead: number };
type Line = { text: string; x: number; y: number; width: number };
type Rect = { x: number; y: number; width: number; height: number };
type Slot = "display" | "eyebrow" | "value" | "axis" | "area" | "code" | "source";

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
  widestName: { text: string; textWidth: number; textX: number; baseline: number; x: number; y: number; ink: string; halo: number; haloColour: string };
  colours: {
    ground: string;
    sea: string;
    neutral: string;
    context: string;
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
  context: Array<{ key: string; path: string }>;
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

export function CartogramFrame(props: CartogramFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, strokes, legend: key, credit, titleCard, beam } = props;
  const scene = sceneAt(props as never, props.at);
  const dash = strokes.missingDash.join(" ");

  return (
    <svg ref={props.svgRef} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
      <rect width={frame.width} height={frame.height} fill={colours.ground} />

      {/* ── THE STORY: the map, then the tiles. ── */}
      <g opacity={scene.map}>
        <rect width={frame.width} height={frame.height} fill={colours.sea} />
        {props.context.map((c) => (
          <path key={c.key} d={c.path} fill={colours.context} stroke={colours.ground} strokeWidth={strokes.border} strokeLinejoin="round" />
        ))}
      </g>
      {props.countries.map((c) => {
        const s = scene.countries[c.iso];
        const missing = c.classIndex === null;
        const fill = missing ? colours.ground : s.fill;
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
      <Word
        line={{ text: props.widestName.text, x: props.widestName.x + props.widestName.textX, y: props.widestName.y + props.widestName.baseline, width: props.widestName.textWidth }}
        register={r.area}
        fill={props.widestName.ink}
        opacity={scene.widest}
        halo={{ colour: props.widestName.haloColour, width: props.widestName.halo }}
      />

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
            <Word line={{ text, x, y: baseline, width }} register={r.value} fill={fill} halo={{ colour: scene.keyGround, width: key.valueHalo }} />
          </g>
        );
      })}

      {/* ── THE KEY: the class key, standing on the sea, then on the ground. ── */}
      <g transform={`translate(${key.at.x} ${key.at.y})`} opacity={scene.furniture}>
        {key.swatches.map((s, i) => (
          <rect key={`swatch${i}`} x={s.x} y={s.y} width={s.width} height={s.height} fill={colours.classFills[i]} opacity={scene.swatches[i]} />
        ))}
        {key.bornes.map((line, i) => (
          <Word key={`borne${i}`} line={line} register={r.axis} fill={colours.text.key} opacity={scene.swatches[i]} halo={{ colour: scene.keyGround, width: key.halo }} />
        ))}
        <rect x={key.missingSwatch.x} y={key.missingSwatch.y} width={key.missingSwatch.width} height={key.missingSwatch.height} fill={colours.ground} stroke={colours.missingEdge} strokeWidth={strokes.border} strokeDasharray={dash} />
        <Word line={key.missingLabel} register={r.axis} fill={colours.text.key} halo={{ colour: scene.keyGround, width: key.halo }} />
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
  );
}
