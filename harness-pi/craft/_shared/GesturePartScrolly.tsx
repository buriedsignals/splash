/**
 * The Part-to-whole family as a scrolly whose staging is the beat's own `gestures`, every type a variant: `treemap`,
 * `marimekko-mosaic-plot`, `pie-and-donut`. Forked from GesturePartStatic.tsx (the plate's doctrine) and the per-type
 * scrolly components (craft/scrolly/<slug>/Directed*Scrolly.tsx). Every part, its accent, ring and step-back, every
 * bracket's outline and every compare's copy is laid out in the reader's pixels by the drive (`applyPartState`,
 * gesture-part-scrolly.mjs); the layout never moves between cards (one whole, one area or angle per unit).
 *
 * What is rendered here as a picture is the closing card's, for a reader without a script: the same parts in the same
 * layout (a fixed viewBox), what the gestures marked in the accent, every note written.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  contrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import {
  arcPath,
  layoutPart,
  REST,
  restName,
  SEP,
} from "./gesture-family-part.mjs";

type Style = Record<string, string | number>;
type Part = {
  name: string;
  value: number;
  key?: string;
  series?: string;
  rest?: boolean;
};

export function GesturePartScrolly({
  variant,
  parts,
  rest,
  restLabel,
  data,
  labels,
  notes,
  finals,
  still,
  unit,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
}: {
  variant: "treemap" | "marimekko-mosaic-plot" | "pie-and-donut";
  parts: Part[];
  rest: { count: number; sum: number };
  restLabel: string;
  /** what the drive reads (driveData) */
  data: any;
  /** per drawn part, its printed value */
  labels: string[];
  /** per gesture, the note its card's header reads first ("" for none), and the words it ends on */
  notes: string[];
  finals: string[];
  /** the closing card's emphasis, for the no-JS still */
  still: { accent: boolean[]; ring: boolean[]; groups: string[][] };
  unit: string;
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
}) {
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const onAccent =
    contrast(ink, accent) >= contrast(ground, accent) ? ink : ground;
  const field = [
    mix(ground, ink, 0.1),
    mix(ground, ink, 0.17),
    mix(ground, ink, 0.24),
  ];
  const series = [
    ...new Set(parts.map((p) => p.series).filter(Boolean)),
  ] as string[];
  const columns = [
    ...new Set(parts.map((p) => p.key).filter(Boolean)),
  ] as string[];
  const fillOf = (p: Part) =>
    variant === "marimekko-mosaic-plot"
      ? field[series.indexOf(p.series as string) % field.length]
      : field[0];
  const nameOf = (p: Part) =>
    p.rest
      ? variant === "marimekko-mosaic-plot"
        ? (p.series as string)
        : restName(restLabel, rest)
      : variant === "marimekko-mosaic-plot"
        ? (p.series as string)
        : p.name;
  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    left: 0,
    top: 0,
    whiteSpace: "nowrap",
    ...extra,
  });
  const halo = `0 0 2px ${ground}, 0 0 3px ${ground}`;

  // THE NO-JS STILL: the closing picture in a fixed viewBox, drawn from the same family layout.
  const VB = { w: 1000, h: 560 };
  const stillBox =
    variant === "pie-and-donut"
      ? { x: 300, y: 10, w: 400, h: 400 }
      : {
          x: 0,
          y: 0,
          w: variant === "marimekko-mosaic-plot" ? 860 : VB.w,
          h: 500,
        };
  const shapes = layoutPart({
    variant,
    parts,
    box: stillBox,
    groups: still.groups,
  });
  const noScript =
    `[data-gpart] [data-part="stage"] > :not([data-part="still"]) { display: none !important; }` +
    `[data-gpart] [data-part="still"] { display: flex !important; }`;
  const writtenNotes = finals.filter((t) => t.trim());

  return (
    <div
      role="img"
      aria-label={alt}
      data-gpart={JSON.stringify({
        ...data,
        colours: { ink: inkOnGround, muted: mutedInk, accentInk, onAccent },
      })}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr)",
        gridTemplateColumns: "minmax(0, 1fr)",
        rowGap: "10px",
        padding: `12px var(--prose-gutter, clamp(16px, 6vw, 56px))`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "4px 16px",
        }}
      >
        <span style={{ ...regs.axis, color: mutedInk, fontWeight: 700 }}>
          {unit}
        </span>
        <span style={{ display: "grid", marginLeft: "auto" }}>
          {notes.map((t, k) => (
            <span
              key={k}
              data-note={k}
              data-final={finals[k]}
              style={{
                ...regs.value,
                gridArea: "1 / 1",
                justifySelf: "end",
                textAlign: "right",
                color: accentInk,
                opacity: 0,
              }}
            >
              {t}
            </span>
          ))}
        </span>
      </div>

      <noscript
        style={{ display: "none" }}
        dangerouslySetInnerHTML={{ __html: `<style>${noScript}</style>` }}
      />
      <div data-part="stage" style={{ position: "relative", minHeight: 0 }}>
        <div
          data-part="still"
          style={{
            display: "none",
            position: "absolute",
            inset: 0,
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <svg
            viewBox={`0 0 ${VB.w} ${VB.h}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ flex: "1 1 auto", minHeight: 0, width: "100%" }}
          >
            {parts.map((p, i) => {
              const s: any = shapes.get(p.name);
              if (!s) return null;
              const fill = still.accent[i] ? accent : fillOf(p);
              const d =
                s.kind === "arc"
                  ? arcPath(s)
                  : `M${s.x},${s.y}h${Math.max(0, s.w - 1)}v${Math.max(0, s.h - 1)}h${-Math.max(0, s.w - 1)}Z`;
              const big = s.kind === "rect" && s.w > 70 && s.h > 30;
              return (
                <g key={i}>
                  <path d={d} fill={fill} stroke={ground} strokeWidth={1.5} />
                  {still.ring[i] ? (
                    <path
                      d={d}
                      fill="none"
                      stroke={inkOnGround}
                      strokeWidth={3}
                    />
                  ) : null}
                  {big ? (
                    <text
                      x={s.x + 6}
                      y={s.y + 22}
                      fontSize={18}
                      fontFamily={String(regs.value.fontFamily ?? "sans-serif")}
                      fill={still.accent[i] ? onAccent : inkOnGround}
                    >
                      {labels[i]}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
          {writtenNotes.length ? (
            <p
              style={{
                ...regs.value,
                color: accentInk,
                margin: 0,
                flex: "0 0 auto",
              }}
            >
              {writtenNotes.join(" · ")}
            </p>
          ) : null}
        </div>

        <svg
          data-part="field"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
          }}
        >
          {parts.map((p, i) => (
            <g key={i}>
              <path
                data-p={i}
                fill={fillOf(p)}
                stroke={ground}
                strokeWidth={1.2}
              />
              <path
                data-a={i}
                fill={accent}
                stroke={ground}
                strokeWidth={1.2}
                style={{ opacity: 0 }}
              />
            </g>
          ))}
          {variant === "pie-and-donut"
            ? parts.map((_, i) => (
                <path
                  key={`ld${i}`}
                  data-ld={i}
                  fill="none"
                  stroke={mutedInk}
                  strokeWidth={0.7}
                />
              ))
            : null}
          {parts.map((_, i) => (
            <path
              key={`r${i}`}
              data-r={i}
              fill="none"
              stroke={inkOnGround}
              strokeWidth={2}
              style={{ opacity: 0 }}
            />
          ))}
          {data.plan.map((p: any) =>
            p.do === "bracket" ? (
              <path
                key={`b${p.k}`}
                data-bk={p.k}
                fill={variant === "pie-and-donut" ? inkOnGround : "none"}
                stroke={variant === "pie-and-donut" ? "none" : inkOnGround}
                strokeWidth={2}
                style={{ opacity: 0 }}
              />
            ) : p.do === "compare" ? (
              <path
                key={`c${p.k}`}
                data-cp={p.k}
                fill="none"
                stroke={inkOnGround}
                strokeWidth={1.6}
                strokeDasharray="5 3"
                style={{ opacity: 0 }}
              />
            ) : null,
          )}
        </svg>

        {parts.map((p, i) => (
          <div key={`l${i}`}>
            <span
              data-v={i}
              style={abs({
                ...regs.value,
                color: inkOnGround,
                fontWeight: 700,
                lineHeight: 1.1,
              })}
            >
              {labels[i]}
            </span>
            <span
              data-n={i}
              style={abs({ ...regs.annot, color: mutedInk, lineHeight: 1.15 })}
            >
              {nameOf(p)}
            </span>
          </div>
        ))}
        {variant === "marimekko-mosaic-plot"
          ? columns.map((k, j) => (
              <span
                key={`col${j}`}
                data-colname={j}
                style={abs({
                  ...regs.axis,
                  color: inkOnGround,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  textShadow: halo,
                })}
              >
                {k === REST ? restName(restLabel, rest) : k}
              </span>
            ))
          : null}
        {variant === "marimekko-mosaic-plot"
          ? series.map((s, j) => (
              <span
                key={`key${j}`}
                data-key={j}
                style={abs({
                  ...regs.annot,
                  color: mutedInk,
                  lineHeight: 1.15,
                })}
              >
                {s}
              </span>
            ))
          : null}
      </div>
    </div>
  );
}

export { SEP };
