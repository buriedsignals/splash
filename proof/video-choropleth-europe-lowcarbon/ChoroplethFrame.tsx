/**
 * One frame of « Sept pays européens dépassent 94 % d'électricité bas-carbone » — a video in SHOTS, not a page: the
 * title card, then the story on the whole frame, the live map under an SVG overlay (BRIEF.md, `layout.mjs`).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN. The map is the caller's (`liveMap`: MapLibre in the composition, nothing in
 * Bun). Every word is drawn at the coordinates `layout.mjs` measured in Bun, in the register its slot names, and
 * carries that width (`data-width`) for the width agreement; every label sits where `build.mjs` placed it on the
 * measured map, the panel and the credit on its measured sea; every colour and stroke comes from the direction
 * through `colours` and `strokes`; what moves at this frame is `sceneAt`.
 *
 * A pure component of its props and `frame`, so Bun can render the same markup and hold it to the type floor;
 * `DirectedChoroplethVideo.tsx` gives it the Remotion frame, the embedded faces and the live map.
 */

import type { ReactNode, Ref } from "react";
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
  | "source";

export type ChoroplethFrameProps = {
  frame: { width: number; height: number };
  stage: Rect;
  /** The ground band under the map — the square frame's own composition (`layout.mjs`, `bandFor`); `null` elsewhere. */
  band: Rect | null;
  registers: Record<Slot, Register>;
  titleCard: {
    register: Register;
    eyebrow: Line;
    title: Line[];
  };
  source: {
    at: { x: number; y: number };
    width: number;
    height: number;
    halo: number;
    lines: Line[];
  };
  panel: {
    at: { x: number; y: number };
    width: number;
    height: number;
    /** The halo the key's words and the count stand in, on the sea: no plate. */
    halo: number;
    valueHalo: number;
    counter: Line[];
    swatches: Rect[];
    bornes: Line[];
    missingSwatch: Rect;
    missingLabel: Line;
  };
  colours: {
    ground: string;
    /** The sea as the map measured it: the ground under the panel's and the credit's halos. */
    sea: string;
    /** The ground band's fill, and the ground its blocks are read against — `null` where there is no band. */
    band: string | null;
    classFills: string[];
    missingFill: string;
    ring: string;
    text: Record<"eyebrow" | "title" | "counter" | "key" | "source", string>;
  };
  strokes: { border: number; ring: number };
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
    /** The halo's stroke width, the ink measured against every cell the word inks, and the colour the map measured
     *  under the word's centre, which the halo is struck in. */
    halo: number;
    ink: string;
    haloColour: string;
    leader: {
      from: { x: number; y: number };
      to: { x: number; y: number };
      dot: number;
    } | null;
    x: number;
    y: number;
    /** The word's lines at the pill's own origin: one, or a place over its share at a narrow frame. */
    lines: Array<{ text: string; x: number; y: number; width: number }>;
    /** A close-up share's gauge, inside the pill: 0–100 % over its width, the floor notched at `notch`. */
    gauge: {
      x: number;
      y: number;
      width: number;
      height: number;
      share: number;
      notch: number;
    } | null;
  }>;
  cameras: { whole: Record<string, number>; closeUp: Record<string, number> };
  mapPlan: unknown;
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
  props: ChoroplethFrameProps & {
    at: number;
    svgRef?: Ref<SVGSVGElement>;
    /** The live map at this frame, drawn under the overlay — `() => null` where there is no MapLibre (Bun). */
    liveMap: (frame: number) => ReactNode;
  },
) {
  const {
    frame,
    stage,
    registers: r,
    colours,
    strokes,
    panel,
    titleCard,
    band,
  } = props;
  /** What the key and the credit stand on: the band's ground where the frame stacks one, the measured sea otherwise. */
  const furnitureGround = colours.band ?? colours.sea;
  const scene = sceneAt(props as never, props.at);
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
    <div
      style={{
        position: "relative",
        width: frame.width,
        height: frame.height,
        background: colours.sea,
      }}
    >
      {props.liveMap(props.at)}
      <svg
        ref={props.svgRef}
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: "absolute", inset: 0 }}
        width={frame.width}
        height={frame.height}
        viewBox={`0 0 ${frame.width} ${frame.height}`}
      >
        {/* ── THE GROUND BAND: the square frame's foot, the key and the credit on the direction's own ground rather
            than on the map's water. It is drawn over the live map because the map is mounted on the WHOLE frame and
            measured there; the camera is fitted and raised into the band above it (`map-plan.mjs`, `camerasOf`), so
            the ground this covers is the ground that fit left over, not a slice taken off Europe. ── */}
        {band ? (
          <rect
            x={band.x}
            y={band.y}
            width={band.width}
            height={band.height}
            fill={colours.band ?? colours.ground}
          />
        ) : null}

        {/* ── THE LABELS: Albania beside its ring on the whole map, the close-up's names — each where the measured map put it. ── */}
        {props.names.map((n) =>
          n.leader ? (
            <g key={`leader-${n.key}`} opacity={scene.names[n.key]}>
              {/* The leader is struck on its word's halo, so a dark ink still reads where it crosses a dark country. */}
              <line
                x1={stage.x + n.leader.from.x}
                y1={stage.y + n.leader.from.y}
                x2={stage.x + n.leader.to.x}
                y2={stage.y + n.leader.to.y}
                stroke={n.haloColour}
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
                  stroke={n.haloColour}
                  strokeWidth={strokes.border}
                />
              ) : null}
            </g>
          ) : null,
        )}
        {props.names.flatMap((n) =>
          /* A NAME IS A STACK OF LINES — one at 16:9, where the place and its share stand side by side, two where a
             narrow frame makes the same words too wide for the map (`build.mjs`, `closeLines`). */
          n.lines.map((l, i) => {
            const shown = counted({ role: n.role, text: l.text });
            return (
              <Word
                key={`${n.key}-${i}`}
                line={{
                  text: shown.text,
                  x: stage.x + n.x + l.x,
                  y: stage.y + n.y + l.y,
                  width: l.width,
                }}
                register={r[n.register]}
                fill={n.ink}
                opacity={scene.names[n.key]}
                measured={shown.final}
                halo={{ colour: n.haloColour, width: n.halo }}
              />
            );
          }),
        )}

        {/* ── THE GAUGES: every measured share at the close-up on one scale, the floor notched, filling as it counts. ── */}
        {props.names.map((n) => {
          if (!n.gauge) return null;
          const g = n.gauge;
          const x = stage.x + n.x + g.x;
          const y = stage.y + n.y + g.y;
          const fill = scene.gauges[n.key] ?? 0;
          return (
            <g key={`gauge-${n.key}`} opacity={scene.names[n.key]}>
              <rect
                x={x}
                y={y}
                width={g.width}
                height={g.height}
                fill="none"
                stroke={n.haloColour}
                strokeWidth={n.halo}
                strokeLinejoin="round"
              />
              <rect
                x={x}
                y={y}
                width={g.width}
                height={g.height}
                fill="none"
                stroke={n.ink}
                strokeWidth={strokes.border}
              />
              <rect
                x={x}
                y={y}
                width={g.width * fill}
                height={g.height}
                fill={n.ink}
              />
              <line
                x1={x + g.width * g.notch}
                x2={x + g.width * g.notch}
                y1={y - g.height * 0.6}
                y2={y + g.height * 1.6}
                stroke={n.haloColour}
                strokeWidth={3 * strokes.ring}
              />
              <line
                x1={x + g.width * g.notch}
                x2={x + g.width * g.notch}
                y1={y - g.height * 0.6}
                y2={y + g.height * 1.6}
                stroke={colours.ring}
                strokeWidth={strokes.ring}
              />
            </g>
          );
        })}

        {/* ── THE PANEL: the count over the key, seated where it covers the least land, with its gestures. ── */}
        <g
          transform={`translate(${panel.at.x} ${panel.at.y})`}
          opacity={scene.furniture}
        >
          <Word
            line={counter}
            register={r.value}
            fill={colours.text.counter}
            opacity={scene.counter.opacity}
            halo={{ colour: furnitureGround, width: panel.valueHalo }}
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
              halo={{ colour: furnitureGround, width: panel.halo }}
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
            halo={{ colour: furnitureGround, width: panel.halo }}
          />
        </g>

        {/* ── THE TITLE CARD: before the story, alone on the ground. ── */}
        <g opacity={scene.title}>
          <rect
            width={frame.width}
            height={frame.height}
            fill={colours.ground}
          />
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
        </g>

        {/* ── NO END CARD: the video ends on the map; the source is set small on its sea. ── */}
        <g
          transform={`translate(${props.source.at.x} ${props.source.at.y})`}
          opacity={scene.source}
        >
          {props.source.lines.map((line, i) => (
            <Word
              key={`source${i}`}
              line={line}
              register={r.source}
              fill={colours.text.source}
              opacity={1}
              halo={{ colour: furnitureGround, width: props.source.halo }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
