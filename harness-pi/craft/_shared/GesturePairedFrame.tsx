/**
 * One frame of a PAIRED gesture video — lollipop, grouped-bar, bullet, diverging-bar or population-pyramid, by
 * `variant` — drawn in rows on ONE value scale: the title card, the keys arriving on their scale, and whatever the
 * beat's three gestures have laid by this frame (an accent, a ring, a step-back, a new order, a compare's copy, a
 * bracket with its climbing figure, a reference rule, the notes on caption lines above the plot), then the credit.
 *
 * Per variant, from the per-type kits' doctrine: lollipop — two stems from zero per key, the earlier state pale, the
 * later full, a head on each; grouped-bar — two bars per key, the first full, the second pale, a legend; bullet — a
 * full track to the ceiling, the comparative state thick and pale, the measure thin and saturated over it;
 * diverging-bar — one signed bar from a zero rule; population-pyramid — two halves either side of a spine carrying the
 * band names, the foot at the bottom. One accent (the subject's marks, at the series' two chromas), furniture from the
 * ground, every figure written at its own mark's tip.
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { Ref } from "react";
import { blend, sceneAt } from "./gesture-paired-video.mjs";

type Register = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: string;
  letterSpacing: number;
  lead: number;
};
type Line = { text: string; x: number; y: number; width: number };

export type GesturePairedFrameProps = {
  variant: string;
  frame: { width: number; height: number };
  registers: Record<
    "display" | "eyebrow" | "value" | "axis" | "annot" | "source",
    Register
  >;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: any;
  layout: any;
  [key: string]: unknown;
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

export function GesturePairedFrame(
  props: GesturePairedFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const {
    frame,
    registers: r,
    colours,
    credit,
    titleCard,
    layout: L,
    variant,
  } = props;
  const p = props as any;
  const scene = sceneAt(props as never, props.at) as any;
  const halo = (width: number) => ({ colour: colours.ground, width });
  const pyramid = variant === "population-pyramid";
  const fillOf = (m: any) => {
    const base = blend(
      colours.neutral[m.j] ?? colours.neutral[0],
      colours.accented[m.j] ?? colours.accented[0],
      m.accent,
    );
    return blend(blend(colours.faded, base, m.inked), colours.faded, m.back);
  };
  const keyOf = new Map(scene.keys.map((k: any) => [k.name, k]));
  const figureOf = new Map(p.figures.map((x: any) => [x.mark, x]));

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
        {/* the legend: the unit, and each series' name beside a swatch of its tone */}
        {p.legend.map((l: any, i: number) => (
          <g key={`legend${i}`}>
            {l.swatch ? (
              <rect
                x={l.swatch.x}
                y={l.swatch.y}
                width={l.swatch.size}
                height={l.swatch.size}
                fill={blend(colours.neutral[l.j], colours.accented[l.j], scene.marks.filter((m: any) => m.j === l.j).reduce((a: number, m: any) => Math.min(a, m.accent), 1))}
              />
            ) : null}
            <Text line={l} register={r.annot} fill={colours.text.axis} />
          </g>
        ))}
        {p.unitLine ? (
          <Text line={p.unitLine} register={r.annot} fill={colours.text.axis} />
        ) : null}
        {p.headers.map((h: any) => (
          <Text
            key={`head${h.j}`}
            line={h}
            register={r.annot}
            fill={colours.text.name}
          />
        ))}
        {/* the zero: one rule (a spine pair for the pyramid) */}
        {(pyramid ? scene.geo.spine : [scene.geo.zero]).map(
          (x: number, i: number) => (
            <line
              key={`zero${i}`}
              x1={x}
              x2={x}
              y1={L.plot.y}
              y2={L.plot.y + L.plot.height}
              stroke={colours.grid}
              strokeWidth={props.strokes ? (p.strokes.grid as number) : 1}
            />
          ),
        )}
        {/* the bullet's track: the full scale, so what is left to cover reads too */}
        {variant === "bullet"
          ? scene.keys.map((k: any, i: number) => (
              <rect
                key={`track${i}`}
                x={scene.geo.zero}
                y={k.y + scene.geo.pitch * 0.11}
                width={scene.geo.xOf(L.ceiling) - scene.geo.zero}
                height={scene.geo.pitch * 0.78}
                fill={colours.track}
              />
            ))
          : null}
        {p.names.map((nm: any) => {
          const k: any = keyOf.get(nm.key);
          if (!nm.printed || !k) return null;
          const y = k.y + scene.geo.pitch / 2 + L.nameShift;
          const accent = scene.marks
            .filter((m: any) => m.key === nm.key)
            .reduce((a: number, m: any) => Math.min(a, m.accent), 1); // a key is named in the accent only when all its marks carry it (a highlighted series is not its keys)
          const fill = blend(
            blend(colours.text.name, colours.text.first, accent),
            colours.text.axis,
            k.back,
          );
          return pyramid ? (
            <Text
              key={`name${nm.key}`}
              line={{
                text: nm.text,
                width: nm.width,
                x: (L.spine[0] + L.spine[1]) / 2,
                y,
              }}
              register={r.axis}
              fill={fill}
              anchor="middle"
            />
          ) : (
            <Text
              key={`name${nm.key}`}
              line={{ text: nm.text, width: nm.width, x: L.nameX, y }}
              register={r.axis}
              fill={fill}
            />
          );
        })}
        {p.na
          ? p.keys
              .filter((k: any) => k.gap)
              .map((k: any) => {
                const s: any = keyOf.get(k.name);
                return (
                  <Text
                    key={`na${k.name}`}
                    line={{
                      ...p.na,
                      x: pyramid ? L.plot.x : scene.geo.zero + L.gap,
                      y: s.y + scene.geo.pitch / 2 + L.countShift,
                    }}
                    register={r.value}
                    fill={colours.text.axis}
                  />
                );
              })
          : null}
        {p.scope ? (
          <Text line={p.scope} register={r.axis} fill={colours.text.axis} />
        ) : null}
      </g>

      {/* the marks */}
      {scene.marks.map((m: any, j: number) => {
        if (!(m.x1 - m.x0 > 0)) return null;
        const fill = fillOf(m);
        if (variant === "lollipop") {
          const cy = m.y + m.h / 2;
          return (
            <g key={`mark${j}`}>
              <line
                x1={m.base}
                x2={m.tip}
                y1={cy}
                y2={cy}
                stroke={fill}
                strokeWidth={p.strokes.stem}
              />
              <circle
                cx={m.tip}
                cy={cy}
                r={Math.min(m.h * 0.4, p.strokes.stem * 4)}
                fill={fill}
              />
            </g>
          );
        }
        return (
          <rect
            key={`mark${j}`}
            x={m.x0}
            y={m.y}
            width={m.x1 - m.x0}
            height={m.h}
            fill={fill}
          />
        );
      })}
      {/* compare: a copy of the other length laid from the subject's own base — for the lollipop a dashed stem and an
          open head on the subject's line, for a bar a thinner bar inside the subject's band */}
      {scene.copies.map((c: any) =>
        variant === "lollipop" ? (
          <g key={`copy${c.index}`}>
            <line x1={c.base} x2={c.tip} y1={c.cy} y2={c.cy} stroke={colours.copy} strokeWidth={p.strokes.stem} strokeDasharray={p.dash.join(" ")} />
            <circle cx={c.tip} cy={c.cy} r={Math.min(c.r, p.strokes.stem * 4)} fill={colours.ground} stroke={colours.copy} strokeWidth={p.strokes.stem} />
          </g>
        ) : (
          // an outline, never a filled bar: the copy is a length laid for measuring, not a value of this key
          <rect key={`copy${c.index}`} x={c.x} y={c.y} width={c.width} height={c.height} fill="none" stroke={colours.copy} strokeWidth={p.strokes.rule} strokeDasharray={p.dash.join(" ")} />
        ),
      )}
      {scene.marks.map((m: any, j: number) =>
        m.ring > 0 ? (
          <rect
            key={`ring${j}`}
            x={m.x0 - L.gap / 3}
            y={m.y - L.gap / 3}
            width={m.x1 - m.x0 + (2 * L.gap) / 3}
            height={m.h + (2 * L.gap) / 3}
            fill="none"
            stroke={colours.ring}
            strokeWidth={p.strokes.rule}
            opacity={m.ring}
          />
        ) : null,
      )}
      {scene.rules.map((rule: any, i: number) => (
        <line
          key={`rule${rule.index}-${i}`}
          x1={rule.x}
          x2={rule.x}
          y1={rule.y1}
          y2={rule.y2}
          stroke={colours.rule}
          strokeWidth={p.strokes.rule}
          strokeDasharray={p.dash.join(" ")}
        />
      ))}

      {/* every figure at its own mark's tip, outside the fill */}
      {scene.marks.map((m: any, j: number) => {
        const fig: any = figureOf.get(m.name);
        // A figure a gesture brings (the pyramid's) arrives with that gesture, not with the chart.
        const gate = fig?.by ? Math.max(0, ...fig.by.map((k: number) => scene.g[k])) : 1;
        if (!fig?.labelled || !(m.labelOpacity * gate > 0)) return null;
        const outward = pyramid ? m.side < 0 : m.side < 0;
        const tip =
          variant === "bullet"
            ? Math.max(
                m.fullTip,
                ...scene.marks
                  .filter((x: any) => x.key === m.key)
                  .map((x: any) => x.fullTip),
              )
            : m.fullTip;
        const x = outward
          ? tip - L.gap - fig.width * 1.02
          : tip + L.gap + (variant === "lollipop" ? p.strokes.stem * 2 : 0);
        const fill = blend(colours.text.count, colours.text.first, m.accent);
        return (
          <Text
            key={`fig${j}`}
            line={{
              text: fig.text,
              width: fig.width,
              x,
              y: m.y + m.h / 2 + L.countShift,
            }}
            register={r.value}
            fill={fill}
            opacity={m.labelOpacity * gate}
            halo={halo(p.halo.value)}
          />
        );
      })}

      {scene.brackets.map((b: any) => (
        <g key={`bracket${b.index}`}>
          <line
            x1={b.x}
            x2={b.x}
            y1={b.y1}
            y2={b.reach}
            stroke={colours.text.count}
            strokeWidth={p.strokes.grid * 1.6}
          />
          <line
            x1={b.x - L.gap}
            x2={b.x}
            y1={b.y1}
            y2={b.y1}
            stroke={colours.text.count}
            strokeWidth={p.strokes.grid * 1.6}
          />
          {b.reach >= b.y1 + 1 ? (
            <line
              x1={b.x - L.gap}
              x2={b.x}
              y1={b.reach}
              y2={b.reach}
              stroke={colours.text.count}
              strokeWidth={p.strokes.grid * 1.6}
            />
          ) : null}
          {b.figure ? (
            <Text
              line={{
                text: b.figure,
                width: p.countWidths[b.figure],
                x: b.labelX,
                y: b.labelY,
              }}
              register={r.value}
              fill={colours.text.count}
              halo={halo(p.halo.value)}
            />
          ) : null}
          {b.note ? (
            <Text
              line={{
                text: b.note.text,
                width: b.note.width,
                x: b.labelX,
                y: b.labelY,
              }}
              register={r.annot}
              fill={colours.text.count}
              halo={halo(p.halo.annot)}
            />
          ) : null}
        </g>
      ))}

      {scene.captions.map((c: any) =>
        c.opacity > 0
          ? c.lines.map((line: any, j: number) => (
              <Text
                key={`cap${c.item}-${j}`}
                line={{
                  ...line,
                  x: L.content.left,
                  y: c.y + j * L.captionLead,
                }}
                register={r.annot}
                fill={colours.text.name}
                opacity={c.opacity}
              />
            ))
          : null,
      )}

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
