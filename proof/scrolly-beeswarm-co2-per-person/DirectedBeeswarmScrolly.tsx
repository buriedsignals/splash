/**
 * The world's CO₂ per person in 2023, one circle per country, sized by population, drawn THROUGH the
 * design base and revealed by the scroll. The `beeswarm` type in the scrolly format: the plate of
 * `static-beeswarm-co2-per-person`, its words and its rules, read one element at a time.
 *
 * THE STATIC PLATE'S RULES, KEPT (see `swarm-layout.mjs` for the packing and the cards):
 *   - `the-distribution-is-furniture-and-the-case-is-ink` — the field in a tint of the accent, the
 *     two cases and the world average in ink;
 *   - `the-subject-is-ringed-not-recoloured` — a named country keeps the field's colour and gains a
 *     ring;
 *   - the cards sit in their own room above the field, never over it, with a hairline to their circle;
 *   - the average is a rule that stops at the band;
 *   - the axis name and its ticks share a row at one size, separated by weight.
 *
 * CIRCLES STAY CIRCLES. The field is an SVG whose viewBox the driver sets to the frame's own pixels on
 * every resize, so nothing is stretched; what is rendered here is the same layout at a reference size,
 * letterboxed, which is what a reader without a script gets.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { layoutSwarm, verticalSeat } from "./swarm-layout.mjs";

export const REFERENCE = { width: 900, height: 360 };

export type Mark = { code: string; tonnes: number; people: number };
export type Card = {
  code: string;
  role: "first" | "far";
  name: string;
  lines: string[];
  width: number;
};
type Style = Record<string, string | number>;

export function DirectedBeeswarmScrolly({
  marks,
  cards,
  cardHeightPx,
  mean,
  markerLabel,
  high,
  meanCount,
  tailCount,
  axisName,
  axisNameWidth,
  ticks,
  xMax,
  alt,
  regs,
  pad,
  stroke,
  ground,
  accent,
  ink,
  muted,
}: {
  marks: Mark[];
  cards: Card[];
  cardHeightPx: number;
  mean: number;
  markerLabel: string;
  /** The tail threshold, in tonnes per person. */
  high: number;
  /** The two counters the filters bring, as the page prints them when fully counted; the driver writes
   *  their running number into the `{n}` slot. */
  meanCount: { template: string; value: number };
  tailCount: { template: string; value: number };
  axisName: string;
  axisNameWidth: number;
  ticks: { value: number; width: number }[];
  xMax: number;
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
  const { width: W, height: H } = REFERENCE;
  const cardRoom = cardHeightPx + 10;
  /** The average's label height at reference, in its own register — the driver measures the real one. */
  const labelHeight = Math.ceil(Number.parseFloat(String(regs.axis.fontSize)) * 1.4);
  const band = H - cardRoom - 4 - labelHeight;
  const layout = layoutSwarm({
    marks,
    xMax,
    width: W,
    bandHeight: band,
    cards: cards.map((c) => ({ code: c.code, width: c.width })),
    ticks,
    nameWidth: axisNameWidth,
  });
  const { cardsTop, midline, bandTop, bandBottom } = verticalSeat({
    height: H,
    cardRoom,
    extent: layout.extent,
    labelHeight,
  });
  const pctY = (px: number) => `${(px / H) * 100}%`;
  const swarm = mix(accent, ground, 0.45);
  /** The neutral a filtered circle steps back to — a circle still, just not the one the card names. */
  const neutral = mix(ground, ink, 0.14);
  const ringed = adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const rule = mix(ground, ink, 0.45);
  const byCode = new Map(layout.circles.map((c) => [c.code, c]));
  const pctX = (px: number) => `${(px / W) * 100}%`;
  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    ...extra,
  });

  return (
    <div
      role="img"
      aria-label={alt}
      data-swarm={JSON.stringify({ marks, xMax })}
      data-mean={mean}
      data-high={high}
      data-colours={JSON.stringify({ swarm, neutral })}
      data-cards={JSON.stringify(
        cards.map((c) => ({ code: c.code, role: c.role })),
      )}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "minmax(0, 1fr) auto",
        padding: `clamp(12px, 3vh, ${pad * 0.6}px) clamp(16px, 5vw, ${pad}px)`,
      }}
    >
      <div data-part="plot" style={{ position: "relative", minHeight: 0 }}>
        <svg
          data-part="field"
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          style={abs({
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
          })}
        >
          <line
            data-part="mean"
            x1={layout.x(mean)}
            x2={layout.x(mean)}
            y1={bandTop}
            y2={bandBottom + 4 + labelHeight}
            stroke={rule}
            strokeWidth={stroke.rule ?? 1}
          />
          {layout.circles.map((c) => (
            <circle
              key={c.code}
              data-circle={c.code}
              cx={c.cx}
              cy={midline + c.cy}
              r={c.r}
              fill={swarm}
            />
          ))}
          {cards.map((card) => {
            const c = byCode.get(card.code)!;
            return (
              <g key={`ring${card.code}`} data-role={card.role}>
                <circle
                  data-part="ring"
                  cx={c.cx}
                  cy={midline + c.cy}
                  r={c.r + 1.6}
                  fill="none"
                  stroke={ringed}
                  strokeWidth={stroke.rule ?? 1}
                />
                <line
                  data-part="leader"
                  x1={c.cx}
                  x2={c.cx}
                  y1={cardsTop + cardHeightPx + 3}
                  y2={midline + c.cy - c.r - 2}
                  stroke={ringed}
                  strokeWidth={stroke.hairline ?? 0.6}
                />
              </g>
            );
          })}
        </svg>

        {layout.cards.map((placed) => {
          const card = cards.find((c) => c.code === placed.code)!;
          return (
            <div
              key={`card${card.code}`}
              data-part="card"
              data-role={card.role}
              style={abs({
                left: pctX(placed.left),
                top: pctY(cardsTop),
                width: `${card.width}px`,
                textAlign:
                  placed.anchor === "middle"
                    ? "center"
                    : placed.anchor === "end"
                      ? "right"
                      : "left",
              })}
            >
              <div
                style={{ ...regs.value, color: ringed, whiteSpace: "nowrap" }}
              >
                {card.name}
              </div>
              {card.lines.map((l) => (
                <div
                  key={l}
                  style={{
                    ...regs.annot,
                    color: mutedInk,
                    whiteSpace: "nowrap",
                  }}
                >
                  {l}
                </div>
              ))}
            </div>
          );
        })}

        <span
          data-part="mean-label"
          style={abs({
            ...regs.axis,
            color: mutedInk,
            left: `calc(${pctX(layout.x(mean))} + 6px)`,
            top: pctY(bandBottom + 4),
            whiteSpace: "nowrap",
          })}
        >
          {markerLabel}
        </span>
        <span
          data-part="mean-count"
          data-template={meanCount.template}
          data-value={meanCount.value}
          style={abs({ ...regs.value, color: ringed, left: `calc(${pctX(layout.x(mean))} + 6px)`, top: pctY(bandBottom + 4 + labelHeight), whiteSpace: "nowrap", opacity: 0 })}
        >
          {meanCount.template.replace("{n}", String(meanCount.value))}
        </span>
        <span
          data-part="tail-count"
          data-template={tailCount.template}
          data-value={tailCount.value}
          style={abs({ ...regs.value, color: ringed, left: `calc(${pctX(layout.x(high))} + 4px)`, top: pctY(midline - 34), whiteSpace: "nowrap", background: ground, padding: "1px 4px", opacity: 0 })}
        >
          {tailCount.template.replace("{n}", String(tailCount.value))}
        </span>
      </div>

      <div
        data-part="axis"
        style={{ position: "relative", height: "1.8em", marginTop: "8px" }}
      >
        {ticks.map((t) => (
          <span
            key={`t${t.value}`}
            data-tick={t.value}
            style={abs({
              ...regs.axis,
              color: mutedInk,
              left: pctX(layout.x(t.value)),
              top: 0,
              transform: t.value === 0 ? "none" : "translateX(-50%)",
              visibility: layout.shownTicks.some((s) => s.value === t.value)
                ? "visible"
                : "hidden",
            })}
          >
            {t.value}
          </span>
        ))}
        <span
          data-part="axis-name"
          style={abs({
            ...regs.axis,
            color: mutedInk,
            fontWeight: 700,
            right: 0,
            top: 0,
            whiteSpace: "nowrap",
          })}
        >
          {axisName}
        </span>
      </div>
    </div>
  );
}
