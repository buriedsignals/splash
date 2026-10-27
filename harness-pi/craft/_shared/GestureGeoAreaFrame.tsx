/**
 * The AREA maps' video frame — choropleth, tile cartogram, hex cartogram, dot density — as one component with a
 * `variant` (read from the props gesture-geo-area-render-video.mjs builds). Pure arithmetic over those props at frame
 * `at`: every state field is interpolated by gesture-video.mjs `fieldAt` across the six events (classes and the
 * camera linearly, rings, washes and names eased), so the frame draws the declaration the scheduler compiled:
 *
 *   classes  arrive lowest first (a reveal), from the land tint into their class colour
 *   b:KEY    a filter's wash toward the ground; a:KEY / r:KEY the accent and ink rings; n:KEY a named value;
 *   f:KEY    a reference's class-floor outline; vx..vh the camera (a zoom), words kept at their measured size
 *   g0..g2   each gesture's note, set over the map
 *
 * Every word is measured in Bun (data-width), the title card and the credit are the chart-video ones.
 */
import type { Ref } from "react";
import { fieldAt } from "./gesture-video.mjs";

type Register = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: string;
  letterSpacing: number;
  lead: number;
};
type Line = { text: string; x: number; y: number; width: number };
type Word = { text: string; width: number };

export type GestureGeoAreaFrameProps = {
  variant: string;
  frame: { width: number; height: number };
  registers: Record<
    "display" | "eyebrow" | "value" | "axis" | "annot" | "source",
    Register
  >;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: any;
  unitLine: Line;
  noteTop: number;
  notes: Word[][];
  box: { x: number; y: number; width: number; height: number };
  cells: Array<{
    key: string;
    d: string;
    seat: { x: number; y: number };
    size: number;
    klass: number | null;
    codeInk: string;
    backInk: string;
    code: Word | null;
    named: Word | null;
  }>;
  land: string[];
  dots: Array<{ x: number; y: number; key: string }>;
  grids: boolean;
  strokes: { rule: number };
  halo: number;
  [key: string]: unknown;
};

