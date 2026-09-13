/**
 * « Le bas-carbone européen est au nord-ouest — et en Albanie », told in time (BRIEF.md,
 * « The choreography »): establish, the 94 % reference on the key, the classes revealed lowest
 * first with six of the seven named, the camera closing on the Balkans to print what the overview
 * cannot, the pull back with the 33 below the floor stepped back, and the hold.
 *
 * NOTHING HERE IS MEASURED OR CHOSEN. Every line of the panel is drawn at the coordinates
 * `layout.mjs` measured in Bun, in the register `layout.registers` names for its block; every map
 * word, the ring and the leaders are layers the runner placed in the video's own two cameras
 * (`map.mjs`); every colour comes from the direction through `colours` and `tints`. What this file
 * owns is the ORDER: each gesture interpolates the event's end state (`states.mjs`) from the one
 * before it, and the sub-event gating BRIEF.md names — a name only once its class has its fill,
 * the neighbours' values only once the camera has settled, the sentence only after the pull back —
 * is the windows below, each a share of its own event in the timing contract.
 *
 * THE MAP NEVER MOVES BY ITSELF. `useLiveMap` mounts the plan once; `paint` sets the class fills,
 * the opacities, the subject word's offset and the camera (`jumpTo`) for exactly this frame, and the
 * frame waits for the map's `idle`.
 */

import type { RefObject } from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import type maplibregl from "maplibre-gl";
import {
  EVENT_ORDER,
  progressOf,
  type BeatTiming,
  type EventName,
} from "#shared/chart-video/timing.ts";
import { mountPlan } from "#shared/map-beat/mount.mjs";
import { transformStyle } from "#shared/map-beat/style.mjs";
import { useEmbeddedFaces } from "../../skills/map-beat/assets/embedded-faces";
import type { EmbeddedFace } from "../../skills/map-beat/assets/face-coverage";
import {
  useLiveMap,
  type LiveMapPlan,
  type MountPlan,
  type TransformStyle,
} from "../../skills/map-beat/assets/live-map";

type Register = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: string;
  letterSpacing: number;
  lead: number;
  fill: string;
};
type Line = { text: string; x: number; y: number; width: number };
type Rect = { x: number; y: number; width: number; height: number };
type Block = {
  id: string;
  register: string;
  lines: Line[];
  box: Rect;
  swatches?: Array<Rect & { class: number }>;
  missingSwatch?: Rect;
};
type State = Record<string, number>;

export type DirectedChoroplethVideoProps = {
  layout: {
    blocks: Block[];
    mapBox: Rect;
    drawn: { width: number; height: number };
  };
  registers: Record<string, Register>;
  faces: EmbeddedFace[];
  plan: LiveMapPlan & {
    layers: Array<{
      id: string;
      data: { features: Array<{ properties: Record<string, unknown> }> };
    }>;
  };
  styleUrl: string;
  tints: { water: string; land: string };
  /** One end state per event, in `EVENT_ORDER`. */
  states: State[];
  timing: BeatTiming;
  colours: {
    ground: string;
    accentInk: string;
    classFills: string[];
    classBreaks: number[];
    missingFill: string;
    landNoValue: string;
    /** The width of the accent outline the reference draws round the top class of the key. */
    referenceStroke: number;
  };
};

// ── the gating inside each event, as shares of that event (BRIEF.md) ───────────────────────────

type Window = [number, number];
const WINDOWS: Partial<Record<EventName, Record<string, Window>>> = {
  // Six classes, lowest first, then — once the top class has its fill — its six names.
  reveal: { classesRevealed: [0, 0.72], namesShown: [0.78, 0.96] },
  // The camera travels, settles; then the ring, the subject's word, the neighbours' values.
  subject: {
    camera: [0, 0.42],
    ring: [0.46, 0.6],
    namesShown: [0.52, 0.66],
    neighbourValues: [0.68, 0.84],
  },
  // The neighbours leave with the zoom, the camera pulls back, the 33 step back, the sentence lands.
  conclusion: {
    neighbourValues: [0, 0.12],
    camera: [0.06, 0.52],
    filterBelowFloor: [0.56, 0.74],
    conclusion: [0.76, 0.96],
  },
};
const CAMERA_FIELDS = ["zoom", "centerLon", "centerLat"];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const arrive = Easing.out(Easing.cubic);
const travel = Easing.inOut(Easing.cubic);

function windowed(
  frame: number,
  timing: BeatTiming,
  event: EventName,
  field: string,
) {
  const [a, b] = WINDOWS[event]?.[field] ?? [0, 1];
  return clamp01((progressOf(frame, timing[event]) - a) / (b - a));
}

/** A field's value at `frame`: the first event's state, plus every later event's change, each run
 *  through its own window. The class reveal is linear across the six classes — each class eases its
 *  own arrival (`classShare`) — and everything else eases in. The key's furniture is the one field
 *  the establish event itself fades in. */
