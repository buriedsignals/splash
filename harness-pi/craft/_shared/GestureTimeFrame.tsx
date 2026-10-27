/**
 * One frame of a Time-series GESTURE video, for every type of the family (props.variant): a line, an area (stacked
 * when several series), a streamgraph or a bump chart — the title card, the axes, the series drawn as far in time as
 * the frame has reached, and whatever the beat's three gestures have laid by this frame: the accent, rings and
 * stepped-back series, a ring and a note on a reading, a level rewound or a thickness copied, the solved crossings
 * ringed, a bracketed run of time, a rule, the zoomed window — then the credit.
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `gesture-time-video-build.mjs`; motion
 * from `sceneAt` (`gesture-time-scene.mjs`). Every word carries the width Bun measured (`data-width`).
 */

import type { Ref } from "react";
import { blend, sceneAt } from "./gesture-time-scene.mjs";

type Register = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: string;
  letterSpacing: number;
  lead: number;
};
type Line = { text: string; x: number; y: number; width: number };

export type GestureTimeFrameProps = {
  frame: { width: number; height: number };
  variant: string;
  registers: Record<
    "display" | "eyebrow" | "value" | "axis" | "annot" | "source",
    Register
  >;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: any;
  plot: { left: number; right: number; top: number; bottom: number };
  [key: string]: any;
};

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
  anchor?: "start" | "middle" | "end";
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
      textAnchor={anchor}
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

