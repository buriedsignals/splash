/**
 * One frame of « Le nucléaire de ces six pays est français à 84 % » — the title card, the whole bar and its total, the
 * bar split into the nine sources, the ribbons poured into the six countries, nuclear's ribbons kept while the rest step
 * back, nuclear → France in the accent, the nuclear bar laid against France's node, then the whole sankey with « 84 % »
 * on the ribbon (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { Ref } from "react";
import { ribbonAt, sceneAt, twhText } from "./scene.mjs";

type Register = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: string;
  letterSpacing: number;
  lead: number;
};
type Line = { text: string; x: number; y: number; width: number };
type Slot = "display" | "eyebrow" | "value" | "annot" | "axis" | "source";
type Rect = { x: number; y: number; w: number; h: number };
type Node = {
  key: string;
  x: number;
  y0: number;
  h: number;
  name: Line;
  value: Line;
};
type Flow = {
  from: string;
  to: string;
  si: number;
  h: number;
  hTrue: number;
  ay: number;
  by: number;
  x0: number;
  x1: number;
  tracked: boolean;
};

export type SankeyFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: {
    ground: string;
    full: string;
    ribbon: string[];
    rail: string[];
    countryRail: string;
    markGround: string;
    text: Record<
      "eyebrow" | "title" | "name" | "value" | "accent" | "onMark" | "axis",
      string
    >;
  };
  alpha: { ribbon: number; tracked: number };
  rail: { w: number; wide: number };
  whole: { x: number; y: number; h: number; total: number; countX: number };
  counts: Record<string, number>;
  baselineShift: number;
  sources: Node[];
  countries: Node[];
  flows: Flow[];
  subjectKey: string;
  trackedTo: string;
  copy: { from: Rect; to: Rect; part: number };
  share: Line & { cx: number };
  mark: Line & { cx: number };
  halo: number;
  states: Record<string, number>[];
  timing: unknown;
};

function Text({
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

const STEP_BACK = { ribbon: 0.8, word: 0.7 };

export function SankeyFrame(
  props: SankeyFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const {
    frame,
    registers: r,
    colours,
    credit,
    titleCard,
    whole,
    rail,
  } = props;
  const scene = sceneAt(props as never, props.at);
  const countText = twhText(scene.whole.count);
  const trackedIndex = props.flows.findIndex((f) => f.tracked);
  const tracked = props.flows[trackedIndex];
  const trackedScene = scene.flows[trackedIndex];

  const label = (
    n: Node,
    s: { words: number; dim: number; accent: number },
  ) => {
    const opacity = s.words * (1 - STEP_BACK.word * s.dim);
    if (opacity <= 0) return null;
    return (
      <g key={`label-${n.key}`} opacity={opacity}>
        {s.accent < 1 ? (
          <g opacity={1 - s.accent}>
            <Text line={n.name} register={r.annot} fill={colours.text.name} />
            <Text line={n.value} register={r.value} fill={colours.text.value} />
          </g>
        ) : null}
        {s.accent > 0 ? (
          <g opacity={s.accent}>
            <Text line={n.name} register={r.annot} fill={colours.text.accent} />
            <Text
              line={n.value}
              register={r.value}
              fill={colours.text.accent}
            />
          </g>
        ) : null}
      </g>
    );
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

      {/* The whole, before the gaps open: one bar, its height the running total. */}
      {scene.split === 0 && scene.whole.h > 0 ? (
        <rect
          x={whole.x}
          y={whole.y}
          width={rail.wide}
          height={scene.whole.h}
          fill={colours.countryRail}
        />
      ) : null}

      {props.flows.map((f, j) => {
        const s = scene.flows[j];
        if (s.t <= 0) return null;
        const { d } = ribbonAt({ ...f, ay: f.ay + s.dy }, s.t);
        return (
          <path
            key={`${f.from}-${f.to}`}
            d={d}
            fill={colours.ribbon[f.si]}
            fillOpacity={props.alpha.ribbon * (1 - STEP_BACK.ribbon * s.dim)}
          />
        );
      })}
      {trackedScene.accent > 0 ? (
        <path
          d={ribbonAt(tracked, trackedScene.accent).d}
          fill={colours.full}
          fillOpacity={props.alpha.tracked}
        />
      ) : null}

      {scene.split > 0
        ? props.sources.map((n, i) => {
            const s = scene.sources[i];
            return (
              <g key={`rail-${n.key}`} opacity={1 - STEP_BACK.word * s.dim}>
                <rect
                  x={n.x}
                  y={s.y0}
                  width={s.w}
                  height={Math.max(n.h, 1)}
                  fill={colours.rail[i]}
                />
                {s.accent > 0 ? (
                  <rect
                    x={n.x}
                    y={s.y0}
                    width={s.w}
                    height={n.h}
                    fill={colours.full}
                    opacity={s.accent}
                  />
                ) : null}
              </g>
            );
          })
        : null}
      {props.countries.map((n, i) => {
        const s = scene.countries[i];
        if (s.fill <= 0) return null;
        return (
          <g key={`rail-${n.key}`} opacity={1 - STEP_BACK.word * s.dim}>
            <rect
              x={n.x}
              y={n.y0}
              width={rail.w}
              height={Math.max(s.fill, 1)}
              fill={colours.countryRail}
            />
            {s.accent > 0 ? (
              <rect
                x={n.x}
                y={n.y0}
                width={rail.w}
                height={s.fill}
                fill={colours.full}
                opacity={s.accent}
              />
            ) : null}
          </g>
        );
      })}

      {scene.copy ? (
        <g>
          <rect
            x={scene.copy.rect.x}
            y={scene.copy.rect.y}
            width={scene.copy.rect.w}
            height={scene.copy.rect.h}
            fill={
              colours.rail[
                props.sources.findIndex((n) => n.key === props.subjectKey)
              ]
            }
          />
          <rect
            x={scene.copy.rect.x}
            y={scene.copy.rect.y}
            width={scene.copy.rect.w}
            height={props.copy.part}
            fill={colours.full}
          />
        </g>
      ) : null}

      {scene.share > 0 ? (
        <Text
          line={{ text: props.share.text, width: props.share.width, x: scene.label.x, y: scene.label.y }}
          register={r.value}
          fill={colours.text.onMark}
          opacity={scene.share}
          halo={{ colour: colours.markGround, width: props.halo }}
        />
      ) : null}

      {props.sources.map((n, i) => label(n, scene.sources[i]))}
      {props.countries.map((n, i) => label(n, scene.countries[i]))}

      {scene.whole.opacity > 0 && scene.whole.h > 0 ? (
        <Text
          line={{
            text: countText,
            width: props.counts[countText],
            x: whole.countX,
            y: whole.y + scene.whole.h / 2 + props.baselineShift,
          }}
          register={r.value}
          fill={colours.text.value}
          opacity={scene.whole.opacity}
        />
      ) : null}

      <g
        transform={`translate(${credit.at.x} ${credit.at.y})`}
        opacity={scene.source}
      >
        {credit.lines.map((line, i) => (
          <Text
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
        <Text
          line={titleCard.eyebrow}
          register={r.eyebrow}
          fill={colours.text.eyebrow}
        />
        {titleCard.title.map((line, i) => (
          <Text
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