function fieldAt(
  field: string,
  frame: number,
  states: State[],
  timing: BeatTiming,
) {
  let value = field === "furniture" ? 0 : states[0][field];
  EVENT_ORDER.forEach((event, i) => {
    const before =
      i === 0
        ? field === "furniture"
          ? 0
          : states[0][field]
        : states[i - 1][field];
    const delta = states[i][field] - before;
    if (delta === 0) return;
    const t = windowed(frame, timing, event, field);
    value += delta * (field === "classesRevealed" ? t : arrive(t));
  });
  return value;
}

const worldX = (lon: number) => (lon + 180) / 360;
const worldY = (lat: number) =>
  (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2;
const lonOf = (x: number) => x * 360 - 180;
const latOf = (y: number) =>
  (360 / Math.PI) * Math.atan(Math.exp((1 - 2 * y) * Math.PI)) - 90;

/** The camera between two states, zoomed about the one point that sits at the same pixel in both —
 *  a closing-in that keeps the Balkans where the eye already is, not a pan and a zoom run side by
 *  side. The zoom level is interpolated linearly, so each doubling takes the same time. */
function cameraBetween(from: State, to: State, t: number): State {
  if (t <= 0) return from;
  if (t >= 1) return to;
  if (from.zoom === to.zoom)
    return Object.fromEntries(
      CAMERA_FIELDS.map((k) => [k, from[k] + (to[k] - from[k]) * t]),
    );
  const s0 = 2 ** from.zoom;
  const s1 = 2 ** to.zoom;
  const zoom = from.zoom + (to.zoom - from.zoom) * t;
  const s = 2 ** zoom;
  const c0 = [worldX(from.centerLon), worldY(from.centerLat)];
  const c1 = [worldX(to.centerLon), worldY(to.centerLat)];
  const fixed = c0.map((c, k) => (c * s0 - c1[k] * s1) / (s0 - s1));
  const c = fixed.map((p, k) => p + ((c0[k] - p) * s0) / s);
  return { zoom, centerLon: lonOf(c[0]), centerLat: latOf(c[1]) };
}

function cameraAt(frame: number, states: State[], timing: BeatTiming): State {
  let camera = states[0];
  for (let i = 1; i < EVENT_ORDER.length; i++) {
    const from = states[i - 1];
    const to = states[i];
    if (CAMERA_FIELDS.every((k) => from[k] === to[k])) continue;
    const t = travel(windowed(frame, timing, EVENT_ORDER[i], "camera"));
    camera = cameraBetween(from, to, t);
    if (t < 1) break;
  }
  return camera;
}

/** `ground` carried `share` of the way to `toward`, channel by channel — the same blend as the
 *  trunk's `mix`, which a browser bundle cannot import (its module reads the file system). */
function blend(ground: string, toward: string, share: number) {
  const channel = (hex: string, i: number) =>
    parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);
  return (
    "#" +
    [0, 1, 2]
      .map((i) =>
        Math.round(
          channel(ground, i) +
            (channel(toward, i) - channel(ground, i)) * share,
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

// ── the panel ────────────────────────────────────────────────────────────────────────────────

function Text({
  line,
  register,
  fill,
  opacity,
}: {
  line: Line;
  register: Register;
  fill: string;
  opacity: number;
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
      data-width={line.width}
    >
      {line.text}
    </text>
  );
}

function Panel({
  svgRef,
  layout,
  registers,
  colours,
  frame,
  states,
  timing,
}: DirectedChoroplethVideoProps & {
  svgRef: RefObject<SVGSVGElement | null>;
  frame: number;
}) {
  const at = (field: string) => fieldAt(field, frame, states, timing);
  const furniture = at("furniture");
  const reference = at("referenceMark");
  const conclusion = at("conclusion");
  const block = (id: string) => layout.blocks.find((b) => b.id === id)!;
  const drawBlock = (id: string, opacity: number, fill?: string) => {
    const b = block(id);
    const r = registers[b.register];
    return b.lines.map((line, i) => (
      <Text
        key={`${id}-${i}`}
        line={line}
        register={r}
        fill={fill ?? r.fill}
        opacity={opacity}
      />
    ));
  };
  const key = block("key");
  const keyRegister = registers[key.register];
  const breaks = colours.classBreaks.length;
  const topSwatch = key.swatches![key.swatches!.length - 1];
  const topBreak = key.lines[breaks - 1];

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      style={{ position: "absolute", inset: 0 }}
    >
      {/* Furniture: up from frame 0, and never moving again. */}
      {drawBlock("eyebrow", 1)}
      {drawBlock("title", 1)}
      {drawBlock("source", 1)}
      {drawBlock("keyLabel", furniture)}
      <g opacity={furniture}>
        {key.swatches!.map((s) => (
          <rect
            key={s.class}
            x={s.x}
            y={s.y}
            width={s.width}
            height={s.height}
            fill={colours.classFills[s.class]}
          />
        ))}
        <rect
          x={key.missingSwatch!.x}
          y={key.missingSwatch!.y}
          width={key.missingSwatch!.width}
          height={key.missingSwatch!.height}
          fill={colours.missingFill}
        />
      </g>
      {key.lines.map((line, i) =>
        i === breaks - 1 ? null : (
          <Text
            key={`key-${i}`}
            line={line}
            register={keyRegister}
            fill={keyRegister.fill}
            opacity={furniture}
          />
        ),
      )}
      {/* The reference: the top class and its borne take the accent, « plus de 94 % » beside it. */}
      <Text
        line={topBreak}
        register={keyRegister}
        fill={keyRegister.fill}
        opacity={furniture * (1 - reference)}
      />
      <Text
        line={topBreak}
        register={keyRegister}
        fill={colours.accentInk}
        opacity={reference}
      />
      <rect
        x={topSwatch.x}
        y={topSwatch.y}
        width={topSwatch.width}
        height={topSwatch.height}
        fill="none"
        stroke={colours.accentInk}
        strokeWidth={colours.referenceStroke}
        opacity={reference}
      />
      {drawBlock("reference", reference, colours.accentInk)}
      {/* The conclusion: only once the pull back has settled and the filter has landed. */}
      {drawBlock("conclusion", conclusion)}
    </svg>
  );
}

// ── the composition ──────────────────────────────────────────────────────────────────────────

export function DirectedChoroplethVideo(props: DirectedChoroplethVideoProps) {
  const { layout, plan, styleUrl, tints, states, timing, colours } = props;
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);

  const overviewZoom = states[0].zoom;
  const closestZoom = Math.max(...states.map((s) => s.zoom));
  const revealNames = states[EVENT_ORDER.indexOf("reveal")].namesShown;
  const subjectWord = plan.layers.find((l) => l.id === "subject-name")!.data
    .features[0].properties;
  /** `[closing, dx, dy]` from the zoom (closing 1) to the overview (0), each step checked in Bun. */
  const offsets = [...(subjectWord.offsets as number[][])].sort(
    (a, b) => a[0] - b[0],
  );
  const offsetAt = (closing: number) => {
    const i = Math.max(
      1,
      offsets.findIndex((o) => o[0] >= closing),
    );
    const [c0, x0, y0] = offsets[i - 1];
    const [c1, x1, y1] = offsets[Math.min(i, offsets.length - 1)];
    const t = c1 === c0 ? 0 : clamp01((closing - c0) / (c1 - c0));
    return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
  };

  const paint = (map: maplibregl.Map, now: number) => {
    const at = (field: string) => fieldAt(field, now, states, timing);
    const revealed = at("classesRevealed");
    const filter = at("filterBelowFloor");
    const names = at("namesShown");
    const neighbours = at("neighbourValues");
    const top = colours.classFills.length - 1;

    const classShare = (i: number) => arrive(clamp01(revealed - i));
    const fill = (i: number) =>
      blend(
        colours.landNoValue,
        colours.classFills[i],
        classShare(i) * (i < top ? 1 - filter : 1),
      );
    map.setPaintProperty("classes", "fill-color", [
      "case",
      ["!=", ["get", "value"], null],
      [
        "step",
        ["get", "value"],
        fill(0),
        ...colours.classBreaks.flatMap((b, i) => [b, fill(i + 1)]),
      ],
      ["get", "inStudySet"],
      blend(colours.landNoValue, colours.missingFill, classShare(0)),
      colours.landNoValue,
    ]);

    // The reveal names every name but the subject's; the subject's word is the one `subject` adds.
    const namesOpacity = clamp01(names / revealNames);
    const subjectOpacity = clamp01(names - revealNames);
    map.setPaintProperty("reveal-names", "text-opacity", namesOpacity);
    map.setPaintProperty("neighbour-values", "text-opacity", neighbours);
    map.setPaintProperty("subject-name", "text-opacity", subjectOpacity);
    map.setPaintProperty("subject-ring", "line-opacity", at("ring"));
    map.setPaintProperty("leaders", "line-opacity", [
      "match",
      ["get", "group"],
      "names",
      namesOpacity,
      "neighbours",
      neighbours,
      0,
    ]);

    const camera = cameraAt(now, states, timing);
    // The subject's word follows the path Bun checked step by step, keyed on the map's scale (2^zoom)
    // — the quantity a shape's pixel size is linear in — so it stays beside the ring through the move.
    const closing = clamp01(
      (2 ** camera.zoom - 2 ** overviewZoom) /
        (2 ** closestZoom - 2 ** overviewZoom),
    );
    map.setLayoutProperty("subject-name", "text-offset", offsetAt(closing));
    map.jumpTo({
      center: [camera.centerLon, camera.centerLat],
      zoom: camera.zoom,
    });
  };

  const container = useLiveMap({
    plan,
    styleUrl,
    tints,
    frame,
    paint,
    mount: mountPlan as unknown as MountPlan,
    transform: transformStyle as unknown as TransformStyle,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colours.ground }}>
      <div
        ref={container}
        style={{
          position: "absolute",
          left: layout.mapBox.x,
          top: layout.mapBox.y,
          width: layout.drawn.width,
          height: layout.drawn.height,
        }}
      />
      {/* The gate: the panel is not drawn before its faces are in, and no hook sits behind it. */}
      {ready ? <Panel {...props} svgRef={ref} frame={frame} /> : null}
    </AbsoluteFill>
  );
}