function blend(a: string, b: string, t: number) {
  const p = (h: string) =>
    [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  const u = Math.max(0, Math.min(1, t));
  return `#${x
    .map((v, i) =>
      Math.round(v + (y[i] - v) * u)
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
  anchor,
}: {
  line: Line;
  register: Register;
  fill: string;
  opacity?: number;
  halo?: { colour: string; width: number };
  anchor?: "middle";
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

export function GestureGeoAreaFrame(
  props: GestureGeoAreaFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> },
) {
  const {
    frame,
    registers: r,
    colours: C,
    credit,
    titleCard,
    box,
    cells,
    grids,
  } = props;
  const f = (field: string) =>
    fieldAt(props as never, field, props.at) as number;
  const isDots = props.variant === "dot-density";
  const [vx, vy, vw, vh] = [f("vx"), f("vy"), f("vw"), f("vh")];
  const s = Math.min(box.width / vw, box.height / vh);
  const ox = box.x + (box.width - vw * s) / 2 - vx * s;
  const oy = box.y + (box.height - vh * s) / 2 - vy * s;
  const at = (p: { x: number; y: number }) => ({
    x: ox + p.x * s,
    y: oy + p.y * s,
  });
  const classes = f("classes");
  const mapInk = f("map");
  const rule = props.strokes.rule;
  const ringR = (c: { size: number }) =>
    Math.max(14, Math.min(40, c.size * 0.32 * s));
  const annotBand = r.annot.fontSize * 0.35;

  const fillOf = (c: (typeof cells)[number]) => {
    if (c.klass === null) return grids ? C.ground : C.missing;
    const own = blend(
      C.classFill[c.klass],
      C.backFill[c.klass],
      f(`b:${c.key}`),
    );
    return blend(C.land, own, classes - c.klass);
  };

  return (
    <svg
      ref={props.svgRef}
      xmlns="http://www.w3.org/2000/svg"
      width={frame.width}
      height={frame.height}
      viewBox={`0 0 ${frame.width} ${frame.height}`}
    >
      <rect width={frame.width} height={frame.height} fill={C.ground} />
      <defs>
        <clipPath id="geo-video-box">
          <rect x={box.x} y={box.y} width={box.width} height={box.height} />
        </clipPath>
      </defs>
      <g opacity={mapInk}>
        <Text line={props.unitLine} register={r.axis} fill={C.text.axis} />
        <g clipPath="url(#geo-video-box)">
          <g transform={`translate(${ox} ${oy}) scale(${s})`}>
            {props.land.map((d, i) => (
              <path
                key={`l${i}`}
                d={d}
                fill={C.land}
                stroke={C.ground}
                strokeWidth={0.6 / s}
              />
            ))}
            {!isDots &&
              cells.map((c) => (
                <path
                  key={c.key}
                  d={c.d}
                  fill={fillOf(c)}
                  stroke={c.klass === null && grids ? C.text.axis : C.ground}
                  strokeWidth={(grids ? rule : 0.8) / s}
                />
              ))}
            {isDots &&
              props.dots.map((d, i) => (
                <circle
                  key={`d${i}`}
                  cx={d.x}
                  cy={d.y}
                  r={1.6 / s}
                  fill={C.dot}
                  opacity={1 - 0.7 * f(`b:${d.key}`)}
                />
              ))}
            {!isDots &&
              cells
                .filter((c) => c.klass !== null && f(`f:${c.key}`) > 0.01)
                .map((c) => (
                  <path
                    key={`f${c.key}`}
                    d={c.d}
                    fill="none"
                    stroke={C.ink}
                    strokeWidth={(rule * 1.3) / s}
                    opacity={f(`f:${c.key}`)}
                  />
                ))}
            {isDots &&
              cells.flatMap((c) =>
                f(`a:${c.key}`) > 0.01
                  ? props.dots
                      .filter((d) => d.key === c.key)
                      .map((d, i) => (
                        <circle
                          key={`ra${c.key}${i}`}
                          cx={d.x}
                          cy={d.y}
                          r={6 / s}
                          fill="none"
                          stroke={C.accent}
                          strokeWidth={1.8 / s}
                          opacity={f(`a:${c.key}`)}
                        />
                      ))
                  : [],
              )}
            {grids &&
              cells.flatMap((c) => [
                ...(f(`a:${c.key}`) > 0.01
                  ? [
                      <path
                        key={`ah${c.key}`}
                        d={c.d}
                        fill="none"
                        stroke={C.ground}
                        strokeWidth={(rule * 4.4) / s}
                        opacity={f(`a:${c.key}`)}
                      />,
                      <path
                        key={`a${c.key}`}
                        d={c.d}
                        fill="none"
                        stroke={C.accent}
                        strokeWidth={(rule * 2) / s}
                        opacity={f(`a:${c.key}`)}
                      />,
                    ]
                  : []),
                ...(f(`r:${c.key}`) > 0.01
                  ? [
                      <path
                        key={`r${c.key}`}
                        d={c.d}
                        fill="none"
                        stroke={C.ink}
                        strokeWidth={(rule * 1.2) / s}
                        opacity={f(`r:${c.key}`)}
                      />,
                    ]
                  : []),
              ])}
          </g>
          {/* Rings on a shape map and every word: placed through the camera, drawn at their measured size. */}
          {!grids &&
            !isDots &&
            cells.flatMap((c) => {
              const p = at(c.seat);
              return [
                ...(f(`a:${c.key}`) > 0.01
                  ? [
                      <circle
                        key={`ah${c.key}`}
                        cx={p.x}
                        cy={p.y}
                        r={ringR(c)}
                        fill="none"
                        stroke={C.ground}
                        strokeWidth={rule * 4.4}
                        opacity={f(`a:${c.key}`)}
                      />,
                      <circle
                        key={`a${c.key}`}
                        cx={p.x}
                        cy={p.y}
                        r={ringR(c)}
                        fill="none"
                        stroke={C.accent}
                        strokeWidth={rule * 2}
                        opacity={f(`a:${c.key}`)}
                      />,
                    ]
                  : []),
                ...(f(`r:${c.key}`) > 0.01
                  ? [
                      <circle
                        key={`r${c.key}`}
                        cx={p.x}
                        cy={p.y}
                        r={ringR(c)}
                        fill="none"
                        stroke={C.ink}
                        strokeWidth={rule * 1.2}
                        opacity={f(`r:${c.key}`)}
                      />,
                    ]
                  : []),
              ];
            })}
          {grids &&
            cells.map((c) => {
              if (!c.code) return null;
              const p = at(c.seat);
              const named =
                c.named && f(`n:${c.key}`) > 0.01 ? f(`n:${c.key}`) : 0;
              const ink = f(`b:${c.key}`) > 0.5 ? c.backInk : c.codeInk;
              const lift = named ? r.axis.fontSize * 0.55 * named : 0;
              return (
                <g key={`w${c.key}`}>
                  <Text
                    line={{
                      ...c.code,
                      x: p.x,
                      y: p.y + r.axis.fontSize * 0.35 - lift,
                    }}
                    register={r.axis}
                    fill={ink}
                    anchor="middle"
                  />
                  {named ? (
                    <Text
                      line={{
                        ...c.named!,
                        x: p.x,
                        y:
                          p.y + r.axis.fontSize * 0.35 + r.annot.fontSize * 0.6,
                      }}
                      register={r.annot}
                      fill={ink}
                      opacity={named}
                      anchor="middle"
                    />
                  ) : null}
                </g>
              );
            })}
          {!grids &&
            !isDots &&
            cells.map((c) => {
              const o = f(`n:${c.key}`);
              if (!c.named || o <= 0.01) return null;
              const p = at(c.seat);
              return (
                <Text
                  key={`n${c.key}`}
                  line={{
                    ...c.named,
                    x: p.x,
                    y: p.y + ringR(c) + r.annot.fontSize + annotBand,
                  }}
                  register={r.annot}
                  fill={C.ink}
                  opacity={o}
                  anchor="middle"
                  halo={{ colour: C.ground, width: props.halo }}
                />
              );
            })}
        </g>
        {/* Each gesture's note over the map, one at a time: the later one replaces the earlier. */}
        {props.notes.map((lines, k) => {
          const shown =
            f(`g${k}`) *
            (k < 2
              ? 1 - f(`g${k + 1}`) * (props.notes[k + 1]?.length ? 1 : 0)
              : 1);
          if (shown <= 0.01) return null;
          return (
            <g key={`note${k}`} opacity={shown}>
              {lines.map((l, j) => (
                <Text
                  key={j}
                  line={{ ...l, x: box.x, y: props.noteTop + j * r.annot.lead }}
                  register={r.annot}
                  fill={C.text.note}
                />
              ))}
            </g>
          );
        })}
      </g>
      <g
        transform={`translate(${credit.at.x} ${credit.at.y})`}
        opacity={f("credit")}
      >
        {credit.lines.map((line, i) => (
          <Text
            key={`credit${i}`}
            line={line}
            register={r.source}
            fill={C.text.axis}
            halo={{ colour: C.ground, width: credit.halo }}
          />
        ))}
      </g>
      <g opacity={f("title")}>
        <rect width={frame.width} height={frame.height} fill={C.ground} />
        <Text
          line={titleCard.eyebrow}
          register={r.eyebrow}
          fill={C.text.eyebrow}
        />
        {titleCard.title.map((line, i) => (
          <Text
            key={`title${i}`}
            line={line}
            register={titleCard.register}
            fill={C.text.title}
          />
        ))}
      </g>
    </svg>
  );
}
