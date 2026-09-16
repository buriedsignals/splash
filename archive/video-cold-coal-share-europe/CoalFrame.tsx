/**
 * One frame of the coal video — the title card, then the live map on the whole frame under an SVG overlay: the panel
 * (the year and the count over the key, the half marked), the close-up's words and gauges, Poland's word on the whole
 * map, the credit. Nothing here is measured or chosen: every coordinate is `build.mjs`'s, what moves is `sceneAt`'s.
 * A pure component of its props and `at`, so Bun renders the same markup and holds it to the type floor.
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

export type CoalFrameProps = {
  frame: { width: number; height: number };
  stage: Rect;
  registers: Record<
    "display" | "eyebrow" | "value" | "axis" | "area" | "feature" | "source",
    Register
  >;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  source: { at: { x: number; y: number }; halo: number; lines: Line[] };
  panel: {
    at: { x: number; y: number };
    halo: number;
    valueHalo: number;
    counters: Line[][];
    swatches: Rect[];
    bornes: Line[];
    missingSwatch: Rect;
    missingLabel: Line;
    cursorBorne: number;
  };
  colours: {
    ground: string;
    sea: string;
    land: string;
    classFills: string[];
    accent: string;
    text: Record<"eyebrow" | "title" | "counter" | "key" | "source", string>;
  };
  strokes: { border: number; rule: number };
  names: Array<{
    key: string;
    role: string;
    camera: "overview" | "closeUp";
    register: "area" | "feature";
    text: string;
    from: number;
    to: number;
    series: number[];
    textWidth: number;
    textX: number;
    baseline: number;
    halo: number;
    ink: string;
    x: number;
    y: number;
    leader: {
      from: { x: number; y: number };
      to: { x: number; y: number };
      dot: number;
    } | null;
    gauge: {
      x: number;
      y: number;
      width: number;
      height: number;
      from: number;
      to: number;
      notch: number;
    } | null;
  }>;
  yearCount: number;
  cameras: unknown;
  mapPlan: unknown;
  states: Record<string, number>[];
  timing: unknown;
};

function Word({
  line,
  register,
  fill,
  opacity = 1,
  measured = true,
  halo,
}: {
  line: Line;
  register: Register;
  fill: string;
  opacity?: number;
  measured?: boolean;
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
      data-width={measured ? line.width : undefined}
    >
      {line.text}
    </text>
  );
}

export function CoalFrame(
  props: CoalFrameProps & {
    at: number;
    svgRef?: Ref<SVGSVGElement>;
    liveMap: (frame: number) => ReactNode;
  },
) {
  const { frame, registers: r, colours, strokes, panel, titleCard } = props;
  const scene = sceneAt(props as never, props.at);
  const ground = { colour: colours.ground, width: 0 };
  const cursor = panel.swatches[panel.cursorBorne + 1];
  const shareAt = (n: CoalFrameProps["names"][number]) => {
    const t =
      n.camera === "closeUp"
        ? scene.replay
        : 1;
    // The reading of the year the map is showing, between two years as the fills crossfade.
    const at = t * (n.series.length - 1);
    const i = Math.min(n.series.length - 2, Math.floor(at));
    const value = n.series[i] + (n.series[i + 1] - n.series[i]) * (at - i);
    return { value, final: t >= 1 };
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
        {props.names.map((n) => {
          const o = scene.names[n.key];
          const share = shareAt(n);
          const text = share.final
            ? n.text
            : n.text.replace(
                /\d+(\s*%)$/,
                (_, unit) => `${Math.round(share.value)}${unit}`,
              );
          const halo = { ...ground, width: n.halo };
          return (
            <g key={n.key} opacity={o}>
              {n.leader ? (
                <>
                  <line
                    x1={n.leader.from.x}
                    y1={n.leader.from.y}
                    x2={n.leader.to.x}
                    y2={n.leader.to.y}
                    stroke={colours.ground}
                    strokeWidth={3 * strokes.border}
                    strokeLinecap="round"
                  />
                  <line
                    x1={n.leader.from.x}
                    y1={n.leader.from.y}
                    x2={n.leader.to.x}
                    y2={n.leader.to.y}
                    stroke={n.ink}
                    strokeWidth={strokes.border}
                  />
                  <circle
                    cx={n.leader.from.x}
                    cy={n.leader.from.y}
                    r={n.leader.dot}
                    fill={n.ink}
                    stroke={colours.ground}
                    strokeWidth={strokes.border}
                  />
                </>
              ) : null}
              <Word
                line={{
                  text,
                  x: n.x + n.textX,
                  y: n.y + n.baseline,
                  width: n.textWidth,
                }}
                register={r[n.register]}
                fill={n.ink}
                measured={share.final}
                halo={halo}
              />
              {n.gauge ? (
                <g
                  transform={`translate(${n.x + n.gauge.x} ${n.y + n.gauge.y})`}
                >
                  {/* One scale for all: the frame 0–100 %, the 2010 reading left as a trace, the reading now, the half notched. */}
                  <rect
                    width={n.gauge.width}
                    height={n.gauge.height}
                    fill={colours.ground}
                    stroke={colours.ground}
                    strokeWidth={n.halo}
                    strokeLinejoin="round"
                  />
                  <rect
                    width={n.gauge.width * n.gauge.from}
                    height={n.gauge.height}
                    fill={n.ink}
                    opacity={0.25}
                  />
                  <rect
                    width={(n.gauge.width * share.value) / 100}
                    height={n.gauge.height}
                    fill={n.ink}
                  />
                  <rect
                    width={n.gauge.width}
                    height={n.gauge.height}
                    fill="none"
                    stroke={n.ink}
                    strokeWidth={strokes.border}
                  />
                  <line
                    x1={n.gauge.width * n.gauge.notch}
                    x2={n.gauge.width * n.gauge.notch}
                    y1={-n.gauge.height * 0.6}
                    y2={n.gauge.height * 1.6}
                    stroke={colours.accent}
                    strokeWidth={strokes.rule}
                  />
                </g>
              ) : null}
            </g>
          );
        })}

        <g
          transform={`translate(${panel.at.x} ${panel.at.y})`}
          opacity={scene.furniture}
        >
          {panel.counters.map((row, i) => (
            <Word
              key={`counter${i}`}
              line={row[scene.counter.step]}
              register={r.value}
              fill={colours.text.counter}
              opacity={scene.counter.opacity}
              halo={{ colour: colours.sea, width: panel.valueHalo }}
            />
          ))}
          {panel.swatches.map((s, i) => (
            <rect
              key={`swatch${i}`}
              x={s.x}
              y={s.y}
              width={s.width}
              height={s.height}
              fill={colours.classFills[i]}
              opacity={scene.swatches[i]}
            />
          ))}
          {panel.bornes.map((line, i) => (
            <Word
              key={`borne${i}`}
              line={line}
              register={r.axis}
              fill={
                i === panel.cursorBorne
                  ? colours.text.counter
                  : colours.text.key
              }
              opacity={scene.swatches[i]}
              halo={{ colour: colours.sea, width: panel.halo }}
            />
          ))}
          {/* The half, marked on the key: what the count counts. */}
          <rect
            x={cursor.x - 1.5 * strokes.rule}
            y={cursor.y - cursor.height / 2}
            width={3 * strokes.rule}
            height={2 * cursor.height}
            fill={colours.text.counter}
            opacity={scene.counter.opacity}
          />
          <rect
            x={panel.missingSwatch.x}
            y={panel.missingSwatch.y}
            width={panel.missingSwatch.width}
            height={panel.missingSwatch.height}
            fill={colours.land}
            stroke={colours.text.key}
            strokeWidth={strokes.border}
          />
          <Word
            line={panel.missingLabel}
            register={r.axis}
            fill={colours.text.key}
            halo={{ colour: colours.sea, width: panel.halo }}
          />
        </g>

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
              halo={{ colour: colours.sea, width: props.source.halo }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
