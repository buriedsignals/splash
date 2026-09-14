/**
 * One frame of « En 2016, le solaire est devenu la troisième source d'électricité suisse » — the title card, the stream
 * flowing 2000 → 2024; the two giants set aside, the small sources magnified and turned into lines from zero, a cursor
 * racing the years with solar's rank; then the whole stream back with 2016 marked (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: edges, positions, texts and colours come from `build.mjs`; motion and paths from
 * `sceneAt`.
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
type Slot = "display" | "eyebrow" | "value" | "axis" | "annot" | "source";
type Edges = Record<string, number[][]>;

export type StreamFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: {
    ground: string;
    grid: string;
    edge: string;
    cursor: string;
    text: Record<
      "eyebrow" | "title" | "rank" | "rival" | "axis" | "mark",
      string
    >;
  };
  strokes: { edge: number; rule: number; line: number };
  plot: { left: number; top: number; right: number; bottom: number };
  keys: string[];
  giants: string[];
  lineKeys: string[];
  tracked: string;
  rivalKey: string;
  layers: Array<{ key: string; fill: string; stroke: string }>;
  geometry: { stream: Edges; aside: Edges; magnify: Edges; lines: Edges };
  magnify: number;
  baseline: number;
  lineScale: number;
  xs: number[];
  years: Array<{ year: number; rank: number }>;
  rankTexts: Record<string, { text: string; width: number }>;
  rankOffset: number;
  rankShift: number;
  rival: Line;
  bandNames: Array<Line & { key: string; ink: string; revealAt: number }>;
  mark: { year: number; x: number; y1: number; y2: number; label: Line };
  ticks: Array<Line & { tickX: number }>;
  halo: number;
  layoutInset: { x: number; y: number };
  states: Record<string, number>[];
  timing: unknown;
};

function Word({
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

export function StreamFrame(
  props: StreamFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const {
    frame,
    registers: r,
    colours,
    strokes,
    plot,
    credit,
    titleCard,
    mark,
  } = props;
  const scene = sceneAt(props as never, props.at);
  const halo = { colour: colours.ground, width: props.halo };
  const rank = props.rankTexts[String(scene.rank)];
  const colourOf = Object.fromEntries(props.layers.map((l) => [l.key, l]));
  // The tracked band is drawn last, so its line is never under another.
  const order = [
    ...props.keys.filter((k) => k !== props.tracked),
    props.tracked,
  ];

  return (
    <svg
      ref={props.svgRef}
      xmlns="http://www.w3.org/2000/svg"
      width={frame.width}
      height={frame.height}
      viewBox={`0 0 ${frame.width} ${frame.height}`}
    >
      <defs>
        <clipPath id="stream-front">
          <rect
            x={0}
            y={0}
            width={scene.flow >= 1 ? frame.width : scene.front}
            height={frame.height}
          />
        </clipPath>
      </defs>
      <rect width={frame.width} height={frame.height} fill={colours.ground} />
      <g opacity={scene.furniture}>
        {props.ticks.map((t, i) => (
          <g key={`t${i}`}>
            <line
              x1={t.tickX}
              x2={t.tickX}
              y1={plot.top}
              y2={plot.bottom}
              stroke={colours.grid}
              strokeWidth={strokes.edge}
            />
            <Word line={t} register={r.axis} fill={colours.text.axis} />
          </g>
        ))}
      </g>

      {/* ── THE STREAM, revealed up to the front; its small bands fading into their lines ── */}
      <g clipPath="url(#stream-front)" opacity={scene.flow > 0 ? 1 : 0}>
        {order.map((key) => {
          const layer = props.layers.find((l) => l.key === key)!;
          const d = scene.layers.find((l: { key: string }) => l.key === key)!;
          return (
            <g key={key} opacity={scene.opacity[key]}>
              <path
                d={d.d}
                fill={layer.fill}
                stroke={colours.edge}
                strokeWidth={strokes.edge}
                opacity={1 - scene.lines}
              />
              {d.edge ? (
                <path
                  d={d.edge}
                  fill="none"
                  stroke={colourOf[key].stroke}
                  strokeWidth={
                    key === props.tracked || key === props.rivalKey
                      ? strokes.line * 1.5
                      : strokes.line
                  }
                  strokeLinejoin="round"
                  opacity={scene.lines}
                />
              ) : null}
            </g>
          );
        })}
        {props.bandNames.map((n) => (
          <Word
            key={n.key}
            line={n}
            register={r.annot}
            fill={n.ink}
            opacity={scene.names[n.key]}
          />
        ))}
      </g>

      <line
        x1={scene.cursor.x}
        x2={scene.cursor.x}
        y1={plot.top}
        y2={props.baseline}
        stroke={colours.cursor}
        strokeWidth={strokes.edge * 1.5}
        opacity={scene.labelShown * scene.lines}
      />
      <Word
        line={props.rival}
        register={r.annot}
        fill={colours.text.rival}
        opacity={scene.lines}
        halo={halo}
      />
      <g opacity={scene.mark}>
        <line
          x1={mark.x}
          x2={mark.x}
          y1={mark.y1}
          y2={mark.y2}
          stroke={colours.text.mark}
          strokeWidth={strokes.rule}
        />
        <Word
          line={mark.label}
          register={r.axis}
          fill={colours.text.mark}
          halo={halo}
        />
      </g>
      <Word
        line={{
          ...rank,
          x: scene.anchor.x + props.rankOffset,
          y: scene.anchor.y + props.rankShift,
        }}
        register={r.value}
        fill={colours.text.rank}
        opacity={scene.labelShown}
        halo={halo}
      />

      <g
        transform={`translate(${credit.at.x} ${credit.at.y})`}
        opacity={scene.source}
      >
        {credit.lines.map((line, i) => (
          <Word
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
        <Word
          line={titleCard.eyebrow}
          register={r.eyebrow}
          fill={colours.text.eyebrow}
        />
        {titleCard.title.map((line, i) => (
          <Word
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
