/**
 * Sixteen European countries, 2000 → 2024, drawn THROUGH the design base as a connected scatter and
 * CHOREOGRAPHED by the scroll. The `connected scatter` type in the scrolly format: the subject of
 * `static-connected-scatter-lowcarbon` — every country cleaner at home, five lighter in Europe — told
 * with the gestures a scroll can make (`scrolly/references/directed-type-choreography.md`):
 *
 *   reveal   — the sixteen rings of 2000;
 *   travel   — each country moves along its own arc to 2024, the arc drawn as far as it has gone;
 *   filter   — the five that moved left keep their colour;
 *   focus    — France, its two moves counted;
 *   rescale  — the x axis closes onto the crowd near the origin, every small country named;
 *   pull back.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: hollow ring before, filled disc after, one hue, a curved dotted
 * link and no key for it; the later state labelled, a name degrading to its code before it is dropped; the
 * subject at full accent, the others in a tint.
 *
 * What is rendered here is the last card's picture at a reference size; `scatter-drive.mjs` redraws the
 * field in the reader's own pixels on every paint.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { scatterLayout } from "./scatter-layout.mjs";

export type State = { weight: number; ownMix: number };
export type Entity = {
  code: string;
  name: string;
  from: State;
  to: State;
  lighter: boolean;
};
type Style = Record<string, string | number>;

const REFERENCE = { width: 900, height: 480 };

export function DirectedScatterScrolly({
  entities,
  subject,
  xMax,
  zoomMax,
  xTicks,
  zoomTicks,
  yTicks,
  xName,
  yName,
  upCount,
  subjectCounts,
  alt,
  regs,
  pad,
  stroke,
  ground,
  accent,
  ink,
  muted,
}: {
  entities: Entity[];
  subject: string;
  xMax: number;
  zoomMax: number;
  xTicks: number[];
  zoomTicks: number[];
  yTicks: number[];
  xName: string;
  yName: string;
  upCount: { template: string; value: number };
  subjectCounts: string;
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
  pad: number;
  stroke: { rule?: number; hairline?: number };
  ground: string;
  accent: string;
  ink: string;
  muted: string;
}) {
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const contextInk = mix(accent, ground, 0.42);
  const faded = mix(ground, ink, 0.18);
  const gridInk = mix(ground, ink, 0.1);
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const { width: W, height: H } = REFERENCE;
  const layout = scatterLayout(entities, {
    width: W,
    height: H,
    xMax,
    inset: 8,
  });
  const byCode = new Map(layout.seats.map((s) => [s.code, s]));
  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    ...extra,
  });

  return (
    <div
      role="img"
      aria-label={alt}
      data-scatter={JSON.stringify({
        entities: entities.map(({ code, from, to, lighter }) => ({
          code,
          from,
          to,
          lighter,
        })),
        subject,
        xMax,
        zoomMax,
        colours: {
          accent: accentInk,
          context: contextInk,
          faded,
          ground,
          name: mutedInk,
        },
      })}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
        gridTemplateColumns: "minmax(0, 1fr)",
        rowGap: "8px",
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
          {yName}
        </span>
        <span
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "4px 16px",
            justifyContent: "flex-end",
          }}
        >
          <span
            data-part="up-count"
            data-template={upCount.template}
            data-value={upCount.value}
            style={{
              ...regs.value,
              color: inkOn(ink, ground),
            }}
          >
            {upCount.template.replace("{n}", String(upCount.value))}
          </span>
          <span
            data-part="subject-counts"
            style={{ ...regs.value, color: accentInk }}
          >
            {subjectCounts}
          </span>
        </span>
      </div>

      <div
        data-part="stage"
        style={{
          position: "relative",
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "max-content minmax(0, 1fr)",
          columnGap: "8px",
        }}
      >
        <div data-part="y-axis" style={{ position: "relative" }}>
          {yTicks.map((t) => (
            <span
              key={`y${t}`}
              data-ytick={t}
              style={abs({
                ...regs.axis,
                color: mutedInk,
                right: 0,
                top: `${((100 - t) / 100) * 100}%`,
                transform: "translateY(-50%)",
                whiteSpace: "nowrap",
              })}
            >
              {t}
            </span>
          ))}
          <span style={{ ...regs.axis, visibility: "hidden" }}>100</span>
        </div>
        <div data-part="plot" style={{ position: "relative", minHeight: 0 }}>
          <svg
            data-part="field"
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            style={abs({
              inset: 0,
              width: "100%",
              height: "100%",
              overflow: "visible",
            })}
          >
            {yTicks.map((t) => (
              <line
                key={`g${t}`}
                data-grid={t}
                x1={0}
                x2={W}
                y1={layout.y(t)}
                y2={layout.y(t)}
                stroke={gridInk}
                strokeWidth={stroke.hairline ?? 0.6}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {entities.map((e) => {
              const s = byCode.get(e.code)!;
              const isSubject = e.code === subject;
              const colour = isSubject ? accentInk : contextInk;
              return (
                <g key={e.code} data-entity={e.code}>
                  <path
                    data-part="arc"
                    d={`M ${s.p0[0]} ${s.p0[1]} Q ${s.c[0]} ${s.c[1]} ${s.p1[0]} ${s.p1[1]}`}
                    fill="none"
                    stroke={colour}
                    strokeWidth={stroke.rule ?? 1}
                    strokeDasharray={isSubject ? "4 3" : "3 3"}
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    data-part="ring"
                    cx={s.p0[0]}
                    cy={s.p0[1]}
                    r={4.5}
                    fill={ground}
                    stroke={colour}
                    strokeWidth={stroke.rule ?? 1}
                  />
                  <circle
                    data-part="disc"
                    cx={s.p1[0]}
                    cy={s.p1[1]}
                    r={4.5}
                    fill={colour}
                  />
                </g>
              );
            })}
          </svg>
          {entities.map((e) => (
            <span
              key={`n${e.code}`}
              data-name={e.code}
              data-full={e.name}
              style={abs({
                ...regs.value,
                left: `${(byCode.get(e.code)!.p1[0] / W) * 100}%`,
                top: `${(byCode.get(e.code)!.p1[1] / H) * 100}%`,
                transform: "translate(8px, -50%)",
                whiteSpace: "nowrap",
                color: e.code === subject ? accentInk : mutedInk,
                background: ground,
                padding: "0 3px",
              })}
            >
              {e.name}
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "max-content minmax(0, 1fr)",
          columnGap: "8px",
          rowGap: "2px",
        }}
      >
        <span
          data-part="x-gutter"
          style={{ ...regs.axis, visibility: "hidden" }}
        >
          100
        </span>
        <div style={{ position: "relative", height: "1.6em" }}>
          {xTicks.map((t) => (
            <span
              key={`x${t}`}
              data-xtick={t}
              data-set="full"
              style={abs({
                ...regs.axis,
                color: mutedInk,
                left: `${(t / xMax) * 100}%`,
                top: 0,
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
              })}
            >
              {t}
            </span>
          ))}
          {zoomTicks.map((t) => (
            <span
              key={`z${t}`}
              data-xtick={t}
              data-set="zoom"
              style={abs({
                ...regs.axis,
                color: mutedInk,
                left: `${(t / zoomMax) * 100}%`,
                top: 0,
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
                opacity: 0,
              })}
            >
              {t}
            </span>
          ))}
        </div>
        <span
          data-part="x-name"
          style={{
            ...regs.axis,
            gridColumn: 2,
            color: mutedInk,
            fontWeight: 700,
            textAlign: "right",
          }}
        >
          {xName}
        </span>
      </div>
    </div>
  );
}

function inkOn(ink: string, ground: string) {
  return adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
}
