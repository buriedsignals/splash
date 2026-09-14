/**
 * One frame of « La moitié du CO₂ suisse depuis 1858 a été émise après 1986 » — the title card, the surface filling
 * year by year while the stock counts up; the rule swept back from 2024 as the stock's gauge fills from its right, landing
 * on 1986 at half; both halves flattened into blocks of the same surface, then given back as the curve (BRIEF.md).
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
type Slot = "display" | "eyebrow" | "value" | "axis" | "annot" | "source";

export type AreaFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: {
    ground: string;
    grid: string;
    later: string;
    earlier: string;
    rule: string;
    text: Record<
      "eyebrow" | "title" | "stock" | "axis" | "rule" | "before" | "after",
      string
    >;
  };
  strokes: { grid: number; rule: number };
  plot: { left: number; top: number; right: number; bottom: number };
  points: Array<{ year: number; x: number; y: number; mt: number }>;
  baseY: number;
  midpoint: number;
  total: number;
  means: number[];
  ruleX: number;
  ruleYears: Record<string, { text: string; width: number }>;
  ruleYearY: number;
  ticksY: Array<Line & { baseline: number }>;
  ticksX: Array<Line & { tickX: number }>;
  stock: {
    at: { x: number; y: number };
    texts: Record<string, { text: string; width: number }>;
  };
  gauge: { x: number; y: number; width: number; height: number };
  beforeLabel: { block: Line[]; curve: Line[] };
  afterLabel: { block: Line[]; curve: Line[] };
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

const between = (curve: Line[], block: Line[], t: number) =>
  curve.map((l, i) => ({
    ...l,
    x: l.x + (block[i].x - l.x) * t,
    y: l.y + (block[i].y - l.y) * t,
  }));

export function AreaFrame(
  props: AreaFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const {
    frame,
    registers: r,
    colours,
    strokes,
    plot,
    credit,
    titleCard,
    gauge,
  } = props;
  const scene = sceneAt(props as never, props.at);
  const halo = { colour: colours.ground, width: props.halo };
  const stockText = props.stock.texts[String(scene.year)];
  const yearText = props.ruleYears[String(scene.ruleYear)];
  const yearX = Math.min(
    Math.max(scene.ruleX - yearText.width / 2, props.layoutInset.x),
    frame.width - props.layoutInset.x - yearText.width,
  );

  return (
    <svg
      ref={props.svgRef}
      xmlns="http://www.w3.org/2000/svg"
      width={frame.width}
      height={frame.height}
      viewBox={`0 0 ${frame.width} ${frame.height}`}
    >
      <defs>
        <clipPath id="area-recent">
          <rect
            x={scene.ruleX}
            y={0}
            width={Math.max(0, frame.width - scene.ruleX)}
            height={frame.height}
          />
        </clipPath>
      </defs>
      <rect width={frame.width} height={frame.height} fill={colours.ground} />

      <g opacity={scene.furniture}>
        {props.ticksY.map((t, i) => (
          <g key={`ty${i}`}>
            <line
              x1={plot.left}
              x2={plot.right}
              y1={t.y}
              y2={t.y}
              stroke={colours.grid}
              strokeWidth={strokes.grid}
            />
            <Word
              line={{ ...t, y: t.baseline }}
              register={r.axis}
              fill={colours.text.axis}
            />
          </g>
        ))}
        {props.ticksX.map((t, i) => (
          <Word
            key={`tx${i}`}
            line={t}
            register={r.axis}
            fill={colours.text.axis}
          />
        ))}
      </g>

      {/* ── THE SURFACE: filled in the accent, stepped back to its tint, then repainted from the right as the rule passes. ── */}
      <path d={scene.surface} fill={colours.later} />
      <path d={scene.surface} fill={colours.earlier} opacity={scene.gauge} />
      <path
        d={scene.surface}
        fill={colours.later}
        clipPath="url(#area-recent)"
        opacity={scene.gauge}
      />

      <g opacity={scene.gauge}>
        <line
          x1={scene.ruleX}
          x2={scene.ruleX}
          y1={plot.top}
          y2={plot.bottom}
          stroke={colours.rule}
          strokeWidth={strokes.rule}
        />
        <Word
          line={{ ...yearText, x: yearX, y: props.ruleYearY }}
          register={r.axis}
          fill={colours.text.rule}
          halo={halo}
        />
        {/* ── THE GAUGE: the whole stock in its tint, the share the rule has passed in the accent, its half marked. ── */}
        <rect
          x={gauge.x}
          y={gauge.y}
          width={gauge.width}
          height={gauge.height}
          fill={colours.earlier}
        />
        <rect
          x={gauge.x + gauge.width * (1 - scene.share)}
          y={gauge.y}
          width={gauge.width * scene.share}
          height={gauge.height}
          fill={colours.later}
        />
        <line
          x1={gauge.x + gauge.width / 2}
          x2={gauge.x + gauge.width / 2}
          y1={gauge.y - 0.3 * gauge.height}
          y2={gauge.y + 1.6 * gauge.height}
          stroke={colours.rule}
          strokeWidth={strokes.rule}
        />
      </g>

      <g opacity={scene.named}>
        {between(
          props.beforeLabel.curve,
          props.beforeLabel.block,
          scene.flatten,
        ).map((l, i) => (
          <Word
            key={`before${i}`}
            line={l}
            register={r.annot}
            fill={colours.text.before}
          />
        ))}
        {between(
          props.afterLabel.curve,
          props.afterLabel.block,
          scene.flatten,
        ).map((l, i) => (
          <Word
            key={`after${i}`}
            line={l}
            register={r.annot}
            fill={colours.text.after}
          />
        ))}
      </g>

      <Word
        line={{ ...stockText, ...props.stock.at }}
        register={r.value}
        fill={colours.text.stock}
        opacity={scene.stockShown}
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
