/**
 * One frame of « La France et l’Allemagne produisent presque autant d’électricité, avec des mix opposés » — the title
 * card, the two bars on one TWh scale, stretched to 100 % and cut into nine sources, carried source after source onto the
 * wheel's spokes keeping their lengths, the outlines closed, nuclear's two shares ringed (BRIEF.md).
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
type Word = { text: string; width: number; x?: number; y?: number };
type Slot = "display" | "eyebrow" | "axis" | "value" | "annot" | "source";

export type RadarFrameProps = {
  frame: { width: number; height: number };
  inset: number;
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: {
    ground: string;
    marks: string[];
    fills: number[];
    grid: string;
    ceiling: string;
    text: { eyebrow: string; title: string; items: string[]; muted: string };
  };
  strokes: { hairline: number; rule: number; outline: number; dot: number; dash: number[]; ring: number };
  halo: number;
  wheel: {
    x: number;
    y: number;
    radius: number;
    pxPerPct: number;
    rings: Array<{ value: number; r: number; ceiling: boolean }>;
    ceiling: Line;
    ring: { x: number; y: number; width: number; height: number; rx: number };
    labels: Array<{ name: Line; values: Line & { parts: string[] } }>;
  };
  bars: { x0: number; zoom: number; pxPerTwh: number; gap: number; thickness: number; labelGap: number; landed: { width: number; offset: number } };
  countries: Array<{
    subject: boolean;
    side: number;
    total: number;
    shares: number[];
    bar: { y: number };
    name: Word & { dx: number; dy: number };
    key: Line;
    totals: { dy: number; twh: Word; full: Word };
  }>;
  states: Record<string, number>[];
  timing: unknown;
};

function Text({
  line,
  register,
  fill,
  opacity = 1,
  halo,
  x,
  y,
  children,
}: {
  line: Word;
  register: Register;
  fill: string;
  opacity?: number;
  halo?: { colour: string; width: number };
  x?: number;
  y?: number;
  children?: React.ReactNode;
}) {
  return (
    <text
      x={x ?? line.x}
      y={y ?? line.y}
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
      {children ?? line.text}
    </text>
  );
}

export function RadarFrame(props: RadarFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, wheel, credit, titleCard, strokes } = props;
  const scene = sceneAt(props as never, props.at);
  const halo = { colour: colours.ground, width: props.halo };
  const n = wheel.labels.length;
  const order = props.countries.map((_, i) => i).reverse();

  return (
    <svg
      ref={props.svgRef}
      xmlns="http://www.w3.org/2000/svg"
      width={frame.width}
      height={frame.height}
      viewBox={`0 0 ${frame.width} ${frame.height}`}
    >
      <rect width={frame.width} height={frame.height} fill={colours.ground} />

      {scene.grid > 0 ? (
        <g opacity={scene.grid}>
          {wheel.rings.map((ring) => (
            <circle
              key={`ring${ring.value}`}
              cx={wheel.x}
              cy={wheel.y}
              r={ring.r}
              fill="none"
              stroke={ring.ceiling ? colours.ceiling : colours.grid}
              strokeWidth={ring.ceiling ? strokes.rule : strokes.hairline}
              strokeDasharray={ring.ceiling ? undefined : strokes.dash.join(" ")}
            />
          ))}
          {wheel.labels.map((_, j) => {
            const a = (j / n) * 2 * Math.PI - Math.PI / 2;
            return (
              <line
                key={`spoke${j}`}
                x1={wheel.x}
                y1={wheel.y}
                x2={wheel.x + Math.cos(a) * wheel.radius}
                y2={wheel.y + Math.sin(a) * wheel.radius}
                stroke={colours.grid}
                strokeWidth={strokes.hairline}
              />
            );
          })}
          <Text line={wheel.ceiling} register={r.axis} fill={colours.text.muted} halo={halo} />
        </g>
      ) : null}

      {order.map((i) =>
        scene.countries[i].fill > 0 ? (
          <path
            key={`area${i}`}
            d={scene.countries[i].area}
            fill={colours.marks[i]}
            fillOpacity={colours.fills[i] * scene.countries[i].fill}
            stroke="none"
          />
        ) : null,
      )}
      {order.map((i) =>
        scene.countries[i].outline ? (
          <path
            key={`outline${i}`}
            d={scene.countries[i].outline}
            fill="none"
            stroke={colours.marks[i]}
            strokeWidth={strokes.outline}
            strokeLinecap="round"
          />
        ) : null,
      )}
      {order.map((i) =>
        scene.countries[i].fill > 0 ? (
          <g key={`dots${i}`} opacity={scene.countries[i].fill}>
            {scene.countries[i].vertices.map((v, j) => (
              <circle key={`dot${j}`} cx={v.x} cy={v.y} r={strokes.dot} fill={colours.marks[i]} />
            ))}
          </g>
        ) : null,
      )}

      {props.countries.map((_, i) => {
        const w = scene.countries[i].backing;
        return w.opacity > 0 && w.x2 > w.x1 ? (
          <line key={`backing${i}`} x1={w.x1} y1={w.y} x2={w.x2} y2={w.y} stroke={colours.marks[i]} strokeWidth={w.width} opacity={w.opacity} />
        ) : null;
      })}
      {props.countries.map((_, i) =>
        scene.countries[i].parts.map((p, j) =>
          p.length > 0.01 && p.opacity > 0 ? (
            <line
              key={`part${i}-${j}`}
              x1={p.x1}
              y1={p.y1}
              x2={p.x2}
              y2={p.y2}
              stroke={colours.marks[i]}
              strokeWidth={p.width}
              strokeLinecap="butt"
              opacity={p.opacity}
            />
          ) : null,
        ),
      )}

      {props.countries.map((c, i) => {
        const s = scene.countries[i];
        return (
          <g key={`words${i}`}>
            {s.name.opacity > 0 ? (
              <Text line={c.name} x={s.name.x} y={s.name.y} register={r.annot} fill={colours.text.items[i]} opacity={s.name.opacity} halo={halo} />
            ) : null}
            {s.totals.twh > 0 ? (
              <Text line={c.totals.twh} x={s.totals.x} y={s.totals.y} register={r.value} fill={colours.text.items[i]} opacity={s.totals.twh} />
            ) : null}
            {s.totals.full > 0 ? (
              <Text line={c.totals.full} x={s.totals.x} y={s.totals.y} register={r.value} fill={colours.text.items[i]} opacity={s.totals.full} />
            ) : null}
          </g>
        );
      })}

      {wheel.labels.map((l, j) =>
        scene.labels[j] > 0 ? (
          <g key={`label${j}`} opacity={scene.labels[j]}>
            <Text line={l.name} register={r.annot} fill={colours.text.muted} halo={halo} />
            <Text line={l.values} register={r.value} fill={colours.text.muted} halo={halo}>
              <tspan fill={colours.text.items[0]}>{l.values.parts[0]}</tspan>
              <tspan fill={colours.text.muted}>{l.values.parts[1]}</tspan>
              <tspan fill={colours.text.items[1]}>{l.values.parts[2]}</tspan>
            </Text>
          </g>
        ) : null,
      )}

      {scene.ring > 0 ? (
        <rect
          x={wheel.ring.x}
          y={wheel.ring.y}
          width={wheel.ring.width}
          height={wheel.ring.height}
          rx={wheel.ring.rx}
          fill="none"
          stroke={colours.marks[0]}
          strokeWidth={strokes.ring}
          opacity={scene.ring}
        />
      ) : null}

      <g transform={`translate(${credit.at.x} ${credit.at.y})`} opacity={scene.source}>
        {credit.lines.map((line, i) => (
          <Text key={`credit${i}`} line={line} register={r.source} fill={colours.text.muted} halo={{ colour: colours.ground, width: credit.halo }} />
        ))}
      </g>

      <g opacity={scene.title}>
        <rect width={frame.width} height={frame.height} fill={colours.ground} />
        <Text line={titleCard.eyebrow} register={r.eyebrow} fill={colours.text.eyebrow} />
        {titleCard.title.map((line, i) => (
          <Text key={`title${i}`} line={line} register={titleCard.register} fill={colours.text.title} />
        ))}
      </g>
    </svg>
  );
}
