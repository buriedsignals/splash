/**
 * One frame of a point / line / field map GESTURE video (Geo F8): the title card, then the static kit's baked plate
 * with the marks' own geometry, standing at the camera box the event's state declares, the marks taking the accent,
 * a ring, a step-back or arriving in their order as the three gestures play — then the credit.
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: geometry, words (measured in Bun), colours and the six event states come from
 * gesture-geo-point-video-build.mjs. Between two events the camera moves LINEARLY and the words wait: a word is drawn
 * only once its event's camera has landed (words exist only at a measured camera).
 */
import type { Ref } from "react";
import { GeoPointMarks, type Geometry } from "./GestureGeoPointMap.tsx";

type Register = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: string;
  letterSpacing: number;
  lead: number;
};
type Line = { text: string; x: number; y: number; width: number };
type Span = { start: number; duration: number };

export type GestureGeoPointFrameProps = {
  frame: { width: number; height: number };
  registers: Record<
    "display" | "eyebrow" | "value" | "axis" | "annot" | "source",
    Register
  >;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  halo: number;
  colours: {
    ground: string;
    water: string;
    accent: string;
    neutral: string;
    ring: string;
    text: Record<"eyebrow" | "title" | "word" | "accent" | "source", string>;
  };
  geometry: Geometry;
  states: Record<string, number>[];
  words: {
    k: number;
    text: string;
    x: number;
    y: number;
    accent: boolean;
    kind: string;
    register: "value" | "axis" | "annot";
    width: number;
  }[];
  timing: Record<string, Span> & { total: number; fps: number };
  [key: string]: unknown;
};

const EVENTS = [
  "establish",
  "reference",
  "reveal",
  "subject",
  "conclusion",
  "hold",
];
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Which event a frame is in (a gap holds the event before it), and how far through it. */
function eventAt(timing: GestureGeoPointFrameProps["timing"], at: number) {
  let e = 0;
  EVENTS.forEach((name, i) => {
    if (at >= timing[name].start) e = i;
  });
  const span = timing[EVENTS[e]];
  return { e, t: clamp01((at - span.start) / Math.max(1, span.duration - 1)) };
}

function Text({
  line,
  register,
  fill,
  opacity = 1,
  halo,
  anchor,
}: {
  line: Line;
  register: Register;
  fill: string;
  opacity?: number;
  halo?: { colour: string; width: number };
  anchor?: "start" | "end";
}) {
  return (
    <text
      x={line.x}
      y={line.y}
      textAnchor={anchor}
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

export function GestureGeoPointFrame(
  props: GestureGeoPointFrameProps & {
    at: number;
    svgRef?: Ref<SVGSVGElement>;
  },
) {
  const { frame: F, registers: r, colours: C, geometry: G, timing: T } = props;
  const { e, t } = eventAt(T, props.at);
  const from = props.states[Math.max(0, e - 1)];
  const to = props.states[e];
  // Arrivals are eased over the event's first 60 %; the camera travels linearly over its first 40 %.
  const u = e === 0 ? 1 : ease(clamp01(t / 0.6));
  const c = e === 0 ? 1 : clamp01(t / 0.4);
  const at = (k: string, w = u) => from[k] + (to[k] - from[k]) * w;
  const box = {
    x: at("vx", c),
    y: at("vy", c),
    w: at("vw", c),
    h: at("vh", c),
  };
  const landed =
    c >= 1 || (from.vx === to.vx && from.vy === to.vy && from.vw === to.vw);
  // The camera box fills the frame: widened (or heightened) to the frame's own aspect around its centre.
  const aspect = F.width / F.height;
  const vb =
    box.w / box.h > aspect
      ? { w: box.w, h: box.w / aspect }
      : { w: box.h * aspect, h: box.h };
  const vx = box.x + box.w / 2 - vb.w / 2;
  const vy = box.y + box.h / 2 - vb.h / 2;
  const toPx = (x: number, y: number) => [
    ((x - vx) / vb.w) * F.width,
    ((y - vy) / vb.h) * F.height,
  ];

  // Roles at this frame: a flag past half-way holds; marks arrive one after another in their order as `h` falls.
  const n = G.marks.length;
  const roles = {
    accent: [] as string[],
    rings: [] as string[],
    back: [] as string[],
    hidden: [] as string[],
    lines: [] as number[],
  };
  G.marks.forEach((m, i) => {
    if (at(`a${i}`) > 0.5) roles.accent.push(m.name);
    if (at(`g${i}`) > 0.5) roles.rings.push(m.name);
    if (at(`b${i}`) > 0.5) roles.back.push(m.name);
    if (at(`h${i}`) > 1 - (i + 0.5) / n) roles.hidden.push(m.name);
  });
  (G.references ?? []).forEach((ref, j) => {
    if (at(`f${j}`) > 0.5) roles.lines.push(ref.value);
  });
  const words = landed ? props.words.filter((w) => to[`w${w.k}`] > 0.5) : [];
  const wordsIn = e === 0 ? 0 : clamp01((t - 0.4) / 0.2) * (landed ? 1 : 0);
  const titleOpacity = e === 0 ? 1 : e === 1 ? 1 - clamp01(t / 0.25) : 0;
  const creditOpacity = e === 4 ? clamp01((t - 0.8) / 0.15) : e === 5 ? 1 : 0;
  const inks = {
    accent: C.accent,
    neutral: C.neutral,
    ring: C.ring,
    ground: C.ground,
    water: C.water,
  };

  return (
    <svg
      ref={props.svgRef}
      xmlns="http://www.w3.org/2000/svg"
      width={F.width}
      height={F.height}
      viewBox={`0 0 ${F.width} ${F.height}`}
    >
      <rect width={F.width} height={F.height} fill={C.water} />
      <svg
        x={0}
        y={0}
        width={F.width}
        height={F.height}
        viewBox={`${vx} ${vy} ${vb.w} ${vb.h}`}
        preserveAspectRatio="none"
      >
        <GeoPointMarks G={G} roles={roles} inks={inks} />
      </svg>
      <g opacity={wordsIn}>
        {words.map((w) => {
          const [x, y] = toPx(w.x, w.y);
          const reg = r[w.register];
          const right = x > F.width * 0.7;
          return (
            <Text
              key={w.k}
              line={{
                text: w.text,
                x: right ? x - 10 : x + 10,
                y: y + reg.fontSize * 0.35,
                width: w.width,
              }}
              anchor={right ? "end" : "start"}
              register={reg}
              fill={w.accent ? C.text.accent : C.text.word}
              halo={{ colour: C.water, width: props.halo }}
            />
          );
        })}
      </g>
      <g
        transform={`translate(${props.credit.at.x} ${props.credit.at.y})`}
        opacity={creditOpacity}
      >
        {props.credit.lines.map((line, i) => (
          <Text
            key={`credit${i}`}
            line={line}
            register={r.source}
            fill={C.text.source}
            halo={{ colour: C.water, width: props.credit.halo }}
          />
        ))}
      </g>
      <g opacity={titleOpacity}>
        <rect width={F.width} height={F.height} fill={C.ground} />
        <Text
          line={props.titleCard.eyebrow}
          register={r.eyebrow}
          fill={C.text.eyebrow}
        />
        {props.titleCard.title.map((line, i) => (
          <Text
            key={`title${i}`}
            line={line}
            register={props.titleCard.register}
            fill={C.text.title}
          />
        ))}
      </g>
    </svg>
  );
}
