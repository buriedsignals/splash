/**
 * One frame of a Part-to-whole GESTURE video, every type a variant (`treemap`, `marimekko-mosaic-plot`,
 * `pie-and-donut`): the title card, the parts arriving in their one layout, and whatever the beat's three gestures
 * have laid by this frame — the accent, rings, a step-back, a bracket's outline, a compare's copy growing at the
 * plate's own area or angle per unit, a count's figure climbing, the captions — then the credit.
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: shapes, texts and colours come from gesture-part-video-build.mjs; motion from
 * `partSceneAt` (gesture-part-video.mjs). Forked from GesturePartStatic.tsx's drawing and the per-type video frames.
 */

import type { Ref } from "react";
import { arcPath } from "./gesture-family-part.mjs";
import { partSceneAt } from "./gesture-part-video.mjs";

type Register = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: string;
  letterSpacing: number;
  lead: number;
};
type Line = { text: string; x: number; y: number; width: number };

export type GesturePartFrameProps = {
  variant: string;
  frame: { width: number; height: number };
  registers: Record<
    "display" | "eyebrow" | "value" | "axis" | "annot" | "source",
    Register
  >;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: any;
  parts: any[];
  [key: string]: unknown;
};

/** #rrggbb colours mixed `t` of the way. */
function blend(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16));
  return `#${pa
    .map((v, i) =>
      Math.round(v + (pb[i] - v) * Math.max(0, Math.min(1, t)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

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

const rectD = (r: any) =>
  r && r.w > 0 && r.h > 0 ? `M${r.x},${r.y}h${r.w}v${r.h}h${-r.w}Z` : "";
const shapeD = (s: any) =>
  !s
    ? ""
    : s.kind === "arc"
      ? arcPath(s)
      : rectD({ ...s, w: Math.max(0, s.w - 1), h: Math.max(0, s.h - 1) });

export function GesturePartFrame(
  props: GesturePartFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const { frame, registers: r, colours, credit, titleCard } = props;
  const scene = partSceneAt(props as never, props.at) as any;
  const halo = (width: number) => ({ colour: colours.ground, width });
  const P = props as any;

  return (
    <svg
      ref={props.svgRef}
      xmlns="http://www.w3.org/2000/svg"
      width={frame.width}
      height={frame.height}
      viewBox={`0 0 ${frame.width} ${frame.height}`}
    >
      <rect width={frame.width} height={frame.height} fill={colours.ground} />

      <g opacity={scene.furniture}>
        <Text line={P.unitLine} register={r.axis} fill={colours.text.axis} />
        {P.columns.map((c: Line, i: number) => (
          <Text
            key={`col${i}`}
            line={c}
            register={r.axis}
            fill={colours.text.ink}
          />
        ))}
      </g>

      {/* the parts: the field's neutral, the accent arriving over it, a step-back fading both */}
      {props.parts.map((p: any, i: number) => {
        const s = scene.parts[i];
        if (!p.shape || !(p.value > 0) || !(s.alpha > 0)) return null;
        const d = shapeD(p.shape);
        return (
          <g key={`part${i}`} opacity={s.alpha}>
            <path
              d={d}
              fill={p.fill}
              stroke={colours.ground}
              strokeWidth={1.5}
            />
            {s.accent > 0 ? (
              <path
                d={d}
                fill={colours.accent}
                opacity={s.accent}
                stroke={colours.ground}
                strokeWidth={1.5}
              />
            ) : null}
          </g>
        );
      })}

      {/* each bracket's outline, drawing in with its gesture */}
      {scene.outlines.map((o: any) =>
        o.opacity > 0 ? (
          o.kind === "arc" ? (
            <path
              key={`ol${o.item}`}
              d={arcPath(o.arc)}
              fill={colours.text.ink}
              opacity={o.opacity}
            />
          ) : (
            o.rects.map((rc: any, j: number) => (
              <path
                key={`ol${o.item}-${j}`}
                d={rectD({
                  x: rc.x + 1,
                  y: rc.y + 1,
                  w: rc.w - 3,
                  h: rc.h - 3,
                })}
                fill="none"
                stroke={colours.text.ink}
                strokeWidth={
                  props.strokes ? (props as any).strokes.rule * 1.4 : 2
                }
                opacity={o.opacity}
              />
            ))
          )
        ) : null,
      )}

      {/* rings */}
      {props.parts.map((p: any, i: number) => {
        const s = scene.parts[i];
        if (!p.shape || !(s.ring > 0)) return null;
        const d =
          p.shape.kind === "arc"
            ? arcPath({ ...p.shape, r0: p.shape.r0 - 4, r1: p.shape.r1 + 4 })
            : rectD({
                x: p.shape.x + 2,
                y: p.shape.y + 2,
                w: p.shape.w - 5,
                h: p.shape.h - 5,
              });
        return (
          <path
            key={`ring${i}`}
            d={d}
            fill="none"
            stroke={colours.ring}
            strokeWidth={(props as any).strokes.rule * 1.6}
            opacity={s.ring * s.shown}
          />
        );
      })}

      {/* compare copies: the compared quantity growing against its subject at the plate's own measure per unit */}
      {scene.copies.map((c: any) => (
        <path
          key={`copy${c.index}`}
          d={c.shape.kind === "arc" ? arcPath(c.shape) : rectD(c.shape)}
          fill="none"
          stroke={colours.text.ink}
          strokeWidth={(props as any).strokes.rule * 1.3}
          strokeDasharray="10 6"
        />
      ))}

      {/* leaders (a donut's outside labels, a marimekko's key) */}
      <g opacity={scene.furniture}>
        {P.leaders.map((l: any, i: number) => (
          <line
            key={`ld${i}`}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke={colours.text.axis}
            strokeWidth={(props as any).strokes.grid}
            opacity={l.part >= 0 ? scene.parts[l.part].shown : 1}
          />
        ))}
        {P.keys.map((kk: any, i: number) => (
          <Text
            key={`key${i}`}
            line={kk}
            register={r.annot}
            fill={colours.text.axis}
          />
        ))}
      </g>

      {/* each part's own words */}
      {props.parts.map((p: any, i: number) => {
        const s = scene.parts[i];
        if (!(s.shown > 0.98)) return null;
        return p.labels.map((l: any, j: number) => {
          const onFill = !l.outside;
          const strong = s.accent > 0.5;
          const fill = onFill
            ? strong
              ? colours.onAccent
              : l.quiet
                ? colours.text.axis
                : colours.text.ink
            : strong && !l.quiet
              ? colours.text.accent
              : l.quiet
                ? colours.text.axis
                : colours.text.ink;
          return (
            <Text
              key={`lab${i}-${j}`}
              line={l}
              register={l.register === "value" ? r.value : r.annot}
              fill={blend(fill, colours.text.axis, s.back)}
              opacity={1 - 0.6 * s.back}
              halo={l.outside ? halo((props as any).halo.annot) : undefined}
            />
          );
        });
      })}

      {/* captions: each gesture's words above the plot; a count's or bracket's figure climbs, then its note lands */}
      {scene.captions.map((c: any) => (
        <g key={`cap${c.item}`}>
          {c.figure ? (
            <Text
              line={{
                text: c.figure,
                x: (props as any).unitLine.x,
                y: c.y,
                width: (props as any).countWidths[c.figure],
              }}
              register={r.value}
              fill={colours.text.accent}
            />
          ) : null}
          {c.opacity > 0
            ? c.lines.map((line: Line, j: number) => (
                <Text
                  key={`cl${j}`}
                  line={line}
                  register={r.annot}
                  fill={colours.text.ink}
                  opacity={c.opacity}
                />
              ))
            : null}
        </g>
      ))}

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
