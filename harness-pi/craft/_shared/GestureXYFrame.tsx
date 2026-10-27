/**
 * One frame of an XY GESTURE video (scatter, bubbles, connected scatter): the title card, the plot on its two fitted
 * axes, and whatever the beat's three gestures have laid by this frame — the subject's accent, rings, a step-back, a
 * zoomed window (its ticks travelling with it), a compare's two legs, a reference rule, a traced path drawing itself,
 * the notes on caption lines above the plot — then the credit.
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts, widths and colours come from the runner's build; motion from
 * `sceneAt` (./gesture-xy-video.mjs). Every word is a measured <text data-width>.
 */

import type { Ref } from "react";
import { sceneAt } from "./gesture-xy-video.mjs";

type Register = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: string;
  letterSpacing: number;
  lead: number;
};
type Line = { text: string; x: number; y: number; width: number };

export type GestureXYFrameProps = { [key: string]: any };

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
  anchor,
  halo,
}: {
  line: Line;
  register: Register;
  fill: string;
  opacity?: number;
  anchor?: "end" | "middle";
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
      textAnchor={anchor}
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

export function GestureXYFrame(
  props: GestureXYFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const {
    frame,
    registers: r,
    colours: c,
    credit,
    titleCard,
    layout: L,
  } = props;
  const scene: any = sceneAt(props, props.at);
  const { picture, xy } = scene;
  const P = L.plot;
  const W = P.right - P.left;
  const H = P.bottom - P.top;
  const X = (x: number) => P.left + xy.u(x, picture.dom) * W;
  const Y = (y: number) => P.bottom - xy.v(y, picture.dom) * H;
  const inside = (x: number, y: number) =>
    x >= P.left - 0.5 &&
    x <= P.right + 0.5 &&
    y >= P.top - 0.5 &&
    y <= P.bottom + 0.5;
  const at = (n: string) => {
    const m = xy.byName.get(n);
    return { x: X(m.x), y: Y(m.value) };
  };
  const accentOf = (n: string) => picture.accent.get(n) ?? 0;
  const ringOf = (n: string) => picture.ring.get(n) ?? 0;
  const backOf = (n: string) => picture.back.get(n) ?? 0;
  const halo = (w: number) => ({ colour: c.ground, width: w });

  // The tick set nearest the current window: the full plot's, or a zoom's (each measured in Bun).
  const span = (d: any) => d.x[1] - d.x[0];
  const ticks = props.tickSets.reduce(
    (best: any, t: any) =>
      Math.abs(span(t.dom) - span(picture.dom)) <
      Math.abs(span(best.dom) - span(picture.dom))
        ? t
        : best,
    props.tickSets[0],
  );
  const sizeR = (m: any) =>
    props.sized
      ? Math.max(L.rFloor, L.rMax * Math.sqrt(m.size / props.maxSize))
      : L.r;
  const hollow = (m: any) =>
    props.sized && L.rMax * Math.sqrt(m.size / props.maxSize) < L.rFloor;
  const traceOf = new Map(scene.traced.map((t: any) => [t.series, t.t]));

  const pathPoints = (names: string[], upTo = 1) => {
    const pts = names.map(at);
    if (upTo >= 1 || pts.length < 2) return pts;
    const segs = pts.length - 1;
    const reach = upTo * segs;
    const whole = Math.floor(reach);
    const out = pts.slice(0, whole + 1);
    const frac = reach - whole;
    if (whole < segs && frac > 0) {
      const a = pts[whole];
      const b = pts[whole + 1];
      out.push({ x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac });
    }
    return out;
  };

  return (
    <svg
      ref={props.svgRef}
      xmlns="http://www.w3.org/2000/svg"
      width={frame.width}
      height={frame.height}
      viewBox={`0 0 ${frame.width} ${frame.height}`}
    >
      <defs>
        <clipPath id="xy-plot">
          <rect
            x={P.left - L.rMax}
            y={P.top - L.rMax}
            width={W + 2 * L.rMax}
            height={H + 2 * L.rMax}
          />
        </clipPath>
      </defs>
      <rect width={frame.width} height={frame.height} fill={c.ground} />

      <g opacity={scene.furniture}>
        {ticks.y.map((t: any) => {
          const y = Y(t.v);
          if (y < P.top - 1 || y > P.bottom + 1) return null;
          return (
            <g key={`y${t.v}`}>
              <line
                x1={P.left}
                x2={P.right}
                y1={y}
                y2={y}
                stroke={c.grid}
                strokeWidth={props.strokes.grid}
              />
              <Text
                line={{
                  text: t.text,
                  width: t.width,
                  x: P.left - L.gap,
                  y: y + L.tickShift,
                }}
                register={r.axis}
                fill={c.text.axis}
                anchor="end"
              />
            </g>
          );
        })}
        {ticks.x.map((t: any) => {
          const x = X(t.v);
          if (x < P.left - 1 || x > P.right + 1) return null;
          return (
            <g key={`x${t.v}`}>
              <line
                x1={x}
                x2={x}
                y1={P.top}
                y2={P.bottom}
                stroke={c.grid}
                strokeWidth={props.strokes.grid}
              />
              <Text
                line={{
                  text: t.text,
                  width: t.width,
                  x,
                  y: P.bottom + L.xTickY,
                }}
                register={r.axis}
                fill={c.text.axis}
                anchor="middle"
              />
            </g>
          );
        })}
        <Text line={L.yName} register={r.axis} fill={c.text.axis} />
        <Text line={L.xName} register={r.axis} fill={c.text.axis} />
        {L.scope ? (
          <Text line={L.scope} register={r.axis} fill={c.text.axis} />
        ) : null}
      </g>

      <g clipPath="url(#xy-plot)">
        {picture.rules.map((rule: any, i: number) => {
          const t = rule.t;
          if (rule.axis === "x") {
            const x = X(rule.value);
            return (
              <line
                key={`r${i}`}
                x1={x}
                x2={x}
                y1={P.bottom}
                y2={P.bottom - H * t}
                stroke={props.ruleAccent ? c.accent : c.rule}
                strokeWidth={props.strokes.rule}
                strokeDasharray={props.dash.join(" ")}
              />
            );
          }
          const y = Y(rule.value);
          return (
            <line
              key={`r${i}`}
              x1={P.left}
              x2={P.left + W * t}
              y1={y}
              y2={y}
              stroke={props.ruleAccent ? c.accent : c.rule}
              strokeWidth={props.strokes.rule}
              strokeDasharray={props.dash.join(" ")}
            />
          );
        })}

        {props.variant === "connected-scatter" &&
          props.paths.map((p: { series: string; names: string[] }) => {
            const head = p.names.at(-1)!;
            const shown = scene.shown(head);
            if (shown <= 0) return null;
            const a = accentOf(head);
            const traced = (traceOf.get(p.series) as number | undefined) ?? 0;
            const colour = blend(c.neutral, c.accent, a);
            const fade = 1 - 0.8 * backOf(head);
            const full = pathPoints(p.names);
            const drawn = traced > 0 ? pathPoints(p.names, traced) : full;
            return (
              <g key={p.series} opacity={shown * fade}>
                <polyline
                  points={full.map((q) => `${q.x},${q.y}`).join(" ")}
                  fill="none"
                  stroke={colour}
                  strokeWidth={props.strokes.series * (0.5 + 0.5 * a)}
                  strokeDasharray={props.dash.join(" ")}
                  opacity={traced > 0 ? 0.35 : 1}
                />
                {traced > 0 ? (
                  <polyline
                    points={drawn.map((q) => `${q.x},${q.y}`).join(" ")}
                    fill="none"
                    stroke={a > 0.5 ? c.accent : c.ink}
                    strokeWidth={props.strokes.series}
                  />
                ) : null}
                {p.names.slice(0, -1).map((n) => {
                  const q = at(n);
                  return (
                    <circle
                      key={n}
                      cx={q.x}
                      cy={q.y}
                      r={L.r}
                      fill={c.ground}
                      stroke={colour}
                      strokeWidth={props.strokes.rule}
                    />
                  );
                })}
                <circle
                  cx={at(head).x}
                  cy={at(head).y}
                  r={L.r * 1.2}
                  fill={colour}
                />
                {ringOf(head) > 0 ? (
                  <circle
                    cx={at(head).x}
                    cy={at(head).y}
                    r={L.r * 2.2}
                    fill="none"
                    stroke={c.ring}
                    strokeWidth={props.strokes.rule}
                    opacity={ringOf(head)}
                  />
                ) : null}
              </g>
            );
          })}
        {props.variant !== "connected-scatter" &&
          props.drawOrder.map((n: string) => {
            const m = xy.byName.get(n);
            const q = at(n);
            const shown = scene.shown(n);
            if (shown <= 0 || !inside(q.x, q.y)) return null;
            const a = accentOf(n);
            const fill = blend(c.neutral, c.accent, a);
            const fade = 1 - 0.8 * backOf(n);
            return (
              <g key={n} opacity={shown * fade}>
                <circle
                  cx={q.x}
                  cy={q.y}
                  r={sizeR(m)}
                  fill={hollow(m) ? "none" : fill}
                  fillOpacity={props.sized && a < 0.5 ? 0.4 : 0.85}
                  stroke={props.sized || hollow(m) ? fill : "none"}
                  strokeWidth={props.strokes.grid * 1.4}
                />
                {ringOf(n) > 0 ? (
                  <circle
                    cx={q.x}
                    cy={q.y}
                    r={sizeR(m) + L.r * 1.2}
                    fill="none"
                    stroke={c.ring}
                    strokeWidth={props.strokes.rule}
                    opacity={ringOf(n)}
                  />
                ) : null}
              </g>
            );
          })}

        {picture.compares.map((cmp: any) => {
          const a = at(cmp.a);
          const b = at(cmp.b);
          const t = cmp.t;
          return (
            <g key={`c${cmp.k}`} opacity={t}>
              <line
                x1={a.x}
                x2={a.x + (b.x - a.x) * Math.min(1, t * 2)}
                y1={a.y}
                y2={a.y}
                stroke={c.ink}
                strokeWidth={props.strokes.rule}
                strokeDasharray={props.dash.join(" ")}
              />
              {t > 0.5 ? (
                <line
                  x1={b.x}
                  x2={b.x}
                  y1={a.y}
                  y2={a.y + (b.y - a.y) * (t * 2 - 1)}
                  stroke={c.ink}
                  strokeWidth={props.strokes.rule}
                  strokeDasharray={props.dash.join(" ")}
                />
              ) : null}
            </g>
          );
        })}
      </g>

      {/* Name tags beside the marks a gesture names, then each gesture's note on its caption line. */}
      {props.tags.map((tag: any) => {
        const o = Math.max(
          accentOf(tag.mark),
          ringOf(tag.mark),
          ...tag.items.map((k: number) =>
            picture.notes.some((n: any) => n.k === k)
              ? scene.picture.notes.find((n: any) => n.k === k).t
              : 0,
          ),
        );
        if (o <= 0) return null;
        const q = at(tag.mark);
        if (!inside(q.x, q.y)) return null;
        const right = q.x + L.gap + tag.width < P.right;
        return (
          <Text
            key={`tag${tag.mark}`}
            line={{
              text: tag.text,
              width: tag.width,
              x: right ? q.x + L.gap * 1.2 : q.x - L.gap * 1.2,
              y: q.y - L.gap * 0.6,
            }}
            register={r.annot}
            fill={accentOf(tag.mark) > 0.5 ? c.text.first : c.text.name}
            opacity={o * scene.shown(tag.mark)}
            anchor={right ? undefined : "end"}
            halo={halo(props.halo.annot)}
          />
        );
      })}
      {picture.rules.map((rule: any, i: number) => {
        const label = props.ruleLabels[rule.k];
        if (!label) return null;
        const x = rule.axis === "x" ? X(rule.value) + L.gap * 0.6 : P.right;
        const y =
          rule.axis === "x"
            ? P.top + L.tickShift * 2
            : Y(rule.value) - L.gap * 0.5;
        return (
          <Text
            key={`rl${i}`}
            line={{ text: label.text, width: label.width, x, y }}
            register={r.annot}
            fill={props.ruleAccent ? c.text.first : c.text.name}
            opacity={rule.t}
            anchor={rule.axis === "x" ? undefined : "end"}
            halo={halo(props.halo.annot)}
          />
        );
      })}
      {props.keyTags.map((k: any) => {
        const t = (traceOf.get(k.series) as number | undefined) ?? 0;
        if (t <= 0) return null;
        const q = at(k.mark);
        return (
          <Text
            key={`key${k.mark}`}
            line={{
              text: k.text,
              width: k.width,
              x: q.x,
              y: q.y + L.gap * 1.8,
            }}
            register={r.axis}
            fill={c.text.axis}
            opacity={Math.min(1, t * 1.5)}
            anchor="middle"
            halo={halo(props.halo.axis)}
          />
        );
      })}
      {L.captions.map((cap: any) => {
        const o = picture.notes.find((n: any) => n.k === cap.k)?.t ?? 0;
        if (o <= 0) return null;
        return cap.lines.map((line: Line, j: number) => (
          <Text
            key={`cap${cap.k}-${j}`}
            line={line}
            register={r.annot}
            fill={c.text.name}
            opacity={o}
          />
        ));
      })}

      <g
        transform={`translate(${credit.at.x} ${credit.at.y})`}
        opacity={scene.source}
      >
        {credit.lines.map((line: Line, i: number) => (
          <Text
            key={`credit${i}`}
            line={line}
            register={r.source}
            fill={c.text.axis}
            halo={{ colour: c.ground, width: credit.halo }}
          />
        ))}
      </g>

      <g opacity={scene.title}>
        <rect width={frame.width} height={frame.height} fill={c.ground} />
        <Text
          line={titleCard.eyebrow}
          register={r.eyebrow}
          fill={c.text.eyebrow}
        />
        {titleCard.title.map((line: Line, i: number) => (
          <Text
            key={`title${i}`}
            line={line}
            register={titleCard.register}
            fill={c.text.title}
          />
        ))}
      </g>
    </svg>
  );
}
