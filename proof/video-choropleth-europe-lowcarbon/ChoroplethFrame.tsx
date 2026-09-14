/**
 * One frame of « Sept pays européens dépassent 94 % d'électricité bas-carbone » — a video in SHOTS, not a
 * page: the title card, then the story on the whole frame with its panel, then the end card (BRIEF.md,
 * `layout.mjs`).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN. Every word is drawn at the coordinates `layout.mjs` measured in Bun,
 * in the register its slot names, and carries that width (`data-width`) for the width agreement; every pill
 * sits where `build.mjs` placed it for its camera, the panel where it covers the least land; every colour and
 * stroke comes from the direction through `colours` and `strokes`; what moves at this frame is `sceneAt`.
 *
 * A pure component of its props and `frame`, so Bun can render the same markup and hold it to the type
 * floor; `DirectedChoroplethVideo.tsx` gives it the Remotion frame and the embedded faces.
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
type Rect = { x: number; y: number; width: number; height: number };
type Box = { x: number; y: number; w: number; h: number };
type Slot =
  | "eyebrow"
  | "display"
  | "body"
  | "value"
  | "axis"
  | "annot"
  | "area"
  | "feature"
  | "closeFeature"
  | "water";

export type ChoroplethFrameProps = {
  frame: { width: number; height: number };
  stage: Rect;
  registers: Record<Slot, Register>;
  titleCard: {
    register: Register;
    eyebrow: Line;
    title: Line[];
    standfirst: Line[];
  };
  endCard: { register: Register; claim: Line[]; source: Line };
  panel: {
    at: { x: number; y: number };
    width: number;
    height: number;
    counter: Line[];
    swatches: Rect[];
    bornes: Line[];
    unit: Line;
    missingSwatch: Rect;
    missingLabel: Line;
  };
  colours: {
    ground: string;
    sea: string;
    land: string;
    border: string;
    classFills: string[];
    missingFill: string;
    ring: string;
    text: Record<
      | "eyebrow"
      | "title"
      | "standfirst"
      | "counter"
      | "key"
      | "source"
      | "water",
      string
    >;
  };
  strokes: { border: number; ring: number };
  seaBox: Box;
  shapes: Array<{
    key: string;
    path: string;
    studied: boolean;
    classIndex: number | null;
    kept: boolean;
    fill: string;
  }>;
  ring: { cx: number; cy: number; r: number };
  names: Array<{
    key: string;
    role: string;
    camera: "overview" | "closeUp";
    register: Slot;
    text: string;
    textWidth: number;
    width: number;
    height: number;
    textX: number;
    baseline: number;
    /** The halo's stroke width, the ink measured against every cell the word is seen on, and the country
     *  under its centre (`null`: the sea) whose colour the halo is struck in, frame by frame. */
    halo: number;
    ink: string;
    onKey: string | null;
    leader: {
      from: { x: number; y: number };
      to: { x: number; y: number };
      dot: number;
    } | null;
    x: number;
    y: number;
  }>;
  waters: Array<{
    key: string;
    text: string;
    width: number;
    x: number;
    y: number;
  }>;
  halos: { water: number };
  callout: {
    at: { x: number; y: number };
    width: number;
    height: number;
    halo: number;
    ink: string;
    lines: Line[];
  };
  cameras: { overview: Box; closeUp: Box };
  states: Record<string, number>[];
  timing: unknown;
};

/** A class the floor has passed keeps a trace of itself in the key, not its full ink. */
const STEPPED_BACK_FADE = 0.7;