export function GestureTimeFrame(
  props: GestureTimeFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const { frame, registers: r, colours: C, credit, titleCard, plot: P } = props;
  const scene = sceneAt(props as never, props.at) as any;
  const line =
    props.variant === "line" || props.variant === "bump-ranking-over-time";
  const halo = (width: number) => ({ colour: C.ground, width });
  const accentIndex = props.series.findIndex(
    (s: any) => s.name === props.accent,
  );
  const order = props.series
    .map((_: any, i: number) => i)
    .sort(
      (a: number, b: number) =>
        Number(a === accentIndex) - Number(b === accentIndex) ||
        scene.series[a].ring - scene.series[b].ring,
    );
  const colourOf = (i: number) => {
    const s = scene.series[i];
    const base = line ? C.neutral : i % 2 ? C.neutralLight : C.neutral;
    return blend(
      blend(blend(base, C.ring, s.ring), C.accent, s.accent),
      C.faded,
      s.back,
    );
  };
  const tintOn = props.items.some((it: any) => it.do === "bracket" && it.tint);
  const firstGap = props.gaps.find((g: any) => g.series === -1 || g.bridged);

  return (
    <svg
      ref={props.svgRef}
      xmlns="http://www.w3.org/2000/svg"
      width={frame.width}
      height={frame.height}
      viewBox={`0 0 ${frame.width} ${frame.height}`}
    >
      <defs>
        <clipPath id="time-plot">
          <rect
            x={P.left}
            y={P.top - 12}
            width={P.right - P.left}
            height={P.bottom - P.top + 24}
          />
        </clipPath>
        {scene.items
          .filter((it: any) => it.do === "bracket")
          .map((it: any) => (
            <clipPath key={`bc${it.k}`} id={`time-bracket-${it.k}`}>
              <rect
                x={it.x0}
                y={P.top - 12}
                width={Math.max(0.5, it.x1 - it.x0)}
                height={P.bottom - P.top + 24}
              />
            </clipPath>
          ))}
      </defs>
      <rect width={frame.width} height={frame.height} fill={C.ground} />

      <g opacity={scene.furniture}>
        {props.yTicks.map((t: any, i: number) => {
          const y = scene.Y(t.v);
          return (
            <g key={`yt${i}`}>
              {props.variant !== "bump-ranking-over-time" ? (
                <line
                  x1={P.left}
                  x2={P.right}
                  y1={y}
                  y2={y}
                  stroke={t.v === 0 ? C.base : C.grid}
                  strokeWidth={props.strokes.grid}
                />
              ) : null}
              <Text
                line={{
                  text: t.text,
                  width: t.width,
                  x: P.left - props.gap,
                  y: y + r.axis.fontSize * 0.35,
                }}
                register={r.axis}
                fill={C.text.axis}
                anchor="end"
              />
            </g>
          );
        })}
        {props.unit ? (
          <Text line={props.unit} register={r.axis} fill={C.text.axis} />
        ) : null}
        <line
          x1={P.left}
          x2={P.right}
          y1={P.bottom}
          y2={P.bottom}
          stroke={C.base}
          strokeWidth={props.strokes.grid * 1.5}
        />
        {scene.xTicks.map((t: any) => (
          <g key={`xt${t.t}`}>
            <line
              x1={t.x}
              x2={t.x}
              y1={P.bottom}
              y2={P.bottom + props.gap * 0.6}
              stroke={C.text.axis}
              strokeWidth={props.strokes.grid}
            />
            <Text
              line={{
                text: t.text,
                width: t.width,
                x: t.x,
                y: P.bottom + r.axis.lead * 1.1,
              }}
              register={r.axis}
              fill={C.text.axis}
              anchor={
                t.x - t.width / 2 < P.left
                  ? "start"
                  : t.x + t.width / 2 > P.right
                    ? "end"
                    : "middle"
              }
            />
          </g>
        ))}
      </g>

      <g clipPath="url(#time-plot)" opacity={scene.grown}>
        {props.gaps.map((g: any, i: number) =>
          g.series === -1 ? (
            <rect
              key={`gap${i}`}
              x={scene.X(g.from)}
              y={P.top}
              width={Math.max(1, scene.X(g.to) - scene.X(g.from))}
              height={P.bottom - P.top}
              fill={C.faded}
              opacity={0.5}
            />
          ) : null,
        )}
        {order.map((i: number) => {
          const s = scene.series[i];
          const fill = colourOf(i);
          if (line)
            return s.lines.map((d: string, j: number) => (
              <path
                key={`l${i}-${j}`}
                d={d}
                fill="none"
                stroke={fill}
                strokeWidth={
                  i === accentIndex ? props.strokes.series : props.strokes.other
                }
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ));
          const tinted = tintOn && i === accentIndex;
          return s.bands.map((d: string, j: number) => (
            <g key={`b${i}-${j}`}>
              <path
                d={d}
                fill={tinted ? C.accentTint : fill}
                stroke={C.ground}
                strokeWidth={1}
              />
              {tinted
                ? scene.items
                    .filter((it: any) => it.do === "bracket")
                    .map((it: any) => (
                      <path
                        key={`bt${it.k}`}
                        d={d}
                        fill={fill}
                        clipPath={`url(#time-bracket-${it.k})`}
                      />
                    ))
                : null}
            </g>
          ));
        })}
        {props.gaps.map((g: any, i: number) => {
          if (g.series < 0 || !g.bridged) return null;
          const pts = props.series[g.series].pts;
          const a = pts.find((p: number[]) => p[0] === g.from);
          const b = pts.find((p: number[]) => p[0] === g.to);
          if (
            !a ||
            !b ||
            scene.series[g.series].fr * (props.t1 - props.t0) + props.t0 < g.to
          )
            return null;
          return (
            <line
              key={`br${i}`}
              x1={scene.X(a[0])}
              x2={scene.X(b[0])}
              y1={scene.Y(a[2])}
              y2={scene.Y(b[2])}
              stroke={C.text.axis}
              strokeWidth={props.strokes.grid * 2}
              strokeDasharray={props.dash.join(" ")}
            />
          );
        })}
      </g>

      <g clipPath="url(#time-plot)">
        {scene.items.map((it: any) => {
          if (!(it.g > 0)) return null;
          if (it.do === "reference")
            return (
              <line
                key={`ref${it.k}`}
                x1={P.left}
                x2={it.reach}
                y1={it.y}
                y2={it.y}
                stroke={C.rule}
                strokeWidth={props.strokes.rule}
                strokeDasharray={props.dash.join(" ")}
              />
            );
          if (it.kind === "level")
            return (
              <g key={`lv${it.k}`}>
                <line
                  x1={it.b.x}
                  x2={it.reach}
                  y1={it.b.y}
                  y2={it.b.y}
                  stroke={C.text.name}
                  strokeWidth={props.strokes.rule}
                  strokeDasharray={props.dash.join(" ")}
                />
                <circle
                  cx={it.b.x}
                  cy={it.b.y}
                  r={props.gap * 0.45}
                  fill={C.ground}
                  stroke={C.text.name}
                  strokeWidth={props.strokes.rule}
                />
                {it.g >= 1 ? (
                  <line
                    x1={it.a.x}
                    x2={it.a.x}
                    y1={it.b.y}
                    y2={it.a.y}
                    stroke={C.accent}
                    strokeWidth={props.strokes.series}
                  />
                ) : null}
                {it.g >= 1 ? (
                  <circle
                    cx={it.a.x}
                    cy={it.a.y}
                    r={props.gap * 0.45}
                    fill={C.accent}
                  />
                ) : null}
              </g>
            );
          if (it.kind === "copy")
            return (
              <g key={`cp${it.k}`}>
                <rect
                  x={it.b.x - props.gap * 0.3}
                  y={it.b.y}
                  width={props.gap * 0.6}
                  height={Math.max(1, it.bThick)}
                  fill="none"
                  stroke={C.text.name}
                  strokeWidth={props.strokes.grid * 2}
                />
                <rect
                  x={it.a.x + props.gap * 0.4}
                  y={it.a.y - it.thick}
                  width={props.gap * 0.7}
                  height={Math.max(1, it.thick)}
                  fill={C.text.name}
                />
              </g>
            );
          if (it.kind === "crossing")
            return it.points.map((p: any, j: number) => (
              <circle
                key={`cr${it.k}-${j}`}
                cx={p.x}
                cy={p.y}
                r={props.gap * 0.8}
                fill="none"
                stroke={C.ring}
                strokeWidth={props.strokes.rule}
                opacity={it.g}
              />
            ));
          if (it.do === "bracket")
            return (
              <path
                key={`brk${it.k}`}
                d={`M${it.x0},${P.top + props.gap}V${P.top}H${it.x1}V${P.top + props.gap}`}
                fill="none"
                stroke={C.text.name}
                strokeWidth={props.strokes.rule}
              />
            );
          if (
            it.at &&
            (it.do === "name" ||
              it.do === "annotate" ||
              it.do === "highlight" ||
              it.do === "trace")
          )
            return it.do === "name" ? (
              <circle
                key={`rg${it.k}`}
                cx={it.at.x}
                cy={it.at.y}
                r={props.gap * 0.8}
                fill="none"
                stroke={C.ring}
                strokeWidth={props.strokes.rule}
                opacity={it.g}
              />
            ) : (
              <circle
                key={`pt${it.k}`}
                cx={it.at.x}
                cy={it.at.y}
                r={props.gap * 0.4}
                fill={C.text.name}
                opacity={it.g}
              />
            );
          return null;
        })}
      </g>

      {props.labels.map((l: any, i: number) => (
        <Text
          key={`end${i}`}
          line={{ text: l.text, width: l.width, x: l.x, y: l.y }}
          register={r.annot}
          fill={l.series === accentIndex ? C.text.accent : C.text.name}
          opacity={scene.series[l.series].labelOpacity}
          halo={halo(props.halo.annot)}
        />
      ))}
      {props.gapLabel && firstGap ? (
        <Text
          line={{
            ...props.gapLabel,
            x:
              (scene.X(firstGap.from) + scene.X(firstGap.to)) / 2 -
              props.gapLabel.width / 2,
            y: P.top + r.axis.lead,
          }}
          register={r.axis}
          fill={C.text.axis}
          opacity={scene.grown}
          halo={halo(props.halo.axis)}
        />
      ) : null}
      {scene.playhead ? (
        <Text
          line={{
            text: scene.playhead.text,
            width: scene.playhead.width,
            x: scene.playhead.x + props.gap * 0.6,
            y: scene.playhead.y - props.gap * 0.6,
          }}
          register={r.value}
          fill={C.text.accent}
          halo={halo(props.halo.value)}
        />
      ) : null}
      {scene.items.map((it: any) =>
        it.note && it.note.opacity > 0 && it.note.leader && it.note.ax !== undefined ? (
          <line
            key={`ld${it.k}`}
            x1={it.note.ax}
            y1={it.note.ay}
            x2={it.note.x + (it.note.dx < 0 ? it.note.width : 0)}
            y2={it.note.y + props.gap * 0.3}
            stroke={C.text.axis}
            strokeWidth={props.strokes.grid * 1.5}
            opacity={it.note.opacity}
          />
        ) : null,
      )}
      {scene.items.map((it: any) =>
        it.note && it.note.opacity > 0 ? (
          <Text
            key={`note${it.k}`}
            line={{
              text: it.note.text,
              width: it.note.width,
              x: it.note.x,
              y: it.note.y,
            }}
            register={r.annot}
            fill={C.text.name}
            opacity={it.note.opacity}
            halo={halo(props.halo.annot)}
          />
        ) : null,
      )}
      {scene.items.map((it: any) =>
        it.captionOpacity > 0
          ? props.items[it.k].caption.map((c: any, j: number) => (
              <Text
                key={`cap${it.k}-${j}`}
                line={{
                  text: c.text,
                  width: c.width,
                  x: P.left > props.credit.at.x ? props.credit.at.x : P.left,
                  y: c.y,
                }}
                register={r.annot}
                fill={C.text.name}
                opacity={it.captionOpacity}
              />
            ))
          : null,
      )}

      <g
        transform={`translate(${credit.at.x} ${credit.at.y})`}
        opacity={scene.source}
      >
        {credit.lines.map((l, i) => (
          <Text
            key={`credit${i}`}
            line={l}
            register={r.source}
            fill={C.text.axis}
            halo={{ colour: C.ground, width: credit.halo }}
          />
        ))}
      </g>

      <g opacity={scene.title}>
        <rect width={frame.width} height={frame.height} fill={C.ground} />
        <Text
          line={titleCard.eyebrow}
          register={r.eyebrow}
          fill={C.text.eyebrow}
        />
        {titleCard.title.map((l, i) => (
          <Text
            key={`title${i}`}
            line={l}
            register={titleCard.register}
            fill={C.text.title}
          />
        ))}
      </g>
    </svg>
  );
}
