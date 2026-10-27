/**
 * One frame of a Stack GESTURE video — stacked-bar, diverging-stacked-bar-likert or waterfall-bridge (`props.variant`):
 * the title card, the stack on its one scale (parts in their locked order, each in its own fill, a segment's number
 * inside it where it fits, the bar's total — or each side's — at its end; a bridge's columns floating on the running
 * level with their connectors, the closing level last), and whatever the beat's three gestures have laid by this
 * frame — accents, rings, a step-back, a new order, a compare's copy, a bracket with its climbing figure, a reference
 * rule, a count, the notes — then the credit. Forked from GestureStackStatic's drawing.
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from build.mjs; motion from `sceneAt`.
 */
import type { Ref } from "react";
import { blend, sceneAt } from "./gesture-stack-video.mjs";

type Register = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: string;
  letterSpacing: number;
  lead: number;
};
type Line = { text: string; x: number; y: number; width: number };

export type GestureStackFrameProps = { [key: string]: any };

function Text({
  line,
  register,
  fill,
  opacity = 1,
  anchor,
  halo,
  weight,
}: {
  line: Line;
  register: Register;
  fill: string;
  opacity?: number;
  anchor?: "middle" | "end";
  halo?: { colour: string; width: number };
  weight?: number;
}) {
  return (
    <text
      x={line.x}
      y={line.y}
      textAnchor={anchor}
      fontFamily={register.fontFamily}
      fontSize={register.fontSize}
      fontWeight={weight ?? register.fontWeight}
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

export function GestureStackFrame(
  props: GestureStackFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const { frame, registers: r, colours, credit, titleCard, layout: L } = props;
  const scene = sceneAt(props as never, props.at) as any;
  const rows = L.mode === "rows";
  const halo = (width: number) => ({ colour: colours.ground, width });
  const figure = (text: string, x: number, y: number): Line => ({
    text,
    x,
    y,
    width: props.countWidths[text],
  });
  const els: any[] = [];
  const barH = rows ? L.barH : 0;

  scene.bars.forEach((b: any, i: number) => {
    const bar = props.bars[i];
    const nameFill = blend(
      blend(colours.text.name, colours.text.first, b.accent),
      colours.text.axis,
      b.back,
    );
    const g: any[] = [];
    if (rows) {
      const y0 = b.centre - barH / 2;
      g.push(
        <Text
          key="n"
          line={{ ...bar.name, x: L.nameRight, y: b.centre + L.axisShift }}
          anchor="end"
          register={r.axis}
          fill={nameFill}
          opacity={scene.furniture}
        />,
      );
      b.segs.forEach((s: any) => {
        if (s.p1 - s.p0 <= 0) return;
        g.push(
          <rect
            key={`s${s.markIndex}`}
            x={s.p0}
            y={y0}
            width={s.p1 - s.p0}
            height={barH}
            fill={blend(s.fill, colours.faded, b.back)}
          />,
        );
        if (s.labelShown && s.fits)
          g.push(
            <Text
              key={`v${s.markIndex}`}
              line={{
                ...s.label,
                x: (s.p0 + s.p1) / 2,
                y: b.centre + L.annotShift,
              }}
              anchor="middle"
              register={r.annot}
              fill={s.labelInk}
              opacity={1 - 0.6 * b.back}
            />,
          );
        if (s.ring > 0)
          g.push(
            <rect
              key={`r${s.markIndex}`}
              x={s.p0 - 3}
              y={y0 - 3}
              width={s.p1 - s.p0 + 6}
              height={barH + 6}
              fill="none"
              stroke={colours.ring}
              strokeWidth={props.strokes.rule}
              opacity={s.ring}
            />,
          );
      });
      if (b.ring > 0)
        g.push(
          <rect
            key="ring"
            x={b.ext[0] - L.gap / 2}
            y={y0 - L.gap / 2}
            width={b.ext[1] - b.ext[0] + L.gap}
            height={barH + L.gap}
            fill="none"
            stroke={colours.ring}
            strokeWidth={props.strokes.rule}
            opacity={b.ring}
          />,
        );
      bar.ends.forEach((e: any) => {
        const reg = e.register === "value" ? r.value : r.axis;
        const shift = e.register === "value" ? L.countShift : L.axisShift;
        const fill = blend(
          e.register === "value" ? colours.text.count : colours.text.axis,
          colours.text.first,
          b.accent,
        );
        g.push(
          <Text
            key={`e${e.side}`}
            line={{
              ...e,
              x:
                e.side === "left" ? b.ext[0] - L.gap : b.ext[1] + L.gap,
              y: b.centre + shift,
            }}
            anchor={e.side === "left" ? "end" : undefined}
            register={reg}
            fill={fill}
            opacity={b.labelsShown * (1 - 0.6 * b.back)}
          />,
        );
      });
    } else {
      const x0 = b.centre - L.colW / 2;
      (props.names[i] as Line[]).forEach((n, j) =>
        g.push(
          <Text
            key={`n${j}`}
            line={{
              ...n,
              x: b.centre,
              y: L.plotBottom + L.gap + r.axis.fontSize + j * r.axis.lead,
            }}
            anchor="middle"
            register={r.axis}
            fill={nameFill}
            opacity={scene.furniture}
          />,
        ),
      );
      b.segs.forEach((s: any) => {
        if (s.p1 - s.p0 <= 0) return;
        g.push(
          <rect
            key={`s${s.markIndex}`}
            x={x0}
            y={s.p0}
            width={L.colW}
            height={Math.max(0.5, s.p1 - s.p0)}
            fill={blend(s.fill, colours.faded, b.back)}
          />,
        );
        if (s.labelShown) {
          const top = Math.min(
            ...[s.from, s.to].map(
              (v: number) =>
                L.plotBottom -
                ((v - props.domain[0]) / (props.domain[1] - props.domain[0])) *
                  (L.plotBottom - L.plotTop),
            ),
          );
          g.push(
            <Text
              key={`v${s.markIndex}`}
              line={{ ...s.label, x: b.centre, y: top - L.gap / 2 }}
              anchor="middle"
              register={r.value}
              fill={blend(
                colours.text.count,
                colours.text.first,
                Math.max(b.accent, b.ring),
              )}
            />,
          );
        }
      });
      // The connector: the running level carried to the next column.
      if (i < scene.bars.length - 1 && b.segs[0].t >= 1) {
        const s = b.segs[0];
        const level = s.down ? s.p1 : s.p0;
        const nx = scene.bars[i + 1].centre - L.colW / 2;
        g.push(
          <line
            key="k"
            x1={x0 + L.colW}
            x2={nx}
            y1={bar.closing ? level : s.down ? s.p1 : s.p0}
            y2={level}
            stroke={colours.rule}
            strokeWidth={props.strokes.grid}
            strokeDasharray={props.dash.join(" ")}
          />,
        );
      }
      if (b.ring > 0)
        g.push(
          <rect
            key="ring"
            x={x0 - L.gap / 2}
            y={b.ext[0] - L.gap / 2}
            width={L.colW + L.gap}
            height={b.ext[1] - b.ext[0] + L.gap}
            fill="none"
            stroke={colours.ring}
            strokeWidth={props.strokes.rule}
            opacity={b.ring}
          />,
        );
    }
    els.push(
      <g key={`bar${i}`} opacity={1 - 0.55 * b.back}>
        {g}
      </g>,
    );
  });

  // A compare's copy: the compared length laid from where the subject starts, beside it.
  scene.copies.forEach((c: any) =>
    els.push(
      rows ? (
        <rect
          key={`copy${c.index}`}
          x={c.p0}
          y={c.centre + barH / 2 + 2}
          width={c.p1 - c.p0}
          height={Math.max(4, barH * 0.16)}
          fill={colours.copy}
        />
      ) : (
        <rect
          key={`copy${c.index}`}
          x={c.centre + L.colW / 2 + 3}
          y={c.p0}
          width={Math.max(6, L.colW * 0.12)}
          height={c.p1 - c.p0}
          fill={colours.copy}
        />
      ),
    ),
  );

  scene.brackets.forEach((b: any) => {
    const label = b.note ?? (b.figure ? [figure(b.figure, 0, 0)] : []);
    if (b.kind === "inBar") {
      const y = b.centre - barH / 2 - L.gap / 2;
      els.push(
        <path
          key={`B${b.index}`}
          d={`M${b.p0},${y + 5}V${y}H${b.p1}V${y + 5}`}
          fill="none"
          stroke={colours.text.count}
          strokeWidth={props.strokes.grid * 1.6}
        />,
      );
      label.forEach((l: any, j: number) =>
        els.push(
          <Text
            key={`Bl${b.index}-${j}`}
            line={{
              ...l,
              x: L.laneX,
              y: b.centre + L.annotShift + j * r.annot.lead,
            }}
            register={b.note ? r.annot : r.value}
            fill={colours.text.count}
            halo={halo(props.halo.annot)}
          />,
        ),
      );
    } else if (rows) {
      const x = L.spineX;
      els.push(
        <line
          key={`B${b.index}`}
          x1={x}
          x2={x}
          y1={b.c0 - barH / 2}
          y2={b.c1 + barH / 2}
          stroke={colours.text.count}
          strokeWidth={props.strokes.grid * 1.6}
        />,
      );
      b.ticks.forEach((t: number, j: number) =>
        els.push(
          <line
            key={`Bt${b.index}-${j}`}
            x1={x - L.gap / 2}
            x2={x}
            y1={t}
            y2={t}
            stroke={colours.text.count}
            strokeWidth={props.strokes.grid * 1.6}
          />,
        ),
      );
      label.forEach((l: any, j: number) =>
        els.push(
          <Text
            key={`Bl${b.index}-${j}`}
            line={{
              ...l,
              x: L.laneX,
              y: (b.c0 + b.c1) / 2 + L.annotShift + j * r.annot.lead,
            }}
            register={b.note ? r.annot : r.value}
            fill={colours.text.count}
            halo={halo(props.halo.annot)}
          />,
        ),
      );
    } else {
      const y = L.plotTop - r.value.lead - L.gap;
      els.push(
        <path
          key={`B${b.index}`}
          d={`M${b.c0 - L.colW / 2},${y + 6}V${y}H${b.c1 + L.colW / 2}V${y + 6}`}
          fill="none"
          stroke={colours.text.count}
          strokeWidth={props.strokes.grid * 1.6}
        />,
      );
      [...label]
        .reverse()
        .forEach((l: any, j: number) =>
          els.push(
            <Text
              key={`Bl${b.index}-${j}`}
              line={{
                ...l,
                x: (b.c0 + b.c1) / 2,
                y: y - L.gap * 1.4 - j * r.annot.lead,
              }}
              anchor="middle"
              register={b.note ? r.annot : r.value}
              fill={colours.text.count}
              halo={halo(props.halo.annot)}
            />,
          ),
        );
    }
  });

  scene.rules.forEach((rule: any) =>
    els.push(
      rows ? (
        <line
          key={`rule${rule.index}`}
          x1={rule.at}
          x2={rule.at}
          y1={L.plotTop}
          y2={L.plotTop + (L.plotBottom - L.plotTop) * rule.progress}
          stroke={colours.rule}
          strokeWidth={props.strokes.rule}
          strokeDasharray={props.dash.join(" ")}
        />
      ) : (
        <line
          key={`rule${rule.index}`}
          x1={L.plotLeft}
          x2={L.plotLeft + (L.plotRight - L.plotLeft) * rule.progress}
          y1={rule.at}
          y2={rule.at}
          stroke={colours.rule}
          strokeWidth={props.strokes.rule}
          strokeDasharray={props.dash.join(" ")}
        />
      ),
    ),
  );

  scene.notes.forEach((n: any) => {
    if (!(n.opacity > 0) || n.centre === null) return;
    const top =
      n.centre + L.annotShift - ((n.lines.length - 1) * r.annot.lead) / 2;
    n.lines.forEach((l: any, j: number) =>
      els.push(
        <Text
          key={`note${n.item}-${j}`}
          line={{ ...l, x: L.laneX, y: top + j * r.annot.lead }}
          register={r.annot}
          fill={colours.text.name}
          opacity={n.opacity}
          halo={halo(props.halo.annot)}
        />,
      ),
    );
  });

  scene.captions.forEach((c: any) => {
    if (c.figure)
      els.push(
        <Text
          key={`capf${c.item}`}
          line={figure(c.figure, L.content.left, c.y)}
          register={r.value}
          fill={colours.text.count}
        />,
      );
    if (c.opacity > 0)
      c.lines.forEach((l: any, j: number) =>
        els.push(
          <Text
            key={`cap${c.item}-${j}`}
            line={{ ...l, x: L.content.left, y: c.y + j * L.captionLead }}
            register={r.annot}
            fill={colours.text.name}
            opacity={c.opacity}
          />,
        ),
      );
  });

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
        {rows ? (
          <line
            x1={scene.zero}
            x2={scene.zero}
            y1={L.plotTop - L.gap / 2}
            y2={L.plotBottom}
            stroke={colours.grid}
            strokeWidth={props.strokes.grid}
          />
        ) : (
          <line
            x1={L.plotLeft}
            x2={L.plotRight}
            y1={scene.zero}
            y2={scene.zero}
            stroke={colours.grid}
            strokeWidth={props.strokes.grid}
          />
        )}
        {props.legend.map((k: any, j: number) => (
          <g key={`key${j}`}>
            <rect
              x={k.x}
              y={k.y - r.annot.fontSize * 0.62}
              width={r.annot.fontSize * 0.62}
              height={r.annot.fontSize * 0.62}
              fill={k.fill}
            />
            <Text
              line={{
                text: k.text,
                width: k.width,
                x: k.x + r.annot.fontSize * 0.62 + L.gap,
                y: k.y,
              }}
              register={r.annot}
              fill={k.text_}
            />
          </g>
        ))}
        {props.scope ? (
          <Text line={props.scope} register={r.axis} fill={colours.text.axis} />
        ) : null}
      </g>
      {els}
      <g
        transform={`translate(${credit.at.x} ${credit.at.y})`}
        opacity={scene.source}
      >
        {credit.lines.map((line: Line, i: number) => (
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
        {titleCard.title.map((line: Line, i: number) => (
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