function Word({
  line,
  register,
  fill,
  opacity,
  anchor,
  measured = true,
  halo,
}: {
  line: Line;
  register: Register;
  fill: string;
  opacity: number;
  anchor?: "start" | "middle" | "end";
  /** false while a number is still counting: the width Bun measured is the final text's. */
  measured?: boolean;
  /** A map word's halo: struck in the colour under it, behind the letters. */
  halo?: { colour: string; width: number };
}) {
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

export function ChoroplethFrame(
  props: ChoroplethFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const {
    frame,
    stage,
    registers: r,
    colours,
    strokes,
    panel,
    titleCard,
    endCard,
  } = props;
  const scene = sceneAt(props as never, props.at);
  const shapeFill = Object.fromEntries(props.shapes.map((s) => [s.key, s.fill]));
  /** The colour under a map word at this frame — the halo follows the cell as the floor moves. */
  const cellUnder = (key: string | null) =>
    key === null ? colours.sea : (scene.fills[key] ?? shapeFill[key]);
  const vb = scene.viewBox;
  const counter = panel.counter[scene.counter.step];
  // The floor's cursor, on the key: between the left edges of the swatches either side of its position.
  const at = Math.min(scene.cursor.at, panel.swatches.length - 1);
  const lower = panel.swatches[Math.floor(at)];
  const upper =
    panel.swatches[Math.min(Math.floor(at) + 1, panel.swatches.length - 1)];
  const cursorX = lower.x + (upper.x - lower.x) * (at - Math.floor(at));
  /** A share counting up from zero to the value its name states. */
  const counted = (n: { role: string; text: string }) => {
    const t = (scene.countUp as Record<string, number>)[n.role];
    const match = /(\d+)(\s*%)$/.exec(n.text);
    // Before its window the name is not shown yet, and after it the value stands: both draw the final text.
    if (t === undefined || !match || t <= 0 || t >= 1)
      return { text: n.text, final: true };
    return {
      text:
        n.text.slice(0, match.index) +
        String(Math.round(Number(match[1]) * t)) +
        match[2],
      final: false,
    };
  };

  return (
    <svg
      ref={props.svgRef}
      xmlns="http://www.w3.org/2000/svg"
      width={frame.width}
      height={frame.height}
      viewBox={`0 0 ${frame.width} ${frame.height}`}
    >
      <rect width={frame.width} height={frame.height} fill={colours.ground} />

      {/* ── THE STORY: the map on the whole frame; the viewBox is the camera. ── */}
      <svg
        x={stage.x}
        y={stage.y}
        width={stage.width}
        height={stage.height}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        preserveAspectRatio="none"
      >
        <rect
          x={props.seaBox.x}
          y={props.seaBox.y}
          width={props.seaBox.w}
          height={props.seaBox.h}
          fill={colours.sea}
        />
        {props.shapes.map((s) => (
          <path
            key={s.key}
            d={s.path}
            fill={scene.fills[s.key] ?? s.fill}
            stroke={s.studied ? colours.border : colours.ground}
            strokeWidth={strokes.border}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <circle
          cx={props.ring.cx}
          cy={props.ring.cy}
          r={props.ring.r}
          fill="none"
          stroke={colours.ring}
          strokeWidth={strokes.ring}
          vectorEffect="non-scaling-stroke"
          opacity={scene.ring}
        />
      </svg>

      {props.waters.map((w) => (
        <Word
          key={w.key}
          line={{
            text: w.text,
            x: stage.x + w.x,
            y: stage.y + w.y,
            width: w.width,
          }}
          register={r.water}
          fill={colours.text.water}
          opacity={scene.waters}
          halo={{ colour: colours.sea, width: props.halos.water }}
        />
      ))}
      {props.names.map((n) =>
        n.leader ? (
          <g key={`leader-${n.key}`} opacity={scene.names[n.key]}>
            {/* The leader is struck on its word's halo, so a dark ink still reads where it crosses a dark country. */}
            <line
              x1={stage.x + n.leader.from.x}
              y1={stage.y + n.leader.from.y}
              x2={stage.x + n.leader.to.x}
              y2={stage.y + n.leader.to.y}
              stroke={cellUnder(n.onKey)}
              strokeWidth={3 * strokes.border}
              strokeLinecap="round"
            />
            <line
              x1={stage.x + n.leader.from.x}
              y1={stage.y + n.leader.from.y}
              x2={stage.x + n.leader.to.x}
              y2={stage.y + n.leader.to.y}
              stroke={n.ink}
              strokeWidth={strokes.border}
            />
            {n.leader.dot > 0 ? (
              <circle
                cx={stage.x + n.leader.from.x}
                cy={stage.y + n.leader.from.y}
                r={n.leader.dot}
                fill={n.ink}
                stroke={cellUnder(n.onKey)}
                strokeWidth={strokes.border}
              />
            ) : null}
          </g>
        ) : null,
      )}
      {props.names.map((n) => {
        const shown = counted(n);
        return (
          <Word
            key={n.key}
            line={{
              text: shown.text,
              x: stage.x + n.x + n.textX,
              y: stage.y + n.y + n.baseline,
              width: n.textWidth,
            }}
            register={r[n.register]}
            fill={n.ink}
            opacity={scene.names[n.key]}
            measured={shown.final}
            halo={{ colour: cellUnder(n.onKey), width: n.halo }}
          />
        );
      })}

      {/* ── THE CALLOUT: the still's sentence, over the close-up's sea. ── */}
      <g
        transform={`translate(${props.callout.at.x} ${props.callout.at.y})`}
        opacity={scene.callout}
      >
        {props.callout.lines.map((line, i) => (
          <Word
            key={`callout${i}`}
            line={line}
            register={r.annot}
            fill={props.callout.ink}
            opacity={1}
            halo={{ colour: colours.sea, width: props.callout.halo }}
          />
        ))}
      </g>

      {/* ── THE PANEL: the count over the key, seated where it covers the least land, with its gestures. ── */}
      <g
        transform={`translate(${panel.at.x} ${panel.at.y})`}
        opacity={scene.furniture}
      >
        <rect width={panel.width} height={panel.height} fill={colours.ground} />
        <Word
          line={counter}
          register={r.value}
          fill={colours.text.counter}
          opacity={scene.counter.opacity}
        />
        {panel.swatches.map((s, i) => (
          <rect
            key={`swatch${i}`}
            x={s.x}
            y={s.y}
            width={s.width}
            height={s.height}
            fill={colours.classFills[i]}
            opacity={
              scene.swatches[i] *
              (1 - STEPPED_BACK_FADE * scene.swatchesBack[i])
            }
          />
        ))}
        {panel.bornes.map((line, i) => (
          <Word
            key={`borne${i}`}
            line={line}
            register={r.axis}
            fill={colours.text.key}
            opacity={scene.swatches[i]}
          />
        ))}
        <rect
          x={cursorX - 1.5 * strokes.ring}
          y={panel.swatches[0].y - panel.swatches[0].height / 2}
          width={3 * strokes.ring}
          height={2 * panel.swatches[0].height}
          fill={colours.text.counter}
          opacity={scene.cursor.opacity}
        />
        <Word
          line={panel.unit}
          register={r.axis}
          fill={colours.text.key}
          opacity={1}
        />
        <rect
          x={panel.missingSwatch.x}
          y={panel.missingSwatch.y}
          width={panel.missingSwatch.width}
          height={panel.missingSwatch.height}
          fill={colours.missingFill}
        />
        <Word
          line={panel.missingLabel}
          register={r.axis}
          fill={colours.text.key}
          opacity={1}
        />
      </g>

      {/* ── THE TITLE CARD: before the story, alone on the ground. ── */}
      <g opacity={scene.title}>
        <rect width={frame.width} height={frame.height} fill={colours.ground} />
        <Word
          line={titleCard.eyebrow}
          register={r.eyebrow}
          fill={colours.text.eyebrow}
          opacity={1}
        />
        {titleCard.title.map((line, i) => (
          <Word
            key={`title${i}`}
            line={line}
            register={titleCard.register}
            fill={colours.text.title}
            opacity={1}
          />
        ))}
        {titleCard.standfirst.map((line, i) => (
          <Word
            key={`standfirst${i}`}
            line={line}
            register={r.body}
            fill={colours.text.standfirst}
            opacity={1}
          />
        ))}
      </g>

      {/* ── THE END CARD: the claim, once its evidence has been shown, and the source. ── */}
      <g opacity={scene.end}>
        <rect width={frame.width} height={frame.height} fill={colours.ground} />
        {endCard.claim.map((line, i) => (
          <Word
            key={`claim${i}`}
            line={line}
            register={endCard.register}
            fill={colours.text.title}
            opacity={1}
          />
        ))}
        <Word
          line={endCard.source}
          register={r.axis}
          fill={colours.text.source}
          opacity={1}
        />
      </g>
    </svg>
  );
}
